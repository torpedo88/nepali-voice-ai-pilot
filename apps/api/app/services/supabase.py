import uuid
from datetime import datetime
from supabase import create_client, Client
from ..config import get_settings

settings = get_settings()

def get_supabase_client() -> Client:
    """Get authenticated Supabase client."""
    if not settings.supabase_url or not settings.supabase_anon_key:
        raise RuntimeError("Supabase configuration missing")

    return create_client(settings.supabase_url, settings.supabase_anon_key)


class ContributionService:
    """Service for managing community contributions via Supabase."""

    def __init__(self, client: Client):
        self.client = client

    async def store_contribution(
        self,
        audio_data: bytes,
        expected_transcript: str,
        model_transcript: str,
        contributor_name: str | None = None,
        contributor_ip: str | None = None,
        content_type: str = "audio/webm"
    ) -> str:
        """Store audio contribution and metadata. Returns contribution ID."""
        contribution_id = uuid.uuid4().hex

        # Determine file extension
        extension = ".webm"  # default
        if "mp3" in content_type:
            extension = ".mp3"
        elif "wav" in content_type:
            extension = ".wav"
        elif "ogg" in content_type:
            extension = ".ogg"
        elif "m4a" in content_type:
            extension = ".m4a"

        audio_path = f"contributions/{contribution_id}{extension}"

        # Upload audio to storage
        storage_response = self.client.storage.from_("contributions").upload(
            audio_path,
            audio_data,
            {"content-type": content_type}
        )

        if storage_response.error:
            raise RuntimeError(f"Storage upload failed: {storage_response.error}")

        # Insert metadata to database
        db_response = self.client.table("contributions").insert({
            "id": contribution_id,
            "audio_path": audio_path,
            "audio_size_bytes": len(audio_data),
            "content_type": content_type,
            "expected_transcript": expected_transcript,
            "model_transcript": model_transcript,
            "contributor_name": contributor_name,
            "contributor_ip": contributor_ip,
            "status": "pending"
        }).execute()

        if db_response.error:
            # Cleanup uploaded file on DB error
            self.client.storage.from_("contributions").remove([audio_path])
            raise RuntimeError(f"Database insert failed: {db_response.error}")

        return contribution_id

    async def get_stats(self) -> dict:
        """Get contribution statistics."""
        # Get total count
        total_response = self.client.table("contributions").select("id", count="exact").execute()

        # Get counts by status
        status_response = self.client.table("contributions").select("status", count="exact").execute()

        stats = {"total": 0, "pending": 0, "approved": 0, "rejected": 0}

        if total_response.data is not None:
            stats["total"] = len(total_response.data)

        # Count by status
        status_counts = {}
        if status_response.data:
            for row in status_response.data:
                status = row.get("status", "pending")
                status_counts[status] = status_counts.get(status, 0) + 1

        stats.update(status_counts)
        return stats