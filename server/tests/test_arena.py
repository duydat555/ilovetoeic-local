import importlib
import json
import os
from pathlib import Path
import sys
import types
import unittest
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import patch

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.services.arena_service import ArenaService, normalize, score_answer
from arena_fixture import ArenaFixture


class ArenaUnitTests(unittest.TestCase):
    def test_score_bounds(self):
        self.assertEqual(score_answer(True, 0, 15), 150)
        self.assertEqual(score_answer(True, 15, 15), 100)
        self.assertEqual(score_answer(False, 1, 15), 0)
        self.assertEqual(score_answer(True, -100, 15), 150)

    def test_normalize(self):
        self.assertEqual(normalize('  MEETING! '), 'meeting')


@unittest.skipUnless(os.getenv('ARENA_TEST_MYSQL') == '1', 'requires disposable local MySQL opt-in')
class ArenaIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.db = ArenaFixture().setup()
        db_module = types.ModuleType('app.db')
        db_module.db = cls.db
        security = types.ModuleType('app.security')
        def auth():
            raise HTTPException(401)
        security.get_current_user = auth
        security.invalidate_user_session = lambda uid: None
        cache = types.ModuleType('app.services.cache_service')
        cache.cache_service = types.SimpleNamespace(delete=lambda key: None)
        with patch.dict(sys.modules, {'app.db': db_module, 'app.security': security, 'app.services.cache_service': cache}):
            cls.router = importlib.import_module('app.routers.arena')
        cls.app = FastAPI()
        cls.app.include_router(cls.router.router)
        cls.client = TestClient(cls.app)
        cls.auth = staticmethod(auth)
        cls.env = patch.dict(os.environ, {'ARENA_ENABLED': 'true', 'ARENA_ROLLOUT_PERCENT': '100'})
        cls.env.start()

    @classmethod
    def tearDownClass(cls):
        cls.client.close()
        cls.env.stop()
        cls.db.close()

    def setUp(self):
        self.db.reset()
        self.now = 1000000.0
        self.a, self.b, self.c, self.d = self.db.ids
        self.service = ArenaService(self.db, clock=lambda: self.now)
        self.router.service = self.service
        self.app.dependency_overrides[self.auth] = lambda: {'id': self.a, 'role': 'student'}

    def balance(self, uid):
        return self.db.fetch_one('SELECT xp FROM users WHERE id=?', (uid,))['xp']

    def started(self, mode='speed', quick=False):
        a = self.service.create(self.a, mode, 20, quick)
        b = self.service.create(self.b, mode, 20, True) if quick else self.service.join(self.b, a['code'])
        self.assertEqual(a['id'], b['id'])
        self.service.state(self.a, a['id'], 'ready')
        self.service.state(self.b, a['id'], 'ready')
        self.service.state(self.a, a['id'], 'start')
        self.now += 3.1
        return self.service.state(self.a, a['id'])

    def test_room_reservation_retry_cancel_refund(self):
        room = self.service.create(self.a, 'speed', 20)
        again = self.service.create(self.a, 'speed', 20)
        self.assertEqual(room['id'], again['id'])
        self.assertEqual(self.balance(self.a), 980)
        self.service.join(self.b, room['code'])
        with self.assertRaises(HTTPException):
            self.service.join(self.c, room['code'])
        self.service.state(self.a, room['id'], 'leave')
        self.service.state(self.a, room['id'], 'leave')
        self.assertEqual(self.balance(self.a), 1000)
        self.assertEqual(self.balance(self.b), 1000)

    def test_matchmaking_complete_all_modes_and_ledger(self):
        for mode in ('speed', 'vocabulary', 'listening'):
            with self.subTest(mode=mode):
                self.db.reset()
                m = self.started(mode, quick=True)
                for n in range(1, m['rounds'] + 1):
                    stored = self.db.fetch_one('SELECT questions FROM arena_matches WHERE id=?', (m['id'],))
                    answer = json.loads(stored['questions'])[n - 1]['answer']
                    a = self.service.state(self.a, m['id'], 'answer', {'round': n, 'answer': answer})
                    self.assertIsNone(a['feedback'])
                    self.assertIsNone(a['players'][0]['score'])
                    self.assertNotIn('answer', a['question'])
                    self.service.state(self.a, m['id'], 'answer', {'round': n, 'answer': 'wrong'})
                    self.service.state(self.b, m['id'], 'answer', {'round': n, 'answer': 'wrong'})
                    self.now += 1.6
                    m = self.service.state(self.a, m['id'])
                self.assertEqual(m['status'], 'finished')
                self.assertEqual(m['winnerId'], self.a)
                self.assertEqual(self.balance(self.a), 1014)
                self.assertEqual(self.balance(self.b), 980)
                self.service.state(self.a, m['id'])
                self.assertEqual(self.balance(self.a), 1014)
                self.assertEqual(self.service.history(self.a)[0]['xp_delta'], 14)
                self.assertEqual(self.service.leaderboard()[0]['user_id'], self.a)
                ledger = self.db.fetch_all('SELECT user_id,SUM(xp_amount) AS total FROM user_xp_ledger GROUP BY user_id')
                for entry in ledger:
                    self.assertEqual(self.balance(entry['user_id']), 1000 + entry['total'])

    def test_concurrent_queue_and_duplicate_answers(self):
        with ThreadPoolExecutor(2) as pool:
            results = list(pool.map(lambda uid: self.service.create(uid, 'speed', 20, True), [self.a, self.b]))
        self.assertEqual(results[0]['id'], results[1]['id'])
        room = results[0]
        self.service.state(self.a, room['id'], 'ready')
        self.service.state(self.b, room['id'], 'ready')
        host = room['hostId']
        self.service.state(host, room['id'], 'start')
        self.now += 3.1
        with ThreadPoolExecutor(8) as pool:
            list(pool.map(lambda _: self.service.state(self.a, room['id'], 'answer', {'round': 1, 'answer': 'A'}), range(8)))
        p = self.db.fetch_one('SELECT answers,score FROM arena_players WHERE match_id=? AND user_id=?', (room['id'], self.a))
        self.assertEqual(len(json.loads(p['answers'])), 1)
        self.assertLessEqual(p['score'], 150)

    def test_expiry_restart_reconnect_and_tie(self):
        room = self.service.create(self.a, 'speed', 20, True)
        self.now += 61
        self.assertEqual(self.service.lobby(self.a)['balance'], 1000)
        self.assertEqual(self.service.state(self.a, room['id'])['status'], 'cancelled')
        m = self.started()
        restarted = ArenaService(self.db, clock=lambda: self.now)
        self.assertEqual(restarted.lobby(self.a)['active']['id'], m['id'])
        self.now += 500
        final = restarted.state(self.a, m['id'])
        self.assertEqual(final['status'], 'finished')
        self.assertIsNone(final['winnerId'])
        self.assertEqual(self.balance(self.a), 1000)
        self.assertEqual(self.balance(self.b), 1000)

    def test_authorization_ready_round_deadline_and_forfeit(self):
        room = self.service.create(self.a, 'speed', 20)
        for uid, action in [(self.c, None), (self.a, 'start')]:
            with self.assertRaises(HTTPException):
                self.service.state(uid, room['id'], action)
        self.service.state(self.a, room['id'], 'leave')
        m = self.started()
        with self.assertRaises(HTTPException):
            self.service.state(self.b, m['id'], 'answer', {'round': 2, 'answer': 'A'})
        self.service.state(self.a, m['id'], 'leave')
        self.assertEqual(self.balance(self.a), 980)
        self.assertEqual(self.balance(self.b), 1014)
        custom = self.service.create(self.a, 'speed', 90)
        self.service.join(self.b, custom['code'])
        self.service.state(self.a, custom['id'], 'ready')
        self.service.state(self.b, custom['id'], 'ready')
        self.service.state(self.a, custom['id'], 'start')
        self.service.state(self.a, custom['id'], 'leave')
        self.assertEqual(self.balance(self.a), 890)
        self.assertEqual(self.balance(self.b), 1077)  # exact floor(90*70/100) = 63

    def test_api_auth_flags_payloads_insufficient_balance(self):
        self.app.dependency_overrides.clear()
        self.assertEqual(self.client.get('/api/v1/arena/lobby').status_code, 401)
        self.app.dependency_overrides[self.auth] = lambda: {'id': self.a, 'role': 'student'}
        with patch.dict(os.environ, {'ARENA_ENABLED': 'false'}):
            self.assertEqual(self.client.get('/api/v1/arena/lobby').status_code, 503)
        with patch.dict(os.environ, {'ARENA_ROLLOUT_PERCENT': '0'}):
            self.assertEqual(self.client.get('/api/v1/arena/lobby').status_code, 403)
        for wager in (-1, 0, 1001, True, '20'):
            self.assertEqual(self.client.post('/api/v1/arena/rooms', json={'mode': 'speed', 'wager': wager}).status_code, 422)
        self.assertEqual(self.client.post('/api/v1/arena/rooms', json={'mode': 'speed', 'wager': 20, 'score': 999}).status_code, 422)
        self.assertEqual(self.client.post('/api/v1/arena/join', json={'code': 'ABC'}).status_code, 422)
        self.assertEqual(self.client.post('/api/v1/arena/join', json={'code': 'ZZZZZZ'}).status_code, 404)
        self.db.execute('UPDATE users SET xp=9 WHERE id=?', (self.a,))
        self.assertEqual(self.client.post('/api/v1/arena/rooms', json={'mode': 'speed', 'wager': 20}).status_code, 409)
        self.assertEqual(self.balance(self.a), 9)

    def test_transaction_rolls_back_hold_if_create_fails(self):
        with patch.object(self.service, 'view', side_effect=RuntimeError('simulated failure')):
            with self.assertRaises(RuntimeError):
                self.service.create(self.a, 'speed', 20)
        self.assertEqual(self.balance(self.a), 1000)
        self.assertEqual(self.db.fetch_one('SELECT COUNT(*) AS n FROM user_xp_ledger')['n'], 0)

    def test_no_eligible_content_and_hidden_banks(self):
        self.db.execute("UPDATE tests SET is_hidden=1 WHERE id='arena-test-bank'")
        self.assertEqual(self.client.post('/api/v1/arena/rooms', json={'mode': 'speed', 'wager': 20}).status_code, 409)
        self.db.execute("UPDATE system_vocabulary_sets SET visibility='private'")
        self.assertEqual(self.client.post('/api/v1/arena/rooms', json={'mode': 'vocabulary', 'wager': 20}).status_code, 409)
        self.assertEqual(self.balance(self.a), 1000)
        self.db.execute("UPDATE tests SET is_hidden=0")
        self.db.execute("UPDATE system_vocabulary_sets SET visibility='public'")

    def test_concurrent_same_user_create_and_background_expiry(self):
        with ThreadPoolExecutor(5) as pool:
            rooms = list(pool.map(lambda _: self.service.create(self.a, 'speed', 20), range(5)))
        self.assertEqual(len({m['id'] for m in rooms}), 1)
        self.assertEqual(self.balance(self.a), 980)
        self.now += 301
        self.service.expire_abandoned()
        self.service.expire_abandoned()
        self.assertEqual(self.balance(self.a), 1000)
        self.assertEqual(len(self.service.transactions(self.a)), 2)

    def test_deadline_rejects_late_answers_and_parallel_settlement(self):
        m = self.started()
        self.now += 15
        with self.assertRaises(HTTPException):
            self.service.state(self.a, m['id'], 'answer', {'round': 1, 'answer': 'A'})
        self.now += 1000
        with ThreadPoolExecutor(5) as pool:
            list(pool.map(lambda _: self.service.state(self.a, m['id']), range(5)))
        self.assertEqual(self.balance(self.a), 1000)
        self.assertEqual(self.balance(self.b), 1000)
        self.assertEqual(self.db.fetch_one('SELECT COUNT(*) AS n FROM arena_stats')['n'], 2)

    def test_presence_and_participant_history_authorization(self):
        m = self.started()
        self.now += 36
        state = self.service.state(self.a, m['id'])
        other = next(p for p in state['players'] if p['id'] == self.b)
        self.assertFalse(other['online'])
        resumed = self.service.state(self.b, m['id'])
        self.assertTrue(next(p for p in resumed['players'] if p['id'] == self.b)['online'])
        self.assertEqual(self.service.history(self.c), [])
        self.assertEqual(self.service.transactions(self.c), [])


if __name__ == '__main__':
    unittest.main()
