# PopNow image models

Snapshot of `GET /api/v1/models` taken 2026-10-17. Prices are in credits (1 credit = $0.01) and are the starting price per unit; the exact amount of one request comes from `popnow.py quote`. The live list is always the source of truth: `popnow.py models --modality image`.

Model IDs follow `<maker>/<model>/<task>`. Read a model's input fields with `popnow.py model <id>`.

## Text to image

| Model ID | Name | Maker | Price (credits) | Tiers |
| --- | --- | --- | --- | --- |
| `alibaba/qwen-image-1.0-lora/text-to-image` | Qwen Image 1.0 LoRA | Alibaba | 4.5 / image | - |
| `alibaba/qwen-image-2.1-lora/text-to-image` | Qwen Image 2.1 LoRA | Alibaba | 4.5 / image | 1k: 4.5; 1.5k: 8.1; 2k: 15.3 |
| `alibaba/qwen-image-2.1-pro/text-to-image` | Qwen Image 2.1 Pro | Alibaba | 5.4 / image | - |
| `alibaba/qwen-image-2.1-turbo/text-to-image` | Qwen Image 2.1 Turbo | Alibaba | 2.16 / image | - |
| `alibaba/qwen-image-2.1/text-to-image` | Qwen Image 2.1 | Alibaba | 3.6 / image | 1k: 3.6; 1.5k: 7.2; 2k: 7.2 |
| `alibaba/qwen-image-2/text-to-image` | Qwen Image 2 | Alibaba | 5.25 / image | - |
| `alibaba/qwen-image-2512-lora/text-to-image` | Qwen Image 2512 LoRA | Alibaba | 4.5 / image | - |
| `alibaba/qwen-image-3.0-pro/text-to-image` | Qwen Image 3.0 Pro | Alibaba | 6 / image | 1k: 6; 2k: 11.25 |
| `alibaba/qwen-image-3.0/text-to-image` | Qwen Image 3.0 | Alibaba | 4.5 / image | 1k: 4.5; 2k: 4.5 |
| `alibaba/wan-2.1-image-lora/text-to-image` | Wan 2.1 Image LoRA | Alibaba | 4.5 / image | - |
| `alibaba/wan-2.2-image-lora/text-to-image` | Wan 2.2 Image LoRA | Alibaba | 4.5 / image | - |
| `alibaba/wan-2.7-pro/text-to-image` | Wan 2.7 Pro | Alibaba | 11.25 / image | - |
| `alibaba/wan-2.7/text-to-image` | Wan 2.7 | Alibaba | 4.5 / image | - |
| `alibaba/z-image-base-lora/text-to-image` | Z-Image Base LoRA | Alibaba | 2.16 / image | - |
| `alibaba/z-image-turbo-lora/text-to-image` | Z-Image Turbo LoRA | Alibaba | 1.8 / image | - |
| `alibaba/z-image-turbo/text-to-image` | Z-Image | Alibaba | 1.5 / image | default: 1.5; enable_prompt_expansion=true: 2.4 |
| `black-forest-labs/flux-1-dev-controlnet-lora/text-to-image` | FLUX.1 Dev ControlNet LoRA | Black Forest Labs | 5.4 / image | - |
| `black-forest-labs/flux-1-dev-lora/text-to-image` | FLUX.1 Dev LoRA | Black Forest Labs | 2.7 / image | - |
| `black-forest-labs/flux-1-krea-dev-lora/text-to-image` | FLUX.1 Krea Dev LoRA | Black Forest Labs | 3.6 / image | - |
| `black-forest-labs/flux-1-schnell-lora/text-to-image` | FLUX.1 Schnell LoRA | Black Forest Labs | 0.9 / image | - |
| `black-forest-labs/flux-2-dev-lora/text-to-image` | FLUX.2 Dev LoRA | Black Forest Labs | 3.24 / image | - |
| `black-forest-labs/flux-2-dev/text-to-image` | FLUX.2 Dev | Black Forest Labs | 1.74 / image | 1k: 1.74; 2k: 1.74 |
| `black-forest-labs/flux-2-flex/text-to-image` | FLUX.2 Flex | Black Forest Labs | 8.67 / image | 1k: 8.67; 2k: 13.21 |
| `black-forest-labs/flux-2-klein-4b-lora/text-to-image` | FLUX.2 Klein 4B LoRA | Black Forest Labs | 2.34 / image | - |
| `black-forest-labs/flux-2-klein-4b/text-to-image` | FLUX.2 Klein 4B | Black Forest Labs | 1.39 / image | 1k: 1.39; 2k: 1.49 |
| `black-forest-labs/flux-2-klein-9b-lora/text-to-image` | FLUX.2 Klein 9B LoRA | Black Forest Labs | 2.7 / image | - |
| `black-forest-labs/flux-2-klein-9b/text-to-image` | FLUX.2 Klein 9B | Black Forest Labs | 1.65 / image | 1k: 1.65; 2k: 1.83 |
| `black-forest-labs/flux-2-klein-base-4b-lora/text-to-image` | FLUX.2 Klein Base 4B LoRA | Black Forest Labs | 2.7 / image | - |
| `black-forest-labs/flux-2-klein-base-9b-lora/text-to-image` | FLUX.2 Klein Base 9B LoRA | Black Forest Labs | 3.6 / image | - |
| `black-forest-labs/flux-2-max/text-to-image` | FLUX.2 Max | Black Forest Labs | 10.5 / image | 1k: 10.5; 2k: 13.21 |
| `black-forest-labs/flux-2-pro/text-to-image` | FLUX.2 Pro | Black Forest Labs | 4.5 / image | 1k: 4.5; 2k: 5.87 |
| `black-forest-labs/flux-3-klein-base-lora/text-to-image` | FLUX 3 Klein Base LoRA | Black Forest Labs | 6.3 / image | 1k: 6.3; 2k: 22.5 |
| `black-forest-labs/flux-3-klein-base/text-to-image` | FLUX 3 Klein Base | Black Forest Labs | 5.4 / image | 1k: 5.4; 2k: 21.6 |
| `bytedance/seedream-4.0/text-to-image` | Seedream 4.0 | ByteDance | 4.5 / image | - |
| `bytedance/seedream-5.0-flash/text-to-image` | Seedream 5.0 Flash | ByteDance | 4.35 / image | - |
| `bytedance/seedream-5.0-lite/text-to-image` | Seedream 5.0 Lite | ByteDance | 5.18 / image | - |
| `bytedance/seedream-5.0-pro/text-to-image` | Seedream 5.0 Pro | ByteDance | 5.4 / image | 1k: 5.4; 2k: 10.8 |
| `circlestone-labs/anima-turbo-lora/text-to-image` | Anima Turbo LoRA | CircleStone Labs | 2.7 / image | 1k: 2.7; 1.5k: 5.4 |
| `circlestone-labs/anima-turbo/text-to-image` | Anima Turbo | CircleStone Labs | 1.8 / image | 1k: 1.8; 1.5k: 3.6 |
| `google/nano-banana-2.1/text-to-image` | Nano Banana 2.1 | Google | 7.2 / image | 1k: 7.2; 2k: 10.8; 4k: 24.3 |
| `google/nano-banana-2/text-to-image` | Nano Banana 2 | Google | 5.4 / image | 0.5k: 5.4; 1k: 8.04; 2k: 12.12; 4k: 18.12 |
| `google/nano-banana-pro/text-to-image` | Nano Banana Pro | Google | 16.08 / image | 1k: 16.08; 2k: 16.08; 4k: 28.8 |
| `j1b/jib-mix-qwen-image-lora/text-to-image` | Jib Mix Qwen LoRA | J1B | 4.5 / image | - |
| `j1b/jib-mix-qwen-image/text-to-image` | Jib Mix Qwen | J1B | 3.6 / image | - |
| `krea/2-large/text-to-image` | Krea 2 Large | Krea | 9 / image | - |
| `krea/2-medium-turbo/text-to-image` | Krea 2 Medium Turbo | Krea | 2.25 / image | - |
| `krea/2-medium/text-to-image` | Krea 2 Medium | Krea | 4.5 / image | - |
| `krea/2-turbo-lora/text-to-image` | Krea 2 Turbo LoRA | Krea | 3.24 / image | 1k: 3.24; 2k: 5.4 |
| `krea/3/text-to-image` | Krea 3 | Krea | 5.4 / image | - |
| `minimax/h3-image-lora/text-to-image` | MiniMax H3 Image LoRA | MiniMax | 6.3 / image | 1k: 6.3; 2k: 13.5 |
| `neta-art/neta-lumina/text-to-image` | Neta Lumina | Neta.art Lab | 1.8 / image | - |
| `openai/gpt-image-2.5-flare/text-to-image` | GPT Image 2.5 Flare | OpenAI | 0.27 / image | aspect_ratio=1:3, quality=low, resolution=1k: 0.27; aspect_ratio=3:1, quality=low, resolution=1k: 0.27; aspect_ratio=21:9, quality=low, resolution=1k: 0.37; aspect_ratio=9:21, quality=low, resolution=1k: 0.37; aspect_ratio=1:2, quality=low, resolution=1k: 0.41; aspect_ratio=2:1, quality=low, resolution=1k: 0.41 ... |
| `openai/gpt-image-2.5-sunburst/text-to-image` | GPT Image 2.5 Sunburst | OpenAI | 0.27 / image | aspect_ratio=1:3, quality=low, resolution=1k: 0.27; aspect_ratio=3:1, quality=low, resolution=1k: 0.27; aspect_ratio=21:9, quality=low, resolution=1k: 0.37; aspect_ratio=9:21, quality=low, resolution=1k: 0.37; aspect_ratio=1:2, quality=low, resolution=1k: 0.41; aspect_ratio=2:1, quality=low, resolution=1k: 0.41 ... |
| `openai/gpt-image-2/text-to-image` | GPT Image 2 | OpenAI | 0.27 / image | aspect_ratio=1:3, quality=low, resolution=1k: 0.27; aspect_ratio=3:1, quality=low, resolution=1k: 0.27; aspect_ratio=21:9, quality=low, resolution=1k: 0.37; aspect_ratio=9:21, quality=low, resolution=1k: 0.37; aspect_ratio=1:2, quality=low, resolution=1k: 0.41; aspect_ratio=2:1, quality=low, resolution=1k: 0.41 ... |
| `prefect/pony-xl-lora/text-to-image` | Prefect Pony XL LoRA | Prefect | 3.6 / image | - |
| `prefect/pony-xl/text-to-image` | Prefect Pony XL | Prefect | 2.25 / image | - |
| `pruna-ai/p-image-lora/text-to-image` | P-Image LoRA | Pruna AI | 0.9 / image | - |

## Edit an image (prompt + source images)

| Model ID | Name | Maker | Price (credits) | Tiers |
| --- | --- | --- | --- | --- |
| `alibaba/qwen-image-1.0-lora/edit` | Qwen Image 1.0 LoRA | Alibaba | 4.5 / image | - |
| `alibaba/qwen-image-2.1-lora/edit` | Qwen Image 2.1 LoRA | Alibaba | 6.3 / image | 1k: 6.3; 1.5k: 11.7; 2k: 22.5 |
| `alibaba/qwen-image-2.1-pro/edit` | Qwen Image 2.1 Pro | Alibaba | 5.4 / image | - |
| `alibaba/qwen-image-2.1-turbo/edit` | Qwen Image 2.1 Turbo | Alibaba | 2.16 / image | - |
| `alibaba/qwen-image-2.1/edit` | Qwen Image 2.1 | Alibaba | 5.4 / image | 1k: 5.4; 2k: 7.2; 1.5k: 10.8 |
| `alibaba/qwen-image-2/edit` | Qwen Image 2 | Alibaba | 5.25 / image | - |
| `alibaba/qwen-image-2512-lora/edit` | Qwen Image 2512 LoRA | Alibaba | 4.5 / image | - |
| `alibaba/qwen-image-3.0-pro/edit` | Qwen Image 3.0 Pro | Alibaba | 6 / image | 1k: 6; 2k: 11.25 |
| `alibaba/qwen-image-3.0/edit` | Qwen Image 3.0 | Alibaba | 4.5 / image | 1k: 4.5; 2k: 4.5 |
| `alibaba/qwen-image-edit-2509-lora/edit` | Qwen Image Edit 2509 LoRA | Alibaba | 4.5 / image | - |
| `alibaba/wan-2.1-image-lora/edit` | Wan 2.1 Image LoRA | Alibaba | 4.5 / image | - |
| `alibaba/wan-2.7-pro/edit` | Wan 2.7 Pro | Alibaba | 11.25 / image | - |
| `alibaba/wan-2.7/edit` | Wan 2.7 | Alibaba | 4.5 / image | - |
| `alibaba/z-image-base-lora/edit` | Z-Image Base LoRA | Alibaba | 2.16 / image | - |
| `alibaba/z-image-turbo-lora/edit` | Z-Image Turbo LoRA | Alibaba | 1.8 / image | - |
| `black-forest-labs/flux-1-dev-lora/edit` | FLUX.1 Dev LoRA | Black Forest Labs | 2.7 / image | - |
| `black-forest-labs/flux-1-fill-dev-lora/edit` | FLUX.1 Fill Dev LoRA | Black Forest Labs | 6.3 / image | - |
| `black-forest-labs/flux-1-krea-dev-lora/edit` | FLUX.1 Krea Dev LoRA | Black Forest Labs | 3.6 / image | - |
| `black-forest-labs/flux-1-schnell-lora/edit` | FLUX.1 Schnell LoRA | Black Forest Labs | 0.9 / image | - |
| `black-forest-labs/flux-2-dev-lora/edit` | FLUX.2 Dev LoRA | Black Forest Labs | 5.4 / image | - |
| `black-forest-labs/flux-2-dev/edit` | FLUX.2 Dev | Black Forest Labs | 3.47 / image | - |
| `black-forest-labs/flux-2-flex/edit` | FLUX.2 Flex | Black Forest Labs | 17.31 / image | - |
| `black-forest-labs/flux-2-klein-4b-lora/edit` | FLUX.2 Klein 4B LoRA | Black Forest Labs | 3.06 / image | - |
| `black-forest-labs/flux-2-klein-4b/edit` | FLUX.2 Klein 4B | Black Forest Labs | 1.89 / image | - |
| `black-forest-labs/flux-2-klein-9b-lora/edit` | FLUX.2 Klein 9B LoRA | Black Forest Labs | 3.78 / image | - |
| `black-forest-labs/flux-2-klein-9b/edit` | FLUX.2 Klein 9B | Black Forest Labs | 2.44 / image | - |
| `black-forest-labs/flux-2-klein-base-4b-lora/edit` | FLUX.2 Klein Base 4B LoRA | Black Forest Labs | 3.6 / image | - |
| `black-forest-labs/flux-2-klein-base-9b-lora/edit` | FLUX.2 Klein Base 9B LoRA | Black Forest Labs | 4.68 / image | - |
| `black-forest-labs/flux-2-max/edit` | FLUX.2 Max | Black Forest Labs | 11.42 / image | - |
| `black-forest-labs/flux-2-pro/edit` | FLUX.2 Pro | Black Forest Labs | 8.67 / image | - |
| `black-forest-labs/flux-3-klein-base-lora/edit` | FLUX 3 Klein Base LoRA | Black Forest Labs | 9 / image | 1k: 9; 2k: 33.3 |
| `black-forest-labs/flux-3-klein-base/edit` | FLUX 3 Klein Base | Black Forest Labs | 8.1 / image | 1k: 8.1; 2k: 32.4 |
| `bytedance/seedream-4.0/edit` | Seedream 4.0 | ByteDance | 4.5 / image | - |
| `bytedance/seedream-5.0-flash/edit` | Seedream 5.0 Flash | ByteDance | 4.35 / image | - |
| `bytedance/seedream-5.0-lite/edit` | Seedream 5.0 Lite | ByteDance | 5.18 / image | - |
| `bytedance/seedream-5.0-pro/edit` | Seedream 5.0 Pro | ByteDance | 5.4 / image | 1k: 5.4; 2k: 10.8 |
| `circlestone-labs/anima-turbo-lora/edit` | Anima Turbo LoRA | CircleStone Labs | 2.7 / image | 1k: 2.7; 1.5k: 5.4 |
| `circlestone-labs/anima-turbo/edit` | Anima Turbo | CircleStone Labs | 1.8 / image | 1k: 1.8; 1.5k: 3.6 |
| `google/nano-banana-2.1/edit` | Nano Banana 2.1 | Google | 7.2 / image | 1k: 7.2; 2k: 10.8; 4k: 24.3 |
| `google/nano-banana-2/edit` | Nano Banana 2 | Google | 5.4 / image | 0.5k: 5.4; 1k: 8.04; 2k: 12.12; 4k: 18.12 |
| `google/nano-banana-pro/edit` | Nano Banana Pro | Google | 16.08 / image | 1k: 16.08; 2k: 16.08; 4k: 28.8 |
| `krea/2-turbo-lora/edit` | Krea 2 Turbo LoRA | Krea | 3.24 / image | 1k: 3.24; 2k: 5.4 |
| `krea/3/edit` | Krea 3 | Krea | 10.8 / image | - |
| `minimax/h3-image-lora/edit` | MiniMax H3 Image LoRA | MiniMax | 8.1 / image | 1k: 8.1; 2k: 18.9 |
| `openai/gpt-image-2.5-flare/edit` | GPT Image 2.5 Flare | OpenAI | 0.27 / image | aspect_ratio=1:3, quality=low, resolution=1k: 0.27; aspect_ratio=3:1, quality=low, resolution=1k: 0.27; aspect_ratio=21:9, quality=low, resolution=1k: 0.37; aspect_ratio=9:21, quality=low, resolution=1k: 0.37; aspect_ratio=1:2, quality=low, resolution=1k: 0.41; aspect_ratio=2:1, quality=low, resolution=1k: 0.41 ... |
| `openai/gpt-image-2.5-sunburst/edit` | GPT Image 2.5 Sunburst | OpenAI | 0.27 / image | aspect_ratio=1:3, quality=low, resolution=1k: 0.27; aspect_ratio=3:1, quality=low, resolution=1k: 0.27; aspect_ratio=21:9, quality=low, resolution=1k: 0.37; aspect_ratio=9:21, quality=low, resolution=1k: 0.37; aspect_ratio=1:2, quality=low, resolution=1k: 0.41; aspect_ratio=2:1, quality=low, resolution=1k: 0.41 ... |
| `openai/gpt-image-2/edit` | GPT Image 2 | OpenAI | 0.27 / image | aspect_ratio=1:3, quality=low, resolution=1k: 0.27; aspect_ratio=3:1, quality=low, resolution=1k: 0.27; aspect_ratio=21:9, quality=low, resolution=1k: 0.37; aspect_ratio=9:21, quality=low, resolution=1k: 0.37; aspect_ratio=1:2, quality=low, resolution=1k: 0.41; aspect_ratio=2:1, quality=low, resolution=1k: 0.41 ... |
| `pruna-ai/p-image-lora/edit` | P-Image LoRA | Pruna AI | 1.8 / image | - |

## One-tap image tools

| Model ID | Name | Maker | Price (credits) | Tiers |
| --- | --- | --- | --- | --- |
| `bytedance/seedream-5.0-flash/layer-decomposition` | Seedream 5.0 Flash | ByteDance | 3.9 / image | - |
| `bytedance/seedream-5.0-pro/layer-decomposition` | Seedream 5.0 Pro | ByteDance | 6.3 / image | 1.5k: 6.3; 1k: 6.3; 2k: 12.6; auto: 12.6 |
| `popnow/anime-to-real-v1/edit` | Anime to Real | PopNow | 4.5 / image | - |
| `popnow/background-remover-v1/edit` | Background Remover | PopNow | 0.72 / image | - |
| `popnow/camera-angle-changer-v1/edit` | Camera Angle Changer | PopNow | 4.5 / image | - |
| `popnow/image-expander-v1/edit` | Image Expander | PopNow | 3.6 / image | - |
| `popnow/image-upscaler-v1/upscale` | Image Upscaler | PopNow | 1.8 / image | - |
| `popnow/object-eraser-v1/edit` | Object Eraser | PopNow | 4.5 / image | - |
| `popnow/pose-changer-v1/edit` | Pose Changer | PopNow | 4.5 / image | - |
| `popnow/relight-v1/edit` | Relight | PopNow | 4.5 / image | - |
| `popnow/shadow-remover-v1/edit` | Shadow Remover | PopNow | 4.5 / image | - |
