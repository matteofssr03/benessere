// Modalità di prova: il dato finto spostato sulla settimana corrente,
// con scritture che restano solo sul telefono.

import fixture from '../fixtures/data.json';
import { addDays, mondayOf, parseKey, romeClock } from './dates';
import { applyOp } from './ops';
import type { Data, Op } from './types';
import type { Transport } from './sync';

const DAY = 86400000;

/** Sposta tutte le date del fixture così che la sua settimana diventi quella di `today`. */
export function shiftData(d: Data, today: string): Data {
  const delta = Math.round((parseKey(mondayOf(today)).getTime() - parseKey(mondayOf(d.today)).getTime()) / DAY);
  const mv = (k: string) => (k ? addDays(k, delta) : k);
  return {
    ...d,
    today,
    plan: d.plan.map((x) => ({ ...x, date: mv(x.date) })),
    days: d.days.map((x) => ({ ...x, date: mv(x.date) })),
    dispensa: d.dispensa.map((x) => ({ ...x, data: mv(x.data), scadenza: mv(x.scadenza) })),
    consumi: d.consumi.map((x) => ({ ...x, date: mv(x.date) })),
    spesa: d.spesa.map((x) => ({ ...x, date: mv(x.date) })),
    peso: d.peso ? { ...d.peso, date: mv(d.peso.date) } : null,
  };
}

export function demoTransport(): Transport {
  let state: Data | null = null;
  const current = () => (state ??= shiftData(fixture as Data, romeClock().today));
  const wait = () => new Promise((r) => setTimeout(r, 350));
  return {
    async fetch() {
      await wait();
      return { ...current(), ...romeClock() };
    },
    async send(op: Op) {
      await wait();
      state = applyOp(current(), op, romeClock().today);
      return { ...state, ...romeClock() };
    },
  };
}
