import { describe, it, expect } from 'vitest';
import { computeHud } from './farmAggregates';

const plot = (state: string, harvestValue: number) =>
  ({ state, harvestValue } as { state: string; harvestValue: number });

describe('computeHud', () => {
  it('coins = sum of harvestValue', () => {
    const hud = computeHud([plot('ripe', 50), plot('growing', 10), plot('bugged', 3)]);
    expect(hud.coins).toBe(63);
  });
  it('level = count of ripe + fallow (harvested/cleared)', () => {
    const hud = computeHud([plot('ripe', 50), plot('fallow', 0), plot('growing', 10)]);
    expect(hud.level).toBe(2);
  });
  it('handles empty', () => {
    expect(computeHud([])).toEqual({ coins: 0, level: 0 });
  });
});
