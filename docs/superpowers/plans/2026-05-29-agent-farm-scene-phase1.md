# Agent Farm — Isometric Scene (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Farm card-grid with an isometric QQ农场-style scene where each agent session renders as a crop on a soil plot, driven by the existing `trpc.farm.plots` adapter.

**Architecture:** DOM-composited transparent-PNG sprites (AI-generated) absolutely positioned over a tiling grass background using isometric screen coordinates. Pure logic (iso math, state→sprite mapping, HUD aggregates) is unit-tested with vitest; visual React components are verified via Vite build + preview screenshots. No backend changes — `trpc.farm.plots` is consumed as-is.

**Tech Stack:** React 19, Vite 7, Tailwind 4, tRPC 11, vitest (new), Nano Banana Pro (art generation).

**Scope:** Phase 1 only — static scene + crops + state mapping + replace grid (with a list-view fallback toggle). Phases 2 (plant flow), 3 (toolbar/HUD actions), 4 (shop/warehouse/polish) are separate plans.

---

## File Structure

```
dashboard/
  public/farm-art/                 # generated sprites (Task 1)
    manifest.json
    soil-normal.png soil-dark.png soil-red.png
    grass-tile.png
    crop-<kind>-<stage>.png        # 6 kinds × 3 stages
    overlay-<state>.png            # thirsty/bugged/withered/resting/ripe
  scripts/gen-farm-art.sh          # art generation driver (Task 1)
  src/
    farm/
      iso.ts                       # iso coordinate math (Task 3)
      iso.test.ts
      farmArt.ts                   # sprite manifest + state→sprite mapping (Task 4)
      farmArt.test.ts
      useFarmGame.ts               # data hook + HUD aggregates (Task 5)
      farmAggregates.ts            # pure aggregate fns (Task 5, tested)
      farmAggregates.test.ts
    components/farm/
      CropSprite.tsx               # crop stage sprite + overlay (Task 6)
      IsoTile.tsx                  # one soil tile (Task 7)
      PlotSprite.tsx               # crop positioned on a tile (Task 7)
      FarmScene.tsx                # field, pan, compose (Task 8)
  vitest.config.ts                 # new (Task 2)
  src/App.tsx                      # Farm tab swap (Task 9)
```

Crop `kind` values come from the adapter's `classifyCrop()`: `bugfix | feature | refactor | test | docs | generic`. `PlotState` values: `seeded | growing | thirsty | resting | withered | bugged | ripe | fallow`.

---

## Task 1: Generate the art assets

**Files:**
- Create: `dashboard/scripts/gen-farm-art.sh`
- Create (outputs): `dashboard/public/farm-art/*.png`, `dashboard/public/farm-art/manifest.json`

This task is asset generation + visual QC, not TDD. The script wraps the Nano Banana Pro generator with a shared style suffix for consistency.

- [ ] **Step 1: Write the generation script**

Create `dashboard/scripts/gen-farm-art.sh`:

```bash
#!/usr/bin/env bash
# Generate the Agent Farm sprite set with Nano Banana Pro.
# Each sprite: transparent background, consistent QQ农场 casual-game style.
set -euo pipefail
GEN="/Users/yihengchen/.claude/skills/generate_images/scripts/generate_gemini_image.py"
OUT="$(cd "$(dirname "$0")/.." && pwd)/public/farm-art"
mkdir -p "$OUT"
STYLE="Single game sprite, centered, fully transparent background (alpha), no ground shadow box, \
bright highly saturated QQ农场 casual mobile-game art, thick warm dark outlines, glossy cel-shaded \
cartoon, isometric 2:1 view, no text, no letters, no numbers, no UI frame."

gen () { # $1=prompt  $2=outfile
  python3 "$GEN" --prompt "$1 $STYLE" --out "$OUT/$2" --prompt-out "$OUT/${2%.png}.prompt.txt"
}

# Soil tiles (isometric diamond, top surface only)
gen "An empty isometric diamond-shaped tilled soil plot tile, brown furrowed rows, top surface." soil-normal.png
gen "An empty isometric diamond-shaped tilled soil plot tile, very dark rich brown soil, furrowed rows." soil-dark.png
gen "An empty isometric diamond-shaped tilled soil plot tile, reddish-brown clay soil, furrowed rows." soil-red.png
gen "An isometric diamond-shaped patch of lush bright green grass, top surface only, seamless." grass-tile.png

# Crops: 6 kinds x 3 stages (seed sprout / growing / ripe)
for spec in \
  "bugfix:strawberry plant:tiny green sprout in a soil mound:small leafy strawberry plant, no fruit:full strawberry plant with ripe red strawberries" \
  "feature:apple tree:tiny tree seedling sprout:young small apple tree, green leaves:full apple tree with ripe red apples" \
  "refactor:corn:tiny corn sprout in soil:young green corn stalk:tall corn stalks with ripe golden corn cobs" \
  "test:grape vine:tiny grape vine sprout:young grape vine on a small trellis, no fruit:grape vine with bunches of ripe purple grapes" \
  "docs:carrot:tiny carrot leaf sprout:small carrot leafy tops:full carrot with big leafy green tops, orange root peeking" \
  "generic:wheat:tiny wheat sprout:young green wheat shoots:tall ripe golden wheat" ; do
  IFS=':' read -r kind _name seed growing ripe <<< "$spec"
  gen "A $seed." "crop-$kind-seed.png"
  gen "A $growing." "crop-$kind-growing.png"
  gen "A $ripe." "crop-$kind-ripe.png"
done

# State overlay badges (small floating icon, no crop)
gen "A cute floating blue water droplet speech bubble icon." overlay-thirsty.png
gen "A few cute cartoon green garden bugs/pests crawling, small." overlay-bugged.png
gen "A wilted brown dead-plant droop indicator, sad." overlay-withered.png
gen "A small floating sleepy 'Zzz' bubble icon." overlay-resting.png
gen "A bright golden sparkle 'ready' star burst icon." overlay-ripe.png

echo "Generated sprites in $OUT"
```

- [ ] **Step 2: Run the generation script**

Run: `bash dashboard/scripts/gen-farm-art.sh`
Expected: ~28 PNGs + matching `.prompt.txt` files in `dashboard/public/farm-art/`. (Takes several minutes; Pro is slow.)

- [ ] **Step 3: Visual QC**

Open the PNGs (e.g. `open dashboard/public/farm-art/*.png`). For each: transparent background, consistent style, recognizable subject. Regenerate any reject by re-running its single `gen` line (edit the prompt if needed). Do NOT proceed until the set looks cohesive.

- [ ] **Step 4: Write the manifest**

Create `dashboard/public/farm-art/manifest.json` (records what exists; consumed by `farmArt.ts`):

```json
{
  "base": "/farm-art",
  "soil": ["soil-normal.png", "soil-dark.png", "soil-red.png"],
  "grass": "grass-tile.png",
  "crops": ["bugfix", "feature", "refactor", "test", "docs", "generic"],
  "stages": ["seed", "growing", "ripe"],
  "overlays": ["thirsty", "bugged", "withered", "resting", "ripe"]
}
```

- [ ] **Step 5: Commit**

```bash
git add dashboard/scripts/gen-farm-art.sh dashboard/public/farm-art
git commit -m "feat(farm): generate isometric crop/soil/decor sprite set"
```

---

## Task 2: Add vitest

**Files:**
- Modify: `dashboard/package.json`
- Create: `dashboard/vitest.config.ts`

- [ ] **Step 1: Install vitest**

Run: `cd dashboard && npm i -D vitest@^3`
Expected: vitest added to devDependencies.

- [ ] **Step 2: Add test script**

Edit `dashboard/package.json` `scripts` — add:

```json
    "test": "vitest run"
```

- [ ] **Step 3: Create vitest config**

Create `dashboard/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 4: Verify the runner works**

Run: `cd dashboard && npx vitest run`
Expected: exits 0 with "No test files found" (no tests yet).

- [ ] **Step 5: Commit**

```bash
git add dashboard/package.json dashboard/vitest.config.ts dashboard/package-lock.json
git commit -m "test(dashboard): add vitest for farm pure-logic units"
```

---

## Task 3: Isometric coordinate math

**Files:**
- Create: `dashboard/src/farm/iso.ts`
- Test: `dashboard/src/farm/iso.test.ts`

- [ ] **Step 1: Write the failing test**

Create `dashboard/src/farm/iso.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { isoToScreen, zIndexFor } from './iso';

describe('isoToScreen', () => {
  it('places origin tile at (0,0)', () => {
    expect(isoToScreen(0, 0, 128, 64)).toEqual({ x: 0, y: 0 });
  });
  it('moves col right-and-down, row left-and-down', () => {
    expect(isoToScreen(1, 0, 128, 64)).toEqual({ x: 64, y: 32 });
    expect(isoToScreen(0, 1, 128, 64)).toEqual({ x: -64, y: 32 });
  });
  it('diagonal sums on y', () => {
    expect(isoToScreen(2, 2, 128, 64)).toEqual({ x: 0, y: 128 });
  });
});

describe('zIndexFor', () => {
  it('orders back-to-front by col+row', () => {
    expect(zIndexFor(0, 0)).toBe(0);
    expect(zIndexFor(2, 1)).toBe(3);
    expect(zIndexFor(1, 2)).toBe(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd dashboard && npx vitest run src/farm/iso.test.ts`
Expected: FAIL — cannot find module `./iso`.

- [ ] **Step 3: Write minimal implementation**

Create `dashboard/src/farm/iso.ts`:

```ts
/** Isometric (2:1) screen placement for a tile at grid (col, row). */
export function isoToScreen(
  col: number,
  row: number,
  tileW: number,
  tileH: number,
): { x: number; y: number } {
  return {
    x: ((col - row) * tileW) / 2,
    y: ((col + row) * tileH) / 2,
  };
}

/** Painter's-order z-index: tiles further back (smaller col+row) draw first. */
export function zIndexFor(col: number, row: number): number {
  return col + row;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd dashboard && npx vitest run src/farm/iso.test.ts`
Expected: PASS (5 assertions).

- [ ] **Step 5: Commit**

```bash
git add dashboard/src/farm/iso.ts dashboard/src/farm/iso.test.ts
git commit -m "feat(farm): isometric coordinate math"
```

---

## Task 4: Sprite manifest + state→sprite mapping

**Files:**
- Create: `dashboard/src/farm/farmArt.ts`
- Test: `dashboard/src/farm/farmArt.test.ts`

- [ ] **Step 1: Write the failing test**

Create `dashboard/src/farm/farmArt.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { stageForState, overlayForState, cropSprite, overlaySprite } from './farmArt';

describe('stageForState', () => {
  it('maps lifecycle to a growth stage or null', () => {
    expect(stageForState('seeded')).toBe('seed');
    expect(stageForState('growing')).toBe('growing');
    expect(stageForState('thirsty')).toBe('growing');
    expect(stageForState('resting')).toBe('growing');
    expect(stageForState('bugged')).toBe('growing');
    expect(stageForState('withered')).toBe('growing');
    expect(stageForState('ripe')).toBe('ripe');
    expect(stageForState('fallow')).toBeNull(); // cleared soil, no crop
  });
});

describe('overlayForState', () => {
  it('returns an overlay key for decorated states, else null', () => {
    expect(overlayForState('thirsty')).toBe('thirsty');
    expect(overlayForState('bugged')).toBe('bugged');
    expect(overlayForState('withered')).toBe('withered');
    expect(overlayForState('resting')).toBe('resting');
    expect(overlayForState('ripe')).toBe('ripe');
    expect(overlayForState('growing')).toBeNull();
    expect(overlayForState('seeded')).toBeNull();
    expect(overlayForState('fallow')).toBeNull();
  });
});

describe('sprite paths', () => {
  it('builds crop sprite path from kind + stage', () => {
    expect(cropSprite('refactor', 'ripe')).toBe('/farm-art/crop-refactor-ripe.png');
  });
  it('builds overlay sprite path', () => {
    expect(overlaySprite('bugged')).toBe('/farm-art/overlay-bugged.png');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd dashboard && npx vitest run src/farm/farmArt.test.ts`
Expected: FAIL — cannot find module `./farmArt`.

- [ ] **Step 3: Write minimal implementation**

Create `dashboard/src/farm/farmArt.ts`:

```ts
export type CropKind = 'bugfix' | 'feature' | 'refactor' | 'test' | 'docs' | 'generic';
export type PlotState =
  | 'seeded' | 'growing' | 'thirsty' | 'resting'
  | 'withered' | 'bugged' | 'ripe' | 'fallow';
export type GrowthStage = 'seed' | 'growing' | 'ripe';
export type OverlayKey = 'thirsty' | 'bugged' | 'withered' | 'resting' | 'ripe';

const BASE = '/farm-art';

/** Which growth-stage sprite a state shows, or null for no crop (fallow). */
export function stageForState(state: PlotState): GrowthStage | null {
  switch (state) {
    case 'seeded': return 'seed';
    case 'ripe': return 'ripe';
    case 'fallow': return null;
    default: return 'growing'; // growing/thirsty/resting/bugged/withered
  }
}

/** Optional overlay badge for a state. */
export function overlayForState(state: PlotState): OverlayKey | null {
  switch (state) {
    case 'thirsty': return 'thirsty';
    case 'bugged': return 'bugged';
    case 'withered': return 'withered';
    case 'resting': return 'resting';
    case 'ripe': return 'ripe';
    default: return null;
  }
}

export function cropSprite(kind: CropKind, stage: GrowthStage): string {
  return `${BASE}/crop-${kind}-${stage}.png`;
}

export function overlaySprite(key: OverlayKey): string {
  return `${BASE}/overlay-${key}.png`;
}

export function soilSprite(variant: 'normal' | 'dark' | 'red'): string {
  return `${BASE}/soil-${variant}.png`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd dashboard && npx vitest run src/farm/farmArt.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add dashboard/src/farm/farmArt.ts dashboard/src/farm/farmArt.test.ts
git commit -m "feat(farm): sprite manifest + state→sprite mapping"
```

---

## Task 5: HUD aggregates + data hook

**Files:**
- Create: `dashboard/src/farm/farmAggregates.ts`
- Test: `dashboard/src/farm/farmAggregates.test.ts`
- Create: `dashboard/src/farm/useFarmGame.ts`

- [ ] **Step 1: Write the failing test**

Create `dashboard/src/farm/farmAggregates.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { computeHud } from './farmAggregates';

const plot = (state: string, harvestValue: number) =>
  ({ state, harvestValue } as any);

describe('computeHud', () => {
  it('coins = sum of harvestValue', () => {
    const hud = computeHud([plot('ripe', 50), plot('growing', 10), plot('bugged', 3)]);
    expect(hud.coins).toBe(63);
  });
  it('level = count of ripe + fallow (harvested/cleared)', () => {
    const hud = computeHud([plot('ripe', 50), plot('fallow', 0), plot('growing', 10)]);
    expect(hud.level).toBe(2);
  });
  it('handles empty', () => {
    expect(computeHud([])).toEqual({ coins: 0, level: 0 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd dashboard && npx vitest run src/farm/farmAggregates.test.ts`
Expected: FAIL — cannot find module `./farmAggregates`.

- [ ] **Step 3: Write minimal implementation**

Create `dashboard/src/farm/farmAggregates.ts`:

```ts
export interface HudStats { coins: number; level: number; }

interface PlotLike { state: string; harvestValue: number; }

export function computeHud(plots: PlotLike[]): HudStats {
  let coins = 0;
  let level = 0;
  for (const p of plots) {
    coins += p.harvestValue ?? 0;
    if (p.state === 'ripe' || p.state === 'fallow') level += 1;
  }
  return { coins, level };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd dashboard && npx vitest run src/farm/farmAggregates.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the data hook (no unit test — thin tRPC wrapper, verified at build/preview)**

Create `dashboard/src/farm/useFarmGame.ts`:

```ts
import { useMemo } from 'react';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '../../../server/src/trpc/router.js';
import { trpc } from '../lib/trpc';
import { computeHud, type HudStats } from './farmAggregates';

export type Plot = inferRouterOutputs<AppRouter>['farm']['plots'][number];

export interface FarmGame {
  plots: Plot[];
  hud: HudStats;
  isLoading: boolean;
}

export function useFarmGame(active: boolean): FarmGame {
  const { data, isLoading } = trpc.farm.plots.useQuery(undefined, {
    refetchInterval: active ? 4000 : false,
    enabled: active,
  });
  const plots = useMemo(() => data ?? [], [data]);
  const hud = useMemo(() => computeHud(plots), [plots]);
  return { plots, hud, isLoading };
}
```

- [ ] **Step 6: Type-check**

Run: `cd dashboard && npx tsc -b`
Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add dashboard/src/farm/farmAggregates.ts dashboard/src/farm/farmAggregates.test.ts dashboard/src/farm/useFarmGame.ts
git commit -m "feat(farm): HUD aggregates + useFarmGame data hook"
```

---

## Task 6: CropSprite component

**Files:**
- Create: `dashboard/src/components/farm/CropSprite.tsx`

- [ ] **Step 1: Write the component**

Create `dashboard/src/components/farm/CropSprite.tsx`:

```tsx
import { stageForState, overlayForState, cropSprite, overlaySprite, type CropKind, type PlotState } from '../../farm/farmArt';

const SWAY: Partial<Record<PlotState, string>> = {
  growing: 'farm-sway',
  ripe: 'farm-bob',
  thirsty: 'farm-pulse',
  bugged: 'farm-pulse',
};

/** Renders the crop's growth-stage sprite for a plot, plus an optional state overlay. */
export function CropSprite({ kind, state, size = 96 }: { kind: CropKind; state: PlotState; size?: number }) {
  const stage = stageForState(state);
  const overlay = overlayForState(state);
  const dead = state === 'withered';

  return (
    <div style={{ position: 'relative', width: size, height: size, pointerEvents: 'none' }}>
      {stage && (
        <img
          src={cropSprite(kind, stage)}
          alt=""
          className={SWAY[state] ?? ''}
          style={{
            width: size, height: size, objectFit: 'contain',
            transformOrigin: 'bottom center',
            filter: dead ? 'grayscale(0.7) brightness(0.8)' : undefined,
          }}
        />
      )}
      {overlay && (
        <img
          src={overlaySprite(overlay)}
          alt=""
          style={{ position: 'absolute', top: -6, right: -2, width: size * 0.42, height: size * 0.42, objectFit: 'contain' }}
        />
      )}
    </div>
  );
}
```

(The `farm-sway`/`farm-bob`/`farm-pulse` keyframes already exist in `dashboard/src/index.css` from the earlier card UI.)

- [ ] **Step 2: Type-check**

Run: `cd dashboard && npx tsc -b`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add dashboard/src/components/farm/CropSprite.tsx
git commit -m "feat(farm): CropSprite (stage sprite + state overlay)"
```

---

## Task 7: IsoTile + PlotSprite components

**Files:**
- Create: `dashboard/src/components/farm/IsoTile.tsx`
- Create: `dashboard/src/components/farm/PlotSprite.tsx`

- [ ] **Step 1: Write IsoTile**

Create `dashboard/src/components/farm/IsoTile.tsx`:

```tsx
import { soilSprite } from '../../farm/farmArt';

const VARIANTS = ['normal', 'dark', 'red'] as const;

/** A single isometric soil tile. `seed` picks a stable soil variant for visual variety. */
export function IsoTile({
  tileW, tileH, empty, seed = 0, onClick,
}: {
  tileW: number; tileH: number; empty?: boolean; seed?: number; onClick?: () => void;
}) {
  const variant = VARIANTS[seed % VARIANTS.length];
  return (
    <img
      src={soilSprite(variant)}
      alt=""
      onClick={onClick}
      style={{
        width: tileW, height: tileH * 1.4, objectFit: 'contain',
        cursor: onClick ? 'pointer' : 'default',
        opacity: empty ? 0.85 : 1,
        filter: empty ? 'saturate(0.6)' : undefined,
      }}
    />
  );
}
```

- [ ] **Step 2: Write PlotSprite**

Create `dashboard/src/components/farm/PlotSprite.tsx`:

```tsx
import { CropSprite } from './CropSprite';
import type { Plot } from '../../farm/useFarmGame';
import type { CropKind, PlotState } from '../../farm/farmArt';

/** A crop sitting on its tile, with a hover label and click handler. */
export function PlotSprite({ plot, tileW, onClick }: { plot: Plot; tileW: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={`${plot.crop.name} — ${plot.state} · ${plot.taskName}`}
      style={{
        position: 'absolute', left: 0, bottom: tileW * 0.18,
        transform: 'translateX(-50%)', background: 'none', border: 'none',
        cursor: 'pointer', padding: 0,
      }}
    >
      <CropSprite kind={plot.crop.kind as CropKind} state={plot.state as PlotState} size={tileW * 0.8} />
    </button>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `cd dashboard && npx tsc -b`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add dashboard/src/components/farm/IsoTile.tsx dashboard/src/components/farm/PlotSprite.tsx
git commit -m "feat(farm): IsoTile + PlotSprite components"
```

---

## Task 8: FarmScene (field, layout, pan)

**Files:**
- Create: `dashboard/src/components/farm/FarmScene.tsx`

- [ ] **Step 1: Write FarmScene**

Create `dashboard/src/components/farm/FarmScene.tsx`:

```tsx
import { useMemo, useRef, useState } from 'react';
import { isoToScreen, zIndexFor } from '../../farm/iso';
import { IsoTile } from './IsoTile';
import { PlotSprite } from './PlotSprite';
import { useFarmGame, type Plot } from '../../farm/useFarmGame';

const TILE_W = 128;
const TILE_H = 64;
const COLS = 5;
const ROWS = 4;

interface Cell { col: number; row: number; plot: Plot | null; }

/** Lays sessions onto a fixed iso grid (stable by id), fills the rest with empty soil. */
function layout(plots: Plot[]): Cell[] {
  const ordered = [...plots].sort((a, b) => a.plotId.localeCompare(b.plotId));
  const cells: Cell[] = [];
  let i = 0;
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      cells.push({ col, row, plot: ordered[i] ?? null });
      i++;
    }
  }
  return cells;
}

export function FarmScene({
  active, onInspect, onPlantEmpty,
}: {
  active: boolean;
  onInspect: (plot: Plot) => void;
  onPlantEmpty: () => void;
}) {
  const { plots, isLoading } = useFarmGame(active);
  const cells = useMemo(() => layout(plots), [plots]);

  // simple drag-to-pan
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  const fieldW = (COLS + ROWS) * (TILE_W / 2);
  const fieldH = (COLS + ROWS) * (TILE_H / 2);

  return (
    <div
      onPointerDown={(e) => { drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y }; }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        setPan({ x: drag.current.px + (e.clientX - drag.current.x), y: drag.current.py + (e.clientY - drag.current.y) });
      }}
      onPointerUp={() => { drag.current = null; }}
      onPointerLeave={() => { drag.current = null; }}
      className="h-full w-full overflow-hidden relative select-none"
      style={{ background: 'linear-gradient(#bfe39a, #9fd17a 55%, #8ec96a)', cursor: 'grab' }}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center text-sm" style={{ color: '#3a5a22' }}>
          Tending the farm…
        </div>
      )}
      <div
        style={{
          position: 'absolute',
          left: `calc(50% + ${pan.x}px)`, top: `calc(20% + ${pan.y}px)`,
          width: fieldW, height: fieldH,
        }}
      >
        {cells.map((cell) => {
          const { x, y } = isoToScreen(cell.col, cell.row, TILE_W, TILE_H);
          return (
            <div
              key={`${cell.col}-${cell.row}`}
              style={{
                position: 'absolute', left: x, top: y,
                width: TILE_W, height: TILE_H,
                transform: 'translateX(-50%)', zIndex: zIndexFor(cell.col, cell.row),
              }}
            >
              <IsoTile
                tileW={TILE_W} tileH={TILE_H}
                empty={!cell.plot}
                seed={cell.col + cell.row * COLS}
                onClick={!cell.plot ? onPlantEmpty : undefined}
              />
              {cell.plot && <PlotSprite plot={cell.plot} tileW={TILE_W} onClick={() => onInspect(cell.plot!)} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `cd dashboard && npx tsc -b`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add dashboard/src/components/farm/FarmScene.tsx
git commit -m "feat(farm): FarmScene — iso field layout + drag-pan"
```

---

## Task 9: Wire FarmScene into the Farm tab (with list-view toggle)

**Files:**
- Modify: `dashboard/src/components/FarmDashboard.tsx`

The current `FarmDashboard` already owns the overlays (`TerminalDrawer`, `FertilizeModal`, `HarvestModal`) and the card grid. Add a view toggle: **Scene** (new, default) vs **List** (existing grid). Scene reuses the same Inspect drawer.

- [ ] **Step 1: Add the scene/list toggle and render FarmScene**

In `dashboard/src/components/FarmDashboard.tsx`, add the import near the other imports:

```tsx
import { FarmScene } from './farm/FarmScene';
```

Inside `FarmDashboard`, add view state after the existing `useState` declarations (alongside `inspectPlot`):

```tsx
  const [view, setView] = useState<'scene' | 'list'>('scene');
```

Then, immediately inside the outer return's top `<div className="max-w-7xl mx-auto p-5">` — replace the `<MorningHarvestSummary .../>` line with a header row that includes the toggle:

```tsx
        <div className="flex items-center justify-between mb-4">
          <MorningHarvestSummary plots={plots} />
        </div>
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setView('scene')}
            className="px-3 py-1 rounded-full text-xs font-medium"
            style={{ background: view === 'scene' ? 'var(--accent)' : 'var(--bg-secondary)', color: view === 'scene' ? 'white' : 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >🌾 Farm</button>
          <button
            onClick={() => setView('list')}
            className="px-3 py-1 rounded-full text-xs font-medium"
            style={{ background: view === 'list' ? 'var(--accent)' : 'var(--bg-secondary)', color: view === 'list' ? 'white' : 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >☰ List</button>
        </div>
```

- [ ] **Step 2: Branch the body on `view`**

Wrap the existing filter-chips + grid/empty/loading block so it only renders when `view === 'list'`, and render the scene otherwise. Find the block that currently starts with the filter `{filters.map(...)}` chips and ends after the grid `)}`; wrap it:

```tsx
        {view === 'list' ? (
          <>
            {/* existing filter chips + isLoading/empty/grid block stays here unchanged */}
          </>
        ) : (
          <div style={{ height: '70vh' }} className="rounded-xl overflow-hidden border" >
            <FarmScene
              active={active && view === 'scene'}
              onInspect={(p) => setInspectPlot(p)}
              onPlantEmpty={() => { /* Phase 2: open SeedPacketPicker */ }}
            />
          </div>
        )}
```

(The `active` prop already exists on `FarmDashboard`. The overlays — `freshInspect`/`TerminalDrawer`, `FertilizeModal`, `HarvestModal` — stay where they are at the bottom of the component and work for both views.)

- [ ] **Step 3: Type-check**

Run: `cd dashboard && npx tsc -b`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add dashboard/src/components/FarmDashboard.tsx
git commit -m "feat(farm): scene/list toggle — FarmScene as default Farm view"
```

---

## Task 10: Build + visual verification

**Files:** none (verification only)

- [ ] **Step 1: Run unit tests**

Run: `cd dashboard && npx vitest run`
Expected: PASS — iso, farmArt, farmAggregates suites all green.

- [ ] **Step 2: Production build**

Run: `cd dashboard && npm run build`
Expected: `tsc -b` clean + `vite build` succeeds, no errors.

- [ ] **Step 3: Launch dev with the demo DB and screenshot the scene**

Run (from repo root): `DB_PATH=/tmp/farm-demo.db npm run dev` (the demo DB seeded earlier has varied crop states). Open `http://localhost:42011`, click the **Farm** tab, ensure **🌾 Farm** view is selected.

Verify in the preview:
- Isometric grass field with diamond soil tiles renders.
- Seeded crops show sprouts; ripe show full plants w/ fruit + ✨; bugged show 🐛 overlay; withered greyed; empty tiles plantable (cursor pointer).
- Drag pans the field.
- Clicking a crop opens the Inspect terminal drawer.
- Toggling **☰ List** shows the old card grid; toggling back returns to the scene.

Take a screenshot via the preview tool and share it.

- [ ] **Step 4: Final commit (if any cleanup)**

```bash
git add -A
git commit -m "chore(farm): phase 1 scene verification" || echo "nothing to commit"
```

---

## Phase 1 Done — Next

Subsequent plans (separate files): Phase 2 plant flow (`SeedPacketPicker`, wire `onPlantEmpty`), Phase 3 toolbar + HUD, Phase 4 shop + warehouse + decorations + animations/VIP polish.
