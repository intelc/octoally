import { useEffect } from 'react';

const SPARKS = [
  { e: '🪙', dx: -120, dy: -90 }, { e: '✨', dx: 110, dy: -100 },
  { e: '🪙', dx: -90, dy: -150 }, { e: '✨', dx: 140, dy: -40 },
  { e: '🌟', dx: -160, dy: -40 }, { e: '🪙', dx: 80, dy: -160 },
  { e: '✨', dx: 0, dy: -180 }, { e: '🌟', dx: 60, dy: -110 },
];

/** Celebratory golden burst for harvest-all / level-up. Auto-dismisses after ~1.7s. */
export function FarmBurst({ kind, onDone }: { kind: 'harvest' | 'levelup'; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1700);
    return () => clearTimeout(t);
  }, [onDone]);

  const label = kind === 'levelup' ? '⭐ Level Up!' : '🌾 大丰收 · Big Harvest!';

  return (
    <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 30, pointerEvents: 'none' }}>
      <div className="farm-burst-ring" />
      {SPARKS.map((s, i) => (
        <span
          key={i}
          className="farm-burst-spark"
          style={{ '--dx': `${s.dx}px`, '--dy': `${s.dy}px`, animationDelay: `${i * 40}ms` } as React.CSSProperties}
        >
          {s.e}
        </span>
      ))}
      <div className="farm-burst-label">{label}</div>
    </div>
  );
}
