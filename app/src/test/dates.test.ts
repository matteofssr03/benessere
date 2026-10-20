import { describe, expect, it } from 'vitest';
import { addDays, dmyToKey, keyToDmy, longDate, minusMinutes, mondayOf, normTime, rel, romeClock, weekOf } from '../lib/dates';

describe('gg/mm/aaaa', () => {
  it('converte in chiave yyyy-mm-dd', () => {
    expect(dmyToKey('19/10/2026')).toBe('2026-10-19');
    expect(dmyToKey('5/3/2026')).toBe('2026-03-05');
    expect(dmyToKey(' 05/03/2026 ')).toBe('2026-03-05');
    expect(dmyToKey('19/10/2026 08:30:00')).toBe('2026-10-19');
  });
  it('non scambia giorno e mese (en_GB, non US)', () => {
    expect(dmyToKey('01/02/2026')).toBe('2026-02-01');
    expect(dmyToKey('13/12/2026')).toBe('2026-12-13');
    expect(dmyToKey('12/13/2026')).toBe('');
  });
  it('rifiuta valori non validi', () => {
    expect(dmyToKey('')).toBe('');
    expect(dmyToKey(null)).toBe('');
    expect(dmyToKey('2026-10-19')).toBe('');
  });
  it('torna indietro', () => {
    expect(keyToDmy('2026-03-05')).toBe('05/03/2026');
    expect(dmyToKey(keyToDmy('2026-12-31'))).toBe('2026-12-31');
  });
});

describe('fuso Europe/Rome', () => {
  it('a mezzanotte e mezza ora legale è già il giorno dopo a Roma', () => {
    // 22:30 UTC del 19 ottobre = 00:30 del 20 a Roma (CEST, +2)
    expect(romeClock(new Date('2026-10-19T22:30:00Z'))).toEqual({ today: '2026-10-20', now: '00:30' });
  });
  it('in inverno lo scarto è di un\'ora', () => {
    expect(romeClock(new Date('2026-12-31T23:15:00Z'))).toEqual({ today: '2027-01-01', now: '00:15' });
    expect(romeClock(new Date('2026-12-31T22:15:00Z'))).toEqual({ today: '2026-12-31', now: '23:15' });
  });
  it('gestisce il cambio dell\'ora di fine ottobre', () => {
    // 25 ottobre 2026: alle 03:00 CEST si torna alle 02:00 CET
    expect(romeClock(new Date('2026-10-25T00:30:00Z')).now).toBe('02:30');
    expect(romeClock(new Date('2026-10-25T01:30:00Z')).now).toBe('02:30');
    expect(romeClock(new Date('2026-10-25T02:30:00Z')).now).toBe('03:30');
  });
  it('a mezzanotte usa 00 e non 24', () => {
    expect(romeClock(new Date('2026-10-19T22:00:00Z')).now).toBe('00:00');
  });
});

describe('calendario', () => {
  it('lunedì della settimana', () => {
    expect(mondayOf('2026-10-19')).toBe('2026-10-19');
    expect(mondayOf('2026-10-25')).toBe('2026-10-19');
    expect(mondayOf('2026-10-26')).toBe('2026-10-26');
    expect(mondayOf('2027-01-01')).toBe('2026-12-28');
  });
  it('somma giorni attraverso mesi e anni', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('settimana di 7 giorni da lunedì', () => {
    expect(weekOf('2026-10-22')).toEqual(['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25']);
  });
  it('nomi in italiano', () => {
    expect(longDate('2026-10-19')).toBe('Lunedì 19 ottobre');
    expect(rel('2026-10-19', '2026-10-19')).toBe('Oggi');
    expect(rel('2026-10-20', '2026-10-19')).toBe('Domani');
    expect(rel('2026-10-22', '2026-10-19')).toBe('Giovedì');
  });
  it('orari', () => {
    expect(minusMinutes('08:30', 60)).toBe('07:30');
    expect(minusMinutes('00:20', 60)).toBe('00:00');
    expect(normTime('7:30')).toBe('07:30');
    expect(normTime('')).toBe('');
  });
});
