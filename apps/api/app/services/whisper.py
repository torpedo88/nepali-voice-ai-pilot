import os
import tempfile
import numpy as np
import torch
from pydub import AudioSegment
from transformers import WhisperForConditionalGeneration, WhisperProcessor
from ..logging import log

SAMPLE_RATE = 16_000


class WhisperService:
    def __init__(self, model_id: str):
        log.info("whisper_loading", model_id=model_id)
        self.processor = WhisperProcessor.from_pretrained(model_id)
        self.model = WhisperForConditionalGeneration.from_pretrained(model_id)
        self.model.train(False)
        log.info("whisper_loaded", model_id=model_id)

    def transcribe_bytes(self, audio_bytes: bytes) -> str:
        # ffmpeg 7.x stdin pipe is unreliable for format auto-detection,
        # so write to a tempfile and let ffmpeg sniff magic bytes from the file.
        with tempfile.NamedTemporaryFile(suffix=".bin", delete=False) as f:
            f.write(audio_bytes)
            tmp_path = f.name
        try:
            seg = AudioSegment.from_file(tmp_path)
            seg = seg.set_frame_rate(SAMPLE_RATE).set_channels(1).set_sample_width(2)
            samples = np.frombuffer(seg.raw_data, dtype=np.int16).astype(np.float32) / 32768.0
        finally:
            os.unlink(tmp_path)

        inputs = self.processor(samples, sampling_rate=SAMPLE_RATE, return_tensors="pt")
        with torch.no_grad():
            predicted_ids = self.model.generate(
                inputs.input_features,
                language="nepali",
                task="transcribe",
            )
        return self.processor.batch_decode(predicted_ids, skip_special_tokens=True)[0].strip()
