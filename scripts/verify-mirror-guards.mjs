/**
 * verify-mirror-guards — le guardie dello specchio, misurate prima che esistano
 *
 * QUELLO CHE ASSERISCE, in una frase: **un processo non presidiato che cancella
 * e riscrive si ferma nei quattro casi in cui deve fermarsi**, e lo dice con una
 * categoria propria e con l'uscita `2`, che significa *nulla e' stato scritto*.
 *
 * ── PERCHE' ESISTE, E PERCHE' ARRIVA PRIMA DEL CODICE ───────────────────────
 *
 * D-58-05 ha deciso che il calendario arriva da un indirizzo e che **lo specchio
 * gira da solo**. D-58-07 ha rovesciato meta' di D-44-26 per permetterlo, e ha
 * scritto accanto la ragione per cui quella meta' esisteva: il feed porta date
 * non annunciate, sedi in trattativa e line-up, e da oggi transita da un server
 * i cui log di runtime sono conservati.
 *
 * Insieme a quello c'e' il fatto che rende tutto il resto grave: **questo
 * progetto non ha error tracking.** Nessun fallimento raggiunge un essere umano
 * da solo. Un cron che **cancella e riscrive** senza nessuno che guardi e' la
 * forma peggiore in cui quel difetto possa presentarsi — e le guardie non sono
 * una rifinitura: sono **la ragione per cui il cron e' accettabile**.
 *
 * Un gate scritto **dopo** l'implementazione misura cio' che qualcuno ha
 * scritto. Scritto **prima**, fissa cio' che va scritto. Questo file e' il
 * secondo caso, e i nomi che usa sono **il contratto**, non una supposizione.
 *
 * ── ⚠ IL CONTRATTO — L'ORDINE DEI RIFIUTI, CHE E' CIO' CHE LI RENDE ERMETICI ─
 *
 * I piani 58-09 e 58-10 devono rispettare **questo ordine**, e non e' una
 * preferenza di stile:
 *
 *      1. gli argomenti              (un flag che non esiste, o due che si
 *                                     contraddicono)
 *      2. la chiave di calendario    (assente → `missing_calendar_key`;
 *                                     fuori vocabolario → `unknown_calendar_key`)
 *      3. la sorgente registrata     (nessun indirizzo per quella chiave →
 *                                     `missing_feed_source`)
 *      4. le credenziali del database
 *
 * Oggi il passo 4 e' **il primo**: `loadEnvironment()` gira subito dopo il
 * controllo degli argomenti. Con quell'ordine i tre casi qui sotto rispondono
 * tutti `missing_credential` e **il gate misura un'altra cosa** — cioe' misura
 * che mancano le credenziali, che e' vero e inutile.
 *
 * ⚠ **E c'e' una seconda meta' del contratto, senza la quale il caso 3 smette di
 * essere ermetico.** Il file d'ambiente su disco — quello ignorato da git, che
 * esiste sulla macchina del proprietario — va letto **dentro il passo 4**, mai
 * prima. Se venisse letto in cima, il caso 3 direbbe cose diverse su macchine
 * diverse: verde dove l'indirizzo e' configurato in locale, rosso altrove. Un
 * gate il cui esito dipende da cosa c'e' sul disco di chi lo lancia non e' un
 * gate: e' un sondaggio.
 *
 * ── ⚠ NESSUN CASO CHIEDE CREDENZIALI, E IL FIGLIO NON LE EREDITA ────────────
 *
 * I processi figli girano con un ambiente **curato**: solo il percorso degli
 * eseguibili e la home. Nessun segreto entra, quindi nessun segreto puo' uscire
 * da un messaggio d'errore del figlio.
 *
 * E il gate **non stampa mai il referto del figlio**: ne estrae la categoria fra
 * parentesi quadre e il codice d'uscita, e butta il resto. E' la difesa 1 di
 * D-58-07 applicata a se' stesso — *escono conteggi e categorie, mai testo* — e
 * vale a maggior ragione qui, dove il figlio e' lo script che apre il calendario.
 *
 * ── ESITI ───────────────────────────────────────────────────────────────────
 *
 *   0  ogni caso esercitabile e' come dichiarato
 *   1  FALLIMENTO — almeno un caso risponde diversamente
 *
 * **Non esce mai 2.** Costruisce i propri dati e i propri argomenti: non ha
 * precondizioni da cui possa essere rifiutato. Un controllo senza precondizioni
 * che uscisse «rifiutato» sarebbe un posto in cui un difetto si nasconde.
 *
 * ── COSA NON DICE ───────────────────────────────────────────────────────────
 *
 * Che lo specchio sia sicuro. Dice che **queste quattro strade non portano a una
 * scrittura**. La procedura di ripristino (`P-58-C`) e la prova che un processo
 * morto a meta' sia recuperabile sono un'altra cosa, e vanno scritte prima del
 * primo `--apply` — non dedotte da un verde qui.
 */

import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { registerHooks } from "node:module";
import { spawnSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ICS_DIR = join(ROOT, "src", "lib", "production", "ics");
const IMPORTATORE = join("scripts", "import-production-calendar.mjs");

const say = (l) => console.log(l);

say("");
say("verify-mirror-guards — le guardie dello specchio, su casi costruiti nel file");
say("");

const fallimenti = [];
const rimandati = [];

/* ────────────────────────────────────────────────────────────────────────────
 * FAMIGLIA 1 — il predicato puro della guardia del feed (ICS-10, guardia a)
 *
 * Il contratto, per intero:
 *
 *     import { mirrorGuard, MIRROR_SHRINK_FLOOR } from "./guard";
 *
 *     mirrorGuard({
 *       previousEntries,   // number | null — quante voci porto' l'ultimo specchio
 *                          //   riuscito per QUESTA chiave di calendario;
 *                          //   null = prima corsa, non «zero»
 *       currentEntries,    // number — quante ne porta quello in arrivo
 *     }) => "ok" | "feed_empty" | "feed_shrank"
 *
 * ⚠ **Sono due conteggi, non due liste, e la differenza e' di dominio.** Una
 * guardia che ricevesse le voci terrebbe in mano i titoli del calendario, e da
 * li' a un messaggio d'errore che ne interpola uno il passo e' corto — e' la
 * difesa 1 di D-58-07. Un conteggio non puo' rivelare niente. Il predicato che
 * decide se cancellare mezzo calendario non ha bisogno di sapere **cosa** c'e'
 * dentro: gli basta **quanto**.
 *
 * ⚠ **La soglia e' esportata dal modulo, e questo gate non ne scrive il
 * valore.** Il caso al margine si costruisce **dalla costante**, non da un
 * numero copiato qui: un gate che fissasse la soglia deciderebbe una politica
 * che non e' sua, e la deciderebbe in un posto dove nessuno la cerca.
 * `MIRROR_SHRINK_FLOOR` e' la frazione del conteggio precedente sotto la quale
 * un feed si considera rimpicciolito.
 * ──────────────────────────────────────────────────────────────────────────── */

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(".") && !/\.[cm]?[jt]sx?$/.test(specifier)) {
      const candidate = new URL(`${specifier}.ts`, context.parentURL);
      if (existsSync(fileURLToPath(candidate))) {
        return { url: candidate.href, shortCircuit: true };
      }
    }
    return nextResolve(specifier, context);
  },
});

say("  famiglia 1 — il predicato della guardia del feed");
say("");

let guard = null;
let motivoAssenza = null;

try {
  guard = await import(pathToFileURL(join(ICS_DIR, "guard.ts")).href);
} catch (error) {
  motivoAssenza = error.message;
}

if (guard === null || typeof guard.mirrorGuard !== "function") {
  say("    ✗ V0  il predicato non si carica");
  say("            atteso: mirrorGuard esportato da src/lib/production/ics/guard.ts");
  if (motivoAssenza !== null) say(`            misurato: ${motivoAssenza}`);
  else say("            misurato: il modulo si importa ma non esporta mirrorGuard");
  say("            E' l'esito corretto finche' quel modulo non esiste: un import che");
  say("            solleva e' un fallimento, non un rifiuto. Nessuno dei sette casi");
  say("            sotto e' stato misurato, e nessuno di essi puo' dirsi verde.");
  fallimenti.push("V0");
} else {
  const { mirrorGuard, MIRROR_SHRINK_FLOOR } = guard;

  if (typeof MIRROR_SHRINK_FLOOR !== "number") {
    say("    ✗ V0  la soglia non e' esportata");
    say("            atteso: MIRROR_SHRINK_FLOOR, un numero, accanto a mirrorGuard");
    say("            Senza, il caso al margine si costruirebbe su un numero copiato");
    say("            qui — cioe' su una politica decisa nel posto sbagliato.");
    fallimenti.push("V0");
  } else {
    /*
     * Il precedente e' 100 su tutti i casi che ne hanno uno: un numero tondo
     * rende leggibile il margine e non e' una misura di niente.
     *
     * `alMargine` e' il primo conteggio che la soglia **ammette**, e
     * `sottoIlMargine` l'ultimo che rifiuta. Sono i due casi che una soglia
     * scritta con il verso sbagliato rompe per primi, e sono l'unica ragione per
     * cui la soglia va letta dal modulo invece che ricordata.
     */
    const PRECEDENTE = 100;
    const alMargine = Math.ceil(PRECEDENTE * MIRROR_SHRINK_FLOOR);
    const sottoIlMargine = alMargine - 1;

    const CASI = [
      {
        id: "V1",
        etichetta: "zero voci in arrivo, con un precedente",
        input: { previousEntries: PRECEDENTE, currentEntries: 0 },
        atteso: "feed_empty",
      },
      {
        id: "V2",
        etichetta: "zero voci in arrivo, senza precedente — qualunque sia, e' vuoto",
        input: { previousEntries: null, currentEntries: 0 },
        atteso: "feed_empty",
      },
      {
        id: "V3",
        etichetta: "prima corsa per questa chiave: null non e' zero",
        input: { previousEntries: null, currentEntries: 40 },
        atteso: "ok",
      },
      {
        id: "V4",
        etichetta: "sotto la soglia dichiarata: il feed si e' rimpicciolito",
        input: { previousEntries: PRECEDENTE, currentEntries: sottoIlMargine },
        atteso: "feed_shrank",
      },
      {
        id: "V5",
        etichetta: "esattamente al margine: ammesso",
        input: { previousEntries: PRECEDENTE, currentEntries: alMargine },
        atteso: "ok",
      },
      {
        id: "V6",
        etichetta: "pari al precedente",
        input: { previousEntries: PRECEDENTE, currentEntries: PRECEDENTE },
        atteso: "ok",
      },
      {
        id: "V7",
        etichetta: "il calendario e' cresciuto",
        input: { previousEntries: PRECEDENTE, currentEntries: PRECEDENTE + 40 },
        atteso: "ok",
      },
    ];

    say(`    soglia letta dal modulo: ${MIRROR_SHRINK_FLOOR} — margine a ${alMargine} su ${PRECEDENTE}`);
    say("");

    for (const caso of CASI) {
      let misurato;
      try {
        misurato = mirrorGuard(caso.input);
      } catch (error) {
        misurato = `solleva: ${error.message}`;
      }
      if (misurato === caso.atteso) {
        say(`    ✓ ${caso.id}  ${caso.etichetta} → ${misurato}`);
      } else {
        say(`    ✗ ${caso.id}  ${caso.etichetta}`);
        say(`            atteso ${caso.atteso} · misurato ${misurato}`);
        fallimenti.push(caso.id);
      }
    }
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * FAMIGLIA 2 — i rifiuti dell'importatore, per codice d'uscita e categoria
 *
 * `spawnSync` con un ambiente curato. Si asserisce **l'uscita e la categoria**,
 * e nient'altro: il corpo del referto del figlio non viene ne' letto ne'
 * stampato.
 *
 * L'uscita attesa e' **2** su tutti e tre, e il 2 ha un significato preciso in
 * questo repository: *nulla e' stato misurato, quindi nulla e' fallito* — e per
 * un import la frase equivalente e' **nulla e' stato scritto**. Un rifiuto che
 * uscisse 1 direbbe che qualcosa e' stato tentato.
 * ──────────────────────────────────────────────────────────────────────────── */

say("");
say("  famiglia 2 — i rifiuti dell'importatore");
say("");

/**
 * L'ambiente del figlio: solo il percorso degli eseguibili e la home.
 *
 * Costruito per **inclusione** e mai per esclusione. Una lista di variabili da
 * togliere e' una lista che qualcuno dimentica di aggiornare la volta che ne
 * nasce una nuova; una lista di variabili da tenere non ha quel modo di
 * fallire.
 */
const AMBIENTE_CURATO = {
  PATH: process.env.PATH ?? "",
  HOME: process.env.HOME ?? "",
};

/** L'uscita e la categoria di un rifiuto. Del referto non esce altro. */
function rifiutoDi(argomenti) {
  const corsa = spawnSync(process.execPath, [IMPORTATORE, ...argomenti], {
    cwd: ROOT,
    encoding: "utf8",
    env: AMBIENTE_CURATO,
  });

  if (corsa.error) {
    return { uscita: "spawn", categoria: null };
  }

  // Solo il token fra parentesi quadre. Il resto della riga porta la prosa che
  // lo script ha scritto per una persona, e non e' cio' che questo gate misura.
  const trovato = /REFUSED \[([a-z_]+)\]/.exec(corsa.stdout ?? "");
  return { uscita: corsa.status, categoria: trovato === null ? null : trovato[1] };
}

const RIFIUTI = [
  {
    id: "R1",
    requisito: "ICS-02",
    etichetta: "--apply senza chiave di calendario",
    argomenti: ["--apply"],
    categoria: "missing_calendar_key",
  },
  {
    id: "R2",
    requisito: "ICS-02 / D-58-06",
    etichetta: "una chiave fuori dal vocabolario chiuso",
    // `segnaposto` non e' un luogo e non e' una sigla: e' esattamente cio' che
    // il vocabolario chiuso deve rifiutare, e non nomina niente.
    argomenti: ["--apply", "--calendar", "segnaposto"],
    categoria: "unknown_calendar_key",
  },
  {
    id: "R3",
    requisito: "ICS-09",
    etichetta: "chiave valida, nessuna sorgente registrata per quella chiave",
    argomenti: ["--apply", "--calendar", "rsnt"],
    categoria: "missing_feed_source",
  },
];

for (const caso of RIFIUTI) {
  const { uscita, categoria } = rifiutoDi(caso.argomenti);
  if (uscita === 2 && categoria === caso.categoria) {
    say(`    ✓ ${caso.id}  ${caso.etichetta} → uscita 2, ${categoria}`);
  } else {
    say(`    ✗ ${caso.id}  (${caso.requisito}) ${caso.etichetta}`);
    say(`            atteso   uscita 2, categoria ${caso.categoria}`);
    say(`            misurato uscita ${uscita}, categoria ${categoria ?? "nessuna"}`);
    fallimenti.push(caso.id);
  }
}

/* ── R4 — ICS-01b, dichiarato rimandato invece che simulato ─────────────────
 *
 * D-58-01 sposta nell'applicazione la terza guardia monotona del progetto: il
 * trigger `production_plan_refuse_renumber` e' `BEFORE UPDATE OF number`, e uno
 * specchio che cancella e reinserisce non fa mai `UPDATE`. Al suo posto, prima
 * di cancellare, lo specchio confronta i progressivi dell'istantanea con quelli
 * in arrivo: se un `source_uid` gia' noto porta un numero diverso, **rifiuta**,
 * esce `2` e non scrive niente.
 *
 * ⚠ **Quel confronto legge l'istantanea, quindi legge il database.** Non e'
 * esercitabile qui, e questo gate non lo simula: un caso finto che passa e'
 * peggio di un caso assente, perche' fa credere presidiata una guardia che non
 * lo e' — e questa e' l'unica cosa che protegge un progressivo gia' stampato su
 * una locandina.
 *
 * Va misurato in `P-58-B`, con il database davanti, e la misura deve asserire
 * **tre** cose insieme: uscita `2`, categoria `renumber_refused`, e **zero
 * scritture** verificate leggendo il catalogo — non il referto dello script che
 * ha causato l'effetto.
 */

rimandati.push({
  id: "R4",
  requisito: "ICS-01b / D-58-01",
  etichetta: "un source_uid noto che torna con un progressivo diverso",
  atteso: "uscita 2, categoria renumber_refused, zero scritture",
  dove: "P-58-B",
  ragione: "il confronto legge l'istantanea, quindi il database: qui non e' esercitabile",
});

say(`    – R4  ${rimandati[0].etichetta}`);
say(`            RIMANDATO a ${rimandati[0].dove} — ${rimandati[0].ragione}`);
say(`            atteso la': ${rimandati[0].atteso}`);
say("            Non simulato: un caso finto che passa fa credere presidiata una");
say("            guardia che non lo e', e questa protegge un progressivo che e'");
say("            gia' su una locandina.");

/* ────────────────────────────────────────────────────────────────────────────
 * Il referto
 * ──────────────────────────────────────────────────────────────────────────── */

say("");

if (fallimenti.length === 0) {
  say(`  MIRROR_GUARDS_OK — ogni caso esercitabile e' come dichiarato.`);
  say(`  ${rimandati.length} caso/i rimandato/i e dichiarato/i: ${rimandati.map((r) => `${r.id}→${r.dove}`).join(", ")}.`);
  say("  Dice che queste strade non portano a una scrittura, NON che lo specchio");
  say("  sia sicuro: la procedura di ripristino e' un'altra cosa e va scritta prima");
  say("  del primo --apply.");
  say("");
  process.exit(0);
}

say(`  MIRROR_GUARDS_FAILED — ${fallimenti.length} caso/i: ${fallimenti.join(", ")}`);
say(`  ${rimandati.length} caso/i rimandato/i e dichiarato/i: ${rimandati.map((r) => `${r.id}→${r.dove}`).join(", ")}.`);
say("");
say("  Se i tre rifiuti rispondono `missing_credential`, il difetto non e' nel gate:");
say("  e' l'ordine. La validazione degli argomenti e della chiave di calendario, e");
say("  la verifica che la sorgente sia registrata, vanno PRIMA del caricamento delle");
say("  credenziali — e il file d'ambiente su disco va letto dentro quel passo, mai");
say("  in cima, o l'esito di R3 dipendera' da cosa c'e' sul disco di chi lancia.");
say("");
process.exit(1);
