from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    anthropic_api_key: str
    hf_model_id: str = "openai/whisper-small"
    allowed_origins: str = "https://voice.overseasnepal.com,http://localhost:3000"
    claude_model: str = "claude-opus-4-5"
    claude_max_tokens: int = 600
    rate_limit_per_minute: int = 30
    log_level: str = "INFO"
    port: int = 8000
    supabase_url: str = ""
    supabase_anon_key: str = ""

    @property
    def origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
