/**
 * verify-mirror-guards — le guardie dello specchio, misurate prima che esistano
 *
 * QUELLO CHE ASSERISCE, in una frase: **un processo non presidiato che cancella
 * e riscrive si ferma dove deve fermarsi**, e lo dice con una categoria propria e
 * con l'uscita `2`, che significa *nulla e' stato scritto*.
 *
 * ── LE QUATTRO FAMIGLIE, E COSA MISURA CIASCUNA ─────────────────────────────
 *
 *   1. il predicato puro della guardia del feed        — `V0`-`V7`
 *   2. i rifiuti dell'importatore, per uscita e categoria — `R1`-`R3` (+`R4`
 *      rimandato)
 *   3. il predicato puro della guardia della corsa NON PRESIDIATA — `U0`-`U11`,
 *      e la lista che lo alimenta — `U12`-`U16`
 *   4. i rifiuti del percorso di rientro, per uscita e categoria — `R5`-`R13`
 *      (+ due rimandati)
 *
 * Le famiglie 3 e 4 sono arrivate il 2026-08-22, con la voce 3 delle differite,
 * e sono arrivate **dopo** il codice invece che prima: la voce 3 le aveva scritte
 * come contratto in anticipo, e questo file le misura contro cio' che quel
 * contratto chiedeva.
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
 * Che lo specchio sia sicuro. Dice che **queste strade non portano a una
 * scrittura**, e che i due predicati rispondono come dichiarato.
 *
 * ⚠ **E non dice che un rientro funzioni CONTRO LA PRODUZIONE.** I rifiuti del
 * percorso di ripristino sono misurati qui; rimettere davvero una riga richiede
 * un database davanti ed e' **un atto**, quindi non e' esercitabile da questo
 * file.
 *
 * **E' stato esercitato altrove: in laboratorio, il 2026-08-26** — 2 decisioni
 * rimesse su 2, di cui un ANNULLAMENTO, con attore e istante originali
 * riconfermati dal catalogo. Il referto sta in `58-PROCEDURES.md`.
 *
 * `MIRROR_RESTORE_PATH_VERIFIED` vale **ancora `false`**, e la guardia della
 * famiglia 3 resta armata. La fedelta' misurata del laboratorio e' quella dello
 * SCHEMA, non quella dei DATI, e disarmare la guardia rende **piu' facile** far
 * scattare un percorso che cancella: e' una decisione del proprietario, non la
 * conseguenza automatica di un esercizio riuscito. Un verde qui non la disarma e
 * non deve poterlo fare.
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
 * FAMIGLIA 3 — il predicato della corsa NON PRESIDIATA (voce 3, punto 2)
 *
 * Il contratto, per intero:
 *
 *     runSupervision({ interactiveTerminal, declaredUnattended })
 *       => "attended" | "unattended"
 *
 *     unattendedMirrorGuard({
 *       supervision,           // l'esito di sopra
 *       decisionsAtRisk,       // number — le DECISIONI di checklist dentro lo
 *                              //   scopo: spunte E annullamenti, perche' una
 *                              //   casella tolta e' un atto con un autore
 *       linksAtRisk,           // number — i legami dentro lo scopo
 *       restorePathVerified,   // boolean — il rientro e' stato ESERCITATO?
 *     }) => "ok" | "unattended_state_at_risk"
 *
 * ⚠ **L'attendibilita' e' un'evidenza, non una dichiarazione, e il gate misura
 * proprio quell'asimmetria.** Non esiste nessun `--attended`: un argomento che
 * zittisce una guardia finisce in un alias di shell, e la voce 3 lo dice con le
 * sue parole — *«un meccanismo che si puo' passare per abitudine non e' una
 * guardia»*. La dichiarazione esiste solo nel verso che **restringe**, ed e'
 * `U3` a fissarlo.
 *
 * ⚠ **Conteggi, non liste**, come nella famiglia 1 e per la stessa ragione: la
 * lista delle decisioni porta il nome di una persona.
 *
 * ⚠ **`decisionsAtRisk` si chiamava `ticksAtRisk`, e il nome era il difetto.**
 * Una casella si decide in due direzioni: spuntata porta attore e istante,
 * ANNULLATA porta attore e **nessun** istante, perche' azzerare l'istante e' il
 * modo in cui un annullamento viene scritto. Finche' questo argomento contava le
 * spunte, uno scopo con un annullamento e nessuna spunta valeva `0`, la guardia
 * rispondeva `ok`, e una corsa non presidiata avrebbe portato via la traccia
 * **senza che un solo numero del referto calasse**. I casi `U12`-`U16` misurano
 * la meta' che il predicato da solo non puo' misurare: che la lista da cui quel
 * conteggio esce contenga davvero cio' che si perderebbe.
 *
 * ⚠ **`U11` legge il valore SPEDITO della costante.** Se qualcuno mettesse
 * `MIRROR_RESTORE_PATH_VERIFIED` a `true` senza aver mai esercitato il rientro,
 * questo caso andrebbe rosso. L'attrito e' voluto: quel valore non e' *«il codice
 * esiste»*, e' *«qualcuno l'ha visto rimettere una spunta vera e l'ha scritto con
 * la data»*. Girarlo e' una decisione con una forma, e passa da qui.
 * ──────────────────────────────────────────────────────────────────────────── */

say("");
say("  famiglia 3 — il predicato della corsa non presidiata");
say("");

if (
  guard === null ||
  typeof guard.runSupervision !== "function" ||
  typeof guard.unattendedMirrorGuard !== "function" ||
  typeof guard.MIRROR_RESTORE_PATH_VERIFIED !== "boolean"
) {
  say("    ✗ U0  il predicato della corsa non presidiata non si carica");
  say("            atteso: runSupervision, unattendedMirrorGuard e");
  say("            MIRROR_RESTORE_PATH_VERIFIED (boolean) da guard.ts");
  say("            Nessuno degli undici casi sotto e' stato misurato.");
  fallimenti.push("U0");
} else {
  const { runSupervision, unattendedMirrorGuard, MIRROR_RESTORE_PATH_VERIFIED } = guard;

  const PRESIDIO = [
    {
      id: "U1",
      etichetta: "terminale interattivo, nessuna dichiarazione",
      input: { interactiveTerminal: true, declaredUnattended: false },
      atteso: "attended",
    },
    {
      id: "U2",
      etichetta: "nessun terminale — il cron, che non puo' procurarsene uno",
      input: { interactiveTerminal: false, declaredUnattended: false },
      atteso: "unattended",
    },
    {
      id: "U3",
      etichetta: "terminale, ma dichiarata non presidiata: la dichiarazione restringe",
      input: { interactiveTerminal: true, declaredUnattended: true },
      atteso: "unattended",
    },
    {
      id: "U4",
      // `process.stdin.isTTY` e' `undefined`, non `false`, quando non c'e' un
      // terminale. Il predicato deve essere totale su quel valore, o la totalita'
      // dipenderebbe da come il chiamante normalizza.
      etichetta: "evidenza assente invece che falsa — totale, e verso il rifiuto",
      input: { interactiveTerminal: undefined, declaredUnattended: undefined },
      atteso: "unattended",
    },
  ];

  for (const caso of PRESIDIO) {
    let misurato;
    try {
      misurato = runSupervision(caso.input);
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

  const GUARDIA = [
    {
      id: "U5",
      etichetta: "non presidiata, una spunta, rientro non esercitato",
      input: {
        supervision: "unattended",
        decisionsAtRisk: 1,
        linksAtRisk: 0,
        restorePathVerified: false,
      },
      atteso: "unattended_state_at_risk",
    },
    {
      id: "U6",
      etichetta: "non presidiata, un legame, rientro non esercitato",
      input: {
        supervision: "unattended",
        decisionsAtRisk: 0,
        linksAtRisk: 1,
        restorePathVerified: false,
      },
      atteso: "unattended_state_at_risk",
    },
    {
      id: "U7",
      // E' lo stato che la voce 3 aveva misurato prima di decidere di aspettare:
      // zero e zero, quindi una corsa morta a meta' non perde niente che la
      // successiva non riscriva dal file.
      etichetta: "non presidiata, niente in gioco — la corsa dopo riscrive tutto",
      input: {
        supervision: "unattended",
        decisionsAtRisk: 0,
        linksAtRisk: 0,
        restorePathVerified: false,
      },
      atteso: "ok",
    },
    {
      id: "U8",
      // La corsa che la fase 58 ha appena fatto a mano. Bloccarla sarebbe bloccare
      // l'unica corsa che sa rientrare da se'.
      etichetta: "presidiata con tutto in gioco: ammessa, perche' il rientro e' suo",
      input: {
        supervision: "attended",
        decisionsAtRisk: 7,
        linksAtRisk: 3,
        restorePathVerified: false,
      },
      atteso: "ok",
    },
    {
      id: "U9",
      etichetta: "non presidiata con spunte, ma il rientro e' stato esercitato",
      input: {
        supervision: "unattended",
        decisionsAtRisk: 7,
        linksAtRisk: 0,
        restorePathVerified: true,
      },
      atteso: "ok",
    },
    {
      id: "U10",
      // Un conteggio che non si e' potuto misurare non e' uno zero. Trattarlo come
      // tale trasformerebbe una misura fallita in un permesso di cancellare.
      etichetta: "un conteggio illeggibile vale come stato presente",
      input: {
        supervision: "unattended",
        decisionsAtRisk: Number.NaN,
        linksAtRisk: 0,
        restorePathVerified: false,
      },
      atteso: "unattended_state_at_risk",
    },
    {
      /* ⚠ **L'ATTESO DI QUESTO CASO E' CAMBIATO IL 2026-08-27, ed e' l'unico
       * caso di questo file il cui atteso dipenda da una DECISIONE invece che da
       * un predicato.**
       *
       * Fino al 2026-08-26 era `unattended_state_at_risk`, perche' la costante
       * spedita valeva `false`: una spunta viva e nessuno che guarda facevano
       * rifiutare. Il proprietario ha sbloccato lo specchio automatico, la
       * costante e' `true`, e lo stesso caso ora e' ammesso.
       *
       * **Il rosso che questo caso ha prodotto quando la costante e' cambiata E'
       * IL PUNTO, non un fastidio.** Il docblock della costante lo annuncia:
       * *«flipping it without touching the gate turns the gate red: the friction
       * is deliberate»*. Chi cambia quella riga passa di qui e deve dire perche'.
       *
       * **Perche' e' ammesso adesso.** Non perche' lo stato a rischio sia
       * sparito — c'e' ancora, ed e' un annullamento — ma perche' il percorso
       * schedulato ha guadagnato una via di ritorno lo stesso giorno: la riga di
       * registro porta le due eccezioni di stato catturate PRIMA della
       * cancellazione (migration `20260827000000`), e il rientro le rilegge con
       * `--from-run`. Prima non le portava, e la guardia era l'unica cosa fra
       * una corsa morta a meta' e una riga che nulla ricostruisce.
       *
       * **Cosa fara' questo caso se qualcuno rimettesse `false`:** tornera'
       * rosso, e l'atteso qui sotto andra' rimesso a `unattended_state_at_risk`
       * con la stessa cerimonia. La frizione vale in entrambe le direzioni.
       */
      id: "U11",
      etichetta:
        "con il valore SPEDITO della costante: una spunta e nessuno che guarda",
      input: {
        supervision: "unattended",
        decisionsAtRisk: 1,
        linksAtRisk: 0,
        restorePathVerified: MIRROR_RESTORE_PATH_VERIFIED,
      },
      atteso: MIRROR_RESTORE_PATH_VERIFIED ? "ok" : "unattended_state_at_risk",
    },
  ];

  say("");
  say(
    `    rientro esercitato, valore spedito: ${MIRROR_RESTORE_PATH_VERIFIED ? "SI'" : "NO"} — ` +
      (MIRROR_RESTORE_PATH_VERIFIED
        ? "la guardia e' DISARMATA per decisione del proprietario (2026-08-27), e cio' che " +
          "la rende difendibile e' che la corsa schedulata porta ora la propria via di " +
          "ritorno nella riga di registro"
        : "finche' e' no la guardia resta armata")
  );
  say("");

  for (const caso of GUARDIA) {
    let misurato;
    try {
      misurato = unattendedMirrorGuard(caso.input);
    } catch (error) {
      misurato = `solleva: ${error.message}`;
    }
    if (misurato === caso.atteso) {
      say(`    ✓ ${caso.id}  ${caso.etichetta} → ${misurato}`);
    } else {
      say(`    ✗ ${caso.id}  ${caso.etichetta}`);
      say(`            atteso ${caso.atteso} · misurato ${misurato}`);
      if (caso.id === "U11") {
        say("            Se questo e' l'unico rosso, la costante e' stata girata:");
        say("            girarla vuol dire che qualcuno ha VISTO il rientro rimettere");
        say("            una spunta vera e l'ha scritto con la data. Se e' successo,");
        say("            questo caso va riscritto; se non e' successo, va rimessa a false.");
      }
      fallimenti.push(caso.id);
    }
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * FAMIGLIA 3-bis — LA LISTA CHE ALIMENTA LA GUARDIA (`U12`-`U16`)
 *
 * PERCHE' ESISTE, e perche' i casi `U5`-`U11` non bastavano.
 *
 * Quelli misurano un predicato che riceve **due numeri**. Un predicato corretto
 * alimentato da un conteggio cieco risponde `ok` con esattezza impeccabile
 * mentre c'e' una traccia da perdere — ed e' successo: il riconciliatore
 * raccoglieva le voci di checklist che portano un ISTANTE, un annullamento non
 * ne ha, e attraversando lo specchio la traccia d'autore e' passata da 1 a 0.
 * `U5` era verde per tutto il tempo.
 *
 * Quindi questa famiglia misura l'altra meta': **cio' che entra nel conteggio**.
 * Chiama il riconciliatore su righe costruite qui, e poi passa alla guardia la
 * lunghezza della lista che ne esce — cioe' esattamente cio' che fa
 * l'importatore. Se raccolta e guardia leggessero due liste, questa catena si
 * spezzerebbe qui.
 *
 * ⚠ **Il file non contiene ne' un nome ne' una data di serata.** L'attore e' un
 * uuid tutto a zeri e un'etichetta che nomina un RUOLO, come pretende
 * `20260815120000` della colonna che porta un nome: gli artefatti nominano
 * ruoli. Il calendario in ingresso e' **vuoto** — le tre liste del file sono
 * vuote — perche' cio' che si misura qui e' cosa il riconciliatore fa con le
 * righe GIA' MEMORIZZATE, e un calendario finto non aggiunge nessuna evidenza.
 *
 * ⚠ **Il conteggio non e' scritto a mano.** Ogni caso dichiara cosa si aspetta
 * dalla lista, e la guardia riceve `plan.decisionsToRestore.length`: un gate che
 * passasse un numero copiato misurerebbe di nuovo il predicato e non la catena.
 * ──────────────────────────────────────────────────────────────────────────── */

say("");
say("  famiglia 3-bis — la lista da cui esce quel conteggio");
say("");

let reconcilerMod = null;
try {
  reconcilerMod = await import(pathToFileURL(join(ICS_DIR, "reconcile.ts")).href);
} catch (error) {
  reconcilerMod = null;
  say(`    (il riconciliatore non si e' importato: ${error.message})`);
}

if (
  guard === null ||
  reconcilerMod === null ||
  typeof reconcilerMod.reconcile !== "function" ||
  typeof guard.unattendedMirrorGuard !== "function"
) {
  say("    ✗ U12 la lista non si puo' misurare: riconciliatore o guardia assenti");
  say("            atteso: reconcile da reconcile.ts e unattendedMirrorGuard da guard.ts");
  say("            Nessuno dei cinque casi sotto e' stato misurato, e nessuno puo'");
  say("            dirsi verde: un conteggio non misurato non e' uno zero.");
  fallimenti.push("U12");
} else {
  const { reconcile } = reconcilerMod;
  const { unattendedMirrorGuard } = guard;

  // ⚠ Un uuid tutto a zeri e un'etichetta che nomina un RUOLO. Nessuna persona
  // entra in un file tracciato di questo repository, che e' pubblico.
  const ATTORE = "00000000-0000-4000-8000-000000000000";
  const RUOLO = "a role, not a person";
  const ISTANTE = "2026-01-01T00:00:00.000Z";

  /** Un file che non porta niente: qui si misura cio' che il DATABASE tiene. */
  const fileVuoto = {
    calendarKey: "rsnt",
    nights: [],
    pieces: [],
    commitments: [],
    unclassified: [],
    unsupportedRecurrences: [],
    lineupSlotCounts: new Map(),
    recurrenceOccurrenceCap: 200,
  };

  const voce = (tickedAt, tickedBy, tickedByName) => ({
    id: "item-under-test",
    planSourceUid: "uid-under-test",
    kind: "piece",
    label: "an item under test",
    tickedAt,
    tickedBy,
    tickedByName,
  });

  const pianoCon = (items) =>
    reconcile(fileVuoto, { plans: [], checklistItems: items }, [], ISTANTE);

  const CASI_LISTA = [
    {
      id: "U12",
      etichetta: "un ANNULLAMENTO — attore pieno, nessun istante — entra nella lista",
      items: [voce(null, ATTORE, RUOLO)],
      atteso: { raccolte: 1, direzione: "unticked", istante: null, attore: ATTORE },
      perche:
        "e' il caso che e' costato una riga: la traccia d'autore di un annullamento " +
        "non e' ricostruibile dal calendario piu' di quanto lo sia quella di una spunta",
    },
    {
      id: "U13",
      etichetta: "una SPUNTA continua a entrare, e porta il proprio istante",
      items: [voce(ISTANTE, ATTORE, RUOLO)],
      atteso: { raccolte: 1, direzione: "ticked", istante: ISTANTE, attore: ATTORE },
      perche: "la direzione che gia' funzionava non deve regredire con la riparazione",
    },
    {
      id: "U14",
      etichetta: "una voce che nessuno ha mai toccato NON entra — il controllo negativo",
      items: [voce(null, null, null)],
      atteso: { raccolte: 0, direzione: null, istante: null, attore: null },
      perche:
        "senza questo caso la riparazione potrebbe essere «raccogliere tutto», che " +
        "rimetterebbe righe che il file ricostruisce da solo e renderebbe il " +
        "conteggio della guardia inutile in avanti",
    },
  ];

  for (const caso of CASI_LISTA) {
    let misurato;
    try {
      const piano = pianoCon(caso.items);
      const raccolte = piano.decisionsToRestore;
      misurato = {
        raccolte: raccolte.length,
        direzione: raccolte.length === 1 ? raccolte[0].decision : null,
        istante: raccolte.length === 1 ? raccolte[0].tickedAt : null,
        attore: raccolte.length === 1 ? raccolte[0].tickedBy : null,
      };
    } catch (error) {
      misurato = `solleva: ${error.message}`;
    }

    const uguale =
      typeof misurato === "object" &&
      misurato !== null &&
      misurato.raccolte === caso.atteso.raccolte &&
      misurato.direzione === caso.atteso.direzione &&
      misurato.istante === caso.atteso.istante &&
      misurato.attore === caso.atteso.attore;

    if (uguale) {
      say(
        `    ✓ ${caso.id}  ${caso.etichetta} → ${misurato.raccolte} raccolta/e` +
          `${misurato.direzione === null ? "" : `, direzione ${misurato.direzione}`}`
      );
    } else {
      say(`    ✗ ${caso.id}  ${caso.etichetta}`);
      say(`            atteso ${JSON.stringify(caso.atteso)}`);
      say(`            misurato ${JSON.stringify(misurato)}`);
      say(`            perche' conta: ${caso.perche}`);
      fallimenti.push(caso.id);
    }
  }

  /*
   * `U15` E' IL CASO DELLA VOCE 21, DA CAPO A FONDO.
   *
   * Non ripete `U5`: quello passa `1` a mano. Questo passa cio' che la lista
   * contiene davvero, partendo da una riga che nel database ha la forma di un
   * annullamento. E' l'unico caso di tutto il file in cui una raccolta e un
   * predicato si misurano **insieme**, ed e' l'unico che sarebbe andato rosso il
   * giorno in cui la traccia e' stata persa.
   */
  const casiCatena = [
    {
      id: "U15",
      etichetta: "un annullamento, nessuno che guarda: la guardia RIFIUTA",
      items: [voce(null, ATTORE, RUOLO)],
      atteso: "unattended_state_at_risk",
    },
    {
      id: "U16",
      etichetta: "solo voci mai toccate, nessuno che guarda: ammessa",
      items: [voce(null, null, null)],
      atteso: "ok",
    },
  ];

  for (const caso of casiCatena) {
    let misurato;
    let conteggio = null;
    try {
      const piano = pianoCon(caso.items);
      conteggio = piano.decisionsToRestore.length;
      misurato = unattendedMirrorGuard({
        supervision: "unattended",
        // ⚠ La lunghezza della LISTA, mai un numero scritto qui: e' il punto
        // dell'intera famiglia. Una fonte, due lettori.
        decisionsAtRisk: conteggio,
        // Anche qui il piano, mai un numero scritto a mano — e il campo giusto
        // e' `linksAtRisk`, non la lunghezza della lista di rientro: la lista
        // e' sovra-raccolta di proposito. Vedi la famiglia 3-ter.
        linksAtRisk: piano.linksAtRisk,
        restorePathVerified: false,
      });
    } catch (error) {
      misurato = `solleva: ${error.message}`;
    }

    if (misurato === caso.atteso) {
      say(`    ✓ ${caso.id}  ${caso.etichetta} → ${misurato} (in gioco: ${conteggio})`);
    } else {
      say(`    ✗ ${caso.id}  ${caso.etichetta}`);
      say(`            atteso ${caso.atteso} · misurato ${misurato} (in gioco: ${conteggio})`);
      say("            E' il difetto della voce 21: la guardia conta cio' che si");
      say("            perderebbe, non cio' che e' spuntato. Se questo e' rosso, una");
      say("            corsa non presidiata passa sopra la decisione di una persona.");
      fallimenti.push(caso.id);
    }
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * FAMIGLIA 3-quater — LA VIA DI RITORNO DELLA CORSA CHE NESSUNO GUARDA (`U20`-`U22`)
 *
 * ⚠ **Questa famiglia esiste per una mutazione che e' rimasta VERDE.** Il
 * 2026-08-27, dopo aver disarmato `MIRROR_RESTORE_PATH_VERIFIED`, la prova per
 * mutazione ha tolto dal cron la riga che scrive l'istantanea nella riga di
 * registro: **il build e' passato e questo file e' passato**. Cioe' esisteva uno
 * stato — guardia disarmata, nessuna via di ritorno — in cui una corsa notturna
 * poteva cancellare un annullamento vivo senza niente da cui rientrare, e nessun
 * controllo lo diceva.
 *
 * Il disarmo della guardia e la presenza dell'istantanea sono **una decisione
 * sola spezzata in due file**, ed e' la forma esatta del difetto D7 e della
 * voce 21: due meta' che nessuno confronta. Qui si confrontano.
 *
 * Si asserisce sul SORGENTE, come `U12` di `verify-calendar-surface.mjs`, perche'
 * chiedere la risposta al processo in esecuzione vorrebbe dire una richiesta, un
 * segreto e un database — cioe' non sarebbe un controllo di questo file.
 * ──────────────────────────────────────────────────────────────────────────── */

say("");
say("  famiglia 3-quater — la corsa non presidiata porta la propria via di ritorno");
say("");

{
  const rotta = join(ROOT, "src", "app", "api", "cron", "production-mirror", "route.ts");
  let sorgente = null;
  try {
    sorgente = readFileSync(rotta, "utf8");
  } catch {
    sorgente = null;
  }

  if (sorgente === null) {
    say("    ✗ U20 il sorgente della rotta non si e' potuto leggere: nulla e' stato misurato");
    fallimenti.push("U20");
  } else {
    const scriveIstantanea = /state_snapshot\s*:/.test(sorgente);
    const iIstantanea = sorgente.search(/state_snapshot\s*:/);
    const iCancellazione = sorgente.search(/\.delete\(\)/);
    const usaLeListeDelPiano =
      /decisions:\s*plan\.decisionsToRestore/.test(sorgente) &&
      /links:\s*plan\.linksToRestore/.test(sorgente);

    // U20 — esiste. E' la condizione che rende difendibile il disarmo.
    if (scriveIstantanea) {
      say("    ✓ U20  la rotta scrive `state_snapshot` sulla riga di registro");
    } else {
      say("    ✗ U20  la rotta NON scrive nessuna istantanea");
      say(`            e MIRROR_RESTORE_PATH_VERIFIED vale ${MIRROR_RESTORE_PATH_VERIFIED}.`);
      say("            Con la guardia disarmata e nessuna via di ritorno, una corsa che");
      say("            muore fra la cancellazione e la riscrittura perde una riga che");
      say("            nulla ricostruisce. Le due meta' sono UNA decisione.");
      fallimenti.push("U20");
    }

    // U21 — prima di cancellare, non dopo. Un'istantanea presa dopo e' un referto.
    if (scriveIstantanea && iCancellazione !== -1) {
      if (iIstantanea < iCancellazione) {
        say("    ✓ U21  la scrive PRIMA della prima cancellazione");
      } else {
        say("    ✗ U21  la scrive DOPO la prima cancellazione: non e' una via di ritorno,");
        say("            e' un referto di cio' che era gia' andato.");
        fallimenti.push("U21");
      }
    }

    // U22 — le stesse liste che lo scrittore rimette. Una fonte, due lettori.
    if (scriveIstantanea) {
      if (usaLeListeDelPiano) {
        say("    ✓ U22  porta le liste del piano, non una loro copia costruita a parte");
      } else {
        say("    ✗ U22  l'istantanea non porta `plan.decisionsToRestore` e");
        say("            `plan.linksToRestore`. Due elenchi che nessuno confronta");
        say("            divergono al primo cambio — e' il difetto della voce 21.");
        fallimenti.push("U22");
      }
    }
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * FAMIGLIA 3-ter — CIO' CHE SI RIMETTE NON E' CIO' CHE SI PUO' PERDERE (`U17`-`U19`)
 *
 * La famiglia 3-bis ha stabilito che la guardia legge la stessa lista che lo
 * scrittore rimette. Questa stabilisce il suo **contrario necessario** sul
 * secondo tipo di stato: per i LEGAMI le due domande non hanno la stessa
 * risposta, e leggerle sulla stessa lunghezza e' un difetto.
 *
 * ⚠ **Il difetto che questa famiglia esiste per prendere.** `linksToRestore` e'
 * sovra-raccolta di proposito — ogni riga legata ci finisce, perche' quella
 * lista e' l'unica copia dello stato attraverso una corsa che muore a meta'. Ma
 * un legame vive **sulla riga di piano**, e `ICS-03b` tiene ogni riga legata
 * fuori dalla cancellazione: quel legame non e' a rischio di niente. Passare
 * `linksToRestore.length` alla guardia significa quindi che **la prima serata
 * annunciata fa rifiutare ogni corsa non presidiata, per sempre**, su uno stato
 * che il codice stesso documenta come un no-op — ed e' il rumore che insegna a
 * ignorare il canale, cioe' il costo che la voce differita 10 nomina per esteso.
 *
 * ⚠ **Le decisioni NON ricevono lo stesso trattamento, ed e' deliberato.** Una
 * spunta non vive sulla riga di piano: vive in `production_checklist_item`, che
 * e' il passo 1 della cancellazione e viene rimosso **anche per i sopravvissuti**
 * — il percorso di scrittura lo dice in prosa, *survivors INCLUDED*. Ogni
 * decisione raccolta e' percio' davvero a rischio, e il conteggio sbaglia
 * nell'unico verso che si puo' permettere: verso il rifiuto.
 *
 * ⚠ **Un caso con `linksAtRisk > 0` non e' raggiungibile finche' `ICS-03b` vale**,
 * e questo si dichiara invece di simularlo. Cio' che i casi qui sotto provano e'
 * che il conteggio **segue i sopravvissuti** invece della lunghezza della lista:
 * il giorno in cui qualcuno restringesse `ICS-03b`, il numero salirebbe da solo.
 * ──────────────────────────────────────────────────────────────────────────── */

say("");
say("  famiglia 3-ter — il legame che si rimette non e' il legame che si perde");
say("");

if (reconcilerMod === null || typeof reconcilerMod.reconcile !== "function") {
  say("    ✗ U17 il riconciliatore non si e' importato: nessun caso e' stato misurato");
  fallimenti.push("U17");
} else {
  const { reconcile } = reconcilerMod;

  const PARTY = "00000000-0000-4000-8000-00000000ffff";
  const ISTANTE_3TER = "2026-01-01T00:00:00.000Z";

  const rigaDiPiano = (sourceUid, linkedPartyId) => ({
    id: `id-${sourceUid}`,
    sourceUid,
    seriesId: null,
    number: null,
    venueWord: null,
    date: "2026-01-01",
    startTime: null,
    endTime: null,
    sourceSequence: null,
    sourceLastModified: null,
    linkedPartyId,
    calendarKey: "rsnt",
  });

  const fileVuoto3ter = {
    calendarKey: "rsnt",
    nights: [],
    pieces: [],
    commitments: [],
    unclassified: [],
    unsupportedRecurrences: [],
    lineupSlotCounts: new Map(),
    recurrenceOccurrenceCap: 200,
  };

  const CASI_3TER = [
    {
      id: "U17",
      etichetta:
        "una riga LEGATA e assente dal file: si rimette, ma non si puo' perdere",
      plans: [rigaDiPiano("uid-legata", PARTY)],
      atteso: { rimessi: 1, aRischio: 0, sopravvissuti: 1 },
      seRosso:
        "la guardia riceverebbe 1 e rifiuterebbe: la prima serata annunciata " +
        "spegnerebbe il cron per sempre",
    },
    {
      id: "U18",
      etichetta: "due righe legate: due da rimettere, zero da perdere",
      plans: [rigaDiPiano("uid-a", PARTY), rigaDiPiano("uid-b", PARTY)],
      atteso: { rimessi: 2, aRischio: 0, sopravvissuti: 2 },
      seRosso: "il conteggio sta leggendo la lunghezza della lista, non i sopravvissuti",
    },
    {
      id: "U19",
      etichetta: "nessun legame: nessuna delle due liste si popola",
      plans: [rigaDiPiano("uid-nuda", null)],
      atteso: { rimessi: 0, aRischio: 0, sopravvissuti: 0 },
      seRosso: "una riga senza legame non e' stato e non deve entrare da nessuna parte",
    },
  ];

  for (const caso of CASI_3TER) {
    let misurato;
    try {
      const piano = reconcile(
        fileVuoto3ter,
        { plans: caso.plans, checklistItems: [] },
        [],
        ISTANTE_3TER
      );
      misurato = {
        rimessi: piano.linksToRestore.length,
        // ⚠ Il CAMPO, mai un numero scritto qui e mai la lunghezza dell'altra
        // lista: e' esattamente la sostituzione che questa famiglia vieta.
        aRischio: piano.linksAtRisk,
        sopravvissuti: piano.plansThatSurviveDeletion.length,
      };
    } catch (error) {
      misurato = `solleva: ${error.message}`;
    }

    const uguali =
      typeof misurato === "object" &&
      misurato.rimessi === caso.atteso.rimessi &&
      misurato.aRischio === caso.atteso.aRischio &&
      misurato.sopravvissuti === caso.atteso.sopravvissuti;

    if (uguali) {
      say(
        `    ✓ ${caso.id}  ${caso.etichetta} → rimessi ${misurato.rimessi} · ` +
          `a rischio ${misurato.aRischio} · sopravvissuti ${misurato.sopravvissuti}`
      );
    } else {
      say(`    ✗ ${caso.id}  ${caso.etichetta}`);
      say(`            atteso ${JSON.stringify(caso.atteso)} · misurato ${JSON.stringify(misurato)}`);
      say(`            ${caso.seRosso}`);
      fallimenti.push(caso.id);
    }
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * FAMIGLIA 4 — i rifiuti del percorso di rientro
 *
 * Stesso congegno della famiglia 2: ambiente curato, si asseriscono **uscita e
 * categoria** e nient'altro. Il referto del figlio non viene ne' letto ne'
 * stampato, e qui la ragione e' ancora piu' diretta che per l'importatore: il
 * figlio ha appena aperto un file che porta **il nome di una persona**.
 *
 * ⚠ **L'ordine dei rifiuti e' un contratto anche qui**, e per lo stesso motivo:
 *
 *      1. gli argomenti
 *      2. il percorso            (assente; non ignorato da git; non verificabile)
 *      3. la chiave di calendario
 *      4. l'istantanea           (assente, illeggibile, forma ignota, senza ora,
 *                                 incompleta, di un altro calendario)
 *      5. le credenziali
 *
 * Con le credenziali davanti, ogni caso qui sotto risponderebbe
 * `missing_credential`.
 *
 * ⚠ **I casi che hanno bisogno di un file lo costruiscono, e lo costruiscono
 * dentro una directory che git conferma ignorata.** Un gate che scrivesse un
 * finto contenuto in un posto tracciato sarebbe il gate che commette l'errore
 * che sta misurando.
 * ──────────────────────────────────────────────────────────────────────────── */

say("");
say("  famiglia 4 — i rifiuti del percorso di rientro");
say("");

const RIENTRO = join("scripts", "restore-mirror-snapshot.mjs");
const FINTE = join("docs", ".mirror-guards-fixtures");

/** L'uscita e la categoria di un rifiuto del rientro. Del referto non esce altro. */
function rifiutoDelRientro(argomenti) {
  const corsa = spawnSync(process.execPath, [RIENTRO, ...argomenti], {
    cwd: ROOT,
    encoding: "utf8",
    env: AMBIENTE_CURATO,
  });

  if (corsa.error) return { uscita: "spawn", categoria: null };

  const trovato = /RIFIUTATO \[([a-z_]+)\]/.exec(corsa.stdout ?? "");
  return { uscita: corsa.status, categoria: trovato === null ? null : trovato[1] };
}

/**
 * Le finte, costruite qui e con valori che non nominano nulla.
 *
 * ⚠ **Nessun valore reale.** Sono lettere ripetute, apposta: se una finta
 * portasse una parola vera, il controllo del referto del figlio la cercherebbe
 * nel proprio referto e questo gate starebbe misurando una coincidenza invece di
 * un contratto.
 */
const FINTE_CONTENUTI = {
  "forma-ignota.json": { shape: "aaa-bbb", takenAt: "2000-01-01T00:00:00.000Z", calendarKey: "rsnt", ticks: [], links: [] },
  "senza-ora.json": { shape: "mirror-state-1", calendarKey: "rsnt", ticks: [], links: [] },
  "incompleta.json": { shape: "mirror-state-1", takenAt: "2000-01-01T00:00:00.000Z", calendarKey: "rsnt", ticks: [] },
  "altro-calendario.json": { shape: "mirror-state-1", takenAt: "2000-01-01T00:00:00.000Z", calendarKey: "rmdb", ticks: [], links: [] },
};

let finteScritte = false;
const rispostaGit = spawnSync("git", ["check-ignore", "-q", "--", join(FINTE, "x.json")], {
  cwd: ROOT,
});

if (rispostaGit.status !== 0) {
  say("    ✗ F0  la directory delle finte non risulta ignorata da git");
  say("            Nessuna finta e' stata scritta, e i quattro casi che ne hanno");
  say("            bisogno non sono stati misurati. Un gate che scrive in un posto");
  say("            tracciato commette l'errore che sta misurando.");
  fallimenti.push("F0");
} else {
  try {
    mkdirSync(join(ROOT, FINTE), { recursive: true });
    for (const [nome, contenuto] of Object.entries(FINTE_CONTENUTI)) {
      writeFileSync(join(ROOT, FINTE, nome), `${JSON.stringify(contenuto)}\n`, "utf8");
    }
    finteScritte = true;
  } catch (error) {
    say(`    ✗ F0  le finte non si sono potute scrivere: ${error.message}`);
    fallimenti.push("F0");
  }
}

const RIENTRI = [
  {
    id: "R5",
    etichetta: "--apply senza --from",
    argomenti: ["--apply"],
    categoria: "missing_snapshot_path",
    finta: false,
  },
  {
    id: "R6",
    etichetta: "--apply e --dry-run insieme",
    argomenti: ["--apply", "--dry-run", "--from", join(FINTE, "x.json"), "--calendar", "rsnt"],
    categoria: "ambiguous_mode",
    finta: false,
  },
  {
    id: "R7",
    // Il percorso non esiste e non serve che esista: `git check-ignore` risponde
    // su un nome, e il controllo del percorso viene prima della lettura.
    etichetta: "un percorso dentro l'albero che git NON ignora",
    argomenti: ["--apply", "--from", join("scripts", "non-esiste.json"), "--calendar", "rsnt"],
    categoria: "snapshot_path_not_ignored",
    finta: false,
  },
  {
    id: "R8",
    etichetta: "un percorso fuori dall'albero, su cui git non sa rispondere",
    argomenti: ["--apply", "--from", "/dev/null/non-esiste.json", "--calendar", "rsnt"],
    categoria: "snapshot_path_unverifiable",
    finta: false,
  },
  {
    id: "R9",
    etichetta: "percorso ammesso, chiave fuori dal vocabolario chiuso",
    argomenti: ["--apply", "--from", join(FINTE, "x.json"), "--calendar", "segnaposto"],
    categoria: "unknown_calendar_key",
    finta: false,
  },
  {
    id: "R10",
    etichetta: "percorso e chiave ammessi, nessun file li'",
    argomenti: ["--apply", "--from", join(FINTE, "x.json"), "--calendar", "rsnt"],
    categoria: "snapshot_absent",
    finta: false,
  },
  {
    id: "R11",
    etichetta: "un'istantanea di forma ignota — e quelle vecchie non ne dichiarano nessuna",
    argomenti: ["--apply", "--from", join(FINTE, "forma-ignota.json"), "--calendar", "rsnt"],
    categoria: "snapshot_shape_unknown",
    finta: true,
  },
  {
    id: "R12",
    etichetta: "un'istantanea senza il proprio istante: il nome del file non e' un'ora",
    argomenti: ["--apply", "--from", join(FINTE, "senza-ora.json"), "--calendar", "rsnt"],
    categoria: "snapshot_without_clock",
    finta: true,
  },
  {
    id: "R13",
    etichetta: "un'istantanea con una sola delle due eccezioni di stato",
    argomenti: ["--apply", "--from", join(FINTE, "incompleta.json"), "--calendar", "rsnt"],
    categoria: "snapshot_incomplete",
    finta: true,
  },
  {
    id: "R14",
    etichetta: "un'istantanea di un altro calendario",
    argomenti: ["--apply", "--from", join(FINTE, "altro-calendario.json"), "--calendar", "rsnt"],
    categoria: "snapshot_calendar_mismatch",
    finta: true,
  },
];

for (const caso of RIENTRI) {
  if (caso.finta && !finteScritte) {
    say(`    – ${caso.id}  ${caso.etichetta} — NON MISURATO: le finte non ci sono`);
    fallimenti.push(caso.id);
    continue;
  }
  const { uscita, categoria } = rifiutoDelRientro(caso.argomenti);
  if (uscita === 2 && categoria === caso.categoria) {
    say(`    ✓ ${caso.id}  ${caso.etichetta} → uscita 2, ${categoria}`);
  } else {
    say(`    ✗ ${caso.id}  ${caso.etichetta}`);
    say(`            atteso   uscita 2, categoria ${caso.categoria}`);
    say(`            misurato uscita ${uscita}, categoria ${categoria ?? "nessuna"}`);
    fallimenti.push(caso.id);
  }
}

if (finteScritte) {
  // Solo i nomi che questo file ha scritto, uno per uno, e la directory che ha
  // creato. Mai una rimozione ricorsiva su un percorso costruito altrove.
  for (const nome of Object.keys(FINTE_CONTENUTI)) {
    rmSync(join(ROOT, FINTE, nome), { force: true });
  }
  rmSync(join(ROOT, FINTE), { force: true, recursive: true });
}

/* ── R15 e R16 — dichiarati rimandati invece che simulati ───────────────────
 *
 * **R15 — il rientro che rimette davvero una spunta.** Legge il registro,
 * risolve gli identificativi e scrive due colonne: ha bisogno di un database
 * davanti, e soprattutto **e' un atto**. Simularlo qui sarebbe la cosa peggiore
 * che questo file possa fare: farebbe credere esercitato l'unico percorso che
 * sta fra una corsa morta a meta' e la perdita dell'unico dato che nessun feed
 * sa ricostruire.
 *
 * **R16 — il rifiuto `unattended_state_at_risk` dell'importatore, da capo a
 * fondo.** Il predicato e' misurato da `U5`-`U11`; il **cablaggio** — che la
 * guardia giri prima di ogni scrittura, sulla stessa corsa vera — no, perche'
 * l'importatore rifiuta prima su `missing_feed_source` e su `missing_credential`,
 * che e' esattamente il contratto che `R3` protegge. Serve una sorgente
 * registrata e delle credenziali: non e' esercitabile qui.
 *
 * ── ⚠ ENTRAMBI SONO STATI ESERCITATI IL 2026-08-26, IN LABORATORIO ──────────
 *
 * Non da questo file, e non contro la produzione: in un progetto separato la cui
 * fedelta' e' stata misurata catalogo per catalogo (`lab-fidelity.mjs`, 10 su 10,
 * funzioni confrontate per firma). Il referto per esteso e' in `58-PROCEDURES.md`,
 * sezione *«Il rientro esercitato»*.
 *
 *   R16  uscita 2, categoria `unattended_state_at_risk`, ZERO scritture
 *        riconfermate dal catalogo
 *   R15  2 decisioni rimesse su 2 — di cui UN ANNULLAMENTO — con attore, nome e
 *        direzione dell'istante IDENTICI all'istantanea, confrontati campo per
 *        campo; l'istante e' l'ORIGINALE e non l'ora del rientro
 *
 * **Restano `rimandati` qui, e non e' una formalita'.** Cio' che e' stato provato
 * e' che il CODICE fa quello che dice; cio' che resta non provato e' che lo faccia
 * contro il catalogo di produzione, che ha una storia di migration propria. La
 * fedelta' misurata e' quella dello SCHEMA, non quella dei DATI — e
 * `MIRROR_RESTORE_PATH_VERIFIED` resta `false` per la stessa ragione: metterlo a
 * `true` disarma una guardia, cioe' rende PIU' FACILE far scattare un percorso
 * che cancella, e quella e' una decisione del proprietario.
 */

rimandati.push({
  id: "R15",
  requisito: "voce 3, punto 1 · P-58-C passo 5",
  etichetta: "il rientro rimette davvero una spunta, con l'attore e l'istante originali",
  atteso:
    "l'attore e l'istante ORIGINALI riletti DAL CATALOGO, e zero righe toccate fuori dalle due colonne",
  dove: "la produzione — ESERCITATO in laboratorio il 2026-08-26",
  ragione:
    "in laboratorio ha rimesso 2 decisioni su 2, di cui 1 ANNULLAMENTO, con attore e istante " +
    "originali; contro il catalogo di produzione non e' stato provato, e la fedelta' misurata " +
    "e' quella dello schema, non quella dei dati",
});

rimandati.push({
  id: "R16",
  requisito: "voce 3, punto 2",
  etichetta: "l'importatore rifiuta per la guardia della corsa non presidiata",
  atteso: "uscita 2, categoria unattended_state_at_risk, zero scritture",
  dove: "la produzione — ESERCITATO in laboratorio il 2026-08-26",
  ragione:
    "in laboratorio, con sorgente registrata e credenziali vere: uscita 2, categoria " +
    "unattended_state_at_risk, zero scritture riconfermate DAL CATALOGO",
});

for (const r of rimandati.slice(1)) {
  say("");
  say(`    – ${r.id}  ${r.etichetta}`);
  say(`            RIMANDATO a ${r.dove} — ${r.ragione}`);
  say(`            atteso la': ${r.atteso}`);
}

/* ────────────────────────────────────────────────────────────────────────────
 * Il referto
 * ──────────────────────────────────────────────────────────────────────────── */

say("");

if (fallimenti.length === 0) {
  say(`  MIRROR_GUARDS_OK — ogni caso esercitabile e' come dichiarato.`);
  say(`  ${rimandati.length} caso/i rimandato/i e dichiarato/i: ${rimandati.map((r) => `${r.id}→${r.dove}`).join(", ")}.`);
  say("  Dice che queste strade non portano a una scrittura e che i due predicati");
  say("  rispondono come dichiarato. NON dice che un rientro funzioni contro la");
  say("  PRODUZIONE: rimettere davvero una riga e' un atto, ed e' stato esercitato");
  say("  in LABORATORIO il 2026-08-26 — 2 decisioni su 2, di cui un annullamento,");
  say("  con attore e istante originali. La fedelta' misurata li' e' quella dello");
  say("  schema e non quella dei dati, quindi la guardia della corsa non presidiata");
  say("  resta armata: disarmarla e' una decisione, non la conseguenza di un");
  say("  esercizio riuscito.");
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
