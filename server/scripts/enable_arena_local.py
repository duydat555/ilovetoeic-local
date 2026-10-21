"""Back up and prepare Arena on the loopback Docker MySQL development server.

Does not enable the admin feature flag. Never use for production or SSH tunnels.
"""
import gzip
import os
from pathlib import Path
import shutil
import subprocess
from datetime import datetime

import pymysql
from dotenv import dotenv_values, set_key


def main():
    root = Path(__file__).resolve().parents[1]
    env_path = root / '.env'
    cfg = dotenv_values(env_path)
    if cfg.get('DB_HOST') not in ('127.0.0.1', 'localhost'):
        raise RuntimeError('Only loopback development databases are supported')
    options = dict(host=cfg['DB_HOST'], port=int(cfg.get('DB_PORT', 3306)),
                   user=cfg['DB_USER'], password=cfg['DB_PASSWORD'], database=cfg['DB_NAME'],
                   charset='utf8mb4', autocommit=True, connect_timeout=5)
    child_env = {**os.environ, 'MYSQL_PWD': cfg['DB_PASSWORD']}
    base = ['docker', 'exec', '--env', 'MYSQL_PWD', 'mysql-toeic']
    with pymysql.connect(**options) as conn, conn.cursor() as cur:
        cur.execute('SELECT @@server_uuid')
        actual = cur.fetchone()[0]
        identity = subprocess.run(base + ['mysql', '-u', cfg['DB_USER'], '-Nse', 'SELECT @@server_uuid'],
                                  env=child_env, capture_output=True, check=True).stdout.decode().strip()
        if identity != actual:
            raise RuntimeError('Loopback database differs from local Docker MySQL; no changes applied')
        cur.execute("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=%s AND TABLE_NAME IN ('user_xp_ledger','level_definitions')", (cfg['DB_NAME'],))
        if cur.fetchone()[0] != 2:
            raise RuntimeError('Existing XP migration is required; no changes applied')

    backup_dir = root / 'backups'
    backup_dir.mkdir(exist_ok=True)
    stamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup = backup_dir / f'before_arena_local_{stamp}.sql.gz'
    args = base + ['mysqldump', '-u', cfg['DB_USER'], '--single-transaction', '--quick',
                   '--no-tablespaces', '--set-gtid-purged=OFF', '--column-statistics=0', cfg['DB_NAME']]
    proc = subprocess.Popen(args, env=child_env, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    with gzip.open(backup, 'wb') as output:
        shutil.copyfileobj(proc.stdout, output)
    proc.stderr.read()
    if proc.wait() != 0 or backup.stat().st_size < 100:
        raise RuntimeError('Local backup failed; no migration or configuration changes applied')
    with gzip.open(backup, 'rb') as stream:
        header = stream.read(1024)
        if b'MySQL dump' not in header:
            raise RuntimeError('Backup validation failed; no changes applied')
        while stream.read(1024 * 1024):
            pass  # Validate the complete gzip checksum before changing anything.
    shutil.copy2(env_path, backup_dir / f'server_env_before_arena_{stamp}.bak')
    migration = root / 'migrations/20261021_01_add_arena.sql'
    with pymysql.connect(**options) as conn, conn.cursor() as cur:
        for statement in migration.read_text(encoding='utf-8').split(';'):
            if statement.strip():
                cur.execute(statement)
        cur.execute("SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=%s AND TABLE_NAME IN ('arena_control','arena_matches','arena_players','arena_stats')", (cfg['DB_NAME'],))
        if cur.fetchone()[0] != 4:
            raise RuntimeError('Migration incomplete; configuration was not enabled')
    set_key(str(env_path), 'ARENA_ENABLED', 'true')
    set_key(str(env_path), 'ARENA_ROLLOUT_PERCENT', '100')
    print(f'Local backup verified: {backup.name} ({backup.stat().st_size} bytes)')
    print('Arena tables ready. Local server enabled for all local accounts; admin flag preserved.')
    print('Restart the local API to load its environment settings.')


if __name__ == '__main__':
    main()
