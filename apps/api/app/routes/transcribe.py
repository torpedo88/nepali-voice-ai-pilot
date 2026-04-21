from fastapi import APIRouter, Depends, UploadFile
from ..deps import get_whisper
from ..errors import ApiError
from ..models import TranscribeResponse
from ..services.whisper import WhisperService

router = APIRouter()

MAX_UPLOAD_BYTES = 20 * 1024 * 1024  # 20 MB cap


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe(
    audio: UploadFile,
    whisper: WhisperService = Depends(get_whisper),
) -> TranscribeResponse:
    data = await audio.read()
    if not data:
        raise ApiError("EMPTY_AUDIO", "No audio data received", 422)
    if len(data) > MAX_UPLOAD_BYTES:
        raise ApiError("AUDIO_TOO_LARGE", "Audio exceeds 20 MB limit", 413)
    text = whisper.transcribe_bytes(data)
    return TranscribeResponse(text=text)
