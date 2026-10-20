# Benessere

App per iPhone (PWA) per seguire dieta e allenamenti nei giorni a Torino. I dati stanno nel Google Sheet "CLDv1_Tracker benessere", che Claude compila ogni lunedì; l'app li legge da un endpoint Apps Script e ne scrive solo una piccola parte (Consumi A-D/I-L e Spesa app).

```
apps-script/Code.gs        endpoint JSON (token, LockService, regole di scrittura)
app/                       PWA: Vite + TypeScript + Preact + vite-plugin-pwa
  src/lib/                 date, pasti, spesa, coda delle scritture, API, cache
  src/ui/  src/views/      componenti e viste in stile iOS
  src/fixtures/data.json   dato finto con la forma vera della risposta
  src/test/                test Vitest (incluso Code.gs eseguito su uno Sheet simulato)
.github/workflows/deploy.yml   test + build + GitHub Pages a ogni push su main
```

## 1. Endpoint: Apps Script nello Sheet

1. Apri lo Sheet, poi **Estensioni > Apps Script**.
2. Nel file `Code.gs` cancella tutto e incolla il contenuto di [`apps-script/Code.gs`](apps-script/Code.gs). Se c'è un file `Index.html` della versione precedente puoi eliminarlo.
3. (Facoltativo) In **Impostazioni progetto** spunta "Mostra il file manifest appsscript.json nell'editor" e incolla [`apps-script/appsscript.json`](apps-script/appsscript.json).
4. Salva. In alto scegli la funzione **`creaToken`** e premi **Esegui**. Autorizza l'accesso allo Sheet quando te lo chiede. Nel **Registro di esecuzione** compare `Token: …`: copialo, ti serve sul telefono. Il token è salvato in Impostazioni progetto > Proprietà script (`TOKEN`); per cambiarlo riesegui `creaToken`.
5. **Distribuisci > Nuova distribuzione**, tipo **App web**:
   - Esegui come: **Io**
   - Chi ha accesso: **Chiunque**
6. Premi **Distribuisci** e copia l'**URL dell'app web** (finisce con `/exec`).

Prova veloce dal Mac (deve rispondere con i dati; senza token o con token sbagliato `{"error":"forbidden","status":403}`):

```bash
curl -sL "URL_EXEC?action=data&token=IL_TOKEN" | head -c 300
```

Quando modifichi `Code.gs`: **Distribuisci > Gestisci distribuzioni > matita > Versione: Nuova versione**. Così l'URL resta lo stesso.

Nota: Apps Script non permette di impostare il codice HTTP della risposta. Senza token valido l'endpoint risponde con il corpo `{"error":"forbidden","status":403}` e nessun dato; l'app lo tratta come un 403.

## 2. GitHub Pages e primo push

1. Crea un repository su GitHub (anche privato, se il tuo piano consente Pages sui privati), per esempio `benessere`.
2. Nel repository: **Settings > Pages > Build and deployment > Source: GitHub Actions**.
3. Dalla cartella del progetto:

```bash
git init -b main && git add . && git commit -m "Prima versione di Benessere"
```

```bash
git remote add origin https://github.com/TUO_UTENTE/benessere.git && git push -u origin main
```

4. In **Actions** parte "Pubblica su GitHub Pages": esegue i test, la build e pubblica. Al termine l'app è su `https://TUO_UTENTE.github.io/benessere/`.

Ogni push su `main` ripubblica. L'app installata si aggiorna da sola alla riapertura successiva.

## 3. Sul telefono

1. Apri il link `https://TUO_UTENTE.github.io/benessere/` in **Safari**.
2. **Condividi > Aggiungi alla schermata Home**.
3. Apri Benessere dalla Home, incolla l'**URL dell'App web** (`…/exec`) e il **token**, premi **Collega**.

URL e token restano salvati solo sul telefono. Per cambiarli: tab Oggi, ingranaggio in alto a sinistra.

## Sviluppo in locale

```bash
cd app && npm install && npm run dev
```

Senza Sheet: nella schermata iniziale tocca **Prova con dati di esempio**. Usa `src/fixtures/data.json` spostato sulla settimana corrente; le spunte restano solo in memoria e si azzerano ricaricando la pagina.

```bash
cd app && npm test && npm run build
```

`npm run icons` rigenera le icone PNG da `public/icon.svg`.

La cartella `app/node_modules` è un collegamento a `node_modules.nosync`, così iCloud Drive non la sincronizza. Se la cancelli, ricreala prima di `npm install`:

```bash
cd app && mkdir -p node_modules.nosync && ln -s node_modules.nosync node_modules
```

## Come funziona

- **Apertura istantanea**: gli ultimi dati sono in `localStorage` e vanno sullo schermo al primo frame, anche offline; poi l'app rilegge lo Sheet in background (all'apertura e quando torni sull'app dopo 30 secondi).
- **Tocchi ottimistici** (`src/lib/sync.ts`): "Mangiato" e le spunte cambiano subito lo schermo e finiscono in una coda. Le chiamate partono una alla volta, in ordine. Se una fallisce, quella modifica torna indietro e compare un avviso in alto. I dati del server sostituiscono quelli locali solo a coda vuota.
- **POST con `Content-Type: text/plain`** per evitare il preflight CORS, che Apps Script non gestisce.
- **Regole di scrittura**, verificate da `src/test/endpoint.test.ts`, che esegue `Code.gs` su uno Sheet simulato e registra ogni cella toccata: solo Consumi A-D e I-L (prima riga con C vuota, mai E-H, niente duplicati) e Spesa app.
- **Barra di stato**: `apple-mobile-web-app-status-bar-style` è `default` perché con `black-translucent` iOS scrive l'ora in bianco, illeggibile sullo sfondo chiaro. Le aree sicure sono comunque gestite con `env(safe-area-inset-*)`: se vuoi il contenuto sotto la barra di stato, cambia il valore in `app/index.html`.
