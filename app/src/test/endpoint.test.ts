// Esegue apps-script/Code.gs in una sandbox con uno Sheet simulato e registra
// ogni scrittura: l'app deve toccare solo Consumi A-D/I-L e Spesa app.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { beforeEach, describe, expect, it } from 'vitest';
import { addDays, mondayOf, romeClock } from '../lib/dates';

const TZ = 'Europe/Rome';
const TOKEN = 'a'.repeat(20) + 'b'.repeat(20) + '0123456789';
const CODE = readFileSync(resolve(__dirname, '../../../apps-script/Code.gs'), 'utf8');

type Cell = unknown;
interface Write { sheet: string; row: number; col: number; kind: 'set' | 'deleteRow' | 'append' }

function fmt(d: Date, tz: string, f: string): string {
  const p: Record<string, string> = {};
  new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(d).forEach((x) => { p[x.type] = x.value; });
  if (f === 'yyyy-MM-dd') return `${p.year}-${p.month}-${p.day}`;
  if (f === 'HH:mm') return `${p.hour}:${p.minute}`;
  throw new Error('formato non simulato: ' + f);
}

/** Mezzanotte di `key` nel fuso tz. */
function parse(key: string, tz: string): Date {
  const guess = new Date(`${key}T00:00:00Z`);
  for (let h = -14; h <= 14; h++) {
    const d = new Date(guess.getTime() - h * 3600000);
    if (fmt(d, tz, 'yyyy-MM-dd') === key && fmt(d, tz, 'HH:mm') === '00:00') return d;
  }
  throw new Error('data non valida');
}

class FakeSheet {
  constructor(public name: string, public rows: Cell[][], public maxRows: number, private log: Write[]) {}
  private cell(r: number, c: number): Cell { return this.rows[r - 1]?.[c - 1] ?? ''; }
  getLastRow() {
    for (let r = this.rows.length; r >= 1; r--) if ((this.rows[r - 1] || []).some((v) => v !== '' && v != null)) return r;
    return 0;
  }
  getMaxRows() { return this.maxRows; }
  getRange(a: number | string, b?: number, nr = 1, nc = 1) {
    let row: number, col: number;
    if (typeof a === 'string') {
      const m = a.match(/^([A-Z])(\d+):([A-Z])(\d+)$/)!;
      col = m[1].charCodeAt(0) - 64; row = +m[2];
      nc = m[3].charCodeAt(0) - 64 - col + 1; nr = +m[4] - row + 1;
    } else { row = a; col = b!; }
    const self = this;
    const grid = () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => self.cell(row + i, col + j)));
    return {
      getValues: grid,
      getDisplayValues: () => grid().map((r) => r.map((v) => (v instanceof Date ? fmt(v, TZ, 'yyyy-MM-dd') : String(v)))),
      setValues(vals: Cell[][]) {
        vals.forEach((r, i) => r.forEach((v, j) => {
          const R = row + i, C = col + j;
          self.log.push({ sheet: self.name, row: R, col: C, kind: 'set' });
          while (self.rows.length < R) self.rows.push([]);
          self.rows[R - 1][C - 1] = v;
        }));
      },
    };
  }
  appendRow(vals: Cell[]) {
    const R = this.getLastRow() + 1;
    vals.forEach((_, j) => this.log.push({ sheet: this.name, row: R, col: j + 1, kind: 'append' }));
    while (this.rows.length < R) this.rows.push([]);
    this.rows[R - 1] = [...vals];
  }
  deleteRow(r: number) {
    this.log.push({ sheet: this.name, row: r, col: 0, kind: 'deleteRow' });
    this.rows.splice(r - 1, 1);
  }
}

const today = romeClock().today;
const D = '2026-10-19';

function makeEnv(token: string | null = TOKEN) {
  const log: Write[] = [];
  const d = (k: string) => parse(k, TZ);
  // Consumi: E-H con "formule" fino alla riga 500, come nello Sheet vero.
  const consumi: Cell[][] = [['Data', 'Pasto', 'Alimento', 'Quantità', 'kcal', 'P', 'C', 'G', 'kcal man', 'P man', 'C man', 'G man']];
  for (let r = 2; r <= 500; r++) consumi.push(['', '', '', '', 0, 0, 0, 0, '', '', '', '']);
  consumi[1] = [d('2026-10-18'), 'Cena', 'Pasta', 80, 280, 10, 55, 2, '', '', '', ''];
  consumi[3] = [d('2026-10-18'), 'Cena', 'Olio', 10, 88, 0, 0, 10, '', '', '', '']; // riga 3 resta libera
  const sheets: Record<string, FakeSheet> = {};
  const add = (name: string, rows: Cell[][], max = 1000) => { sheets[name] = new FakeSheet(name, rows, max, log); };
  add('Profilo', [['Voce', 'Valore'], ['Target kcal/giorno', 2200], ['Target proteine (g)', 150], ['Target carboidrati (g)', 240], ['Target grassi (g)', 70]]);
  add('Piano pasti', [
    ['Data', 'Ora', 'Pasto', 'Alimento', 'Grammi', 'kcal', 'P', 'C', 'G', 'Da portare', 'Preparazione', 'Stima'],
    [d(D), '13:00', 'Pranzo', 'Riso', 80, 280, 6, 62, 1, 'Sì', 'Cuoci la sera', ''],
    [d(D), '13:00', 'Pranzo', 'Pollo', 150, 165, 34, 0, 2, 'Sì', '', ''],
    [d(D), '13:00', 'Pranzo', 'Salsa della mensa', 30, 60, 1, 3, 5, '', '', 'Sì'],
    [d(D), '20:00', 'Cena', 'Pizza', '', 850, 32, 110, 28, '', '', 'Sì'],
  ]);
  add('Piano settimana', [['Data'], [d(D), 'Lunedì', 'Torino', 'Forza A', 'Casa', 'Uni', 'Casa', 'Zaino', '']]);
  add('Dispensa', [['Alimento'], ['Riso', 1000, d('2026-10-17'), '', 350, 7, 78, 1, 80, 920], ['Pollo', 600, d('2026-10-17'), '', 110, 23, 0, 1.5, 0, 600]]);
  add('Consumi', consumi, 1000);
  add('Spesa app', [
    ['Data spunta', 'Alimento', 'Grammi', 'Note'],
    [d(addDays(mondayOf(today), -3)), 'Riso', 500, 'vecchia'],
    [d(today), 'Riso', 200, ''],
    [d(today), 'Pollo', 300, ''],
  ]);
  add('Misure', [['Data'], [d('2026-10-18'), 74.2, 16.5]]);

  const ctx = vm.createContext({
    SpreadsheetApp: {
      openById: () => ({ getSpreadsheetTimeZone: () => TZ, getSheetByName: (n: string) => sheets[n] }),
      flush() {},
    },
    Utilities: { formatDate: fmt, parseDate: parse, getUuid: () => crypto.randomUUID() },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    CacheService: { getScriptCache: () => ({ get: () => null, put() {}, remove() {} }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k: string) => (k === 'TOKEN' ? token : null), setProperty() {} }) },
    ContentService: {
      MimeType: { JSON: 'json' },
      createTextOutput: (s: string) => ({ body: s, setMimeType() { return this; } }),
    },
    Logger: { log() {} },
  });
  vm.runInContext(CODE, ctx);
  const get = (parameter: Record<string, string>) => JSON.parse(ctx.doGet({ parameter }).body);
  const post = (body: unknown) => JSON.parse(ctx.doPost({ postData: { contents: typeof body === 'string' ? body : JSON.stringify(body) } }).body);
  return { log, sheets, get, post };
}

/** Le uniche celle che l'app può scrivere. */
function allowed(w: Write): boolean {
  if (w.sheet === 'Spesa app') return true;
  if (w.sheet === 'Consumi' && w.kind === 'set') return w.row >= 2 && w.row <= 500 && ((w.col >= 1 && w.col <= 4) || (w.col >= 9 && w.col <= 12));
  return false;
}

describe('endpoint: token', () => {
  it('senza token risponde 403 e nessun dato', () => {
    const { get } = makeEnv();
    const r = get({ action: 'data' });
    expect(r).toEqual({ error: 'forbidden', status: 403 });
  });
  it('con token sbagliato o di lunghezza diversa risponde 403', () => {
    const { get } = makeEnv();
    expect(get({ action: 'data', token: TOKEN.slice(0, -1) + 'x' })).toEqual({ error: 'forbidden', status: 403 });
    expect(get({ action: 'data', token: TOKEN + 'x' })).toEqual({ error: 'forbidden', status: 403 });
    expect(get({ action: 'data', token: '' })).toEqual({ error: 'forbidden', status: 403 });
  });
  it('senza token configurato rifiuta tutto', () => {
    const { get } = makeEnv(null);
    expect(get({ action: 'data', token: 'qualsiasi' })).toEqual({ error: 'forbidden', status: 403 });
  });
  it('POST senza token, con token sbagliato o corpo non valido: 403 e nessuna scrittura', () => {
    const { post, log } = makeEnv();
    expect(post({ action: 'meal', date: D, pasto: 'Pranzo', eaten: true })).toEqual({ error: 'forbidden', status: 403 });
    expect(post({ token: 'x'.repeat(50), action: 'meal', date: D, pasto: 'Pranzo', eaten: true })).toEqual({ error: 'forbidden', status: 403 });
    expect(post('non è json')).toEqual({ error: 'forbidden', status: 403 });
    expect(log).toHaveLength(0);
  });
});

describe('endpoint: lettura', () => {
  it('restituisce la forma di getData()', () => {
    const { get, log } = makeEnv();
    const r = get({ action: 'data', token: TOKEN });
    expect(Object.keys(r).sort()).toEqual(['consumi', 'days', 'dispensa', 'now', 'peso', 'plan', 'spesa', 'target', 'today']);
    expect(r.target).toEqual({ kcal: 2200, p: 150, c: 240, f: 70 });
    expect(r.plan[0]).toMatchObject({ date: D, ora: '13:00', pasto: 'Pranzo', alimento: 'Riso', g: 80, portare: true, prep: 'Cuoci la sera' });
    expect(r.plan[3]).toMatchObject({ alimento: 'Pizza', g: null, stima: true });
    expect(r.days[0]).toMatchObject({ date: D, luogo: 'Torino', allenamento: 'Forza A' });
    expect(r.dispensa[0]).toMatchObject({ nome: 'Riso', residuo: 920 });
    expect(r.consumi).toHaveLength(2);
    expect(r.peso).toEqual({ date: '2026-10-18', kg: 74.2, grasso: 16.5 });
    expect(log).toHaveLength(0);
  });
});

describe('endpoint: scritture', () => {
  let env: ReturnType<typeof makeEnv>;
  beforeEach(() => { env = makeEnv(); });
  const meal = (pasto: string, eaten: boolean) => env.post({ token: TOKEN, action: 'meal', date: D, pasto, eaten });
  const buy = (alimento: string, grams: number, bought: boolean) => env.post({ token: TOKEN, action: 'buy', alimento, grams, bought });
  const consRow = (r: number) => env.sheets.Consumi.rows[r - 1];

  it('Mangiato: una riga per alimento nelle prime righe con C vuota, senza toccare E-H', () => {
    const r = meal('Pranzo', true);
    expect(r.error).toBeUndefined();
    expect(consRow(3).slice(1, 4)).toEqual(['Pranzo', 'Riso', 80]);
    expect(consRow(5).slice(1, 4)).toEqual(['Pranzo', 'Pollo', 150]);
    expect(consRow(6).slice(1, 4)).toEqual(['Pranzo', 'Salsa della mensa', 30]);
    // Riso e Pollo sono in Dispensa: niente macro manuali. La salsa no: I-L dal piano.
    expect(consRow(3).slice(8, 12)).toEqual(['', '', '', '']);
    expect(consRow(6).slice(8, 12)).toEqual([60, 1, 3, 5]);
    expect(consRow(3).slice(4, 8)).toEqual([0, 0, 0, 0]);
    expect(env.log.every(allowed)).toBe(true);
    expect(r.consumi.filter((c: { pasto: string }) => c.pasto === 'Pranzo')).toHaveLength(3);
  });

  it('alimento senza grammi: macro manuali e quantità vuota', () => {
    meal('Cena', true);
    expect(consRow(3).slice(1, 4)).toEqual(['Cena', 'Pizza', '']);
    expect(consRow(3).slice(8, 12)).toEqual([850, 32, 110, 28]);
    expect(env.log.every(allowed)).toBe(true);
  });

  it('non duplica le righe già presenti', () => {
    meal('Pranzo', true);
    const n = env.log.length;
    meal('Pranzo', true);
    expect(env.log.length).toBe(n);
  });

  it('togliere il segno svuota A-D e I-L di quelle righe e basta', () => {
    meal('Pranzo', true);
    env.log.length = 0;
    const r = meal('Pranzo', false);
    for (const row of [3, 5, 6]) {
      expect(consRow(row).slice(0, 4)).toEqual(['', '', '', '']);
      expect(consRow(row).slice(8, 12)).toEqual(['', '', '', '']);
    }
    expect(consRow(2)[2]).toBe('Pasta');
    expect(env.log.every(allowed)).toBe(true);
    expect(env.log.some((w) => w.col >= 5 && w.col <= 8)).toBe(false);
    expect(r.consumi).toHaveLength(2);
  });

  it('pasto inesistente: errore, nessuna scrittura', () => {
    const r = meal('Merenda', true);
    expect(r.status).toBe(500);
    expect(env.log).toHaveLength(0);
  });

  it('la spunta aggiunge una riga in Spesa app con la data di oggi', () => {
    const r = buy('Zucchine', 400, true);
    expect(env.log.every(allowed)).toBe(true);
    expect(env.log.every((w) => w.sheet === 'Spesa app')).toBe(true);
    expect(r.spesa.at(-1)).toEqual({ date: today, alimento: 'Zucchine', g: 400 });
  });

  it('togliere la spunta cancella solo le righe di quell\'alimento di questa settimana', () => {
    const r = buy('Riso', 0, false);
    expect(env.log.every((w) => w.sheet === 'Spesa app')).toBe(true);
    expect(r.spesa.map((x: { alimento: string; g: number }) => `${x.alimento}:${x.g}`)).toEqual(['Riso:500', 'Pollo:300']);
  });

  it('in nessun caso scrive fuori da Consumi A-D/I-L e Spesa app', () => {
    meal('Pranzo', true); meal('Cena', true); meal('Pranzo', false); meal('Cena', false);
    buy('Mela', 300, true); buy('Mela', 0, false);
    expect(env.log.length).toBeGreaterThan(0);
    expect(env.log.filter((w) => !allowed(w))).toEqual([]);
    for (const n of ['Profilo', 'Piano pasti', 'Piano settimana', 'Dispensa', 'Misure']) {
      expect(env.log.some((w) => w.sheet === n)).toBe(false);
    }
  });
});
