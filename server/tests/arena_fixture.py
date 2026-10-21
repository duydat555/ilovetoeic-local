"""Disposable loopback MySQL fixture; never imports app.db initialization.

Only fresh toeic_arena_test_<uuid> databases may be created or dropped.
"""
from contextlib import contextmanager
from pathlib import Path
import re
import uuid

import pymysql
from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parents[1]


class ArenaFixture:
    def __init__(self):
        cfg = dotenv_values(ROOT / '.env')
        if cfg.get('DB_HOST') not in ('127.0.0.1', 'localhost'):
            raise RuntimeError('Arena tests require loopback MySQL')
        self.name = 'toeic_arena_test_' + uuid.uuid4().hex
        self.options = dict(host='127.0.0.1', port=int(cfg.get('DB_PORT') or 3306),
                            user=cfg.get('DB_USER'), password=cfg.get('DB_PASSWORD'),
                            charset='utf8mb4', cursorclass=pymysql.cursors.DictCursor, autocommit=True)
        self.ids = [str(uuid.uuid4()) for _ in range(4)]
        self.is_connected = True

    @contextmanager
    def connection(self):
        assert re.fullmatch(r'toeic_arena_test_[0-9a-f]{32}', self.name)
        conn = pymysql.connect(**self.options, database=self.name)
        try:
            yield conn
        finally:
            conn.close()

    def fetch_all(self, sql, params=(), use_cache=False):
        with self.connection() as conn, conn.cursor() as cur:
            cur.execute(sql.replace('?', '%s'), params)
            return list(cur.fetchall())

    def fetch_one(self, sql, params=(), use_cache=False):
        return next(iter(self.fetch_all(sql, params, use_cache)), None)

    def execute(self, sql, params=(), **kwargs):
        with self.connection() as conn, conn.cursor() as cur:
            cur.execute(sql.replace('?', '%s'), params)
            return cur.lastrowid

    def setup(self):
        with pymysql.connect(**self.options) as conn, conn.cursor() as cur:
            cur.execute(f'CREATE DATABASE `{self.name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
        try:
            with self.connection() as conn, conn.cursor() as cur:
                schema = '\n'.join(line for line in (ROOT / 'mysql_schema.sql').read_text(encoding='utf-8').splitlines() if not line.lstrip().startswith('--'))
                for statement in schema.split(';'):
                    if statement.strip():
                        cur.execute(statement)
                # Existing XP prerequisites, isolated from production migrations.
                cur.execute("CREATE TABLE level_definitions (level INT PRIMARY KEY,xp_required INT NOT NULL,title VARCHAR(50) DEFAULT 'Test',badge_icon VARCHAR(50) DEFAULT 'medal',color VARCHAR(50) DEFAULT 'gold')")
                cur.execute('INSERT INTO level_definitions (level,xp_required) VALUES (1,0),(2,100),(3,1000)')
                cur.execute('CREATE TABLE user_xp_ledger (id BIGINT AUTO_INCREMENT PRIMARY KEY,user_id CHAR(36),xp_amount INT,activity_type VARCHAR(50),dedupe_key VARCHAR(150) UNIQUE,description VARCHAR(255),created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB')
                cur.execute('CREATE TABLE user_daily_study_time (user_id CHAR(36),study_date DATE,total_seconds INT NOT NULL DEFAULT 0,PRIMARY KEY(user_id,study_date))')
                cur.execute('CREATE TABLE user_study_goals (user_id CHAR(36) PRIMARY KEY,daily_goal_minutes INT DEFAULT 30)')
                for statement in (ROOT / 'migrations/20261021_01_add_arena.sql').read_text(encoding='utf-8').split(';'):
                    if statement.strip():
                        cur.execute(statement)
                cur.execute("UPDATE feature_flags SET is_enabled=1 WHERE feature_key='arena'")
                for i, uid in enumerate(self.ids):
                    cur.execute("INSERT INTO users(id,email,full_name,approval_status,xp) VALUES (%s,%s,%s,'approved',1000)", (uid, f'arena-test-{i}@example.invalid', f'Player{i + 1}_K1'))
                cur.execute("INSERT INTO tests (id,name,year) VALUES ('arena-test-bank','Arena test fixtures',2026)")
                for i in range(12):
                    cur.execute("INSERT INTO questions (id,test_id,part,question_number,question_text,option_a,option_b,option_c,option_d,correct_answer) VALUES (%s,'arena-test-bank',5,%s,%s,'works','working','work','worked','A')", (f'arena-q-{i}', i + 1, 'The team ____ together.'))
                cur.execute('CREATE TABLE listening_sentences (id VARCHAR(100) PRIMARY KEY,text TEXT,audio_url TEXT,start_time FLOAT DEFAULT 0,end_time FLOAT NULL)')
                for i in range(12):
                    cur.execute('INSERT INTO listening_sentences (id,text,audio_url) VALUES (%s,%s,%s)', (f'arena-l-{i}', 'Please confirm the meeting tomorrow.', '/api/v1/arena-test/audio'))
                cur.execute("INSERT INTO system_vocabulary_sets (id,name) VALUES ('arena-test-set','Test fixtures')")
                cur.execute("INSERT INTO system_vocabulary_topics(id,set_id,name) VALUES ('arena-test-topic','arena-test-set','Test fixtures')")
                for i in range(12):
                    cur.execute("INSERT INTO system_vocabulary_words(id,set_id,topic_id,part_id,word,meaning_vi) VALUES (%s,'arena-test-set','arena-test-topic','1',%s,%s)", (f'arena-v-{i}', f'term{i}', f'nghĩa {i}'))
        except Exception:
            self.close()
            raise
        return self

    def reset(self):
        with self.connection() as conn, conn.cursor() as cur:
            cur.execute('DELETE FROM arena_players')
            cur.execute('DELETE FROM arena_matches')
            cur.execute('DELETE FROM arena_stats')
            cur.execute('DELETE FROM user_xp_ledger')
            cur.execute('UPDATE users SET xp=1000,level=3')

    def close(self):
        assert re.fullmatch(r'toeic_arena_test_[0-9a-f]{32}', self.name)
        with pymysql.connect(**self.options) as conn, conn.cursor() as cur:
            cur.execute(f'DROP DATABASE `{self.name}`')
