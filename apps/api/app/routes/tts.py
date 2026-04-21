from fastapi import APIRouter
from fastapi.responses import Response
from ..models import TtsRequest
from ..services.tts import synthesize

router = APIRouter()


@router.post("/tts")
async def tts(body: TtsRequest) -> Response:
    audio = await synthesize(body.text, body.voice)
    return Response(
        content=audio,
        media_type="audio/mpeg",
        headers={"Cache-Control": "no-store"},
    )
