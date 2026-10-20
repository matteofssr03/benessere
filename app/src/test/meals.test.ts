import { describe, expect, it } from 'vitest';
import { eatenTotals, isBra, isPastAndEaten, isTraining, mealsOf, totals, upcoming } from '../lib/meals';
import { data, item } from './helpers';

const D = '2026-10-19';

describe('mealsOf', () => {
  const d = data({
    plan: [
      item(D, 'Pranzo', 'Riso', 80, { ora: '13:00', portare: true, prep: 'Cuoci la sera' }),
      item(D, 'Colazione', 'Avena', 60, { ora: '7:30' }),
      item(D, 'Pranzo', 'Pollo', 150, { ora: '13:00', prep: 'Cuoci la sera' }),
      item(D, 'Cena', 'Pizza', null, { ora: '' }),
      item('2026-10-20', 'Pranzo', 'Pasta', 80),
    ],
    consumi: [{ date: D, pasto: 'Pranzo', alimento: 'Riso', g: 80, kcal: 100, p: 10, c: 10, f: 2 }],
  });

  it('raggruppa per data e pasto, ordinati per orario, senza orario in fondo', () => {
    const m = mealsOf(d, D);
    expect(m.map((x) => x.pasto)).toEqual(['Colazione', 'Pranzo', 'Cena']);
    expect(m[0].ora).toBe('07:30');
    expect(m[1].items.map((x) => x.alimento)).toEqual(['Riso', 'Pollo']);
  });

  it('somma le macro e unisce portare e preparazione senza doppioni', () => {
    const p = mealsOf(d, D)[1];
    expect(p.kcal).toBe(200);
    expect(p.p).toBe(20);
    expect(p.portare).toBe(true);
    expect(p.prep).toEqual(['Cuoci la sera']);
  });

  it('distingue mangiato, parziale e da mangiare', () => {
    const [col, pra] = mealsOf(d, D);
    expect(col.eaten).toBe(false);
    expect(pra.partial).toBe(true);
    expect(pra.eaten).toBe(false);
    const all = mealsOf({ ...d, consumi: [...d.consumi, { ...d.consumi[0], alimento: 'Pollo' }] }, D)[1];
    expect(all.eaten).toBe(true);
    expect(all.partial).toBe(false);
  });

  it('giorno senza piano: lista vuota', () => {
    expect(mealsOf(d, '2026-10-24')).toEqual([]);
  });
});

describe('upcoming', () => {
  const d = data({
    plan: [
      item(D, 'Colazione', 'Avena', 60, { ora: '07:00' }),
      item(D, 'Spuntino', 'Mela', 150, { ora: '10:30' }),
      item(D, 'Pranzo', 'Riso', 80, { ora: '13:00' }),
      item('2026-10-20', 'Colazione', 'Avena', 60, { ora: '07:00' }),
      item('2026-10-21', 'Colazione', 'Avena', 60, { ora: '07:00' }),
    ],
    consumi: [{ date: D, pasto: 'Pranzo', alimento: 'Riso', g: 80, kcal: 0, p: 0, c: 0, f: 0 }],
  });

  it('salta i pasti di oggi passati da più di un\'ora e quelli mangiati', () => {
    const u = upcoming(d, { today: D, now: '11:00' }, 2);
    expect(u.map((m) => m.key)).toEqual([`${D}|Spuntino`, '2026-10-20|Colazione']);
  });

  it('un pasto iniziato da meno di un\'ora resta tra i prossimi', () => {
    expect(upcoming(d, { today: D, now: '07:45' }, 1)[0].pasto).toBe('Colazione');
  });
});

describe('totali e giorni', () => {
  it('totali', () => {
    expect(totals([{ kcal: 1, p: 2, c: 3, f: 4 }, { kcal: 1, p: 1, c: 1, f: 1 }])).toEqual({ kcal: 2, p: 3, c: 4, f: 5 });
    const d = data({ consumi: [{ date: D, pasto: 'A', alimento: 'x', g: 1, kcal: 300, p: 1, c: 1, f: 1 }, { date: '2026-10-18', pasto: 'A', alimento: 'x', g: 1, kcal: 999, p: 1, c: 1, f: 1 }] });
    expect(eatenTotals(d, D).kcal).toBe(300);
  });
  it('Bra e allenamento', () => {
    const base = { date: D, giorno: '', colazione: '', pranzo: '', cena: '', spuntini: '' };
    expect(isBra({ ...base, luogo: 'Bra', allenamento: '' })).toBe(true);
    expect(isBra({ ...base, luogo: 'Torino', allenamento: '' })).toBe(false);
    expect(isBra({ ...base, luogo: 'Brandizzo', allenamento: '' })).toBe(false);
    expect(isTraining({ ...base, luogo: 'Torino', allenamento: 'Forza A' })).toBe(true);
    expect(isTraining({ ...base, luogo: 'Torino', allenamento: 'Riposo' })).toBe(false);
    expect(isTraining({ ...base, luogo: 'Torino', allenamento: '' })).toBe(false);
  });
  it('pasti mangiati e passati si attenuano', () => {
    const m = mealsOf(data({ plan: [item(D, 'Pranzo', 'Riso', 80)], consumi: [{ date: D, pasto: 'Pranzo', alimento: 'Riso', g: 80, kcal: 0, p: 0, c: 0, f: 0 }] }), D)[0];
    expect(isPastAndEaten(m, { today: D, now: '14:00' })).toBe(true);
    expect(isPastAndEaten(m, { today: D, now: '12:00' })).toBe(false);
    expect(isPastAndEaten(m, { today: '2026-10-20', now: '08:00' })).toBe(true);
  });
});
