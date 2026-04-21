import io
from urllib.parse import quote
from fastapi import APIRouter, Depends, Form, UploadFile
from fastapi.responses import StreamingResponse
from ..deps import get_claude, get_whisper
from ..errors import ApiError
from ..services.claude import ClaudeService
from ..services.tts import synthesize
from ..services.whisper import WhisperService

router = APIRouter()

MAX_UPLOAD_BYTES = 20 * 1024 * 1024


@router.post("/voice")
async def voice(
    audio: UploadFile,
    voice: str = Form(default="Sagar (Male)"),
    session_id: str | None = Form(default=None),
    whisper: WhisperService = Depends(get_whisper),
    claude: ClaudeService = Depends(get_claude),
) -> StreamingResponse:
    """End-to-end: audio in, AI audio reply out.
    Metadata (user_text, ai_text, session_id) returned in response headers so the
    browser can show the transcript without a second request."""
    data = await audio.read()
    if not data:
        raise ApiError("EMPTY_AUDIO", "No audio data received", 422)
    if len(data) > MAX_UPLOAD_BYTES:
        raise ApiError("AUDIO_TOO_LARGE", "Audio exceeds 20 MB limit", 413)

    user_text = whisper.transcribe_bytes(data)
    if not user_text:
        raise ApiError("TRANSCRIPTION_EMPTY", "Could not understand audio", 422)

    ai_text, sid = claude.reply(user_text, session_id)
    audio_mp3 = await synthesize(ai_text, voice)

    # Headers must be latin-1 — percent-encode Devanagari. Browser decodeURIComponent()s.
    return StreamingResponse(
        io.BytesIO(audio_mp3),
        media_type="audio/mpeg",
        headers={
            "X-User-Text": quote(user_text),
            "X-Ai-Text": quote(ai_text),
            "X-Session-Id": sid,
            "Access-Control-Expose-Headers": "X-User-Text, X-Ai-Text, X-Session-Id",
            "Cache-Control": "no-store",
        },
    )
