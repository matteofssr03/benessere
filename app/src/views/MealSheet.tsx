import { Backpack, CookingPot } from 'lucide-preact';
import { longDate } from '../lib/dates';
import { r0 } from '../lib/format';
import type { Meal } from '../lib/meals';
import { useApp } from '../state';
import { Group, Section, STROKE } from '../ui/List';
import { Sheet } from '../ui/Sheet';

const MACROS = [['kcal', 'kcal', '--red'], ['p', 'Proteine', '--blue'], ['c', 'Carbo', '--yellow'], ['f', 'Grassi', '--purple']] as const;

/** Dettaglio di un pasto: alimenti, grammi, nota di preparazione. */
export function MealSheet({ meal: m, onClose }: { meal: Meal; onClose: () => void }) {
  const { clock, toggleMeal } = useApp();
  const canEat = m.date <= clock.today;
  return (
    <Sheet title={m.pasto} subtitle={`${longDate(m.date)}${m.ora ? ` · ${m.ora}` : ''}`} onClose={onClose}>
      <Section>
        <Group>
          <div class="macro-strip">
            {MACROS.map(([k, label, color]) => (
              <div key={k}><b>{r0(m[k])}{k === 'kcal' ? '' : ' g'}</b><span><i class="dot" style={{ background: `var(${color})` }} />{label}</span></div>
            ))}
          </div>
        </Group>
      </Section>
      <Section header="Alimenti">
        <Group>
          {m.items.map((x) => (
            <div class="cell" key={x.alimento}>
              <div class="grow">
                {x.alimento}
                {x.stima && <span class="secondary caption"> · stima</span>}
                <div class="caption secondary">{r0(x.kcal)} kcal · P {r0(x.p)} · C {r0(x.c)} · G {r0(x.f)}</div>
              </div>
              <span class="cell-value num">{x.g ? `${r0(x.g)} g` : ''}</span>
            </div>
          ))}
        </Group>
      </Section>
      {(m.portare || m.prep.length > 0) && (
        <Section header="Preparazione">
          <Group>
            {m.portare && (
              <div class="cell inset-icon"><span class="cell-icon" style={{ color: 'var(--orange)' }}><Backpack size={22} strokeWidth={STROKE} /></span><div class="grow">Da portare fuori</div></div>
            )}
            {m.prep.map((p) => (
              <div class="cell inset-icon" key={p}><span class="cell-icon" style={{ color: 'var(--orange)' }}><CookingPot size={22} strokeWidth={STROKE} /></span><div class="grow">{p}</div></div>
            ))}
          </Group>
        </Section>
      )}
      {canEat && (
        <div class="section">
          <button type="button" class={`btn pressable${m.eaten ? ' plain' : ''}`} onClick={() => { toggleMeal(m); onClose(); }}>
            {m.eaten ? 'Segna come non mangiato' : m.partial ? 'Completa il pasto' : 'Segna come mangiato'}
          </button>
        </div>
      )}
    </Sheet>
  );
}
