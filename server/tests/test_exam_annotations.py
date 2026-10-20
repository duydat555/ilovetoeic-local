"""Run explicitly against a disposable local MySQL database:
ANNOTATION_TEST_MYSQL=1 python -m unittest discover -s server/tests -p test_exam_annotations.py
Never imports app.db initialization or main against the configured database.
"""
import json
import os
from pathlib import Path
import sys
import types
import unittest
import uuid
from contextlib import contextmanager
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import patch

import pymysql
from dotenv import dotenv_values
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


class IsolatedDB:
    config = None

    @contextmanager
    def connection(self):
        if self.config is None:
            raise AssertionError('Only the disposable database may be used')
        conn = pymysql.connect(**self.config)
        try:
            yield conn
        finally:
            conn.close()

    def fetch_one(self, query, params, use_cache=False):
        assert use_cache is False
        with self.connection() as conn, conn.cursor() as cursor:
            cursor.execute(query, params)
            return cursor.fetchone()

    def fetch_all(self, query, params, use_cache=False):
        assert use_cache is False
        with self.connection() as conn, conn.cursor() as cursor:
            cursor.execute(query, params)
            return list(cursor.fetchall())


database = IsolatedDB()
db_module = types.ModuleType('app.db')
db_module.db = database
security_module = types.ModuleType('app.security')


def auth():
    raise HTTPException(401)


security_module.get_current_user = auth
with patch.dict(sys.modules, {'app.db': db_module, 'app.security': security_module}):
    from app.routers import exam_annotations as annotations


class DocumentValidationTests(unittest.TestCase):
    def test_utf16_quote_offsets_and_bad_schema(self):
        from pydantic import ValidationError
        document = {'version': 1, 'items': [{'id': 'a', 'kind': 'highlight', 'color': '#fbbf24', 'width': 2,
            'anchor': {'start': 0, 'end': 2, 'quote': '\U0001f600', 'prefix': '', 'suffix': ''}}], 'note': '', 'review': False}
        annotations.AnnotationDocument.model_validate(document)
        document['items'][0]['anchor']['end'] = 1
        with self.assertRaises(ValidationError):
            annotations.AnnotationDocument.model_validate(document)
        with self.assertRaises(ValidationError):
            annotations.AnnotationDocument.model_validate({'version': 2, 'items': [], 'note': '', 'review': False})


@unittest.skipUnless(os.getenv('ANNOTATION_TEST_MYSQL') == '1', 'explicit local MySQL integration opt-in required')
class AnnotationAPITests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        config = dotenv_values(Path(__file__).resolve().parents[1] / '.env')
        assert config.get('DB_HOST', '127.0.0.1') in ('127.0.0.1', 'localhost')
        cls.name = 'toeic_annotation_test_' + uuid.uuid4().hex[:20]
        cls.admin = dict(host='127.0.0.1', port=int(config.get('DB_PORT') or 3306), user=config.get('DB_USER') or 'root',
                         password=config.get('DB_PASSWORD') or '', charset='utf8mb4', autocommit=True, cursorclass=pymysql.cursors.DictCursor)
        with pymysql.connect(**cls.admin) as conn, conn.cursor() as cursor:
            cursor.execute(f'CREATE DATABASE `{cls.name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
        database.config = {**cls.admin, 'database': cls.name}
        cls.a, cls.b = str(uuid.uuid4()), str(uuid.uuid4())
        with database.connection() as conn, conn.cursor() as cursor:
            cursor.execute('CREATE TABLE users (id CHAR(36) PRIMARY KEY) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci')
            cursor.executemany('INSERT INTO users (id) VALUES (%s)', [(cls.a,), (cls.b,)])
            migration = Path(__file__).resolve().parents[1] / 'migrations/20261017_01_add_exam_annotations.sql'
            cursor.execute(migration.read_text(encoding='utf-8'))
        cls.app = FastAPI()
        cls.app.include_router(annotations.router)
        cls.client = TestClient(cls.app)

    @classmethod
    def tearDownClass(cls):
        cls.client.close()
        database.config = None
        assert cls.name.startswith('toeic_annotation_test_') and len(cls.name) == 42
        with pymysql.connect(**cls.admin) as conn, conn.cursor() as cursor:
            cursor.execute(f'DROP DATABASE `{cls.name}`')

    def setUp(self):
        self.app.dependency_overrides[auth] = lambda: {'id': self.a}
        self.group = str(uuid.uuid4())

    def payload(self, revision=0, note='saved'):
        return dict(userId=self.a, scope='practice:test', group=self.group, baseRevision=revision, mutationId=str(uuid.uuid4()),
                    document=dict(version=1, items=[], note=note, review=False))

    def read(self, user=None):
        return self.client.get('/api/v1/exam-annotations', params={'userId': user or self.a, 'scope': 'practice:test', 'group': self.group})

    def test_save_read_idempotent_and_stale_write(self):
        self.assertEqual(self.read().json(), {'document': None, 'revision': 0})
        body = self.payload()
        self.assertEqual(self.client.put('/api/v1/exam-annotations', json=body).json()['revision'], 1)
        self.assertEqual(self.client.put('/api/v1/exam-annotations', json=body).json()['revision'], 1)
        self.assertEqual(self.read().json()['document']['note'], 'saved')
        self.assertEqual(self.read().headers['cache-control'], 'no-store')
        self.assertEqual(self.client.put('/api/v1/exam-annotations', json=self.payload()).status_code, 409)
        self.assertEqual(self.client.put('/api/v1/exam-annotations', json=self.payload(1, '')).json()['revision'], 2)
        self.assertEqual(self.read().json()['document']['note'], '')

    def test_auth_and_account_isolation(self):
        self.client.put('/api/v1/exam-annotations', json=self.payload())
        self.assertEqual(self.read(self.b).status_code, 403)
        spoof = self.payload(); spoof['userId'] = self.b
        self.assertEqual(self.client.put('/api/v1/exam-annotations', json=spoof).status_code, 403)
        self.app.dependency_overrides[auth] = lambda: {'id': self.b}
        self.assertIsNone(self.read(self.b).json()['document'])
        self.app.dependency_overrides.clear()
        self.assertEqual(self.read().status_code, 401)

    def test_review_batch_restores_unmarks_and_isolates_scope_account(self):
        def batch(user=None, scope='practice:test'):
            return self.client.post('/api/v1/exam-annotations/review-status', json={
                'userId': user or self.a, 'scope': scope, 'groups': [self.group, 'unseen-group']})
        body = self.payload(); body['document']['review'] = True
        self.assertEqual(self.client.put('/api/v1/exam-annotations', json=body).status_code, 200)
        response = batch()
        self.assertEqual(response.headers['cache-control'], 'no-store')
        self.assertEqual(response.json()['groups'], [{'group': self.group, 'review': True, 'revision': 1}, {'group': 'unseen-group', 'review': False, 'revision': 0}])
        self.assertFalse(batch(scope='exam:test').json()['groups'][0]['review'])
        self.assertEqual(batch(user=self.b).status_code, 403)
        self.app.dependency_overrides[auth] = lambda: {'id': self.b}
        self.assertFalse(batch(user=self.b).json()['groups'][0]['review'])
        self.app.dependency_overrides[auth] = lambda: {'id': self.a}
        self.assertEqual(self.client.put('/api/v1/exam-annotations', json=self.payload(1)).status_code, 200)
        self.assertFalse(batch().json()['groups'][0]['review'])
        too_many = {'userId': self.a, 'scope': 'practice:test', 'groups': ['x'] * 201}
        self.assertEqual(self.client.post('/api/v1/exam-annotations/review-status', json=too_many).status_code, 422)

    def test_racing_updates_have_one_winner(self):
        self.client.put('/api/v1/exam-annotations', json=self.payload())
        requests = [self.payload(1, 'first'), self.payload(1, 'second')]
        with ThreadPoolExecutor(max_workers=2) as pool:
            codes = list(pool.map(lambda body: self.client.put('/api/v1/exam-annotations', json=body).status_code, requests))
        self.assertEqual(sorted(codes), [200, 409])
        self.assertEqual(self.read().json()['revision'], 2)

    def test_validation_and_user_scoped_primary_key(self):
        body = self.payload(); body['document']['review'] = 'true'
        self.assertEqual(self.client.put('/api/v1/exam-annotations', json=body).status_code, 422)
        self.client.put('/api/v1/exam-annotations', json=self.payload())
        self.app.dependency_overrides[auth] = lambda: {'id': self.b}
        body = self.payload(); body['userId'] = self.b
        self.assertEqual(self.client.put('/api/v1/exam-annotations', json=body).status_code, 200)


if __name__ == '__main__':
    unittest.main()
