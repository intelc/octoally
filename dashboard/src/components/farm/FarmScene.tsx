import { useEffect, useMemo, useRef, useState } from 'react';
import { isoToScreen, zIndexFor } from '../../farm/iso';
import { IsoTile } from './IsoTile';
import { PlotSprite } from './PlotSprite';
import { FarmHud } from './FarmHud';
import { FarmToolbar, type ToolId } from './FarmToolbar';
import { SceneDecor } from './SceneDecor';
import { PlotTooltip } from './PlotTooltip';
import { FarmBurst } from './FarmBurst';
import { useFarmGame, type Plot } from '../../farm/useFarmGame';

/** Custom cursor showing the active tool's emoji (tip at bottom-left). */
function toolCursor(tool: ToolId): string {
  const e = tool === 'water' ? '💧' : tool === 'harvest' ? '🌾' : '🪏';
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='44' height='44'><text x='4' y='34' font-size='34'>${e}</text></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 8 36, cell`;
}

/** Which plot states a tool can act on (for highlight + intent). */
function eligibleForTool(state: string, tool: ToolId): boolean {
  if (tool === 'harvest') return state === 'ripe';
  if (tool === 'water') return ['seeded', 'growing', 'thirsty', 'resting', 'bugged', 'withered'].includes(state);
  return true; // dig clears anything
}

const TILE_W = 128;
const TILE_H = 64;

interface Cell { col: number; row: number; plot: Plot | null; x: number; y: number; }

/** Auto-size a near-square grid that fits all plots plus a few empty tiles to plant into. */
function gridDims(plotCount: number): { cols: number; rows: number } {
  const total = Math.max(plotCount + 3, 9);
  const cols = Math.ceil(Math.sqrt(total * 1.5));
  const rows = Math.ceil(total / cols);
  return { cols, rows };
}

function layout(plots: Plot[]): { cells: Cell[]; cx: number; cy: number } {
  const ordered = [...plots].sort((a, b) => a.plotId.localeCompare(b.plotId));
  const { cols, rows } = gridDims(plots.length);
  const cells: Cell[] = [];
  let i = 0;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const { x, y } = isoToScreen(col, row, TILE_W, TILE_H);
      cells.push({ col, row, plot: ordered[i] ?? null, x, y });
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      i++;
    }
  }
  return { cells, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

export function FarmScene({
  active, onInspect, onPlantEmpty, onFertilize, onHarvest, onHarvestAll, onKill, onWarehouse, onShop,
}: {
  active: boolean;
  onInspect: (plot: Plot) => void;
  onPlantEmpty: () => void;
  onFertilize: (plot: Plot) => void;
  onHarvest: (plot: Plot) => void;
  onHarvestAll: () => void;
  onKill: (plot: Plot) => void;
  onWarehouse: () => void;
  onShop: () => void;
}) {
  const { plots, hud, isLoading } = useFarmGame(active);
  const { cells, cx, cy } = useMemo(() => layout(plots), [plots]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [tool, setTool] = useState<ToolId | null>(null); // active batch tool
  const [burst, setBurst] = useState<'harvest' | 'levelup' | null>(null);
  const selected = plots.find((p) => p.plotId === selectedId) ?? null;
  const hovered = cells.find((c) => c.plot && c.plot.plotId === hoverId) ?? null;
  const ripeCount = plots.filter((p) => p.state === 'ripe').length;

  // Esc cancels the active tool
  useEffect(() => {
    if (!tool) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setTool(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tool]);

  // Celebrate level-ups (skip the initial 0 → N bump on first data load)
  const prevLevel = useRef(hud.level);
  useEffect(() => {
    if (prevLevel.current > 0 && hud.level > prevLevel.current) setBurst('levelup');
    prevLevel.current = hud.level;
  }, [hud.level]);

  const handleHarvestAll = () => {
    if (ripeCount > 0) setBurst('harvest'); // celebrate; review modal opens when burst finishes
    else onHarvestAll();
  };

  // drag-to-pan
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number; moved: boolean } | null>(null);

  const applyTool = (plot: Plot) => {
    if (tool === 'water') onFertilize(plot);
    else if (tool === 'harvest') onHarvest(plot);
    else if (tool === 'dig') onKill(plot);
  };

  const handlePlotClick = (plot: Plot) => {
    if (tool) applyTool(plot); // tool-first: stays active for batch
    else setSelectedId(plot.plotId);
  };

  const TOOL_LABEL: Record<ToolId, string> = { water: '💧 浇水', harvest: '🌾 收获', dig: '🪏 铲地' };

  return (
    <div
      onPointerDown={(e) => { drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y, moved: false }; }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        if (Math.abs(e.clientX - drag.current.x) + Math.abs(e.clientY - drag.current.y) > 3) drag.current.moved = true;
        setPan({ x: drag.current.px + (e.clientX - drag.current.x), y: drag.current.py + (e.clientY - drag.current.y) });
      }}
      onPointerUp={() => { drag.current = null; }}
      onPointerLeave={() => { drag.current = null; }}
      className="h-full w-full overflow-hidden relative select-none"
      style={{ background: 'linear-gradient(#bfe39a, #9fd17a 55%, #8ec96a)', cursor: tool ? toolCursor(tool) : 'grab' }}
    >
      <SceneDecor />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center text-sm" style={{ color: '#3a5a22' }}>
          Tending the farm…
        </div>
      )}

      {/* Field — centered: container at scene center, translated by field bbox center + pan */}
      <div style={{ position: 'absolute', left: '50%', top: '48%', transform: `translate(${-cx + pan.x}px, ${-cy + pan.y}px)` }}>
        {cells.map((cell) => (
          <div
            key={`${cell.col}-${cell.row}`}
            onMouseEnter={() => cell.plot && setHoverId(cell.plot.plotId)}
            onMouseLeave={() => cell.plot && setHoverId((h) => (h === cell.plot!.plotId ? null : h))}
            style={{
              position: 'absolute', left: cell.x, top: cell.y,
              width: TILE_W, height: TILE_H,
              transform: 'translateX(-50%)', zIndex: zIndexFor(cell.col, cell.row),
            }}
          >
            <IsoTile
              tileW={TILE_W} tileH={TILE_H}
              empty={!cell.plot}
              seed={cell.col + cell.row * 7}
              onClick={!cell.plot ? () => { if (!drag.current?.moved && !tool) onPlantEmpty(); } : undefined}
            />
            {cell.plot && (
              <PlotSprite
                plot={cell.plot}
                tileW={TILE_W}
                selected={cell.plot.plotId === selectedId}
                eligible={!!tool && eligibleForTool(cell.plot.state, tool)}
                dimmed={!!tool && !eligibleForTool(cell.plot.state, tool)}
                onClick={() => { if (!drag.current?.moved) handlePlotClick(cell.plot!); }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Hover tooltip (positioned in scene coords = field offset + cell pos) */}
      {hovered && hovered.plot && (
        <PlotTooltip
          plot={hovered.plot}
          x={`calc(50% + ${hovered.x - cx + pan.x}px)`}
          y={`calc(48% + ${hovered.y - cy + pan.y - TILE_H * 0.5}px)`}
        />
      )}

      {/* Active-tool banner */}
      {tool && (
        <div
          className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2"
          style={{ top: 52, zIndex: 11, background: 'rgba(120,72,30,.94)', color: '#ffe9c7', border: '2px solid #8a5a2a', borderRadius: 10, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}
        >
          Tool: {TOOL_LABEL[tool]} — click crops to apply
          <button onClick={() => setTool(null)} style={{ background: '#ffe9c7', color: '#8a5a2a', borderRadius: 6, padding: '1px 8px', fontWeight: 800 }}>✋ done</button>
        </div>
      )}

      {burst && (
        <FarmBurst
          kind={burst}
          onDone={() => { const wasHarvest = burst === 'harvest'; setBurst(null); if (wasHarvest) onHarvestAll(); }}
        />
      )}

      <FarmHud hud={hud} onShop={onShop} />
      <FarmToolbar
        selected={selected}
        ripeCount={ripeCount}
        activeTool={tool}
        onToolToggle={(t) => setTool((cur) => (cur === t ? null : t))}
        onInspect={onInspect}
        onHarvestAll={handleHarvestAll}
        onWarehouse={onWarehouse}
      />
    </div>
  );
}
