# Agent Farm — Phases 2–4 Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans. Builds on Phase 1
> (the iso scene). Each phase leaves a working, demoable app. Pure logic gets
> vitest unit tests; visual pieces are verified via Vite build + preview screenshot.

**Goal:** Complete the QQ农场 game UI: planting, the action toolbar + HUD, and the
shop/warehouse/decoration polish.

**Tech Stack:** React 19, Vite, tRPC + REST (`api`), vitest, existing farm adapter.

**Depends on:** `docs/superpowers/plans/2026-05-29-agent-farm-scene-phase1.md` complete
and visually verified (sprite sizing tuned).

---

## Phase 2 — Plant flow (seed-packet quick picker)

**Files:**
- Create: `dashboard/src/components/farm/SeedPacketPicker.tsx`
- Modify: `dashboard/src/components/FarmDashboard.tsx` (wire `onPlantEmpty`)

A 3-step in-scene modal: **Project → Agent → Prompt → Plant**.

### Task 2.1: SeedPacketPicker component

- [ ] **Step 1: Build the picker**

`SeedPacketPicker.tsx` — props `{ onClose: () => void; onPlanted: () => void }`.
- Step 1 **Project**: `trpc.projects.list.useQuery()` → list buttons; a "+ New project"
  row with a path text input → `trpc.projects.create.useMutation()` (name = basename of path).
- Step 2 **Agent**: CLI toggle (Claude / Codex); agent select from
  `api.projects.rufloAgents(projectId)` (`{ agents: [{name}] }`), default "session"
  (no specialist) option first.
- Step 3 **Prompt**: textarea.
- **Plant** button → `api.sessions.create({ project_path, task: prompt, mode: agentName ? 'agent' : 'session', agent_type: agentName, project_id, cli_type })`,
  then `onPlanted()` (which invalidates `trpc.farm.plots`) + `onClose()`.

Use the same wooden/parchment styling tokens as the existing modals
(`var(--bg-secondary)`, `var(--border)`); reuse the `Loader2`/`X` lucide icons.

- [ ] **Step 2: Wire into FarmDashboard**

In `FarmDashboard.tsx`: add `const [planting, setPlanting] = useState(false);`
Set `onPlantEmpty={() => setPlanting(true)}` on `<FarmScene>`. Render
`{planting && <SeedPacketPicker onClose={() => setPlanting(false)} onPlanted={() => utils.farm.plots.invalidate()} />}`
in the overlays block.

- [ ] **Step 3: Verify** — `npx tsc -b`; preview: click an empty tile → picker →
  plant against a real project → a `seeded` crop appears. Commit.

---

## Phase 3 — Action toolbar + HUD

**Files:**
- Create: `dashboard/src/components/farm/FarmHud.tsx`
- Create: `dashboard/src/components/farm/FarmToolbar.tsx`
- Modify: `dashboard/src/components/farm/FarmScene.tsx` (selected-plot state, render HUD + toolbar)
- Modify: `dashboard/src/components/FarmDashboard.tsx` (pass action callbacks)

### Task 3.1: FarmHud
- [ ] Render the wooden top HUD from `useFarmGame().hud`: 🪙 `coins`, ⭐ `level`,
  decorative VIP pill. Absolute top of the scene. Verify in preview. Commit.

### Task 3.2: Selected plot in FarmScene
- [ ] Add `selectedId` state in `FarmScene`; clicking a `PlotSprite` sets it (and still
  calls `onInspect`). Highlight the selected tile (ring/scale). The toolbar acts on the
  selected plot. Commit.

### Task 3.3: FarmToolbar
- [ ] Bottom wooden toolbar with buttons wired to the selected plot:
  - 💧 浇水 → `onFertilize(plot)` (opens existing FertilizeModal)
  - 🐛 除虫 → `onInspect(plot)` when bugged
  - 🌾 收获 → `onHarvest(plot)` (existing HarvestModal)
  - 全收 → harvest-all: open HarvestModal for each ripe (or a summary); minimally,
    filter ripe and open the first / show count
  - 🪏 铲地 → `onKill(plot)` (`trpc.sessions.kill`)
  - 📦 仓库 → `onWarehouse()` (Phase 4)
  - 🧰 → settings (no-op/open existing settings)
  Disable buttons when no plot selected or action not applicable to its state.
- [ ] FarmDashboard passes `onFertilize/onHarvest/onKill/onInspect` (already exist as
  setters) down through FarmScene to the toolbar. Verify in preview. Commit.

---

## Phase 4 — Shop, warehouse, decorations, polish

**Files:**
- Create: `dashboard/src/components/farm/ShopModal.tsx`
- Create: `dashboard/src/components/farm/Warehouse.tsx`
- Create: `dashboard/src/components/farm/SceneDecor.tsx`
- Modify: `FarmScene.tsx` (render decor), `FarmDashboard.tsx` (shop/warehouse state)
- Asset: extend `gen-farm-art.sh` with decor + UI-chrome sprites

### Task 4.1: Decor sprites + SceneDecor
- [ ] Add to `gen-farm-art.sh`: `decor-house.png`, `decor-pond.png`, `decor-tree.png`,
  `decor-fence.png`, `decor-farmer.png` (same STYLE suffix). Run; QC.
- [ ] `SceneDecor.tsx`: absolutely-positioned decor PNGs framing the field edges
  (house upper-right, pond lower-right, tree upper-left, fences along borders, NPC).
  Render inside `FarmScene` behind/around the tile field. Commit.

### Task 4.2: ShopModal (seed catalog)
- [ ] Wooden-ribbon catalog: the 6 crop types as seed-packet cards (crop ripe sprite +
  name + a flavor "level"/"price"). `种子` tab active; `鱼苗/狗狗/装饰` tabs decorative
  (disabled). Selecting a packet opens `SeedPacketPicker` pre-seeded with that crop's
  suggested agent/prompt hint. Add a 🛒 商店 button to the HUD/toolbar to open it.
  Verify in preview. Commit.

### Task 4.3: Warehouse
- [ ] `Warehouse.tsx`: a panel listing non-active plots (`completed`/`cancelled` →
  ripe/fallow) as "stored harvest" with files-changed / yield. Opened by 📦 仓库.
  Read from `trpc.farm.plots` filtered. Commit.

### Task 4.4: Polish
- [ ] Level/VIP chrome on the HUD; subtle ambient animations (already have sway/bob/pulse);
  ensure `prefers-reduced-motion` respected; final `npm run build` + full preview
  screenshot of the populated farm. Commit.

---

## Self-review notes
- All session creation uses the existing REST `api.sessions.create` (agent mode
  supported) — no backend changes across phases 2–4.
- HUD aggregates (`computeHud`) and the data hook (`useFarmGame`) already exist from
  Phase 1; Phase 3 only adds the rendering.
- Crop identities/states are unchanged from Phase 1's `farmArt.ts`.
