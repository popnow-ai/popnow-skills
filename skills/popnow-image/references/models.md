# PopNow image models

Snapshot of `GET /api/v1/models` taken 2026-11-03. Prices are in USD, paid from the separate API balance, and are the starting price per unit; the exact amount of one request comes from `popnow.py quote`. The live list is always the source of truth: `popnow.py models --modality image`.

Model IDs follow `<maker>/<model>/<task>`. Read a model's input fields with `popnow.py model <id>`.

## Text to image

| Model ID | Name | Maker | Price (USD) | Tiers |
| --- | --- | --- | --- | --- |
| `alibaba/qwen-image-1.0-lora/text-to-image` | Qwen Image 1.0 LoRA · text-to-image | Alibaba | $0.03 / image | - |
| `alibaba/qwen-image-2.1-lora/text-to-image` | Qwen Image 2.1 LoRA · text-to-image | Alibaba | $0.03 / image | 1k: $0.03; 1.5k: $0.054; 2k: $0.102 |
| `alibaba/qwen-image-2.1-pro/text-to-image` | Qwen Image 2.1 Pro · text-to-image | Alibaba | $0.036 / image | - |
| `alibaba/qwen-image-2.1-turbo/text-to-image` | Qwen Image 2.1 Turbo · text-to-image | Alibaba | $0.0144 / image | - |
| `alibaba/qwen-image-2.1/text-to-image` | Qwen Image 2.1 · text-to-image | Alibaba | $0.024 / image | 1k: $0.024; 1.5k: $0.048; 2k: $0.048 |
| `alibaba/qwen-image-2/text-to-image` | Qwen Image 2 · text-to-image | Alibaba | $0.035 / image | - |
| `alibaba/qwen-image-2512-lora/text-to-image` | Qwen Image 2512 LoRA · text-to-image | Alibaba | $0.03 / image | - |
| `alibaba/qwen-image-3.0-pro/text-to-image` | Qwen Image 3.0 Pro · text-to-image | Alibaba | $0.04 / image | 1k: $0.04; 2k: $0.075 |
| `alibaba/qwen-image-3.0/text-to-image` | Qwen Image 3.0 · text-to-image | Alibaba | $0.03 / image | 1k: $0.03; 2k: $0.03 |
| `alibaba/wan-2.1-image-lora/text-to-image` | Wan 2.1 Image LoRA · text-to-image | Alibaba | $0.03 / image | - |
| `alibaba/wan-2.2-image-lora/text-to-image` | Wan 2.2 Image LoRA · text-to-image | Alibaba | $0.03 / image | - |
| `alibaba/wan-2.7-pro/text-to-image` | Wan 2.7 Pro · text-to-image | Alibaba | $0.075 / image | - |
| `alibaba/wan-2.7/text-to-image` | Wan 2.7 · text-to-image | Alibaba | $0.03 / image | - |
| `alibaba/z-image-base-lora/text-to-image` | Z-Image Base LoRA · text-to-image | Alibaba | $0.0144 / image | - |
| `alibaba/z-image-turbo-lora/text-to-image` | Z-Image Turbo LoRA · text-to-image | Alibaba | $0.012 / image | - |
| `alibaba/z-image-turbo/text-to-image` | Z-Image · text-to-image | Alibaba | $0.01 / image | default: $0.01; enable_prompt_expansion=true: $0.016 |
| `black-forest-labs/flux-1-dev-controlnet-lora/text-to-image` | FLUX.1 Dev ControlNet LoRA · text-to-image | Black Forest Labs | $0.036 / image | - |
| `black-forest-labs/flux-1-dev-lora/text-to-image` | FLUX.1 Dev LoRA · text-to-image | Black Forest Labs | $0.018 / image | - |
| `black-forest-labs/flux-1-krea-dev-lora/text-to-image` | FLUX.1 Krea Dev LoRA · text-to-image | Black Forest Labs | $0.024 / image | - |
| `black-forest-labs/flux-1-schnell-lora/text-to-image` | FLUX.1 Schnell LoRA · text-to-image | Black Forest Labs | $0.006 / image | - |
| `black-forest-labs/flux-2-dev-lora/text-to-image` | FLUX.2 Dev LoRA · text-to-image | Black Forest Labs | $0.0216 / image | - |
| `black-forest-labs/flux-2-dev/text-to-image` | FLUX.2 Dev · text-to-image | Black Forest Labs | $0.0116 / image | 1k: $0.0116; 2k: $0.0116 |
| `black-forest-labs/flux-2-flex/text-to-image` | FLUX.2 Flex · text-to-image | Black Forest Labs | $0.0578 / image | 1k: $0.0578; 2k: $0.0881 |
| `black-forest-labs/flux-2-klein-4b-lora/text-to-image` | FLUX.2 Klein 4B LoRA · text-to-image | Black Forest Labs | $0.0156 / image | - |
| `black-forest-labs/flux-2-klein-4b/text-to-image` | FLUX.2 Klein 4B · text-to-image | Black Forest Labs | $0.0093 / image | 1k: $0.0093; 2k: $0.0099 |
| `black-forest-labs/flux-2-klein-9b-lora/text-to-image` | FLUX.2 Klein 9B LoRA · text-to-image | Black Forest Labs | $0.018 / image | - |
| `black-forest-labs/flux-2-klein-9b/text-to-image` | FLUX.2 Klein 9B · text-to-image | Black Forest Labs | $0.011 / image | 1k: $0.011; 2k: $0.0122 |
| `black-forest-labs/flux-2-klein-base-4b-lora/text-to-image` | FLUX.2 Klein Base 4B LoRA · text-to-image | Black Forest Labs | $0.018 / image | - |
| `black-forest-labs/flux-2-klein-base-9b-lora/text-to-image` | FLUX.2 Klein Base 9B LoRA · text-to-image | Black Forest Labs | $0.024 / image | - |
| `black-forest-labs/flux-2-max/text-to-image` | FLUX.2 Max · text-to-image | Black Forest Labs | $0.07 / image | 1k: $0.07; 2k: $0.0881 |
| `black-forest-labs/flux-2-pro/text-to-image` | FLUX.2 Pro · text-to-image | Black Forest Labs | $0.03 / image | 1k: $0.03; 2k: $0.0391 |
| `black-forest-labs/flux-3-klein-base-lora/text-to-image` | FLUX 3 Klein Base LoRA · text-to-image | Black Forest Labs | $0.042 / image | 1k: $0.042; 2k: $0.15 |
| `black-forest-labs/flux-3-klein-base/text-to-image` | FLUX 3 Klein Base · text-to-image | Black Forest Labs | $0.036 / image | 1k: $0.036; 2k: $0.144 |
| `bytedance/seedream-4.0/text-to-image` | Seedream 4.0 · text-to-image | ByteDance | $0.0318 / image | - |
| `bytedance/seedream-4.5/text-to-image` | Seedream 4.5 · text-to-image | ByteDance | $0.04 / image | - |
| `bytedance/seedream-5.0-flash/text-to-image` | Seedream 5.0 Flash · text-to-image | ByteDance | $0.029 / image | - |
| `bytedance/seedream-5.0-lite/text-to-image` | Seedream 5.0 Lite · text-to-image | ByteDance | $0.0345 / image | - |
| `bytedance/seedream-5.0-pro/text-to-image` | Seedream 5.0 Pro · text-to-image | ByteDance | $0.036 / image | 1k: $0.036; 1.5k: $0.04; 2k: $0.072 |
| `circlestone-labs/anima-turbo-lora/text-to-image` | Anima Turbo LoRA · text-to-image | CircleStone Labs | $0.018 / image | 1k: $0.018; 1.5k: $0.036 |
| `circlestone-labs/anima-turbo/text-to-image` | Anima Turbo · text-to-image | CircleStone Labs | $0.012 / image | 1k: $0.012; 1.5k: $0.024 |
| `google/nano-banana-2.1/text-to-image` | Nano Banana 2.1 · text-to-image | Google | $0.048 / image | 1k: $0.048; 2k: $0.072; 4k: $0.162 |
| `google/nano-banana-2/text-to-image` | Nano Banana 2 · text-to-image | Google | $0.036 / image | 0.5k: $0.036; 1k: $0.0536; 2k: $0.0808; 4k: $0.1208 |
| `google/nano-banana-pro/text-to-image` | Nano Banana Pro · text-to-image | Google | $0.1072 / image | 1k: $0.1072; 2k: $0.1072; 4k: $0.192 |
| `ideogram/vector-1/text-to-image` | Ideogram Vector 1.0 · text-to-image | Ideogram | $0.174 / image | quality=low, with_references=false: $0.174; quality=low, with_references=true: $0.174; quality=medium, with_references=false: $0.216; quality=medium, with_references=true: $0.216; quality=high, with_references=false: $0.264; quality=high, with_references=true: $0.432 |
| `j1b/jib-mix-qwen-image-lora/text-to-image` | Jib Mix Qwen LoRA · text-to-image | J1B | $0.03 / image | - |
| `j1b/jib-mix-qwen-image/text-to-image` | Jib Mix Qwen · text-to-image | J1B | $0.024 / image | - |
| `krea/2-large/text-to-image` | Krea 2 Large · text-to-image | Krea | $0.06 / image | - |
| `krea/2-medium-turbo/text-to-image` | Krea 2 Medium Turbo · text-to-image | Krea | $0.015 / image | - |
| `krea/2-medium/text-to-image` | Krea 2 Medium · text-to-image | Krea | $0.03 / image | - |
| `krea/2-turbo-lora/text-to-image` | Krea 2 Turbo LoRA · text-to-image | Krea | $0.0216 / image | 1k: $0.0216; 2k: $0.036 |
| `krea/3/text-to-image` | Krea 3 · text-to-image | Krea | $0.036 / image | - |
| `minimax/h3-image-lora/text-to-image` | MiniMax H3 Image LoRA · text-to-image | MiniMax | $0.042 / image | 1k: $0.042; 2k: $0.09 |
| `neta-art/neta-lumina/text-to-image` | Neta Lumina · text-to-image | Neta.art Lab | $0.012 / image | - |
| `openai/gpt-image-2.5-flare/text-to-image` | GPT Image 2.5 Flare · text-to-image | OpenAI | $0.001816 / image | aspect_ratio=1:3, quality=low, resolution=1k: $0.001816; aspect_ratio=3:1, quality=low, resolution=1k: $0.001816; aspect_ratio=21:9, quality=low, resolution=1k: $0.00244; aspect_ratio=9:21, quality=low, resolution=1k: $0.00244; aspect_ratio=1:2, quality=low, resolution=1k: $0.002752; aspect_ratio=2:1, quality=low, resolution=1k: $0.002752 ... |
| `openai/gpt-image-2.5-sunburst/text-to-image` | GPT Image 2.5 Sunburst · text-to-image | OpenAI | $0.001816 / image | aspect_ratio=1:3, quality=low, resolution=1k: $0.001816; aspect_ratio=3:1, quality=low, resolution=1k: $0.001816; aspect_ratio=21:9, quality=low, resolution=1k: $0.00244; aspect_ratio=9:21, quality=low, resolution=1k: $0.00244; aspect_ratio=1:2, quality=low, resolution=1k: $0.002752; aspect_ratio=2:1, quality=low, resolution=1k: $0.002752 ... |
| `openai/gpt-image-2/text-to-image` | GPT Image 2 · text-to-image | OpenAI | $0.001816 / image | aspect_ratio=1:3, quality=low, resolution=1k: $0.001816; aspect_ratio=3:1, quality=low, resolution=1k: $0.001816; aspect_ratio=21:9, quality=low, resolution=1k: $0.00244; aspect_ratio=9:21, quality=low, resolution=1k: $0.00244; aspect_ratio=1:2, quality=low, resolution=1k: $0.002752; aspect_ratio=2:1, quality=low, resolution=1k: $0.002752 ... |
| `prefect/pony-xl-lora/text-to-image` | Prefect Pony XL LoRA · text-to-image | Prefect | $0.024 / image | - |
| `prefect/pony-xl/text-to-image` | Prefect Pony XL · text-to-image | Prefect | $0.015 / image | - |
| `pruna-ai/p-image-lora/text-to-image` | P-Image LoRA · text-to-image | Pruna AI | $0.006 / image | - |
| `recraft/20b-svg/text-to-image` | Recraft 20B SVG · text-to-image | Recraft | $0.0528 / image | - |
| `recraft/v4-vector/text-to-image` | Recraft V4 Vector · text-to-image | Recraft | $0.096 / image | - |

## Edit an image (prompt + source images)

| Model ID | Name | Maker | Price (USD) | Tiers |
| --- | --- | --- | --- | --- |
| `alibaba/qwen-image-1.0-lora/edit` | Qwen Image 1.0 LoRA · image-to-image | Alibaba | $0.03 / image | - |
| `alibaba/qwen-image-2.1-lora/edit` | Qwen Image 2.1 LoRA · image-to-image | Alibaba | $0.042 / image | 1k: $0.042; 1.5k: $0.078; 2k: $0.15 |
| `alibaba/qwen-image-2.1-pro/edit` | Qwen Image 2.1 Pro · image-to-image | Alibaba | $0.036 / image | - |
| `alibaba/qwen-image-2.1-turbo/edit` | Qwen Image 2.1 Turbo · image-to-image | Alibaba | $0.0144 / image | - |
| `alibaba/qwen-image-2.1/edit` | Qwen Image 2.1 · image-to-image | Alibaba | $0.036 / image | 1k: $0.036; 2k: $0.048; 1.5k: $0.072 |
| `alibaba/qwen-image-2/edit` | Qwen Image 2 · image-to-image | Alibaba | $0.035 / image | - |
| `alibaba/qwen-image-2512-lora/edit` | Qwen Image 2512 LoRA · image-to-image | Alibaba | $0.03 / image | - |
| `alibaba/qwen-image-3.0-pro/edit` | Qwen Image 3.0 Pro · image-to-image | Alibaba | $0.04 / image | 1k: $0.04; 2k: $0.075 |
| `alibaba/qwen-image-3.0/edit` | Qwen Image 3.0 · image-to-image | Alibaba | $0.03 / image | 1k: $0.03; 2k: $0.03 |
| `alibaba/qwen-image-edit-2509-lora/edit` | Qwen Image Edit 2509 LoRA · image-to-image | Alibaba | $0.03 / image | - |
| `alibaba/wan-2.1-image-lora/edit` | Wan 2.1 Image LoRA · image-to-image | Alibaba | $0.03 / image | - |
| `alibaba/wan-2.7-pro/edit` | Wan 2.7 Pro · image-to-image | Alibaba | $0.075 / image | - |
| `alibaba/wan-2.7/edit` | Wan 2.7 · image-to-image | Alibaba | $0.03 / image | - |
| `alibaba/z-image-base-lora/edit` | Z-Image Base LoRA · image-to-image | Alibaba | $0.0144 / image | - |
| `alibaba/z-image-turbo-lora/edit` | Z-Image Turbo LoRA · image-to-image | Alibaba | $0.012 / image | - |
| `black-forest-labs/flux-1-dev-lora/edit` | FLUX.1 Dev LoRA · image-to-image | Black Forest Labs | $0.018 / image | - |
| `black-forest-labs/flux-1-fill-dev-lora/edit` | FLUX.1 Fill Dev LoRA · image-to-image | Black Forest Labs | $0.042 / image | - |
| `black-forest-labs/flux-1-krea-dev-lora/edit` | FLUX.1 Krea Dev LoRA · image-to-image | Black Forest Labs | $0.024 / image | - |
| `black-forest-labs/flux-1-schnell-lora/edit` | FLUX.1 Schnell LoRA · image-to-image | Black Forest Labs | $0.006 / image | - |
| `black-forest-labs/flux-2-dev-lora/edit` | FLUX.2 Dev LoRA · image-to-image | Black Forest Labs | $0.036 / image | - |
| `black-forest-labs/flux-2-dev/edit` | FLUX.2 Dev · image-to-image | Black Forest Labs | $0.0231 / image | - |
| `black-forest-labs/flux-2-flex/edit` | FLUX.2 Flex · image-to-image | Black Forest Labs | $0.1154 / image | - |
| `black-forest-labs/flux-2-klein-4b-lora/edit` | FLUX.2 Klein 4B LoRA · image-to-image | Black Forest Labs | $0.0204 / image | - |
| `black-forest-labs/flux-2-klein-4b/edit` | FLUX.2 Klein 4B · image-to-image | Black Forest Labs | $0.0126 / image | - |
| `black-forest-labs/flux-2-klein-9b-lora/edit` | FLUX.2 Klein 9B LoRA · image-to-image | Black Forest Labs | $0.0252 / image | - |
| `black-forest-labs/flux-2-klein-9b/edit` | FLUX.2 Klein 9B · image-to-image | Black Forest Labs | $0.0163 / image | - |
| `black-forest-labs/flux-2-klein-base-4b-lora/edit` | FLUX.2 Klein Base 4B LoRA · image-to-image | Black Forest Labs | $0.024 / image | - |
| `black-forest-labs/flux-2-klein-base-9b-lora/edit` | FLUX.2 Klein Base 9B LoRA · image-to-image | Black Forest Labs | $0.0312 / image | - |
| `black-forest-labs/flux-2-max/edit` | FLUX.2 Max · image-to-image | Black Forest Labs | $0.0761 / image | - |
| `black-forest-labs/flux-2-pro/edit` | FLUX.2 Pro · image-to-image | Black Forest Labs | $0.0578 / image | - |
| `black-forest-labs/flux-3-klein-base-lora/edit` | FLUX 3 Klein Base LoRA · image-to-image | Black Forest Labs | $0.06 / image | 1k: $0.06; 2k: $0.222 |
| `black-forest-labs/flux-3-klein-base/edit` | FLUX 3 Klein Base · image-to-image | Black Forest Labs | $0.054 / image | 1k: $0.054; 2k: $0.216 |
| `bytedance/seedream-4.0/edit` | Seedream 4.0 · image-to-image | ByteDance | $0.0318 / image | - |
| `bytedance/seedream-4.5/edit` | Seedream 4.5 · image-to-image | ByteDance | $0.04 / image | - |
| `bytedance/seedream-5.0-flash/edit` | Seedream 5.0 Flash · image-to-image | ByteDance | $0.029 / image | - |
| `bytedance/seedream-5.0-lite/edit` | Seedream 5.0 Lite · image-to-image | ByteDance | $0.0345 / image | - |
| `bytedance/seedream-5.0-pro/edit` | Seedream 5.0 Pro · image-to-image | ByteDance | $0.036 / image | 1k: $0.036; 1.5k: $0.04; 2k: $0.072 |
| `circlestone-labs/anima-turbo-lora/edit` | Anima Turbo LoRA · image-to-image | CircleStone Labs | $0.018 / image | 1k: $0.018; 1.5k: $0.036 |
| `circlestone-labs/anima-turbo/edit` | Anima Turbo · image-to-image | CircleStone Labs | $0.012 / image | 1k: $0.012; 1.5k: $0.024 |
| `google/nano-banana-2.1/edit` | Nano Banana 2.1 · image-to-image | Google | $0.048 / image | 1k: $0.048; 2k: $0.072; 4k: $0.162 |
| `google/nano-banana-2/edit` | Nano Banana 2 · image-to-image | Google | $0.036 / image | 0.5k: $0.036; 1k: $0.0536; 2k: $0.0808; 4k: $0.1208 |
| `google/nano-banana-pro/edit` | Nano Banana Pro · image-to-image | Google | $0.1072 / image | 1k: $0.1072; 2k: $0.1072; 4k: $0.192 |
| `krea/2-turbo-lora/edit` | Krea 2 Turbo LoRA · image-to-image | Krea | $0.0216 / image | 1k: $0.0216; 2k: $0.036 |
| `krea/3/edit` | Krea 3 · image-to-image | Krea | $0.072 / image | - |
| `minimax/h3-image-lora/edit` | MiniMax H3 Image LoRA · image-to-image | MiniMax | $0.054 / image | 1k: $0.054; 2k: $0.126 |
| `openai/gpt-image-2.5-flare/edit` | GPT Image 2.5 Flare · image-to-image | OpenAI | $0.001816 / image | aspect_ratio=1:3, quality=low, resolution=1k: $0.001816; aspect_ratio=3:1, quality=low, resolution=1k: $0.001816; aspect_ratio=21:9, quality=low, resolution=1k: $0.00244; aspect_ratio=9:21, quality=low, resolution=1k: $0.00244; aspect_ratio=1:2, quality=low, resolution=1k: $0.002752; aspect_ratio=2:1, quality=low, resolution=1k: $0.002752 ... |
| `openai/gpt-image-2.5-sunburst/edit` | GPT Image 2.5 Sunburst · image-to-image | OpenAI | $0.001816 / image | aspect_ratio=1:3, quality=low, resolution=1k: $0.001816; aspect_ratio=3:1, quality=low, resolution=1k: $0.001816; aspect_ratio=21:9, quality=low, resolution=1k: $0.00244; aspect_ratio=9:21, quality=low, resolution=1k: $0.00244; aspect_ratio=1:2, quality=low, resolution=1k: $0.002752; aspect_ratio=2:1, quality=low, resolution=1k: $0.002752 ... |
| `openai/gpt-image-2/edit` | GPT Image 2 · image-to-image | OpenAI | $0.001816 / image | aspect_ratio=1:3, quality=low, resolution=1k: $0.001816; aspect_ratio=3:1, quality=low, resolution=1k: $0.001816; aspect_ratio=21:9, quality=low, resolution=1k: $0.00244; aspect_ratio=9:21, quality=low, resolution=1k: $0.00244; aspect_ratio=1:2, quality=low, resolution=1k: $0.002752; aspect_ratio=2:1, quality=low, resolution=1k: $0.002752 ... |
| `popnow/face-swap-pro-v1/edit` | Face Swap Pro · image-to-image | PopNow | $0.16 / image | - |
| `popnow/face-swap-v1-plus/edit` | Face Swap Plus · image-to-image | PopNow | $0.16 / image | - |
| `popnow/face-swap-v1/edit` | Face Swap · image-to-image | PopNow | $0.013 / image | - |
| `popnow/head-swap-v1/edit` | Head Swap · image-to-image | PopNow | $0.013 / image | - |
| `popnow/look-alike-v1/edit` | Celebrity Look-Alike · image-to-image | PopNow | $0.05 / image | - |
| `pruna-ai/p-image-lora/edit` | P-Image LoRA · image-to-image | Pruna AI | $0.012 / image | - |

## One-tap image tools

| Model ID | Name | Maker | Price (USD) | Tiers |
| --- | --- | --- | --- | --- |
| `bytedance/seedream-5.0-flash/layer-decomposition` | Seedream 5.0 Flash · layer-decomposition | ByteDance | $0.026 / image | - |
| `bytedance/seedream-5.0-pro/layer-decomposition` | Seedream 5.0 Pro · layer-decomposition | ByteDance | $0.042 / image | 1.5k: $0.042; 1k: $0.042; 2k: $0.084; auto: $0.084 |
| `ideogram/vector-1/edit` | Ideogram Vector 1.0 · image-edit | Ideogram | $0.132 / image | - |
| `popnow/anime-to-real-v1/edit` | Anime to Real · image-edit | PopNow | $0.03 / image | - |
| `popnow/background-remover-v1/edit` | Background Remover · image-edit | PopNow | $0.0048 / image | - |
| `popnow/camera-angle-changer-v1/edit` | Camera Angle Changer · image-edit | PopNow | $0.03 / image | - |
| `popnow/face-enhancer-v1/edit` | Face Enhancer · image-edit | PopNow | $0.012 / image | - |
| `popnow/image-expander-v1/edit` | Image Expander · image-edit | PopNow | $0.024 / image | - |
| `popnow/image-upscaler-v1/upscale` | Image Upscaler · upscale | PopNow | $0.012 / image | - |
| `popnow/object-eraser-v1/edit` | Object Eraser · image-edit | PopNow | $0.03 / image | - |
| `popnow/object-extractor-v1/edit` | Object Extractor · image-edit | PopNow | $0.024 / image | - |
| `popnow/photo-colorizer-v1/edit` | Photo Colorizer · image-edit | PopNow | $0.06 / image | - |
| `popnow/photo-restorer-v1/edit` | Old Photo Restorer · image-edit | PopNow | $0.048 / image | - |
| `popnow/photo-to-anime-v1/edit` | Photo to Anime · image-edit | PopNow | $0.05 / image | - |
| `popnow/pose-changer-v1/edit` | Pose Changer · image-edit | PopNow | $0.03 / image | - |
| `popnow/relight-v1/edit` | Relight · image-edit | PopNow | $0.03 / image | - |
| `popnow/shadow-remover-v1/edit` | Shadow Remover · image-edit | PopNow | $0.03 / image | - |
| `topaz/bloom/upscale` | Topaz Bloom · upscale | Topaz Labs | $0.36 / image | 2k: $0.36; 4k: $1.08; 8k: $4.08 |
| `topaz/denoise-sharpen/edit` | Topaz Denoise & Sharpen · image-edit | Topaz Labs | $0.12 / image | - |
| `topaz/gigapixel/upscale` | Topaz Gigapixel · upscale | Topaz Labs | $0.12 / image | preset=cgi, resolution=2k: $0.12; preset=cgi, resolution=4k: $0.12; preset=detail, resolution=2k: $0.12; preset=detail, resolution=4k: $0.12; preset=high_fidelity_v3, resolution=2k: $0.12; preset=high_fidelity_v3, resolution=4k: $0.12 ... |
