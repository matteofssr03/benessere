import type { Macros } from './types';

export const r0 = (n: number) => Math.round(n || 0);

/** Numero con la virgola decimale all'italiana: 74.2 → "74,2" */
export const dec = (n: number, digits = 1) =>
  (Math.round(n * 10 ** digits) / 10 ** digits).toLocaleString('it-IT', { maximumFractionDigits: digits });

/** "540 kcal · P 32 · C 61 · G 14" */
export const macroLine = (m: Macros) => `${r0(m.kcal)} kcal · P ${r0(m.p)} · C ${r0(m.c)} · G ${r0(m.f)}`;
