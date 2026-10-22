# PopNow image models

Snapshot of `GET /api/v1/models` taken 2026-10-18. Prices are in credits (1 credit = $0.001) and are the starting price per unit; the exact amount of one request comes from `popnow.py quote`. The live list is always the source of truth: `popnow.py models --modality image`.

Model IDs follow `<maker>/<model>/<task>`. Read a model's input fields with `popnow.py model <id>`.

## Text to image

| Model ID | Name | Maker | Price (credits) | Tiers |
| --- | --- | --- | --- | --- |
| `alibaba/qwen-image-1.0-lora/text-to-image` | Qwen Image 1.0 LoRA | Alibaba | 30 / image | - |
| `alibaba/qwen-image-2.1-lora/text-to-image` | Qwen Image 2.1 LoRA | Alibaba | 30 / image | 1k: 30; 1.5k: 54; 2k: 102 |
| `alibaba/qwen-image-2.1-pro/text-to-image` | Qwen Image 2.1 Pro | Alibaba | 36 / image | - |
| `alibaba/qwen-image-2.1-turbo/text-to-image` | Qwen Image 2.1 Turbo | Alibaba | 14.4 / image | - |
| `alibaba/qwen-image-2.1/text-to-image` | Qwen Image 2.1 | Alibaba | 24 / image | 1k: 24; 1.5k: 48; 2k: 48 |
| `alibaba/qwen-image-2/text-to-image` | Qwen Image 2 | Alibaba | 35 / image | - |
| `alibaba/qwen-image-2512-lora/text-to-image` | Qwen Image 2512 LoRA | Alibaba | 30 / image | - |
| `alibaba/qwen-image-3.0-pro/text-to-image` | Qwen Image 3.0 Pro | Alibaba | 40 / image | 1k: 40; 2k: 75 |
| `alibaba/qwen-image-3.0/text-to-image` | Qwen Image 3.0 | Alibaba | 30 / image | 1k: 30; 2k: 30 |
| `alibaba/wan-2.1-image-lora/text-to-image` | Wan 2.1 Image LoRA | Alibaba | 30 / image | - |
| `alibaba/wan-2.2-image-lora/text-to-image` | Wan 2.2 Image LoRA | Alibaba | 30 / image | - |
| `alibaba/wan-2.7-pro/text-to-image` | Wan 2.7 Pro | Alibaba | 75 / image | - |
| `alibaba/wan-2.7/text-to-image` | Wan 2.7 | Alibaba | 30 / image | - |
| `alibaba/z-image-base-lora/text-to-image` | Z-Image Base LoRA | Alibaba | 14.4 / image | - |
| `alibaba/z-image-turbo-lora/text-to-image` | Z-Image Turbo LoRA | Alibaba | 12 / image | - |
| `alibaba/z-image-turbo/text-to-image` | Z-Image | Alibaba | 10 / image | default: 10; enable_prompt_expansion=true: 16 |
| `black-forest-labs/flux-1-dev-controlnet-lora/text-to-image` | FLUX.1 Dev ControlNet LoRA | Black Forest Labs | 36 / image | - |
| `black-forest-labs/flux-1-dev-lora/text-to-image` | FLUX.1 Dev LoRA | Black Forest Labs | 18 / image | - |
| `black-forest-labs/flux-1-krea-dev-lora/text-to-image` | FLUX.1 Krea Dev LoRA | Black Forest Labs | 24 / image | - |
| `black-forest-labs/flux-1-schnell-lora/text-to-image` | FLUX.1 Schnell LoRA | Black Forest Labs | 6 / image | - |
| `black-forest-labs/flux-2-dev-lora/text-to-image` | FLUX.2 Dev LoRA | Black Forest Labs | 21.6 / image | - |
| `black-forest-labs/flux-2-dev/text-to-image` | FLUX.2 Dev | Black Forest Labs | 11.6 / image | 1k: 11.6; 2k: 11.6 |
| `black-forest-labs/flux-2-flex/text-to-image` | FLUX.2 Flex | Black Forest Labs | 57.8 / image | 1k: 57.8; 2k: 88.1 |
| `black-forest-labs/flux-2-klein-4b-lora/text-to-image` | FLUX.2 Klein 4B LoRA | Black Forest Labs | 15.6 / image | - |
| `black-forest-labs/flux-2-klein-4b/text-to-image` | FLUX.2 Klein 4B | Black Forest Labs | 9.3 / image | 1k: 9.3; 2k: 9.9 |
| `black-forest-labs/flux-2-klein-9b-lora/text-to-image` | FLUX.2 Klein 9B LoRA | Black Forest Labs | 18 / image | - |
| `black-forest-labs/flux-2-klein-9b/text-to-image` | FLUX.2 Klein 9B | Black Forest Labs | 11 / image | 1k: 11; 2k: 12.2 |
| `black-forest-labs/flux-2-klein-base-4b-lora/text-to-image` | FLUX.2 Klein Base 4B LoRA | Black Forest Labs | 18 / image | - |
| `black-forest-labs/flux-2-klein-base-9b-lora/text-to-image` | FLUX.2 Klein Base 9B LoRA | Black Forest Labs | 24 / image | - |
| `black-forest-labs/flux-2-max/text-to-image` | FLUX.2 Max | Black Forest Labs | 70 / image | 1k: 70; 2k: 88.1 |
| `black-forest-labs/flux-2-pro/text-to-image` | FLUX.2 Pro | Black Forest Labs | 30 / image | 1k: 30; 2k: 39.1 |
| `black-forest-labs/flux-3-klein-base-lora/text-to-image` | FLUX 3 Klein Base LoRA | Black Forest Labs | 42 / image | 1k: 42; 2k: 150 |
| `black-forest-labs/flux-3-klein-base/text-to-image` | FLUX 3 Klein Base | Black Forest Labs | 36 / image | 1k: 36; 2k: 144 |
| `bytedance/seedream-4.0/text-to-image` | Seedream 4.0 | ByteDance | 30 / image | - |
| `bytedance/seedream-5.0-flash/text-to-image` | Seedream 5.0 Flash | ByteDance | 29 / image | - |
| `bytedance/seedream-5.0-lite/text-to-image` | Seedream 5.0 Lite | ByteDance | 34.5 / image | - |
| `bytedance/seedream-5.0-pro/text-to-image` | Seedream 5.0 Pro | ByteDance | 36 / image | 1k: 36; 2k: 72 |
| `circlestone-labs/anima-turbo-lora/text-to-image` | Anima Turbo LoRA | CircleStone Labs | 18 / image | 1k: 18; 1.5k: 36 |
| `circlestone-labs/anima-turbo/text-to-image` | Anima Turbo | CircleStone Labs | 12 / image | 1k: 12; 1.5k: 24 |
| `google/nano-banana-2.1/text-to-image` | Nano Banana 2.1 | Google | 48 / image | 1k: 48; 2k: 72; 4k: 162 |
| `google/nano-banana-2/text-to-image` | Nano Banana 2 | Google | 36 / image | 0.5k: 36; 1k: 53.6; 2k: 80.8; 4k: 120.8 |
| `google/nano-banana-pro/text-to-image` | Nano Banana Pro | Google | 107.2 / image | 1k: 107.2; 2k: 107.2; 4k: 192 |
| `j1b/jib-mix-qwen-image-lora/text-to-image` | Jib Mix Qwen LoRA | J1B | 30 / image | - |
| `j1b/jib-mix-qwen-image/text-to-image` | Jib Mix Qwen | J1B | 24 / image | - |
| `krea/2-large/text-to-image` | Krea 2 Large | Krea | 60 / image | - |
| `krea/2-medium-turbo/text-to-image` | Krea 2 Medium Turbo | Krea | 15 / image | - |
| `krea/2-medium/text-to-image` | Krea 2 Medium | Krea | 30 / image | - |
| `krea/2-turbo-lora/text-to-image` | Krea 2 Turbo LoRA | Krea | 21.6 / image | 1k: 21.6; 2k: 36 |
| `krea/3/text-to-image` | Krea 3 | Krea | 36 / image | - |
| `minimax/h3-image-lora/text-to-image` | MiniMax H3 Image LoRA | MiniMax | 42 / image | 1k: 42; 2k: 90 |
| `neta-art/neta-lumina/text-to-image` | Neta Lumina | Neta.art Lab | 12 / image | - |
| `openai/gpt-image-2.5-flare/text-to-image` | GPT Image 2.5 Flare | OpenAI | 1.82 / image | aspect_ratio=1:3, quality=low, resolution=1k: 1.82; aspect_ratio=3:1, quality=low, resolution=1k: 1.82; aspect_ratio=21:9, quality=low, resolution=1k: 2.44; aspect_ratio=9:21, quality=low, resolution=1k: 2.44; aspect_ratio=1:2, quality=low, resolution=1k: 2.75; aspect_ratio=2:1, quality=low, resolution=1k: 2.75 ... |
| `openai/gpt-image-2.5-sunburst/text-to-image` | GPT Image 2.5 Sunburst | OpenAI | 1.82 / image | aspect_ratio=1:3, quality=low, resolution=1k: 1.82; aspect_ratio=3:1, quality=low, resolution=1k: 1.82; aspect_ratio=21:9, quality=low, resolution=1k: 2.44; aspect_ratio=9:21, quality=low, resolution=1k: 2.44; aspect_ratio=1:2, quality=low, resolution=1k: 2.75; aspect_ratio=2:1, quality=low, resolution=1k: 2.75 ... |
| `openai/gpt-image-2/text-to-image` | GPT Image 2 | OpenAI | 1.82 / image | aspect_ratio=1:3, quality=low, resolution=1k: 1.82; aspect_ratio=3:1, quality=low, resolution=1k: 1.82; aspect_ratio=21:9, quality=low, resolution=1k: 2.44; aspect_ratio=9:21, quality=low, resolution=1k: 2.44; aspect_ratio=1:2, quality=low, resolution=1k: 2.75; aspect_ratio=2:1, quality=low, resolution=1k: 2.75 ... |
| `prefect/pony-xl-lora/text-to-image` | Prefect Pony XL LoRA | Prefect | 24 / image | - |
| `prefect/pony-xl/text-to-image` | Prefect Pony XL | Prefect | 15 / image | - |
| `pruna-ai/p-image-lora/text-to-image` | P-Image LoRA | Pruna AI | 6 / image | - |

## Edit an image (prompt + source images)

| Model ID | Name | Maker | Price (credits) | Tiers |
| --- | --- | --- | --- | --- |
| `alibaba/qwen-image-1.0-lora/edit` | Qwen Image 1.0 LoRA | Alibaba | 30 / image | - |
| `alibaba/qwen-image-2.1-lora/edit` | Qwen Image 2.1 LoRA | Alibaba | 42 / image | 1k: 42; 1.5k: 78; 2k: 150 |
| `alibaba/qwen-image-2.1-pro/edit` | Qwen Image 2.1 Pro | Alibaba | 36 / image | - |
| `alibaba/qwen-image-2.1-turbo/edit` | Qwen Image 2.1 Turbo | Alibaba | 14.4 / image | - |
| `alibaba/qwen-image-2.1/edit` | Qwen Image 2.1 | Alibaba | 36 / image | 1k: 36; 2k: 48; 1.5k: 72 |
| `alibaba/qwen-image-2/edit` | Qwen Image 2 | Alibaba | 35 / image | - |
| `alibaba/qwen-image-2512-lora/edit` | Qwen Image 2512 LoRA | Alibaba | 30 / image | - |
| `alibaba/qwen-image-3.0-pro/edit` | Qwen Image 3.0 Pro | Alibaba | 40 / image | 1k: 40; 2k: 75 |
| `alibaba/qwen-image-3.0/edit` | Qwen Image 3.0 | Alibaba | 30 / image | 1k: 30; 2k: 30 |
| `alibaba/qwen-image-edit-2509-lora/edit` | Qwen Image Edit 2509 LoRA | Alibaba | 30 / image | - |
| `alibaba/wan-2.1-image-lora/edit` | Wan 2.1 Image LoRA | Alibaba | 30 / image | - |
| `alibaba/wan-2.7-pro/edit` | Wan 2.7 Pro | Alibaba | 75 / image | - |
| `alibaba/wan-2.7/edit` | Wan 2.7 | Alibaba | 30 / image | - |
| `alibaba/z-image-base-lora/edit` | Z-Image Base LoRA | Alibaba | 14.4 / image | - |
| `alibaba/z-image-turbo-lora/edit` | Z-Image Turbo LoRA | Alibaba | 12 / image | - |
| `black-forest-labs/flux-1-dev-lora/edit` | FLUX.1 Dev LoRA | Black Forest Labs | 18 / image | - |
| `black-forest-labs/flux-1-fill-dev-lora/edit` | FLUX.1 Fill Dev LoRA | Black Forest Labs | 42 / image | - |
| `black-forest-labs/flux-1-krea-dev-lora/edit` | FLUX.1 Krea Dev LoRA | Black Forest Labs | 24 / image | - |
| `black-forest-labs/flux-1-schnell-lora/edit` | FLUX.1 Schnell LoRA | Black Forest Labs | 6 / image | - |
| `black-forest-labs/flux-2-dev-lora/edit` | FLUX.2 Dev LoRA | Black Forest Labs | 36 / image | - |
| `black-forest-labs/flux-2-dev/edit` | FLUX.2 Dev | Black Forest Labs | 23.1 / image | - |
| `black-forest-labs/flux-2-flex/edit` | FLUX.2 Flex | Black Forest Labs | 115.4 / image | - |
| `black-forest-labs/flux-2-klein-4b-lora/edit` | FLUX.2 Klein 4B LoRA | Black Forest Labs | 20.4 / image | - |
| `black-forest-labs/flux-2-klein-4b/edit` | FLUX.2 Klein 4B | Black Forest Labs | 12.6 / image | - |
| `black-forest-labs/flux-2-klein-9b-lora/edit` | FLUX.2 Klein 9B LoRA | Black Forest Labs | 25.2 / image | - |
| `black-forest-labs/flux-2-klein-9b/edit` | FLUX.2 Klein 9B | Black Forest Labs | 16.3 / image | - |
| `black-forest-labs/flux-2-klein-base-4b-lora/edit` | FLUX.2 Klein Base 4B LoRA | Black Forest Labs | 24 / image | - |
| `black-forest-labs/flux-2-klein-base-9b-lora/edit` | FLUX.2 Klein Base 9B LoRA | Black Forest Labs | 31.2 / image | - |
| `black-forest-labs/flux-2-max/edit` | FLUX.2 Max | Black Forest Labs | 76.1 / image | - |
| `black-forest-labs/flux-2-pro/edit` | FLUX.2 Pro | Black Forest Labs | 57.8 / image | - |
| `black-forest-labs/flux-3-klein-base-lora/edit` | FLUX 3 Klein Base LoRA | Black Forest Labs | 60 / image | 1k: 60; 2k: 222 |
| `black-forest-labs/flux-3-klein-base/edit` | FLUX 3 Klein Base | Black Forest Labs | 54 / image | 1k: 54; 2k: 216 |
| `bytedance/seedream-4.0/edit` | Seedream 4.0 | ByteDance | 30 / image | - |
| `bytedance/seedream-5.0-flash/edit` | Seedream 5.0 Flash | ByteDance | 29 / image | - |
| `bytedance/seedream-5.0-lite/edit` | Seedream 5.0 Lite | ByteDance | 34.5 / image | - |
| `bytedance/seedream-5.0-pro/edit` | Seedream 5.0 Pro | ByteDance | 36 / image | 1k: 36; 2k: 72 |
| `circlestone-labs/anima-turbo-lora/edit` | Anima Turbo LoRA | CircleStone Labs | 18 / image | 1k: 18; 1.5k: 36 |
| `circlestone-labs/anima-turbo/edit` | Anima Turbo | CircleStone Labs | 12 / image | 1k: 12; 1.5k: 24 |
| `google/nano-banana-2.1/edit` | Nano Banana 2.1 | Google | 48 / image | 1k: 48; 2k: 72; 4k: 162 |
| `google/nano-banana-2/edit` | Nano Banana 2 | Google | 36 / image | 0.5k: 36; 1k: 53.6; 2k: 80.8; 4k: 120.8 |
| `google/nano-banana-pro/edit` | Nano Banana Pro | Google | 107.2 / image | 1k: 107.2; 2k: 107.2; 4k: 192 |
| `krea/2-turbo-lora/edit` | Krea 2 Turbo LoRA | Krea | 21.6 / image | 1k: 21.6; 2k: 36 |
| `krea/3/edit` | Krea 3 | Krea | 72 / image | - |
| `minimax/h3-image-lora/edit` | MiniMax H3 Image LoRA | MiniMax | 54 / image | 1k: 54; 2k: 126 |
| `openai/gpt-image-2.5-flare/edit` | GPT Image 2.5 Flare | OpenAI | 1.82 / image | aspect_ratio=1:3, quality=low, resolution=1k: 1.82; aspect_ratio=3:1, quality=low, resolution=1k: 1.82; aspect_ratio=21:9, quality=low, resolution=1k: 2.44; aspect_ratio=9:21, quality=low, resolution=1k: 2.44; aspect_ratio=1:2, quality=low, resolution=1k: 2.75; aspect_ratio=2:1, quality=low, resolution=1k: 2.75 ... |
| `openai/gpt-image-2.5-sunburst/edit` | GPT Image 2.5 Sunburst | OpenAI | 1.82 / image | aspect_ratio=1:3, quality=low, resolution=1k: 1.82; aspect_ratio=3:1, quality=low, resolution=1k: 1.82; aspect_ratio=21:9, quality=low, resolution=1k: 2.44; aspect_ratio=9:21, quality=low, resolution=1k: 2.44; aspect_ratio=1:2, quality=low, resolution=1k: 2.75; aspect_ratio=2:1, quality=low, resolution=1k: 2.75 ... |
| `openai/gpt-image-2/edit` | GPT Image 2 | OpenAI | 1.82 / image | aspect_ratio=1:3, quality=low, resolution=1k: 1.82; aspect_ratio=3:1, quality=low, resolution=1k: 1.82; aspect_ratio=21:9, quality=low, resolution=1k: 2.44; aspect_ratio=9:21, quality=low, resolution=1k: 2.44; aspect_ratio=1:2, quality=low, resolution=1k: 2.75; aspect_ratio=2:1, quality=low, resolution=1k: 2.75 ... |
| `pruna-ai/p-image-lora/edit` | P-Image LoRA | Pruna AI | 12 / image | - |

## One-tap image tools

| Model ID | Name | Maker | Price (credits) | Tiers |
| --- | --- | --- | --- | --- |
| `bytedance/seedream-5.0-flash/layer-decomposition` | Seedream 5.0 Flash | ByteDance | 26 / image | - |
| `bytedance/seedream-5.0-pro/layer-decomposition` | Seedream 5.0 Pro | ByteDance | 42 / image | 1.5k: 42; 1k: 42; 2k: 84; auto: 84 |
| `popnow/anime-to-real-v1/edit` | Anime to Real | PopNow | 30 / image | - |
| `popnow/background-remover-v1/edit` | Background Remover | PopNow | 4.8 / image | - |
| `popnow/camera-angle-changer-v1/edit` | Camera Angle Changer | PopNow | 30 / image | - |
| `popnow/image-expander-v1/edit` | Image Expander | PopNow | 24 / image | - |
| `popnow/image-upscaler-v1/upscale` | Image Upscaler | PopNow | 12 / image | - |
| `popnow/object-eraser-v1/edit` | Object Eraser | PopNow | 30 / image | - |
| `popnow/pose-changer-v1/edit` | Pose Changer | PopNow | 30 / image | - |
| `popnow/relight-v1/edit` | Relight | PopNow | 30 / image | - |
| `popnow/shadow-remover-v1/edit` | Shadow Remover | PopNow | 30 / image | - |
