#!/usr/bin/env python3
"""Cut the approved illustrated expedition signs out of the composition.

The source is an opaque, flattened concept sheet. Crop each sign with an
antialiased silhouette so the painted camp behind the signs is transparent.
The illustrated artwork, lettering and borders inside each sign are untouched.
The source is kept intact, and these standalone PNGs are bundled by iOS and web.\nThe approved type, gate art, painted copper trim and shaped corners remain\nunaltered. The crop is masked outside the plaque, not repainted in React.
"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/"public/survival/expedition-menu-v2/approved-cards.webp"
DEST=ROOT/"public/survival/expedition-menu-v2/panels"
PANELS={
    # original atlas x, y, width, height; outline in local crop coordinates
    "play":((1280,160,516,298),[
       (29,2),(482,2),(495,13),(510,18),(514,35),
       (514,267),(503,284),(493,293),(27,293),(14,283),
       (1,271),(1,32),(12,16)]),
    "customise":((1288,474,240,170),[
       (98,0),(144,0),(151,6),(218,6),(233,18),(236,31),
       (236,150),(224,164),(18,164),(3,150),(3,20),
       (17,7),(91,7)]),
    "upgrades":((1547,474,242,170),[
       (97,0),(146,0),(154,6),(220,6),(235,18),(239,32),
       (239,150),(225,164),(18,164),(3,150),(3,20),
       (17,7),(90,7)]),
    "friends":((1288,665,504,94),[
       (19,2),(484,2),(499,14),(502,78),(490,91),
       (17,91),(2,78),(2,17)]),
}
def main():
    image=Image.open(SOURCE)
    if image.size!=(1846,852):
        raise RuntimeError(f"Unexpected panel atlas size: {image.size}")
    DEST.mkdir(parents=True,exist_ok=True)
    for name,(bounds,points) in PANELS.items():
        x,y,w,h=bounds
        sample=4
        mask=Image.new("L",(w*sample,h*sample),0)
        ink=ImageDraw.Draw(mask)
        ink.polygon([(px*sample,py*sample) for px,py in points],fill=255)
        mask=mask.resize((w,h),Image.Resampling.LANCZOS)
        panel=image.crop((x,y,x+w,y+h)).convert("RGBA")
        panel.putalpha(mask)
        # Save a real RGBA PNG for Expo/iOS; WebP is also produced for the web
        # deploy's historical extraction step. Neither includes the old camp.
        target=DEST/(name+".png")
        panel.save(target,format="PNG",optimize=True)
        assert Image.open(target).getextrema()[3][0]==0, f"Panel needs alpha: {target}"
        assert panel.getpixel((0,0))[3]==0, f"Old background at corner: {target}"
        webp=DEST/(name+".webp")
        panel.save(webp,format="WEBP",lossless=True,exact=True)
        print(f"Original illustrated transparent plaque: {target.relative_to(ROOT)} ({w}x{h})")
if __name__=="__main__":
    main()
