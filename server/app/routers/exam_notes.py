"""Durable per-question notes. Additive API, disabled unless explicitly enabled."""
import hashlib
import json
import os
from html import escape
from html.parser import HTMLParser
from uuid import UUID
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, ConfigDict, Field, model_validator
from pymysql.err import IntegrityError

from app.db import db
from app.security import get_current_user


class NoteHTML(HTMLParser):
    """Serialize a deliberately small, attribute-free HTML vocabulary.

    Never pass through input markup, attributes, URLs or foreign namespaces.
    A stack closes malformed input; dangerous subtrees are discarded entirely.
    """
    tags = frozenset(('p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li', 'blockquote', 'mark'))
    discard = frozenset(('script', 'style', 'iframe', 'object', 'svg', 'math', 'template', 'noscript'))

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.stack = []
        self.hidden = []
        self.text = []

    def handle_starttag(self, tag, attrs):
        if self.hidden:
            if tag in self.discard:
                self.hidden.append(tag)
            return
        if tag in self.discard:
            self.hidden.append(tag)
        elif tag in self.tags:
            self.parts.append('<' + tag + '>')
            if tag != 'br':
                self.stack.append(tag)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag != 'br':
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        if self.hidden:
            if tag == self.hidden[-1]:
                self.hidden.pop()
            return
        if tag in self.stack:
            while self.stack:
                current = self.stack.pop()
                self.parts.append('</' + current + '>')
                if current == tag:
                    break

    def handle_data(self, data):
        if not self.hidden:
            self.text.append(data)
            self.parts.append(escape(data, quote=False))

    def value(self):
        if not ''.join(self.text).replace('\u200b', '').strip():
            return ''
        return ''.join(self.parts) + ''.join('</' + tag + '>' for tag in reversed(self.stack))


def sanitize_html(value: str) -> str:
    parser = NoteHTML()
    parser.feed(value)
    parser.close()
    return parser.value()


def enabled():
    if os.getenv('EXAM_NOTES_ENABLED', '').lower() != 'true':
        raise HTTPException(404, 'Tính năng ghi chú chưa được bật.')


router = APIRouter(prefix='/api/v1/exam-notes', tags=['Exam notes'], dependencies=[Depends(enabled)])


class NoteDocument(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)
    version: Literal[1]
    format: Literal['html']
    # Transport safety bound, not a user/account note quota.
    html: str = Field(max_length=200_000)


class SaveNote(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)
    userId: str = Field(min_length=1, max_length=36)
    scope: str = Field(min_length=1, max_length=512)
    group: str = Field(min_length=1, max_length=8192)
    questionId: str = Field(min_length=1, max_length=150)
    questionNumber: int = Field(ge=1, le=100000)
    part: int = Field(ge=1, le=7)
    baseRevision: int = Field(ge=0, le=2_000_000_000)
    mutationId: str = Field(min_length=36, max_length=36)
    document: NoteDocument

    @model_validator(mode='after')
    def validate_id(self):
        UUID(self.mutationId)
        return self


def key_for(scope, group, question=None):
    values = [scope, group] if question is None else [scope, group, question]
    return hashlib.sha256(json.dumps(values, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()


def owner(expected, user):
    if expected != str(user['id']):
        raise HTTPException(403, 'Tài khoản đã thay đổi. Vui lòng mở lại bài học.')


def record(row):
    value = json.loads(row['document']) if isinstance(row['document'], str) else row['document']
    # Also sanitize reads, in case a future importer writes unsafe legacy data.
    document = NoteDocument.model_validate(value).model_dump()
    document['html'] = sanitize_html(document['html'])
    return dict(questionId=row['question_id'], questionNumber=row['question_number'], part=row['part'],
                document=document, revision=row['revision'])


@router.get('')
def get_notes(response: Response, userId: str = Query(min_length=1, max_length=36),
              scope: str = Query(min_length=1, max_length=512), group: str = Query(min_length=1, max_length=8192),
              user=Depends(get_current_user)):
    owner(userId, user)
    response.headers['Cache-Control'] = 'no-store'
    rows = db.fetch_all('SELECT question_id, question_number, part, document, revision FROM user_exam_notes '
                        'WHERE user_id=%s AND group_key=%s', (user['id'], key_for(scope, group)), use_cache=False)
    return {'notes': [record(row) for row in rows]}


@router.put('')
def save_note(payload: SaveNote, response: Response, user=Depends(get_current_user)):
    owner(payload.userId, user)
    key = key_for(payload.scope, payload.group, payload.questionId)
    doc = payload.document.model_dump()
    doc['html'] = sanitize_html(doc['html'])
    raw = json.dumps(doc, ensure_ascii=False, separators=(',', ':'))
    with db.connection() as conn, conn.cursor() as cursor:
        if payload.baseRevision == 0:
            try:
                cursor.execute('INSERT INTO user_exam_notes '
                    '(user_id,note_key,group_key,question_id,question_number,part,document,revision,mutation_id) '
                    'VALUES (%s,%s,%s,%s,%s,%s,%s,1,%s)',
                    (user['id'], key, key_for(payload.scope, payload.group), payload.questionId,
                     payload.questionNumber, payload.part, raw, payload.mutationId))
                changed = True
            except IntegrityError as exc:
                if exc.args[0] != 1062:
                    raise
                changed = False
        else:
            cursor.execute('UPDATE user_exam_notes SET document=%s,revision=revision+1,mutation_id=%s,updated_at=UTC_TIMESTAMP() '
                           'WHERE user_id=%s AND note_key=%s AND revision=%s',
                           (raw, payload.mutationId, user['id'], key, payload.baseRevision))
            changed = cursor.rowcount == 1
    response.headers['Cache-Control'] = 'no-store'
    if changed:
        return {'revision': payload.baseRevision + 1, 'document': doc}
    row = db.fetch_one('SELECT document,revision,mutation_id FROM user_exam_notes WHERE user_id=%s AND note_key=%s',
                       (user['id'], key), use_cache=False)
    if row and row['mutation_id'] == payload.mutationId:
        stored = json.loads(row['document']) if isinstance(row['document'], str) else row['document']
        if stored == doc:
            return {'revision': row['revision'], 'document': doc}
    raise HTTPException(409, 'Ghi chú đã thay đổi trên thiết bị khác. Nội dung của bạn vẫn được giữ.')
