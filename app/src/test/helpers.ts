import type { Data, PlanItem } from '../lib/types';

export function item(date: string, pasto: string, alimento: string, g: number | null, o: Partial<PlanItem> = {}): PlanItem {
  return { date, ora: '13:00', pasto, alimento, g, kcal: 100, p: 10, c: 10, f: 2, portare: false, prep: '', stima: false, ...o };
}

export function data(o: Partial<Data> = {}): Data {
  return {
    today: '2026-10-19', now: '09:00',
    target: { kcal: 2000, p: 150, c: 200, f: 70 },
    plan: [], days: [], dispensa: [], consumi: [], spesa: [], peso: null,
    ...o,
  };
}
