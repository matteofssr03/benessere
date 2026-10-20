// Date come chiavi yyyy-mm-dd, sempre nel fuso Europe/Rome.

import type { Clock } from './types';

export const TZ = 'Europe/Rome';

const GIORNI = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

const pad = (n: number) => String(n).padStart(2, '0');

/** "5/3/2026" o "05/03/2026" (gg/mm/aaaa, locale en_GB) → "2026-03-05"; altrimenti "". */
export function dmyToKey(v: unknown): string {
  const m = String(v ?? '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return '';
  const d = Number(m[1]), mo = Number(m[2]);
  if (d < 1 || d > 31 || mo < 1 || mo > 12) return '';
  return `${m[3]}-${pad(mo)}-${pad(d)}`;
}

/** "2026-03-05" → "05/03/2026" */
export function keyToDmy(k: string): string {
  const [y, m, d] = k.split('-');
  return `${d}/${m}/${y}`;
}

/** Data e ora correnti a Roma, indipendenti dal fuso del telefono. */
export function romeClock(at: Date = new Date()): Clock {
  const p: Record<string, string> = {};
  new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(at).forEach((x) => { p[x.type] = x.value; });
  const hour = p.hour === '24' ? '00' : p.hour;
  return { today: `${p.year}-${p.month}-${p.day}`, now: `${hour}:${p.minute}` };
}

export function parseKey(k: string): Date {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export const keyOf = (d: Date) => d.toISOString().slice(0, 10);

export function addDays(k: string, n: number): string {
  const d = parseKey(k);
  d.setUTCDate(d.getUTCDate() + n);
  return keyOf(d);
}

export function mondayOf(k: string): string {
  return addDays(k, -((parseKey(k).getUTCDay() + 6) % 7));
}

export function weekOf(k: string): string[] {
  const mon = mondayOf(k);
  return Array.from({ length: 7 }, (_, i) => addDays(mon, i));
}

export const dayName = (k: string) => GIORNI[parseKey(k).getUTCDay()];
export const dayShort = (k: string) => dayName(k).slice(0, 3);
export const dayNum = (k: string) => parseKey(k).getUTCDate();
export const monthName = (k: string) => MESI[parseKey(k).getUTCMonth()];

/** "Lunedì 19 ottobre" */
export function longDate(k: string): string {
  return `${dayName(k)} ${dayNum(k)} ${monthName(k)}`;
}

/** "Oggi", "Domani", "Ieri" oppure il nome del giorno. */
export function rel(k: string, today: string): string {
  if (k === today) return 'Oggi';
  if (k === addDays(today, 1)) return 'Domani';
  if (k === addDays(today, -1)) return 'Ieri';
  return dayName(k);
}

/** "08:30" meno n minuti, senza andare sotto mezzanotte. */
export function minusMinutes(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const t = Math.max(0, h * 60 + m - mins);
  return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
}

/** Ora "7:30" → "07:30" per confronti di stringa corretti. */
export function normTime(t: string): string {
  const m = String(t || '').match(/^(\d{1,2}):(\d{2})/);
  return m ? `${pad(Number(m[1]))}:${m[2]}` : '';
}
