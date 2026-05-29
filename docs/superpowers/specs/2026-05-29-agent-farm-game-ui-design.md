# Agent Farm — QQ农场-style Game UI (Design Spec)

**Date:** 2026-05-29
**Status:** Approved (design); pending implementation plan
**Branch:** `farm-adapter`

## Summary

Replace the current card-grid Farm view with a real isometric farm-game scene in
the visual style of QQ农场 (Happy Farm): bright, saturated, thick-outlined casual
mobile-game art. Coding-agent sessions are rendered as crops growing on isometric
soil plots. The existing backend (`trpc.farm.plots` + the session→plot adapter) is
reused unchanged; this work is almost entirely frontend plus an AI-generated art
pipeline.

The art direction was validated during brainstorming with a generated sample
(`/tmp/farm-art/scene1.png`) and approved.

## Goals

- A scenic, game-authentic farm that maps 1:1 to real agent sessions.
- Plant → grow → harvest loop driven by real session state (no faked signals).
- "Everything + polish": iso scene, plant flow, action toolbar, HUD, shop,
  decorations, and level/VIP chrome — landed in phases so a working scene ships early.

## Non-goals

- No new test pass/fail detection (tests remain `null`; 🐛 derives only from real
  failure signals — `failed`/nonzero exit). That is a separate future phase.
- No multiplayer / 偷菜 (stealing) mechanics.
- No canvas/WebGL engine — DOM-composited sprites only (see Rendering).

## Architecture

### Rendering: DOM-composited sprites on an isometric field

Transparent-PNG sprites are absolutely positioned over a tiling grass background,
placed with isometric screen coordinates:

```
screenX = originX + (col - row) * (tileW / 2)
screenY = originY + (col + row) * (tileH / 2)
z-index  = (col + row)              // painter's order, back-to-front
```

Rationale for DOM over canvas/Pixi:
- Keeps everything inside React — the existing `TerminalDrawer`, `FertilizeModal`,
  `HarvestModal`, and all `trpc` hooks plug in unchanged.
- CSS handles crop animations (sway/bob/pulse) and `prefers-reduced-motion`.
- Dozens of plots is well within DOM performance limits.

The field **pans** via pointer drag (translate the field container). "开新地 /
expand land" appends grid rows. Tile hit-testing is per-sprite DOM click — no
manual coordinate math needed for input.

### Data flow

```
trpc.farm.plots  ──► useFarmGame() ──► FarmScene
   (existing)        (hook)             ├─ IsoTile[]  (soil)
                                        ├─ PlotSprite[] (one per plot)
                                        │     └─ CropSprite (stage+overlay)
                                        ├─ FarmHud      (coins/exp/level/VIP)
                                        ├─ FarmToolbar  (QQ actions)
                                        └─ overlays: SeedPacketPicker, ShopModal,
                                              Warehouse, TerminalDrawer (reused),
                                              FertilizeModal (reused), HarvestModal (reused)
```

`useFarmGame()` wraps `trpc.farm.plots.useQuery` (4s refetch) + the mutations
(`sessions.create`, `sessions.kill`, `projects.list/create`) and derives the
HUD aggregates. Empty tiles are computed as `gridSlots − occupiedByPlots`.

### Plots ↔ sessions

The iso field is a grid of soil tiles. A tile is either:
- **Empty (plantable)** → click opens the **seed-packet picker**.
- **Occupied** → renders the plot's crop; click opens a small action ring / the
  Inspect drawer.

Default grid: start ~20 tiles (5×4), expandable. Occupied tiles are assigned
stable positions by plot id order so crops don't jump between refreshes.

### Plant flow (seed-packet quick picker)

Clicking an empty tile (or a shop seed card) opens an in-scene multi-step picker:

1. **Project** — pick an existing project (from `projects.list`) or **+ New project**
   (path picker → `projects.create`).
2. **Agent** — pick the CLI (Claude / Codex) and optionally a specialist agent
   (the agent list already used by `SessionLauncher`; OctoAlly ships 36 under
   `server/src/data/agents`).
3. **Prompt** — task text.
4. **Plant** — calls the existing REST `api.sessions.create({ project_path, task,
   mode: agent ? 'agent' : 'session', agent_type, cli_type, project_id })`, which
   spawns the session. No backend change — the endpoint already supports agent
   mode. The new session appears as a `seeded` crop on that tile on next refetch.

The crop **visual** is derived from the task text (`classifyCrop`), independent of
which specialist agent tends it. The 🛒商店 shop is an alternate, more
game-authentic entry to the same flow (a seed packet pre-selects the crop/agent).

## Crop identities

| Crop (adapter `kind`) | Veggie sprite | Task keyword |
|---|---|---|
| 🍓 Bugfix Berry | strawberry plant | bug/fix/crash |
| 🍎 Feature Apple | apple tree | add/feature/implement |
| 🌽 Refactor Corn | corn stalks | refactor/cleanup |
| 🍇 Test Grape | grape vine | test/spec/coverage |
| 🥕 Docs Carrot | carrot tops | doc/readme |
| 🌾 generic Sprout | wheat | (fallback) |

These map directly onto the adapter's existing `classifyCrop()` `kind` values — no
backend change.

## State → visual

Each plot renders a **growth-stage sprite** for its crop, plus an optional
**state overlay**. Driven entirely by the adapter's existing `PlotState`:

| `PlotState` | Sprite stage | Overlay / treatment |
|---|---|---|
| `seeded` | tilled mound + sprout | — |
| `growing` | mid plant | gentle sway |
| `resting` | mid plant | 💤 |
| `ripe` | full plant + fruit | bob + ✨ "ready" glow |
| `thirsty` | mid plant | 💧 bubble + dry cracked soil; uses `promptType` for tooltip |
| `bugged` | plant | 🐛 pests + slight wilt |
| `withered` | brown dead plant | — |
| `fallow` | cleared soil | — |

Growth bar / runtime / files / tokens / barn (Codex `contextUsedPercent`) remain
available on the plot detail (action ring / drawer).

## HUD, toolbar, shop ("polish")

### Top HUD (wooden pills)
- 🪙 **coins** = Σ `harvestValue` across current plots
- ⭐ **exp / level** = count of `ripe` + `fallow` (completed/cleared) crops currently
  in view — a derivable proxy for "work harvested". (Persistent lifetime totals are
  out of scope until there's a harvest-history store; the Warehouse phase can add one.)
- **VIP** chrome (decorative)

All playful aggregates derived from real data; no fake numbers.

### Bottom toolbar (QQ actions → real ops)
| QQ tool | Real action |
|---|---|
| 💧 浇水 (water) | Fertilize (POST `/sessions/:id/execute`) — on selected/thirsty plot |
| 🐛 除虫 (debug) | Revive / inspect a `bugged` plot |
| 🌾 收获 (harvest) | Harvest modal on selected ripe plot |
| 全收 (collect all) | Harvest-all ripe |
| 🪏 铲地 (dig) | Clear/kill plot (`sessions.kill`) → fallow |
| 📦 仓库 (warehouse) | History of committed/archived crops |
| 🧰 工具箱 | Settings |

### 🛒 商店 shop
Wooden-ribbon catalog screen. The 6 crop types as seed-packet cards (icon +
level + "price"). Selecting a packet enters the Plant flow pre-seeded with that
crop/agent type. Mirrors the reference shop screenshot (种子 tab; other tabs like
鱼苗/狗狗/装饰 are decorative/future).

## Art pipeline

Generate a consistent sprite set with **Nano Banana Pro** (`gemini-3-pro-image-preview`)
on transparent backgrounds, saved to `dashboard/public/farm-art/`:

- Soil tiles ×3 (normal / dark 黑土地 / red 红土地)
- 6 crops × 3 growth stages (seeded / growing / ripe) = 18 sprites
- State-overlay badges (💧 / 🐛 / 💀 / 💤 / ✨)
- Decor: farmhouse, pond, fence segment, tree, NPC farmer
- UI chrome: wooden button, shop ribbon banner, seed-card frame, HUD pill

Consistency strategy: a fixed style suffix appended to every prompt ("bright
saturated QQ农场 casual-game art, thick warm outlines, glossy cel-shaded, isometric,
transparent background, no text"), generate, visually QC, regenerate rejects.
Each kept asset stores its prompt in `*.prompt.txt`.

## Components (new, under `dashboard/src/components/farm/`)

- `FarmScene.tsx` — field container, pan, iso layout, overlay orchestration
- `IsoTile.tsx` — one soil tile (empty/plantable or base for a plot)
- `PlotSprite.tsx` — positions a crop on a tile, click → action ring/drawer
- `CropSprite.tsx` — picks stage sprite + overlay from `state`/`crop`
- `FarmHud.tsx` — top wooden HUD
- `FarmToolbar.tsx` — bottom action bar
- `SeedPacketPicker.tsx` — project → agent → prompt → Plant
- `ShopModal.tsx` — seed catalog
- `Warehouse.tsx` — committed/archived history
- `useFarmGame.ts` — data hook (wraps `trpc.farm.*` + mutations + HUD aggregates)
- `farmArt.ts` — sprite path/manifest + state→sprite mapping

Reused as-is: `TerminalDrawer`, `FertilizeModal`, `HarvestModal` (extracted from the
current `FarmDashboard.tsx` if needed). The current card grid is kept behind a
"list view" toggle as a fallback.

## Build phasing (informs the plan)

1. **Scene** — iso field + soil grid + crop sprites + state mapping; replaces the
   card grid. Static art OK initially. → the "wow".
2. **Plant** — seed-packet picker + empty-tile interactions + new-project path.
3. **Actions** — toolbar ops + HUD aggregates.
4. **Polish** — shop, warehouse, decorations, animations, VIP/level chrome.

Each phase leaves a working, demoable app.

## Testing

- `useFarmGame` aggregate math (coins/level) — pure unit tests.
- State→sprite mapping (`farmArt.ts`) — unit test all `PlotState` values resolve.
- Iso coordinate math — unit test.
- Plant flow — integration: empty tile → picker → `sessions.create` called with
  right args (mock tRPC).
- Visual: Vite build clean + manual scene screenshot via preview per phase.

## Risks

- **Art consistency** across many AI sprites — mitigated by fixed style suffix +
  manual QC; worst case, regenerate or fall back to fewer stages.
- **Scope** — "everything + polish" is large; phasing keeps each step shippable.
- **Pan/overflow UX** with many sessions — start simple (drag-pan + expand), refine
  if needed.
