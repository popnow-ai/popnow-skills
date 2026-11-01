# PopNow video models

Snapshot of `GET /api/v1/models` taken 2026-10-18. Prices are in USD, paid from the separate API balance, and are the starting price per unit; the exact amount of one request comes from `popnow.py quote`. The live list is always the source of truth: `popnow.py models --modality video`.

Model IDs follow `<maker>/<model>/<task>`. Read a model's input fields with `popnow.py model <id>`.

## Text to video

| Model ID | Name | Maker | Price (USD) | Tiers |
| --- | --- | --- | --- | --- |
| `alibaba/happyhorse-1.1/text-to-video` | HappyHorse 1.1 | Alibaba | $0.14 / second, up to 15s | 720p: $0.14; 1080p: $0.18 |
| `alibaba/wan-2.1-lora/text-to-video` | Wan 2.1 LoRA | Alibaba | $0.24 / run | duration_seconds=5, resolution=480p: $0.24; duration_seconds=10, resolution=480p: $0.36; duration_seconds=5, resolution=720p: $0.36; duration_seconds=10, resolution=720p: $0.54 |
| `alibaba/wan-2.2-5b-lora/text-to-video` | Wan 2.2 5B LoRA | Alibaba | $0.12 / run | - |
| `alibaba/wan-2.2-lora/text-to-video` | Wan 2.2 LoRA | Alibaba | $0.048 / second | 480p: $0.048; 720p: $0.084 |
| `alibaba/wan-2.2/text-to-video` | Wan 2.2 | Alibaba | $0.24 / run | 480p: $0.24; 720p: $0.48 |
| `alibaba/wan-2.5/text-to-video` | Wan 2.5 | Alibaba | $0.045 / second | 480p: $0.045; 720p: $0.09; 1080p: $0.135 |
| `alibaba/wan-2.6/text-to-video` | Wan 2.6 | Alibaba | $0.09 / second | 720p: $0.09; 1080p: $0.135 |
| `alibaba/wan-3.0-prime/text-to-video` | Wan 3.0 Prime | Alibaba | $0.0612 / second | 480p: $0.0612; 720p: $0.126; 1080p: $0.252 |
| `alibaba/wan-3.0-pro-prime/text-to-video` | Wan 3.0 Pro Prime | Alibaba | $0.234 / second | 1080p: $0.234; 2k: $0.252; 4k: $0.279 |
| `alibaba/wan-3.0-pro/text-to-video` | Wan 3.0 Pro | Alibaba | $0.144 / second | 1080p: $0.144; 2k: $0.16; 4k: $0.184 |
| `alibaba/wan-3.0/text-to-video` | Wan 3.0 | Alibaba | $0.045 / second | 480p: $0.045; 720p: $0.09; 1080p: $0.18 |
| `black-forest-labs/flux-3/text-to-video` | FLUX 3 | Black Forest Labs | $0.06 / second | quality=draft, resolution=1080p: $0.06; quality=draft, resolution=720p: $0.06; quality=standard, resolution=720p: $0.17; quality=standard, resolution=1080p: $0.29 |
| `bytedance/seedance-1.5-pro/text-to-video` | Seedance 1.5 Pro | ByteDance | $0.0112 / second, up to 12s | generate_audio=false, resolution=480p: $0.0112; generate_audio=true, resolution=480p: $0.0223; generate_audio=false, resolution=720p: $0.0227; generate_audio=true, resolution=720p: $0.0454; generate_audio=false, resolution=1080p: $0.0491; generate_audio=true, resolution=1080p: $0.0982 |
| `bytedance/seedance-2.0-fast/text-to-video` | Seedance 2.0 Fast | ByteDance | $0.045 / second | generate_audio=false, resolution=480p: $0.045; generate_audio=true, resolution=480p: $0.045; enable_web_search=true, generate_audio=false, resolution=480p: $0.0702; enable_web_search=true, generate_audio=true, resolution=480p: $0.0702; generate_audio=false, resolution=720p: $0.09677; generate_audio=true, resolution=720p: $0.09677 ... |
| `bytedance/seedance-2.0-mini/text-to-video` | Seedance 2.0 Mini | ByteDance | $0.02461 / second | generate_audio=false, resolution=480p: $0.02461; generate_audio=true, resolution=480p: $0.02461; generate_audio=false, resolution=720p: $0.05292; generate_audio=true, resolution=720p: $0.05292 |
| `bytedance/seedance-2.0/text-to-video` | Seedance 2.0 | ByteDance | $0.07 / second | generate_audio=false, resolution=480p: $0.07; generate_audio=true, resolution=480p: $0.07; enable_web_search=true, generate_audio=false, resolution=480p: $0.114; enable_web_search=true, generate_audio=true, resolution=480p: $0.114; generate_audio=false, resolution=720p: $0.152; generate_audio=true, resolution=720p: $0.152 ... |
| `bytedance/seedance-2.5/text-to-video` | Seedance 2.5 | ByteDance | $0.1234 / second | generate_audio=false, resolution=480p: $0.1234; generate_audio=true, resolution=480p: $0.1234; generate_audio=false, resolution=720p: $0.2773; generate_audio=true, resolution=720p: $0.2773; generate_audio=false, resolution=1080p: $0.6823; generate_audio=true, resolution=1080p: $0.6823 |
| `kling/2.1-master/text-to-video` | Kling 2.1 Master | Kuaishou | $0.216 / second | - |
| `kling/2.5-turbo/text-to-video` | Kling 2.5 Turbo | Kuaishou | $0.056 / second | - |
| `kling/2.6/text-to-video` | Kling 2.6 | Kuaishou | $0.069 / second | false: $0.069; true: $0.138 |
| `kling/3.0-turbo/text-to-video` | Kling 3.0 Turbo | Kuaishou | $0.112 / second, up to 15s | 720p: $0.112; 1080p: $0.14 |
| `kling/3.0/text-to-video` | Kling 3.0 | Kuaishou | $0.0672 / second, up to 15s | generate_audio=false, resolution=720p: $0.0672; generate_audio=false, resolution=1080p: $0.0896; generate_audio=true, resolution=720p: $0.1008; generate_audio=true, resolution=1080p: $0.1344; generate_audio=false, resolution=4k: $0.336; generate_audio=true, resolution=4k: $0.336 |
| `kling/4.0/text-to-video` | Kling 4.0 | Kuaishou | $0.216 / second, up to 30s | 720p: $0.216; 1080p: $0.324 |
| `kling/o3/text-to-video` | Kling O3 | Kuaishou | $0.0672 / second, up to 15s | generate_audio=false, resolution=720p: $0.0672; generate_audio=false, resolution=1080p: $0.0896; generate_audio=true, resolution=720p: $0.0896; generate_audio=true, resolution=1080p: $0.112; generate_audio=false, resolution=4k: $0.336; generate_audio=true, resolution=4k: $0.336 |
| `lightricks/ltx-2-19b-lora/text-to-video` | LTX-2 19B LoRA | Lightricks | $0.018 / second, up to 20s | 480p: $0.018; 720p: $0.024; 1080p: $0.036 |
| `lightricks/ltx-2-19b/text-to-video` | LTX-2 19B | Lightricks | $0.0144 / second, up to 20s | 480p: $0.0144; 720p: $0.0192; 1080p: $0.0288 |
| `lightricks/ltx-2.3-lora/text-to-video` | LTX-2.3 LoRA | Lightricks | $0.024 / second, up to 20s | 480p: $0.024; 720p: $0.036; 1080p: $0.048 |
| `lightricks/ltx-2.5/text-to-video` | LTX 2.5 | Lightricks | $0.09 / second, up to 20s | 720p: $0.09; 1080p: $0.13; 2k: $0.19; 4k: $0.3 |
| `minimax/h3-lora/text-to-video` | MiniMax H3 LoRA | MiniMax | $0.05 / second, up to 15s | 480p: $0.05; 540p: $0.075; 768p: $0.1; 1080p: $0.2 |
| `minimax/h3-max/text-to-video` | MiniMax H3 Max | MiniMax | $0.05 / second, up to 15s | 480p: $0.05; 768p: $0.08 |
| `minimax/h3/text-to-video` | MiniMax H3 | MiniMax | $0.037 / second, up to 15s | 768p: $0.037; 2k: $0.058 |
| `tencent/hunyuan-video-1.5/text-to-video` | HunyuanVideo 1.5 | Tencent | $0.024 / second | 480p: $0.024; 720p: $0.048 |

## Image to video

| Model ID | Name | Maker | Price (USD) | Tiers |
| --- | --- | --- | --- | --- |
| `alibaba/happyhorse-1.1/image-to-video` | HappyHorse 1.1 | Alibaba | $0.14 / second, up to 15s | 720p: $0.14; 1080p: $0.18 |
| `alibaba/wan-2.1-lora/image-to-video` | Wan 2.1 LoRA | Alibaba | $0.24 / run | duration_seconds=5, resolution=480p: $0.24; duration_seconds=10, resolution=480p: $0.36; duration_seconds=5, resolution=720p: $0.36; duration_seconds=10, resolution=720p: $0.54 |
| `alibaba/wan-2.2-5b-lora/image-to-video` | Wan 2.2 5B LoRA | Alibaba | $0.12 / run | - |
| `alibaba/wan-2.2-lora/image-to-video` | Wan 2.2 LoRA | Alibaba | $0.024 / second | 480p: $0.024; 720p: $0.048 |
| `alibaba/wan-2.2/image-to-video` | Wan 2.2 | Alibaba | $0.24 / run | 480p: $0.24; 720p: $0.48 |
| `alibaba/wan-2.5/image-to-video` | Wan 2.5 | Alibaba | $0.045 / second | 480p: $0.045; 720p: $0.09; 1080p: $0.135 |
| `alibaba/wan-2.6-flash/image-to-video` | Wan 2.6 Flash | Alibaba | $0.0225 / second | generate_audio=false, resolution=720p: $0.0225; generate_audio=false, resolution=1080p: $0.03375; generate_audio=true, resolution=720p: $0.045; generate_audio=true, resolution=1080p: $0.0675 |
| `alibaba/wan-2.6/image-to-video` | Wan 2.6 | Alibaba | $0.09 / second | 720p: $0.09; 1080p: $0.135 |
| `alibaba/wan-3.0-prime/image-to-video` | Wan 3.0 Prime | Alibaba | $0.0612 / second | 480p: $0.0612; 720p: $0.126; 1080p: $0.252 |
| `alibaba/wan-3.0-pro-prime/image-to-video` | Wan 3.0 Pro Prime | Alibaba | $0.234 / second | 1080p: $0.234; 2k: $0.252; 4k: $0.279 |
| `alibaba/wan-3.0-pro/image-to-video` | Wan 3.0 Pro | Alibaba | $0.144 / second | 1080p: $0.144; 2k: $0.16; 4k: $0.184 |
| `alibaba/wan-3.0/image-to-video` | Wan 3.0 | Alibaba | $0.045 / second | 480p: $0.045; 720p: $0.09; 1080p: $0.18 |
| `black-forest-labs/flux-3/image-to-video` | FLUX 3 | Black Forest Labs | $0.06 / second | quality=draft, resolution=1080p: $0.06; quality=draft, resolution=720p: $0.06; quality=standard, resolution=720p: $0.17; quality=standard, resolution=1080p: $0.29 |
| `bytedance/seedance-1.5-pro/image-to-video` | Seedance 1.5 Pro | ByteDance | $0.0112 / second, up to 12s | generate_audio=false, resolution=480p: $0.0112; generate_audio=true, resolution=480p: $0.0223; generate_audio=false, resolution=720p: $0.0227; generate_audio=true, resolution=720p: $0.0454; generate_audio=false, resolution=1080p: $0.0491; generate_audio=true, resolution=1080p: $0.0982 |
| `bytedance/seedance-2.0-fast/image-to-video` | Seedance 2.0 Fast | ByteDance | $0.045 / second | generate_audio=false, resolution=480p: $0.045; generate_audio=true, resolution=480p: $0.045; generate_audio=false, resolution=720p: $0.09677; generate_audio=true, resolution=720p: $0.09677 |
| `bytedance/seedance-2.0-mini/image-to-video` | Seedance 2.0 Mini | ByteDance | $0.02461 / second | generate_audio=false, resolution=480p: $0.02461; generate_audio=true, resolution=480p: $0.02461; enable_web_search=true, generate_audio=false, resolution=480p: $0.036; enable_web_search=true, generate_audio=true, resolution=480p: $0.036; generate_audio=false, resolution=720p: $0.05292; generate_audio=true, resolution=720p: $0.05292 ... |
| `bytedance/seedance-2.0/image-to-video` | Seedance 2.0 | ByteDance | $0.07 / second | generate_audio=false, resolution=480p: $0.07; generate_audio=true, resolution=480p: $0.07; generate_audio=false, resolution=720p: $0.152; generate_audio=true, resolution=720p: $0.152; generate_audio=false, resolution=1080p: $0.374; generate_audio=true, resolution=1080p: $0.374 ... |
| `bytedance/seedance-2.5/image-to-video` | Seedance 2.5 | ByteDance | $0.1234 / second | generate_audio=false, resolution=480p: $0.1234; generate_audio=true, resolution=480p: $0.1234; generate_audio=false, resolution=720p: $0.2773; generate_audio=true, resolution=720p: $0.2773; generate_audio=false, resolution=1080p: $0.6823; generate_audio=true, resolution=1080p: $0.6823 |
| `kling/2.1-master/image-to-video` | Kling 2.1 Master | Kuaishou | $0.216 / second | - |
| `kling/2.1/image-to-video` | Kling 2.1 | Kuaishou | $0.035 / second | 720p: $0.035; 1080p: $0.068 |
| `kling/2.5-turbo/image-to-video` | Kling 2.5 Turbo | Kuaishou | $0.056 / second | - |
| `kling/2.6/image-to-video` | Kling 2.6 | Kuaishou | $0.069 / second | false: $0.069; true: $0.138 |
| `kling/3.0-turbo/image-to-video` | Kling 3.0 Turbo | Kuaishou | $0.112 / second, up to 15s | 720p: $0.112; 1080p: $0.14 |
| `kling/3.0/image-to-video` | Kling 3.0 | Kuaishou | $0.0672 / second, up to 15s | generate_audio=false, resolution=720p: $0.0672; generate_audio=false, resolution=1080p: $0.0896; generate_audio=true, resolution=720p: $0.1008; generate_audio=true, resolution=1080p: $0.1344; generate_audio=false, resolution=4k: $0.336; generate_audio=true, resolution=4k: $0.336 |
| `kling/4.0/image-to-video` | Kling 4.0 | Kuaishou | $0.216 / second, up to 30s | 720p: $0.216; 1080p: $0.324 |
| `kling/o3/image-to-video` | Kling O3 | Kuaishou | $0.0672 / second, up to 15s | generate_audio=false, resolution=720p: $0.0672; generate_audio=false, resolution=1080p: $0.0896; generate_audio=true, resolution=720p: $0.0896; generate_audio=true, resolution=1080p: $0.112; generate_audio=false, resolution=4k: $0.336; generate_audio=true, resolution=4k: $0.336 |
| `lightricks/ltx-2-19b-lora/image-to-video` | LTX-2 19B LoRA | Lightricks | $0.018 / second, up to 20s | 480p: $0.018; 720p: $0.024; 1080p: $0.036 |
| `lightricks/ltx-2-19b/image-to-video` | LTX-2 19B | Lightricks | $0.0144 / second, up to 20s | 480p: $0.0144; 720p: $0.0192; 1080p: $0.0288 |
| `lightricks/ltx-2.3-lora/image-to-video` | LTX-2.3 LoRA | Lightricks | $0.024 / second, up to 20s | 480p: $0.024; 720p: $0.036; 1080p: $0.048 |
| `lightricks/ltx-2.5/image-to-video` | LTX 2.5 | Lightricks | $0.09 / second, up to 20s | 720p: $0.09; 1080p: $0.13; 2k: $0.19; 4k: $0.3 |
| `minimax/h3-360-orbit/image-to-video` | MiniMax H3 360 Orbit | MiniMax | $0.05 / second, up to 6s | 480p: $0.05; 540p: $0.075; 768p: $0.1; 1080p: $0.2 |
| `minimax/h3-lora/image-to-video` | MiniMax H3 LoRA | MiniMax | $0.05 / second, up to 15s | 480p: $0.05; 540p: $0.075; 768p: $0.1; 1080p: $0.2 |
| `minimax/h3-max/image-to-video` | MiniMax H3 Max | MiniMax | $0.05 / second, up to 15s | 480p: $0.05; 768p: $0.08 |
| `minimax/h3-singularity-lora/image-to-video` | MiniMax H3 Singularity LoRA | MiniMax | $0.0625 / second, up to 15s | 480p: $0.0625; 540p: $0.09375; 768p: $0.125; 1080p: $0.25 |
| `minimax/h3/image-to-video` | MiniMax H3 | MiniMax | $0.037 / second, up to 15s | 768p: $0.037; 2k: $0.058 |
| `tencent/hunyuan-video-1.5/image-to-video` | HunyuanVideo 1.5 | Tencent | $0.024 / second | 480p: $0.024; 720p: $0.048 |
| `vidu/q3-pro/image-to-video` | Vidu Q3 Pro | Vidu | $0.054 / second, up to 16s | - |
| `vidu/q3-turbo/image-to-video` | Vidu Q3 Turbo | Vidu | $0.042 / second, up to 16s | 540p: $0.042; 720p: $0.066 |
| `vidu/q3/image-to-video` | Vidu Q3 | Vidu | $0.07 / second, up to 16s | 540p: $0.07; 720p: $0.15; 1080p: $0.16 |
| `vidu/q4-preview/image-to-video` | Vidu Q4 Preview | Vidu | $0.045 / second, up to 16s | 540p: $0.045; 720p: $0.095; 1080p: $0.12; 2k: $0.19; 4k: $0.39 |

## Reference to video

| Model ID | Name | Maker | Price (USD) | Tiers |
| --- | --- | --- | --- | --- |
| `alibaba/happyhorse-1.1/reference-to-video` | HappyHorse 1.1 | Alibaba | $0.14 / second, up to 15s | 720p: $0.14; 1080p: $0.18 |
| `alibaba/wan-2.6-flash/reference-to-video` | Wan 2.6 Flash | Alibaba | $0.0225 / second, up to 10s | generate_audio=false, resolution=720p: $0.0225; generate_audio=false, resolution=1080p: $0.03375; generate_audio=true, resolution=720p: $0.045; generate_audio=true, resolution=1080p: $0.0675 |
| `alibaba/wan-2.6/reference-to-video` | Wan 2.6 | Alibaba | $0.065 / second, up to 10s | 720p: $0.065; 1080p: $0.0975 |
| `alibaba/wan-3.0-prime/reference-to-video` | Wan 3.0 Prime | Alibaba | $0.0612 / second | 480p: $0.0612; 720p: $0.126; 1080p: $0.252 |
| `alibaba/wan-3.0-pro-prime/reference-to-video` | Wan 3.0 Pro Prime | Alibaba | $0.234 / second | 1080p: $0.234; 2k: $0.252; 4k: $0.279 |
| `alibaba/wan-3.0-pro/reference-to-video` | Wan 3.0 Pro | Alibaba | $0.144 / second | 1080p: $0.144; 2k: $0.16; 4k: $0.184 |
| `alibaba/wan-3.0/reference-to-video` | Wan 3.0 | Alibaba | $0.045 / second | 480p: $0.045; 720p: $0.09; 1080p: $0.18 |
| `bytedance/seedance-2.0-fast/reference-to-video` | Seedance 2.0 Fast | ByteDance | $0.02254 / second | generate_audio=false, resolution=480p, with_video=true: $0.02254; generate_audio=true, resolution=480p, with_video=true: $0.02254; generate_audio=false, resolution=480p, with_video=false: $0.045; generate_audio=true, resolution=480p, with_video=false: $0.045; generate_audio=false, resolution=720p, with_video=true: $0.04847; generate_audio=true, resolution=720p, with_video=true: $0.04847 ... |
| `bytedance/seedance-2.0-mini/reference-to-video` | Seedance 2.0 Mini | ByteDance | $0.01097 / second | generate_audio=false, resolution=480p, with_video=true: $0.01097; generate_audio=true, resolution=480p, with_video=true: $0.01097; generate_audio=false, resolution=720p, with_video=true: $0.02359; generate_audio=true, resolution=720p, with_video=true: $0.02359; generate_audio=false, resolution=480p, with_video=false: $0.02461; generate_audio=true, resolution=480p, with_video=false: $0.02461 ... |
| `bytedance/seedance-2.0/reference-to-video` | Seedance 2.0 | ByteDance | $0.0431 / second | generate_audio=false, resolution=480p, with_video=true: $0.0431; generate_audio=true, resolution=480p, with_video=true: $0.0431; generate_audio=false, resolution=480p, with_video=false: $0.07; generate_audio=true, resolution=480p, with_video=false: $0.07; generate_audio=false, resolution=720p, with_video=true: $0.0928; generate_audio=true, resolution=720p, with_video=true: $0.0928 ... |
| `bytedance/seedance-2.5/reference-to-video` | Seedance 2.5 | ByteDance | $0.0738 / second | generate_audio=false, resolution=480p, with_video=true: $0.0738; generate_audio=true, resolution=480p, with_video=true: $0.0738; generate_audio=false, resolution=480p, with_video=false: $0.1234; generate_audio=true, resolution=480p, with_video=false: $0.1234; generate_audio=false, resolution=720p, with_video=true: $0.1659; generate_audio=true, resolution=720p, with_video=true: $0.1659 ... |
| `kling/4.0/reference-to-video` | Kling 4.0 | Kuaishou | $0.216 / second, up to 30s | 720p: $0.216; 1080p: $0.324 |
| `kling/o3/reference-to-video` | Kling O3 | Kuaishou | $0.0672 / second, up to 15s | generate_audio=false, resolution=720p: $0.0672; generate_audio=false, resolution=1080p: $0.0896; generate_audio=true, resolution=720p: $0.0896; generate_audio=false, resolution=720p, with_video=true: $0.1008; generate_audio=true, resolution=1080p: $0.112; generate_audio=false, resolution=1080p, with_video=true: $0.1344 ... |
| `minimax/h3-lora/reference-to-video` | MiniMax H3 LoRA | MiniMax | $0.06 / second, up to 15s | 480p: $0.06; 540p: $0.09; 768p: $0.12; 1080p: $0.24 |
| `minimax/h3-singularity-lora/reference-to-video` | MiniMax H3 Singularity LoRA | MiniMax | $0.06 / second, up to 15s | 480p: $0.06; 540p: $0.09; 768p: $0.12; 1080p: $0.24 |
| `minimax/h3/reference-to-video` | MiniMax H3 | MiniMax | $0.037 / second, up to 15s | 768p: $0.037; 2k: $0.058 |
| `vidu/q4-preview/reference-to-video` | Vidu Q4 Preview | Vidu | $0.045 / second, up to 16s | 540p: $0.045; 720p: $0.095; 1080p: $0.12; 2k: $0.19; 4k: $0.39 |

## Extend a video

| Model ID | Name | Maker | Price (USD) | Tiers |
| --- | --- | --- | --- | --- |
| `alibaba/wan-2.2-lora/video-extend` | Wan 2.2 LoRA | Alibaba | $0.024 / second | 480p: $0.024; 720p: $0.048 |
| `alibaba/wan-2.5/video-extend` | Wan 2.5 | Alibaba | $0.045 / second | 480p: $0.045; 720p: $0.09; 1080p: $0.135 |
| `alibaba/wan-3.0-prime/video-extend` | Wan 3.0 Prime | Alibaba | $0.0612 / second | 480p: $0.0612; 720p: $0.126; 1080p: $0.252 |
| `alibaba/wan-3.0-pro-prime/video-extend` | Wan 3.0 Pro Prime | Alibaba | $0.234 / second | 1080p: $0.234; 2k: $0.252; 4k: $0.279 |
| `alibaba/wan-3.0-pro/video-extend` | Wan 3.0 Pro | Alibaba | $0.144 / second | 1080p: $0.144; 2k: $0.16; 4k: $0.184 |
| `alibaba/wan-3.0/video-extend` | Wan 3.0 | Alibaba | $0.045 / second | 480p: $0.045; 720p: $0.09; 1080p: $0.18 |
| `black-forest-labs/flux-3/video-extend` | FLUX 3 | Black Forest Labs | $0.12 / second | quality=draft, resolution=1080p: $0.12; quality=draft, resolution=720p: $0.12; quality=standard, resolution=720p: $0.41; quality=standard, resolution=1080p: $0.53 |
| `bytedance/seedance-1.5-pro/video-extend` | Seedance 1.5 Pro | ByteDance | $0.0112 / second, up to 12s | generate_audio=false, resolution=480p: $0.0112; generate_audio=true, resolution=480p: $0.0223; generate_audio=false, resolution=720p: $0.0227; generate_audio=true, resolution=720p: $0.0454; generate_audio=false, resolution=1080p: $0.0491; generate_audio=true, resolution=1080p: $0.0982 |
| `bytedance/seedance-2.0-fast/video-extend` | Seedance 2.0 Fast | ByteDance | $0.045 / second | generate_audio=false, resolution=480p: $0.045; generate_audio=true, resolution=480p: $0.045; generate_audio=false, resolution=720p: $0.09677; generate_audio=true, resolution=720p: $0.09677 |
| `bytedance/seedance-2.0-mini/video-extend` | Seedance 2.0 Mini | ByteDance | $0.02461 / second | generate_audio=false, resolution=480p: $0.02461; generate_audio=true, resolution=480p: $0.02461; enable_web_search=true, generate_audio=false, resolution=480p: $0.036; enable_web_search=true, generate_audio=true, resolution=480p: $0.036; generate_audio=false, resolution=720p: $0.05292; generate_audio=true, resolution=720p: $0.05292 ... |
| `bytedance/seedance-2.0/video-extend` | Seedance 2.0 | ByteDance | $0.07 / second | generate_audio=false, resolution=480p: $0.07; generate_audio=true, resolution=480p: $0.07; generate_audio=false, resolution=720p: $0.152; generate_audio=true, resolution=720p: $0.152; generate_audio=false, resolution=1080p: $0.374; generate_audio=true, resolution=1080p: $0.374 ... |
| `bytedance/seedance-2.5/video-extend` | Seedance 2.5 | ByteDance | $0.0738 / second | generate_audio=false, resolution=480p, with_video=true: $0.0738; generate_audio=true, resolution=480p, with_video=true: $0.0738; generate_audio=false, resolution=480p, with_video=false: $0.1234; generate_audio=true, resolution=480p, with_video=false: $0.1234; generate_audio=false, resolution=720p, with_video=true: $0.1659; generate_audio=true, resolution=720p, with_video=true: $0.1659 ... |
| `lightricks/ltx-2-19b/video-extend` | LTX-2 19B | Lightricks | $0.0144 / second, up to 20s | 480p: $0.0144; 720p: $0.0192; 1080p: $0.0288 |
| `minimax/h3-lora/video-extend` | MiniMax H3 LoRA | MiniMax | $0.05 / second, up to 15s | 480p: $0.05; 540p: $0.075; 768p: $0.1; 1080p: $0.2 |
| `minimax/h3-max/video-extend` | MiniMax H3 Max | MiniMax | $0.05 / second, up to 15s | 480p: $0.05; 768p: $0.08 |
| `minimax/h3-singularity-lora/video-extend` | MiniMax H3 Singularity LoRA | MiniMax | $0.0625 / second, up to 15s | 480p: $0.0625; 540p: $0.09375; 768p: $0.125; 1080p: $0.25 |
| `minimax/h3/video-extend` | MiniMax H3 | MiniMax | $0.037 / second, up to 15s | 768p: $0.037; 2k: $0.058 |
| `vidu/q3-turbo/video-extend` | Vidu Q3 Turbo | Vidu | $0.042 / second, up to 16s | 540p: $0.042; 720p: $0.066 |
| `vidu/q4-preview/video-extend` | Vidu Q4 Preview | Vidu | $0.045 / second, up to 16s | 540p: $0.045; 720p: $0.095; 1080p: $0.12; 2k: $0.19; 4k: $0.39 |

## Edit, animate and upscale video

| Model ID | Name | Maker | Price (USD) | Tiers |
| --- | --- | --- | --- | --- |
| `alibaba/wan-2.1-lora/video-edit` | Wan 2.1 LoRA | Alibaba | $0.24 / run | duration_seconds=5, resolution=480p: $0.24; duration_seconds=10, resolution=480p: $0.36; duration_seconds=5, resolution=720p: $0.36; duration_seconds=10, resolution=720p: $0.54 |
| `alibaba/wan-2.2-animate/character-animation` | Wan 2.2 Animate | Alibaba | $0.053 / second | 480p: $0.053; 720p: $0.11 |
| `black-forest-labs/flux-3/upscale` | FLUX 3 | Black Forest Labs | $0.528 / second | precise: $0.528; creative: $0.7584 |
| `kling/2.6/character-animation` | Kling 2.6 | Kuaishou | $0.069 / second | 720p: $0.069; 1080p: $0.112 |
| `kling/3.0/character-animation` | Kling 3.0 | Kuaishou | $0.1008 / second | 720p: $0.1008; 1080p: $0.1344 |
| `kling/o3/video-edit` | Kling O3 | Kuaishou | $0.1252 / second | 720p: $0.1252; 1080p: $0.168 |
| `popnow/video-upscaler-v1/upscale` | Video Upscaler | PopNow | $0.006 / second | 1080p: $0.006; 720p: $0.006; 2k: $0.012; 4k: $0.024 |
