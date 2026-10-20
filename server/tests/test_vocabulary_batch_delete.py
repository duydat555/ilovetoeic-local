"""Exercise the actual batch handler against in-memory SQLite, never app.db/user data."""
import ast
from pathlib import Path
import sqlite3
import unittest
from typing import List

from fastapi import Depends, FastAPI, HTTPException
from fastapi.testclient import TestClient
from pydantic import BaseModel, Field


class VocabularyBatchTests(unittest.TestCase):
    def setUp(self):
        self.connection = sqlite3.connect(':memory:', check_same_thread=False)
        self.connection.execute('CREATE TABLE user_vocabulary (id TEXT PRIMARY KEY, user_id TEXT)')
        self.connection.executemany('INSERT INTO user_vocabulary VALUES (?,?)', [('a', 'u1'), ('b', 'u1'), ('c', 'u2')])
        class DB:
            execute = self.connection.execute

        def authenticated():
            raise HTTPException(401)

        tree = ast.parse((Path(__file__).parents[1] / 'app/routers/user_data.py').read_text(encoding='utf-8'))
        nodes = [n for n in tree.body if getattr(n, 'name', '') in ('VocabularyDeleteBatchPayload', 'delete_vocabulary_batch')]
        for node in nodes:
            if isinstance(node, ast.FunctionDef):
                node.decorator_list = []
        namespace = dict(BaseModel=BaseModel, Field=Field, List=List, Depends=Depends, get_current_user=authenticated, db=DB())
        exec(compile(ast.Module(body=nodes, type_ignores=[]), '<batch handler>', 'exec'), namespace)
        self.app = FastAPI()
        self.app.post('/batch')(namespace['delete_vocabulary_batch'])
        self.app.dependency_overrides[authenticated] = lambda: {'id': 'u1'}
        self.client = TestClient(self.app)

    def tearDown(self):
        self.client.close()
        self.connection.close()

    def test_account_scope_duplicates_and_retry(self):
        body = {'word_ids': ['a', 'c', 'a', 'missing']}
        self.assertEqual(self.client.post('/batch', json=body).status_code, 200)
        self.assertEqual(self.connection.execute('SELECT id FROM user_vocabulary ORDER BY id').fetchall(), [('b',), ('c',)])
        self.assertEqual(self.client.post('/batch', json=body).status_code, 200)

    def test_authentication_and_batch_limits(self):
        self.app.dependency_overrides.clear()
        self.assertEqual(self.client.post('/batch', json={'word_ids': ['a']}).status_code, 401)
        self.app.dependency_overrides[next(iter(self.app.routes[-1].dependant.dependencies)).call] = lambda: {'id': 'u1'}
        for ids in [[], ['a'] * 501]:
            self.assertEqual(self.client.post('/batch', json={'word_ids': ids}).status_code, 422)


if __name__ == '__main__':
    unittest.main()
