// Effetto locale (ottimistico) di una scrittura: stessa logica dell'endpoint,
// applicata alla copia dei dati che sta sul telefono. Funzioni pure.

import { mondayOf } from './dates';
import { eatKey, eatenSet } from './meals';
import type { Data, Op } from './types';

export function applyOp(d: Data, op: Op, today: string): Data {
  if (op.kind === 'meal') {
    const items = d.plan.filter((x) => x.date === op.date && x.pasto === op.pasto);
    if (!op.eaten) {
      const names = new Set(items.map((x) => x.alimento));
      return { ...d, consumi: d.consumi.filter((c) => !(c.date === op.date && c.pasto === op.pasto && names.has(c.alimento))) };
    }
    const have = eatenSet(d.consumi);
    const add = items
      .filter((x) => !have.has(eatKey(op.date, op.pasto, x.alimento)))
      .map((x) => ({ date: op.date, pasto: op.pasto, alimento: x.alimento, g: x.g ?? 0, kcal: x.kcal, p: x.p, c: x.c, f: x.f }));
    return add.length ? { ...d, consumi: [...d.consumi, ...add] } : d;
  }
  if (op.bought) return { ...d, spesa: [...d.spesa, { date: today, alimento: op.alimento, g: op.grams }] };
  const mon = mondayOf(today);
  return { ...d, spesa: d.spesa.filter((b) => !(b.alimento === op.alimento && b.date >= mon)) };
}
