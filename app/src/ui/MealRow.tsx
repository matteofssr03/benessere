import { Backpack, CookingPot } from 'lucide-preact';
import { rel } from '../lib/dates';
import { macroLine, r0 } from '../lib/format';
import { isPastAndEaten, type Meal } from '../lib/meals';
import { useApp } from '../state';
import { Check } from './Check';
import { STROKE } from './List';

interface Props {
  meal: Meal;
  /** Mostra alimenti, grammi e nota di preparazione direttamente nella riga. */
  detailed?: boolean;
  showDay?: boolean;
}

export const itemsLine = (m: Meal) =>
  m.items.map((x) => `${x.alimento}${x.g ? ` ${r0(x.g)} g` : ''}`).join(' · ');

/** Cella iOS di un pasto: orario, nome e macro, cerchio "Mangiato" a destra. */
export function MealRow({ meal: m, detailed, showDay }: Props) {
  const { clock, toggleMeal, openMeal } = useApp();
  const canEat = m.date <= clock.today;
  const dim = isPastAndEaten(m, clock);
  return (
    <div
      role="button"
      tabIndex={0}
      class={`cell inset-time meal pressable${dim ? ' dim' : ''}`}
      onClick={() => openMeal(m)}
      onKeyDown={(e) => { if (e.key === 'Enter') openMeal(m); }}
    >
      <div class="meal-time">{m.ora || '—'}</div>
      <div class="grow">
        <div class="meal-name">
          {m.pasto}
          {showDay && <span class="meal-day"> · {rel(m.date, clock.today)}</span>}
        </div>
        <div class="meal-macros">{macroLine(m)}</div>
        {detailed && <div class="meal-items">{itemsLine(m)}</div>}
        {m.portare && !dim && (
          <div class="chips"><span class="chip"><Backpack size={12} strokeWidth={2.25} />da portare</span></div>
        )}
        {detailed && m.prep.length > 0 && !dim && (
          <div class="meal-prep"><CookingPot size={14} strokeWidth={STROKE} /><span>{m.prep.join(' · ')}</span></div>
        )}
      </div>
      {canEat && (
        <Check
          on={m.eaten}
          partial={m.partial}
          label={m.eaten ? `${m.pasto}: mangiato, tocca per togliere` : `Segna ${m.pasto.toLowerCase()} come mangiato`}
          onToggle={() => toggleMeal(m)}
        />
      )}
    </div>
  );
}
