#!/usr/bin/env python3
import os, io, json, zipfile, textwrap
from datetime import datetime
from PIL import Image, ImageOps, ImageDraw
import numpy as np

INPUT_CANDIDATES = [
    "logo_input.png","logo_input.jpg","logo_input.jpeg","logo_input.webp","logo_input.tif","logo_input.tiff"
]

def find_input(path="."):
    for name in INPUT_CANDIDATES:
        p = os.path.join(path, name)
        if os.path.exists(p):
            return p
    # Fallback: pick the largest image file in the folder
    exts = (".png",".jpg",".jpeg",".webp",".bmp",".tif",".tiff",".gif")
    cands = []
    for f in os.listdir(path):
        if f.lower().endswith(exts):
            fp = os.path.join(path, f)
            cands.append((os.path.getsize(fp), fp))
    if cands:
        cands.sort(reverse=True)
        return cands[0][1]
    raise FileNotFoundError("Place your logo as 'logo_input.png' (or .jpg/.webp/.tiff) in this folder and re-run.")

def remove_near_white_bg(img, threshold=245, tolerance=15):
    arr = np.array(img.convert("RGBA"))
    r,g,b,a = arr[...,0], arr[...,1], arr[...,2], arr[...,3]
    max_rgb = np.maximum(np.maximum(r,g), b)
    min_rgb = np.minimum(np.minimum(r,g), b)
    near_white = (max_rgb > threshold) & ((max_rgb - min_rgb) < tolerance)
    arr[...,3] = np.where(near_white, 0, a)
    return Image.fromarray(arr, mode="RGBA")

def fit_on_square(img, size, pad_ratio=0.1):
    canvas = Image.new("RGBA", (size, size), (0,0,0,0))
    w, h = img.size
    max_side = int(size*(1 - 2*pad_ratio))
    scale = min(max_side/w, max_side/h)
    new_w, new_h = max(1, int(w*scale)), max(1, int(h*scale))
    img_resized = img.resize((new_w, new_h), Image.LANCZOS)
    x = (size - new_w)//2
    y = (size - new_h)//2
    canvas.paste(img_resized, (x,y), img_resized)
    return canvas

def center_on_canvas(img, w, h, pad_ratio=0.12):
    canvas = Image.new("RGBA", (w,h), (255,255,255,0))
    max_w = int(w*(1-2*pad_ratio))
    max_h = int(h*(1-2*pad_ratio))
    scale = min(max_w/img.width, max_h/img.height)
    new = img.resize((max(1, int(img.width*scale)), max(1, int(img.height*scale))), Image.LANCZOS)
    x = (w - new.width)//2
    y = (h - new.height)//2
    canvas.paste(new, (x,y), new)
    return canvas

def ensure(path): os.makedirs(path, exist_ok=True); return path

def main():
    src_path = find_input(".")
    im = Image.open(src_path).convert("RGBA")
    im_trans = remove_near_white_bg(im)

    OUT_ROOT = "logo_asset_pack"
    SRC_DIR = ensure(os.path.join(OUT_ROOT, "source"))
    WEB_DIR = ensure(os.path.join(OUT_ROOT, "web"))
    IOS_DIR = ensure(os.path.join(OUT_ROOT, "ios"))
    ANDROID_DIR = ensure(os.path.join(OUT_ROOT, "android"))
    DESKTOP_DIR = ensure(os.path.join(OUT_ROOT, "desktop"))
    EMOJI_DIR = ensure(os.path.join(OUT_ROOT, "emoji"))
    PRINT_DIR = ensure(os.path.join(OUT_ROOT, "print"))
    FLAGS_DIR = ensure(os.path.join(OUT_ROOT, "flags"))
    SOCIAL_DIR = ensure(os.path.join(OUT_ROOT, "social"))

    # Save sources
    im.save(os.path.join(SRC_DIR, f"original_{os.path.basename(src_path)}"))
    im_trans.save(os.path.join(SRC_DIR, "logo_transparent.png"))

    # Web favicons & PWA
    favicon_sizes = [16,32,48]
    ico_imgs = []
    for s in favicon_sizes:
        icon = fit_on_square(im_trans, s, 0.08)
        icon.save(os.path.join(WEB_DIR, f"favicon-{s}.png"))
        ico_imgs.append(icon)
    ico_imgs[0].save(os.path.join(WEB_DIR, "favicon.ico"), sizes=[(s,s) for s in favicon_sizes])
    fit_on_square(im_trans, 180, 0.10).save(os.path.join(WEB_DIR, "apple-touch-icon-180.png"))
    for s in (192,256,384,512):
        fit_on_square(im_trans, s, 0.10).save(os.path.join(WEB_DIR, f"icon-{s}.png"))
    fit_on_square(im_trans, 512, 0.18).save(os.path.join(WEB_DIR, "maskable-icon-512.png"))
    manifest = {
        "name":"Your App","short_name":"App",
        "icons":[
            {"src":"icon-192.png","sizes":"192x192","type":"image/png"},
            {"src":"icon-512.png","sizes":"512x512","type":"image/png"},
            {"src":"maskable-icon-512.png","sizes":"512x512","type":"image/png","purpose":"maskable any"}
        ],
        "theme_color":"#0B5FA5",
        "background_color":"#FFFFFF",
        "display":"standalone"
    }
    with open(os.path.join(WEB_DIR,"site.webmanifest"),"w") as f: json.dump(manifest, f, indent=2)

    # Social
    fit_on_square(im_trans, 1200, 0.20).save(os.path.join(SOCIAL_DIR, "og-1200x1200.png"))
    def center_on(img, w, h, pad_ratio=0.12):
        return center_on_canvas(img, w, h, pad_ratio)
    center_on(im_trans, 1200, 630, 0.12).save(os.path.join(SOCIAL_DIR, "og-1200x630.png"))

    # iOS
    ios_sizes = [20,29,40,60,76,83]
    scales = [1,2,3]
    for base in ios_sizes:
        for scale in scales:
            size = base*scale
            if base == 83 and scale == 1: 
                continue
            fit_on_square(im_trans, size, 0.12).save(os.path.join(IOS_DIR, f"Icon-{base}pt@{scale}x-{size}.png"))
    fit_on_square(im_trans, 167, 0.12).save(os.path.join(IOS_DIR, "Icon-83.5pt@2x-167.png"))
    fit_on_square(im_trans, 1024, 0.12).save(os.path.join(IOS_DIR, "AppStore-1024.png"))

    # Android
    android_sizes = {
        "mipmap-mdpi":48,"mipmap-hdpi":72,"mipmap-xhdpi":96,"mipmap-xxhdpi":144,"mipmap-xxxhdpi":192
    }
    for folder, px in android_sizes.items():
        d = ensure(os.path.join(ANDROID_DIR, folder))
        fit_on_square(im_trans, px, 0.10).save(os.path.join(d, "ic_launcher.png"))
    fit_on_square(im_trans, 1024, 0.12).save(os.path.join(ANDROID_DIR, "play-store-1024.png"))
    fit_on_square(im_trans, 512, 0.12).save(os.path.join(ANDROID_DIR, "web_hi_res_512.png"))

    # Desktop
    for s in (128,256,512,1024):
        fit_on_square(im_trans, s, 0.12).save(os.path.join("desktop", f"appicon-{s}.png"))

    # Emoji
    for s in (128,256,512):
        fit_on_square(im_trans, s, 0.08).save(os.path.join("emoji", f"emoji-{s}.png"))

    # Print
    large = fit_on_square(im_trans, 3000, 0.08)
    large.save(os.path.join(PRINT_DIR, "logo-3000x3000.png"))
    large.convert("CMYK").save(os.path.join(PRINT_DIR, "logo-cmyk.tiff"), compression="tiff_lzw")
    large.convert("RGB").save(os.path.join(PRINT_DIR, "logo.pdf"), "PDF")

    # Flags
    def center_canvas(img, w, h, pad_ratio=0.25):
        from PIL import Image
        canvas = Image.new("RGBA",(w,h),(255,255,255,0))
        max_w, max_h = int(w*(1-2*pad_ratio)), int(h*(1-2*pad_ratio))
        scale = min(max_w/img.width, max_h/img.height)
        new = img.resize((max(1,int(img.width*scale)), max(1,int(img.height*scale))), Image.LANCZOS)
        x,y = (w-new.width)//2, (h-new.height)//2
        canvas.paste(new,(x,y),new)
        return canvas
    def flag_mockup(rw, rh, width=1500):
        height = int(width * rh/rw)
        bg = Image.new("RGB", (width, height), (255,255,255))
        placed = center_canvas(im_trans, width, height, 0.25)
        bg.paste(placed.convert("RGB"), (0,0), placed)
        return bg
    flag_mockup(3,2,900).save(os.path.join("flags", "flag-900x600-3x2.png"))
    flag_mockup(5,3,1500).save(os.path.join("flags", "flag-1500x900-5x3.png"))

    # README
    with open(os.path.join(OUT_ROOT,"README.md"),"w") as f:
        f.write(f"# Logo Asset Pack\n\nGenerated: {datetime.utcnow().isoformat()}Z\n\nSee root README for usage.\n")

    print("✅ Done. See the 'logo_asset_pack' folder.")

if __name__ == "__main__":
    main()
