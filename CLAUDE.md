# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Solo pilot building Nepali STT + TTS. Phase 5 complete: fine-tuned Whisper-tiny on 256 single-speaker Nepali recordings → Claude API → Edge-TTS voice response. Published model at `nepaman/whisper-nepali-tiny` on Hugging Face. Training target is Apple Silicon (MPS), not CUDA — code auto-selects `mps` device.

## Commands

All scripts assume you run them from the project root (paths use `Path(__file__).resolve().parent.parent` or relative `models/whisper-nepali`). Do not `cd scripts/` first except for the Phase 2/3 demo.

```bash
# Install
pip install -r requirements.txt
# Fine-tuning also needs: transformers, datasets, accelerate, evaluate, jiwer, anthropic, edge-tts, python-dotenv, sounddevice

# Verify environment
python tests/test_setup.py

# Full training pipeline (Phase 3/4)
python scripts/prepare_dataset.py      # splits metadata_all.csv into data/datasets/whisper_finetune/{train,test}
python scripts/finetune_whisper.py     # trains openai/whisper-tiny → models/whisper-nepali (~1-2h on M1)
python scripts/test_finetuned.py       # compares fine-tuned vs baseline whisper-small, writes test_results.json

# Record more samples (Phase 4 — appends NP_XXX.wav + row in metadata_all.csv)
python scripts/record_batch.py         # interactive, 50-at-a-time; uses sounddevice device 0 (RODE NT1)

# Run apps
python scripts/nepali_conversation.py  # Phase 5: STT + Claude + Edge-TTS (requires ANTHROPIC_API_KEY in .env)
python scripts/demo_app.py             # simple STT-only Gradio
cd scripts/Demo && python voice_loop_demo.py  # Phase 3 demo with pre-recorded voice responses (port 7860)

# Single STT-accuracy tests against data/audio/
python scripts/stt/transcribe_all.py
python scripts/stt/compare_accuracy.py
```

There is no formal test runner, linter, or CI — `tests/test_setup.py` is an import-check script, not pytest.

## Architecture

**Pipeline:** microphone → Whisper fine-tuned STT → (Claude or rule-based matcher) → Edge-TTS / recorded WAV / gTTS fallback → audio out. Three app variants exist, each wiring these stages differently:

- `scripts/nepali_conversation.py` (Phase 5, current) — fine-tuned Whisper + `claude-opus-4-5` via Anthropic SDK + Edge-TTS (`ne-NP-SagarNeural` / `ne-NP-HemkalaNeural`), gTTS fallback. Maintains a module-level `history` list for multi-turn context. System prompt `PROJECT_CONTEXT` is in romanized Nepali and enforces Devanagari-only, 1–2 sentence, no-markdown replies; `clean_text()` strips `*`, `#`, `-`, newlines post-hoc.
- `scripts/Demo/voice_loop_demo.py` (Phase 3) — same STT but replies come from `generate_smart_response()`, a hand-tuned keyword matcher that tolerates Whisper's Nepali mis-transcriptions (e.g. "नवास्ते", "प्रबाद") and plays a personally-recorded WAV from `scripts/Demo/response_audio/`. `is_hallucination()` rejects outputs where any word repeats >5×.
- `scripts/demo_app.py` — minimal STT-only.

**Data flow for training:**
1. `data/metadata_all.csv` (columns `filename,transcript,romanized`) is the source of truth — `record_batch.py` appends, `prepare_dataset.py` reads. Pair that with WAVs in `data/audio/` (NP_001.wav…).
2. `prepare_dataset.py` validates durations (0.3s–30s), resamples to 16 kHz mono, 80/20 split with `RANDOM_SEED=42`, writes `data/datasets/whisper_finetune/{train,test}/audio/*.wav` + `metadata.jsonl` (HF Datasets format).
3. `finetune_whisper.py` pre-extracts features with librosa at load time (intentional — avoids torchcodec on M1). Trains 20 epochs, batch 4 × grad-accum 2, `fp16=False` / `bf16=False` because MPS doesn't support them. Saves best-WER checkpoint to `models/whisper-nepali/`.
4. Inference code in all three apps reloads that directory with `WhisperProcessor.from_pretrained("models/whisper-nepali")` and `.generate(language="nepali", task="transcribe")`.

**Checkpoints + model weights are gitignored** (`models/whisper-nepali/*.safetensors`, `*.pt`, `checkpoint-*/`). Only tokenizer/config/test_results.json are tracked. Treat `models/whisper-nepali/` as rebuildable from the scripts.

## Conventions specific to this repo

- Device selection idiom: `DEVICE = "mps" if torch.backends.mps.is_available() else "cpu"` — CUDA is not a supported path.
- Sample rate is fixed at 16000 Hz everywhere; if adding audio, resample with `librosa.resample` before feeding the processor.
- Audio filenames are zero-padded `NP_{num:03d}.wav`; `record_batch.py` auto-increments from existing files.
- `.env` holds `ANTHROPIC_API_KEY` (loaded via `python-dotenv`) — gitignored.
- Nepali output must stay in Devanagari; the system prompt + `clean_text()` exist because Claude otherwise drifts to Romanized/English or markdown.
- `data/_archive/` holds old/pre-Phase-4 files kept for reference — do not delete, do not use in new pipelines.

## Git policy

Per global instructions: no AI co-author trailers on commits, ever.
