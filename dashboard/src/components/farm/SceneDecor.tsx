import { decorSprite } from '../../farm/farmArt';

/** Decorative scenery framing the farm field edges (behind the tile grid). */
export function SceneDecor() {
  const item = (name: Parameters<typeof decorSprite>[0], style: React.CSSProperties, w: number) => (
    <img src={decorSprite(name)} alt="" style={{ position: 'absolute', width: w, objectFit: 'contain', filter: 'drop-shadow(0 3px 2px rgba(0,0,0,0.2))', ...style }} />
  );
  return (
    <div className="absolute inset-0" style={{ zIndex: 0, pointerEvents: 'none' }}>
      {item('tree', { left: 14, top: 36 }, 120)}
      {item('house', { right: 18, top: 24 }, 160)}
      {item('pond', { right: 20, bottom: 56 }, 140)}
      {item('farmer', { left: 18, bottom: 44 }, 96)}
      {item('fence', { left: '38%', top: 18 }, 110)}
    </div>
  );
}
