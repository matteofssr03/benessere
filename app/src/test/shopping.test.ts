import { describe, expect, it } from 'vitest';
import { qty, shopping } from '../lib/shopping';
import { data, item } from './helpers';

const T = '2026-10-21'; // mercoledì

describe('shopping', () => {
  const base = data({
    plan: [
      item('2026-10-20', 'Pranzo', 'Riso', 80), // ieri: non conta
      item(T, 'Pranzo', 'Riso', 80),
      item(T, 'Cena', 'Pollo', 200),
      item('2026-10-22', 'Pranzo', 'Riso', 80),
      item('2026-10-22', 'Cena', 'Pizza', null), // senza grammi: non conta
      item('2026-10-23', 'Spuntino', 'Banana', 240),
    ],
  });

  it('somma i grammi pianificati da oggi in poi', () => {
    const { missing } = shopping(base, T);
    expect(missing.find((x) => x.alimento === 'Riso')).toMatchObject({ g: 160, uses: ['Oggi pranzo', 'Domani pranzo'] });
    expect(missing.find((x) => x.alimento === 'Pizza')).toBeUndefined();
  });

  it('toglie il residuo in Dispensa, anche su più righe, e ignora residui negativi', () => {
    const d = { ...base, dispensa: [
      { nome: 'Riso', acquistato: 500, data: '', scadenza: '', residuo: 100 },
      { nome: 'Riso', acquistato: 500, data: '', scadenza: '', residuo: 40 },
      { nome: 'Pollo', acquistato: 0, data: '', scadenza: '', residuo: -50 },
    ] };
    const { missing } = shopping(d, T);
    expect(missing.find((x) => x.alimento === 'Riso')!.g).toBe(20);
    expect(missing.find((x) => x.alimento === 'Pollo')!.g).toBe(200);
  });

  it('non conta i pasti già mangiati', () => {
    const d = { ...base, consumi: [{ date: T, pasto: 'Pranzo', alimento: 'Riso', g: 80, kcal: 0, p: 0, c: 0, f: 0 }] };
    expect(shopping(d, T).missing.find((x) => x.alimento === 'Riso')!.g).toBe(80);
  });

  it('toglie lo spuntato di questa settimana, non quello della settimana prima', () => {
    const d = { ...base, spesa: [
      { date: '2026-10-19', alimento: 'Pollo', g: 120 },
      { date: '2026-10-18', alimento: 'Riso', g: 1000 },
    ] };
    const { missing } = shopping(d, T);
    expect(missing.find((x) => x.alimento === 'Pollo')).toMatchObject({ g: 80, bought: 120 });
    expect(missing.find((x) => x.alimento === 'Riso')!.g).toBe(160);
  });

  it('una voce spuntata a sufficienza passa nei comprati', () => {
    const d = { ...base, spesa: [{ date: T, alimento: 'Pollo', g: 200 }, { date: T, alimento: 'Caffè', g: 250 }] };
    const r = shopping(d, T);
    expect(r.missing.find((x) => x.alimento === 'Pollo')).toBeUndefined();
    expect(r.done.map((x) => x.alimento).sort()).toEqual(['Caffè', 'Pollo']);
  });

  it('arrotonda per eccesso', () => {
    const d = { ...base, dispensa: [{ nome: 'Pollo', acquistato: 0, data: '', scadenza: '', residuo: 199.3 }] };
    expect(shopping(d, T).missing.find((x) => x.alimento === 'Pollo')!.g).toBe(1);
    const d2 = { ...base, dispensa: [{ nome: 'Pollo', acquistato: 0, data: '', scadenza: '', residuo: 199.6 }] };
    expect(shopping(d2, T).missing.find((x) => x.alimento === 'Pollo')).toBeUndefined();
  });
});

describe('qty', () => {
  it('aggiunge i pezzi per banane, mele e uova', () => {
    expect(qty('Banana', 240)).toBe('240 g · circa 2 banane');
    expect(qty('Banana', 100)).toBe('100 g · circa 1 banana');
    expect(qty('Mela', 160)).toBe('160 g · circa 2 mele');
    expect(qty('Uova', 165)).toBe('165 g · circa 3 uova');
    expect(qty('Riso', 80.4)).toBe('80 g');
  });
});
