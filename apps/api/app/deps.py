from functools import lru_cache
from .config import get_settings
from .services.claude import ClaudeService
from .services.whisper import WhisperService
from .services.supabase import ContributionService, get_supabase_client


@lru_cache
def get_whisper() -> WhisperService:
    s = get_settings()
    return WhisperService(model_id=s.hf_model_id)


@lru_cache
def get_claude() -> ClaudeService:
    s = get_settings()
    return ClaudeService(
        api_key=s.anthropic_api_key,
        model=s.claude_model,
        max_tokens=s.claude_max_tokens,
    )


def get_contribution_service() -> ContributionService:
    """Get ContributionService with Supabase client."""
    client = get_supabase_client()
    return ContributionService(client)
