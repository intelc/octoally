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

export type DecorName = 'house' | 'pond' | 'tree' | 'fence' | 'farmer';
export function decorSprite(name: DecorName): string {
  return `${BASE}/decor-${name}.png`;
}

/** Seed-packet catalog for the 商店 shop (frontend flavor; crop visual is still task-derived). */
export const CROP_CATALOG: { kind: CropKind; name: string; emoji: string; hint: string; price: number }[] = [
  { kind: 'bugfix',   name: 'Bugfix Berry',  emoji: '🍓', hint: 'Fix the bug: ',         price: 163 },
  { kind: 'feature',  name: 'Feature Apple', emoji: '🍎', hint: 'Implement: ',           price: 195 },
  { kind: 'refactor', name: 'Refactor Corn', emoji: '🌽', hint: 'Refactor: ',            price: 175 },
  { kind: 'test',     name: 'Test Grape',    emoji: '🍇', hint: 'Write tests for: ',     price: 168 },
  { kind: 'docs',     name: 'Docs Carrot',   emoji: '🥕', hint: 'Document: ',            price: 125 },
  { kind: 'generic',  name: 'Sprout',        emoji: '🌱', hint: '',                      price: 80 },
];
