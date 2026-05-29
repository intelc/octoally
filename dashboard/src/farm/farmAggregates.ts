export interface HudStats { coins: number; level: number; }

interface PlotLike { state: string; harvestValue: number; }

export function computeHud(plots: PlotLike[]): HudStats {
  let coins = 0;
  let level = 0;
  for (const p of plots) {
    coins += p.harvestValue ?? 0;
    if (p.state === 'ripe' || p.state === 'fallow') level += 1;
  }
  return { coins, level };
}
