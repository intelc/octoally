#!/usr/bin/env bash
# Generate Agent Farm decoration sprites (Phase 4). Same style as gen-farm-art.sh.
set -uo pipefail
GEN="/Users/yihengchen/.claude/skills/generate_images/scripts/generate_gemini_image.py"
OUT="$(cd "$(dirname "$0")/.." && pwd)/public/farm-art"
mkdir -p "$OUT"
STYLE="Single game sprite, centered, fully transparent background (alpha), no ground shadow box, \
bright highly saturated QQ农场 casual mobile-game art, thick warm dark outlines, glossy cel-shaded \
cartoon, isometric 2:1 view, no text, no letters, no numbers, no UI frame."
gen () { [ -s "$OUT/$2" ] && { echo "skip $2"; return; }; python3 "$GEN" --prompt "$1 $STYLE" --out "$OUT/$2" --prompt-out "$OUT/${2%.png}.prompt.txt" >/dev/null 2>&1 && echo "ok $2" || echo "FAIL $2"; }

gen "An isometric cute cartoon farmhouse with a golden thatched straw roof, wooden log walls and a small chimney." decor-house.png
gen "An isometric small round blue pond with a little wooden dock and green lily pads." decor-pond.png
gen "An isometric big round leafy bright green cartoon tree with a sturdy brown trunk." decor-tree.png
gen "An isometric short brown wooden plank fence segment with two posts." decor-fence.png
gen "A cute chubby cartoon farmer character wearing blue denim overalls and a straw hat, smiling, standing facing forward." decor-farmer.png
echo "decor done"
