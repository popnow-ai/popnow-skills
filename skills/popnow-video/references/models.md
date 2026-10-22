# PopNow video models

Snapshot of `GET /api/v1/models` taken 2026-10-18. Prices are in credits (1 credit = $0.001) and are the starting price per unit; the exact amount of one request comes from `popnow.py quote`. The live list is always the source of truth: `popnow.py models --modality video`.

Model IDs follow `<maker>/<model>/<task>`. Read a model's input fields with `popnow.py model <id>`.

## Text to video

| Model ID | Name | Maker | Price (credits) | Tiers |
| --- | --- | --- | --- | --- |
| `alibaba/happyhorse-1.1/text-to-video` | HappyHorse 1.1 | Alibaba | 140 / second, up to 15s | 720p: 140; 1080p: 180 |
| `alibaba/wan-2.1-lora/text-to-video` | Wan 2.1 LoRA | Alibaba | 240 / run | duration_seconds=5, resolution=480p: 240; duration_seconds=10, resolution=480p: 360; duration_seconds=5, resolution=720p: 360; duration_seconds=10, resolution=720p: 540 |
| `alibaba/wan-2.2-5b-lora/text-to-video` | Wan 2.2 5B LoRA | Alibaba | 120 / run | - |
| `alibaba/wan-2.2-lora/text-to-video` | Wan 2.2 LoRA | Alibaba | 48 / second | 480p: 48; 720p: 84 |
| `alibaba/wan-2.2/text-to-video` | Wan 2.2 | Alibaba | 240 / run | 480p: 240; 720p: 480 |
| `alibaba/wan-2.5/text-to-video` | Wan 2.5 | Alibaba | 45 / second | 480p: 45; 720p: 90; 1080p: 135 |
| `alibaba/wan-2.6/text-to-video` | Wan 2.6 | Alibaba | 90 / second | 720p: 90; 1080p: 135 |
| `alibaba/wan-3.0-prime/text-to-video` | Wan 3.0 Prime | Alibaba | 61.2 / second | 480p: 61.2; 720p: 126; 1080p: 252 |
| `alibaba/wan-3.0-pro-prime/text-to-video` | Wan 3.0 Pro Prime | Alibaba | 234 / second | 1080p: 234; 2k: 252; 4k: 279 |
| `alibaba/wan-3.0-pro/text-to-video` | Wan 3.0 Pro | Alibaba | 144 / second | 1080p: 144; 2k: 160; 4k: 184 |
| `alibaba/wan-3.0/text-to-video` | Wan 3.0 | Alibaba | 45 / second | 480p: 45; 720p: 90; 1080p: 180 |
| `black-forest-labs/flux-3/text-to-video` | FLUX 3 | Black Forest Labs | 60 / second | quality=draft, resolution=1080p: 60; quality=draft, resolution=720p: 60; quality=standard, resolution=720p: 170; quality=standard, resolution=1080p: 290 |
| `bytedance/seedance-1.5-pro/text-to-video` | Seedance 1.5 Pro | ByteDance | 11.2 / second, up to 12s | generate_audio=false, resolution=480p: 11.2; generate_audio=true, resolution=480p: 22.3; generate_audio=false, resolution=720p: 22.7; generate_audio=true, resolution=720p: 45.4; generate_audio=false, resolution=1080p: 49.1; generate_audio=true, resolution=1080p: 98.2 |
| `bytedance/seedance-2.0-fast/text-to-video` | Seedance 2.0 Fast | ByteDance | 45 / second | generate_audio=false, resolution=480p: 45; generate_audio=true, resolution=480p: 45; enable_web_search=true, generate_audio=false, resolution=480p: 70.2; enable_web_search=true, generate_audio=true, resolution=480p: 70.2; generate_audio=false, resolution=720p: 96.77; generate_audio=true, resolution=720p: 96.77 ... |
| `bytedance/seedance-2.0-mini/text-to-video` | Seedance 2.0 Mini | ByteDance | 24.61 / second | generate_audio=false, resolution=480p: 24.61; generate_audio=true, resolution=480p: 24.61; generate_audio=false, resolution=720p: 52.92; generate_audio=true, resolution=720p: 52.92 |
| `bytedance/seedance-2.0/text-to-video` | Seedance 2.0 | ByteDance | 70 / second | generate_audio=false, resolution=480p: 70; generate_audio=true, resolution=480p: 70; enable_web_search=true, generate_audio=false, resolution=480p: 114; enable_web_search=true, generate_audio=true, resolution=480p: 114; generate_audio=false, resolution=720p: 152; generate_audio=true, resolution=720p: 152 ... |
| `bytedance/seedance-2.5/text-to-video` | Seedance 2.5 | ByteDance | 123.4 / second | generate_audio=false, resolution=480p: 123.4; generate_audio=true, resolution=480p: 123.4; generate_audio=false, resolution=720p: 277.3; generate_audio=true, resolution=720p: 277.3; generate_audio=false, resolution=1080p: 682.3; generate_audio=true, resolution=1080p: 682.3 |
| `kling/2.1-master/text-to-video` | Kling 2.1 Master | Kuaishou | 216 / second | - |
| `kling/2.5-turbo/text-to-video` | Kling 2.5 Turbo | Kuaishou | 56 / second | - |
| `kling/2.6/text-to-video` | Kling 2.6 | Kuaishou | 69 / second | false: 69; true: 138 |
| `kling/3.0-turbo/text-to-video` | Kling 3.0 Turbo | Kuaishou | 112 / second, up to 15s | 720p: 112; 1080p: 140 |
| `kling/3.0/text-to-video` | Kling 3.0 | Kuaishou | 67.2 / second, up to 15s | generate_audio=false, resolution=720p: 67.2; generate_audio=false, resolution=1080p: 89.6; generate_audio=true, resolution=720p: 100.8; generate_audio=true, resolution=1080p: 134.4; generate_audio=false, resolution=4k: 336; generate_audio=true, resolution=4k: 336 |
| `kling/4.0/text-to-video` | Kling 4.0 | Kuaishou | 216 / second, up to 30s | 720p: 216; 1080p: 324 |
| `kling/o3/text-to-video` | Kling O3 | Kuaishou | 67.2 / second, up to 15s | generate_audio=false, resolution=720p: 67.2; generate_audio=false, resolution=1080p: 89.6; generate_audio=true, resolution=720p: 89.6; generate_audio=true, resolution=1080p: 112; generate_audio=false, resolution=4k: 336; generate_audio=true, resolution=4k: 336 |
| `lightricks/ltx-2-19b-lora/text-to-video` | LTX-2 19B LoRA | Lightricks | 18 / second, up to 20s | 480p: 18; 720p: 24; 1080p: 36 |
| `lightricks/ltx-2-19b/text-to-video` | LTX-2 19B | Lightricks | 14.4 / second, up to 20s | 480p: 14.4; 720p: 19.2; 1080p: 28.8 |
| `lightricks/ltx-2.3-lora/text-to-video` | LTX-2.3 LoRA | Lightricks | 24 / second, up to 20s | 480p: 24; 720p: 36; 1080p: 48 |
| `lightricks/ltx-2.5/text-to-video` | LTX 2.5 | Lightricks | 90 / second, up to 20s | 720p: 90; 1080p: 130; 2k: 190; 4k: 300 |
| `minimax/h3-lora/text-to-video` | MiniMax H3 LoRA | MiniMax | 50 / second, up to 15s | 480p: 50; 540p: 75; 768p: 100; 1080p: 200 |
| `minimax/h3-max/text-to-video` | MiniMax H3 Max | MiniMax | 50 / second, up to 15s | 480p: 50; 768p: 80 |
| `minimax/h3/text-to-video` | MiniMax H3 | MiniMax | 37 / second, up to 15s | 768p: 37; 2k: 58 |
| `tencent/hunyuan-video-1.5/text-to-video` | HunyuanVideo 1.5 | Tencent | 24 / second | 480p: 24; 720p: 48 |

## Image to video

| Model ID | Name | Maker | Price (credits) | Tiers |
| --- | --- | --- | --- | --- |
| `alibaba/happyhorse-1.1/image-to-video` | HappyHorse 1.1 | Alibaba | 140 / second, up to 15s | 720p: 140; 1080p: 180 |
| `alibaba/wan-2.1-lora/image-to-video` | Wan 2.1 LoRA | Alibaba | 240 / run | duration_seconds=5, resolution=480p: 240; duration_seconds=10, resolution=480p: 360; duration_seconds=5, resolution=720p: 360; duration_seconds=10, resolution=720p: 540 |
| `alibaba/wan-2.2-5b-lora/image-to-video` | Wan 2.2 5B LoRA | Alibaba | 120 / run | - |
| `alibaba/wan-2.2-lora/image-to-video` | Wan 2.2 LoRA | Alibaba | 24 / second | 480p: 24; 720p: 48 |
| `alibaba/wan-2.2/image-to-video` | Wan 2.2 | Alibaba | 240 / run | 480p: 240; 720p: 480 |
| `alibaba/wan-2.5/image-to-video` | Wan 2.5 | Alibaba | 45 / second | 480p: 45; 720p: 90; 1080p: 135 |
| `alibaba/wan-2.6-flash/image-to-video` | Wan 2.6 Flash | Alibaba | 22.5 / second | generate_audio=false, resolution=720p: 22.5; generate_audio=false, resolution=1080p: 33.75; generate_audio=true, resolution=720p: 45; generate_audio=true, resolution=1080p: 67.5 |
| `alibaba/wan-2.6/image-to-video` | Wan 2.6 | Alibaba | 90 / second | 720p: 90; 1080p: 135 |
| `alibaba/wan-3.0-prime/image-to-video` | Wan 3.0 Prime | Alibaba | 61.2 / second | 480p: 61.2; 720p: 126; 1080p: 252 |
| `alibaba/wan-3.0-pro-prime/image-to-video` | Wan 3.0 Pro Prime | Alibaba | 234 / second | 1080p: 234; 2k: 252; 4k: 279 |
| `alibaba/wan-3.0-pro/image-to-video` | Wan 3.0 Pro | Alibaba | 144 / second | 1080p: 144; 2k: 160; 4k: 184 |
| `alibaba/wan-3.0/image-to-video` | Wan 3.0 | Alibaba | 45 / second | 480p: 45; 720p: 90; 1080p: 180 |
| `black-forest-labs/flux-3/image-to-video` | FLUX 3 | Black Forest Labs | 60 / second | quality=draft, resolution=1080p: 60; quality=draft, resolution=720p: 60; quality=standard, resolution=720p: 170; quality=standard, resolution=1080p: 290 |
| `bytedance/seedance-1.5-pro/image-to-video` | Seedance 1.5 Pro | ByteDance | 11.2 / second, up to 12s | generate_audio=false, resolution=480p: 11.2; generate_audio=true, resolution=480p: 22.3; generate_audio=false, resolution=720p: 22.7; generate_audio=true, resolution=720p: 45.4; generate_audio=false, resolution=1080p: 49.1; generate_audio=true, resolution=1080p: 98.2 |
| `bytedance/seedance-2.0-fast/image-to-video` | Seedance 2.0 Fast | ByteDance | 45 / second | generate_audio=false, resolution=480p: 45; generate_audio=true, resolution=480p: 45; generate_audio=false, resolution=720p: 96.77; generate_audio=true, resolution=720p: 96.77 |
| `bytedance/seedance-2.0-mini/image-to-video` | Seedance 2.0 Mini | ByteDance | 24.61 / second | generate_audio=false, resolution=480p: 24.61; generate_audio=true, resolution=480p: 24.61; enable_web_search=true, generate_audio=false, resolution=480p: 36; enable_web_search=true, generate_audio=true, resolution=480p: 36; generate_audio=false, resolution=720p: 52.92; generate_audio=true, resolution=720p: 52.92 ... |
| `bytedance/seedance-2.0/image-to-video` | Seedance 2.0 | ByteDance | 70 / second | generate_audio=false, resolution=480p: 70; generate_audio=true, resolution=480p: 70; generate_audio=false, resolution=720p: 152; generate_audio=true, resolution=720p: 152; generate_audio=false, resolution=1080p: 374; generate_audio=true, resolution=1080p: 374 ... |
| `bytedance/seedance-2.5/image-to-video` | Seedance 2.5 | ByteDance | 123.4 / second | generate_audio=false, resolution=480p: 123.4; generate_audio=true, resolution=480p: 123.4; generate_audio=false, resolution=720p: 277.3; generate_audio=true, resolution=720p: 277.3; generate_audio=false, resolution=1080p: 682.3; generate_audio=true, resolution=1080p: 682.3 |
| `kling/2.1-master/image-to-video` | Kling 2.1 Master | Kuaishou | 216 / second | - |
| `kling/2.1/image-to-video` | Kling 2.1 | Kuaishou | 35 / second | 720p: 35; 1080p: 68 |
| `kling/2.5-turbo/image-to-video` | Kling 2.5 Turbo | Kuaishou | 56 / second | - |
| `kling/2.6/image-to-video` | Kling 2.6 | Kuaishou | 69 / second | false: 69; true: 138 |
| `kling/3.0-turbo/image-to-video` | Kling 3.0 Turbo | Kuaishou | 112 / second, up to 15s | 720p: 112; 1080p: 140 |
| `kling/3.0/image-to-video` | Kling 3.0 | Kuaishou | 67.2 / second, up to 15s | generate_audio=false, resolution=720p: 67.2; generate_audio=false, resolution=1080p: 89.6; generate_audio=true, resolution=720p: 100.8; generate_audio=true, resolution=1080p: 134.4; generate_audio=false, resolution=4k: 336; generate_audio=true, resolution=4k: 336 |
| `kling/4.0/image-to-video` | Kling 4.0 | Kuaishou | 216 / second, up to 30s | 720p: 216; 1080p: 324 |
| `kling/o3/image-to-video` | Kling O3 | Kuaishou | 67.2 / second, up to 15s | generate_audio=false, resolution=720p: 67.2; generate_audio=false, resolution=1080p: 89.6; generate_audio=true, resolution=720p: 89.6; generate_audio=true, resolution=1080p: 112; generate_audio=false, resolution=4k: 336; generate_audio=true, resolution=4k: 336 |
| `lightricks/ltx-2-19b-lora/image-to-video` | LTX-2 19B LoRA | Lightricks | 18 / second, up to 20s | 480p: 18; 720p: 24; 1080p: 36 |
| `lightricks/ltx-2-19b/image-to-video` | LTX-2 19B | Lightricks | 14.4 / second, up to 20s | 480p: 14.4; 720p: 19.2; 1080p: 28.8 |
| `lightricks/ltx-2.3-lora/image-to-video` | LTX-2.3 LoRA | Lightricks | 24 / second, up to 20s | 480p: 24; 720p: 36; 1080p: 48 |
| `lightricks/ltx-2.5/image-to-video` | LTX 2.5 | Lightricks | 90 / second, up to 20s | 720p: 90; 1080p: 130; 2k: 190; 4k: 300 |
| `minimax/h3-360-orbit/image-to-video` | MiniMax H3 360 Orbit | MiniMax | 50 / second, up to 6s | 480p: 50; 540p: 75; 768p: 100; 1080p: 200 |
| `minimax/h3-lora/image-to-video` | MiniMax H3 LoRA | MiniMax | 50 / second, up to 15s | 480p: 50; 540p: 75; 768p: 100; 1080p: 200 |
| `minimax/h3-max/image-to-video` | MiniMax H3 Max | MiniMax | 50 / second, up to 15s | 480p: 50; 768p: 80 |
| `minimax/h3-singularity-lora/image-to-video` | MiniMax H3 Singularity LoRA | MiniMax | 62.5 / second, up to 15s | 480p: 62.5; 540p: 93.75; 768p: 125; 1080p: 250 |
| `minimax/h3/image-to-video` | MiniMax H3 | MiniMax | 37 / second, up to 15s | 768p: 37; 2k: 58 |
| `tencent/hunyuan-video-1.5/image-to-video` | HunyuanVideo 1.5 | Tencent | 24 / second | 480p: 24; 720p: 48 |
| `vidu/q3-pro/image-to-video` | Vidu Q3 Pro | Vidu | 54 / second, up to 16s | - |
| `vidu/q3-turbo/image-to-video` | Vidu Q3 Turbo | Vidu | 42 / second, up to 16s | 540p: 42; 720p: 66 |
| `vidu/q3/image-to-video` | Vidu Q3 | Vidu | 70 / second, up to 16s | 540p: 70; 720p: 150; 1080p: 160 |
| `vidu/q4-preview/image-to-video` | Vidu Q4 Preview | Vidu | 45 / second, up to 16s | 540p: 45; 720p: 95; 1080p: 120; 2k: 190; 4k: 390 |

## Reference to video

| Model ID | Name | Maker | Price (credits) | Tiers |
| --- | --- | --- | --- | --- |
| `alibaba/happyhorse-1.1/reference-to-video` | HappyHorse 1.1 | Alibaba | 140 / second, up to 15s | 720p: 140; 1080p: 180 |
| `alibaba/wan-2.6-flash/reference-to-video` | Wan 2.6 Flash | Alibaba | 22.5 / second, up to 10s | generate_audio=false, resolution=720p: 22.5; generate_audio=false, resolution=1080p: 33.75; generate_audio=true, resolution=720p: 45; generate_audio=true, resolution=1080p: 67.5 |
| `alibaba/wan-2.6/reference-to-video` | Wan 2.6 | Alibaba | 65 / second, up to 10s | 720p: 65; 1080p: 97.5 |
| `alibaba/wan-3.0-prime/reference-to-video` | Wan 3.0 Prime | Alibaba | 61.2 / second | 480p: 61.2; 720p: 126; 1080p: 252 |
| `alibaba/wan-3.0-pro-prime/reference-to-video` | Wan 3.0 Pro Prime | Alibaba | 234 / second | 1080p: 234; 2k: 252; 4k: 279 |
| `alibaba/wan-3.0-pro/reference-to-video` | Wan 3.0 Pro | Alibaba | 144 / second | 1080p: 144; 2k: 160; 4k: 184 |
| `alibaba/wan-3.0/reference-to-video` | Wan 3.0 | Alibaba | 45 / second | 480p: 45; 720p: 90; 1080p: 180 |
| `bytedance/seedance-2.0-fast/reference-to-video` | Seedance 2.0 Fast | ByteDance | 22.54 / second | generate_audio=false, resolution=480p, with_video=true: 22.54; generate_audio=true, resolution=480p, with_video=true: 22.54; generate_audio=false, resolution=480p, with_video=false: 45; generate_audio=true, resolution=480p, with_video=false: 45; generate_audio=false, resolution=720p, with_video=true: 48.47; generate_audio=true, resolution=720p, with_video=true: 48.47 ... |
| `bytedance/seedance-2.0-mini/reference-to-video` | Seedance 2.0 Mini | ByteDance | 10.97 / second | generate_audio=false, resolution=480p, with_video=true: 10.97; generate_audio=true, resolution=480p, with_video=true: 10.97; generate_audio=false, resolution=720p, with_video=true: 23.59; generate_audio=true, resolution=720p, with_video=true: 23.59; generate_audio=false, resolution=480p, with_video=false: 24.61; generate_audio=true, resolution=480p, with_video=false: 24.61 ... |
| `bytedance/seedance-2.0/reference-to-video` | Seedance 2.0 | ByteDance | 43.1 / second | generate_audio=false, resolution=480p, with_video=true: 43.1; generate_audio=true, resolution=480p, with_video=true: 43.1; generate_audio=false, resolution=480p, with_video=false: 70; generate_audio=true, resolution=480p, with_video=false: 70; generate_audio=false, resolution=720p, with_video=true: 92.8; generate_audio=true, resolution=720p, with_video=true: 92.8 ... |
| `bytedance/seedance-2.5/reference-to-video` | Seedance 2.5 | ByteDance | 73.8 / second | generate_audio=false, resolution=480p, with_video=true: 73.8; generate_audio=true, resolution=480p, with_video=true: 73.8; generate_audio=false, resolution=480p, with_video=false: 123.4; generate_audio=true, resolution=480p, with_video=false: 123.4; generate_audio=false, resolution=720p, with_video=true: 165.9; generate_audio=true, resolution=720p, with_video=true: 165.9 ... |
| `kling/4.0/reference-to-video` | Kling 4.0 | Kuaishou | 216 / second, up to 30s | 720p: 216; 1080p: 324 |
| `kling/o3/reference-to-video` | Kling O3 | Kuaishou | 67.2 / second, up to 15s | generate_audio=false, resolution=720p: 67.2; generate_audio=false, resolution=1080p: 89.6; generate_audio=true, resolution=720p: 89.6; generate_audio=false, resolution=720p, with_video=true: 100.8; generate_audio=true, resolution=1080p: 112; generate_audio=false, resolution=1080p, with_video=true: 134.4 ... |
| `minimax/h3-lora/reference-to-video` | MiniMax H3 LoRA | MiniMax | 60 / second, up to 15s | 480p: 60; 540p: 90; 768p: 120; 1080p: 240 |
| `minimax/h3-singularity-lora/reference-to-video` | MiniMax H3 Singularity LoRA | MiniMax | 60 / second, up to 15s | 480p: 60; 540p: 90; 768p: 120; 1080p: 240 |
| `minimax/h3/reference-to-video` | MiniMax H3 | MiniMax | 37 / second, up to 15s | 768p: 37; 2k: 58 |
| `vidu/q4-preview/reference-to-video` | Vidu Q4 Preview | Vidu | 45 / second, up to 16s | 540p: 45; 720p: 95; 1080p: 120; 2k: 190; 4k: 390 |

## Extend a video

| Model ID | Name | Maker | Price (credits) | Tiers |
| --- | --- | --- | --- | --- |
| `alibaba/wan-2.2-lora/video-extend` | Wan 2.2 LoRA | Alibaba | 24 / second | 480p: 24; 720p: 48 |
| `alibaba/wan-2.5/video-extend` | Wan 2.5 | Alibaba | 45 / second | 480p: 45; 720p: 90; 1080p: 135 |
| `alibaba/wan-3.0-prime/video-extend` | Wan 3.0 Prime | Alibaba | 61.2 / second | 480p: 61.2; 720p: 126; 1080p: 252 |
| `alibaba/wan-3.0-pro-prime/video-extend` | Wan 3.0 Pro Prime | Alibaba | 234 / second | 1080p: 234; 2k: 252; 4k: 279 |
| `alibaba/wan-3.0-pro/video-extend` | Wan 3.0 Pro | Alibaba | 144 / second | 1080p: 144; 2k: 160; 4k: 184 |
| `alibaba/wan-3.0/video-extend` | Wan 3.0 | Alibaba | 45 / second | 480p: 45; 720p: 90; 1080p: 180 |
| `black-forest-labs/flux-3/video-extend` | FLUX 3 | Black Forest Labs | 120 / second | quality=draft, resolution=1080p: 120; quality=draft, resolution=720p: 120; quality=standard, resolution=720p: 410; quality=standard, resolution=1080p: 530 |
| `bytedance/seedance-1.5-pro/video-extend` | Seedance 1.5 Pro | ByteDance | 11.2 / second, up to 12s | generate_audio=false, resolution=480p: 11.2; generate_audio=true, resolution=480p: 22.3; generate_audio=false, resolution=720p: 22.7; generate_audio=true, resolution=720p: 45.4; generate_audio=false, resolution=1080p: 49.1; generate_audio=true, resolution=1080p: 98.2 |
| `bytedance/seedance-2.0-fast/video-extend` | Seedance 2.0 Fast | ByteDance | 45 / second | generate_audio=false, resolution=480p: 45; generate_audio=true, resolution=480p: 45; generate_audio=false, resolution=720p: 96.77; generate_audio=true, resolution=720p: 96.77 |
| `bytedance/seedance-2.0-mini/video-extend` | Seedance 2.0 Mini | ByteDance | 24.61 / second | generate_audio=false, resolution=480p: 24.61; generate_audio=true, resolution=480p: 24.61; enable_web_search=true, generate_audio=false, resolution=480p: 36; enable_web_search=true, generate_audio=true, resolution=480p: 36; generate_audio=false, resolution=720p: 52.92; generate_audio=true, resolution=720p: 52.92 ... |
| `bytedance/seedance-2.0/video-extend` | Seedance 2.0 | ByteDance | 70 / second | generate_audio=false, resolution=480p: 70; generate_audio=true, resolution=480p: 70; generate_audio=false, resolution=720p: 152; generate_audio=true, resolution=720p: 152; generate_audio=false, resolution=1080p: 374; generate_audio=true, resolution=1080p: 374 ... |
| `bytedance/seedance-2.5/video-extend` | Seedance 2.5 | ByteDance | 73.8 / second | generate_audio=false, resolution=480p, with_video=true: 73.8; generate_audio=true, resolution=480p, with_video=true: 73.8; generate_audio=false, resolution=480p, with_video=false: 123.4; generate_audio=true, resolution=480p, with_video=false: 123.4; generate_audio=false, resolution=720p, with_video=true: 165.9; generate_audio=true, resolution=720p, with_video=true: 165.9 ... |
| `lightricks/ltx-2-19b/video-extend` | LTX-2 19B | Lightricks | 14.4 / second, up to 20s | 480p: 14.4; 720p: 19.2; 1080p: 28.8 |
| `minimax/h3-lora/video-extend` | MiniMax H3 LoRA | MiniMax | 50 / second, up to 15s | 480p: 50; 540p: 75; 768p: 100; 1080p: 200 |
| `minimax/h3-max/video-extend` | MiniMax H3 Max | MiniMax | 50 / second, up to 15s | 480p: 50; 768p: 80 |
| `minimax/h3-singularity-lora/video-extend` | MiniMax H3 Singularity LoRA | MiniMax | 62.5 / second, up to 15s | 480p: 62.5; 540p: 93.75; 768p: 125; 1080p: 250 |
| `minimax/h3/video-extend` | MiniMax H3 | MiniMax | 37 / second, up to 15s | 768p: 37; 2k: 58 |
| `vidu/q3-turbo/video-extend` | Vidu Q3 Turbo | Vidu | 42 / second, up to 16s | 540p: 42; 720p: 66 |
| `vidu/q4-preview/video-extend` | Vidu Q4 Preview | Vidu | 45 / second, up to 16s | 540p: 45; 720p: 95; 1080p: 120; 2k: 190; 4k: 390 |

## Edit, animate and upscale video

| Model ID | Name | Maker | Price (credits) | Tiers |
| --- | --- | --- | --- | --- |
| `alibaba/wan-2.1-lora/video-edit` | Wan 2.1 LoRA | Alibaba | 240 / run | duration_seconds=5, resolution=480p: 240; duration_seconds=10, resolution=480p: 360; duration_seconds=5, resolution=720p: 360; duration_seconds=10, resolution=720p: 540 |
| `alibaba/wan-2.2-animate/character-animation` | Wan 2.2 Animate | Alibaba | 53 / second | 480p: 53; 720p: 110 |
| `black-forest-labs/flux-3/upscale` | FLUX 3 | Black Forest Labs | 528 / second | precise: 528; creative: 758.4 |
| `kling/2.6/character-animation` | Kling 2.6 | Kuaishou | 69 / second | 720p: 69; 1080p: 112 |
| `kling/3.0/character-animation` | Kling 3.0 | Kuaishou | 100.8 / second | 720p: 100.8; 1080p: 134.4 |
| `kling/o3/video-edit` | Kling O3 | Kuaishou | 125.2 / second | 720p: 125.2; 1080p: 168 |
| `popnow/video-upscaler-v1/upscale` | Video Upscaler | PopNow | 6 / second | 1080p: 6; 720p: 6; 2k: 12; 4k: 24 |
