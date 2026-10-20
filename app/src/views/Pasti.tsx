import { CalendarX } from 'lucide-preact';
import { useEffect, useRef } from 'preact/hooks';
import { dayNum, dayName, monthName, weekOf } from '../lib/dates';
import { r0 } from '../lib/format';
import { dayInfo, isBra, isTraining, mealsOf, totals } from '../lib/meals';
import { useApp } from '../state';
import { Empty, Group } from '../ui/List';
import { MealRow } from '../ui/MealRow';
import { Page } from '../ui/Page';

/** Tutta la settimana in una lista, con le intestazioni dei giorni fisse in alto. */
export function Pasti({ firstOpen }: { firstOpen: boolean }) {
  const { data, clock } = useApp();
  const t = clock.today;
  const days = weekOf(t);
  const todayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!firstOpen) return;
    // All'apertura scorre da sola a oggi (lunedì: in cima, sotto il titolo).
    if (todayRef.current && t !== days[0]) todayRef.current.scrollIntoView({ block: 'start' });
    else window.scrollTo(0, 0);
  }, []);

  return (
    <Page title="Pasti" eyebrow="Questa settimana" flat>
      {days.map((k) => {
        const info = dayInfo(data, k);
        const meals = mealsOf(data, k);
        const tot = totals(meals);
        const tg = data.target;
        return (
          <div key={k}>
            <div class="day-header" ref={k === t ? todayRef : undefined} id={`day-${k}`}>
              <div class="day-header-row">
                <span class={`day-title${k === t ? ' today' : ''}`}>{k === t ? 'Oggi · ' : ''}{dayName(k)} {dayNum(k)} {monthName(k)}</span>
                {meals.length > 0 && <span class="caption secondary num">{r0(tot.kcal)} / {r0(tg.kcal)} kcal</span>}
              </div>
              {info && <div class="day-meta">{[info.luogo, isTraining(info) ? info.allenamento : ''].filter(Boolean).join(' · ')}</div>}
              {meals.length > 0 && (
                <div class="day-meta num">P {r0(tot.p)}/{r0(tg.p)} · C {r0(tot.c)}/{r0(tg.c)} · G {r0(tot.f)}/{r0(tg.f)} g</div>
              )}
            </div>
            <Group>
              {meals.length
                ? meals.map((m) => <MealRow key={m.key} meal={m} detailed />)
                : isBra(info)
                  ? <div class="note">A Bra, a braccio</div>
                  : <Empty icon={CalendarX} inGroup>Nessun pasto pianificato</Empty>}
            </Group>
          </div>
        );
      })}
    </Page>
  );
}
