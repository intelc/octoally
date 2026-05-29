# Agent Farm (开心农场) — Product Spec (as-built)

**Updated:** 2026-05-29 · **Branch:** `farm-adapter` (fork of OctoAlly → `intelc/octoally`)
**Status:** Implemented & verified — backend adapter + full isometric game UI, 4 phases + polish.

> This spec reflects **what is actually built and running**, not the original aspirational design.
> Companion docs: design spec (`docs/superpowers/specs/2026-05-29-agent-farm-game-ui-design.md`),
> phase plans (`docs/superpowers/plans/`).

---

## 1. What it is

A reskin of OctoAlly's coding-agent dashboard into a **QQ农场 / Happy-Farm-style game**.
Each coding-agent **session is a crop** growing on an isometric soil plot; the agent's real
status becomes the crop's growth state. You **plant** tasks, watch them **grow**, and
**harvest** finished work. The backend is unchanged OctoAlly; this is a frontend game layer
plus a thin server-side adapter.

**One-liner:** *Stop managing terminal tabs. Start farming agents.*

---

## 2. Core mapping (session → crop)

| Agent session | Farm |
|---|---|
| Session | A plot/crop on the field |
| Task text | Crop identity (auto-classified) |
| Live status + tracker state | Crop growth state |
| Files changed / tokens | Crop stats (on hover + harvest) |
| Terminal | "Inspect" drawer |
| Git diff / review | "Harvest" |

### Crop identities (auto-classified from task text — `classifyCrop`)
🍓 Bugfix Berry (bug/fix/crash) · 🍎 Feature Apple (add/feature) · 🌽 Refactor Corn (refactor/cleanup) ·
🍇 Test Grape (test/spec) · 🥕 Docs Carrot (doc/readme) · 🌾 Sprout (fallback).

### Plot states (`PlotState`, derived from real signals only)
| State | Sprite + overlay | Derived from |
|---|---|---|
| `seeded` 🌱 | sprout, pop-in | session `pending` |
| `growing` 🌿 | mid plant, sway | `running` + tracker `busy` |
| `thirsty` 💧 | mid plant + 💧 bubble | `running` + `waiting_for_input` |
| `resting` 😴 | mid plant + 💤 | `running` + `idle` (recent) |
| `withered` 💀 | greyed plant | `running`+stale-idle (>10m), or `failed` w/o exit code |
| `bugged` 🐛 | plant + 🐛 pests | `failed`/`completed` with nonzero exit code |
| `ripe` 🍎 | full plant + fruit + ✨ | `completed` + exit 0 |
| `fallow` 📦 | cleared soil | `cancelled` |

**Honesty rule (enforced):** test pass/fail is **not** tracked — `testsPassed/testsFailed`
are always `null`, and 🐛 "bugged" derives **only** from real failure signals (nonzero exit /
failed status), never a guess. Tokens are read from the CLIs' own logs; `null` when unknown.

---

## 3. Architecture

### Backend (server-side, TypeScript / Fastify / SQLite / tRPC)
- **`server/src/lib/token-reader.ts`** — unified token accounting:
  - Claude: sums `message.usage` from `~/.claude/projects/<cwd>/<uuid>.jsonl`.
  - Codex: reads the last `token_count` event from the rollout jsonl (cumulative total +
    `model_context_window` → "barn fill %").
  - Codex rollout path is **captured at spawn** (`sessions.codex_rollout_path` column,
    snapshot-and-diff `~/.codex/sessions`, mirroring OctoAlly's Claude-UUID capture); cwd
    fallback for older sessions.
- **`server/src/lib/farm-adapter.ts`** — pure `sessionToPlot()` mapper (state, crop, growth %,
  harvest value, elapsed). No IO → unit-testable.
- **`server/src/lib/farm-service.ts`** — IO wiring (resolve project cwd, live tracker state via
  `getTracker`, `git status` file count) feeding `buildPlot()`.
- **tRPC** (`server/src/trpc/router.ts`) — `farm.plots` (list) + `farm.plot(id)`.
- **No other backend change.** Planting reuses the existing REST `api.sessions.create`
  (`mode: 'agent'|'session'`, `agent_type`, `cli_type`). Kill reuses `trpc.sessions.kill`.
  Fertilize reuses `POST /sessions/:id/execute`.

### Frontend (React 19 / Vite / Tailwind 4 / tRPC)
- **Pure logic (`dashboard/src/farm/`, vitest-tested — 11 tests):**
  `iso.ts` (isometric coordinate math), `farmArt.ts` (sprite manifest + state→sprite mapping +
  crop catalog), `farmAggregates.ts` (`computeHud` → coins/level), `useFarmGame.ts` (tRPC query
  + 4s refetch + HUD aggregates).
- **Components (`dashboard/src/components/farm/`):** `FarmScene` (field, pan, selection, tool
  mode, orchestration), `IsoTile`, `PlotSprite`, `CropSprite`, `FarmHud`, `FarmToolbar`,
  `PlotTooltip`, `SeedPacketPicker`, `ShopModal`, `Warehouse`, `SceneDecor`, `FarmBurst`.
- **Entry:** rendered as a new **Farm tab** in `FarmDashboard.tsx` with a **Scene / List**
  toggle (the old card grid is the List fallback).
- **Art:** 32 AI-generated sprites (Nano Banana Pro) in `dashboard/public/farm-art/` — soil ×3,
  6 crops × 3 growth stages, 5 state overlays, 5 decor pieces. Generated via
  `scripts/gen-farm-art.sh` + `gen-farm-decor.sh`; post-processed by `scripts/clean-farm-art.py`
  (keys out the baked checkerboard → true alpha, autocrops).

### Rendering
DOM-composited transparent PNG sprites positioned by isometric screen coordinates
(`x=(col−row)·w/2`, `y=(col+row)·h/2`, painter z-order). The grid **auto-sizes** to the plot
count and the field is **centered**; decor frames the edges. Drag-to-pan with a click-vs-drag
guard.

---

## 4. Features (implemented)

### Scene
- Centered, auto-sized isometric field of soil tiles (3 soil variants) with crops seated on
  plots; decor (tree, fence, thatched farmhouse, farmer NPC, pond) framing the edges.
- **Morning summary banner** (早上收果子): counts of ready/needs-fertilizer/bugged/growing.
- **Hover tooltip** per plot: crop name, state, growth %, files/tokens, CLI, task.
- Crop **pop-in** animation on appearance; sway/bob/pulse per state; `prefers-reduced-motion`
  respected.

### HUD + toolbar
- **HUD (wooden pills, top):** 🌾 Lv (= ripe+fallow count), 🪙 coins (= Σ harvest value, **bumps**
  on increase), ⭐ VIP, 🛒 商店 shop button.
- **Toolbar (bottom):** 查看 (inspect → terminal drawer), 💧浇水 / 🌾收获 / 🪏铲地 (tool modes),
  🧺全收 (harvest-all → celebration → review), 📦仓库 (warehouse). State-aware enablement.

### Interaction models
- **Select-then-act:** click a crop → selects (glow) → toolbar acts on it.
- **Tool-first batch mode** (matches QQ农场): select 浇水/收获/铲地 → the tool stays armed (banner
  + **tool-emoji cursor**), eligible plots **glow + pulse**, ineligible plots **dim to 0.35**;
  click crops one after another to apply. Cursor shows `not-allowed` over invalid targets / empty
  tiles; Esc or ✋ done exits.

### Plant flow (`SeedPacketPicker`)
Click empty tile (or a shop seed packet) → pick **project** (existing or + new path → create) →
**CLI** (Claude/Codex) + optional **specialist agent** → **prompt** → **Plant**
(`api.sessions.create`). A new `seeded` crop appears on next refetch.

### Shop (`ShopModal`)
QQ-style 商店: orange ribbon, 种子/鱼苗/狗狗/装饰 tabs (only 种子 active), 6 seed-packet cards
(crop sprite + name + coin price). Selecting a packet opens the plant flow pre-seeded with a
prompt hint.

### Warehouse (`Warehouse`)
仓库 panel: finished/cleared crops (ripe/fallow/bugged/withered) with real files-changed + token
stats; click to inspect.

### Animations (`FarmBurst`)
Golden ring + flying coins/sparkles + label. **全收** plays "🌾 大丰收 · Big Harvest!" then opens
the review modal; **level-ups** (coins/level rising) auto-celebrate "⭐ Level Up!".

### Reused OctoAlly modals
Inspect = real `<Terminal>` drawer; Fertilize = `/sessions/:id/execute` modal; Harvest = yield
summary modal (files/tokens/yield + "open terminal/diff").

---

## 5. Data & gamification math
- **Coins** = Σ `harvestValue` over current plots (`harvestValue` = files×10 + output-tokens/1000
  + ripe bonus, damaged states discounted).
- **Level/exp** = count of `ripe` + `fallow` plots currently in view (a derivable proxy; no
  persistent lifetime store yet).
- **Barn fill %** = Codex `last_token_usage / model_context_window` (Codex only).
All values derive from real session data — no fabricated numbers.

---

## 6. Known gaps / not implemented
- **全收 is celebratory, not a true batch-commit** — harvesting = review+commit per crop, which
  can't be safely batched; 全收 plays the burst then opens the top ripe crop's review. Batch
  harvest is the 收获 tool-mode (click each ripe).
- **No persistent lifetime stats** (level/coins are current-view aggregates).
- **No multiplayer / 偷菜 stealing / friends** (single-player; the original game's friends panel
  is out of scope).
- **No real test pass/fail detection** (deliberate; would be a separate backend phase).
- Shop tabs 鱼苗/狗狗/装饰 are decorative placeholders.
- Field layout fills row-major (crops cluster before empties); fine at small counts.

---

## 7. Tech stack
React 19, Vite 7, Tailwind 4, tRPC 11, TanStack Query, vitest (added), xterm.js (reused
terminal), Fastify 5 + better-sqlite3 + node-pty (backend, unchanged), Nano Banana Pro (art).

## 8. Quality
- 11 vitest unit tests (iso math, state→sprite mapping, HUD aggregates) — green.
- `tsc -b` clean (server + dashboard); `vite build` clean.
- Each phase verified live via browser preview (screenshots + DOM assertions).

## 9. License note
OctoAlly is **Apache-2.0 + Commons-Clause** (no *selling* the software). The fork is fine for
demo/internal use; commercializing requires relicensing permission from the authors.
