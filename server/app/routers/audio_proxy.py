import urllib.request
import urllib.parse
import httpx
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from functools import lru_cache

router = APIRouter(prefix="/api/v1", tags=["Audio Proxy"])

@lru_cache(maxsize=500)
def get_gdrive_direct_url(file_id: str) -> str:
    return f"https://drive.usercontent.google.com/download?id={file_id}&export=download&confirm=t"

@router.get("/audio")
async def proxy_gdrive_audio(
    id: str = Query(..., description="Google Drive File ID"),
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
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    try:
        client = httpx.AsyncClient(follow_redirects=True, timeout=15.0)
        req = client.build_request("GET", direct_url, headers=headers)
        response = await client.send(req, stream=True)

        if response.status_code != 200:
            # Fallback to docs.google.com uc export
            alt_url = f"https://docs.google.com/uc?export=download&id={file_id}"
            req = client.build_request("GET", alt_url, headers=headers)
            response = await client.send(req, stream=True)

        async def stream_generator():
            try:
                async for chunk in response.aiter_bytes(chunk_size=64 * 1024):
                    yield chunk
            finally:
                await response.aclose()
                await client.aclose()

        response_headers = {
            "Content-Type": "audio/mpeg",
            "Accept-Ranges": "bytes",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=86400",
        }
        if "content-length" in response.headers:
            response_headers["Content-Length"] = response.headers["content-length"]

        return StreamingResponse(
            stream_generator(),
            media_type="audio/mpeg",
            headers=response_headers
        )

    except Exception as e:
        print(f"[!] Audio proxy error for file {file_id}: {e}")
        # Ultimate fallback to soundhelix sample audio
        fallback_url = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
        async def fallback_stream():
            async with httpx.AsyncClient(follow_redirects=True) as fb_client:
                async with fb_client.stream("GET", fallback_url) as fb_resp:
                    async for chunk in fb_resp.aiter_bytes(64 * 1024):
                        yield chunk

        return StreamingResponse(
            fallback_stream(),
            media_type="audio/mpeg",
            headers={"Access-Control-Allow-Origin": "*"}
        )
