/**
 * verify-ics-grammar — la grammatica dei titoli, misurata su titoli costruiti qui
 *
 * QUELLO CHE ASSERISCE, in una frase: **date queste forme di titolo e questa
 * mappa alias, il lettore del calendario le classifica cosi'** — e dove non lo
 * fa, il referto dice in quale dei due versi ha sbagliato.
 *
 * ── PERCHE' ESISTE, e perche' non e' un doppione di `verify:ics` ─────────────
 *
 * `verify:ics` misura il file vero. E' la misura giusta, e proprio per questo
 * sta in `NEEDS_MATERIAL` di `scripts/verify-all.mjs`: legge una directory
 * ignorata da git, che esiste sulla macchina del proprietario e da nessun'altra
 * parte, quindi rifiuterebbe ovunque. Un gate che rifiuta ovunque e' un gate che
 * non viene letto.
 *
 * Questo file misura **la stessa domanda senza chiedere materiale**: i titoli, i
 * giorni, gli alias, le notti e le regole di pipeline sono **costruiti qui
 * dentro**, con parole gia' pubbliche. Non apre nessuna directory di materiale,
 * non apre nessun database, non costruisce nessun `Date`. Gira su qualunque
 * macchina e dice sempre la stessa cosa.
 *
 * ── ⚠ I CASI SONO SINTETICI, E LO SONO PER RISERVATEZZA ─────────────────────
 *
 * Il repository e' pubblico e un commit e' una pubblicazione, che e'
 * irreversibile. Quindi in questo file possono comparire soltanto parole **gia'
 * pubbliche**: le sigle dei format (`RSNT`, `RMDB`, `MTNLB`), il brand
 * `re:sonate` con la e normale, i nomi dei format (`RamaDub`, `MotionLab`), i
 * due locali gia' in rotazione e il club che ospita la serie di Nizza — tutti
 * gia' nominati in `.claude/rules/production-calendar.md`.
 *
 * **Nessuna data reale.** I giorni qui sotto stanno nel 2031 e nel 2032: sono
 * scelti per il loro **giorno della settimana**, che e' l'unica cosa che la
 * pipeline guarda (`production-calendar.md`, *la pipeline si esprime in giorni
 * della settimana, non in offset*). Una data del calendario vero e' una data non
 * annunciata, e questo file non ne porta nessuna.
 *
 * **Nessuno spazio in trattativa.** La sede di MotionLab non e' acquisita e non
 * si nomina: dove serve una parola che la mappa alias non risolve, il file usa
 * la parola `Segnaposto`, che non e' un luogo.
 *
 * ── ESITI ───────────────────────────────────────────────────────────────────
 *
 *   0  ogni caso e' `ok`
 *   1  FALLIMENTO — almeno un caso e' `MISSED` o `GUESSED`
 *
 * **Non esce mai 2, e la ragione e' che non ha precondizioni.** Non legge una
 * directory di materiale, non chiede credenziali, non apre una connessione:
 * costruisce i propri dati. Un controllo senza precondizioni che uscisse
 * «rifiutato» sarebbe un posto in cui un difetto si nasconde — e' la stessa
 * frase che porta `scripts/verify-ics-reachable.mjs`, per la stessa ragione.
 *
 * ── I DUE VERSI DELL'ERRORE, CHE NON SONO LO STESSO ERRORE ──────────────────
 *
 * Un verdetto generico «diverso da quanto atteso» nasconde quale dei due
 * problemi si ha davanti, e i due chiedono riparazioni opposte:
 *
 *   MISSED   il lettore ha attribuito **meno** di quanto doveva: una voce che
 *            doveva diventare un pezzo, una notte o un aggancio resta non
 *            classificata — o peggio, diventa in silenzio *un giorno occupato da
 *            qualcun altro*. E' il difetto misurato da `58-RESEARCH.md`: 31 voci
 *            non classificate e due parole che finiscono fra i `commitment`
 *            senza che nessun conteggio lo dica.
 *
 *   GUESSED  il lettore ha attribuito **piu'** di quanto doveva: una serie, un
 *            progressivo o una serata che il titolo non portava. E' il piu'
 *            grave dei due. La riga di `INCLUSION_RULE` che si chiude su
 *            *«never guessed onto the nearest series»* lo vieta per nome, e
 *            quella che si chiude su *«a progressivo is a monotone guard»* dice
 *            perche': una volta assegnato, e' gia' su una locandina.
 *
 *            **Le righe si citano per il loro testo e non per il loro
 *            numero**, dal 2026-08-20: `ICS-04` ne ha inserita una in mezzo
 *            all'elenco e i tre riferimenti «riga 4» di questo file puntavano
 *            gia' altrove. Un rimando che scorre in silenzio e' peggio di
 *            nessun rimando — manda a leggere la regola sbagliata credendo di
 *            aver controllato.
 *
 * Il conteggio finale e' **per verso**, mai un totale unico.
 *
 * ── ⚠ IL CONTRATTO CHE QUESTO GATE FISSA PER I PIANI A VALLE ────────────────
 *
 * Il gate e' scritto **prima** del codice che deve misurare (piani 58-03 e
 * 58-06), quindi i nomi e le firme che usa **sono il contratto**, non una
 * supposizione su come qualcuno lo scrivera'.
 *
 *   1. `classifyEntry(event, aliases)` — invariata nella firma. Cambia cosa
 *      restituisce sulle forme di `ICS-04`, `ICS-08` e `ICS-08b`.
 *
 *   2. `ClassifiedPiece.number` e `ClassifiedPiece.seriesCode` diventano
 *      **nullabili**: un `Listing - re:sonate` porta la serie e non il numero, e
 *      un `Timetable` nudo non porta ne' l'una ne' l'altro. Dove il numero manca,
 *      **manca anche la chiave**: una chiave costruita su un numero assente e'
 *      la stringa che nessuno deve poter produrre.
 *
 *   3. La seconda passata di `ICS-05` e' una funzione **pura**, esportata dal
 *      barrel `src/lib/production/ics/index.ts`:
 *
 *          attachNumberlessPieces({
 *            pieces,                // ClassifiedPiece[] — si esaminano quelli senza numero
 *            nights,                // ClassifiedNight[]
 *            pipelines,             // SeriesPipeline[]
 *            creditedArtistCounts,  // ReadonlyMap<string, number>
 *          }) => {
 *            attached:     { uid: string, key: string }[],   // key = joinKey della notte
 *            unclassified: { uid: string, reason: string }[] // no_candidate_edition
 *          }                                                 // several_candidate_editions
 *
 *      Pura perche' l'aggancio e' una domanda sui dati e non sul database:
 *      `reconcile()` la chiama, e questo gate la chiama senza costruire una
 *      istantanea. Un pezzo **senza serie** — il `Timetable` nudo di D-58-03 —
 *      ha come candidate le notti delle serie che possiedono una regola del suo
 *      tipo; un pezzo il cui tipo non ha regola — il `Flyering` di D-58-04 —
 *      non si aggancia e **non e' un errore**: resta un pezzo orfano.
 *
 *   4. Tre esiti, mai due: **una** candidata aggancia; **zero** candidate danno
 *      `no_candidate_edition`; **piu' di una** danno `several_candidate_editions`.
 *      Mai «la piu' vicina».
 *
 * ── COSA NON DICE ───────────────────────────────────────────────────────────
 *
 * Che il calendario vero si legga bene. Dice che **queste** forme si leggono
 * cosi'. I numeri sul file vero li misura `verify:ics`, sulla macchina che ha il
 * materiale, e vanno **rimisurati** dopo ogni cambio di grammatica — mai
 * aggiustati per far passare un gate.
 */

import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { registerHooks } from "node:module";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ICS_DIR = join(ROOT, "src", "lib", "production", "ics");

const say = (l) => console.log(l);

say("");
say("verify-ics-grammar — la grammatica dei titoli, su casi costruiti nel file");
say("");

/* ────────────────────────────────────────────────────────────────────────────
 * Il caricamento dei moduli TypeScript in Node
 *
 * Lo stesso blocco di `scripts/verify-ics-reachable.mjs` e di
 * `scripts/verify-ics-import.mjs`: aggiunge `.ts` a uno specificatore relativo
 * che nomina un file esistente. Non cambia cosa fanno i moduli, cambia come
 * vengono trovati — ed e' l'unica cosa che permette di esercitare lo stesso
 * codice che l'import esercita.
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

let ics;
try {
  ics = await import(pathToFileURL(join(ICS_DIR, "index.ts")).href);
} catch (error) {
  say(`  ✗ il barrel del lettore non si importa: ${error.message}`);
  say("");
  say("  ICS_GRAMMAR_FAILED — nessun caso e' stato misurato perche' il modulo che");
  say("  li deve leggere non si carica. Non e' un rifiuto: questo gate non ha");
  say("  precondizioni, e un modulo che non si importa e' un fallimento.");
  say("");
  process.exit(1);
}

const { classifyEntry, joinKey } = ics;
const attachNumberlessPieces = ics.attachNumberlessPieces ?? null;

/* ────────────────────────────────────────────────────────────────────────────
 * La mappa alias — un argomento, mai un letterale del modulo
 *
 * `classify.ts` dichiara nel proprio docblock che la mappa **non e' mai un
 * letterale in quel file**, perche' i suoi valori sono parole per spazi e una
 * parola per uno spazio non acquisito non puo' stare in un repository pubblico.
 * Qui la mappa e' costruita perche' un gate deve pur passarne una — e porta
 * **solo** parole gia' pubbliche: i due locali gia' in rotazione, il club che
 * ospita la serie di Nizza, il brand e il nome di un format.
 * ──────────────────────────────────────────────────────────────────────────── */

const ALIAS = new Map([
  ["re:sonate", "RSNT"],
  ["booze", "RMDB-BZ"],
  ["muro", "RMDB-MR"],
  ["perlone", "RSNT-PRLN"],
  ["motionlab", "MTNLB"],
]);

/* ────────────────────────────────────────────────────────────────────────────
 * I costruttori dei dati sintetici
 * ──────────────────────────────────────────────────────────────────────────── */

let contatoreUid = 0;

/**
 * Un record gia' validato dal parser: date civili, titolo con gli escape
 * risolti. Nessun `Date` viene costruito, qui come nei moduli.
 */
function evento(
  titolo,
  giorno,
  { inizio = "11:00", fine = "11:30", minuti = 30, giornoFine = giorno, nota = "" } = {}
) {
  contatoreUid += 1;
  return {
    uid: `sintetico-${contatoreUid}`,
    summary: titolo,
    // La nota. Vuota per difetto, perche' la stragrande maggioranza dei casi di
    // questo gate misura la grammatica del TITOLO e una nota vuota e' esattamente
    // cio' che quei casi vogliono dire: nessuna seconda dichiarazione. I casi che
    // misurano la nota la passano, e la passano **inventata**, come tutto il resto
    // dei dati sintetici qui — nessun valore di questo file viene dal calendario.
    description: nota,
    startDate: giorno,
    startTime: inizio,
    endDate: giornoFine,
    endTime: fine,
    durationMinutes: minuti,
    sequence: null,
    lastModified: null,
    rrule: null,
    tzid: null,
  };
}

/** Una serata: blocco serale e lungo, cosi' che nessun avviso di durata scatti. */
function serata(titolo, giorno) {
  return evento(titolo, giorno, { inizio: "18:00", fine: "22:00", minuti: 240 });
}

/** Una regola di pipeline, nella forma che `production_pipeline_rule` memorizza. */
function regola(kind, { ancora = "self", giorno = null, direzione = "on", derivabile = true } = {}) {
  return {
    kind,
    rule: {
      anchorKind: ancora,
      anchorWeekday: giorno,
      anchorDirection: direzione,
      derivable: derivabile,
      episodesFromLineup: false,
      episodeCount: 1,
    },
  };
}

/** Cio' che una serie deve, nella forma che `reconcile.ts` riceve. */
function pipeline(seriesCode, regole) {
  return { seriesCode, requiresSpaceApproval: false, rules: regole };
}

/**
 * L'attesa di un aggancio, con la chiave costruita da `joinKey` e non scritta a
 * mano: cosi' il caso asserisce anche la **forma** della chiave, che e' l'unica
 * cosa su cui il join fra una notte e i suoi pezzi si regge.
 */
function attacco(seriesCode, numero) {
  return `attach:${joinKey(seriesCode, numero)}`;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Il verdetto, su due versi
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Quanto una lettura **attribuisce** a noi, in ordine crescente.
 *
 * L'ordine e' il contenuto del verdetto: sotto l'atteso si e' letto meno del
 * dovuto (MISSED), sopra si e' attribuito piu' del dovuto (GUESSED).
 */
const RANGHI = { commitment: 0, unclassified: 1, piece: 2, night: 2, attach: 3 };

function rango(descrittore) {
  return RANGHI[descrittore.split(":")[0]] ?? 0;
}

/**
 * `ok`, `MISSED` o `GUESSED`. Totale per costruzione, e mai un generico
 * «diverso»: dove il rango coincide, decide se la lettura ha attribuito una
 * serie o un progressivo che l'attesa non porta.
 */
function verdettoDi(atteso, misurato) {
  const serieAttesa = atteso.serie === undefined ? misurato.serie : atteso.serie;
  const numeroAtteso = atteso.numero === undefined ? misurato.numero : atteso.numero;

  if (
    atteso.descrittore === misurato.descrittore &&
    serieAttesa === misurato.serie &&
    numeroAtteso === misurato.numero
  ) {
    return "ok";
  }

  const rangoAtteso = rango(atteso.descrittore);
  const rangoMisurato = rango(misurato.descrittore);
  if (rangoMisurato > rangoAtteso) return "GUESSED";
  if (rangoMisurato < rangoAtteso) return "MISSED";

  // Stesso rango: e' GUESSED se la lettura porta una serie o un numero che
  // l'attesa non le riconosce — e' l'attribuzione che INCLUSION_RULE vieta
  // dicendo *«never guessed onto the nearest series»*, con o senza un salto di
  // classe.
  if (serieAttesa === null && misurato.serie !== null) return "GUESSED";
  if (numeroAtteso === null && misurato.numero !== null) return "GUESSED";
  if (serieAttesa !== null && misurato.serie !== null && serieAttesa !== misurato.serie) {
    return "GUESSED";
  }
  if (numeroAtteso !== null && misurato.numero !== null && numeroAtteso !== misurato.numero) {
    return "GUESSED";
  }
  return "MISSED";
}

/** La lettura di una voce, ridotta alle tre cose che il verdetto confronta. */
function letturaDi(voce) {
  if (voce.entryClass === "piece") {
    return {
      descrittore: `piece:${voce.kind}`,
      serie: voce.seriesCode ?? null,
      numero: voce.number ?? null,
    };
  }
  if (voce.entryClass === "night") {
    return { descrittore: "night", serie: voce.seriesCode ?? null, numero: voce.number ?? null };
  }
  if (voce.entryClass === "unclassified") {
    return { descrittore: `unclassified:${voce.reason}`, serie: null, numero: null };
  }
  return { descrittore: "commitment", serie: null, numero: null };
}

function descrizione(lettura) {
  const coda = [];
  if (lettura.serie !== null) coda.push(lettura.serie);
  if (lettura.numero !== null) coda.push(String(lettura.numero));
  return coda.length === 0 ? lettura.descrittore : `${lettura.descrittore} (${coda.join(" ")})`;
}

const esiti = [];

function registra(caso, misurato, nota = null) {
  const atteso = {
    descrittore: caso.attesa,
    serie: caso.serie,
    numero: caso.numero,
  };
  const verdetto = verdettoDi(atteso, misurato);
  esiti.push({ ...caso, misurato, verdetto, nota });
}

/* ────────────────────────────────────────────────────────────────────────────
 * FAMIGLIA A — una lettura sola: `classifyEntry`
 * ──────────────────────────────────────────────────────────────────────────── */

const FAMIGLIA_A = [
  /* ── le controprove: oggi sono verdi, e devono restarci ──────────────────
   *
   * Se una di queste va rossa, la riparazione ha rotto cio' che funzionava. Ed
   * e' la meta' del gate che nessuno pensa a scrivere: un controllo che misura
   * solo cio' che manca non si accorge di cio' che si e' perso per strada.
   */
  {
    id: "C1",
    requisito: "controprova",
    etichetta: "grammatica canonica, sigla e numero nel titolo",
    titolo: "Listing - RSNT-002",
    giorno: "2031-03-04",
    attesa: "piece:listing",
    serie: "RSNT",
    numero: 2,
  },
  {
    id: "C2",
    requisito: "controprova",
    etichetta: "grammatica canonica con il marcatore di parte",
    titolo: "LiveCut - RSNT-007 - PT1",
    giorno: "2031-03-18",
    attesa: "piece:livecut",
    serie: "RSNT",
    numero: 7,
  },
  {
    id: "C3",
    requisito: "controprova",
    etichetta: "una notte nella forma <Parola> x <Parola> <NNN>",
    titolo: "RamaDub x Booze 001",
    giorno: "2031-01-09",
    serata: true,
    attesa: "night",
    serie: "RMDB-BZ",
    numero: 1,
  },
  {
    id: "C4",
    requisito: "controprova",
    etichetta: "nessun alias la reclama e nessun tipo: e' il giorno di qualcun altro",
    titolo: "Appuntamento",
    giorno: "2031-01-12",
    attesa: "commitment",
    serie: null,
    numero: null,
  },
  {
    id: "C5",
    requisito: "controprova",
    etichetta: "forma inequivocabile di notte, parola che l'alias non risolve",
    titolo: "RamaDub x Segnaposto 001",
    giorno: "2031-01-16",
    serata: true,
    attesa: "unclassified:alias_unresolved",
    serie: null,
    numero: null,
  },

  /* ── ICS-04 — le quattro forme che oggi cadono su un ramo solo ────────────
   *
   * Tutte e quattro escono da `readSeriesAndNumber`, che non trova un trattino
   * nel secondo segmento e restituisce `null`. Il ramo che segue le manda su
   * `kind_without_series_and_number`. Sono 31 voci del file vero, misurate.
   *
   * L'attesa: il tipo dal primo segmento, la **serie dalla mappa alias** letta
   * sul secondo, e **nessun numero** — che il titolo non porta e che nessuno
   * puo' inventare.
   */
  {
    id: "G1",
    requisito: "ICS-04",
    etichetta: "nome del format, nessun locale",
    titolo: "Listing - re:sonate",
    giorno: "2031-03-04",
    attesa: "piece:listing",
    serie: "RSNT",
    numero: null,
  },
  {
    id: "G2",
    requisito: "ICS-04",
    etichetta: "nome del format, parola di giunzione, locale",
    titolo: "Listing - RamaDub x Booze",
    giorno: "2031-01-07",
    attesa: "piece:listing",
    serie: "RMDB-BZ",
    numero: null,
  },
  {
    id: "G3",
    requisito: "ICS-04",
    etichetta: "un tipo diverso, stessa forma di nome",
    titolo: "Tonight - RamaDub x Booze",
    giorno: "2031-01-09",
    attesa: "piece:tonight",
    serie: "RMDB-BZ",
    numero: null,
  },
  {
    id: "G4",
    requisito: "ICS-04",
    etichetta: "la serie di Nizza, che ha numerazione propria",
    titolo: "Listing - re:sonate x Perlone",
    giorno: "2031-04-01",
    attesa: "piece:listing",
    serie: "RSNT-PRLN",
    numero: null,
  },

  /* ── ICS-04, il rifiuto che va conservato ─────────────────────────────────
   *
   * La lettura nuova non deve trasformare *«non so»* in *«la serie piu'
   * vicina»*. Un secondo segmento in forma di nome la cui parola l'alias non
   * risolve resta `alias_unresolved`, che ha gia' il proprio canale di
   * segnalazione — `ClassificationResult.aliasUnresolved`.
   */
  {
    id: "G5",
    requisito: "ICS-04",
    etichetta: "nome in forma nostra, alias non dichiarato: si rifiuta, non si indovina",
    titolo: "Listing - RamaDub x Segnaposto",
    giorno: "2031-01-21",
    attesa: "unclassified:alias_unresolved",
    serie: null,
    numero: null,
  },
];

/* ────────────────────────────────────────────────────────────────────────────
 * FAMIGLIA B — due letture: `classifyEntry`, poi la seconda passata
 *
 * Ogni scenario porta le proprie notti e le proprie regole. I giorni sono scelti
 * per il loro giorno della settimana e stanno in anni che il calendario vero non
 * ha ancora: 2031-01-09 e' un giovedi', 2031-03-15 un sabato, 2031-05-17 un
 * sabato. La regola del listing e' `self / martedi' / before`, che e' quella
 * misurata; la regola della timetable e' `self / — / on`, cioe' il giorno stesso
 * della serata.
 * ──────────────────────────────────────────────────────────────────────────── */

const REGOLA_LISTING = regola("listing", { giorno: 2, direzione: "before" });
const REGOLA_LISTING_NON_DERIVABILE = regola("listing", {
  giorno: 2,
  direzione: "before",
  derivabile: false,
});
const REGOLA_TIMETABLE = regola("timetable", { giorno: null, direzione: "on" });

const FAMIGLIA_B = [
  {
    id: "A1",
    requisito: "ICS-05",
    etichetta: "una sola candidata: si aggancia",
    notti: [
      ["RamaDub x Booze 001", "2031-01-09"],
      ["RamaDub x Booze 002", "2031-01-23"],
    ],
    pipelines: [pipeline("RMDB-BZ", [REGOLA_LISTING])],
    titolo: "Listing - RamaDub x Booze",
    giorno: "2031-01-07",
    attesa: attacco("RMDB-BZ", 1),
    serie: undefined,
    numero: undefined,
  },
  {
    id: "A2",
    requisito: "ICS-05",
    etichetta: "nessuna candidata: si dichiara, non si avvicina",
    notti: [["RamaDub x Muro 001", "2031-02-06"]],
    pipelines: [pipeline("RMDB-MR", [REGOLA_LISTING])],
    titolo: "Listing - RamaDub x Muro",
    giorno: "2031-01-14",
    attesa: "unclassified:no_candidate_edition",
    serie: null,
    numero: null,
  },
  {
    id: "A3",
    requisito: "ICS-05",
    etichetta: "due candidate della stessa serie: ambiguita', mai la piu' vicina",
    notti: [
      ["RamaDub x Muro 001", "2031-01-09"],
      ["RamaDub x Muro 002", "2031-01-10"],
    ],
    pipelines: [pipeline("RMDB-MR", [REGOLA_LISTING])],
    titolo: "Listing - RamaDub x Muro",
    giorno: "2031-01-07",
    attesa: "unclassified:several_candidate_editions",
    serie: null,
    numero: null,
  },
  {
    /*
     * L'asimmetria di ICS-05, e il caso che la misura.
     *
     * `derivable: false` risponde a *«posso PROPORRE una data?»*, e per il
     * listing della notte non ha risposta: l'anticipo va da una a due settimane
     * e mezzo, quindi molti martedi' sono candidati e nessun criterio sceglie.
     * `ICS-05` fa la domanda **inversa** — *«dato questo martedi', a quale
     * serata appartiene?»* — e li' la direzione dichiarata (`before`, cioe' la
     * serata segue il listing) piu' la distanza fra le notti di quella serie
     * rendono la candidata unica.
     *
     * Sono 9 delle 31 voci. Un piano che leggesse `derivable` come governo
     * dell'aggancio le dichiarerebbe irrisolvibili.
     */
    id: "A4",
    requisito: "ICS-05",
    etichetta: "derivable falso e cio' nonostante si aggancia",
    notti: [["re:sonate 002", "2031-03-15"]],
    pipelines: [pipeline("RSNT", [REGOLA_LISTING_NON_DERIVABILE])],
    titolo: "Listing - re:sonate",
    giorno: "2031-03-04",
    attesa: attacco("RSNT", 2),
    serie: undefined,
    numero: undefined,
  },
  {
    /*
     * La finestra massima. Qui la distanza e' di oltre trecento giorni, cioe'
     * fuori da qualunque finestra che quel calendario possa produrre — le notti
     * di quella serie distano fra uno e tre mesi. Il caso asserisce il
     * **rifiuto**, non un numero, e continua a non asserirne uno.
     *
     * *(Aggiornamento del 2026-08-20, piano 58-03: la finestra di questa coppia
     * e' stata misurata e vale diciotto giorni — `anchors.ts`, che ne porta
     * data, fonte e metodo. A4 sta a undici giorni e si aggancia, questo a
     * oltre trecento e viene rifiutato. Il numero **non** e' scritto qui: un
     * caso che ripetesse la soglia diventerebbe un secondo posto dove
     * cambiarla.)*
     */
    id: "A5",
    requisito: "ICS-05",
    etichetta: "candidata unica ma lontanissima: fuori finestra, quindi nessuna",
    notti: [["re:sonate 003", "2032-01-10"]],
    pipelines: [pipeline("RSNT", [REGOLA_LISTING_NON_DERIVABILE])],
    titolo: "Listing - re:sonate",
    giorno: "2031-03-04",
    attesa: "unclassified:no_candidate_edition",
    serie: null,
    numero: null,
  },
  {
    /*
     * ICS-08 / D-58-03. `Timetable` nudo non porta ne' serie ne' numero, e oggi
     * diventa un `commitment` — cioe' *un giorno occupato da qualcun altro*, in
     * silenzio e senza alcun conteggio che lo dica. La sua regola esiste gia':
     * `self / — / on`, il giorno stesso della serata. Quindi l'aggancio e'
     * esatto, e le candidate sono le notti delle serie che possiedono una regola
     * di quel tipo.
     */
    id: "T1",
    requisito: "ICS-08",
    etichetta: "Timetable nudo, con la serata di quel giorno",
    notti: [["re:sonate 004", "2031-05-17"]],
    pipelines: [pipeline("RSNT", [REGOLA_TIMETABLE])],
    titolo: "Timetable",
    giorno: "2031-05-17",
    attesa: attacco("RSNT", 4),
    serie: undefined,
    numero: undefined,
  },
  {
    id: "T2",
    requisito: "ICS-08",
    etichetta: "Timetable nudo, senza serata quel giorno: visibile, non silenzioso",
    notti: [["re:sonate 004", "2031-05-17"]],
    pipelines: [pipeline("RSNT", [REGOLA_TIMETABLE])],
    titolo: "Timetable",
    giorno: "2031-05-20",
    attesa: "unclassified:no_candidate_edition",
    serie: null,
    numero: null,
  },
  {
    /*
     * ICS-08b / D-58-04. Il volantinaggio diventa il settimo tipo, e **non ha
     * regola di ancora**: nessuno l'ha misurata e questa fase non ha il
     * materiale per farlo. Quindi non si aggancia — e non e' un errore. Resta un
     * pezzo orfano, che lo schema prevede, con la serie risolta dalla mappa
     * alias e senza numero. Mai un `commitment`.
     */
    id: "F1",
    requisito: "ICS-08b",
    etichetta: "Flyering: pezzo orfano, senza numero e senza aggancio",
    notti: [["re:sonate 004", "2031-05-17"]],
    pipelines: [pipeline("RSNT", [REGOLA_TIMETABLE])],
    titolo: "Flyering - re:sonate",
    giorno: "2031-05-13",
    attesa: "piece:flyering",
    serie: "RSNT",
    numero: null,
  },
];

/* ────────────────────────────────────────────────────────────────────────────
 * L'esecuzione
 * ──────────────────────────────────────────────────────────────────────────── */

for (const caso of FAMIGLIA_A) {
  const record = caso.serata ? serata(caso.titolo, caso.giorno) : evento(caso.titolo, caso.giorno);
  registra(caso, letturaDi(classifyEntry(record, ALIAS)));
}

for (const caso of FAMIGLIA_B) {
  const notti = caso.notti.map(([titolo, giorno]) => classifyEntry(serata(titolo, giorno), ALIAS));
  const nonNotti = notti.filter((n) => n.entryClass !== "night");
  if (nonNotti.length > 0) {
    // Le notti di uno scenario sono materiale di costruzione, non il caso: se
    // smettono di leggersi, l'esito del caso direbbe una cosa che non ha
    // misurato. Si dichiara, invece di essere assorbito.
    registra(caso, { descrittore: "commitment", serie: null, numero: null },
      `le notti dello scenario non si classificano piu' come notti (${nonNotti.length} su ${notti.length})`);
    continue;
  }

  const record = evento(caso.titolo, caso.giorno);
  const voce = classifyEntry(record, ALIAS);
  const lettura = letturaDi(voce);

  if (voce.entryClass !== "piece") {
    registra(caso, lettura, "la prima passata non produce un pezzo: la seconda non viene raggiunta");
    continue;
  }

  if (attachNumberlessPieces === null) {
    // Un caso finto che passa e' peggio di un caso assente: finche' il percorso
    // di aggancio non esiste, NESSUN caso di questa famiglia puo' dirsi `ok` —
    // nemmeno quello dell'orfano, il cui esito atteso e' «non agganciato».
    registra(caso, lettura,
      "attachNumberlessPieces non e' esportato dal barrel: la seconda passata non esiste ancora");
    continue;
  }

  const esito = attachNumberlessPieces({
    pieces: [voce],
    nights: notti,
    pipelines: caso.pipelines,
    creditedArtistCounts: new Map(),
  });

  const agganciato = (esito.attached ?? []).find((a) => a.uid === voce.uid);
  if (agganciato !== undefined) {
    registra(caso, { descrittore: `attach:${agganciato.key}`, serie: lettura.serie, numero: lettura.numero });
    continue;
  }

  const rifiutato = (esito.unclassified ?? []).find((u) => u.uid === voce.uid);
  if (rifiutato !== undefined) {
    registra(caso, { descrittore: `unclassified:${rifiutato.reason}`, serie: null, numero: null });
    continue;
  }

  registra(caso, lettura);
}

/* ────────────────────────────────────────────────────────────────────────────
 * Il referto
 * ──────────────────────────────────────────────────────────────────────────── */

const intestazione =
  `  ${"id".padEnd(5)}${"req".padEnd(13)}${"atteso".padEnd(46)}${"misurato".padEnd(46)}verdetto`;

say(`  ${FAMIGLIA_A.length} caso/i di grammatica, ${FAMIGLIA_B.length} di seconda passata. Nessuno apre materiale.`);
say("");
say(intestazione);
say(`  ${"─".repeat(intestazione.length)}`);

for (const esito of esiti) {
  const atteso = descrizione({
    descrittore: esito.attesa,
    serie: esito.serie ?? null,
    numero: esito.numero ?? null,
  });
  say(
    `  ${esito.id.padEnd(5)}${esito.requisito.padEnd(13)}` +
      `${atteso.padEnd(46)}${descrizione(esito.misurato).padEnd(46)}${esito.verdetto}`
  );
}

const mancati = esiti.filter((e) => e.verdetto === "MISSED");
const indovinati = esiti.filter((e) => e.verdetto === "GUESSED");

say("");

if (mancati.length === 0 && indovinati.length === 0) {
  say(`  ICS_GRAMMAR_OK — ${esiti.length} caso/i, tutti come dichiarato.`);
  say("  Dice che QUESTE forme si leggono cosi', NON che il calendario vero si legge");
  say("  bene: quello e' verify:ics, sulla macchina che ha il materiale.");
  say("");
  process.exit(0);
}

/* Il conteggio e' per verso, mai un totale unico: i due chiedono riparazioni
 * opposte, e un numero solo nasconde quale delle due serve. */

say(`  MISSED   ${mancati.length}  — letto meno del dovuto: il pezzo, la notte o l'aggancio non c'e'`);
for (const e of mancati) {
  say(`             ${e.id} (${e.requisito}) — ${e.etichetta}`);
  say(`               atteso ${e.attesa} · misurato ${descrizione(e.misurato)}`);
  if (e.nota !== null) say(`               ${e.nota}`);
}

say("");
say(`  GUESSED  ${indovinati.length}  — attribuito piu' del dovuto: una serie, un numero o una serata che il titolo non porta`);
for (const e of indovinati) {
  say(`             ${e.id} (${e.requisito}) — ${e.etichetta}`);
  say(`               atteso ${e.attesa} · misurato ${descrizione(e.misurato)}`);
  if (e.nota !== null) say(`               ${e.nota}`);
}

say("");
say(`  ICS_GRAMMAR_FAILED — ${mancati.length} MISSED, ${indovinati.length} GUESSED su ${esiti.length} caso/i.`);
say("  GUESSED e' il piu' grave dei due: un progressivo assegnato e' gia' su una");
say("  locandina, e INCLUSION_RULE vieta per nome l'attribuzione alla serie piu' vicina.");
say("");
process.exit(1);
