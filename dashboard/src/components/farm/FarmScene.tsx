import { useMemo, useRef, useState } from 'react';
import { isoToScreen, zIndexFor } from '../../farm/iso';
import { IsoTile } from './IsoTile';
import { PlotSprite } from './PlotSprite';
import { FarmHud } from './FarmHud';
import { FarmToolbar } from './FarmToolbar';
import { useFarmGame, type Plot } from '../../farm/useFarmGame';

const TILE_W = 132;
const TILE_H = 66;
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
  const cells = useMemo(() => layout(plots), [plots]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = plots.find((p) => p.plotId === selectedId) ?? null;
  const ripeCount = plots.filter((p) => p.state === 'ripe').length;

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
          left: `calc(50% + ${pan.x}px)`, top: `calc(14% + ${pan.y}px)`,
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
              {cell.plot && (
                <PlotSprite
                  plot={cell.plot}
                  tileW={TILE_W}
                  selected={cell.plot.plotId === selectedId}
                  onClick={() => setSelectedId(cell.plot!.plotId)}
                />
              )}
            </div>
          );
        })}
      </div>

      <FarmHud hud={hud} onShop={onShop} />
      <FarmToolbar
        selected={selected}
        ripeCount={ripeCount}
        onInspect={onInspect}
        onFertilize={onFertilize}
        onHarvest={onHarvest}
        onHarvestAll={onHarvestAll}
        onKill={onKill}
        onWarehouse={onWarehouse}
      />
    </div>
  );
}
