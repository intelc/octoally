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
