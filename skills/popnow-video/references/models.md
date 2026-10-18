# PopNow video models

Snapshot of `GET /api/v1/models` taken 2026-10-17. Prices are in credits (1 credit = $0.01) and are the starting price per unit; the exact amount of one request comes from `popnow.py quote`. The live list is always the source of truth: `popnow.py models --modality video`.

Model IDs follow `<maker>/<model>/<task>`. Read a model's input fields with `popnow.py model <id>`.

## Text to video

| Model ID | Name | Maker | Price (credits) | Tiers |
| --- | --- | --- | --- | --- |
| `alibaba/happyhorse-1.1/text-to-video` | HappyHorse 1.1 | Alibaba | 21 / second, up to 15s | 720p: 21; 1080p: 27 |
| `alibaba/wan-2.1-lora/text-to-video` | Wan 2.1 LoRA | Alibaba | 36 / run | duration_seconds=5, resolution=480p: 36; duration_seconds=10, resolution=480p: 54; duration_seconds=5, resolution=720p: 54; duration_seconds=10, resolution=720p: 81 |
| `alibaba/wan-2.2-5b-lora/text-to-video` | Wan 2.2 5B LoRA | Alibaba | 18 / run | - |
| `alibaba/wan-2.2-lora/text-to-video` | Wan 2.2 LoRA | Alibaba | 7.2 / second | 480p: 7.2; 720p: 12.6 |
| `alibaba/wan-2.2/text-to-video` | Wan 2.2 | Alibaba | 36 / run | 480p: 36; 720p: 72 |
| `alibaba/wan-2.5/text-to-video` | Wan 2.5 | Alibaba | 6.75 / second | 480p: 6.75; 720p: 13.5; 1080p: 20.25 |
| `alibaba/wan-2.6/text-to-video` | Wan 2.6 | Alibaba | 13.5 / second | 720p: 13.5; 1080p: 20.25 |
| `alibaba/wan-3.0-prime/text-to-video` | Wan 3.0 Prime | Alibaba | 9.18 / second | 480p: 9.18; 720p: 18.9; 1080p: 37.8 |
| `alibaba/wan-3.0-pro-prime/text-to-video` | Wan 3.0 Pro Prime | Alibaba | 35.1 / second | 1080p: 35.1; 2k: 37.8; 4k: 41.85 |
| `alibaba/wan-3.0-pro/text-to-video` | Wan 3.0 Pro | Alibaba | 21.6 / second | 1080p: 21.6; 2k: 24; 4k: 27.6 |
| `alibaba/wan-3.0/text-to-video` | Wan 3.0 | Alibaba | 6.75 / second | 480p: 6.75; 720p: 13.5; 1080p: 27 |
| `black-forest-labs/flux-3/text-to-video` | FLUX 3 | Black Forest Labs | 9 / second | quality=draft, resolution=1080p: 9; quality=draft, resolution=720p: 9; quality=standard, resolution=720p: 25.5; quality=standard, resolution=1080p: 43.5 |
| `bytedance/seedance-1.5-pro/text-to-video` | Seedance 1.5 Pro | ByteDance | 1.68 / second, up to 12s | generate_audio=false, resolution=480p: 1.68; generate_audio=true, resolution=480p: 3.35; generate_audio=false, resolution=720p: 3.41; generate_audio=true, resolution=720p: 6.81; generate_audio=false, resolution=1080p: 7.36; generate_audio=true, resolution=1080p: 14.73 |
| `bytedance/seedance-2.0-fast/text-to-video` | Seedance 2.0 Fast | ByteDance | 6.75 / second | generate_audio=false, resolution=480p: 6.75; generate_audio=true, resolution=480p: 6.75; enable_web_search=true, generate_audio=false, resolution=480p: 10.53; enable_web_search=true, generate_audio=true, resolution=480p: 10.53; generate_audio=false, resolution=720p: 14.52; generate_audio=true, resolution=720p: 14.52 ... |
| `bytedance/seedance-2.0-mini/text-to-video` | Seedance 2.0 Mini | ByteDance | 3.69 / second | generate_audio=false, resolution=480p: 3.69; generate_audio=true, resolution=480p: 3.69; generate_audio=false, resolution=720p: 7.94; generate_audio=true, resolution=720p: 7.94 |
| `bytedance/seedance-2.0/text-to-video` | Seedance 2.0 | ByteDance | 10.5 / second | generate_audio=false, resolution=480p: 10.5; generate_audio=true, resolution=480p: 10.5; enable_web_search=true, generate_audio=false, resolution=480p: 17.1; enable_web_search=true, generate_audio=true, resolution=480p: 17.1; generate_audio=false, resolution=720p: 22.8; generate_audio=true, resolution=720p: 22.8 ... |
| `bytedance/seedance-2.5/text-to-video` | Seedance 2.5 | ByteDance | 18.51 / second | generate_audio=false, resolution=480p: 18.51; generate_audio=true, resolution=480p: 18.51; generate_audio=false, resolution=720p: 41.6; generate_audio=true, resolution=720p: 41.6; generate_audio=false, resolution=1080p: 102.35; generate_audio=true, resolution=1080p: 102.35 |
| `kling/2.1-master/text-to-video` | Kling 2.1 Master | Kuaishou | 32.4 / second | - |
| `kling/2.5-turbo/text-to-video` | Kling 2.5 Turbo | Kuaishou | 8.4 / second | - |
| `kling/2.6/text-to-video` | Kling 2.6 | Kuaishou | 10.35 / second | false: 10.35; true: 20.7 |
| `kling/3.0-turbo/text-to-video` | Kling 3.0 Turbo | Kuaishou | 16.8 / second, up to 15s | 720p: 16.8; 1080p: 21 |
| `kling/3.0/text-to-video` | Kling 3.0 | Kuaishou | 10.08 / second, up to 15s | generate_audio=false, resolution=720p: 10.08; generate_audio=false, resolution=1080p: 13.44; generate_audio=true, resolution=720p: 15.12; generate_audio=true, resolution=1080p: 20.16; generate_audio=false, resolution=4k: 50.4; generate_audio=true, resolution=4k: 50.4 |
| `kling/4.0/text-to-video` | Kling 4.0 | Kuaishou | 32.4 / second, up to 30s | 720p: 32.4; 1080p: 48.6 |
| `kling/o3/text-to-video` | Kling O3 | Kuaishou | 10.08 / second, up to 15s | generate_audio=false, resolution=720p: 10.08; generate_audio=false, resolution=1080p: 13.44; generate_audio=true, resolution=720p: 13.44; generate_audio=true, resolution=1080p: 16.8; generate_audio=false, resolution=4k: 50.4; generate_audio=true, resolution=4k: 50.4 |
| `lightricks/ltx-2-19b-lora/text-to-video` | LTX-2 19B LoRA | Lightricks | 2.7 / second, up to 20s | 480p: 2.7; 720p: 3.6; 1080p: 5.4 |
| `lightricks/ltx-2-19b/text-to-video` | LTX-2 19B | Lightricks | 2.16 / second, up to 20s | 480p: 2.16; 720p: 2.88; 1080p: 4.32 |
| `lightricks/ltx-2.3-lora/text-to-video` | LTX-2.3 LoRA | Lightricks | 3.6 / second, up to 20s | 480p: 3.6; 720p: 5.4; 1080p: 7.2 |
| `lightricks/ltx-2.5/text-to-video` | LTX 2.5 | Lightricks | 13.5 / second, up to 20s | 720p: 13.5; 1080p: 19.5; 2k: 28.5; 4k: 45 |
| `minimax/h3-lora/text-to-video` | MiniMax H3 LoRA | MiniMax | 7.5 / second, up to 15s | 480p: 7.5; 540p: 11.25; 768p: 15; 1080p: 30 |
| `minimax/h3-max/text-to-video` | MiniMax H3 Max | MiniMax | 7.5 / second, up to 15s | 480p: 7.5; 768p: 12 |
| `minimax/h3/text-to-video` | MiniMax H3 | MiniMax | 5.55 / second, up to 15s | 768p: 5.55; 2k: 8.7 |
| `tencent/hunyuan-video-1.5/text-to-video` | HunyuanVideo 1.5 | Tencent | 3.6 / second | 480p: 3.6; 720p: 7.2 |

## Image to video

| Model ID | Name | Maker | Price (credits) | Tiers |
| --- | --- | --- | --- | --- |
| `alibaba/happyhorse-1.1/image-to-video` | HappyHorse 1.1 | Alibaba | 21 / second, up to 15s | 720p: 21; 1080p: 27 |
| `alibaba/wan-2.1-lora/image-to-video` | Wan 2.1 LoRA | Alibaba | 36 / run | duration_seconds=5, resolution=480p: 36; duration_seconds=10, resolution=480p: 54; duration_seconds=5, resolution=720p: 54; duration_seconds=10, resolution=720p: 81 |
| `alibaba/wan-2.2-5b-lora/image-to-video` | Wan 2.2 5B LoRA | Alibaba | 18 / run | - |
| `alibaba/wan-2.2-lora/image-to-video` | Wan 2.2 LoRA | Alibaba | 3.6 / second | 480p: 3.6; 720p: 7.2 |
| `alibaba/wan-2.2/image-to-video` | Wan 2.2 | Alibaba | 36 / run | 480p: 36; 720p: 72 |
| `alibaba/wan-2.5/image-to-video` | Wan 2.5 | Alibaba | 6.75 / second | 480p: 6.75; 720p: 13.5; 1080p: 20.25 |
| `alibaba/wan-2.6-flash/image-to-video` | Wan 2.6 Flash | Alibaba | 3.38 / second | generate_audio=false, resolution=720p: 3.38; generate_audio=false, resolution=1080p: 5.06; generate_audio=true, resolution=720p: 6.75; generate_audio=true, resolution=1080p: 10.13 |
| `alibaba/wan-2.6/image-to-video` | Wan 2.6 | Alibaba | 13.5 / second | 720p: 13.5; 1080p: 20.25 |
| `alibaba/wan-3.0-prime/image-to-video` | Wan 3.0 Prime | Alibaba | 9.18 / second | 480p: 9.18; 720p: 18.9; 1080p: 37.8 |
| `alibaba/wan-3.0-pro-prime/image-to-video` | Wan 3.0 Pro Prime | Alibaba | 35.1 / second | 1080p: 35.1; 2k: 37.8; 4k: 41.85 |
| `alibaba/wan-3.0-pro/image-to-video` | Wan 3.0 Pro | Alibaba | 21.6 / second | 1080p: 21.6; 2k: 24; 4k: 27.6 |
| `alibaba/wan-3.0/image-to-video` | Wan 3.0 | Alibaba | 6.75 / second | 480p: 6.75; 720p: 13.5; 1080p: 27 |
| `black-forest-labs/flux-3/image-to-video` | FLUX 3 | Black Forest Labs | 9 / second | quality=draft, resolution=1080p: 9; quality=draft, resolution=720p: 9; quality=standard, resolution=720p: 25.5; quality=standard, resolution=1080p: 43.5 |
| `bytedance/seedance-1.5-pro/image-to-video` | Seedance 1.5 Pro | ByteDance | 1.68 / second, up to 12s | generate_audio=false, resolution=480p: 1.68; generate_audio=true, resolution=480p: 3.35; generate_audio=false, resolution=720p: 3.41; generate_audio=true, resolution=720p: 6.81; generate_audio=false, resolution=1080p: 7.36; generate_audio=true, resolution=1080p: 14.73 |
| `bytedance/seedance-2.0-fast/image-to-video` | Seedance 2.0 Fast | ByteDance | 6.75 / second | generate_audio=false, resolution=480p: 6.75; generate_audio=true, resolution=480p: 6.75; generate_audio=false, resolution=720p: 14.52; generate_audio=true, resolution=720p: 14.52 |
| `bytedance/seedance-2.0-mini/image-to-video` | Seedance 2.0 Mini | ByteDance | 3.69 / second | generate_audio=false, resolution=480p: 3.69; generate_audio=true, resolution=480p: 3.69; enable_web_search=true, generate_audio=false, resolution=480p: 5.4; enable_web_search=true, generate_audio=true, resolution=480p: 5.4; generate_audio=false, resolution=720p: 7.94; generate_audio=true, resolution=720p: 7.94 ... |
| `bytedance/seedance-2.0/image-to-video` | Seedance 2.0 | ByteDance | 10.5 / second | generate_audio=false, resolution=480p: 10.5; generate_audio=true, resolution=480p: 10.5; generate_audio=false, resolution=720p: 22.8; generate_audio=true, resolution=720p: 22.8; generate_audio=false, resolution=1080p: 56.1; generate_audio=true, resolution=1080p: 56.1 ... |
| `bytedance/seedance-2.5/image-to-video` | Seedance 2.5 | ByteDance | 18.51 / second | generate_audio=false, resolution=480p: 18.51; generate_audio=true, resolution=480p: 18.51; generate_audio=false, resolution=720p: 41.6; generate_audio=true, resolution=720p: 41.6; generate_audio=false, resolution=1080p: 102.35; generate_audio=true, resolution=1080p: 102.35 |
| `kling/2.1-master/image-to-video` | Kling 2.1 Master | Kuaishou | 32.4 / second | - |
| `kling/2.1/image-to-video` | Kling 2.1 | Kuaishou | 5.25 / second | 720p: 5.25; 1080p: 10.2 |
| `kling/2.5-turbo/image-to-video` | Kling 2.5 Turbo | Kuaishou | 8.4 / second | - |
| `kling/2.6/image-to-video` | Kling 2.6 | Kuaishou | 10.35 / second | false: 10.35; true: 20.7 |
| `kling/3.0-turbo/image-to-video` | Kling 3.0 Turbo | Kuaishou | 16.8 / second, up to 15s | 720p: 16.8; 1080p: 21 |
| `kling/3.0/image-to-video` | Kling 3.0 | Kuaishou | 10.08 / second, up to 15s | generate_audio=false, resolution=720p: 10.08; generate_audio=false, resolution=1080p: 13.44; generate_audio=true, resolution=720p: 15.12; generate_audio=true, resolution=1080p: 20.16; generate_audio=false, resolution=4k: 50.4; generate_audio=true, resolution=4k: 50.4 |
| `kling/4.0/image-to-video` | Kling 4.0 | Kuaishou | 32.4 / second, up to 30s | 720p: 32.4; 1080p: 48.6 |
| `kling/o3/image-to-video` | Kling O3 | Kuaishou | 10.08 / second, up to 15s | generate_audio=false, resolution=720p: 10.08; generate_audio=false, resolution=1080p: 13.44; generate_audio=true, resolution=720p: 13.44; generate_audio=true, resolution=1080p: 16.8; generate_audio=false, resolution=4k: 50.4; generate_audio=true, resolution=4k: 50.4 |
| `lightricks/ltx-2-19b-lora/image-to-video` | LTX-2 19B LoRA | Lightricks | 2.7 / second, up to 20s | 480p: 2.7; 720p: 3.6; 1080p: 5.4 |
| `lightricks/ltx-2-19b/image-to-video` | LTX-2 19B | Lightricks | 2.16 / second, up to 20s | 480p: 2.16; 720p: 2.88; 1080p: 4.32 |
| `lightricks/ltx-2.3-lora/image-to-video` | LTX-2.3 LoRA | Lightricks | 3.6 / second, up to 20s | 480p: 3.6; 720p: 5.4; 1080p: 7.2 |
| `lightricks/ltx-2.5/image-to-video` | LTX 2.5 | Lightricks | 13.5 / second, up to 20s | 720p: 13.5; 1080p: 19.5; 2k: 28.5; 4k: 45 |
| `minimax/h3-360-orbit/image-to-video` | MiniMax H3 360 Orbit | MiniMax | 7.5 / second, up to 6s | 480p: 7.5; 540p: 11.25; 768p: 15; 1080p: 30 |
| `minimax/h3-lora/image-to-video` | MiniMax H3 LoRA | MiniMax | 7.5 / second, up to 15s | 480p: 7.5; 540p: 11.25; 768p: 15; 1080p: 30 |
| `minimax/h3-max/image-to-video` | MiniMax H3 Max | MiniMax | 7.5 / second, up to 15s | 480p: 7.5; 768p: 12 |
| `minimax/h3-singularity-lora/image-to-video` | MiniMax H3 Singularity LoRA | MiniMax | 9.38 / second, up to 15s | 480p: 9.38; 540p: 14.06; 768p: 18.75; 1080p: 37.5 |
| `minimax/h3/image-to-video` | MiniMax H3 | MiniMax | 5.55 / second, up to 15s | 768p: 5.55; 2k: 8.7 |
| `tencent/hunyuan-video-1.5/image-to-video` | HunyuanVideo 1.5 | Tencent | 3.6 / second | 480p: 3.6; 720p: 7.2 |
| `vidu/q3-pro/image-to-video` | Vidu Q3 Pro | Vidu | 8.1 / second, up to 16s | - |
| `vidu/q3-turbo/image-to-video` | Vidu Q3 Turbo | Vidu | 6.3 / second, up to 16s | 540p: 6.3; 720p: 9.9 |
| `vidu/q3/image-to-video` | Vidu Q3 | Vidu | 10.5 / second, up to 16s | 540p: 10.5; 720p: 22.5; 1080p: 24 |
| `vidu/q4-preview/image-to-video` | Vidu Q4 Preview | Vidu | 6.75 / second, up to 16s | 540p: 6.75; 720p: 14.25; 1080p: 18; 2k: 28.5; 4k: 58.5 |

## Reference to video

| Model ID | Name | Maker | Price (credits) | Tiers |
| --- | --- | --- | --- | --- |
| `alibaba/happyhorse-1.1/reference-to-video` | HappyHorse 1.1 | Alibaba | 21 / second, up to 15s | 720p: 21; 1080p: 27 |
| `alibaba/wan-2.6-flash/reference-to-video` | Wan 2.6 Flash | Alibaba | 3.38 / second, up to 10s | generate_audio=false, resolution=720p: 3.38; generate_audio=false, resolution=1080p: 5.06; generate_audio=true, resolution=720p: 6.75; generate_audio=true, resolution=1080p: 10.13 |
| `alibaba/wan-2.6/reference-to-video` | Wan 2.6 | Alibaba | 9.75 / second, up to 10s | 720p: 9.75; 1080p: 14.62 |
| `alibaba/wan-3.0-prime/reference-to-video` | Wan 3.0 Prime | Alibaba | 9.18 / second | 480p: 9.18; 720p: 18.9; 1080p: 37.8 |
| `alibaba/wan-3.0-pro-prime/reference-to-video` | Wan 3.0 Pro Prime | Alibaba | 35.1 / second | 1080p: 35.1; 2k: 37.8; 4k: 41.85 |
| `alibaba/wan-3.0-pro/reference-to-video` | Wan 3.0 Pro | Alibaba | 21.6 / second | 1080p: 21.6; 2k: 24; 4k: 27.6 |
| `alibaba/wan-3.0/reference-to-video` | Wan 3.0 | Alibaba | 6.75 / second | 480p: 6.75; 720p: 13.5; 1080p: 27 |
| `bytedance/seedance-2.0-fast/reference-to-video` | Seedance 2.0 Fast | ByteDance | 3.38 / second | generate_audio=false, resolution=480p, with_video=true: 3.38; generate_audio=true, resolution=480p, with_video=true: 3.38; generate_audio=false, resolution=480p, with_video=false: 6.75; generate_audio=true, resolution=480p, with_video=false: 6.75; generate_audio=false, resolution=720p, with_video=true: 7.27; generate_audio=true, resolution=720p, with_video=true: 7.27 ... |
| `bytedance/seedance-2.0-mini/reference-to-video` | Seedance 2.0 Mini | ByteDance | 1.65 / second | generate_audio=false, resolution=480p, with_video=true: 1.65; generate_audio=true, resolution=480p, with_video=true: 1.65; generate_audio=false, resolution=720p, with_video=true: 3.54; generate_audio=true, resolution=720p, with_video=true: 3.54; generate_audio=false, resolution=480p, with_video=false: 3.69; generate_audio=true, resolution=480p, with_video=false: 3.69 ... |
| `bytedance/seedance-2.0/reference-to-video` | Seedance 2.0 | ByteDance | 6.47 / second | generate_audio=false, resolution=480p, with_video=true: 6.47; generate_audio=true, resolution=480p, with_video=true: 6.47; generate_audio=false, resolution=480p, with_video=false: 10.5; generate_audio=true, resolution=480p, with_video=false: 10.5; generate_audio=false, resolution=720p, with_video=true: 13.92; generate_audio=true, resolution=720p, with_video=true: 13.92 ... |
| `bytedance/seedance-2.5/reference-to-video` | Seedance 2.5 | ByteDance | 11.07 / second | generate_audio=false, resolution=480p, with_video=true: 11.07; generate_audio=true, resolution=480p, with_video=true: 11.07; generate_audio=false, resolution=480p, with_video=false: 18.51; generate_audio=true, resolution=480p, with_video=false: 18.51; generate_audio=false, resolution=720p, with_video=true: 24.89; generate_audio=true, resolution=720p, with_video=true: 24.89 ... |
| `kling/4.0/reference-to-video` | Kling 4.0 | Kuaishou | 32.4 / second, up to 30s | 720p: 32.4; 1080p: 48.6 |
| `kling/o3/reference-to-video` | Kling O3 | Kuaishou | 10.08 / second, up to 15s | generate_audio=false, resolution=720p: 10.08; generate_audio=false, resolution=1080p: 13.44; generate_audio=true, resolution=720p: 13.44; generate_audio=false, resolution=720p, with_video=true: 15.12; generate_audio=true, resolution=1080p: 16.8; generate_audio=false, resolution=1080p, with_video=true: 20.16 ... |
| `minimax/h3-lora/reference-to-video` | MiniMax H3 LoRA | MiniMax | 9 / second, up to 15s | 480p: 9; 540p: 13.5; 768p: 18; 1080p: 36 |
| `minimax/h3-singularity-lora/reference-to-video` | MiniMax H3 Singularity LoRA | MiniMax | 9 / second, up to 15s | 480p: 9; 540p: 13.5; 768p: 18; 1080p: 36 |
| `minimax/h3/reference-to-video` | MiniMax H3 | MiniMax | 5.55 / second, up to 15s | 768p: 5.55; 2k: 8.7 |
| `vidu/q4-preview/reference-to-video` | Vidu Q4 Preview | Vidu | 6.75 / second, up to 16s | 540p: 6.75; 720p: 14.25; 1080p: 18; 2k: 28.5; 4k: 58.5 |

## Extend a video

| Model ID | Name | Maker | Price (credits) | Tiers |
| --- | --- | --- | --- | --- |
| `alibaba/wan-2.2-lora/video-extend` | Wan 2.2 LoRA | Alibaba | 3.6 / second | 480p: 3.6; 720p: 7.2 |
| `alibaba/wan-2.5/video-extend` | Wan 2.5 | Alibaba | 6.75 / second | 480p: 6.75; 720p: 13.5; 1080p: 20.25 |
| `alibaba/wan-3.0-prime/video-extend` | Wan 3.0 Prime | Alibaba | 9.18 / second | 480p: 9.18; 720p: 18.9; 1080p: 37.8 |
| `alibaba/wan-3.0-pro-prime/video-extend` | Wan 3.0 Pro Prime | Alibaba | 35.1 / second | 1080p: 35.1; 2k: 37.8; 4k: 41.85 |
| `alibaba/wan-3.0-pro/video-extend` | Wan 3.0 Pro | Alibaba | 21.6 / second | 1080p: 21.6; 2k: 24; 4k: 27.6 |
| `alibaba/wan-3.0/video-extend` | Wan 3.0 | Alibaba | 6.75 / second | 480p: 6.75; 720p: 13.5; 1080p: 27 |
| `black-forest-labs/flux-3/video-extend` | FLUX 3 | Black Forest Labs | 18 / second | quality=draft, resolution=1080p: 18; quality=draft, resolution=720p: 18; quality=standard, resolution=720p: 61.5; quality=standard, resolution=1080p: 79.5 |
| `bytedance/seedance-1.5-pro/video-extend` | Seedance 1.5 Pro | ByteDance | 1.68 / second, up to 12s | generate_audio=false, resolution=480p: 1.68; generate_audio=true, resolution=480p: 3.35; generate_audio=false, resolution=720p: 3.41; generate_audio=true, resolution=720p: 6.81; generate_audio=false, resolution=1080p: 7.36; generate_audio=true, resolution=1080p: 14.73 |
| `bytedance/seedance-2.0-fast/video-extend` | Seedance 2.0 Fast | ByteDance | 6.75 / second | generate_audio=false, resolution=480p: 6.75; generate_audio=true, resolution=480p: 6.75; generate_audio=false, resolution=720p: 14.52; generate_audio=true, resolution=720p: 14.52 |
| `bytedance/seedance-2.0-mini/video-extend` | Seedance 2.0 Mini | ByteDance | 3.69 / second | generate_audio=false, resolution=480p: 3.69; generate_audio=true, resolution=480p: 3.69; enable_web_search=true, generate_audio=false, resolution=480p: 5.4; enable_web_search=true, generate_audio=true, resolution=480p: 5.4; generate_audio=false, resolution=720p: 7.94; generate_audio=true, resolution=720p: 7.94 ... |
| `bytedance/seedance-2.0/video-extend` | Seedance 2.0 | ByteDance | 10.5 / second | generate_audio=false, resolution=480p: 10.5; generate_audio=true, resolution=480p: 10.5; generate_audio=false, resolution=720p: 22.8; generate_audio=true, resolution=720p: 22.8; generate_audio=false, resolution=1080p: 56.1; generate_audio=true, resolution=1080p: 56.1 ... |
| `bytedance/seedance-2.5/video-extend` | Seedance 2.5 | ByteDance | 11.07 / second | generate_audio=false, resolution=480p, with_video=true: 11.07; generate_audio=true, resolution=480p, with_video=true: 11.07; generate_audio=false, resolution=480p, with_video=false: 18.51; generate_audio=true, resolution=480p, with_video=false: 18.51; generate_audio=false, resolution=720p, with_video=true: 24.89; generate_audio=true, resolution=720p, with_video=true: 24.89 ... |
| `lightricks/ltx-2-19b/video-extend` | LTX-2 19B | Lightricks | 2.16 / second, up to 20s | 480p: 2.16; 720p: 2.88; 1080p: 4.32 |
| `minimax/h3-lora/video-extend` | MiniMax H3 LoRA | MiniMax | 7.5 / second, up to 15s | 480p: 7.5; 540p: 11.25; 768p: 15; 1080p: 30 |
| `minimax/h3-max/video-extend` | MiniMax H3 Max | MiniMax | 7.5 / second, up to 15s | 480p: 7.5; 768p: 12 |
| `minimax/h3-singularity-lora/video-extend` | MiniMax H3 Singularity LoRA | MiniMax | 9.38 / second, up to 15s | 480p: 9.38; 540p: 14.06; 768p: 18.75; 1080p: 37.5 |
| `minimax/h3/video-extend` | MiniMax H3 | MiniMax | 5.55 / second, up to 15s | 768p: 5.55; 2k: 8.7 |
| `vidu/q3-turbo/video-extend` | Vidu Q3 Turbo | Vidu | 6.3 / second, up to 16s | 540p: 6.3; 720p: 9.9 |
| `vidu/q4-preview/video-extend` | Vidu Q4 Preview | Vidu | 6.75 / second, up to 16s | 540p: 6.75; 720p: 14.25; 1080p: 18; 2k: 28.5; 4k: 58.5 |

## Edit, animate and upscale video

| Model ID | Name | Maker | Price (credits) | Tiers |
| --- | --- | --- | --- | --- |
| `alibaba/wan-2.1-lora/video-edit` | Wan 2.1 LoRA | Alibaba | 36 / run | duration_seconds=5, resolution=480p: 36; duration_seconds=10, resolution=480p: 54; duration_seconds=5, resolution=720p: 54; duration_seconds=10, resolution=720p: 81 |
| `alibaba/wan-2.2-animate/character-animation` | Wan 2.2 Animate | Alibaba | 7.95 / second | 480p: 7.95; 720p: 16.5 |
| `black-forest-labs/flux-3/upscale` | FLUX 3 | Black Forest Labs | 79.2 / second | precise: 79.2; creative: 113.76 |
| `kling/2.6/character-animation` | Kling 2.6 | Kuaishou | 10.35 / second | 720p: 10.35; 1080p: 16.8 |
| `kling/3.0/character-animation` | Kling 3.0 | Kuaishou | 15.12 / second | 720p: 15.12; 1080p: 20.16 |
| `kling/o3/video-edit` | Kling O3 | Kuaishou | 18.78 / second | 720p: 18.78; 1080p: 25.2 |
| `popnow/video-upscaler-v1/upscale` | Video Upscaler | PopNow | 0.9 / second | 1080p: 0.9; 720p: 0.9; 2k: 1.8; 4k: 3.6 |
