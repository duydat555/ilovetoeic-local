"""Account-scoped, optimistic-concurrency storage independent of exam history."""
import hashlib
import json
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, ConfigDict, Field, model_validator
from pymysql.err import IntegrityError

from app.db import db
from app.security import get_current_user

router = APIRouter(prefix="/api/v1/exam-annotations", tags=["Exam annotations"])


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class Quote(StrictModel):
    start: int = Field(ge=0, le=1_000_000)
    end: int = Field(ge=1, le=1_000_000)
    quote: str = Field(min_length=1, max_length=2000)
    prefix: str = Field(max_length=80)
    suffix: str = Field(max_length=80)

    @model_validator(mode="after")
    def offsets(self):
        if self.end - self.start != len(self.quote.encode("utf-16-le", errors="surrogatepass")) // 2:
            raise ValueError("Quote offsets must match UTF-16 text length")
        return self


class Block(StrictModel):
    index: int = Field(ge=0, le=10000)
    fingerprint: str = Field(max_length=80)


class Point(StrictModel):
    x: float = Field(ge=-10, le=10, allow_inf_nan=False)
    y: float = Field(ge=-10, le=10, allow_inf_nan=False)
    offset: int | None = Field(default=None, ge=0, le=1_000_000)
    dx: float | None = Field(default=None, ge=-1000, le=1000, allow_inf_nan=False)
    dy: float | None = Field(default=None, ge=-1000, le=1000, allow_inf_nan=False)

    @model_validator(mode="after")
    def caret(self):
        if self.offset is not None and (self.dx is None or self.dy is None):
            raise ValueError("Incomplete caret anchor")
        return self


class Mark(StrictModel):
    id: str = Field(min_length=1, max_length=150)
    color: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")
    width: float = Field(ge=1, le=8, allow_inf_nan=False)


class TextMark(Mark):
    kind: Literal["highlight", "underline"]
    anchor: Quote


class ShapeMark(Mark):
    kind: Literal["pen", "rectangle", "arrow"]
    block: Block
    points: list[Point] = Field(min_length=2, max_length=4000)

    @model_validator(mode="after")
    def endpoints(self):
        if self.kind != "pen" and len(self.points) != 2:
            raise ValueError("A shape needs exactly two endpoints")
        return self


class NoteMark(Mark):
    kind: Literal["text", "sticky"]
    block: Block
    points: list[Point] = Field(min_length=1, max_length=1)
    text: str = Field(max_length=2000)


class AnnotationDocument(StrictModel):
    version: Literal[1]
    items: list[Annotated[TextMark | ShapeMark | NoteMark, Field(discriminator="kind")]] = Field(max_length=400)
    note: str = Field(max_length=10000)
    review: bool

    @model_validator(mode="after")
    def limits(self):
        if len({item.id for item in self.items}) != len(self.items):
            raise ValueError("Duplicate annotation ID")
        if len(json.dumps(self.model_dump(exclude_none=True), ensure_ascii=False, allow_nan=False)) > 2_000_000:
            raise ValueError("Annotation document too large")
        return self


class SavePayload(StrictModel):
    userId: str = Field(min_length=1, max_length=36)
    scope: str = Field(min_length=1, max_length=512)
    group: str = Field(min_length=1, max_length=8192)
    baseRevision: int = Field(ge=0, le=2_000_000_000)
    mutationId: str = Field(min_length=36, max_length=36)
    document: AnnotationDocument

    @model_validator(mode="after")
    def mutation(self):
        UUID(self.mutationId)
        return self


def document_key(scope: str, group: str) -> str:
    return hashlib.sha256(json.dumps([scope, group], ensure_ascii=False, separators=(",", ":")).encode()).hexdigest()


def read_row(user_id, key):
    return db.fetch_one(
        "SELECT document, revision, mutation_id FROM user_exam_annotations WHERE user_id = %s AND document_key = %s",
        (user_id, key), use_cache=False,
    )


def result(row):
    if not row:
        return {"document": None, "revision": 0}
    value = json.loads(row["document"]) if isinstance(row["document"], str) else row["document"]
    return {"document": value, "revision": row["revision"]}


def check_owner(expected, user):
    if expected != str(user["id"]):
        raise HTTPException(403, "Tài khoản đã thay đổi. Vui lòng mở lại bài học.")


class ReviewStatusPayload(StrictModel):
    userId: str = Field(min_length=1, max_length=36)
    scope: str = Field(min_length=1, max_length=512)
    groups: list[Annotated[str, Field(min_length=1, max_length=8192)]] = Field(min_length=1, max_length=200)


@router.post('/review-status')
def review_status(payload: ReviewStatusPayload, response: Response, user=Depends(get_current_user)):
    check_owner(payload.userId, user)
    keys = {group: document_key(payload.scope, group) for group in payload.groups}
    hashes = list(dict.fromkeys(keys.values()))
    rows = db.fetch_all(
        "SELECT document_key, revision, JSON_UNQUOTE(JSON_EXTRACT(document, '$.review')) AS review "
        "FROM user_exam_annotations WHERE user_id=%s AND document_key IN (" + ','.join(['%s'] * len(hashes)) + ')',
        (user['id'], *hashes), use_cache=False,
    )
    records = {row['document_key']: row for row in rows}
    response.headers['Cache-Control'] = 'no-store'
    return {'groups': [{'group': group, 'review': str(records.get(key, {}).get('review')).lower() in ('true', '1'),
                        'revision': records.get(key, {}).get('revision', 0)} for group, key in keys.items()]}


@router.get("")
def get_annotations(response: Response, userId: str = Query(min_length=1, max_length=36),
                    scope: str = Query(min_length=1, max_length=512), group: str = Query(min_length=1, max_length=8192),
                    user=Depends(get_current_user)):
    check_owner(userId, user)
    response.headers["Cache-Control"] = "no-store"
    return result(read_row(user["id"], document_key(scope, group)))


@router.put("")
def save_annotations(payload: SavePayload, response: Response, user=Depends(get_current_user)):
    check_owner(payload.userId, user)
    key = document_key(payload.scope, payload.group)
    document = json.dumps(payload.document.model_dump(exclude_none=True), ensure_ascii=False, separators=(",", ":"), allow_nan=False)
    # Atomic insert / compare-and-swap, without clearing unrelated database caches.
    # db.connection returns an autocommit connection; no full-table reads or polling.
    with db.connection() as conn:
        with conn.cursor() as cursor:
            if payload.baseRevision == 0:
                try:
                    cursor.execute(
                        "INSERT INTO user_exam_annotations (user_id, document_key, document, revision, mutation_id) VALUES (%s,%s,%s,1,%s)",
                        (user["id"], key, document, payload.mutationId),
                    )
                    changed = True
                except IntegrityError as exc:
                    if exc.args[0] != 1062:
                        raise
                    changed = False
            else:
                cursor.execute(
                    "UPDATE user_exam_annotations SET document=%s, revision=revision+1, mutation_id=%s, updated_at=UTC_TIMESTAMP() "
                    "WHERE user_id=%s AND document_key=%s AND revision=%s",
                    (document, payload.mutationId, user["id"], key, payload.baseRevision),
                )
                changed = cursor.rowcount == 1
    response.headers["Cache-Control"] = "no-store"
    if changed:
        return {"revision": payload.baseRevision + 1}
    current = read_row(user["id"], key)
    # A response may have been lost after commit. Retrying the same mutation is safe.
    if current and current["mutation_id"] == payload.mutationId:
        persisted = result(current)["document"]
        if persisted == json.loads(document):
            return {"revision": current["revision"]}
    raise HTTPException(409, "Chú thích đã thay đổi trên thiết bị khác. Bản của bạn vẫn được giữ trên thiết bị này.")
