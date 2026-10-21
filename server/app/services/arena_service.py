"""Persistent two-player arena. All mutations serialize across workers in MySQL.

No network calls, schema creation, bots, or client-supplied XP/correctness.
The small control-row lock is deliberately bounded to short DB transactions.
"""
import json
import logging
import hashlib
import os
import math
import re
import secrets
import time
import unicodedata
import uuid
from contextlib import contextmanager
from html import unescape

from fastapi import HTTPException

MODES = {
    'speed': {'name': 'Part 5 Speed Duel', 'rounds': 7, 'seconds': 15},
    'vocabulary': {'name': 'Vocabulary Blitz', 'rounds': 10, 'seconds': 10},
    'listening': {'name': 'Listening Fill-in', 'rounds': 5, 'seconds': 20},
}
RANKS = [{'name': 'Đồng', 'wager': 20}, {'name': 'Bạc', 'wager': 100}, {'name': 'Vàng', 'wager': 300}]


def rollout_allowed(user):
    if os.getenv('ARENA_ENABLED', 'false').lower() not in ('true', '1'):
        return False
    try:
        percent = max(0, min(100, int(os.getenv('ARENA_ROLLOUT_PERCENT', '0'))))
    except ValueError:
        percent = 0
    cohort = int(hashlib.sha256(user['id'].encode()).hexdigest()[:8], 16) % 100
    return user.get('role') == 'admin' or cohort < percent


def plain(value):
    return unescape(re.sub(r'<[^>]*>', '', str(value or ''))).strip()


def normalize(value):
    return re.sub(r'[^\w\s]', '', unicodedata.normalize('NFKC', str(value))).strip().casefold()


def decoded(value):
    return json.loads(value) if isinstance(value, (str, bytes)) else value


def score_answer(correct, elapsed, seconds):
    return 100 + math.floor(50 * max(0, seconds - max(0, elapsed)) / seconds) if correct else 0


class ArenaService:
    def __init__(self, database, invalidate_user=lambda _: None, clock=time.time):
        self.db = database
        self.invalidate_user = invalidate_user
        self.clock = clock

    @contextmanager
    def transaction(self):
        # Use the existing pool without its global query-cache invalidation.
        with self.db.connection() as conn:
            conn.begin()
            try:
                with conn.cursor() as cur:
                    cur.arena_touched_users = set()
                    cur.execute('SELECT id FROM arena_control WHERE id=1 FOR UPDATE')
                    if not cur.fetchone():
                        raise HTTPException(503, 'Đấu trường chưa sẵn sàng.')
                    yield cur
                    touched = cur.arena_touched_users
                conn.commit()
            except Exception:
                conn.rollback()
                raise
            for uid in touched:
                try:
                    self.invalidate_user(uid)
                except Exception:
                    logging.getLogger(__name__).warning('Arena profile cache invalidation failed')

    def xp(self, cur, uid, amount, key):
        cur.execute('SELECT xp FROM users WHERE id=%s FOR UPDATE', (uid,))
        row = cur.fetchone()
        if not row or int(row['xp']) + amount < 0:
            raise HTTPException(409, 'XP khả dụng không đủ cho mức cược này.')
        cur.execute('INSERT IGNORE INTO user_xp_ledger (user_id,xp_amount,activity_type,dedupe_key,description) '
                    'VALUES (%s,%s,%s,%s,%s)', (uid, amount, 'arena', key, 'Thách đấu TOEICMaster'))
        if cur.rowcount:
            cur.execute('UPDATE users SET xp=xp+%s WHERE id=%s', (amount, uid))
            cur.execute('UPDATE users SET level=(SELECT level FROM level_definitions WHERE xp_required<=users.xp ORDER BY xp_required DESC LIMIT 1) WHERE id=%s', (uid,))
            cur.arena_touched_users.add(uid)

    def players(self, cur, mid):
        cur.execute('SELECT p.*,u.full_name AS name,u.avatar_url AS avatar FROM arena_players p '
                    'JOIN users u ON u.id=p.user_id WHERE match_id=%s ORDER BY user_id', (mid,))
        rows = list(cur.fetchall())
        for p in rows:
            p['answers'] = decoded(p['answers'])
        return rows

    def match(self, cur, mid):
        cur.execute('SELECT * FROM arena_matches WHERE id=%s', (mid,))
        m = cur.fetchone()
        if m:
            m['questions'] = decoded(m['questions'])
        return m

    def settle(self, cur, m, players, winner=None, cancelled=False):
        if m['status'] in ('finished', 'cancelled'):
            return
        for p in players:
            uid = p['user_id']
            refund = m['wager'] if cancelled or winner is None else (m['wager'] + m['wager'] * 70 // 100 if uid == winner else 0)
            self.xp(cur, uid, refund, f"arena:settle:{m['id']}:{uid}")
            delta = refund - m['wager']
            cur.execute('UPDATE arena_players SET active_user_id=NULL,xp_delta=%s WHERE match_id=%s AND user_id=%s', (delta, m['id'], uid))
            if not cancelled:
                cur.execute('INSERT INTO arena_stats (user_id,wins,losses,draws,earned_xp) VALUES (%s,%s,%s,%s,%s) '
                            'ON DUPLICATE KEY UPDATE wins=wins+VALUES(wins),losses=losses+VALUES(losses),'
                            'draws=draws+VALUES(draws),earned_xp=earned_xp+VALUES(earned_xp)',
                            (uid, int(uid == winner), int(winner is not None and uid != winner), int(winner is None), max(0, delta)))
        cur.execute('UPDATE arena_matches SET status=%s,winner_id=%s,finished_at=%s WHERE id=%s',
                    ('cancelled' if cancelled else 'finished', winner, self.clock(), m['id']))
        m.update(status='cancelled' if cancelled else 'finished', winner_id=winner)

    def advance(self, cur, m):
        now = self.clock()
        players = self.players(cur, m['id'])
        if m['status'] in ('waiting', 'searching') and now >= m['expires_at']:
            self.settle(cur, m, players, cancelled=True)
        elif m['status'] == 'playing':
            seconds = MODES[m['mode']]['seconds']
            while m['status'] == 'playing':
                idx = str(m['round_index'])
                answers = [p['answers'].get(idx) for p in players]
                complete = all(answers)
                deadline = m['round_started'] + seconds
                next_time = max(a['at'] for a in answers) + 1.5 if complete else deadline + 1.5
                if now < next_time:
                    break
                if m['round_index'] + 1 == len(m['questions']):
                    best = max(p['score'] for p in players)
                    winners = [p for p in players if p['score'] == best]
                    self.settle(cur, m, players, winners[0]['user_id'] if len(winners) == 1 else None)
                    break
                m['round_index'] += 1
                m['round_started'] = next_time
                cur.execute('UPDATE arena_matches SET round_index=%s,round_started=%s WHERE id=%s',
                            (m['round_index'], m['round_started'], m['id']))

    def cleanup(self, cur):
        # Indexed, bounded recovery of abandoned rooms and interrupted games.
        cur.execute("SELECT id FROM arena_matches WHERE status IN ('waiting','searching','playing') AND expires_at<=%s LIMIT 100", (self.clock(),))
        for row in cur.fetchall():
            self.advance(cur, self.match(cur, row['id']))

    def question_bank(self, cur, mode):
        rng = secrets.SystemRandom()
        result = []
        if mode == 'speed':
            cur.execute("SELECT q.id,q.question_text,q.option_a,q.option_b,q.option_c,q.option_d,q.correct_answer FROM questions q JOIN tests t ON t.id=q.test_id WHERE q.part=5 AND t.is_hidden=0 ORDER BY q.id LIMIT 500")
            for r in cur.fetchall():
                answer = str(r['correct_answer'] or '').upper().strip()
                options = [plain(r[f'option_{k}']) for k in 'abcd']
                if answer in 'ABCD' and len(answer) == 1 and all(options) and plain(r['question_text']):
                    result.append({'id': r['id'], 'prompt': plain(r['question_text']), 'options': options, 'answer': answer})
        elif mode == 'vocabulary':
            cur.execute("SELECT w.id,w.word,w.meaning_vi FROM system_vocabulary_words w JOIN system_vocabulary_sets s ON s.id=w.set_id WHERE s.visibility='public' ORDER BY w.id LIMIT 500")
            rows = list(cur.fetchall())
            meanings = list({plain(r['meaning_vi']) for r in rows if plain(r['meaning_vi'])})
            for r in rows:
                answer = plain(r['meaning_vi'])
                other = [v for v in meanings if v != answer]
                if len(other) >= 3 and plain(r['word']):
                    options = rng.sample(other, 3) + [answer]
                    rng.shuffle(options)
                    result.append({'id': r['id'], 'prompt': plain(r['word']), 'options': options, 'answer': 'ABCD'[options.index(answer)]})
        else:
            cur.execute("SELECT id,text,audio_url,start_time,end_time FROM listening_sentences WHERE audio_url<>'' ORDER BY id LIMIT 500")
            for r in cur.fetchall():
                text = plain(r['text'])
                words = list(re.finditer(r"[A-Za-z]+(?:'[A-Za-z]+)?", text))
                candidates = [w for w in words if len(w.group()) >= 4]
                if candidates and r['audio_url']:
                    word = rng.choice(candidates)
                    result.append({'id': r['id'], 'prompt': text[:word.start()] + '______' + text[word.end():],
                                   'audio': r['audio_url'], 'audioStart': max(0, float(r['start_time'] or 0)),
                                   'audioEnd': float(r['end_time']) if r['end_time'] is not None else None,
                                   'options': [], 'answer': word.group()})
        rounds = MODES[mode]['rounds']
        if len(result) < rounds:
            raise HTTPException(409, 'Chế độ này chưa đủ câu hỏi trong kho học liệu. Vui lòng chọn chế độ khác.')
        return rng.sample(result, rounds)

    def active(self, cur, uid):
        cur.execute('SELECT match_id FROM arena_players WHERE active_user_id=%s', (uid,))
        row = cur.fetchone()
        if row:
            m = self.match(cur, row['match_id'])
            self.advance(cur, m)
            if m['status'] not in ('finished', 'cancelled'):
                return m
        return None

    def view(self, cur, m, uid):
        players = self.players(cur, m['id'])
        own = next((p for p in players if p['user_id'] == uid), None)
        if not own:
            raise HTTPException(404, 'Không tìm thấy trận đấu.')
        now = self.clock()
        idx = str(m['round_index'])
        answer = own['answers'].get(idx)
        revealed = m['status'] == 'finished' or (m['status'] == 'playing' and
                    (all(idx in p['answers'] for p in players) or now >= m['round_started'] + MODES[m['mode']]['seconds']))
        q = m['questions'][m['round_index']] if m['status'] == 'playing' else None
        return {'id': m['id'], 'code': m['code'], 'hostId': m['host_id'], 'mode': m['mode'], 'wager': m['wager'],
                'status': m['status'], 'round': m['round_index'] + 1, 'rounds': len(m['questions']),
                'expiresAt': m['expires_at'], 'endsAt': m['round_started'] + MODES[m['mode']]['seconds'] if m['round_started'] else None,
                'serverTime': now, 'winnerId': m['winner_id'],
                'question': {k: v for k, v in q.items() if k not in ('answer', 'id')} if q else None,
                'feedback': {'correct': answer['correct'] if answer else False, 'answer': q['answer']} if revealed and q else None,
                'submitted': bool(answer),
                'players': [{'id': p['user_id'], 'name': p['name'], 'avatar': p['avatar'], 'ready': bool(p['ready']),
                             'online': now - p['last_seen'] < 35,
                             'score': p['score'] if revealed or m['status'] != 'playing' else None,
                             'answered': idx in p['answers'], 'xpDelta': p['xp_delta']} for p in players]}

    def lobby(self, uid):
        with self.transaction() as cur:
            self.cleanup(cur)
            m = self.active(cur, uid)
            cur.execute('SELECT xp FROM users WHERE id=%s', (uid,))
            balance = int(cur.fetchone()['xp'])
            cur.execute('SELECT wins,losses,draws,earned_xp FROM arena_stats WHERE user_id=%s', (uid,))
            stats = cur.fetchone() or {'wins': 0, 'losses': 0, 'draws': 0, 'earned_xp': 0}
            return {'balance': balance, 'modes': [{'id': k, **v} for k, v in MODES.items()], 'ranks': RANKS,
                    'stats': stats, 'active': self.view(cur, m, uid) if m else None}

    def create(self, uid, mode, wager, quick=False):
        if mode not in MODES or isinstance(wager, bool) or not isinstance(wager, int) or not 10 <= wager <= 1000:
            raise HTTPException(422, 'Chọn chế độ và mức cược từ 10 đến 1.000 XP.')
        with self.transaction() as cur:
            self.cleanup(cur)
            existing = self.active(cur, uid)
            if existing:
                return self.view(cur, existing, uid)
            if quick:
                cur.execute("SELECT id FROM arena_matches WHERE status='searching' AND mode=%s AND wager=%s AND host_id<>%s ORDER BY created_at LIMIT 1", (mode, wager, uid))
                found = cur.fetchone()
                if found:
                    return self.join_locked(cur, uid, self.match(cur, found['id']))
            questions = self.question_bank(cur, mode)
            mid = str(uuid.uuid4())
            while True:
                code = ''.join(secrets.choice('ABCDEFGHJKLMNPQRSTUVWXYZ23456789') for _ in range(6))
                cur.execute('SELECT id FROM arena_matches WHERE code=%s', (code,))
                if not cur.fetchone():
                    break
            now = self.clock()
            self.xp(cur, uid, -wager, f'arena:hold:{mid}:{uid}')
            cur.execute('INSERT INTO arena_matches (id,code,mode,wager,status,host_id,expires_at,questions,created_at) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)',
                        (mid, code, mode, wager, 'searching' if quick else 'waiting', uid, now + (60 if quick else 300), json.dumps(questions), now))
            cur.execute("INSERT INTO arena_players (match_id,user_id,active_user_id,answers,last_seen) VALUES (%s,%s,%s,'{}',%s)", (mid, uid, uid, now))
            return self.view(cur, self.match(cur, mid), uid)

    def join_locked(self, cur, uid, m):
        if m['status'] not in ('waiting', 'searching') or self.clock() >= m['expires_at']:
            raise HTTPException(409, 'Phòng đã hết hạn hoặc trận đấu đã bắt đầu.')
        players = self.players(cur, m['id'])
        if any(p['user_id'] == uid for p in players):
            return self.view(cur, m, uid)
        if len(players) >= 2:
            raise HTTPException(409, 'Phòng đã đủ hai người chơi.')
        self.xp(cur, uid, -m['wager'], f"arena:hold:{m['id']}:{uid}")
        cur.execute("INSERT INTO arena_players (match_id,user_id,active_user_id,answers,last_seen) VALUES (%s,%s,%s,'{}',%s)", (m['id'], uid, uid, self.clock()))
        cur.execute("UPDATE arena_matches SET status='waiting',expires_at=%s WHERE id=%s", (self.clock() + 120, m['id']))
        m.update(status='waiting', expires_at=self.clock() + 120)
        return self.view(cur, m, uid)

    def join(self, uid, code):
        if not re.fullmatch('[A-Z2-9]{6}', code):
            raise HTTPException(422, 'Mã phòng gồm 6 chữ cái hoặc chữ số.')
        with self.transaction() as cur:
            self.cleanup(cur)
            active = self.active(cur, uid)
            if active:
                if active['code'] == code:
                    return self.view(cur, active, uid)
                raise HTTPException(409, 'Bạn cần rời phòng hiện tại trước.')
            cur.execute('SELECT id FROM arena_matches WHERE code=%s', (code,))
            found = cur.fetchone()
            if not found:
                raise HTTPException(404, 'Mã phòng không tồn tại.')
            return self.join_locked(cur, uid, self.match(cur, found['id']))

    def state(self, uid, mid, action=None, payload=None):
        with self.transaction() as cur:
            m = self.match(cur, mid)
            if not m:
                raise HTTPException(404, 'Không tìm thấy trận đấu.')
            players = self.players(cur, mid)
            own = next((p for p in players if p['user_id'] == uid), None)
            if not own:
                raise HTTPException(404, 'Không tìm thấy trận đấu.')
            if m['status'] not in ('finished', 'cancelled') and self.clock() - own['last_seen'] > 15:
                cur.execute('UPDATE arena_players SET last_seen=%s WHERE match_id=%s AND user_id=%s', (self.clock(), mid, uid))
            self.advance(cur, m)
            if action == 'leave' and m['status'] not in ('finished', 'cancelled'):
                other = next((p for p in players if p['user_id'] != uid), None)
                self.settle(cur, m, players, other['user_id'] if other and m['status'] == 'playing' else None, cancelled=m['status'] != 'playing')
            elif action == 'ready' and m['status'] == 'waiting':
                cur.execute('UPDATE arena_players SET ready=1 WHERE match_id=%s AND user_id=%s', (mid, uid))
            elif action == 'start' and m['status'] == 'waiting':
                if uid != m['host_id'] or len(players) != 2 or not all(p['ready'] for p in players):
                    raise HTTPException(409, 'Chủ phòng chỉ có thể bắt đầu khi cả hai đã sẵn sàng.')
                started = self.clock() + 3
                expires = started + len(m['questions']) * (MODES[m['mode']]['seconds'] + 1.5)
                cur.execute("UPDATE arena_matches SET status='playing',round_started=%s,expires_at=%s WHERE id=%s", (started, expires, mid))
                m.update(status='playing', round_started=started, expires_at=expires)
            elif action == 'answer':
                if m['status'] != 'playing' or not payload or payload['round'] != m['round_index'] + 1:
                    raise HTTPException(409, 'Vòng chơi đã thay đổi. Hãy tải lại trận đấu.')
                now = self.clock()
                idx = str(m['round_index'])
                seconds = MODES[m['mode']]['seconds']
                if idx not in own['answers']:
                    if now < m['round_started'] or now >= m['round_started'] + seconds:
                        raise HTTPException(409, 'Câu hỏi chưa bắt đầu hoặc đã hết giờ.')
                    q = m['questions'][m['round_index']]
                    correct = normalize(payload['answer']) == normalize(q['answer'])
                    points = score_answer(correct, now - m['round_started'], seconds)
                    own['answers'][idx] = {'correct': correct, 'at': now, 'points': points}
                    cur.execute('UPDATE arena_players SET answers=%s,score=score+%s WHERE match_id=%s AND user_id=%s', (json.dumps(own['answers']), points, mid, uid))
            return self.view(cur, m, uid)

    def leaderboard(self, limit=20):
        with self.db.connection() as conn, conn.cursor() as cur:
            cur.execute('SELECT s.*,u.full_name AS name,u.avatar_url AS avatar FROM arena_stats s JOIN users u ON u.id=s.user_id '
                        'ORDER BY s.earned_xp DESC,s.wins DESC,s.user_id LIMIT %s', (limit,))
            return list(cur.fetchall())

    def history(self, uid):
        with self.db.connection() as conn, conn.cursor() as cur:
            cur.execute("SELECT m.id,m.mode,m.wager,m.status,m.winner_id,m.finished_at,p.score,p.xp_delta,"
                        "u.full_name AS opponent FROM arena_players p JOIN arena_matches m ON m.id=p.match_id "
                        "LEFT JOIN arena_players o ON o.match_id=m.id AND o.user_id<>p.user_id "
                        "LEFT JOIN users u ON u.id=o.user_id WHERE p.user_id=%s AND m.status IN ('finished','cancelled') "
                        "ORDER BY m.finished_at DESC LIMIT 50", (uid,))
            return list(cur.fetchall())

    def transactions(self, uid):
        with self.db.connection() as conn, conn.cursor() as cur:
            cur.execute("SELECT id,xp_amount,dedupe_key,created_at FROM user_xp_ledger WHERE user_id=%s AND activity_type='arena' ORDER BY id DESC LIMIT 50", (uid,))
            return list(cur.fetchall())

    def expire_abandoned(self):
        with self.transaction() as cur:
            self.cleanup(cur)
