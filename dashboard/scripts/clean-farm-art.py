#!/usr/bin/env python3
"""
Post-process generated farm sprites: Nano Banana renders "transparent background"
as a painted neutral-grey checkerboard (no real alpha). This keys that out to true
transparency via edge-connected flood fill on neutral-grey pixels, then autocrops
each sprite to its content. Idempotent-ish; run after gen-farm-art.sh.

Usage: python3 clean-farm-art.py [dir]   (default: ../public/farm-art)
Requires: pillow, numpy, scipy
"""
import sys, glob, os
from PIL import Image
import numpy as np
from scipy import ndimage

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..', 'public', 'farm-art')

def keyout(path):
    im = Image.open(path).convert('RGBA')
    a = np.asarray(im).astype(np.int16)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    neutral = (mx - mn) < 22  # checkerboard greys are r≈g≈b at any brightness
    lbl, _ = ndimage.label(neutral)
    border = set(np.unique(np.concatenate([lbl[0, :], lbl[-1, :], lbl[:, 0], lbl[:, -1]])))
    border.discard(0)
    bg = np.isin(lbl, list(border))
    bg = ndimage.binary_dilation(bg, iterations=2)  # eat anti-aliased fringe
    out = a.astype(np.uint8)
    out[..., 3] = np.where(bg, 0, 255).astype(np.uint8)
    img = Image.fromarray(out)
    bbox = img.getbbox()
    if bbox:
        x0, y0, x1, y1 = bbox
        pad = 6
        img = img.crop((max(0, x0 - pad), max(0, y0 - pad),
                        min(img.width, x1 + pad), min(img.height, y1 + pad)))
    img.save(path)
    return img.size, float((np.asarray(img)[..., 3] == 0).mean())

if __name__ == '__main__':
    for f in sorted(glob.glob(os.path.join(OUT, '*.png'))):
        size, transp = keyout(f)
        print(f"{os.path.basename(f):28s} -> {size} transp={transp:.0%}")
