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
        position: 'absolute', left: '50%', bottom: tileW * 0.12,
        transform: 'translateX(-50%)', background: 'none', border: 'none',
        cursor: 'pointer', padding: 0, zIndex: 2,
      }}
    >
      <CropSprite kind={plot.crop.kind as CropKind} state={plot.state as PlotState} size={tileW * 0.66} />
    </button>
  );
}
