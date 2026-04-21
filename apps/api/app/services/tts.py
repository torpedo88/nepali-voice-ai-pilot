import asyncio
import tempfile
from pathlib import Path
import edge_tts
from gtts import gTTS
from ..logging import log

VOICES: dict[str, str] = {
    "Sagar (Male)": "ne-NP-SagarNeural",
    "Hemkala (Female)": "ne-NP-HemkalaNeural",
}
DEFAULT_VOICE = "Sagar (Male)"


async def synthesize(text: str, voice_key: str = DEFAULT_VOICE) -> bytes:
    voice = VOICES.get(voice_key, VOICES[DEFAULT_VOICE])
    tmp = Path(tempfile.NamedTemporaryFile(suffix=".mp3", delete=False).name)
    try:
        await edge_tts.Communicate(text, voice=voice).save(str(tmp))
        return tmp.read_bytes()
    except Exception as exc:  # Edge-TTS upstream outage → gTTS fallback
        log.warning("edge_tts_failed_falling_back_to_gtts", error=str(exc))
        await asyncio.to_thread(lambda: gTTS(text=text, lang="ne").save(str(tmp)))
        return tmp.read_bytes()
    finally:
        tmp.unlink(missing_ok=True)
