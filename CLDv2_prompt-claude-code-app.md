# Prompt per Claude Code: app Benessere (PWA), v2 con grafica stile Apple

Copia tutto quello che c'è sotto la riga in una sessione nuova di Claude Code, dentro una cartella vuota. Mettici accanto questi due file del progetto, come riferimento:
- `CLDv1_benessere-app.html`: logica delle viste attuali (la grafica invece va rifatta, vedi sotto)
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

## Grafica: stile Apple, minimale

Non copiare la grafica di `CLDv1_benessere-app.html`: rifalla da zero seguendo le Human Interface Guidelines di iOS. Deve sembrare un'app di sistema, come Salute, Promemoria o Fitness: pulita, ariosa, senza decorazioni.

**Struttura**
- Tab bar in basso con 5 voci e icone in stile SF Symbols (usa SVG che le imitano, per esempio Lucide con tratto 1.75): Oggi, Pasti, Settimana, Spesa, Prepara. Sfondo traslucido con `backdrop-filter: blur(20px) saturate(180%)` e una riga sottile sopra.
- Titoli grandi in stile iOS (34 px, peso 700) che diventano una barra compatta e traslucida in alto quando scorri, con il titolo piccolo centrato.
- Liste raggruppate a inserto ("inset grouped"): gruppi con angoli di 12 px su sfondo grigio di sistema, righe separate da linee sottili rientrate a sinistra, intestazioni di sezione piccole in maiuscolo grigio sopra ogni gruppo.
- Le righe dei pasti seguono lo schema di una cella iOS: orario a sinistra in grigio tabellare, nome del pasto in grassetto e macro in grigio sotto, controllo a destra. "Mangiato" è un cerchio vuoto da toccare che diventa un cerchio verde pieno con la spunta, come in Promemoria. Tocco sulla riga per aprire il dettaglio in un foglio dal basso (bottom sheet) con gli alimenti, i grammi e la nota di preparazione.
- Macro in Oggi: quattro anelli concentrici o affiancati in stile Fitness (kcal, proteine, carbo, grassi), con il numero al centro e il target sotto. Niente barre.
- Spesa: lista con caselle tonde a sinistra, come Promemoria; le voci spuntate scendono in una sezione "Comprati" con testo attenuato.
- Settimana: selettore dei giorni come nel Calendario iOS, con un cerchio pieno sul giorno scelto e un puntino sotto i giorni con allenamento.
- Pasti (la vista scorrevole): intestazioni di giorno fisse in alto mentre scorri, come le date in Calendario > Elenco.

**Colori**: quelli di sistema iOS, con il tema scuro automatico.
- Sfondo `#F2F2F7`, gruppi `#FFFFFF`, testo `#000000`, testo secondario `#3C3C4399` (scuro: sfondo `#000000`, gruppi `#1C1C1E`, testo `#FFFFFF`, secondario `#EBEBF599`), separatori `#3C3C434A` (scuro `#54545899`).
- Un solo colore d'accento: verde di sistema `#34C759` (scuro `#30D158`) per "Mangiato" e lo stato fatto. Arancione di sistema `#FF9500` solo per "da portare" e preparazione. Anelli dei macro: rosso `#FF3B30` per kcal, blu `#007AFF` per proteine, giallo `#FFCC00` per carbo, viola `#AF52DE` per grassi.
- Tutto definito come variabili CSS, niente colori scritti a mano nei componenti.

**Tipografia**: `-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif`, cioè il font di sistema dell'iPhone, senza font esterni. Scala iOS: titolo grande 34/41 bold, titolo 22/28 bold, corpo 17/22 regular, didascalia 13/18, piccolo 12/16. Numeri sempre tabellari. Supporta il testo dinamico (unità rem, niente altezze fisse sulle righe).

**Movimento e tatto**: transizioni brevi (200-300 ms, curva `cubic-bezier(0.32, 0.72, 0, 1)`), foglio dal basso che si chiude trascinandolo giù, leggero feedback alla pressione (scala 0.97 e sfondo più scuro). Con "riduci movimento" niente animazioni. Niente ombre pesanti, niente gradienti, niente emoji.

**Dettagli**
- Aree sicure dell'iPhone rispettate (notch, Dynamic Island, barra Home), app a schermo intero da Home (`apple-mobile-web-app-capable`, `status-bar-style` translucido), icona dell'app semplice: una foglia o un piatto stilizzato bianco su verde, angoli gestiti da iOS.
- Bersagli di tocco di almeno 44 px, margini laterali di 16-20 px, molto spazio bianco.
- Stati vuoti curati, con un'icona grigia e una frase ("Nessun pasto pianificato per oggi").
- Avvisi come toast discreti in alto, non pop-up.

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
- A colpo d'occhio sembra un'app di sistema iOS: titoli grandi, liste raggruppate, anelli dei macro, cerchi di spunta.
- Endpoint senza token o con token sbagliato: 403 e nessun dato.

Prima di scrivere codice, mostrami in poche righe la struttura delle cartelle e la forma JSON della risposta `data`. Poi procedi senza fermarti finché i test passano e `npm run build` funziona.
