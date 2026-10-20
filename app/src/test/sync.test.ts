import { describe, expect, it, vi } from 'vitest';
import { applyOp } from '../lib/ops';
import { SyncEngine, type Transport } from '../lib/sync';
import type { Data, Op } from '../lib/types';
import { data, item } from './helpers';

const T = '2026-10-19';
const base = () => data({ plan: [item(T, 'Pranzo', 'Riso', 80), item(T, 'Pranzo', 'Pollo', 150), item(T, 'Cena', 'Pizza', null)] });

/** Trasporto controllabile: ogni chiamata resta in sospeso finché il test non la risolve. */
function fakeTransport() {
  const calls: { op?: Op; resolve: (d: Data) => void; reject: (e: unknown) => void }[] = [];
  const t: Transport = {
    send: (op) => new Promise((resolve, reject) => calls.push({ op, resolve, reject })),
    fetch: () => new Promise((resolve, reject) => calls.push({ resolve, reject })),
  };
  return { t, calls };
}

const tick = () => new Promise((r) => setTimeout(r, 0));
const eaten = (d: Data | null) => (d ? d.consumi.map((c) => `${c.pasto}:${c.alimento}`) : []);

describe('applyOp', () => {
  it('mangiato aggiunge una riga per alimento e non duplica', () => {
    const d1 = applyOp(base(), { kind: 'meal', date: T, pasto: 'Pranzo', eaten: true }, T);
    expect(eaten(d1)).toEqual(['Pranzo:Riso', 'Pranzo:Pollo']);
    const d2 = applyOp(d1, { kind: 'meal', date: T, pasto: 'Pranzo', eaten: true }, T);
    expect(d2.consumi).toHaveLength(2);
    expect(applyOp(d2, { kind: 'meal', date: T, pasto: 'Pranzo', eaten: false }, T).consumi).toHaveLength(0);
  });
  it('la spunta della spesa aggiunge oggi e la rimozione toglie solo questa settimana', () => {
    const d = data({ spesa: [{ date: '2026-10-12', alimento: 'Riso', g: 500 }] });
    const d1 = applyOp(d, { kind: 'buy', alimento: 'Riso', grams: 200, bought: true }, T);
    expect(d1.spesa).toHaveLength(2);
    expect(applyOp(d1, { kind: 'buy', alimento: 'Riso', grams: 0, bought: false }, T).spesa).toEqual([{ date: '2026-10-12', alimento: 'Riso', g: 500 }]);
  });
});

describe('SyncEngine', () => {
  function setup() {
    const { t, calls } = fakeTransport();
    const onChange = vi.fn();
    const onError = vi.fn();
    const e = new SyncEngine(base(), t, { onChange, onError }, () => T);
    return { e, calls, onChange, onError };
  }

  it('il tocco cambia subito la vista, prima della risposta', () => {
    const { e, calls, onChange } = setup();
    e.enqueue({ kind: 'meal', date: T, pasto: 'Pranzo', eaten: true });
    expect(eaten(e.view())).toEqual(['Pranzo:Riso', 'Pranzo:Pollo']);
    expect(onChange).toHaveBeenCalled();
    expect(calls).toHaveLength(1);
  });

  it('manda le scritture una alla volta, nell\'ordine dei tocchi', async () => {
    const { e, calls } = setup();
    e.enqueue({ kind: 'meal', date: T, pasto: 'Pranzo', eaten: true });
    e.enqueue({ kind: 'meal', date: T, pasto: 'Cena', eaten: true });
    e.enqueue({ kind: 'meal', date: T, pasto: 'Pranzo', eaten: false });
    await tick();
    expect(calls).toHaveLength(1);
    expect(calls[0].op).toMatchObject({ pasto: 'Pranzo', eaten: true });
    calls[0].resolve(applyOp(base(), calls[0].op!, T));
    await tick();
    expect(calls).toHaveLength(2);
    expect(calls[1].op).toMatchObject({ pasto: 'Cena' });
    calls[1].resolve(base());
    await tick();
    expect(calls[2].op).toMatchObject({ pasto: 'Pranzo', eaten: false });
    expect(eaten(e.view())).toEqual(['Cena:Pizza']);
  });

  it('i dati del server sostituiscono quelli locali solo a coda vuota', async () => {
    const { e, calls } = setup();
    e.enqueue({ kind: 'meal', date: T, pasto: 'Pranzo', eaten: true });
    e.enqueue({ kind: 'meal', date: T, pasto: 'Cena', eaten: true });
    await tick();
    // Il server risponde alla prima con dati che non contengono ancora la cena.
    const afterFirst = applyOp(base(), calls[0].op!, T);
    calls[0].resolve(afterFirst);
    await tick();
    expect(e.base).not.toBe(afterFirst);
    expect(eaten(e.view())).toContain('Cena:Pizza');
    const afterSecond = applyOp(afterFirst, calls[1].op!, T);
    calls[1].resolve(afterSecond);
    await e.idle();
    expect(e.base).toBe(afterSecond);
    expect(e.pending).toHaveLength(0);
  });

  it('se una scrittura fallisce la modifica torna indietro e arriva l\'avviso', async () => {
    const { e, calls, onError } = setup();
    e.enqueue({ kind: 'meal', date: T, pasto: 'Pranzo', eaten: true });
    expect(e.view()!.consumi).toHaveLength(2);
    await tick();
    calls[0].reject(new Error('Nessuna connessione'));
    await e.idle();
    expect(e.view()!.consumi).toHaveLength(0);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ pasto: 'Pranzo' }), expect.any(Error));
  });

  it('un errore annulla solo la sua scrittura, le altre restano', async () => {
    const { e, calls } = setup();
    e.enqueue({ kind: 'meal', date: T, pasto: 'Pranzo', eaten: true });
    e.enqueue({ kind: 'meal', date: T, pasto: 'Cena', eaten: true });
    await tick();
    calls[0].reject(new Error('x'));
    await tick();
    expect(eaten(e.view())).toEqual(['Cena:Pizza']);
    const srv = applyOp(base(), calls[1].op!, T);
    calls[1].resolve(srv);
    await e.idle();
    expect(eaten(e.view())).toEqual(['Cena:Pizza']);
  });

  it('una lettura partita prima di un tocco viene scartata', async () => {
    const { e, calls } = setup();
    const r = e.refresh();
    e.enqueue({ kind: 'meal', date: T, pasto: 'Pranzo', eaten: true });
    calls[0].resolve(data({ plan: base().plan })); // lettura vecchia, senza il pranzo
    expect(await r).toBe(false);
    expect(eaten(e.view())).toEqual(['Pranzo:Riso', 'Pranzo:Pollo']);
  });

  it('una lettura a coda vuota diventa la nuova base', async () => {
    const { e, calls } = setup();
    const r = e.refresh();
    const fresh = data({ plan: base().plan, peso: { date: T, kg: 70, grasso: null } });
    calls[0].resolve(fresh);
    expect(await r).toBe(true);
    expect(e.view()).toBe(fresh);
  });
});
