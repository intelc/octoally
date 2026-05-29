import type { Plot } from '../../farm/useFarmGame';

const ACTIVE = ['seeded', 'growing', 'thirsty', 'resting'];

/** Bottom wooden action toolbar — QQ农场 tools mapped to real session ops on the selected plot. */
export function FarmToolbar({
  selected, ripeCount,
  onInspect, onFertilize, onHarvest, onHarvestAll, onKill, onWarehouse,
}: {
  selected: Plot | null;
  ripeCount: number;
  onInspect: (p: Plot) => void;
  onFertilize: (p: Plot) => void;
  onHarvest: (p: Plot) => void;
  onHarvestAll: () => void;
  onKill: (p: Plot) => void;
  onWarehouse: () => void;
}) {
  const tool = (emoji: string, label: string, enabled: boolean, onClick: () => void) => (
    <button
      onClick={() => enabled && onClick()}
      disabled={!enabled}
      title={label}
      className="flex flex-col items-center justify-center px-2 transition-opacity"
      style={{ opacity: enabled ? 1 : 0.4, cursor: enabled ? 'pointer' : 'default', background: 'none', border: 'none', color: '#ffe9c7' }}
    >
      <span style={{ fontSize: 18, lineHeight: 1 }}>{emoji}</span>
      <span style={{ fontSize: 9, fontWeight: 700 }}>{label}</span>
    </button>
  );

  const isActive = !!selected && ACTIVE.includes(selected.state);
  const isRipe = selected?.state === 'ripe';

  return (
    <div
      className="absolute bottom-2 left-2 right-2 flex items-center justify-around"
      style={{ zIndex: 10, height: 52, background: 'rgba(120,72,30,.94)', border: '2px solid #8a5a2a', borderRadius: 14, boxShadow: '0 3px 0 rgba(0,0,0,.25)' }}
    >
      {tool('🔍', '查看', !!selected, () => selected && onInspect(selected))}
      {tool('💧', '浇水', isActive, () => selected && onFertilize(selected))}
      {tool('🌾', '收获', isRipe, () => selected && onHarvest(selected))}
      {tool('🧺', '全收', ripeCount > 0, onHarvestAll)}
      {tool('🪏', '铲地', !!selected, () => selected && onKill(selected))}
      {tool('📦', '仓库', true, onWarehouse)}
    </div>
  );
}
