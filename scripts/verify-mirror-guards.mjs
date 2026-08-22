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
 *   3. il predicato puro della guardia della corsa NON PRESIDIATA — `U0`-`U11`
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
 * ⚠ **E non dice affatto che un rientro funzioni.** Il percorso di ripristino
 * esiste da oggi e i suoi rifiuti sono misurati qui; **rimettere davvero una
 * spunta non lo e'**, perche' richiede un database davanti ed e' **un atto** —
 * scrive righe di produzione e ha bisogno di un'autorizzazione datata propria.
 * Finche' quell'esercizio non e' avvenuto, `MIRROR_RESTORE_PATH_VERIFIED` vale
 * `false` e la guardia della famiglia 3 resta armata. Un verde qui non la
 * disarma e non deve poterlo fare.
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
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
 *       ticksAtRisk,           // number — le spunte dentro lo scopo
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
 * lista delle spunte porta il nome di una persona.
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
        ticksAtRisk: 1,
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
        ticksAtRisk: 0,
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
        ticksAtRisk: 0,
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
        ticksAtRisk: 7,
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
        ticksAtRisk: 7,
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
        ticksAtRisk: Number.NaN,
        linksAtRisk: 0,
        restorePathVerified: false,
      },
      atteso: "unattended_state_at_risk",
    },
    {
      id: "U11",
      etichetta: "con il valore SPEDITO della costante: una spunta e nessuno che guarda",
      input: {
        supervision: "unattended",
        ticksAtRisk: 1,
        linksAtRisk: 0,
        restorePathVerified: MIRROR_RESTORE_PATH_VERIFIED,
      },
      atteso: "unattended_state_at_risk",
    },
  ];

  say("");
  say(
    `    rientro esercitato, valore spedito: ${MIRROR_RESTORE_PATH_VERIFIED ? "si'" : "NO"} — ` +
      "finche' e' no la guardia resta armata"
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
 * davanti, e soprattutto **e' un atto**. Esercitarlo scrive righe di produzione e
 * pretende un'autorizzazione datata propria, che al 2026-08-22 non esiste.
 * Simularlo sarebbe la cosa peggiore che questo file possa fare: farebbe credere
 * esercitato l'unico percorso che sta fra una corsa morta a meta' e la perdita
 * dell'unico dato che nessun feed sa ricostruire.
 *
 * **R16 — il rifiuto `unattended_state_at_risk` dell'importatore, da capo a
 * fondo.** Il predicato e' misurato da `U5`-`U11`; il **cablaggio** — che la
 * guardia giri prima di ogni scrittura, sulla stessa corsa vera — no, perche'
 * l'importatore rifiuta prima su `missing_feed_source` e su `missing_credential`,
 * che e' esattamente il contratto che `R3` protegge. Serve una sorgente
 * registrata e delle credenziali: non e' esercitabile qui.
 */

rimandati.push({
  id: "R15",
  requisito: "voce 3, punto 1 · P-58-C passo 5",
  etichetta: "il rientro rimette davvero una spunta, con l'attore e l'istante originali",
  atteso:
    "l'attore e l'istante ORIGINALI riletti DAL CATALOGO, e zero righe toccate fuori dalle due colonne",
  dove: "un esercizio datato, con la sua autorizzazione",
  ragione: "scrive righe di produzione: e' un atto, e non ne esiste l'autorizzazione",
});

rimandati.push({
  id: "R16",
  requisito: "voce 3, punto 2",
  etichetta: "l'importatore rifiuta per la guardia della corsa non presidiata",
  atteso: "uscita 2, categoria unattended_state_at_risk, zero scritture",
  dove: "una corsa con sorgente registrata e credenziali",
  ragione: "l'importatore rifiuta prima su sorgente e credenziali — ed e' il contratto di R3",
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
  say("  rispondono come dichiarato. NON dice che un rientro funzioni: rimettere");
  say("  davvero una spunta e' un atto, non e' mai stato eseguito, ed e' per questo");
  say("  che la guardia della corsa non presidiata resta armata.");
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
