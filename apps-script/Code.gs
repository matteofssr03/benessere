// App Benessere: endpoint JSON sul Google Sheet "CLDv1_Tracker benessere".
// L'app scrive solo in: Consumi (colonne A-D e I-L, mai E-H) e Spesa app.
// Tutto il resto lo compila Claude a inizio settimana.
//
// Pubblicazione: Distribuisci > Nuova distribuzione > App web,
// "Esegui come: Io", "Chi ha accesso: Chiunque".
// Token: esegui una volta creaToken() e copia il valore dal registro di esecuzione.

const SHEET_ID = '1mLOuZnHsgO0RF1pc8gI1ZzWMNxOYT_e9tMplHztxM1s';

// ---- HTTP ----

// GET ?token=…&action=data
function doGet(e) {
  const p = (e && e.parameter) || {};
  if (!tokenOk_(p.token)) return forbidden_();
  if ((p.action || 'data') !== 'data') return json_({ error: 'unknown_action', status: 400 });
  return json_(getData(p.fresh === '1'));
}

// POST con Content-Type text/plain (niente preflight CORS) e corpo JSON:
// {token, action: "meal", date, pasto, eaten} oppure {token, action: "buy", alimento, grams, bought}
function doPost(e) {
  let body;
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return forbidden_();
  }
  if (!tokenOk_(body.token)) return forbidden_();
  try {
    if (body.action === 'meal') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(body.date)) || !body.pasto) throw new Error('Dati del pasto mancanti');
      return json_(setMealEaten(String(body.date), String(body.pasto), !!body.eaten));
    }
    if (body.action === 'buy') {
      if (!body.alimento) throw new Error('Alimento mancante');
      return json_(setBought(String(body.alimento), num_(body.grams), !!body.bought));
    }
    return json_({ error: 'unknown_action', status: 400 });
  } catch (err) {
    return json_({ error: String(err && err.message || err), status: 500 });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Apps Script non permette di impostare il codice HTTP: rispondiamo sempre 200
// con questo corpo, senza nessun dato, e l'app lo tratta come un 403.
function forbidden_() { return json_({ error: 'forbidden', status: 403 }); }

function tokenOk_(given) {
  const real = PropertiesService.getScriptProperties().getProperty('TOKEN');
  if (!real || real.length < 32 || typeof given !== 'string' || given.length !== real.length) return false;
  let diff = 0;
  for (let i = 0; i < real.length; i++) diff |= real.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

// Esegui una volta dall'editor: crea il token e lo scrive nel registro.
function creaToken() {
  const bytes = Utilities.getUuid() + Utilities.getUuid() + Utilities.getUuid();
  const token = bytes.replace(/-/g, '');
  PropertiesService.getScriptProperties().setProperty('TOKEN', token);
  Logger.log('Token: ' + token);
  return token;
}

// ---- Lettura ----

function ss_() { return SpreadsheetApp.openById(SHEET_ID); }

function tz_() { return ss_().getSpreadsheetTimeZone(); }

function dateKey_(v, tz) {
  if (Object.prototype.toString.call(v) === '[object Date]') return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
  const m = String(v || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  return '';
}

function num_(v) {
  if (typeof v === 'number') return v;
  const n = parseFloat(String(v || '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

function rows_(sheet, firstRow, lastCol) {
  const last = sheet.getLastRow();
  if (last < firstRow) return { values: [], display: [] };
  const range = sheet.getRange(firstRow, 1, last - firstRow + 1, lastCol);
  return { values: range.getValues(), display: range.getDisplayValues() };
}

// Tutti i dati che servono all'app, già convertiti in testo e numeri.
// Tiene una copia per 60 secondi in CacheService così le aperture ravvicinate
// non rileggono tutto lo Sheet.
function getData(fresh) {
  const cache = CacheService.getScriptCache();
  if (!fresh) {
    const hit = cache.get('data');
    if (hit) {
      const d = JSON.parse(hit);
      const tz = tz_(), now = new Date();
      d.today = Utilities.formatDate(now, tz, 'yyyy-MM-dd');
      d.now = Utilities.formatDate(now, tz, 'HH:mm');
      return d;
    }
  }
  const d = readAll_();
  try { cache.put('data', JSON.stringify(d), 60); } catch (e) {}
  return d;
}

function plan_(ss, tz) {
  const piano = rows_(ss.getSheetByName('Piano pasti'), 2, 12);
  const plan = [];
  piano.values.forEach(function (r, i) {
    if (!r[0] || !r[3]) return;
    plan.push({
      date: dateKey_(r[0], tz), ora: piano.display[i][1], pasto: String(r[2]).trim(), alimento: String(r[3]).trim(),
      g: r[4] === '' ? null : num_(r[4]),
      kcal: num_(r[5]), p: num_(r[6]), c: num_(r[7]), f: num_(r[8]),
      portare: /^s/i.test(String(r[9])), prep: String(r[10] || ''), stima: /^s/i.test(String(r[11]))
    });
  });
  return plan;
}

function readAll_() {
  const ss = ss_();
  const tz = ss.getSpreadsheetTimeZone();
  const now = new Date();

  const profilo = {};
  ss.getSheetByName('Profilo').getRange('A2:B20').getValues().forEach(function (r) {
    if (r[0]) profilo[String(r[0]).trim()] = r[1];
  });

  const plan = plan_(ss, tz);

  const days = [];
  ss.getSheetByName('Piano settimana').getRange('A2:I9').getValues().forEach(function (r) {
    if (!r[0]) return;
    days.push({ date: dateKey_(r[0], tz), giorno: String(r[1]), luogo: String(r[2]), allenamento: String(r[3]),
      colazione: String(r[4]), pranzo: String(r[5]), cena: String(r[6]), spuntini: String(r[7]), fuori: String(r[8]) });
  });

  const dispensa = [];
  ss.getSheetByName('Dispensa').getRange('A2:J60').getValues().forEach(function (r) {
    if (!r[0]) return;
    dispensa.push({ nome: String(r[0]).trim(), acquistato: num_(r[1]), data: dateKey_(r[2], tz),
      scadenza: dateKey_(r[3], tz), residuo: num_(r[9]) });
  });

  // E-H sono le formule (dalla Dispensa); I-L le macro manuali per gli
  // alimenti fuori Dispensa: se le formule danno 0 usiamo quelle manuali.
  const consumi = [];
  rows_(ss.getSheetByName('Consumi'), 2, 12).values.forEach(function (r) {
    if (!r[2]) return;
    const pick = function (formula, manual) { const a = num_(formula); return a ? a : num_(manual); };
    consumi.push({ date: dateKey_(r[0], tz), pasto: String(r[1]).trim(), alimento: String(r[2]).trim(),
      g: num_(r[3]), kcal: pick(r[4], r[8]), p: pick(r[5], r[9]), c: pick(r[6], r[10]), f: pick(r[7], r[11]) });
  });

  const spesa = [];
  rows_(ss.getSheetByName('Spesa app'), 2, 3).values.forEach(function (r) {
    if (!r[1]) return;
    spesa.push({ date: dateKey_(r[0], tz), alimento: String(r[1]).trim(), g: num_(r[2]) });
  });

  let peso = null;
  rows_(ss.getSheetByName('Misure'), 2, 3).values.forEach(function (r) {
    if (r[1] !== '' && r[1] !== null) peso = { date: dateKey_(r[0], tz), kg: num_(r[1]), grasso: r[2] === '' ? null : num_(r[2]) };
  });

  return {
    today: Utilities.formatDate(now, tz, 'yyyy-MM-dd'),
    now: Utilities.formatDate(now, tz, 'HH:mm'),
    target: {
      kcal: num_(profilo['Target kcal/giorno']), p: num_(profilo['Target proteine (g)']),
      c: num_(profilo['Target carboidrati (g)']), f: num_(profilo['Target grassi (g)'])
    },
    plan: plan, days: days, dispensa: dispensa, consumi: consumi, spesa: spesa, peso: peso
  };
}

// ---- Scrittura (solo Consumi A-D/I-L e Spesa app) ----

// Segna un pasto del Piano pasti come mangiato (scrive le righe in Consumi)
// oppure lo toglie (svuota solo le celle di input di quelle righe).
function setMealEaten(date, pasto, eaten) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const ss = ss_();
    const tz = ss.getSpreadsheetTimeZone();
    const items = plan_(ss, tz).filter(function (x) { return x.date === date && x.pasto === pasto; });
    if (!items.length) throw new Error('Pasto non trovato nel Piano pasti');
    const inDispensa = {};
    ss.getSheetByName('Dispensa').getRange('A2:A60').getValues().forEach(function (r) { if (r[0]) inDispensa[String(r[0]).trim()] = true; });

    const sh = ss.getSheetByName('Consumi');
    const maxRow = Math.min(sh.getMaxRows(), 500);
    const block = sh.getRange(2, 1, maxRow - 1, 3).getValues();
    const match = function (r, alimento) {
      return dateKey_(r[0], tz) === date && String(r[1]).trim() === pasto && String(r[2]).trim() === alimento;
    };

    items.forEach(function (it) {
      let found = -1;
      for (let i = 0; i < block.length; i++) if (match(block[i], it.alimento)) { found = i; break; }
      if (eaten) {
        if (found >= 0) return;
        let free = -1;
        for (let i = 0; i < block.length; i++) if (!block[i][2]) { free = i; break; }
        if (free < 0) throw new Error('Consumi è pieno: servono altre righe con le formule');
        const row = free + 2;
        const d = Utilities.parseDate(date, tz, 'yyyy-MM-dd');
        sh.getRange(row, 1, 1, 4).setValues([[d, pasto, it.alimento, it.g === null ? '' : it.g]]);
        // Alimenti fuori Dispensa o senza grammi: macro manuali I-L dal piano.
        if (!inDispensa[it.alimento] || it.g === null) {
          sh.getRange(row, 9, 1, 4).setValues([[it.kcal, it.p, it.c, it.f]]);
        }
        block[free] = [d, pasto, it.alimento];
      } else {
        while (found >= 0) {
          const row = found + 2;
          sh.getRange(row, 1, 1, 4).setValues([['', '', '', '']]);
          sh.getRange(row, 9, 1, 4).setValues([['', '', '', '']]);
          block[found] = ['', '', ''];
          found = -1;
          for (let i = 0; i < block.length; i++) if (match(block[i], it.alimento)) { found = i; break; }
        }
      }
    });
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  CacheService.getScriptCache().remove('data');
  return getData(true);
}

// Spunta (o toglie la spunta a) un alimento comprato. Finisce in "Spesa app":
// Claude poi lo sposta in Dispensa con i valori dell'etichetta.
function setBought(alimento, grams, bought) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const ss = ss_();
    const tz = ss.getSpreadsheetTimeZone();
    const sh = ss.getSheetByName('Spesa app');
    const today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
    const monday = mondayOf_(today);
    if (bought) {
      sh.appendRow([Utilities.parseDate(today, tz, 'yyyy-MM-dd'), alimento, grams, 'Spuntato dall\'app']);
    } else {
      const last = sh.getLastRow();
      if (last >= 2) {
        const vals = sh.getRange(2, 1, last - 1, 2).getValues();
        for (let i = vals.length - 1; i >= 0; i--) {
          if (String(vals[i][1]).trim() === alimento && dateKey_(vals[i][0], tz) >= monday) sh.deleteRow(i + 2);
        }
      }
    }
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  CacheService.getScriptCache().remove('data');
  return getData(true);
}

function mondayOf_(key) {
  const p = key.split('-').map(Number);
  const d = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
  const wd = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - wd);
  return d.toISOString().slice(0, 10);
}
