import { describe, it, expect } from 'vitest';
import { stageForState, overlayForState, cropSprite, overlaySprite } from './farmArt';

describe('stageForState', () => {
  it('maps lifecycle to a growth stage or null', () => {
    expect(stageForState('seeded')).toBe('seed');
    expect(stageForState('growing')).toBe('growing');
    expect(stageForState('thirsty')).toBe('growing');
    expect(stageForState('resting')).toBe('growing');
    expect(stageForState('bugged')).toBe('growing');
    expect(stageForState('withered')).toBe('growing');
    expect(stageForState('ripe')).toBe('ripe');
    expect(stageForState('fallow')).toBeNull(); // cleared soil, no crop
  });
});

describe('overlayForState', () => {
  it('returns an overlay key for decorated states, else null', () => {
    expect(overlayForState('thirsty')).toBe('thirsty');
    expect(overlayForState('bugged')).toBe('bugged');
    expect(overlayForState('withered')).toBe('withered');
    expect(overlayForState('resting')).toBe('resting');
    expect(overlayForState('ripe')).toBe('ripe');
    expect(overlayForState('growing')).toBeNull();
    expect(overlayForState('seeded')).toBeNull();
    expect(overlayForState('fallow')).toBeNull();
  });
});

describe('sprite paths', () => {
  it('builds crop sprite path from kind + stage', () => {
    expect(cropSprite('refactor', 'ripe')).toBe('/farm-art/crop-refactor-ripe.png');
  });
  it('builds overlay sprite path', () => {
    expect(overlaySprite('bugged')).toBe('/farm-art/overlay-bugged.png');
  });
});
