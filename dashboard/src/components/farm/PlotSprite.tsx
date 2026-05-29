import { CropSprite } from './CropSprite';
import type { Plot } from '../../farm/useFarmGame';
import type { CropKind, PlotState } from '../../farm/farmArt';

/** A crop sitting on its tile, with a hover label, selection highlight, and click handler. */
export function PlotSprite({ plot, tileW, selected, eligible, onClick }: { plot: Plot; tileW: number; selected?: boolean; eligible?: boolean; onClick: () => void }) {
  const glow = selected
    ? 'drop-shadow(0 0 6px rgba(255,236,150,0.95))'
    : eligible
      ? 'drop-shadow(0 0 6px rgba(120,255,140,0.95))'
      : undefined;
  return (
    <button
      onClick={onClick}
      className={eligible && !selected ? 'farm-pulse' : undefined}
      title={`${plot.crop.name} — ${plot.state} · ${plot.taskName}`}
      style={{
        position: 'absolute', left: '50%', bottom: tileW * 0.12,
        transform: `translateX(-50%) scale(${selected ? 1.12 : eligible ? 1.06 : 1})`,
        transformOrigin: 'bottom center',
        background: 'none', border: 'none', cursor: 'pointer', padding: 0, zIndex: 2,
        filter: glow,
      }}
    >
      <CropSprite kind={plot.crop.kind as CropKind} state={plot.state as PlotState} size={tileW * 0.66} />
    </button>
  );
}
