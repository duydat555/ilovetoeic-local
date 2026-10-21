import asyncio
import logging
import os
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from app.db import db
from app.security import get_current_user, invalidate_user_session
from app.services.arena_service import ArenaService, rollout_allowed
from app.services.cache_service import cache_service

router = APIRouter(prefix='/api/v1/arena', tags=['Arena'])
def invalidate_arena_user(uid):
    invalidate_user_session(uid)
    cache_service.delete('leaderboard:ranking_data')


service = ArenaService(db, invalidate_arena_user)


async def expire_abandoned_rooms():
    """Bounded recovery even with no clients online; disabled installs make no queries."""
    while True:
        await asyncio.sleep(15)
        if os.getenv('ARENA_ENABLED', 'false').lower() not in ('true', '1'):
            continue
        try:
            await asyncio.to_thread(service.expire_abandoned)
        except asyncio.CancelledError:
            raise
        except Exception:
            logging.getLogger(__name__).warning('Arena expiry deferred; check database/migration availability')


def arena_user(user=Depends(get_current_user)):
    if os.getenv('ARENA_ENABLED', 'false').lower() not in ('true', '1'):
        raise HTTPException(503, 'Đấu trường đang được chuẩn bị. Vui lòng quay lại sau.')
    flag = db.fetch_one('SELECT is_enabled FROM feature_flags WHERE feature_key = ?', ('arena',), use_cache=False)
    if not flag or not flag['is_enabled']:
        raise HTTPException(403, 'Đấu trường chưa được mở cho tài khoản của bạn.')
    if not rollout_allowed(user):
        raise HTTPException(403, 'Đấu trường chưa được mở cho tài khoản của bạn.')
    return user


class CreateRoom(BaseModel):
    model_config = ConfigDict(extra='forbid')
    mode: Literal['speed', 'vocabulary', 'listening']
    wager: int = Field(ge=10, le=1000, strict=True)


class JoinRoom(BaseModel):
    model_config = ConfigDict(extra='forbid')
    code: str = Field(pattern=r'^[A-Z2-9]{6}$')


class Answer(BaseModel):
    model_config = ConfigDict(extra='forbid')
    round: int = Field(ge=1, le=10, strict=True)
    answer: str = Field(max_length=160, min_length=1)


@router.get('/lobby')
def lobby(user=Depends(arena_user)):
    return service.lobby(user['id'])


@router.post('/rooms')
def create(payload: CreateRoom, user=Depends(arena_user)):
    return service.create(user['id'], payload.mode, payload.wager)


@router.post('/queue')
def queue(payload: CreateRoom, user=Depends(arena_user)):
    return service.create(user['id'], payload.mode, payload.wager, quick=True)


@router.post('/join')
def join(payload: JoinRoom, user=Depends(arena_user)):
    return service.join(user['id'], payload.code)


@router.get('/matches/{match_id}')
def state(match_id: str, user=Depends(arena_user)):
    return service.state(user['id'], match_id)


@router.post('/matches/{match_id}/answer')
def answer(match_id: str, payload: Answer, user=Depends(arena_user)):
    return service.state(user['id'], match_id, 'answer', payload.model_dump())


@router.post('/matches/{match_id}/{action}')
def action(match_id: str, action: Literal['ready', 'start', 'leave'], user=Depends(arena_user)):
    return service.state(user['id'], match_id, action)


@router.get('/leaderboard')
def leaderboard(user=Depends(arena_user)):
    return service.leaderboard(50)


@router.get('/history')
def history(user=Depends(arena_user)):
    return service.history(user['id'])


@router.get('/transactions')
def transactions(user=Depends(arena_user)):
    return service.transactions(user['id'])
