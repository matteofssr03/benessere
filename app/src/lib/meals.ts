// Raggruppamento dei pasti: un pasto = stessa Data + Pasto nel Piano pasti.

import { addDays, minusMinutes, normTime } from './dates';
import type { Clock, Consumo, Data, DayInfo, Macros, PlanItem } from './types';

export interface Meal extends Macros {
  key: string; // date|pasto
  date: string;
  pasto: string;
  ora: string;
  items: PlanItem[];
  portare: boolean;
  prep: string[];
  eatenN: number;
  eaten: boolean;
  partial: boolean;
}

export const eatKey = (date: string, pasto: string, alimento: string) => `${date}|${pasto}|${alimento}`;

export function eatenSet(consumi: Consumo[]): Set<string> {
  return new Set(consumi.map((c) => eatKey(c.date, c.pasto, c.alimento)));
}

export function mealsOf(d: Pick<Data, 'plan' | 'consumi'>, date: string, eaten = eatenSet(d.consumi)): Meal[] {
  const map = new Map<string, Meal>();
  for (const x of d.plan) {
    if (x.date !== date) continue;
    let m = map.get(x.pasto);
    if (!m) {
      m = { key: `${date}|${x.pasto}`, date, pasto: x.pasto, ora: normTime(x.ora), items: [], kcal: 0, p: 0, c: 0, f: 0,
        portare: false, prep: [], eatenN: 0, eaten: false, partial: false };
      map.set(x.pasto, m);
    }
    if (!m.ora && x.ora) m.ora = normTime(x.ora);
    m.items.push(x);
    m.kcal += x.kcal; m.p += x.p; m.c += x.c; m.f += x.f;
    if (x.portare) m.portare = true;
    if (x.prep && !m.prep.includes(x.prep)) m.prep.push(x.prep);
    if (eaten.has(eatKey(date, x.pasto, x.alimento))) m.eatenN++;
  }
  const list = [...map.values()];
  for (const m of list) {
    m.eaten = m.eatenN === m.items.length;
    m.partial = m.eatenN > 0 && !m.eaten;
  }
  // Ordine per orario; i pasti senza ora vanno in fondo, a parità resta l'ordine del piano.
  return list
    .map((m, i) => ({ m, i }))
    .sort((a, b) => (a.m.ora || '99') .localeCompare(b.m.ora || '99') || a.i - b.i)
    .map((x) => x.m);
}

export function totals(list: Macros[]): Macros {
  return list.reduce((t, x) => ({ kcal: t.kcal + x.kcal, p: t.p + x.p, c: t.c + x.c, f: t.f + x.f }), { kcal: 0, p: 0, c: 0, f: 0 });
}

export function eatenTotals(d: Pick<Data, 'consumi'>, date: string): Macros {
  return totals(d.consumi.filter((c) => c.date === date));
}

export function dayInfo(d: Pick<Data, 'days'>, date: string): DayInfo | null {
  return d.days.find((x) => x.date === date) ?? null;
}

/** I giorni a Bra non hanno piano: si mangia a braccio. */
export function isBra(info: DayInfo | null): boolean {
  return !!info && /\bbra\b/i.test(info.luogo);
}

export function isTraining(info: DayInfo | null): boolean {
  return !!info && !!info.allenamento.trim() && !/riposo|^-+$|^no$/i.test(info.allenamento.trim());
}

/**
 * Pasti non ancora mangiati da `from` per `nDays` giorni. Di oggi salta
 * quelli con orario passato da più di un'ora.
 */
export function upcoming(d: Pick<Data, 'plan' | 'consumi'>, clock: Clock, nDays: number, from = clock.today): Meal[] {
  const s = eatenSet(d.consumi);
  const limit = minusMinutes(clock.now, 60);
  const out: Meal[] = [];
  for (let i = 0; i < nDays; i++) {
    const k = addDays(from, i);
    for (const m of mealsOf(d, k, s)) {
      if (m.eaten) continue;
      if (k === clock.today && m.ora && m.ora < limit) continue;
      out.push(m);
    }
  }
  return out;
}

/** Un pasto mangiato e già passato si mostra attenuato. */
export function isPastAndEaten(m: Meal, clock: Clock): boolean {
  if (!m.eaten) return false;
  return m.date < clock.today || (m.date === clock.today && (!m.ora || m.ora <= clock.now));
}
