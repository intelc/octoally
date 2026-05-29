import type { HudStats } from '../../farm/farmAggregates';

/** Wooden top HUD: level / coins / VIP + shop button. Values derive from real plot data. */
export function FarmHud({ hud, onShop }: { hud: HudStats; onShop: () => void }) {
  const pill: React.CSSProperties = {
    background: '#fff8e6', border: '2px solid #d6a64a', borderRadius: 20,
    padding: '2px 12px', fontSize: 12, fontWeight: 800, color: '#7a531a',
  };
  return (
    <div className="absolute top-2 left-2 right-2 flex items-center gap-2" style={{ zIndex: 10 }}>
      <span style={pill}>🌾 Lv {hud.level}</span>
      <span style={pill}>🪙 {hud.coins.toLocaleString()}</span>
      <span style={{ ...pill, background: '#ffe9a8' }}>⭐ VIP</span>
      <button
        onClick={onShop}
        className="ml-auto"
        style={{ background: '#ff8a3d', color: '#fff', border: '2px solid #d96a20', borderRadius: 10, padding: '4px 12px', fontSize: 12, fontWeight: 800 }}
      >
        🛒 商店
      </button>
    </div>
  );
}
