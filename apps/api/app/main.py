import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from .config import get_settings
from .deps import get_claude, get_whisper
from .errors import install as install_error_handlers
from .logging import configure_logging, log
from .routes import chat, contribute, health, transcribe, tts, voice

settings = get_settings()
configure_logging(settings.log_level)
limiter = Limiter(key_func=get_remote_address, default_limits=[f"{settings.rate_limit_per_minute}/minute"])


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Eager-load heavy services so the first request isn't slow
    log.info("startup_begin")
    get_whisper()
    get_claude()
    log.info("startup_ready")
    yield


app = FastAPI(title="Nepali Voice AI", version="0.1.0", lifespan=lifespan)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
    expose_headers=["X-User-Text", "X-Ai-Text", "X-Session-Id"],
)


@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    rid = request.headers.get("x-request-id") or uuid.uuid4().hex
    request.state.request_id = rid
    response = await call_next(request)
    response.headers["x-request-id"] = rid
    return response


install_error_handlers(app)
app.include_router(health.router, prefix="/v1", tags=["health"])
app.include_router(transcribe.router, prefix="/v1", tags=["stt"])
app.include_router(chat.router, prefix="/v1", tags=["chat"])
app.include_router(tts.router, prefix="/v1", tags=["tts"])
app.include_router(voice.router, prefix="/v1", tags=["voice"])
app.include_router(contribute.router, prefix="/v1", tags=["contribute"])
