# syntax=docker/dockerfile:1.7
# Build for ARM64 (Oracle A1.Flex). Multi-arch works on M-series Macs too.

############################
# Stage 1 — build deps + preload model
############################
FROM --platform=linux/arm64 python:3.11-slim AS builder

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential \
      libsndfile1 \
      ffmpeg \
      git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build
COPY requirements.txt .

# PyTorch 2.5.1 CPU wheel for aarch64 comes from the default index.
RUN pip install --prefix=/install -r requirements.txt

# Bake the Whisper model into the image so container starts fast.
# Interim: using openai/whisper-small base (244M, much better multilingual than tiny).
# When community corpus > 500 samples: re-fine-tune this base and publish as
# nepaman/whisper-nepali-small-v1, then flip this ARG back.
ARG HF_MODEL_ID=openai/whisper-small
ENV HF_HOME=/model-cache
RUN pip install --no-cache-dir --prefix=/install "huggingface_hub>=0.26" \
    && PYTHONPATH=/install/lib/python3.11/site-packages \
       python -c "from huggingface_hub import snapshot_download; \
                  snapshot_download('${HF_MODEL_ID}', cache_dir='${HF_HOME}')"

############################
# Stage 2 — runtime
############################
FROM --platform=linux/arm64 python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HF_HOME=/model-cache \
    TRANSFORMERS_OFFLINE=0 \
    PORT=8000

RUN apt-get update && apt-get install -y --no-install-recommends \
      libsndfile1 \
      ffmpeg \
      curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --shell /bin/bash app

COPY --from=builder /install /usr/local
COPY --from=builder /model-cache /model-cache
RUN chown -R app:app /model-cache

WORKDIR /app
COPY --chown=app:app app ./app

USER app
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -fsS http://localhost:8000/v1/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
