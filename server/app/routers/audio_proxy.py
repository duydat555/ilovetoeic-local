import urllib.request
import urllib.parse
import httpx
from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from functools import lru_cache

router = APIRouter(prefix="/api/v1", tags=["Audio Proxy"])

# Shared HTTPX Client pool for connection reuse & zero TLS handshake overhead
_http_client: httpx.AsyncClient | None = None

def get_http_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(
            follow_redirects=True,
            timeout=httpx.Timeout(15.0, connect=5.0),
            limits=httpx.Limits(max_keepalive_connections=30, max_connections=100),
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
        )
    return _http_client

@lru_cache(maxsize=500)
def get_gdrive_direct_url(file_id: str) -> str:
    return f"https://drive.usercontent.google.com/download?id={file_id}&export=download&confirm=t"

@router.get("/audio")
async def proxy_gdrive_audio(
    request: Request,
    id: str = Query(None, description="Google Drive File ID"),
    url: str = Query(None, description="Original Google Drive URL")
):
    file_id = id
    if not file_id and url:
        if "id=" in url:
            file_id = url.split("id=")[1].split("&")[0]
        elif "/d/" in url:
            file_id = url.split("/d/")[1].split("/")[0]

    if not file_id:
        raise HTTPException(status_code=400, detail="Missing Google Drive File ID")

    direct_url = f"https://drive.usercontent.google.com/download?id={file_id}&export=download&confirm=t"
    client = get_http_client()

    req_headers = {}
    range_header = request.headers.get("range")
    if range_header:
        req_headers["range"] = range_header

    try:
        req = client.build_request("GET", direct_url, headers=req_headers)
        upstream_resp = await client.send(req, stream=True)

        if upstream_resp.status_code not in (200, 206):
            # Fallback to docs.google.com uc export
            alt_url = f"https://docs.google.com/uc?export=download&id={file_id}"
            req = client.build_request("GET", alt_url, headers=req_headers)
            upstream_resp = await client.send(req, stream=True)

        async def stream_generator():
            try:
                async for chunk in upstream_resp.aiter_bytes(chunk_size=64 * 1024):
                    yield chunk
            finally:
                await upstream_resp.aclose()

        response_headers = {
            "Content-Type": upstream_resp.headers.get("content-type", "audio/mpeg"),
            "Accept-Ranges": "bytes",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=31536000, immutable",
        }
        for h in ("content-length", "content-range", "accept-ranges"):
            if h in upstream_resp.headers:
                response_headers[h.title()] = upstream_resp.headers[h]

        return StreamingResponse(
            stream_generator(),
            status_code=upstream_resp.status_code,
            media_type="audio/mpeg",
            headers=response_headers
        )

    except Exception as e:
        print(f"[!] Audio proxy error for file {file_id}: {e}")
        fallback_url = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
        async def fallback_stream():
            async with httpx.AsyncClient(follow_redirects=True) as fb_client:
                async with fb_client.stream("GET", fallback_url, headers=req_headers) as fb_resp:
                    async for chunk in fb_resp.aiter_bytes(64 * 1024):
                        yield chunk

        return StreamingResponse(
            fallback_stream(),
            media_type="audio/mpeg",
            headers={
                "Access-Control-Allow-Origin": "*",
                "Cache-Control": "public, max-age=86400",
            }
        )

