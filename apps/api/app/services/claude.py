import re
import time
import uuid
from collections import OrderedDict
import anthropic
from ..logging import log

SYSTEM_PROMPT = """
tapain Nepali samudayako lagi banaeko Nepali Voice AI ko sahayak hunuhunchha.
Yo pehilo community-owned, open-source Nepali Voice AI ho.
256 Nepali recording sangalana gariyeko chha.
Lakshya 500 bhandha badi recording sangalana garnu ho.
Yo pariyojana Nepali samudayako lagi nihshulka chha.

Sadhai Nepali lipima matra jawaf dinuhos — romanized va English ma kabhi nadinus.
Afno jawaf sadhai 1-2 wakyama matra dinuhos — kabhi pani lamo jawaf nadinus.
Pura wakya ma jawaf dinuhos — adha wakyama kabhi naroknus.
Kunai pani markdown formatting, star (**), dash (-), bullet points prayog nagarnuhos.
""".strip()

_CLEAN_RE = [
    (re.compile(r"\*+"), ""),
    (re.compile(r"#+\s*"), ""),
    (re.compile(r"[-]+"), ""),
    (re.compile(r"\n+"), " "),
    (re.compile(r"\s+"), " "),
]


def clean_text(text: str) -> str:
    for pattern, repl in _CLEAN_RE:
        text = pattern.sub(repl, text)
    return text.strip()


class SessionStore:
    """In-memory session history with LRU eviction and TTL.
    Good enough for single-container MVP; swap for Redis when scaling out."""

    def __init__(self, max_sessions: int = 1000, ttl_seconds: int = 3600):
        self._data: OrderedDict[str, tuple[float, list[dict]]] = OrderedDict()
        self._max = max_sessions
        self._ttl = ttl_seconds

    def _evict(self) -> None:
        now = time.time()
        stale = [k for k, (ts, _) in self._data.items() if now - ts > self._ttl]
        for k in stale:
            self._data.pop(k, None)
        while len(self._data) > self._max:
            self._data.popitem(last=False)

    def get(self, sid: str) -> list[dict]:
        self._evict()
        if sid not in self._data:
            return []
        ts, hist = self._data[sid]
        self._data.move_to_end(sid)
        self._data[sid] = (time.time(), hist)
        return hist

    def append(self, sid: str, role: str, content: str) -> None:
        self._evict()
        hist = self._data.get(sid, (time.time(), []))[1]
        hist.append({"role": role, "content": content})
        self._data[sid] = (time.time(), hist)
        self._data.move_to_end(sid)


class ClaudeService:
    def __init__(self, api_key: str, model: str, max_tokens: int):
        self.client = anthropic.Anthropic(api_key=api_key)
        self.model = model
        self.max_tokens = max_tokens
        self.sessions = SessionStore()

    def reply(self, user_text: str, session_id: str | None) -> tuple[str, str]:
        sid = session_id or uuid.uuid4().hex
        history = list(self.sessions.get(sid))
        history.append({"role": "user", "content": user_text})

        response = self.client.messages.create(
            model=self.model,
            max_tokens=self.max_tokens,
            system=SYSTEM_PROMPT,
            messages=history,
        )
        reply_text = clean_text(response.content[0].text.strip())

        self.sessions.append(sid, "user", user_text)
        self.sessions.append(sid, "assistant", reply_text)
        log.info("claude_reply", session_id=sid, turns=len(history) + 1)
        return reply_text, sid
