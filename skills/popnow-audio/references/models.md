# PopNow audio models

Snapshot of `GET /api/v1/models` taken 2026-11-03. Prices are in USD, paid from the separate API balance, and are the starting price per unit; the exact amount of one request comes from `popnow.py quote`. The live list is always the source of truth: `popnow.py models --modality audio`.

Model IDs follow `<maker>/<model>/<task>`. Read a model's input fields with `popnow.py model <id>`.

## Music and sound (text to audio)

| Model ID | Name | Maker | Price (USD) | Tiers |
| --- | --- | --- | --- | --- |
| `bytedance/seed-audio-1.0/text-to-audio` | Seed Audio 1.0 · text-to-audio | ByteDance | $0.36 / run | - |
| `minimax/music-3.0/text-to-audio` | MiniMax Music 3.0 · text-to-audio | MiniMax | $0.18 / run | - |
| `suno/v6-mini/text-to-audio` | Suno v6 Mini · text-to-audio | Suno | $0.072 / run | - |
| `suno/v6-wild/text-to-audio` | Suno v6 Wild · text-to-audio | Suno | $0.072 / run | - |
| `suno/v6/text-to-audio` | Suno v6 · text-to-audio | Suno | $0.072 / run | - |

## Speech (text to speech)

| Model ID | Name | Maker | Price (USD) | Tiers |
| --- | --- | --- | --- | --- |
| `alibaba/qwen-3-tts/text-to-speech` | Qwen3 TTS · text-to-speech | Alibaba | $0.068 / 1k chars | - |
| `bytedance/seed-speech-2.0/text-to-speech` | Seed Speech 2.0 · text-to-speech | ByteDance | $0.072 / 1k chars | - |
| `google/gemini-2.5-pro-tts/text-to-speech` | Gemini 2.5 Pro TTS · text-to-speech | Google | $0.00045 / second | - |
| `google/gemini-3.8-flash-lite-tts/text-to-speech` | Gemini 3.8 Flash-Lite TTS · text-to-speech | Google | $0.00021 / second | - |
| `google/gemini-3.8-flash-tts/text-to-speech` | Gemini 3.8 Flash TTS · text-to-speech | Google | $0.00032 / second | - |
| `minimax/speech-2.8-hd/text-to-speech` | MiniMax Speech 2.8 HD · text-to-speech | MiniMax | $0.12 / 1k chars | - |
| `minimax/speech-2.8-turbo/text-to-speech` | MiniMax Speech 2.8 Turbo · text-to-speech | MiniMax | $0.072 / 1k chars | - |
| `openai/tts-1-hd/text-to-speech` | TTS-1 HD · text-to-speech | OpenAI | $0.006 / 1k chars | - |
| `openai/tts-1/text-to-speech` | TTS-1 · text-to-speech | OpenAI | $0.003 / 1k chars | - |
| `resemble-ai/chatterbox-v1/text-to-speech` | Chatterbox · text-to-speech | Resemble AI | $0.036 / run | - |
| `xai/grok-tts/text-to-speech` | Grok TTS · text-to-speech | xAI | $0.018 / 1k chars | - |

## Transcription (speech to text)

| Model ID | Name | Maker | Price (USD) | Tiers |
| --- | --- | --- | --- | --- |
| `heartmula/transcribe/speech-to-text` | HeartMuLa Transcribe · speech-to-text | HeartMuLa | $0.05 / run | - |
| `openai/gpt-4o-mini-transcribe/speech-to-text` | GPT-4o Mini Transcribe · speech-to-text | OpenAI | $0.00005 / second | - |
| `openai/gpt-4o-transcribe-diarize/speech-to-text` | GPT-4o Transcribe Diarize · speech-to-text | OpenAI | $0.0001 / second | - |
| `openai/gpt-4o-transcribe/speech-to-text` | GPT-4o Transcribe · speech-to-text | OpenAI | $0.0001 / second | - |
| `openai/gpt-live-transcribe/realtime-transcription` | GPT Live Transcribe · realtime-transcription | OpenAI | $0.000056667 / second | - |
| `openai/gpt-transcribe/realtime-transcription` | GPT Transcribe · realtime-transcription | OpenAI | $0.000015 / second | - |
| `openai/gpt-transcribe/speech-to-text` | GPT Transcribe · speech-to-text | OpenAI | $0.000075 / second | - |
| `openai/whisper-1/speech-to-text` | Whisper 1 · speech-to-text | OpenAI | $0.0001 / second | - |
| `xai/grok-stt/speech-to-text` | Grok STT · speech-to-text | xAI | $0.000033334 / second | - |

## Audio tools

| Model ID | Name | Maker | Price (USD) | Tiers |
| --- | --- | --- | --- | --- |
| `openai/gpt-realtime-2.1-mini/realtime` | GPT-Realtime-2.1 Mini · realtime | OpenAI | $0.00048 / 1k tokens | - |
| `openai/gpt-realtime-2.1/realtime` | GPT-Realtime-2.1 · realtime | OpenAI | $0.0048 / 1k tokens | - |
| `popnow/vocal-isolator-v1/audio-separation` | Vocal Isolator · audio-separation | PopNow | $0.0012 / second | - |
| `popnow/voice-cleaner-v1/audio-to-audio` | Voice Cleaner · audio-to-audio | PopNow | $0.00028 / second | - |

## Sound for a video (video to audio)

| Model ID | Name | Maker | Price (USD) | Tiers |
| --- | --- | --- | --- | --- |
| `popnow/foley-v1/video-to-audio` | Video Sound Effects · video-to-audio | PopNow | $0.0012 / second | - |
