"""NOTES_TEST_MYSQL=1 opts into a disposable loopback-only database."""
import importlib
import json
import os
from pathlib import Path
import sys
import types
import unittest
import uuid
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
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
        assert self.config and self.config['database'].startswith('toeic_notes_test_')
        conn = pymysql.connect(**self.config)
        try:
            yield conn
        finally:
            conn.close()

    def fetch_one(self, query, params, use_cache=False):
        assert use_cache is False
        with self.connection() as conn, conn.cursor() as cur:
            cur.execute(query, params)
            return cur.fetchone()

    def fetch_all(self, query, params, use_cache=False):
        assert use_cache is False
        with self.connection() as conn, conn.cursor() as cur:
            cur.execute(query, params)
            return list(cur.fetchall())


database = IsolatedDB()
db_module = types.ModuleType('app.db')
db_module.db = database
security_module = types.ModuleType('app.security')


def auth():
    raise HTTPException(401)


security_module.get_current_user = auth
with patch.dict(sys.modules, {'app.db': db_module, 'app.security': security_module}):
    notes = importlib.import_module('app.routers.exam_notes')


class SanitizerTests(unittest.TestCase):
    def test_allowed_formatting_and_no_attributes(self):
        value = '<p onclick="x"><strong>A</strong><em>B</em><u>C</u><mark style="color:red">D</mark></p><ol start="9"><li>E</li></ol>'
        self.assertEqual(notes.sanitize_html(value), '<p><strong>A</strong><em>B</em><u>C</u><mark>D</mark></p><ol><li>E</li></ol>')

    def test_active_content_urls_foreign_markup_and_entities(self):
        value = '<script>alert(1)</script><svg><text>hidden</text></svg><p><a href="javascript:x">safe</a><img src=x onerror=x>&lt;img src=x&gt;</p>'
        self.assertEqual(notes.sanitize_html(value), '<p>safe&lt;img src=x&gt;</p>')
        self.assertEqual(notes.sanitize_html('<p>\u00a0<br></p>'), '')

    def test_malformed_html_is_balanced_and_idempotent(self):
        value = notes.sanitize_html('<p><strong>safe</p>after</strong>')
        self.assertEqual(value, '<p><strong>safe</strong></p>after')
        self.assertEqual(notes.sanitize_html(value), value)

    def test_no_note_quota_or_8000_char_limit(self):
        doc = notes.NoteDocument(version=1, format='html', html='<p>' + 'a' * 10000 + '</p>')
        self.assertEqual(len(notes.sanitize_html(doc.html)), 10007)

    def test_schema_and_scope_keys(self):
        from pydantic import ValidationError
        with self.assertRaises(ValidationError):
            notes.NoteDocument(version=2, format='html', html='x')
        self.assertNotEqual(notes.key_for('a', 'b', 'c'), notes.key_for('a', 'bc', ''))
        self.assertNotEqual(notes.key_for('test:a', 'group', 'q'), notes.key_for('test:b', 'group', 'q'))


@unittest.skipUnless(os.getenv('NOTES_TEST_MYSQL') == '1', 'explicit disposable local DB opt-in required')
class NotesAPITests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cfg = dotenv_values(Path(__file__).resolve().parents[1] / '.env')
        assert cfg.get('DB_HOST', '127.0.0.1') in ('127.0.0.1', 'localhost')
        cls.name = 'toeic_notes_test_' + uuid.uuid4().hex[:20]
        cls.admin = dict(host='127.0.0.1', port=int(cfg.get('DB_PORT') or 3306), user=cfg.get('DB_USER') or 'root',
                         password=cfg.get('DB_PASSWORD') or '', charset='utf8mb4', autocommit=True, cursorclass=pymysql.cursors.DictCursor)
        with pymysql.connect(**cls.admin) as conn, conn.cursor() as cur:
            cur.execute(f'CREATE DATABASE `{cls.name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
        database.config = {**cls.admin, 'database': cls.name}
        cls.a, cls.b = str(uuid.uuid4()), str(uuid.uuid4())
        with database.connection() as conn, conn.cursor() as cur:
            cur.execute('CREATE TABLE users (id CHAR(36) PRIMARY KEY) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci')
            cur.executemany('INSERT INTO users (id) VALUES (%s)', [(cls.a,), (cls.b,)])
            cur.execute((Path(__file__).resolve().parents[1] / 'migrations/20261017_02_add_exam_notes.sql').read_text())
        cls.app = FastAPI()
        cls.app.include_router(notes.router)
        cls.client = TestClient(cls.app)
        cls.env = patch.dict(os.environ, {'EXAM_NOTES_ENABLED': 'true'})
        cls.env.start()

    @classmethod
    def tearDownClass(cls):
        cls.client.close()
        cls.env.stop()
        database.config = None
        assert cls.name.startswith('toeic_notes_test_') and len(cls.name) == 37
        with pymysql.connect(**cls.admin) as conn, conn.cursor() as cur:
            cur.execute(f'DROP DATABASE `{cls.name}`')

    def setUp(self):
        self.app.dependency_overrides[auth] = lambda: {'id': self.a}
        self.group = str(uuid.uuid4())

    def payload(self, question='q1', revision=0, html='<p>Ghi chú</p>'):
        return dict(userId=self.a, scope='test:one', group=self.group, questionId=question, questionNumber=139, part=6,
                    baseRevision=revision, mutationId=str(uuid.uuid4()), document=dict(version=1, format='html', html=html))

    def read(self, user=None, scope='test:one'):
        return self.client.get('/api/v1/exam-notes', params=dict(userId=user or self.a, scope=scope, group=self.group))

    def test_flag_and_account_isolation(self):
        with patch.dict(os.environ, {'EXAM_NOTES_ENABLED': 'false'}):
            self.assertEqual(self.read().status_code, 404)
        self.assertEqual(self.read(self.b).status_code, 403)
        self.assertEqual(self.client.put('/api/v1/exam-notes', json=self.payload()).status_code, 200)
        self.app.dependency_overrides[auth] = lambda: {'id': self.b}
        self.assertEqual(self.read(self.b).json()['notes'], [])
        self.app.dependency_overrides.clear()
        self.assertEqual(self.read().status_code, 401)

    def test_sanitize_roundtrip_tombstone_and_idempotency(self):
        p = self.payload(html='<p onclick="x"><u>safe</u><script>bad</script></p>')
        response = self.client.put('/api/v1/exam-notes', json=p)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['document']['html'], '<p><u>safe</u></p>')
        self.assertEqual(self.client.put('/api/v1/exam-notes', json=p).json()['revision'], 1)
        self.assertEqual(self.read().headers['cache-control'], 'no-store')
        self.assertEqual(self.read().json()['notes'][0]['revision'], 1)
        self.assertEqual(self.read(scope='test:other').json()['notes'], [])
        tombstone = self.payload(revision=1, html='')
        self.assertEqual(self.client.put('/api/v1/exam-notes', json=tombstone).json()['revision'], 2)
        self.assertEqual(self.read().json()['notes'][0]['document']['html'], '')
        self.assertEqual(self.client.put('/api/v1/exam-notes', json=self.payload()).status_code, 409)

    def test_concurrent_question_revisions_and_no_50_note_cap(self):
        self.assertEqual(self.client.put('/api/v1/exam-notes', json=self.payload()).status_code, 200)
        p1, p2 = self.payload(revision=1, html='one'), self.payload(revision=1, html='two')
        with ThreadPoolExecutor(max_workers=2) as pool:
            statuses = list(pool.map(lambda p: self.client.put('/api/v1/exam-notes', json=p).status_code, [p1, p2]))
        self.assertEqual(sorted(statuses), [200, 409])
        for i in range(1, 55):
            self.assertEqual(self.client.put('/api/v1/exam-notes', json=self.payload(question=f'q{i}extra')).status_code, 200)
        self.assertEqual(len(self.read().json()['notes']), 55)
