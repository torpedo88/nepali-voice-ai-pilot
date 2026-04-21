from fastapi import APIRouter, Depends
from ..deps import get_claude
from ..models import ChatRequest, ChatResponse
from ..services.claude import ClaudeService

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
def chat(
    body: ChatRequest,
    claude: ClaudeService = Depends(get_claude),
) -> ChatResponse:
    reply, sid = claude.reply(body.text, body.session_id)
    return ChatResponse(reply=reply, session_id=sid)
