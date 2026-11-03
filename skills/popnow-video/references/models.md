# PopNow video models

Snapshot of `GET /api/v1/models` taken 2026-11-03. Prices are in USD, paid from the separate API balance, and are the starting price per unit; the exact amount of one request comes from `popnow.py quote`. The live list is always the source of truth: `popnow.py models --modality video`.

Model IDs follow `<maker>/<model>/<task>`. Read a model's input fields with `popnow.py model <id>`.

## Text to video

| Model ID | Name | Maker | Price (USD) | Tiers |
| --- | --- | --- | --- | --- |
| `alibaba/happyhorse-1.1/text-to-video` | HappyHorse 1.1 · text-to-video | Alibaba | $0.14 / second | 720p: $0.14; 1080p: $0.18 |
| `alibaba/wan-2.1-lora/text-to-video` | Wan 2.1 LoRA · text-to-video | Alibaba | $0.24 / run | duration_seconds=5, resolution=480p: $0.24; duration_seconds=10, resolution=480p: $0.36; duration_seconds=5, resolution=720p: $0.36; duration_seconds=10, resolution=720p: $0.54 |
| `alibaba/wan-2.2-5b-lora/text-to-video` | Wan 2.2 5B LoRA · text-to-video | Alibaba | $0.12 / run | - |
| `alibaba/wan-2.2-lora/text-to-video` | Wan 2.2 LoRA · text-to-video | Alibaba | $0.048 / second | 480p: $0.048; 720p: $0.084 |
| `alibaba/wan-2.2/text-to-video` | Wan 2.2 · text-to-video | Alibaba | $0.24 / run | 480p: $0.24; 720p: $0.48 |
| `alibaba/wan-2.5/text-to-video` | Wan 2.5 · text-to-video | Alibaba | $0.045 / second | 480p: $0.045; 720p: $0.09; 1080p: $0.135 |
| `alibaba/wan-2.6/text-to-video` | Wan 2.6 · text-to-video | Alibaba | $0.09 / second | 720p: $0.09; 1080p: $0.135 |
| `alibaba/wan-3.0-prime/text-to-video` | Wan 3.0 Prime · text-to-video | Alibaba | $0.0612 / second | 480p: $0.0612; 720p: $0.126; 1080p: $0.252 |
| `alibaba/wan-3.0-pro-prime/text-to-video` | Wan 3.0 Pro Prime · text-to-video | Alibaba | $0.234 / second | 1080p: $0.234; 2k: $0.252; 4k: $0.279 |
| `alibaba/wan-3.0-pro/text-to-video` | Wan 3.0 Pro · text-to-video | Alibaba | $0.144 / second | 1080p: $0.144; 2k: $0.16; 4k: $0.184 |
| `alibaba/wan-3.0/text-to-video` | Wan 3.0 · text-to-video | Alibaba | $0.045 / second | 480p: $0.045; 720p: $0.09; 1080p: $0.18 |
| `black-forest-labs/flux-3/text-to-video` | FLUX 3 · text-to-video | Black Forest Labs | $0.06 / second | quality=draft, resolution=1080p: $0.06; quality=draft, resolution=720p: $0.06; quality=standard, resolution=720p: $0.17; quality=standard, resolution=1080p: $0.29 |
| `bytedance/seedance-2.0-fast/text-to-video` | Seedance 2.0 Fast · text-to-video | ByteDance | $0.04499712 / second | generate_audio=false, resolution=480p: $0.04499712; generate_audio=true, resolution=480p: $0.04499712; enable_web_search=true, generate_audio=false, resolution=480p: $0.0702; enable_web_search=true, generate_audio=true, resolution=480p: $0.0702; generate_audio=false, resolution=720p: $0.096768; generate_audio=true, resolution=720p: $0.096768 ... |
| `bytedance/seedance-2.0-mini/text-to-video` | Seedance 2.0 Mini · text-to-video | ByteDance | $0.0246078 / second | generate_audio=false, resolution=480p: $0.0246078; generate_audio=true, resolution=480p: $0.0246078; generate_audio=false, resolution=720p: $0.05292; generate_audio=true, resolution=720p: $0.05292 |
| `bytedance/seedance-2.0/text-to-video` | Seedance 2.0 · text-to-video | ByteDance | $0.0728 / second | generate_audio=false, resolution=480p: $0.0728; generate_audio=true, resolution=480p: $0.0728; enable_web_search=true, generate_audio=false, resolution=480p: $0.11856; enable_web_search=true, generate_audio=true, resolution=480p: $0.11856; generate_audio=false, resolution=720p: $0.15808; generate_audio=true, resolution=720p: $0.15808 ... |
| `bytedance/seedance-2.5/text-to-video` | Seedance 2.5 · text-to-video | ByteDance | $0.1234 / second | generate_audio=false, resolution=480p: $0.1234; generate_audio=true, resolution=480p: $0.1234; generate_audio=false, resolution=720p: $0.2773; generate_audio=true, resolution=720p: $0.2773; generate_audio=false, resolution=1080p: $0.6823; generate_audio=true, resolution=1080p: $0.6823 |
| `google/gemini-omni-1.1-flash/text-to-video` | Gemini Omni 1.1 Flash · text-to-video | Google | $0.3648 / run | duration_seconds=4, resolution=720p: $0.3648; duration_seconds=4, resolution=1080p: $0.5473; duration_seconds=6, resolution=720p: $0.5473; duration_seconds=8, resolution=720p: $0.7297; duration_seconds=6, resolution=1080p: $0.821; duration_seconds=10, resolution=720p: $0.9122 ... |
| `google/veo-3.1-fast/text-to-video` | Veo 3.1 Fast · text-to-video | Google | $0.36 / run | 4: $0.36; 6: $0.54; 8: $0.72 |
| `google/veo-3.1-lite/text-to-video` | Veo 3.1 Lite · text-to-video | Google | $0.18 / run | 4: $0.18; 6: $0.27; 8: $0.36 |
| `google/veo-3.1/text-to-video` | Veo 3.1 · text-to-video | Google | $1.44 / run | 4: $1.44; 6: $2.16; 8: $2.88 |
| `kling/2.1-master/text-to-video` | Kling 2.1 Master · text-to-video | Kuaishou | $0.216 / second | - |
| `kling/2.5-turbo/text-to-video` | Kling 2.5 Turbo · text-to-video | Kuaishou | $0.056 / second | - |
| `kling/2.6/text-to-video` | Kling 2.6 · text-to-video | Kuaishou | $0.069 / second | false: $0.069; true: $0.138 |
| `kling/3.0-turbo/text-to-video` | Kling 3.0 Turbo · text-to-video | Kuaishou | $0.112 / second | 720p: $0.112; 1080p: $0.14 |
| `kling/3.0/text-to-video` | Kling 3.0 · text-to-video | Kuaishou | $0.0672 / second | generate_audio=false, resolution=720p: $0.0672; generate_audio=false, resolution=1080p: $0.0896; generate_audio=true, resolution=720p: $0.1008; generate_audio=true, resolution=1080p: $0.1344; generate_audio=false, resolution=4k: $0.336; generate_audio=true, resolution=4k: $0.336 |
| `kling/4.0/text-to-video` | Kling 4.0 · text-to-video | Kuaishou | $0.1884 / second | 720p: $0.1884; 1080p: $0.282 |
| `kling/o3/text-to-video` | Kling O3 · text-to-video | Kuaishou | $0.0672 / second | generate_audio=false, resolution=720p: $0.0672; generate_audio=false, resolution=1080p: $0.0896; generate_audio=true, resolution=720p: $0.0896; generate_audio=true, resolution=1080p: $0.112; generate_audio=false, resolution=4k: $0.336; generate_audio=true, resolution=4k: $0.336 |
| `lightricks/ltx-2-19b-lora/text-to-video` | LTX-2 19B LoRA · text-to-video | Lightricks | $0.018 / second | 480p: $0.018; 720p: $0.024; 1080p: $0.036 |
| `lightricks/ltx-2-19b/text-to-video` | LTX-2 19B · text-to-video | Lightricks | $0.0144 / second | 480p: $0.0144; 720p: $0.0192; 1080p: $0.0288 |
| `lightricks/ltx-2.3-lora/text-to-video` | LTX-2.3 LoRA · text-to-video | Lightricks | $0.024 / second | 480p: $0.024; 720p: $0.036; 1080p: $0.048 |
| `lightricks/ltx-2.5/text-to-video` | LTX 2.5 · text-to-video | Lightricks | $0.0945 / second | 720p: $0.0945; 1080p: $0.1365; 2k: $0.1995; 4k: $0.315 |
| `minimax/h3-highspeed/text-to-video` | MiniMax H3 HighSpeed · text-to-video | MiniMax | $0.06 / second | - |
| `minimax/h3-lite/text-to-video` | MiniMax H3 Lite · text-to-video | MiniMax | $0.025 / second | 480p: $0.025; 768p: $0.04 |
| `minimax/h3-lora/text-to-video` | MiniMax H3 LoRA · text-to-video | MiniMax | $0.05 / second | 480p: $0.05; 540p: $0.075; 768p: $0.1; 1080p: $0.2 |
| `minimax/h3-max/text-to-video` | MiniMax H3 Max · text-to-video | MiniMax | $0.0565 / second | 480p: $0.0565; 768p: $0.0904 |
| `minimax/h3-x-turbo/text-to-video` | MiniMax H3 X Turbo · text-to-video | MiniMax | $0.015 / second | 480p: $0.015; 720p: $0.024; 1080p: $0.032 |
| `minimax/h3-x/text-to-video` | MiniMax H3 X · text-to-video | MiniMax | $0.022 / second | 480p: $0.022; 720p: $0.032; 1080p: $0.045 |
| `minimax/h3/text-to-video` | MiniMax H3 · text-to-video | MiniMax | $0.025 / second | 480p: $0.025; 768p: $0.037; 2k: $0.058 |
| `pixverse/v6-max/text-to-video` | PixVerse V6 Max · text-to-video | PixVerse | $0.028196 / second | generate_audio=false, resolution=360p: $0.028196; generate_audio=false, resolution=540p: $0.0424; generate_audio=true, resolution=360p: $0.0424; generate_audio=false, resolution=720p: $0.051728; generate_audio=true, resolution=540p: $0.051728; generate_audio=true, resolution=720p: $0.070596 ... |
| `pixverse/v6/text-to-video` | PixVerse V6 · text-to-video | PixVerse | $0.023532 / second | generate_audio=false, resolution=360p: $0.023532; generate_audio=false, resolution=540p: $0.032966; generate_audio=true, resolution=360p: $0.032966; generate_audio=false, resolution=720p: $0.0424; generate_audio=true, resolution=540p: $0.0424; generate_audio=true, resolution=720p: $0.056498 ... |
| `sand-ai/davinci-magihuman/text-to-video` | daVinci-MagiHuman · text-to-video | Sand.ai | $0.024 / second | 256p: $0.024; 720p: $0.048; 1080p: $0.072 |
| `tencent/hunyuan-video-1.5/text-to-video` | HunyuanVideo 1.5 · text-to-video | Tencent | $0.024 / second | 480p: $0.024; 720p: $0.048 |

## Image to video

| Model ID | Name | Maker | Price (USD) | Tiers |
| --- | --- | --- | --- | --- |
| `alibaba/happyhorse-1.1/image-to-video` | HappyHorse 1.1 · image-to-video | Alibaba | $0.14 / second | 720p: $0.14; 1080p: $0.18 |
| `alibaba/wan-2.1-lora/image-to-video` | Wan 2.1 LoRA · image-to-video | Alibaba | $0.24 / run | duration_seconds=5, resolution=480p: $0.24; duration_seconds=10, resolution=480p: $0.36; duration_seconds=5, resolution=720p: $0.36; duration_seconds=10, resolution=720p: $0.54 |
| `alibaba/wan-2.2-5b-lora/image-to-video` | Wan 2.2 5B LoRA · image-to-video | Alibaba | $0.12 / run | - |
| `alibaba/wan-2.2-lora/image-to-video` | Wan 2.2 LoRA · image-to-video | Alibaba | $0.024 / second | 480p: $0.024; 720p: $0.048 |
| `alibaba/wan-2.2/image-to-video` | Wan 2.2 · image-to-video | Alibaba | $0.24 / run | 480p: $0.24; 720p: $0.48 |
| `alibaba/wan-2.5/image-to-video` | Wan 2.5 · image-to-video | Alibaba | $0.045 / second | 480p: $0.045; 720p: $0.09; 1080p: $0.135 |
| `alibaba/wan-2.6-flash/image-to-video` | Wan 2.6 Flash · image-to-video | Alibaba | $0.0225 / second | generate_audio=false, resolution=720p: $0.0225; generate_audio=false, resolution=1080p: $0.03375; generate_audio=true, resolution=720p: $0.045; generate_audio=true, resolution=1080p: $0.0675 |
| `alibaba/wan-2.6/image-to-video` | Wan 2.6 · image-to-video | Alibaba | $0.09 / second | 720p: $0.09; 1080p: $0.135 |
| `alibaba/wan-3.0-prime/image-to-video` | Wan 3.0 Prime · image-to-video | Alibaba | $0.0612 / second | 480p: $0.0612; 720p: $0.126; 1080p: $0.252 |
| `alibaba/wan-3.0-pro-prime/image-to-video` | Wan 3.0 Pro Prime · image-to-video | Alibaba | $0.234 / second | 1080p: $0.234; 2k: $0.252; 4k: $0.279 |
| `alibaba/wan-3.0-pro/image-to-video` | Wan 3.0 Pro · image-to-video | Alibaba | $0.144 / second | 1080p: $0.144; 2k: $0.16; 4k: $0.184 |
| `alibaba/wan-3.0/image-to-video` | Wan 3.0 · image-to-video | Alibaba | $0.045 / second | 480p: $0.045; 720p: $0.09; 1080p: $0.18 |
| `black-forest-labs/flux-3/image-to-video` | FLUX 3 · image-to-video | Black Forest Labs | $0.06 / second | quality=draft, resolution=1080p: $0.06; quality=draft, resolution=720p: $0.06; quality=standard, resolution=720p: $0.17; quality=standard, resolution=1080p: $0.29 |
| `bytedance/seedance-2.0-fast/image-to-video` | Seedance 2.0 Fast · image-to-video | ByteDance | $0.04499712 / second | generate_audio=false, resolution=480p: $0.04499712; generate_audio=true, resolution=480p: $0.04499712; generate_audio=false, resolution=720p: $0.096768; generate_audio=true, resolution=720p: $0.096768 |
| `bytedance/seedance-2.0-mini/image-to-video` | Seedance 2.0 Mini · image-to-video | ByteDance | $0.0246078 / second | generate_audio=false, resolution=480p: $0.0246078; generate_audio=true, resolution=480p: $0.0246078; enable_web_search=true, generate_audio=false, resolution=480p: $0.036; enable_web_search=true, generate_audio=true, resolution=480p: $0.036; generate_audio=false, resolution=720p: $0.05292; generate_audio=true, resolution=720p: $0.05292 ... |
| `bytedance/seedance-2.0/image-to-video` | Seedance 2.0 · image-to-video | ByteDance | $0.0721 / second | generate_audio=false, resolution=480p: $0.0721; generate_audio=true, resolution=480p: $0.0721; generate_audio=false, resolution=720p: $0.15656; generate_audio=true, resolution=720p: $0.15656; generate_audio=false, resolution=1080p: $0.38522; generate_audio=true, resolution=1080p: $0.38522 ... |
| `bytedance/seedance-2.5/image-to-video` | Seedance 2.5 · image-to-video | ByteDance | $0.1234 / second | generate_audio=false, resolution=480p: $0.1234; generate_audio=true, resolution=480p: $0.1234; generate_audio=false, resolution=720p: $0.2773; generate_audio=true, resolution=720p: $0.2773; generate_audio=false, resolution=1080p: $0.6823; generate_audio=true, resolution=1080p: $0.6823 |
| `google/gemini-omni-1.1-flash/image-to-video` | Gemini Omni 1.1 Flash · image-to-video | Google | $0.3648 / run | duration_seconds=4, resolution=720p: $0.3648; duration_seconds=4, resolution=1080p: $0.5473; duration_seconds=6, resolution=720p: $0.5473; duration_seconds=8, resolution=720p: $0.7297; duration_seconds=6, resolution=1080p: $0.821; duration_seconds=10, resolution=720p: $0.9122 ... |
| `google/veo-3.1-fast/image-to-video` | Veo 3.1 Fast · image-to-video | Google | $0.36 / run | 4: $0.36; 6: $0.54; 8: $0.72 |
| `google/veo-3.1-lite/image-to-video` | Veo 3.1 Lite · image-to-video | Google | $0.18 / run | 4: $0.18; 6: $0.27; 8: $0.36 |
| `google/veo-3.1/image-to-video` | Veo 3.1 · image-to-video | Google | $1.44 / run | 4: $1.44; 6: $2.16; 8: $2.88 |
| `kling/2.1-master/image-to-video` | Kling 2.1 Master · image-to-video | Kuaishou | $0.216 / second | - |
| `kling/2.1/image-to-video` | Kling 2.1 · image-to-video | Kuaishou | $0.035 / second | 720p: $0.035; 1080p: $0.068 |
| `kling/2.5-turbo/image-to-video` | Kling 2.5 Turbo · image-to-video | Kuaishou | $0.056 / second | - |
| `kling/2.6/image-to-video` | Kling 2.6 · image-to-video | Kuaishou | $0.07038 / second | false: $0.07038; true: $0.14076 |
| `kling/3.0-turbo/image-to-video` | Kling 3.0 Turbo · image-to-video | Kuaishou | $0.112 / second | 720p: $0.112; 1080p: $0.14 |
| `kling/3.0/image-to-video` | Kling 3.0 · image-to-video | Kuaishou | $0.0672 / second | generate_audio=false, resolution=720p: $0.0672; generate_audio=false, resolution=1080p: $0.0896; generate_audio=true, resolution=720p: $0.1008; generate_audio=true, resolution=1080p: $0.1344; generate_audio=false, resolution=4k: $0.336; generate_audio=true, resolution=4k: $0.336 |
| `kling/4.0/image-to-video` | Kling 4.0 · image-to-video | Kuaishou | $0.1884 / second | 720p: $0.1884; 1080p: $0.282 |
| `kling/o3/image-to-video` | Kling O3 · image-to-video | Kuaishou | $0.0672 / second | generate_audio=false, resolution=720p: $0.0672; generate_audio=false, resolution=1080p: $0.0896; generate_audio=true, resolution=720p: $0.0896; generate_audio=true, resolution=1080p: $0.112; generate_audio=false, resolution=4k: $0.336; generate_audio=true, resolution=4k: $0.336 |
| `lightricks/ltx-2-19b-lora/image-to-video` | LTX-2 19B LoRA · image-to-video | Lightricks | $0.018 / second | 480p: $0.018; 720p: $0.024; 1080p: $0.036 |
| `lightricks/ltx-2-19b/image-to-video` | LTX-2 19B · image-to-video | Lightricks | $0.0144 / second | 480p: $0.0144; 720p: $0.0192; 1080p: $0.0288 |
| `lightricks/ltx-2.3-lora/image-to-video` | LTX-2.3 LoRA · image-to-video | Lightricks | $0.024 / second | 480p: $0.024; 720p: $0.036; 1080p: $0.048 |
| `lightricks/ltx-2.5/image-to-video` | LTX 2.5 · image-to-video | Lightricks | $0.0936 / second | 720p: $0.0936; 1080p: $0.1352; 2k: $0.1976; 4k: $0.312 |
| `minimax/h3-360-orbit/image-to-video` | MiniMax H3 360 Orbit · image-to-video | MiniMax | $0.05 / second | 480p: $0.05; 540p: $0.075; 768p: $0.1; 1080p: $0.2 |
| `minimax/h3-highspeed/image-to-video` | MiniMax H3 HighSpeed · image-to-video | MiniMax | $0.06 / second | - |
| `minimax/h3-lite/image-to-video` | MiniMax H3 Lite · image-to-video | MiniMax | $0.025 / second | 480p: $0.025; 768p: $0.04 |
| `minimax/h3-lora/image-to-video` | MiniMax H3 LoRA · image-to-video | MiniMax | $0.05 / second | 480p: $0.05; 540p: $0.075; 768p: $0.1; 1080p: $0.2 |
| `minimax/h3-max/image-to-video` | MiniMax H3 Max · image-to-video | MiniMax | $0.0565 / second | 480p: $0.0565; 768p: $0.0904 |
| `minimax/h3-singularity-lora/image-to-video` | MiniMax H3 Singularity LoRA · image-to-video | MiniMax | $0.0625 / second | 480p: $0.0625; 540p: $0.09375; 768p: $0.125; 1080p: $0.25 |
| `minimax/h3-x-turbo/image-to-video` | MiniMax H3 X Turbo · image-to-video | MiniMax | $0.015 / second | 480p: $0.015; 720p: $0.024; 1080p: $0.032 |
| `minimax/h3-x/image-to-video` | MiniMax H3 X · image-to-video | MiniMax | $0.022 / second | 480p: $0.022; 720p: $0.032; 1080p: $0.045 |
| `minimax/h3/image-to-video` | MiniMax H3 · image-to-video | MiniMax | $0.025 / second | 480p: $0.025; 768p: $0.037; 2k: $0.058 |
| `pixverse/v6-effects/image-to-video` | PixVerse V6 Effects · image-to-video | PixVerse | $0.02331 / second | generate_audio=false, resolution=360p: $0.02331; generate_audio=false, resolution=540p: $0.032655; generate_audio=true, resolution=360p: $0.032655; generate_audio=false, resolution=720p: $0.042; generate_audio=true, resolution=540p: $0.042; generate_audio=true, resolution=720p: $0.055965 ... |
| `pixverse/v6-max/image-to-video` | PixVerse V6 Max · image-to-video | PixVerse | $0.028196 / second | generate_audio=false, resolution=360p: $0.028196; generate_audio=false, resolution=540p: $0.0424; generate_audio=true, resolution=360p: $0.0424; generate_audio=false, resolution=720p: $0.051728; generate_audio=true, resolution=540p: $0.051728; generate_audio=true, resolution=720p: $0.070596 ... |
| `pixverse/v6/image-to-video` | PixVerse V6 · image-to-video | PixVerse | $0.023532 / second | generate_audio=false, resolution=360p: $0.023532; generate_audio=false, resolution=540p: $0.032966; generate_audio=true, resolution=360p: $0.032966; generate_audio=false, resolution=720p: $0.0424; generate_audio=true, resolution=540p: $0.0424; generate_audio=true, resolution=720p: $0.056498 ... |
| `sand-ai/davinci-magihuman/image-to-video` | daVinci-MagiHuman · image-to-video | Sand.ai | $0.024 / second | 256p: $0.024; 720p: $0.048; 1080p: $0.072 |
| `tencent/hunyuan-video-1.5/image-to-video` | HunyuanVideo 1.5 · image-to-video | Tencent | $0.024 / second | 480p: $0.024; 720p: $0.048 |
| `vidu/q3-pro/image-to-video` | Vidu Q3 Pro · image-to-video | Vidu | $0.054 / second | - |
| `vidu/q3-turbo/image-to-video` | Vidu Q3 Turbo · image-to-video | Vidu | $0.042 / second | 540p: $0.042; 720p: $0.066 |
| `vidu/q3/image-to-video` | Vidu Q3 · image-to-video | Vidu | $0.07 / second | 540p: $0.07; 720p: $0.15; 1080p: $0.16 |
| `vidu/q4-preview/image-to-video` | Vidu Q4 Preview · image-to-video | Vidu | $0.045 / second | 540p: $0.045; 720p: $0.095; 1080p: $0.12; 2k: $0.19; 4k: $0.39 |

## Reference to video

| Model ID | Name | Maker | Price (USD) | Tiers |
| --- | --- | --- | --- | --- |
| `alibaba/happyhorse-1.1/reference-to-video` | HappyHorse 1.1 · reference-to-video | Alibaba | $0.14 / second | 720p: $0.14; 1080p: $0.18 |
| `alibaba/wan-2.6-flash/reference-to-video` | Wan 2.6 Flash · reference-to-video | Alibaba | $0.0225 / second | generate_audio=false, resolution=720p: $0.0225; generate_audio=false, resolution=1080p: $0.03375; generate_audio=true, resolution=720p: $0.045; generate_audio=true, resolution=1080p: $0.0675 |
| `alibaba/wan-2.6/reference-to-video` | Wan 2.6 · reference-to-video | Alibaba | $0.065 / second | 720p: $0.065; 1080p: $0.0975 |
| `alibaba/wan-3.0-prime/reference-to-video` | Wan 3.0 Prime · reference-to-video | Alibaba | $0.0612 / second | 480p: $0.0612; 720p: $0.126; 1080p: $0.252 |
| `alibaba/wan-3.0-pro-prime/reference-to-video` | Wan 3.0 Pro Prime · reference-to-video | Alibaba | $0.234 / second | 1080p: $0.234; 2k: $0.252; 4k: $0.279 |
| `alibaba/wan-3.0-pro/reference-to-video` | Wan 3.0 Pro · reference-to-video | Alibaba | $0.144 / second | 1080p: $0.144; 2k: $0.16; 4k: $0.184 |
| `alibaba/wan-3.0/reference-to-video` | Wan 3.0 · reference-to-video | Alibaba | $0.045 / second | 480p: $0.045; 720p: $0.09; 1080p: $0.18 |
| `bytedance/seedance-2.0-fast/reference-to-video` | Seedance 2.0 Fast · reference-to-video | ByteDance | $0.04499712 / second | generate_audio=false, resolution=480p, with_video=true: $0.022539; generate_audio=true, resolution=480p, with_video=true: $0.022539; generate_audio=false, resolution=480p, with_video=false: $0.04499712; generate_audio=true, resolution=480p, with_video=false: $0.04499712; generate_audio=false, resolution=720p, with_video=true: $0.048471; generate_audio=true, resolution=720p, with_video=true: $0.048471 ... |
| `bytedance/seedance-2.0-mini/reference-to-video` | Seedance 2.0 Mini · reference-to-video | ByteDance | $0.0246078 / second | generate_audio=false, resolution=480p, with_video=true: $0.010969; generate_audio=true, resolution=480p, with_video=true: $0.010969; generate_audio=false, resolution=720p, with_video=true: $0.023588; generate_audio=true, resolution=720p, with_video=true: $0.023588; generate_audio=false, resolution=480p, with_video=false: $0.0246078; generate_audio=true, resolution=480p, with_video=false: $0.0246078 ... |
| `bytedance/seedance-2.0/reference-to-video` | Seedance 2.0 · reference-to-video | ByteDance | $0.0707 / second | generate_audio=false, resolution=480p, with_video=true: $0.043531; generate_audio=true, resolution=480p, with_video=true: $0.043531; generate_audio=false, resolution=480p, with_video=false: $0.0707; generate_audio=true, resolution=480p, with_video=false: $0.0707; generate_audio=false, resolution=720p, with_video=true: $0.093728; generate_audio=true, resolution=720p, with_video=true: $0.093728 ... |
| `bytedance/seedance-2.5/reference-to-video` | Seedance 2.5 · reference-to-video | ByteDance | $0.1234 / second | generate_audio=false, resolution=480p, with_video=true: $0.0738; generate_audio=true, resolution=480p, with_video=true: $0.0738; generate_audio=false, resolution=480p, with_video=false: $0.1234; generate_audio=true, resolution=480p, with_video=false: $0.1234; generate_audio=false, resolution=720p, with_video=true: $0.1659; generate_audio=true, resolution=720p, with_video=true: $0.1659 ... |
| `google/gemini-omni-1.1-flash/reference-to-video` | Gemini Omni 1.1 Flash · reference-to-video | Google | $0.3648 / run | duration_seconds=4, resolution=720p: $0.3648; duration_seconds=4, resolution=1080p: $0.5473; duration_seconds=6, resolution=720p: $0.5473; duration_seconds=8, resolution=720p: $0.7297; duration_seconds=6, resolution=1080p: $0.821; duration_seconds=10, resolution=720p: $0.9122 ... |
| `google/veo-3.1-fast/reference-to-video` | Veo 3.1 Fast · reference-to-video | Google | $0.72 / run | - |
| `google/veo-3.1-lite/reference-to-video` | Veo 3.1 Lite · reference-to-video | Google | $0.36 / run | - |
| `kling/4.0/reference-to-video` | Kling 4.0 · reference-to-video | Kuaishou | $0.1884 / second | resolution=720p, with_video=true: $0.1128; resolution=1080p, with_video=true: $0.1692; 720p: $0.1884; 1080p: $0.282 |
| `kling/o3/reference-to-video` | Kling O3 · reference-to-video | Kuaishou | $0.0672 / second | generate_audio=false, resolution=720p: $0.0672; generate_audio=false, resolution=1080p: $0.0896; generate_audio=true, resolution=720p: $0.0896; generate_audio=false, resolution=720p, with_video=true: $0.1008; generate_audio=true, resolution=1080p: $0.112; generate_audio=false, resolution=1080p, with_video=true: $0.1344 ... |
| `minimax/h3-highspeed/reference-to-video` | MiniMax H3 HighSpeed · reference-to-video | MiniMax | $0.06 / second | - |
| `minimax/h3-lite/reference-to-video` | MiniMax H3 Lite · reference-to-video | MiniMax | $0.025 / second | 480p: $0.025; 768p: $0.04 |
| `minimax/h3-lora/reference-to-video` | MiniMax H3 LoRA · reference-to-video | MiniMax | $0.06 / second | 480p: $0.06; 540p: $0.09; 768p: $0.12; 1080p: $0.24 |
| `minimax/h3-singularity-lora/reference-to-video` | MiniMax H3 Singularity LoRA · reference-to-video | MiniMax | $0.06 / second | 480p: $0.06; 540p: $0.09; 768p: $0.12; 1080p: $0.24 |
| `minimax/h3-x-turbo/reference-to-video` | MiniMax H3 X Turbo · reference-to-video | MiniMax | $0.015 / second | 480p: $0.015; 720p: $0.024; 1080p: $0.032 |
| `minimax/h3-x/reference-to-video` | MiniMax H3 X · reference-to-video | MiniMax | $0.022 / second | 480p: $0.022; 720p: $0.032; 1080p: $0.045 |
| `minimax/h3/reference-to-video` | MiniMax H3 · reference-to-video | MiniMax | $0.025 / second | 480p: $0.025; 768p: $0.037; 2k: $0.058 |
| `pixverse/v6/reference-to-video` | PixVerse V6 · reference-to-video | PixVerse | $0.023532 / second | generate_audio=false, resolution=360p: $0.023532; generate_audio=false, resolution=540p: $0.032966; generate_audio=true, resolution=360p: $0.032966; generate_audio=false, resolution=720p: $0.0424; generate_audio=true, resolution=540p: $0.0424; generate_audio=true, resolution=720p: $0.056498 ... |
| `vidu/q4-preview/reference-to-video` | Vidu Q4 Preview · reference-to-video | Vidu | $0.045 / second | 540p: $0.045; 720p: $0.095; 1080p: $0.12; 2k: $0.19; 4k: $0.39 |

## Extend a video

| Model ID | Name | Maker | Price (USD) | Tiers |
| --- | --- | --- | --- | --- |
| `alibaba/wan-2.2-lora/video-extend` | Wan 2.2 LoRA · video-extend | Alibaba | $0.024 / second | 480p: $0.024; 720p: $0.048 |
| `alibaba/wan-2.5/video-extend` | Wan 2.5 · video-extend | Alibaba | $0.045 / second | 480p: $0.045; 720p: $0.09; 1080p: $0.135 |
| `alibaba/wan-3.0-prime/video-extend` | Wan 3.0 Prime · video-extend | Alibaba | $0.0612 / second | 480p: $0.0612; 720p: $0.126; 1080p: $0.252 |
| `alibaba/wan-3.0-pro-prime/video-extend` | Wan 3.0 Pro Prime · video-extend | Alibaba | $0.234 / second | 1080p: $0.234; 2k: $0.252; 4k: $0.279 |
| `alibaba/wan-3.0-pro/video-extend` | Wan 3.0 Pro · video-extend | Alibaba | $0.144 / second | 1080p: $0.144; 2k: $0.16; 4k: $0.184 |
| `alibaba/wan-3.0/video-extend` | Wan 3.0 · video-extend | Alibaba | $0.045 / second | 480p: $0.045; 720p: $0.09; 1080p: $0.18 |
| `black-forest-labs/flux-3/video-extend` | FLUX 3 · video-extend | Black Forest Labs | $0.12 / second | quality=draft, resolution=1080p: $0.12; quality=draft, resolution=720p: $0.12; quality=standard, resolution=720p: $0.41; quality=standard, resolution=1080p: $0.53 |
| `bytedance/seedance-2.0-fast/video-extend` | Seedance 2.0 Fast · video-extend | ByteDance | $0.04499712 / second | generate_audio=false, resolution=480p: $0.04499712; generate_audio=true, resolution=480p: $0.04499712; generate_audio=false, resolution=720p: $0.096768; generate_audio=true, resolution=720p: $0.096768 |
| `bytedance/seedance-2.0-mini/video-extend` | Seedance 2.0 Mini · video-extend | ByteDance | $0.0246078 / second | generate_audio=false, resolution=480p: $0.0246078; generate_audio=true, resolution=480p: $0.0246078; enable_web_search=true, generate_audio=false, resolution=480p: $0.036; enable_web_search=true, generate_audio=true, resolution=480p: $0.036; generate_audio=false, resolution=720p: $0.05292; generate_audio=true, resolution=720p: $0.05292 ... |
| `bytedance/seedance-2.0/video-extend` | Seedance 2.0 · video-extend | ByteDance | $0.0735 / second | generate_audio=false, resolution=480p: $0.0735; generate_audio=true, resolution=480p: $0.0735; generate_audio=false, resolution=720p: $0.1596; generate_audio=true, resolution=720p: $0.1596; generate_audio=false, resolution=1080p: $0.3927; generate_audio=true, resolution=1080p: $0.3927 ... |
| `bytedance/seedance-2.5/video-extend` | Seedance 2.5 · video-extend | ByteDance | $0.0738 / second | generate_audio=false, resolution=480p, with_video=true: $0.0738; generate_audio=true, resolution=480p, with_video=true: $0.0738; generate_audio=false, resolution=480p, with_video=false: $0.1234; generate_audio=true, resolution=480p, with_video=false: $0.1234; generate_audio=false, resolution=720p, with_video=true: $0.1659; generate_audio=true, resolution=720p, with_video=true: $0.1659 ... |
| `google/veo-3.1-fast/video-extend` | Veo 3.1 Fast · video-extend | Google | $0.36 / run | 4: $0.36; 6: $0.54; 8: $0.72 |
| `google/veo-3.1-lite/video-extend` | Veo 3.1 Lite · video-extend | Google | $0.18 / run | 4: $0.18; 6: $0.27; 8: $0.36 |
| `google/veo-3.1/video-extend` | Veo 3.1 · video-extend | Google | $1.44 / run | 4: $1.44; 6: $2.16; 8: $2.88 |
| `kling/4.0/video-extend` | Kling 4.0 · video-extend | Kuaishou | $0.1884 / second | 720p: $0.1884; 1080p: $0.282 |
| `lightricks/ltx-2-19b/video-extend` | LTX-2 19B · video-extend | Lightricks | $0.0144 / second | 480p: $0.0144; 720p: $0.0192; 1080p: $0.0288 |
| `minimax/h3-lora/video-extend` | MiniMax H3 LoRA · video-extend | MiniMax | $0.05 / second | 480p: $0.05; 540p: $0.075; 768p: $0.1; 1080p: $0.2 |
| `minimax/h3-max/video-extend` | MiniMax H3 Max · video-extend | MiniMax | $0.056 / second | 480p: $0.056; 768p: $0.0896 |
| `minimax/h3-singularity-lora/video-extend` | MiniMax H3 Singularity LoRA · video-extend | MiniMax | $0.0625 / second | 480p: $0.0625; 540p: $0.09375; 768p: $0.125; 1080p: $0.25 |
| `minimax/h3/video-extend` | MiniMax H3 · video-extend | MiniMax | $0.025 / second | 480p: $0.025; 768p: $0.037; 2k: $0.058 |
| `pixverse/v6/video-extend` | PixVerse V6 · video-extend | PixVerse | $0.023532 / second | generate_audio=false, resolution=360p: $0.023532; generate_audio=false, resolution=540p: $0.032966; generate_audio=true, resolution=360p: $0.032966; generate_audio=false, resolution=720p: $0.0424; generate_audio=true, resolution=540p: $0.0424; generate_audio=true, resolution=720p: $0.056498 ... |
| `vidu/q3-turbo/video-extend` | Vidu Q3 Turbo · video-extend | Vidu | $0.042 / second | 540p: $0.042; 720p: $0.066 |
| `vidu/q4-preview/video-extend` | Vidu Q4 Preview · video-extend | Vidu | $0.045 / second | 540p: $0.045; 720p: $0.095; 1080p: $0.12; 2k: $0.19; 4k: $0.39 |

## Edit, animate and upscale video

| Model ID | Name | Maker | Price (USD) | Tiers |
| --- | --- | --- | --- | --- |
| `alibaba/wan-2.1-lora/video-edit` | Wan 2.1 LoRA · video-edit | Alibaba | $0.24 / run | duration_seconds=5, resolution=480p: $0.24; duration_seconds=10, resolution=480p: $0.36; duration_seconds=5, resolution=720p: $0.36; duration_seconds=10, resolution=720p: $0.54 |
| `alibaba/wan-2.2-animate/character-animation` | Wan 2.2 Animate · character-animation | Alibaba | $0.053 / second | 480p: $0.053; 720p: $0.11 |
| `black-forest-labs/flux-3/upscale` | FLUX 3 · upscale | Black Forest Labs | $0.528 / second | precise: $0.528; creative: $0.7584 |
| `bytedance/omnihuman-2.0/talking-avatar` | OmniHuman 2.0 · talking-avatar | ByteDance | $0.1084 / second | - |
| `bytedance/seedvr2-video/upscale` | SeedVR2 Video · upscale | ByteDance | $0.024 / second | 720p: $0.024; 1080p: $0.048; 2k: $0.072; 4k: $0.096 |
| `comfyui/openjutsu-character-swap/video-edit` | OpenJutsu Character Swap · video-edit | ComfyUI | $0.105 / second | 480p: $0.105; 540p: $0.119; 768p: $0.14; 1080p: $0.28 |
| `comfyui/openjutsu-object-swap/video-edit` | OpenJutsu Object Swap · video-edit | ComfyUI | $0.105 / second | 480p: $0.105; 540p: $0.119; 768p: $0.14; 1080p: $0.28 |
| `kling/2.6/character-animation` | Kling 2.6 · character-animation | Kuaishou | $0.069 / second | 720p: $0.069; 1080p: $0.112 |
| `kling/3.0/character-animation` | Kling 3.0 · character-animation | Kuaishou | $0.1008 / second | 720p: $0.1008; 1080p: $0.1344 |
| `kling/4.0/video-edit` | Kling 4.0 · video-edit | Kuaishou | $0.1128 / second | 720p: $0.1128; 1080p: $0.1692 |
| `kling/avatar-2.0/talking-avatar` | Kling Avatar 2.0 · talking-avatar | Kuaishou | $0.0512 / second | 720p: $0.0512; 1080p: $0.1024 |
| `kling/o3/video-edit` | Kling O3 · video-edit | Kuaishou | $0.126452 / second | 720p: $0.126452; 1080p: $0.16968 |
| `minimax/h3-character-swap/video-edit` | MiniMax H3 Character Swap · video-edit | MiniMax | $0.06 / second | 480p: $0.06; 540p: $0.09; 768p: $0.12; 1080p: $0.24 |
| `minimax/h3-edit/video-edit` | MiniMax H3 Edit · video-edit | MiniMax | $0.03 / second | 480p: $0.03; 540p: $0.045; 768p: $0.066 |
| `popnow/background-remover-video-v1/video-edit` | Video Background Remover · video-edit | PopNow | $0.06 / second | - |
| `popnow/face-enhancer-video-v1/video-edit` | Video Face Enhancer · video-edit | PopNow | $0.012 / second | - |
| `popnow/face-swap-video-v1/video-edit` | Video Face Swap · video-edit | PopNow | $0.026 / second | - |
| `popnow/lip-sync-v1/lip-sync` | Lip Sync · lip-sync | PopNow | $0.012 / second | - |
| `popnow/music-remover-v1/video-edit` | Video Music Remover · video-edit | PopNow | $0.0024 / second | - |
| `popnow/talking-avatar-v1/talking-avatar` | Talking Avatar · talking-avatar | PopNow | $0.018 / second | - |
| `popnow/video-eraser-v1/video-edit` | Video Eraser · video-edit | PopNow | $0.024 / second | - |
| `popnow/video-restorer-v1/video-edit` | Video Restorer · video-edit | PopNow | $0.024 / second | 480p: $0.024; 720p: $0.048; 1080p: $0.12 |
| `popnow/video-translator-v1/video-translate` | Video Translator · video-translate | PopNow | $0.005 / second | - |
| `popnow/video-upscaler-v1/upscale` | Video Upscaler · upscale | PopNow | $0.006 / second | 1080p: $0.006; 720p: $0.006; 2k: $0.012; 4k: $0.024 |
| `topaz/astra/upscale` | Topaz Astra · upscale | Topaz Labs | $0.36 / second | 1080p: $0.36; 720p: $0.36; 4k: $0.6 |
| `topaz/starlight/upscale` | Topaz Starlight · upscale | Topaz Labs | $0.07 / second | preset=fast_2, resolution=1080p: $0.07; preset=fast_2, resolution=720p: $0.07; preset=fast_3, resolution=1080p: $0.138461539; preset=fast_3, resolution=720p: $0.138461539; preset=mini, resolution=1080p: $0.138461539; preset=mini, resolution=720p: $0.138461539 ... |
| `topaz/video-ai/frame-interpolation` | Topaz Video AI · frame-interpolation | Topaz Labs | $0.002 / second | fps=30, preset=aion, resolution=1080p, slow_motion=1: $0.002; fps=30, preset=aion, resolution=2k, slow_motion=1: $0.002; fps=30, preset=aion, resolution=720p, slow_motion=1: $0.002; fps=30, preset=apollo, resolution=1080p, slow_motion=1: $0.002; fps=30, preset=apollo, resolution=2k, slow_motion=1: $0.002; fps=30, preset=apollo, resolution=720p, slow_motion=1: $0.002 ... |
| `topaz/video-ai/upscale` | Topaz Video AI · upscale | Topaz Labs | $0.007058824 / second | preset=artemis_aliasing_moire, resolution=720p: $0.007058824; preset=artemis_hq, resolution=720p: $0.007058824; preset=artemis_lq, resolution=720p: $0.007058824; preset=artemis_medium_halo, resolution=720p: $0.007058824; preset=artemis_mq, resolution=720p: $0.007058824; preset=artemis_strong_halo, resolution=720p: $0.007058824 ... |
| `topaz/video-ai/video-edit` | Topaz Video AI · video-edit | Topaz Labs | $0.004 / second | preset=nyx_fast, resolution=720p: $0.004; preset=deblur, resolution=720p: $0.007058824; preset=hyperion_1, resolution=720p: $0.007058824; preset=nyx, resolution=720p: $0.007058824; preset=nyx_high_fidelity, resolution=1080p: $0.007058824; preset=nyx_high_fidelity, resolution=720p: $0.007058824 ... |
| `veed/dubbing-pro/video-translate` | VEED Dubbing Pro · video-translate | VEED | $0.24 / second | - |
| `veed/dubbing/video-translate` | VEED Dubbing · video-translate | VEED | $0.144 / second | - |
