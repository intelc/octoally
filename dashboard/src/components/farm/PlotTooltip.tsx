import type { Plot } from '../../farm/useFarmGame';

const STATE_LABEL: Record<string, string> = {
  seeded: '🌱 Seeded', growing: '🌿 Growing', thirsty: '💧 Needs input',
  resting: '😴 Resting', withered: '💀 Withered', bugged: '🐛 Bugged',
  ripe: '🍎 Ripe', fallow: '📦 Fallow',
};

function fmtTokens(n: number | null): string {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

/** QQ-style hover bubble showing a plot's crop + live state, positioned at (x,y) in the scene. */
export function PlotTooltip({ plot, x, y }: { plot: Plot; x: number | string; y: number | string }) {
  return (
    <div
      style={{
        position: 'absolute', left: x, top: y, transform: 'translate(-50%, -100%)',
        zIndex: 20, pointerEvents: 'none', whiteSpace: 'nowrap',
        background: 'rgba(255,248,230,0.97)', border: '2px solid #d6a64a', borderRadius: 10,
        padding: '6px 10px', boxShadow: '0 3px 8px rgba(0,0,0,0.25)', color: '#5a3d12',
      }}
    >
      <div style={{ fontWeight: 800, fontSize: 12 }}>{plot.crop.emoji} {plot.crop.name}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#8a5a2a' }}>
        {STATE_LABEL[plot.state] ?? plot.state} · {plot.growthPercent}%
        {plot.promptType ? ` · ${plot.promptType}` : ''}
      </div>
      <div style={{ fontSize: 10, color: '#8a6a3a' }} className="truncate" >
        {plot.filesChanged ?? '—'} files · {fmtTokens(plot.tokensSpent)} tok · {plot.cliType}
      </div>
      <div style={{ fontSize: 10, color: '#a98c5a', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>{plot.taskName}</div>
    </div>
  );
}
