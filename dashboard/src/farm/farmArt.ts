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
