import { X, Package } from 'lucide-react';
import { cropSprite, type CropKind } from '../../farm/farmArt';
import type { Plot } from '../../farm/useFarmGame';

const STORED = ['ripe', 'fallow', 'bugged', 'withered'];

function fmtTokens(n: number | null): string {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

/** 仓库 warehouse — finished/cleared crops (the day's harvest), with yield + diff access. */
export function Warehouse({ plots, onClose, onInspect }: { plots: Plot[]; onClose: () => void; onInspect: (p: Plot) => void }) {
  const stored = plots.filter((p) => STORED.includes(p.state));
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div
        className="w-full max-w-xl rounded-2xl overflow-hidden flex flex-col max-h-[85vh]"
        style={{ background: '#f3e0b8', border: '3px solid #b07b3a' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex items-center justify-center py-3" style={{ background: '#8a5a2a', borderBottom: '3px solid #6b4420' }}>
          <span className="text-xl font-black flex items-center gap-2" style={{ color: '#ffe9c7' }}><Package className="w-5 h-5" /> 仓库 · Warehouse</span>
          <button onClick={onClose} className="absolute right-3 p-1 rounded-full" style={{ background: '#fff8e6', color: '#8a5a2a' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-auto flex flex-col gap-2">
          {stored.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: '#7a531a' }}>Nothing stored yet — harvest some ripe crops!</p>
          ) : stored.map((p) => (
            <button
              key={p.plotId}
              onClick={() => onInspect(p)}
              className="flex items-center gap-3 rounded-lg p-2 text-left transition-transform hover:scale-[1.01]"
              style={{ background: '#fff8e6', border: '2px solid #c79a52' }}
            >
              <img src={cropSprite(p.crop.kind as CropKind, p.state === 'ripe' ? 'ripe' : 'growing')} alt="" style={{ width: 44, height: 44, objectFit: 'contain' }} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold truncate" style={{ color: '#5a3d12' }}>{p.crop.name}</div>
                <div className="text-[11px] truncate" style={{ color: '#8a6a3a' }}>{p.taskName}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[10px] font-bold uppercase" style={{ color: p.state === 'ripe' ? '#16a34a' : '#b45309' }}>{p.state}</div>
                <div className="text-[11px]" style={{ color: '#8a6a3a' }}>{p.filesChanged ?? '—'} files · {fmtTokens(p.tokensSpent)} tok</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
