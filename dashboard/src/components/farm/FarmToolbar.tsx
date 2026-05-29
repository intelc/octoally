import type { Plot } from '../../farm/useFarmGame';

export type ToolId = 'water' | 'harvest' | 'dig';

/** Bottom wooden action toolbar. Tool buttons (water/harvest/dig) toggle a batch
 *  mode (select tool → click crops to apply); inspect/harvest-all/warehouse are one-shot. */
export function FarmToolbar({
  selected, ripeCount, activeTool,
  onToolToggle, onInspect, onHarvestAll, onWarehouse,
}: {
  selected: Plot | null;
  ripeCount: number;
  activeTool: ToolId | null;
  onToolToggle: (tool: ToolId) => void;
  onInspect: (p: Plot) => void;
  onHarvestAll: () => void;
  onWarehouse: () => void;
}) {
  const btn = (emoji: string, label: string, enabled: boolean, on: boolean, onClick: () => void) => (
    <button
      onClick={() => enabled && onClick()}
      disabled={!enabled}
      title={label}
      className="flex flex-col items-center justify-center px-2 rounded-md transition-all"
      style={{
        opacity: enabled ? 1 : 0.4, cursor: enabled ? 'pointer' : 'default',
        background: on ? 'rgba(255,233,150,0.25)' : 'none',
        border: on ? '2px solid #ffe9a8' : '2px solid transparent',
        color: '#ffe9c7',
      }}
    >
      <span style={{ fontSize: 18, lineHeight: 1 }}>{emoji}</span>
      <span style={{ fontSize: 9, fontWeight: 700 }}>{label}</span>
    </button>
  );

  return (
    <div
      className="absolute bottom-2 left-2 right-2 flex items-center justify-around"
      style={{ zIndex: 10, height: 52, background: 'rgba(120,72,30,.94)', border: '2px solid #8a5a2a', borderRadius: 14, boxShadow: '0 3px 0 rgba(0,0,0,.25)' }}
    >
      {btn('🔍', '查看', !!selected, false, () => selected && onInspect(selected))}
      {btn('💧', '浇水', true, activeTool === 'water', () => onToolToggle('water'))}
      {btn('🌾', '收获', true, activeTool === 'harvest', () => onToolToggle('harvest'))}
      {btn('🧺', '全收', ripeCount > 0, false, onHarvestAll)}
      {btn('🪏', '铲地', true, activeTool === 'dig', () => onToolToggle('dig'))}
      {btn('📦', '仓库', true, false, onWarehouse)}
    </div>
  );
}
