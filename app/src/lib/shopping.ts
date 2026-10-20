// Cosa manca: grammi pianificati da oggi in poi (pasti non ancora mangiati)
// meno il residuo in Dispensa e meno quello già spuntato in Spesa app questa settimana.

import { mondayOf, rel } from './dates';
import { eatKey, eatenSet } from './meals';
import type { Data } from './types';

export interface ShopItem {
  alimento: string;
  g: number; // grammi ancora da comprare (per le voci mancanti) o totale spuntato
  uses: string[]; // "Oggi pranzo", "Mercoledì cena"
  bought: number; // grammi già spuntati questa settimana
}

export const PEZZO: Record<string, { g: number; label: [string, string] }> = {
  Banana: { g: 120, label: ['banana', 'banane'] },
  Mela: { g: 150, label: ['mela', 'mele'] },
  Uova: { g: 55, label: ['uovo', 'uova'] },
};

export function shopping(d: Pick<Data, 'plan' | 'consumi' | 'dispensa' | 'spesa'>, today: string): { missing: ShopItem[]; done: ShopItem[] } {
  const s = eatenSet(d.consumi);
  const mon = mondayOf(today);
  const need = new Map<string, { g: number; uses: string[] }>();
  for (const x of d.plan) {
    if (x.date < today || !x.g) continue;
    if (s.has(eatKey(x.date, x.pasto, x.alimento))) continue;
    let n = need.get(x.alimento);
    if (!n) need.set(x.alimento, (n = { g: 0, uses: [] }));
    n.g += x.g;
    const u = `${rel(x.date, today)} ${x.pasto.toLowerCase()}`;
    if (!n.uses.includes(u)) n.uses.push(u);
  }
  const avail = new Map<string, number>();
  for (const p of d.dispensa) avail.set(p.nome, (avail.get(p.nome) ?? 0) + Math.max(0, p.residuo));
  const bought = new Map<string, number>();
  for (const b of d.spesa) if (b.date >= mon) bought.set(b.alimento, (bought.get(b.alimento) ?? 0) + b.g);

  const missing: ShopItem[] = [];
  const done: ShopItem[] = [];
  for (const [a, n] of need) {
    const gap = n.g - (avail.get(a) ?? 0);
    if (gap <= 0.5) continue;
    const b = bought.get(a) ?? 0;
    if (b >= gap - 0.5) done.push({ alimento: a, g: b, uses: n.uses, bought: b });
    else missing.push({ alimento: a, g: Math.ceil(gap - b), uses: n.uses, bought: b });
  }
  for (const [a, b] of bought) {
    if (done.some((x) => x.alimento === a) || missing.some((x) => x.alimento === a)) continue;
    done.push({ alimento: a, g: b, uses: [], bought: b });
  }
  return { missing, done };
}

/** "360 g · circa 3 banane" */
export function qty(alimento: string, g: number): string {
  let s = `${Math.round(g)} g`;
  const p = PEZZO[alimento];
  if (p) {
    const n = Math.max(1, Math.ceil(g / p.g));
    s += ` · circa ${n} ${n === 1 ? p.label[0] : p.label[1]}`;
  }
  return s;
}
