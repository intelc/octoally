import { describe, it, expect } from 'vitest';
import { isoToScreen, zIndexFor } from './iso';

describe('isoToScreen', () => {
  it('places origin tile at (0,0)', () => {
    expect(isoToScreen(0, 0, 128, 64)).toEqual({ x: 0, y: 0 });
  });
  it('moves col right-and-down, row left-and-down', () => {
    expect(isoToScreen(1, 0, 128, 64)).toEqual({ x: 64, y: 32 });
    expect(isoToScreen(0, 1, 128, 64)).toEqual({ x: -64, y: 32 });
  });
  it('diagonal sums on y', () => {
    expect(isoToScreen(2, 2, 128, 64)).toEqual({ x: 0, y: 128 });
  });
});

describe('zIndexFor', () => {
  it('orders back-to-front by col+row', () => {
    expect(zIndexFor(0, 0)).toBe(0);
    expect(zIndexFor(2, 1)).toBe(3);
    expect(zIndexFor(1, 2)).toBe(3);
  });
});
