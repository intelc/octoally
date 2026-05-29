/** Isometric (2:1) screen placement for a tile at grid (col, row). */
export function isoToScreen(
  col: number,
  row: number,
  tileW: number,
  tileH: number,
): { x: number; y: number } {
  return {
    x: ((col - row) * tileW) / 2,
    y: ((col + row) * tileH) / 2,
  };
}

/** Painter's-order z-index: tiles further back (smaller col+row) draw first. */
export function zIndexFor(col: number, row: number): number {
  return col + row;
}
