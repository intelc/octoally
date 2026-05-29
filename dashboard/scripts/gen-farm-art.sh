#!/usr/bin/env bash
# Generate the Agent Farm sprite set with Nano Banana Pro.
# Each sprite: transparent background, consistent QQ农场 casual-game style.
# Resilient: skips already-generated files, continues past per-image failures.
set -uo pipefail
GEN="/Users/yihengchen/.claude/skills/generate_images/scripts/generate_gemini_image.py"
OUT="$(cd "$(dirname "$0")/.." && pwd)/public/farm-art"
mkdir -p "$OUT"
STYLE="Single game sprite, centered, fully transparent background (alpha), no ground shadow box, \
bright highly saturated QQ农场 casual mobile-game art, thick warm dark outlines, glossy cel-shaded \
cartoon, isometric 2:1 view, no text, no letters, no numbers, no UI frame."

FAIL=0
gen () { # $1=prompt  $2=outfile
  if [ -s "$OUT/$2" ]; then echo "skip (exists): $2"; return 0; fi
  echo "generating: $2"
  if python3 "$GEN" --prompt "$1 $STYLE" --out "$OUT/$2" --prompt-out "$OUT/${2%.png}.prompt.txt" >/dev/null 2>&1; then
    echo "  ok: $2"
  else
    echo "  FAILED: $2"; FAIL=$((FAIL+1))
  fi
}

# Soil tiles (isometric diamond, top surface only)
gen "An empty isometric diamond-shaped tilled soil plot tile, brown furrowed rows, top surface." soil-normal.png
gen "An empty isometric diamond-shaped tilled soil plot tile, very dark rich brown soil, furrowed rows." soil-dark.png
gen "An empty isometric diamond-shaped tilled soil plot tile, reddish-brown clay soil, furrowed rows." soil-red.png
gen "An isometric diamond-shaped patch of lush bright green grass, top surface only." grass-tile.png

# Crops: 6 kinds x 3 stages (seed sprout / growing / ripe)
while IFS=':' read -r kind seed growing ripe; do
  [ -z "$kind" ] && continue
  gen "A $seed." "crop-$kind-seed.png"
  gen "A $growing." "crop-$kind-growing.png"
  gen "A $ripe." "crop-$kind-ripe.png"
done <<'CROPS'
bugfix:tiny green strawberry sprout in a soil mound:small leafy strawberry plant with white flowers, no fruit:full strawberry plant with several ripe red strawberries
feature:tiny tree seedling sprout in soil:young small apple tree with green leaves:full lush apple tree with many ripe red apples
refactor:tiny corn sprout in soil:young green corn stalk:tall corn stalks with ripe golden corn cobs
test:tiny grape vine sprout in soil:young grape vine on a small wooden trellis, no fruit:grape vine on a trellis with bunches of ripe purple grapes
docs:tiny carrot leaf sprout in soil:small leafy carrot tops:full carrot with big leafy green tops and an orange root peeking from soil
generic:tiny wheat sprout in soil:young green wheat shoots:tall ripe golden wheat bundle
CROPS

# State overlay badges (small floating icon, no crop)
gen "A cute floating glossy blue water droplet speech-bubble icon." overlay-thirsty.png
gen "A few cute cartoon green garden bugs and beetles crawling, small cluster." overlay-bugged.png
gen "A small wilted brown drooping dead-leaf sad indicator." overlay-withered.png
gen "A small floating sleepy 'Zzz' sleep bubble icon." overlay-resting.png
gen "A bright golden sparkle star-burst 'ready' icon." overlay-ripe.png

echo "DONE. failures=$FAIL"
echo "$FAIL" > "$OUT/.gen-failures"
