import logging
from functools import lru_cache

import httpx
from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/api/v1", tags=["Audio Proxy"])
logger = logging.getLogger("audio_proxy")

_http_client: httpx.AsyncClient | None = None


def get_http_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(
            follow_redirects=True,
            timeout=httpx.Timeout(15.0, connect=5.0),
            limits=httpx.Limits(max_keepalive_connections=30, max_connections=100),
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                )
            },
        )
    return _http_client


@lru_cache(maxsize=500)
def get_gdrive_direct_url(file_id: str) -> str:
    return f"https://drive.usercontent.google.com/download?id={file_id}&export=download&confirm=t"


def extract_file_id(url: str | None) -> str | None:
    if not url:
        return None
    if "id=" in url:
        return url.split("id=", 1)[1].split("&", 1)[0]
    if "/d/" in url:
        return url.split("/d/", 1)[1].split("/", 1)[0]
    return None


async def open_audio_stream(
    client: httpx.AsyncClient,
    url: str,
    headers: dict[str, str],
) -> httpx.Response:
    request = client.build_request("GET", url, headers=headers)
    return await client.send(request, stream=True)


@router.get("/audio")
async def proxy_gdrive_audio(
    request: Request,
    id: str | None = Query(None, description="Google Drive File ID"),
    url: str | None = Query(None, description="Original Google Drive URL"),
):
    file_id = id or extract_file_id(url)
    if not file_id:
        raise HTTPException(status_code=400, detail="Missing Google Drive File ID")

    request_headers: dict[str, str] = {}
    range_header = request.headers.get("range")
    if range_header:
        request_headers["range"] = range_header

    client = get_http_client()
    upstream_response: httpx.Response | None = None
    upstream_urls = (
        get_gdrive_direct_url(file_id),
        f"https://docs.google.com/uc?export=download&id={file_id}",
    )

    try:
        last_error: httpx.HTTPError | None = None
        for upstream_url in upstream_urls:
            try:
                upstream_response = await open_audio_stream(client, upstream_url, request_headers)
            except httpx.HTTPError as exc:
                last_error = exc
                upstream_response = None
                continue

            content_type = upstream_response.headers.get("content-type", "").lower()
            if upstream_response.status_code in (200, 206) and not content_type.startswith("text/html"):
                break
            await upstream_response.aclose()
            upstream_response = None

        if upstream_response is None:
            if isinstance(last_error, httpx.TimeoutException):
                raise HTTPException(status_code=504, detail="Audio source timed out")
            raise HTTPException(status_code=502, detail="Audio source is unavailable")

        async def stream_generator():
            try:
                async for chunk in upstream_response.aiter_bytes(chunk_size=64 * 1024):
                    yield chunk
            finally:
                await upstream_response.aclose()

        response_headers = {
            "Content-Type": upstream_response.headers.get("content-type", "audio/mpeg"),
            "Accept-Ranges": upstream_response.headers.get("accept-ranges", "bytes"),
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        }
        for header in ("content-length", "content-range"):
            value = upstream_response.headers.get(header)
            if value:
                response_headers[header.title()] = value

        return StreamingResponse(
            stream_generator(),
            status_code=upstream_response.status_code,
            media_type=upstream_response.headers.get("content-type", "audio/mpeg"),
            headers=response_headers,
        )
    except HTTPException:
        raise
    except httpx.TimeoutException as exc:
        if upstream_response is not None:
            await upstream_response.aclose()
        logger.warning("Audio proxy timeout for file %s: %s", file_id, exc)
        raise HTTPException(status_code=504, detail="Audio source timed out") from exc
    except httpx.HTTPError as exc:
        if upstream_response is not None:
            await upstream_response.aclose()
        logger.warning("Audio proxy error for file %s: %s", file_id, exc)
        raise HTTPException(status_code=502, detail="Audio source is unavailable") from exc
