import { r0 } from '../lib/format';
import type { Macros } from '../lib/types';

const DEFS: { k: keyof Macros; label: string; color: string; unit: string }[] = [
  { k: 'kcal', label: 'kcal', color: '--red', unit: '' },
  { k: 'p', label: 'Proteine', color: '--blue', unit: ' g' },
  { k: 'c', label: 'Carbo', color: '--yellow', unit: ' g' },
  { k: 'f', label: 'Grassi', color: '--purple', unit: ' g' },
];

const R = 40;
const W = 10;
const C = 2 * Math.PI * R;

/** Quattro anelli affiancati in stile Fitness, con una tacca su quanto prevede il piano di oggi. */
export function Rings({ eaten, plan, target }: { eaten: Macros; plan: Macros; target: Macros }) {
  return (
    <div class="rings">
      {DEFS.map((d) => {
        const t = target[d.k] || 1;
        const pct = Math.min(1, eaten[d.k] / t);
        const planPct = Math.min(1, plan[d.k] / t);
        const a = planPct * 2 * Math.PI;
        const col = `var(${d.color})`;
        return (
          <div class="ring" key={d.k} role="img" aria-label={`${d.label}: ${r0(eaten[d.k])} su ${r0(target[d.k])}${d.unit}`}>
            <div class="ring-box">
              <svg viewBox="0 0 100 100">
                <circle class="ring-track" cx="50" cy="50" r={R} fill="none" stroke={col} stroke-width={W} />
                <circle
                  class="ring-bar" cx="50" cy="50" r={R} fill="none" stroke={col} stroke-width={W} stroke-linecap="round"
                  stroke-dasharray={C} stroke-dashoffset={C * (1 - pct)} style={{ opacity: pct > 0 ? 1 : 0 }}
                />
                {plan[d.k] > 0 && (
                  <line
                    class="ring-tick" stroke-width="2.5" stroke-linecap="round"
                    x1={50 + (R - W / 2 - 1) * Math.cos(a)} y1={50 + (R - W / 2 - 1) * Math.sin(a)}
                    x2={50 + (R + W / 2 + 1) * Math.cos(a)} y2={50 + (R + W / 2 + 1) * Math.sin(a)}
                  />
                )}
              </svg>
              <div class="ring-num">{r0(eaten[d.k])}</div>
            </div>
            <div class="ring-label" style={{ color: col }}>{d.label}</div>
            <div class="ring-target">/ {r0(target[d.k])}{d.unit}</div>
          </div>
        );
      })}
    </div>
  );
}
