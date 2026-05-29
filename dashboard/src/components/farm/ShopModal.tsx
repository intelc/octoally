import { X } from 'lucide-react';
import { CROP_CATALOG, cropSprite, type CropKind } from '../../farm/farmArt';

const TABS = [
  { key: 'seed', label: '🌱 种子', enabled: true },
  { key: 'fish', label: '🐟 鱼苗', enabled: false },
  { key: 'dog', label: '🐶 狗狗', enabled: false },
  { key: 'decor', label: '🎀 装饰', enabled: false },
];

/** 商店 shop — seed-packet catalog. Picking a packet opens the plant flow pre-seeded. */
export function ShopModal({ onClose, onPick }: { onClose: () => void; onPick: (kind: CropKind, hint: string) => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col max-h-[85vh]"
        style={{ background: '#f3e0b8', border: '3px solid #b07b3a' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ribbon header */}
        <div className="relative flex items-center justify-center py-3" style={{ background: '#ff8a3d', borderBottom: '3px solid #d96a20' }}>
          <span className="text-2xl font-black tracking-wide" style={{ color: '#fff', textShadow: '0 2px 0 #d96a20' }}>商店 · SHOP</span>
          <button onClick={onClose} className="absolute right-3 p-1 rounded-full" style={{ background: '#fff', color: '#d96a20' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-4 py-2" style={{ background: '#e6cd96' }}>
          {TABS.map((t) => (
            <span
              key={t.key}
              className="px-3 py-1 rounded-md text-xs font-bold"
              style={{
                background: t.enabled ? '#fff8e6' : 'transparent',
                color: t.enabled ? '#7a531a' : '#a98c5a',
                border: t.enabled ? '2px solid #d6a64a' : '2px solid transparent',
                opacity: t.enabled ? 1 : 0.6,
              }}
            >
              {t.label}
            </span>
          ))}
        </div>

        {/* Seed cards */}
        <div className="p-4 grid gap-3 overflow-auto" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
          {CROP_CATALOG.map((c) => (
            <button
              key={c.kind}
              onClick={() => onPick(c.kind, c.hint)}
              className="rounded-xl p-2 flex flex-col items-center gap-1 transition-transform hover:scale-[1.03]"
              style={{ background: '#fff8e6', border: '2px solid #c79a52' }}
              title={`Plant ${c.name}`}
            >
              <span className="text-[11px] font-bold" style={{ color: '#7a531a' }}>{c.name}</span>
              <img src={cropSprite(c.kind, 'ripe')} alt="" style={{ width: 72, height: 72, objectFit: 'contain' }} />
              <span className="text-xs font-bold flex items-center gap-1" style={{ color: '#c2410c' }}>🪙 {c.price}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
