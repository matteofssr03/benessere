# Prompt per Claude Code: app Benessere (PWA)

Copia tutto quello che c'è sotto la riga in una sessione nuova di Claude Code, dentro una cartella vuota. Mettici accanto questi due file del progetto, come riferimento:
- `CLDv1_benessere-app.html`: grafica e logica delle viste attuali
- `CLDv2_Code.gs`: lettura e scrittura dello Sheet, da trasformare nell'endpoint

---

## Obiettivo

Costruisci "Benessere", un'app per iPhone che uso ogni giorno per seguire la dieta e gli allenamenti nei giorni in cui sto a Torino. Deve aprirsi all'istante, funzionare come una normale app (icona nella schermata Home, schermo intero, niente barra del browser) e restare semplice. I dati stanno in un Google Sheet che Claude compila ogni lunedì: l'app li legge e ne scrive solo una piccola parte.

## Architettura (decisa, non cambiarla senza dirmelo)

1. **PWA statica**: Vite + TypeScript + Preact (o React), senza framework CSS pesanti. Manifest, icona e service worker (vite-plugin-pwa) così l'app si installa dalla Home e si apre offline. Hosting gratuito su GitHub Pages, pubblicato con una GitHub Action a ogni push su `main`.
2. **Dati: il Google Sheet resta l'unica fonte di verità.** Niente Supabase e niente database nuovi: Claude scrive nello Sheet ogni lunedì attraverso il suo connettore, e un secondo database andrebbe tenuto sincronizzato.
3. **Endpoint**: un Google Apps Script collegato allo Sheet, pubblicato come App web ("Esegui come: Io", "Chi ha accesso: Chiunque"). Espone JSON:
   - `GET ?token=…&action=data` restituisce tutto quello che serve all'app (stessa forma di `getData()` in `CLDv2_Code.gs`).
   - `POST` con corpo `{token, action: "meal", date, pasto, eaten}` oppure `{token, action: "buy", alimento, grams, bought}`, che risponde con i dati aggiornati.
   - Un token segreto lungo, salvato in Proprietà script, controllato a ogni chiamata. Senza token valido risponde 403 e non restituisce niente.
   - Per il POST usa `Content-Type: text/plain` per evitare il preflight CORS, che Apps Script non gestisce.
4. **Cache locale**: IndexedDB (o localStorage) con gli ultimi dati. All'apertura l'app mostra subito la cache e poi aggiorna in background. Il token si inserisce una volta in una schermata di configurazione e resta salvato sul telefono.
5. **Tocchi ottimistici**: "Mangiato" e le spunte della spesa cambiano subito lo schermo, la chiamata parte dietro. Se fallisce, la modifica torna indietro e compare un avviso chiaro. Le chiamate in coda vanno in ordine, e i dati del server sostituiscono quelli locali solo quando la coda è vuota.

Perché non Xcode: un'app nativa richiede un account sviluppatore Apple (o una reinstallazione ogni 7 giorni), il login Google con OAuth nativo, e Xcode a ogni modifica. La PWA dà lo stesso uso quotidiano a costo zero.

## Lo Sheet

ID `1mLOuZnHsgO0RF1pc8gI1ZzWMNxOYT_e9tMplHztxM1s`, locale en_GB (date gg/mm/aaaa, decimali col punto), fuso Europe/Rome. Fogli usati:

| Foglio | Righe | Colonne |
|---|---|---|
| Profilo | A2:B20 | Voce, Valore. Target in "Target kcal/giorno", "Target proteine (g)", "Target carboidrati (g)", "Target grassi (g)" |
| Piano pasti | dalla 2 | Data, Ora, Pasto, Alimento, Grammi, kcal, Proteine (g), Carbo (g), Grassi (g), Da portare (Sì), Preparazione, Stima (Sì). Un alimento per riga; un pasto = stessa Data + Pasto |
| Piano settimana | A2:I9 | Data, Giorno, Luogo, Allenamento, Colazione, Pranzo, Cena, Spuntini, Pasti fuori casa |
| Dispensa | A2:J60 | Alimento, Acquistato (g), Data acquisto, Scadenza, kcal/P/C/G per 100 g; I Consumato e J Residuo sono formule |
| Consumi | A2:L500 | A Data, B Pasto, C Alimento, D Quantità (g); E-H formule; I-L macro manuali |
| Spesa app | dalla 2 | Data spunta, Alimento, Grammi, Note |
| Misure | A2:C200 | Data, Peso (kg), Massa grassa (%) |

**Regole di scrittura (vincolanti):**
- L'app scrive solo in Consumi (colonne A-D e I-L) e in Spesa app. Mai altrove.
- In Consumi le colonne E-H hanno formule già presenti fino alla riga 500: non scriverci mai, nemmeno stringhe vuote. Per aggiungere righe usa la prima riga con C vuota, senza `appendRow`.
- "Mangiato" scrive una riga per ogni alimento del pasto: Data, Pasto, Alimento e Grammi del piano. Se l'alimento non è in Dispensa, o non ha grammi, scrive anche kcal/P/C/G del piano in I-L. Se le righe ci sono già, non le duplica. Togliere il segno svuota A-D e I-L di quelle righe.
- La spunta della spesa aggiunge una riga in Spesa app con la data di oggi; toglierla cancella le righe di quell'alimento della settimana in corso.
- Usa `LockService` per tutte le scritture.

## Viste (barra in basso, 5 voci)

1. **Oggi**: data e luogo, allenamento del giorno, macro mangiati contro il target (barre per kcal, proteine, carbo e grassi, con una tacca per quanto prevede il piano di oggi), prossimo pasto aperto con il pulsante "Mangiato", cosa mettere nello zaino oggi e domani, riquadro spesa ("Ti mancano N cose") e peso dell'ultima misura.
2. **Pasti (nuova)**: tutta la settimana in una sola lista scorrevole, giorno dopo giorno. Per ogni giorno un'intestazione fissa che resta in alto mentre scorri (data, luogo, allenamento, totale kcal e macro del giorno contro il target). Sotto, tutti i pasti con orario, alimenti e grammi, macro, chip "da portare", nota di preparazione e pulsante "Mangiato". All'apertura scorre da sola a oggi. I giorni a Bra mostrano solo "A Bra, a braccio". I pasti già passati e mangiati sono attenuati.
3. **Settimana**: striscia di 7 giorni (pallino verde se c'è il piano, arancio se c'è allenamento) e dettaglio del giorno scelto, con frecce per la settimana prima e dopo.
4. **Spesa**: quello che manca per i pasti da oggi in poi. Calcolo: grammi pianificati nei pasti non ancora mangiati, meno il residuo in Dispensa, meno quanto già spuntato in Spesa app questa settimana. Per ogni voce: quantità (per banane, mele e uova anche i pezzi: 120 g, 150 g e 55 g l'uno), a quali pasti serve, casella da spuntare. Sotto, le voci spuntate.
5. **Da preparare**: oggi e domani, cosa portare fuori (pasto, orario, alimenti) e cosa cucinare in anticipo (testo della colonna Preparazione).

Tutte le viste usano la funzione di raggruppamento dei pasti e il calcolo della spesa che trovi in `CLDv1_benessere-app.html` (`mealsOf`, `shopping`, `upcoming`): portali in moduli TypeScript con test.

## Grafica

Riprendi quella di `CLDv1_benessere-app.html`: sfondo carta chiaro, verde salvia come colore principale, ambra per "da portare" e preparazione, schede con bordo sottile e raggio 16 px, Bricolage Grotesque per i titoli e Figtree per il testo. Tema scuro automatico con gli stessi token. Margini di almeno 16 px, aree sicure dell'iPhone rispettate (notch e barra Home), pulsanti di almeno 44 px, numeri tabellari. Animazioni minime, e niente animazioni con "riduci movimento" attivo. Niente emoji come icone: usa un set SVG leggero (per esempio Lucide).

## Cose da consegnare

- Repository con `app/` (la PWA), `apps-script/Code.gs` (l'endpoint), `.github/workflows/deploy.yml`.
- Test (Vitest) per raggruppamento dei pasti, calcolo della spesa, conversione date gg/mm/aaaa e fuso Europe/Rome, coda delle scritture ottimistiche.
- Un dato finto (`app/src/fixtures/`) con la forma vera della risposta, così l'app gira in locale con `npm run dev` senza lo Sheet.
- `README.md` in italiano con i passaggi esatti:
  1. incollare `Code.gs` in Estensioni > Apps Script dello Sheet, impostare il token, pubblicare come App web;
  2. attivare GitHub Pages e fare il primo push;
  3. aprire il link in Safari, Condividi > Aggiungi alla schermata Home, inserire URL dell'endpoint e token.

## Criteri di accettazione

- Riapertura dalla Home: contenuto visibile in meno di 300 ms dalla cache, anche offline.
- Tocco su "Mangiato" o su una spunta: lo schermo cambia in meno di 100 ms; lo Sheet si aggiorna entro pochi secondi.
- Nessuna scrittura fuori da Consumi A-D/I-L e Spesa app (verificalo con un test sull'endpoint simulato).
- Funziona su iPhone in Safari e installata dalla Home, in tema chiaro e scuro, a 375 e 430 px di larghezza, senza scorrimento orizzontale.
- Endpoint senza token o con token sbagliato: 403 e nessun dato.

Prima di scrivere codice, mostrami in poche righe la struttura delle cartelle e la forma JSON della risposta `data`. Poi procedi senza fermarti finché i test passano e `npm run build` funziona.
