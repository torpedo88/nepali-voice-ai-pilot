# Community Contributions

This directory stores audio contributions from the community to improve the Nepali STT model.

## Structure

- `*.wav|mp3|webm|ogg` - Audio files (gitignored)
- `metadata.jsonl` - JSONL file with contribution metadata

## Metadata Format

Each line in `metadata.jsonl` contains:

```json
{
  "contribution_id": "abc123",
  "timestamp": "2026-04-20T12:00:00Z",
  "audio_filename": "abc123.webm", 
  "audio_size_bytes": 50000,
  "expected_transcript": "नमस्ते, मेरो नाम राम हो।",
  "model_transcript": "नमस्ते, मेरो नाम राम हो।",
  "contributor_name": "John Doe",
  "status": "pending",
  "content_type": "audio/webm"
}
```

## Status Values

- `pending` - Awaiting review
- `approved` - Approved for training
- `rejected` - Not suitable for training

## Usage

Process approved contributions into training format:

```bash
# Filter approved entries
cat metadata.jsonl | jq 'select(.status == "approved")'

# Convert to whisper training format
python scripts/process_contributions.py
```