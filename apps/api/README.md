# Nepali Voice AI — Backend

FastAPI service that wraps the fine-tuned Whisper (`nepaman/whisper-nepali-tiny`) + Claude + Edge-TTS into a REST API.

Designed to run on the existing Oracle A1 host (`n8n-arm-server`) as a sidecar to n8n. Public entry point: `https://voice-api.overseasnepal.com` (routed by the n8n reverse proxy).

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET  | `/v1/health`     | Liveness probe |
| POST | `/v1/transcribe` | `multipart/form-data` with `audio` file → `{ text }` |
| POST | `/v1/chat`       | `{ text, session_id? }` → `{ reply, session_id }` |
| POST | `/v1/tts`        | `{ text, voice? }` → `audio/mpeg` stream |
| POST | `/v1/voice`      | End-to-end: audio in → `audio/mpeg` out, metadata in `X-User-Text` / `X-Ai-Text` / `X-Session-Id` response headers |

OpenAPI docs at `/docs` (disable in prod if you want).

## Local dev (Mac / M-series)

```bash
cd apps/api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # fill in ANTHROPIC_API_KEY
uvicorn app.main:app --reload --port 8000
```

## Build the image (on the Mac, ARM64)

```bash
docker buildx build --platform linux/arm64 -t nepali-voice-api:latest --load .
docker images nepali-voice-api
```

Whisper model is snapshot-downloaded from HF during build. Final image ~2.5 GB (PyTorch CPU wheel dominates).

## Deploy to the A1 host

Target: `n8n-arm-server` at `159.54.177.46`.

### 1. Copy the image

Two options — pick one:

**a) Build on the box** (simplest, A1 has 4 OCPU):
```bash
ssh <user>@159.54.177.46
git clone https://github.com/<you>/nepali-voice-ai-pilot.git
cd nepali-voice-ai-pilot/apps/api
cp .env.example .env
vi .env                    # set ANTHROPIC_API_KEY
docker compose up -d --build
```

**b) Build locally, push to OCIR, pull on the box:**
```bash
# local
docker tag nepali-voice-api:latest iad.ocir.io/<tenancy-namespace>/nepali-voice-api:latest
docker push iad.ocir.io/<tenancy-namespace>/nepali-voice-api:latest

# on box
docker pull iad.ocir.io/<tenancy-namespace>/nepali-voice-api:latest
docker compose up -d
```

### 2. Reverse-proxy route on the box

If n8n is fronted by Caddy, add this block to its `Caddyfile`:

```caddyfile
voice-api.overseasnepal.com {
    encode zstd gzip
    @preflight method OPTIONS
    respond @preflight 204

    reverse_proxy 127.0.0.1:8001 {
        header_up Host {upstream_hostport}
        transport http {
            # Whisper on ARM CPU can take ~10s for 30s clips
            read_timeout 120s
            write_timeout 120s
        }
    }

    # Basic hardening
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options nosniff
        Referrer-Policy strict-origin-when-cross-origin
        -Server
    }
}
```

If n8n uses **Traefik**, add these labels to the `nepali-voice-api` service in `docker-compose.yml`:

```yaml
labels:
  - traefik.enable=true
  - traefik.http.routers.voice-api.rule=Host(`voice-api.overseasnepal.com`)
  - traefik.http.routers.voice-api.entrypoints=websecure
  - traefik.http.routers.voice-api.tls.certresolver=le
  - traefik.http.services.voice-api.loadbalancer.server.port=8000
```

### 3. Cloudflare DNS

`api.overseasnepal.com` exists? check first: `dig voice-api.overseasnepal.com`.

Add an **A record** in the Cloudflare dashboard (or via API):
- name: `voice-api`
- type: `A`
- content: `159.54.177.46`
- proxy: **off** (gray cloud) — user requested CF for frontend only

If you later want WAF/DDoS, flip to orange cloud and bump the Caddy `read_timeout` above Cloudflare's 100s default.

### 4. Verify

```bash
curl -fsS https://voice-api.overseasnepal.com/v1/health
# {"status":"ok"}

curl -X POST https://voice-api.overseasnepal.com/v1/chat \
  -H 'content-type: application/json' \
  -d '{"text":"namaste"}'
```

## Resource expectations

- **RAM**: ~2.5 GB steady (Whisper-tiny + PyTorch + FastAPI). Comfortably fits on 24 GB shared with n8n.
- **CPU**: Spikes to 100% of 1 core per transcription (~3–6 s for 10 s of audio on ARM Ampere). Idle ~0%.
- **Disk**: Image ~2.5 GB; generated MP3s are ephemeral (streamed, not stored).
- **Egress**: ~10–30 KB per Claude call, ~5–15 KB per TTS MP3.

## Rotating secrets

```bash
ssh <user>@159.54.177.46
cd ~/nepali-voice-ai-pilot/apps/api
vi .env
docker compose up -d            # recreates the container with new env
```

## Logs

```bash
docker compose logs -f nepali-voice-api
```

Structured JSON via `structlog`. Pipe to `jq` for readability:
```bash
docker compose logs --no-color nepali-voice-api | jq -R 'fromjson? // .'
```
