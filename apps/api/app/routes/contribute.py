from fastapi import APIRouter, Depends, Form, Request, UploadFile
from fastapi.responses import JSONResponse
from ..deps import get_whisper, get_contribution_service
from ..errors import ApiError
from ..models import ContributeResponse
from ..services.whisper import WhisperService
from ..services.supabase import ContributionService

router = APIRouter()

MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10MB max for contributions


@router.post("/contribute", response_model=ContributeResponse)
async def contribute_audio(
    request: Request,
    audio: UploadFile,
    text: str = Form(..., min_length=1, max_length=500, description="Expected Nepali transcript"),
    contributor_name: str = Form(None, max_length=100, description="Optional contributor name"),
    whisper: WhisperService = Depends(get_whisper),
    contribution_service: ContributionService = Depends(get_contribution_service),
) -> JSONResponse:
    """
    Accept community audio contributions for model training.
    Audio is transcribed and stored in Supabase alongside expected transcript.
    """
    # Validate audio upload
    data = await audio.read()
    if not data:
        raise ApiError("EMPTY_AUDIO", "No audio data received", 422)
    if len(data) > MAX_UPLOAD_BYTES:
        raise ApiError("AUDIO_TOO_LARGE", f"Audio exceeds {MAX_UPLOAD_BYTES // 1024 // 1024}MB limit", 413)

    # Transcribe with current model for comparison
    try:
        transcribed_text = whisper.transcribe_bytes(data)
    except Exception as e:
        # If transcription fails, still save the contribution
        transcribed_text = f"[TRANSCRIPTION_ERROR: {str(e)}]"

    # Get contributor IP for basic tracking
    contributor_ip = request.client.host if request.client else None

    try:
        # Store in Supabase
        contribution_id = await contribution_service.store_contribution(
            audio_data=data,
            expected_transcript=text.strip(),
            model_transcript=transcribed_text,
            contributor_name=contributor_name.strip() if contributor_name else None,
            contributor_ip=contributor_ip,
            content_type=audio.content_type or "audio/webm"
        )

        return JSONResponse(
            status_code=201,
            content={
                "contribution_id": contribution_id,
                "message": "धन्यवाद! तपाईंको योगदान सफलतापूर्वक प्राप्त भयो।",  # Thank you! Your contribution was received successfully.
                "status": "pending"
            }
        )
    except Exception as e:
        raise ApiError("STORAGE_ERROR", f"Failed to store contribution: {str(e)}", 500)


@router.get("/contribute/stats")
async def contribution_stats(
    contribution_service: ContributionService = Depends(get_contribution_service),
):
    """Get basic statistics about contributions."""
    try:
        stats = await contribution_service.get_stats()
        return stats
    except Exception as e:
        # Return empty stats on error
        return {"total": 0, "pending": 0, "approved": 0, "rejected": 0}