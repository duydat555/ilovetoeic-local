"""Loopback browser test harness with real auth, actual app and isolated MySQL.

Run from server: python tests/arena_browser_server.py
It never imports the production Database constructor or modifies .env.
"""
import hashlib
import os
from pathlib import Path
import sys
import types

import uvicorn

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from arena_fixture import ArenaFixture


def main():
    fixture = ArenaFixture().setup()
    try:
        db_module = types.ModuleType('app.db')
        db_module.db = fixture
        sys.modules['app.db'] = db_module
        from app import config
        config.REDIS_ENABLED = False
        os.environ['ARENA_ENABLED'] = 'true'
        os.environ['ARENA_ROLLOUT_PERCENT'] = '100'
        for i, uid in enumerate(fixture.ids):
            token = f'arena-browser-test-{i + 1}'
            fixture.execute('INSERT INTO user_sessions (token_hash,user_id,expires_at) VALUES (?,?,DATE_ADD(UTC_TIMESTAMP(), INTERVAL 1 DAY))', (hashlib.sha256(token.encode()).hexdigest(), uid))
        import main as application
        from fastapi import Depends
        from fastapi.responses import Response
        from app.security import get_current_user
        # Ancillary shell endpoints have separate migrations outside Arena scope.
        # Intercept only these routes, never Arena/auth/feature endpoints.
        @application.app.middleware('http')
        async def shell_fixture(request, call_next):
            from fastapi.responses import JSONResponse
            if request.url.path == '/api/v1/announcements/active':
                return JSONResponse({'success': True, 'data': []})
            return await call_next(request)

        @application.app.get('/api/v1/arena-test/identity')
        def identity(user=Depends(get_current_user)):
            return {'id': user['id']}

        @application.app.get('/api/v1/arena-test/audio')
        def test_audio():
            import io
            import math
            import struct
            import wave
            buf = io.BytesIO()
            with wave.open(buf, 'wb') as wav:
                wav.setnchannels(1); wav.setsampwidth(2); wav.setframerate(8000)
                wav.writeframes(b''.join(struct.pack('<h', int(700 * math.sin(i * 440 * 2 * math.pi / 8000))) for i in range(8000)))
            return Response(buf.getvalue(), media_type='audio/wav')

        @application.app.post('/api/v1/arena-test/fast-forward')
        def fast_forward(user=Depends(get_current_user)):
            # Only in this disposable test process, never registered by main.py.
            fixture.execute("UPDATE arena_matches m JOIN arena_players p ON p.match_id=m.id SET m.round_started=m.round_started-30 WHERE p.user_id=? AND m.status='playing'", (user['id'],))
            return {'ok': True}

        print('ARENA_BROWSER_TEST_READY http://127.0.0.1:8009', flush=True)
        uvicorn.run(application.app, host='127.0.0.1', port=8009, log_level='warning')
    finally:
        fixture.close()


if __name__ == '__main__':
    main()
