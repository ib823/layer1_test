
# Logo Pack Starter

This bundle includes a generator script that exports a **complete multi‑platform asset pack** from a single logo image.

## Quick Use (here in ChatGPT)

1. Upload your logo next to `build_logo_pack.py` and name it **`logo_input.png`** (JPG/WEBP/TIFF also works).
2. Ask me to run the script. I’ll execute it and return a ZIP for download.

## Local Use

```bash
python3 build_logo_pack.py
```

The output folder will be `logo_asset_pack/` containing:
- `web/` favicons, PWA icons, manifest
- `ios/` full iOS icon set + App Store 1024
- `android/` all mipmap densities + Play Store 1024
- `desktop/` app icons
- `emoji/` 128/256/512
- `social/` OG 1200×630 and 1200×1200
- `print/` 3000×3000 PNG, CMYK TIFF, and PDF
- `flags/` 3:2 and 5:3 canvases

> The script also auto‑removes plain white backgrounds to create a transparent PNG.
