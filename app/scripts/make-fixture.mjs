// Genera src/fixtures/data.json: una settimana tipo con la forma vera della risposta.
import { writeFileSync } from 'node:fs';
const F = { // kcal, p, c, f per 100 g
  'Fiocchi d\'avena': [372, 13, 59, 7], 'Yogurt greco 0%': [57, 10, 4, 0], 'Banana': [89, 1.1, 23, 0.3], 'Mela': [52, 0.3, 14, 0.2],
  'Petto di pollo': [110, 23, 0, 1.5], 'Riso basmati': [350, 8, 78, 1], 'Zucchine': [17, 1.2, 3, 0.3], 'Olio EVO': [884, 0, 0, 100],
  'Salmone': [208, 20, 0, 13], 'Patate': [77, 2, 17, 0.1], 'Uova': [143, 12.6, 0.7, 9.5], 'Pane integrale': [247, 13, 41, 3.4],
  'Mandorle': [579, 21, 22, 50], 'Pasta integrale': [348, 13, 64, 2.5], 'Tonno al naturale': [103, 23, 0, 1], 'Pomodorini': [18, 0.9, 3.9, 0.2],
  'Lenticchie cotte': [116, 9, 20, 0.4], 'Ricotta': [146, 9, 3.5, 11], 'Frutti di bosco': [45, 1, 9, 0.3], 'Bresaola': [151, 32, 0, 2.6],
};
const it = (a, g, extra = {}) => { const [k, p, c, f] = F[a]; const r = (x) => Math.round(x * g / 10) / 10; return { alimento: a, g, kcal: Math.round(k * g / 100), p: r(p), c: r(c), f: r(f), ...extra }; };
const dmy = (k) => k;
const days = ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25'];
const names = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
const train = ['Forza A (palestra 18:30)', 'Riposo', 'Forza B (palestra 18:30)', 'Corsa 40 min', 'Forza A (palestra 18:30)', '', ''];
const pranzi = [
  [it('Riso basmati', 80), it('Petto di pollo', 150), it('Zucchine', 200), it('Olio EVO', 10)],
  [it('Pasta integrale', 80), it('Tonno al naturale', 120), it('Pomodorini', 150), it('Olio EVO', 10)],
  [it('Riso basmati', 80), it('Lenticchie cotte', 200), it('Zucchine', 150), it('Olio EVO', 10)],
  [it('Pasta integrale', 80), it('Petto di pollo', 150), it('Pomodorini', 150), it('Olio EVO', 10)],
  [it('Riso basmati', 80), it('Tonno al naturale', 120), it('Zucchine', 200), it('Olio EVO', 10)],
];
const cene = [
  [it('Salmone', 150), it('Patate', 250), it('Olio EVO', 10)],
  [it('Uova', 165), it('Pane integrale', 80), it('Zucchine', 200)],
  [it('Petto di pollo', 180), it('Patate', 250), it('Olio EVO', 10)],
  [it('Salmone', 150), it('Riso basmati', 70), it('Zucchine', 150)],
  [{ alimento: 'Pizza margherita (fuori)', g: null, kcal: 850, p: 32, c: 110, f: 28, stima: true }],
];
const plan = [];
days.slice(0, 5).forEach((d, i) => {
  const add = (ora, pasto, items, o = {}) => items.forEach((x) => plan.push({ date: d, ora, pasto, portare: false, prep: '', stima: false, ...x, ...o }));
  add('07:30', 'Colazione', [it('Fiocchi d\'avena', 60), it('Yogurt greco 0%', 170), it('Frutti di bosco', 80)]);
  add('10:30', 'Spuntino mattina', [i % 2 ? it('Mela', 150) : it('Banana', 120), it('Mandorle', 20)], { portare: true });
  add('13:00', 'Pranzo', pranzi[i], { portare: i !== 4, prep: i !== 4 ? 'Cuoci la sera prima e metti nel contenitore con coperchio' : '' });
  add('16:30', 'Spuntino pomeriggio', [it('Pane integrale', 50), it('Bresaola', 60)], { portare: true });
  add(i === 4 ? '20:30' : '20:00', 'Cena', cene[i], i === 0 ? { prep: 'Salmone al forno 180° per 15 minuti' } : i === 2 ? { prep: 'Patate già bollite da lunedì sera' } : {});
});
// prep e portare per singolo alimento, come nello Sheet
plan.forEach((x) => { x.date = dmy(x.date); });
const consumi = plan.filter((x) => x.date === '2026-10-19' && x.pasto === 'Colazione').map(({ date, pasto, alimento, g, kcal, p, c, f }) => ({ date, pasto, alimento, g, kcal, p, c, f }));
const dispensa = [
  ['Fiocchi d\'avena', 1000, 640], ['Yogurt greco 0%', 1000, 330], ['Riso basmati', 1000, 520], ['Olio EVO', 1000, 700], ['Petto di pollo', 600, 300],
  ['Patate', 1500, 200], ['Zucchine', 1000, 400], ['Mandorle', 200, 120], ['Pasta integrale', 500, 500], ['Banana', 360, 120], ['Uova', 330, 110],
].map(([nome, acquistato, residuo]) => ({ nome, acquistato, data: '2026-10-17', scadenza: '', residuo }));
const data = {
  today: '2026-10-19', now: '09:15',
  target: { kcal: 2200, p: 150, c: 240, f: 70 },
  plan,
  days: days.map((d, i) => ({ date: d, giorno: names[i], luogo: i < 5 ? 'Torino' : 'Bra', allenamento: train[i],
    colazione: i < 5 ? 'Casa' : 'Bra', pranzo: i < 5 ? (i === 4 ? 'Casa' : 'Università') : 'Bra', cena: i < 5 ? (i === 4 ? 'Fuori' : 'Casa') : 'Bra', spuntini: i < 5 ? 'Zaino' : '', fuori: i === 4 ? 'Cena in pizzeria' : '' })),
  dispensa,
  consumi,
  spesa: [{ date: '2026-10-19', alimento: 'Salmone', g: 300 }],
  peso: { date: '2026-10-18', kg: 74.2, grasso: 16.5 },
};
writeFileSync(new URL('../src/fixtures/data.json', import.meta.url), JSON.stringify(data, null, 1));
console.log(plan.length, 'righe di piano');
