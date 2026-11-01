# PopNow audio models

Snapshot of `GET /api/v1/models` taken 2026-10-18. Prices are in USD, paid from the separate API balance, and are the starting price per unit; the exact amount of one request comes from `popnow.py quote`. The live list is always the source of truth: `popnow.py models --modality audio`.

Model IDs follow `<maker>/<model>/<task>`. Read a model's input fields with `popnow.py model <id>`.

## Music and sound (text to audio)

| Model ID | Name | Maker | Price (USD) | Tiers |
| --- | --- | --- | --- | --- |
| `bytedance/seed-audio-1.0/text-to-audio` | Seed Audio 1.0 | ByteDance | $0.36 / run | - |
| `minimax/music-3.0/text-to-audio` | MiniMax Music 3.0 | MiniMax | $0.18 / run | - |
| `suno/v6-mini/text-to-audio` | Suno v6 Mini | Suno | $0.072 / run | - |
| `suno/v6-wild/text-to-audio` | Suno v6 Wild | Suno | $0.072 / run | - |
| `suno/v6/text-to-audio` | Suno v6 | Suno | $0.072 / run | - |

## Speech (text to speech)

| Model ID | Name | Maker | Price (USD) | Tiers |
| --- | --- | --- | --- | --- |
| `alibaba/qwen-3-tts/text-to-speech` | Qwen3 TTS | Alibaba | $0.068 / 1k chars | - |
| `bytedance/seed-speech-2.0/text-to-speech` | Seed Speech 2.0 | ByteDance | $0.072 / 1k chars | - |
| `google/gemini-2.5-pro-tts/text-to-speech` | Gemini 2.5 Pro TTS | Google | $0.00045 / second | - |
| `google/gemini-3.8-flash-lite-tts/text-to-speech` | Gemini 3.8 Flash-Lite TTS | Google | $0.00021 / second | - |
| `google/gemini-3.8-flash-tts/text-to-speech` | Gemini 3.8 Flash TTS | Google | $0.00032 / second | - |
| `minimax/speech-2.8-hd/text-to-speech` | MiniMax Speech 2.8 HD | MiniMax | $0.12 / 1k chars | - |
| `minimax/speech-2.8-turbo/text-to-speech` | MiniMax Speech 2.8 Turbo | MiniMax | $0.072 / 1k chars | - |
| `resemble-ai/chatterbox-v1/text-to-speech` | Chatterbox | Resemble AI | $0.036 / run | - |
| `xai/grok-tts/text-to-speech` | Grok TTS | xAI | $0.018 / 1k chars | - |

## Transcription (speech to text)

| Model ID | Name | Maker | Price (USD) | Tiers |
| --- | --- | --- | --- | --- |
| `heartmula/transcribe/speech-to-text` | HeartMuLa Transcribe | HeartMuLa | $0.05 / run | - |
| `xai/grok-stt/speech-to-text` | Grok STT | xAI | $0.00003 / second | - |

## Sound for a video (video to audio)

| Model ID | Name | Maker | Price (USD) | Tiers |
| --- | --- | --- | --- | --- |
| `popnow/foley-v1/video-to-audio` | Video Sound Effects | PopNow | $0.0012 / second, up to 30s | - |
