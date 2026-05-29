/**
 * FarmDashboard — the Agent Farm / 开心农场 view.
 *
 * Renders OctoAlly sessions as farm "plots" using the server-side farm adapter
 * (trpc.farm.plots). Sessions become crops; their real status + live tracker
 * state become crop growth states. Primary actions: Inspect / Fertilize /
 * Harvest / Kill.
 */

import { useMemo, useState } from 'react';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '../../../server/src/trpc/router.js';
import { trpc } from '../lib/trpc';
import { Terminal } from './Terminal';
import {
  Sprout, Eye, Trash2, X, FlaskConical,
  Wheat, RefreshCw, Loader2, Send,
} from 'lucide-react';

/* Plot type, inferred from the tRPC router output. */
type Plot = inferRouterOutputs<AppRouter>['farm']['plots'][number];
type PlotState = Plot['state'];

/* ------------------------------------------------------------------ */
/* State metadata                                                      */
/* ------------------------------------------------------------------ */

const STATE_META: Record<PlotState, { emoji: string; label: string; color: string; anim?: string }> = {
  seeded:   { emoji: '🌱', label: 'Seeded',   color: '#a3a3a3' },
  growing:  { emoji: '🌿', label: 'Growing',  color: '#4ade80', anim: 'farm-sway' },
  thirsty:  { emoji: '💧', label: 'Thirsty',  color: '#38bdf8', anim: 'farm-pulse' },
  resting:  { emoji: '😴', label: 'Resting',  color: '#c084fc' },
  withered: { emoji: '💀', label: 'Withered', color: '#f87171' },
  bugged:   { emoji: '🐛', label: 'Bugged',   color: '#fb923c', anim: 'farm-pulse' },
  ripe:     { emoji: '🍎', label: 'Ripe',     color: '#fbbf24', anim: 'farm-bob' },
  fallow:   { emoji: '📦', label: 'Fallow',   color: '#6b7280' },
};

const ACTIVE_STATES: PlotState[] = ['seeded', 'growing', 'thirsty', 'resting'];
const FAILED_STATES: PlotState[] = ['bugged', 'withered'];

function fmtTokens(n: number | null): string {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function fmtElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

/* ------------------------------------------------------------------ */
/* Small visuals                                                       */
/* ------------------------------------------------------------------ */

function GrowthBar({ percent, color }: { percent: number; color: string }) {
  return (
    <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.max(2, Math.min(100, percent))}%`, background: color }}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Morning harvest summary                                             */
/* ------------------------------------------------------------------ */

function MorningHarvestSummary({ plots }: { plots: Plot[] }) {
  const ripe = plots.filter((p) => p.state === 'ripe').length;
  const thirsty = plots.filter((p) => p.state === 'thirsty').length;
  const bugged = plots.filter((p) => FAILED_STATES.includes(p.state)).length;
  const growing = plots.filter((p) => p.state === 'growing' || p.state === 'resting').length;

  return (
    <div
      className="rounded-xl px-5 py-4 mb-5 flex flex-wrap items-center gap-x-6 gap-y-2"
      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
    >
      <div>
        <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>早上收果子 · Good morning, farmer</div>
        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Your agents worked while you were away.</div>
      </div>
      <div className="flex items-center gap-5 ml-auto text-sm">
        <span style={{ color: STATE_META.ripe.color }}>🍎 {ripe} ready to harvest</span>
        <span style={{ color: STATE_META.thirsty.color }}>💧 {thirsty} need fertilizer</span>
        <span style={{ color: STATE_META.bugged.color }}>🐛 {bugged} got bugs</span>
        <span style={{ color: STATE_META.growing.color }}>🌿 {growing} still growing</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Plot card                                                           */
/* ------------------------------------------------------------------ */

function FarmPlotCard({
  plot, onInspect, onFertilize, onHarvest, onKill, killing,
}: {
  plot: Plot;
  onInspect: () => void;
  onFertilize: () => void;
  onHarvest: () => void;
  onKill: () => void;
  killing: boolean;
}) {
  const meta = STATE_META[plot.state];
  const isActive = ACTIVE_STATES.includes(plot.state);
  const isFailed = FAILED_STATES.includes(plot.state);
  const canHarvest = plot.state === 'ripe' || plot.state === 'resting';

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3 transition-shadow hover:shadow-lg"
      style={{ background: 'var(--bg-secondary)', border: `1px solid ${plot.state === 'ripe' ? meta.color : 'var(--border)'}` }}
    >
      {/* Header: crop sprite + state badge */}
      <div className="flex items-start gap-3">
        <div className={`text-4xl leading-none select-none ${meta.anim ?? ''}`} title={plot.crop.name}>
          {meta.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: `${meta.color}22`, color: meta.color }}
            >
              {meta.label}
            </span>
            <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
              {plot.crop.emoji} {plot.crop.name}
            </span>
            <span className="text-[10px] ml-auto px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
              {plot.cliType}
            </span>
          </div>
          <div className="text-sm font-medium mt-1 line-clamp-2" style={{ color: 'var(--text-primary)' }} title={plot.taskName}>
            {plot.taskName}
          </div>
        </div>
      </div>

      {/* Growth */}
      <div>
        <div className="flex justify-between text-[10px] mb-1" style={{ color: 'var(--text-secondary)' }}>
          <span>Growth</span>
          <span>{plot.growthPercent}%{plot.promptType ? ` · awaiting ${plot.promptType}` : ''}</span>
        </div>
        <GrowthBar percent={plot.growthPercent} color={meta.color} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        <Stat label="Runtime" value={fmtElapsed(plot.elapsedMs)} />
        <Stat label="Files" value={plot.filesChanged == null ? '—' : String(plot.filesChanged)} />
        <Stat label="Tokens" value={fmtTokens(plot.tokensSpent)} />
        <Stat label="Yield" value={String(plot.harvestValue)} />
      </div>
      {plot.contextUsedPercent != null && (
        <div>
          <div className="flex justify-between text-[10px] mb-1" style={{ color: 'var(--text-secondary)' }}>
            <span>🛖 Barn</span><span>{plot.contextUsedPercent}% full</span>
          </div>
          <GrowthBar percent={plot.contextUsedPercent} color="#94a3b8" />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1.5 mt-1">
        <ActionBtn onClick={onInspect} icon={<Eye className="w-3.5 h-3.5" />} label="Inspect" />
        {(isActive || isFailed) && (
          <ActionBtn
            onClick={onFertilize}
            icon={<FlaskConical className="w-3.5 h-3.5" />}
            label="Fertilize"
            color="#38bdf8"
          />
        )}
        {canHarvest && (
          <ActionBtn
            onClick={onHarvest}
            icon={<Wheat className="w-3.5 h-3.5" />}
            label="Harvest"
            color={STATE_META.ripe.color}
            primary={plot.state === 'ripe'}
          />
        )}
        {isActive ? (
          <ActionBtn
            onClick={onKill}
            icon={killing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            label="Kill"
            color="#f87171"
          />
        ) : isFailed ? (
          <ActionBtn onClick={onFertilize} icon={<RefreshCw className="w-3.5 h-3.5" />} label="Revive" color="#c084fc" />
        ) : null}
      </div>
    </div>
  );
}

function ActionBtn({
  onClick, icon, label, color, primary,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  color?: string;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors hover:opacity-90"
      style={{
        background: primary ? color : 'var(--bg-tertiary)',
        color: primary ? '#1a1a1a' : (color ?? 'var(--text-secondary)'),
        border: '1px solid var(--border)',
      }}
      title={label}
    >
      {icon}
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Terminal drawer (Inspect)                                           */
/* ------------------------------------------------------------------ */

function TerminalDrawer({ plot, onClose }: { plot: Plot; onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-30 flex justify-end" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <div
        className="h-full w-full max-w-3xl flex flex-col"
        style={{ background: 'var(--bg-primary)', borderLeft: '1px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-2 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
          <span className="text-lg">{STATE_META[plot.state].emoji}</span>
          <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{plot.taskName}</span>
          <button onClick={onClose} className="ml-auto p-1 rounded hover:opacity-80" style={{ color: 'var(--text-secondary)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 min-h-0">
          <Terminal sessionId={plot.terminalSessionId} cliType={plot.cliType} visible />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Fertilize modal                                                     */
/* ------------------------------------------------------------------ */

function FertilizeModal({ plot, onClose }: { plot: Plot; onClose: () => void }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${plot.terminalSessionId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: text, timeout: 1000, quiescenceMs: 300 }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fertilize');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-xl p-5 flex flex-col gap-3"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4" style={{ color: '#38bdf8' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Fertilize · add context</span>
          <button onClick={onClose} className="ml-auto p-1 rounded hover:opacity-80" style={{ color: 'var(--text-secondary)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Send instructions, an error paste, or "rerun the tests" to <span style={{ color: 'var(--text-primary)' }}>{plot.crop.name}</span>.
        </p>
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder="e.g. The login test still fails on Safari — check the cookie domain, then rerun the suite."
          className="w-full rounded-md p-2 text-sm resize-none outline-none"
          style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
        />
        {error && <span className="text-xs" style={{ color: 'var(--error)' }}>{error}</span>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 rounded-md text-xs" style={{ color: 'var(--text-secondary)', background: 'var(--bg-tertiary)' }}>Cancel</button>
          <button
            onClick={send}
            disabled={sending || !text.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium disabled:opacity-50"
            style={{ background: '#38bdf8', color: '#0a0a0a' }}
          >
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Fertilize
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Harvest modal                                                       */
/* ------------------------------------------------------------------ */

function HarvestModal({ plot, onClose, onOpenTerminal }: { plot: Plot; onClose: () => void; onOpenTerminal: () => void }) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl p-5 flex flex-col gap-4"
        style={{ background: 'var(--bg-secondary)', border: `1px solid ${STATE_META.ripe.color}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <Wheat className="w-5 h-5" style={{ color: STATE_META.ripe.color }} />
          <span className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Harvest {plot.crop.emoji} {plot.crop.name}</span>
          <button onClick={onClose} className="ml-auto p-1 rounded hover:opacity-80" style={{ color: 'var(--text-secondary)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Files changed" value={plot.filesChanged == null ? '—' : String(plot.filesChanged)} />
          <Stat label="Tokens" value={fmtTokens(plot.tokensSpent)} />
          <Stat label="Yield" value={String(plot.harvestValue)} />
        </div>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Review the diff, then commit or archive. (Test pass/fail isn't tracked yet — open the terminal to verify before committing.)
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={onOpenTerminal} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs" style={{ color: 'var(--text-primary)', background: 'var(--bg-tertiary)' }}>
            <Eye className="w-3.5 h-3.5" /> Open terminal / diff
          </button>
          <button onClick={onClose} className="px-3 py-1.5 rounded-md text-xs font-medium" style={{ background: STATE_META.ripe.color, color: '#1a1a1a' }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

type Filter = 'all' | 'ripe' | 'thirsty' | 'bugged' | 'growing';

export function FarmDashboard({ active }: { active: boolean }) {
  const { data, isLoading } = trpc.farm.plots.useQuery(undefined, {
    refetchInterval: active ? 4000 : false,
    enabled: active,
  });
  const utils = trpc.useUtils();
  const killMutation = trpc.sessions.kill.useMutation({
    onSettled: () => { utils.farm.plots.invalidate(); },
  });

  const [filter, setFilter] = useState<Filter>('all');
  const [inspectPlot, setInspectPlot] = useState<Plot | null>(null);
  const [fertilizePlot, setFertilizePlot] = useState<Plot | null>(null);
  const [harvestPlot, setHarvestPlot] = useState<Plot | null>(null);

  const plots = useMemo(() => data ?? [], [data]);
  const filtered = useMemo(() => {
    switch (filter) {
      case 'ripe': return plots.filter((p) => p.state === 'ripe');
      case 'thirsty': return plots.filter((p) => p.state === 'thirsty');
      case 'bugged': return plots.filter((p) => FAILED_STATES.includes(p.state));
      case 'growing': return plots.filter((p) => p.state === 'growing' || p.state === 'resting');
      default: return plots;
    }
  }, [plots, filter]);

  // Keep open overlays in sync with fresh data (so stats update live).
  const freshInspect = inspectPlot ? plots.find((p) => p.plotId === inspectPlot.plotId) ?? inspectPlot : null;

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: `All (${plots.length})` },
    { key: 'ripe', label: `🍎 Ripe` },
    { key: 'thirsty', label: `💧 Thirsty` },
    { key: 'bugged', label: `🐛 Bugged` },
    { key: 'growing', label: `🌿 Growing` },
  ];

  return (
    <div className="h-full overflow-auto relative" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-7xl mx-auto p-5">
        <MorningHarvestSummary plots={plots} />

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
              style={{
                background: filter === f.key ? 'var(--accent)' : 'var(--bg-secondary)',
                color: filter === f.key ? 'white' : 'var(--text-secondary)',
                border: '1px solid var(--border)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20 gap-2" style={{ color: 'var(--text-secondary)' }}>
            <Loader2 className="w-5 h-5 animate-spin" /> Tending the farm…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2 text-center" style={{ color: 'var(--text-secondary)' }}>
            <Sprout className="w-10 h-10" />
            <p className="text-sm">No crops here yet.</p>
            <p className="text-xs">Plant a task (start a session) and watch it grow.</p>
          </div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
            {filtered.map((plot) => (
              <FarmPlotCard
                key={plot.plotId}
                plot={plot}
                onInspect={() => setInspectPlot(plot)}
                onFertilize={() => setFertilizePlot(plot)}
                onHarvest={() => setHarvestPlot(plot)}
                onKill={() => killMutation.mutate({ id: plot.terminalSessionId })}
                killing={killMutation.isPending && killMutation.variables?.id === plot.terminalSessionId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Overlays */}
      {freshInspect && <TerminalDrawer plot={freshInspect} onClose={() => setInspectPlot(null)} />}
      {fertilizePlot && <FertilizeModal plot={fertilizePlot} onClose={() => setFertilizePlot(null)} />}
      {harvestPlot && (
        <HarvestModal
          plot={harvestPlot}
          onClose={() => setHarvestPlot(null)}
          onOpenTerminal={() => { setInspectPlot(harvestPlot); setHarvestPlot(null); }}
        />
      )}
    </div>
  );
}
