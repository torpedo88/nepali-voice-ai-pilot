from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    session_id: str | None = Field(default=None, max_length=64)


class ChatResponse(BaseModel):
    reply: str
    session_id: str


class TranscribeResponse(BaseModel):
    text: str


class TtsRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    voice: str = Field(default="Sagar (Male)")


class VoiceResponse(BaseModel):
    user_text: str
    ai_text: str
    session_id: str
    # audio is streamed separately via /v1/tts to keep response small


class ContributeRequest(BaseModel):
    text: str = Field(min_length=1, max_length=500, description="Expected Nepali transcript")
    contributor_name: str | None = Field(default=None, max_length=100, description="Optional contributor name")


class ContributeResponse(BaseModel):
    contribution_id: str
    message: str
    status: str
