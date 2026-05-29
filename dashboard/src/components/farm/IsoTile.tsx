import { soilSprite } from '../../farm/farmArt';

const VARIANTS = ['normal', 'dark', 'red'] as const;

/** A single isometric soil tile. `seed` picks a stable soil variant for visual variety. */
export function IsoTile({
  tileW, tileH, empty, seed = 0, onClick,
}: {
  tileW: number; tileH: number; empty?: boolean; seed?: number; onClick?: () => void;
}) {
  const variant = VARIANTS[seed % VARIANTS.length];
  return (
    <img
      src={soilSprite(variant)}
      alt=""
      onClick={onClick}
      style={{
        width: tileW * 1.5, height: 'auto', display: 'block',
        marginLeft: tileW * -0.25, marginTop: tileH * -0.4,
        cursor: onClick ? 'pointer' : 'default',
        opacity: empty ? 0.9 : 1,
        filter: empty ? 'saturate(0.55) brightness(1.08)' : undefined,
      }}
    />
  );
}
