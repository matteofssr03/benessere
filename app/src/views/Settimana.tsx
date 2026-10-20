import { CalendarX, ChevronLeft, ChevronRight, Dumbbell, MapPin } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { addDays, dayNum, dayShort, longDate, mondayOf, monthName } from '../lib/dates';
import { macroLine, r0 } from '../lib/format';
import { dayInfo, isBra, isTraining, mealsOf, totals } from '../lib/meals';
import { useApp } from '../state';
import { Cell, Empty, Group, IconButton, Section, STROKE } from '../ui/List';
import { MealRow } from '../ui/MealRow';
import { Page } from '../ui/Page';

export function Settimana() {
  const { data, clock } = useApp();
  const [mon, setMon] = useState(mondayOf(clock.today));
  const [sel, setSel] = useState(clock.today);
  const week = Array.from({ length: 7 }, (_, i) => addDays(mon, i));
  const shift = (n: number) => {
    const m = addDays(mon, 7 * n);
    setMon(m);
    setSel(m === mondayOf(clock.today) ? clock.today : m);
  };
  const end = week[6];
  const range = monthName(mon) === monthName(end)
    ? `${dayNum(mon)} – ${dayNum(end)} ${monthName(end)}`
    : `${dayNum(mon)} ${monthName(mon)} – ${dayNum(end)} ${monthName(end)}`;

  const info = dayInfo(data, sel);
  const meals = mealsOf(data, sel);

  return (
    <Page title="Settimana">
      <Section>
        <Group>
          <div class="week-nav">
            <IconButton label="Settimana prima" onClick={() => shift(-1)}><ChevronLeft size={24} strokeWidth={STROKE} /></IconButton>
            <span class="week-range">{range}</span>
            <IconButton label="Settimana dopo" onClick={() => shift(1)}><ChevronRight size={24} strokeWidth={STROKE} /></IconButton>
          </div>
          <div class="strip" role="tablist">
            {week.map((k) => {
              const i = dayInfo(data, k);
              const train = isTraining(i);
              const plan = data.plan.some((x) => x.date === k);
              return (
                <button
                  type="button" key={k} role="tab" aria-selected={k === sel}
                  aria-label={`${longDate(k)}${plan ? ', piano pasti' : ''}${train ? ', allenamento' : ''}`}
                  class={`strip-day${k === sel ? ' sel' : ''}${k === clock.today ? ' today' : ''}`}
                  onClick={() => setSel(k)}
                >
                  <span class="strip-w">{dayShort(k).slice(0, 1)}</span>
                  <span class="strip-n">{dayNum(k)}</span>
                  <span class={`strip-dot${train ? ' train' : plan ? ' plan' : ''}`} />
                </button>
              );
            })}
          </div>
          <div class="legend"><span><i style={{ background: 'var(--green)' }} />piano pasti</span><span><i style={{ background: 'var(--orange)' }} />allenamento</span></div>
        </Group>
      </Section>

      <Section header={longDate(sel)}>
        <Group>
          {info ? (
            <>
              <Cell icon={MapPin}>{info.luogo || 'Luogo non indicato'}</Cell>
              <Cell icon={Dumbbell} iconColor={isTraining(info) ? '--orange' : undefined}>
                {isTraining(info) ? info.allenamento : <span class="secondary">{info.allenamento || 'Nessun allenamento'}</span>}
              </Cell>
            </>
          ) : (
            <Cell><span class="secondary">Nessuna informazione per questo giorno</span></Cell>
          )}
        </Group>
      </Section>

      {meals.length > 0 ? (
        <Section
          header={`Piano · ${r0(totals(meals).kcal)} di ${r0(data.target.kcal)} kcal`}
          footer={macroLine(totals(meals))}
        >
          <Group>{meals.map((m) => <MealRow key={m.key} meal={m} />)}</Group>
        </Section>
      ) : (
        <Section>
          <Group>
            {isBra(info)
              ? <div class="note">A Bra si mangia a braccio, senza piano.</div>
              : <Empty icon={CalendarX} inGroup>Nessun pasto pianificato per questo giorno</Empty>}
          </Group>
        </Section>
      )}
    </Page>
  );
}
