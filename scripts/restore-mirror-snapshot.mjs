/**
 * restore-mirror-snapshot — il passo 5 di `P-58-C`, che fino a oggi non aveva
 * uno strumento
 *
 * QUELLO CHE FA, in una frase: **rimette le due eccezioni di stato di `ICS-03`
 * — le spunte e i legami — leggendole da un'istantanea indicata per percorso,
 * con l'attore e l'istante ORIGINALI, e per chiave primaria.**
 *
 * ── PERCHE' ESISTE, E PERCHE' NON POTEVA PIU' ASPETTARE ─────────────────────
 *
 * Lo specchio cancella e riscrive. Fra la cancellazione e la riscrittura non
 * c'e' transazione, e questo progetto non ha point-in-time recovery. Quasi tutto
 * cio' che si perde in quel varco torna da solo: una notte, un pezzo, un impegno
 * e una voce di checklist sono tutti ricostruibili dal calendario, e la corsa
 * successiva li riscrive.
 *
 * **Una spunta no.** Il calendario non registra chi ha premuto una casella, e
 * nient'altro lo registra. Una spunta e' l'unico dato dell'intero sistema di
 * produzione che nessun feed sa ricostruire.
 *
 * La voce 3 delle differite aveva scritto la propria condizione d'innesco in
 * anticipo — *«il momento in cui lo strumento diventa necessario non e' la prima
 * corsa del cron: e' la prima spunta o il primo legame»* — e il 2026-08-20 la
 * prima spunta e' stata premuta, dentro lo scopo che uno specchio cancella.
 *
 * ── PERCHE' E' UNO SCRIPT A PARTE E NON UN ARGOMENTO DELL'IMPORTATORE ───────
 *
 * La voce 3 lo chiedeva come *«un argomento dell'importatore»*. E' uno strumento
 * separato, e la ragione e' di dominio, non di stile:
 *
 *   1. **L'importatore rifiuta se non c'e' una sorgente registrata** — e' il
 *      terzo passo del suo ordine dei rifiuti, misurato da `R3` in
 *      `verify-mirror-guards.mjs`. Un ripristino deve poter girare **quando la
 *      sorgente non risponde**, che e' fra le ragioni piu' probabili per cui una
 *      corsa e' morta a meta'. Metterlo li' dentro significherebbe o legare un
 *      rientro alla raggiungibilita' del feed, o bucare quell'ordine — e
 *      quell'ordine e' un contratto con un gate dietro.
 *   2. **Un ripristino non ha nulla da fare con il feed.** La difesa 1 di
 *      D-58-07 dice che il corpo del calendario non deve viaggiare piu' del
 *      necessario: dare a un rientro un lettore di calendari sarebbe
 *      un'esposizione in piu' che non serve a niente. Questo file **non legge
 *      alcuna sorgente remota** e non ne sa l'indirizzo.
 *   3. **Questo processo non contiene nessun `DELETE`.** Zero. Un ripristino che
 *      condivide il processo con un cancellatore e' a una distrazione di
 *      distanza dal cancellare.
 *
 * ── ⚠ UN RIPRISTINO NON E' UN ATTO ──────────────────────────────────────────
 *
 * E' la frase che `reconcile.ts` gia' usa e che questo file deve rendere vera
 * invece di dichiararla. In pratica significa tre cose, e ognuna e' una riga di
 * codice qui sotto:
 *
 *   * **mai `record_checklist_tick`.** Quella funzione ri-registra l'autore a
 *     ogni chiamata, per decisione dichiarata nella migration di accesso al
 *     calendario di produzione. Passare di li' attribuirebbe ogni spunta a chi
 *     lancia il rientro — cioe' cancellerebbe esattamente la cosa che stava
 *     salvando;
 *   * **`ticked_at`, `ticked_by` e `ticked_by_name` sono gli originali**, portati
 *     attraverso intatti. Mai adesso, mai chi esegue;
 *   * **non sovrascrive nessuna decisione presa DOPO lo schianto.** Una casella
 *     gia' spuntata al momento del rientro non viene toccata: quella spunta e'
 *     piu' recente dell'istantanea, e una persona l'ha premuta. Un legame gia'
 *     posato e diverso da quello dell'istantanea non viene toccato: e' un
 *     ritrovamento, e si riporta come numero.
 *
 * ── ⚠ PER CHIAVE PRIMARIA, E IL VERSO DELL'ERRORE E' IL PUNTO ───────────────
 *
 * Ogni scrittura di questo file e' un `UPDATE ... WHERE id = ‹uuid›`. Le
 * condizioni larghe — la chiave di calendario, `(plan_id, kind, label)` —
 * compaiono **solo dentro letture**, e servono a risolvere quell'`id`.
 *
 * `ai-engineering.md` porta il precedente per esteso: un selettore troppo largo
 * ha cancellato 63 righe in sette tabelle, in cascata, e il progetto non ha
 * PITR. *«Un selettore troppo largo cancella di piu' di quanto doveva; un
 * selettore per chiave primaria, se sbaglia, non trova nulla.»* Fra i due modi
 * di fallire ce n'e' uno solo compatibile con un rientro.
 *
 * ── ⚠ L'ORA DELL'ISTANTANEA SI VERIFICA, E IL NOME DEL FILE NON E' UN'ORA ───
 *
 * `P-58-C` passo 3: *«Un'istantanea piu' vecchia della corsa e' l'istantanea di
 * un altro giro, e ripristinare da quella riporta indietro spunte che nel
 * frattempo erano state tolte.»*
 *
 * Quindi l'istante si legge **dentro** l'istantanea, dal campo che il processo
 * che l'ha presa ha scritto, e mai dal nome del file: un nome si copia, si
 * rinomina, lo riscrive un archiviatore, e non e' una misura di niente.
 *
 * E si confronta con la corsa interrotta **letta dal registro**, non con un
 * istante digitato da chi esegue. Lo scrittore prende l'istantanea **prima** di
 * aprire la riga di corsa, quindi la relazione attesa e' stretta e ha un verso:
 * l'istantanea precede la corsa di pochi secondi. Fuori da quella finestra e'
 * l'istantanea di un altro giro.
 *
 * ⚠ **Un'istantanea senza il campo dell'ora e' un rifiuto, non un ripiego.**
 * Le istantanee scritte prima del 2026-08-22 non lo portano: per quelle questo
 * strumento si ferma, e si ferma dicendolo. Accettarle fidandosi del nome del
 * file sarebbe l'unica cosa che questo blocco vieta.
 *
 * ── ⚠ COSA NON ESCE DA QUI: IL CONTENUTO DELL'ISTANTANEA ────────────────────
 *
 * L'istantanea porta **il nome di una persona** (`ticked_by_name`), gli
 * identificativi del calendario, le parole di sede e le date. Il referto di
 * questo file porta **conteggi e categorie, e nient'altro** — nemmeno la chiave
 * di calendario, nemmeno l'ora dell'istantanea, nemmeno l'ora della corsa.
 *
 * E la claim e' **misurata**, non promessa: in coda gira un controllo che prende
 * ogni stringa dell'istantanea, la spezza in token, e asserisce che nessuno di
 * quei token compaia nel referto. Nessuna lista di esenzioni. Quando va rosso su
 * una coincidenza, la riparazione e' **dire meno** — mai allargare la regola.
 *
 * ⚠ **Il referto e' in italiano anche per questo.** E' la lingua di `P-58-C`,
 * che e' chi lo legge; ed e' una lingua diversa da quella del materiale, che e'
 * scritto in inglese britannico per decisione di `brand-visual-system.md`. Due
 * lingue diverse hanno meno modi di coincidere per caso.
 *
 * ── ⚠ QUESTO STRUMENTO NON E' STATO ESERCITATO ──────────────────────────────
 *
 * Al 2026-08-22 nessuna corsa di questo file ha mai rimesso una spunta vera.
 * `MIRROR_RESTORE_PATH_VERIFIED` in `src/lib/production/ics/guard.ts` vale
 * `false` per quel motivo, e la guardia della corsa non presidiata resta armata
 * finche' vale `false`. Esercitarlo **e' un atto**: scrive righe di produzione,
 * e ha bisogno di un'autorizzazione datata propria, che oggi non esiste.
 *
 * Un percorso di ripristino che nessuno ha mai visto funzionare vale esattamente
 * quanto un gate che nessuno ha mai visto andare rosso.
 *
 * ── ⚠ L'ORDINE DEI RIFIUTI E' UN CONTRATTO ─────────────────────────────────
 *
 * Come per l'importatore, e per la stessa ragione: con le credenziali davanti,
 * ogni caso qui sotto risponderebbe `missing_credential` e il gate misurerebbe
 * un'altra cosa.
 *
 *   1. gli argomenti          (uno che non esiste, o due che si contraddicono)
 *   2. il percorso            (assente → `missing_snapshot_path`; non ignorato
 *                              da git → `snapshot_path_not_ignored`)
 *   3. la chiave di calendario (assente → `missing_calendar_key`; fuori
 *                              vocabolario → `unknown_calendar_key`)
 *   4. l'istantanea stessa    (assente, illeggibile, forma ignota, senza ora,
 *                              incompleta, di un altro calendario)
 *   5. le credenziali
 *   6. il registro            (nessuna corsa interrotta, o piu' d'una)
 *   7. l'ora
 *
 * ⚠ E il file d'ambiente su disco si legge **dentro il passo 5**, mai in cima:
 * altrimenti l'esito dei passi 1-4 dipenderebbe da cosa c'e' sul disco di chi
 * lancia, e un controllo il cui esito dipende da quello non e' un controllo.
 *
 * ── ARGOMENTI ───────────────────────────────────────────────────────────────
 *
 *   `--from <percorso>` QUALE ISTANTENEA. Obbligatorio, nessun default. Deve
 *                       stare in un percorso che git conferma ignorato.
 *   `--calendar <key>`  QUALE CALENDARIO chi esegue crede di ripristinare.
 *                       Obbligatorio: l'istantanea porta la propria chiave, e le
 *                       due devono coincidere. Una dichiarazione che l'istantanea
 *                       puo' smentire vale piu' di un valore dedotto dal file.
 *   `--dry-run`         referta e non scrive niente. **IL DEFAULT.**
 *   `--apply`           esegue i due `UPDATE`. Va passato esplicitamente.
 *   `--help`
 *
 * ── USCITE ──────────────────────────────────────────────────────────────────
 *
 *   `0` completata e il controllo del referto e' pulito
 *   `1` FALLITA a meta' — cio' che era gia' stato scritto resta scritto e viene
 *       riportato — **oppure** e' arrivata in fondo e il controllo del referto ha
 *       trovato materiale
 *   `2` RIFIUTATA, e **nulla e' stato scritto**
 */

import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { registerHooks } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ICS_DIR = join(ROOT, "src", "lib", "production", "ics");

/**
 * La forma di file che questo lettore riconosce.
 *
 * Una costante, non un numero di versione da negoziare: quando la forma cambia
 * cambia questa parola, e un lettore che non la riconosce **si ferma** invece di
 * indovinare.
 *
 * ⚠ **Il valore non contiene nessuna parola che questo file stampa.** Il
 * controllo in coda confronta ogni stringa dell'istantanea con il referto, senza
 * esenzioni: un marcatore che condividesse una parola con una delle categorie di
 * rifiuto qui sotto farebbe andare rosso ogni rifiuto di quel gruppo — il
 * controllo che fallisce sul campo che questo stesso progetto ha scritto.
 * Misurato il 2026-08-22 con la grafia ovvia, che portava proprio la parola con
 * cui quelle categorie iniziano.
 */
/*
 * ⚠ **Il valore non si scrive piu' qui.** Lo scrittore e questo lettore devono
 * dire la stessa parola, e due copie di una parola sono due cose che divergono —
 * su un file che porta l'unica copia della decisione di una persona. La parola
 * vive in `src/lib/production/ics/reconcile.ts`, insieme al tipo che descrive
 * cosa quella lista contiene, e si legge da `ics` piu' sotto.
 *
 * **Le forme lette sono PIU' DI UNA, e non e' permissivita'.** La forma corrente
 * porta le decisioni in entrambe le direzioni; quella precedente portava le sole
 * spunte, sotto un altro nome di campo. Le istantanee gia' su disco sono la via
 * di ritorno delle corse morte prima del cambio: rifiutarle per avere un nome
 * piu' pulito costerebbe proprio la riga che nient'altro sa ricostruire.
 */

/**
 * Quanto puo' distare l'istantanea dall'apertura della corsa che ha
 * interrotto — **una politica, scelta e non misurata**, come la soglia della
 * guardia del feed.
 *
 * Lo scrittore prende l'istantanea e subito dopo apre la riga di corsa: nel
 * mezzo c'e' una scrittura su disco e un giro di rete. Sono secondi. Dieci
 * minuti e' largo abbastanza da coprire un disco lento e un giro andato male, e
 * stretto abbastanza che la corsa di un altro giorno non possa mai caderci
 * dentro.
 *
 * **Il verso dell'errore.** Troppo stretta rifiuta un'istantanea buona e costa
 * a una persona una serata; troppo larga accetta l'istantanea di un altro giro e
 * rimette spunte che qualcuno aveva tolto apposta. Sbaglia verso lo stretto.
 */
const FINESTRA_MS = 10 * 60 * 1000;

/* ────────────────────────────────────────────────────────────────────────────
 * Segreti e referto — la stessa forma dell'importatore, per la stessa ragione
 * ──────────────────────────────────────────────────────────────────────────── */

const SEGRETI = [];

function registraSegreto(valore) {
  if (typeof valore === "string" && valore.length >= 4) SEGRETI.push(valore);
}

function oscura(testo) {
  let out = String(testo);
  for (const segreto of SEGRETI) out = out.split(segreto).join("«oscurato»");
  return out;
}

const referto = [];

function di(riga = "") {
  const sicura = oscura(riga);
  referto.push(sicura);
  console.log(sicura);
}

/**
 * Vero quando l'istantanea e' stata letta — cioe' quando il controllo in coda
 * ha qualcosa contro cui misurare.
 *
 * Serve perche' **un rifiuto e' un'uscita come le altre**, e parecchi avvengono
 * dopo la lettura. Un controllo che girasse solo sulle due uscite felici sarebbe
 * assente proprio dalle uscite che qualcuno incolla in una segnalazione.
 */
let controlloPronto = false;

/** Un rifiuto. **Nulla e' stato scritto**, e la categoria e' parte della frase. */
function rifiuta(categoria, messaggio) {
  di("");
  di(`  RIFIUTATO [${categoria}] — ${oscura(messaggio)}`);
  di("");
  di("  NULLA E' STATO SCRITTO. Il rientro non e' avvenuto.");
  if (controlloPronto) controllaIlProprioReferto();
  di("");
  process.exit(2);
}

/**
 * Un fallimento a meta' delle scritture.
 *
 * Uscita 1: qualcosa era gia' stato scritto. Non si rilancia sperando: le righe
 * gia' rimesse sono rimesse, e una seconda corsa che le trovasse gia' a posto le
 * salterebbe — il che e' corretto — ma il ritrovamento e' il motivo per cui si e'
 * fermata, e va scritto nel referto di `P-58-C` passo 7.
 */
function fallisceAMeta(categoria, messaggio, scritte) {
  di("");
  di(`  FALLITO [${categoria}] — ${oscura(messaggio)}`);
  di("");
  di(`  ⚠ ${scritte} scrittura/e erano gia' andate a segno e RESTANO.`);
  di("    Non rilanciare per abitudine: quello che ha fermato questa corsa e' il");
  di("    ritrovamento, e va scritto nel referto del rientro.");
  if (controlloPronto) controllaIlProprioReferto();
  di("");
  process.exit(1);
}

/* ────────────────────────────────────────────────────────────────────────────
 * Passo 1 — gli argomenti, e il default e' quello sicuro
 * ──────────────────────────────────────────────────────────────────────────── */

function leggiArgomenti(argv) {
  const opzioni = { da: null, calendario: null, applica: false, giroAVuotoChiesto: false, aiuto: false };
  const ignoti = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--apply") opzioni.applica = true;
    else if (arg === "--dry-run") opzioni.giroAVuotoChiesto = true;
    else if (arg === "--help" || arg === "-h") opzioni.aiuto = true;
    else if (arg === "--from") {
      i += 1;
      opzioni.da = argv[i] ?? null;
    } else if (arg === "--from-run") {
      i += 1;
      opzioni.daCorsa = argv[i] ?? null;
    } else if (arg === "--calendar") {
      i += 1;
      opzioni.calendario = argv[i] ?? null;
    } else ignoti.push(arg);
  }

  return { opzioni, ignoti };
}

const { opzioni, ignoti } = leggiArgomenti(process.argv.slice(2));

di("");
di("rientro dello specchio — le due eccezioni di stato, in conteggi");
di("");

if (opzioni.aiuto) {
  di("  --from <percorso>  QUALE istantanea. OBBLIGATORIO, nessun default.");
  di("  --calendar <key>   QUALE calendario chi esegue crede di ripristinare.");
  di("                     OBBLIGATORIO: l'istantanea puo' smentirlo.");
  di("  --dry-run          referta e non scrive niente. IL DEFAULT.");
  di("  --apply            esegue le due riscritture. Va passato esplicitamente.");
  di("");
  di("  0 = completato · 1 = FALLITO a meta' · 2 = RIFIUTATO, nulla e' stato scritto.");
  di("");
  process.exit(0);
}

if (ignoti.length > 0) {
  rifiuta(
    "unknown_argument",
    `${ignoti.length} argomento/i che questo strumento non accetta. Rifiuta invece di ` +
      "ignorarli: un argomento scritto male e buttato via in silenzio e' una corsa la " +
      "cui modalita' non l'ha scelta nessuno."
  );
}

if (opzioni.applica && opzioni.giroAVuotoChiesto) {
  rifiuta(
    "ambiguous_mode",
    "--apply e --dry-run insieme. Quale dei due vinca dipenderebbe dall'ordine in cui " +
      "sono stati digitati, e un argomento il cui significato dipende da dove sta in " +
      "una riga e' un argomento che prima o poi scrive in produzione per sbaglio."
  );
}

if (opzioni.applica) {
  di("  MODO: --apply  ⚠ QUESTA CORSA RISCRIVE due colonne su due tabelle.");
} else {
  di("  MODO: giro a vuoto (il default). NON VERRA' SCRITTO NULLA.");
}
di("");

/* ────────────────────────────────────────────────────────────────────────────
 * Passo 2 — il percorso, e il posto in cui puo' stare
 *
 * ⚠ **Il controllo su git non protegge il file: il file esiste gia'.** Rifiuta
 * di **usare** una copia che sta dove lo scrittore si sarebbe rifiutato di
 * scriverla — e un'istantanea trovata in una directory tracciata non e' un
 * dettaglio di percorso: e' un ritrovamento, perche' quel file porta il nome di
 * una persona e questo repository e' pubblico.
 *
 * Si chiede a git, invece di leggere `.gitignore` e ragionarci: quella regola e'
 * di git, e due implementazioni della stessa regola divergono il giorno in cui
 * qualcuno aggiunge una negazione.
 * ──────────────────────────────────────────────────────────────────────────── */

const haPercorso = opzioni.da !== null && opzioni.da !== undefined && opzioni.da.trim() !== "";
const haCorsa =
  opzioni.daCorsa !== null && opzioni.daCorsa !== undefined && opzioni.daCorsa.trim() !== "";

/* ⚠ ESATTAMENTE UNA delle due sorgenti, mai zero e mai due.
 *
 * Due sorgenti insieme renderebbero l'invocazione ambigua nello stesso modo in
 * cui `--apply --dry-run` lo sarebbe, e per la stessa ragione i due ordini della
 * stessa coppia non devono significare due cose. Zero e' il rifiuto che c'era
 * gia': questo strumento non cerca l'istantanea da solo e non ne sceglie una. */
if (haPercorso && haCorsa) {
  rifiuta(
    "ambiguous_snapshot_source",
    "--from e --from-run insieme. Sono due sorgenti della stessa cosa e l'invocazione " +
      "non dice quale vale: il file lo scrive l'importatore presidiato, la riga di " +
      "registro la scrive lo specchio schedulato. Chi esegue sa da quale delle due " +
      "corse sta rientrando."
  );
}

if (!haPercorso && !haCorsa) {
  rifiuta(
    "missing_snapshot_path",
    "ne' --from ne' --from-run. Questo strumento non cerca l'istantanea da solo e non " +
      "ne sceglie una: quale rimettere e' la domanda del passo 3 del rientro, e va " +
      "risposta da chi ha davanti l'ora della corsa morta."
  );
}

/* I controlli sul percorso valgono per il file, e per il file soltanto: una
 * riga di registro non sta su disco, non ha un percorso e non puo' essere
 * ignorata da git. Saltarli quando non c'e' un file non e' un'esenzione — e'
 * l'assenza dell'oggetto che dovrebbero misurare. */
let percorso = null;
if (haCorsa) {
  // La sorgente e' il registro. Si prosegue al passo 4, dove il ramo `--from-run`
  // legge la riga e incontra ESATTAMENTE le stesse guardie del file.
} else {

percorso = resolve(ROOT, opzioni.da.trim());

const rispostaGit = spawnSync("git", ["check-ignore", "-q", "--", percorso], { cwd: ROOT });

if (rispostaGit.error) {
  rifiuta(
    "snapshot_path_unverifiable",
    `git non ha potuto rispondere se quel percorso e' ignorato: ${rispostaGit.error.message}.`
  );
}

if (rispostaGit.status === 1) {
  rifiuta(
    "snapshot_path_not_ignored",
    "il percorso indicato NON e' ignorato da git. Un'istantanea porta il nome di una " +
      "persona e il contenuto intero delle righe rimosse, e questo repository e' " +
      "pubblico: una pubblicazione non torna indietro. Spostarla non basta — va " +
      "verificato se e' gia' entrata nell'indice."
  );
}

if (rispostaGit.status !== 0) {
  rifiuta(
    "snapshot_path_unverifiable",
    "git non ha saputo dire se quel percorso e' ignorato. Un percorso fuori da questo " +
      "albero e' fra i modi in cui questo succede, ed e' comunque il posto sbagliato: " +
      "l'istantanea sta nella directory ignorata dove lo scrittore la mette."
  );
}

} // fine del ramo `--from`: da qui i due percorsi tornano uno solo.

/* ────────────────────────────────────────────────────────────────────────────
 * Passo 3 — quale calendario, contro il vocabolario chiuso
 * ──────────────────────────────────────────────────────────────────────────── */

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(".") && !/\.[cm]?[jt]sx?$/.test(specifier)) {
      const candidato = new URL(`${specifier}.ts`, context.parentURL);
      if (existsSync(fileURLToPath(candidato))) {
        return { url: candidato.href, shortCircuit: true };
      }
    }
    return nextResolve(specifier, context);
  },
});

const AVVISO_SOPPRESSO = "MODULE_TYPELESS_PACKAGE_JSON";
const ascoltatoriPredefiniti = process.listeners("warning");
process.removeAllListeners("warning");
process.on("warning", (avviso) => {
  if (avviso.code === AVVISO_SOPPRESSO || avviso.name === AVVISO_SOPPRESSO) return;
  for (const ascoltatore of ascoltatoriPredefiniti) ascoltatore(avviso);
});

let ics;
try {
  ics = await import(join(ICS_DIR, "index.ts"));
} catch (errore) {
  rifiuta(
    "reader_unavailable",
    `il modulo condiviso non si e' importato: ${errore.message}. Questo strumento lo ` +
      "guida invece di riscriverlo."
  );
}

if (opzioni.calendario === null) {
  rifiuta(
    "missing_calendar_key",
    "nessun --calendar. Chi esegue deve dire quale calendario crede di rimettere, " +
      `perche' l'istantanea porta la propria chiave e puo' smentirlo. Uno fra: ${ics.CALENDAR_KEYS.join(", ")}.`
  );
}

if (!ics.CALENDAR_KEYS.includes(opzioni.calendario)) {
  rifiuta(
    "unknown_calendar_key",
    "il valore dato a --calendar non e' una delle chiavi che questo progetto dichiara. " +
      `Il vocabolario e' chiuso ed e': ${ics.CALENDAR_KEYS.join(", ")}.`
  );
}

const chiaveDichiarata = opzioni.calendario;

/* ────────────────────────────────────────────────────────────────────────────
 * Passo 4 — l'istantanea: presente, leggibile, della forma attesa, con la sua
 * ora, completa, e dello stesso calendario
 * ──────────────────────────────────────────────────────────────────────────── */

/* ── DUE SORGENTI, E LA SECONDA E' PER LE CORSE CHE NESSUNO GUARDAVA ────────
 *
 * `--from <percorso>` legge il file che l'importatore PRESIDIATO scrive prima di
 * cancellare. `--from-run <id>` legge la stessa cosa dalla riga di registro, che
 * e' dove lo specchio SCHEDULATO la mette — non potendo scrivere su un
 * filesystem che non sopravvive alla corsa che dovrebbe salvare.
 *
 * ⚠ **Le guardie a valle sono le stesse, tutte, e questo e' il punto.** Forma,
 * ora contro la corsa interrotta, completezza, chiave di calendario: cambia da
 * dove arrivano i byte, non cosa devono superare. Una seconda strada con guardie
 * proprie sarebbe una seconda strada che diverge dalla prima al primo caso
 * limite.
 *
 * ⚠ **`state_snapshot` NULL non e' un'istantanea vuota.** Significa che quella
 * corsa non ha portato con se' la propria via di ritorno — vero di ogni corsa
 * precedente al 2026-08-27 e di ogni corsa presidiata. Ha una categoria propria,
 * perche' leggerlo come *niente da rimettere* direbbe a chi esegue che non c'e'
 * nulla da salvare proprio quando non si sa cosa ci fosse.
 */
let istantanea;

if (opzioni.daCorsa !== null && opzioni.daCorsa !== undefined) {
  const risposta = await db
    .from("production_import_run")
    .select("id, calendar_key, started_at, finished_at, state_snapshot")
    .eq("id", opzioni.daCorsa)
    .maybeSingle();

  if (risposta.error) {
    rifiuta("run_unreadable", `la riga di registro non si e' potuta leggere: ${risposta.error.code ?? "?"}.`);
  }
  if (risposta.data === null) {
    rifiuta("run_absent", "nessuna riga di registro con quell'identificativo.");
  }
  if (risposta.data.state_snapshot === null) {
    rifiuta(
      "run_without_snapshot",
      "quella corsa non ha portato con se' la propria via di ritorno. NON vuol dire " +
        "che non ci fosse niente da rimettere: vuol dire che nessuno lo ha misurato. " +
        "E' vero di ogni corsa precedente al 2026-08-27 e di ogni corsa presidiata, " +
        "che scrive la sua istantanea su disco — per quelle si usa --from."
    );
  }
  istantanea = risposta.data.state_snapshot;
  controlloPronto = istantanea !== null && typeof istantanea === "object";
} else {

if (!existsSync(percorso)) {
  rifiuta(
    "snapshot_absent",
    "non c'e' nessun file in quel percorso. E' il ritrovamento peggiore che il passo 3 " +
      "del rientro possa fare, e va scritto per esteso invece di aggirato con un " +
      "secondo tentativo."
  );
}

let grezzo;
try {
  grezzo = readFileSync(percorso, "utf8");
} catch (errore) {
  rifiuta("snapshot_unreadable", `il file non si e' potuto leggere: ${errore.message}.`);
}

try {
  istantanea = JSON.parse(grezzo);
} catch (errore) {
  // Il messaggio del parser puo' citare il testo intorno all'errore, e quel testo
  // e' materiale. Esce solo che non si e' potuto interpretare.
  rifiuta(
    "snapshot_unparsable",
    "il file non si e' potuto interpretare. Il messaggio del lettore non viene " +
      "riportato: cita il testo intorno al punto, e quel testo e' materiale."
  );
}

// Da qui in avanti il controllo in coda ha qualcosa contro cui misurare, quindi
// gira anche sui rifiuti — che sono le uscite piu' probabili da incollare.
controlloPronto = istantanea !== null && typeof istantanea === "object";
}

if (istantanea === null || typeof istantanea !== "object" || Array.isArray(istantanea)) {
  rifiuta("snapshot_incomplete", "il file non ha la forma di un'istantanea.");
}

const FORME_LETTE = ics.MIRROR_SNAPSHOT_SHAPES_READABLE;

if (!Array.isArray(FORME_LETTE) || FORME_LETTE.length === 0) {
  rifiuta(
    "reader_unavailable",
    "il modulo condiviso non dichiara quali forme di istantanea si leggono. Senza " +
      "quell'elenco questo lettore starebbe indovinando la forma di un file che porta " +
      "il nome di una persona."
  );
}

if (!FORME_LETTE.includes(istantanea.shape)) {
  rifiuta(
    "snapshot_shape_unknown",
    // ⚠ Nessuna data in questa frase, e non e' una svista: il controllo in coda
    // vieta ogni anno di quattro cifre nel referto, e ci e' andato rosso sopra la
    // prima volta che questa riga la portava. La riparazione prescritta e' DIRE
    // MENO — l'intestazione di questo file porta la data, un rifiuto non ne ha
    // bisogno.
    "l'istantanea non dichiara la forma che questo lettore riconosce. Quelle prese " +
      "prima che il campo esistesse non la dichiarano affatto, ed e' lo stesso rifiuto: " +
      "un lettore che indovinasse la forma di un file che porta il nome di una persona " +
      "e' un lettore che sbaglia in silenzio."
  );
}

const presoIl = Date.parse(String(istantanea.takenAt ?? ""));

if (!Number.isFinite(presoIl)) {
  rifiuta(
    "snapshot_without_clock",
    "l'istantanea non porta il proprio istante. Il nome del file non conta come ora: " +
      "si copia, si rinomina, lo riscrive un archiviatore, e non e' la misura di " +
      "niente. Senza quel campo il passo 3 del rientro non puo' verificare che questa " +
      "sia l'istantanea DI QUESTA corsa, e rimettere quella di un altro giro riporta " +
      "indietro spunte che qualcuno aveva tolto apposta."
  );
}

/*
 * ⚠ **DUE NOMI DI CAMPO, UNA LISTA, E LA DIREZIONE SI DERIVA QUI UNA VOLTA SOLA.**
 *
 * La forma corrente scrive `decisions` e porta entrambe le direzioni; la
 * precedente scriveva `ticks` e portava le sole spunte. Le voci hanno gli stessi
 * campi in tutte e due, quindi la conversione e' il nome della lista e nient'altro.
 *
 * La direzione **non si legge dal file**: si deriva dall'istante, che e' il dato
 * che la porta. Un annullamento e' una voce con l'attore pieno e `ticked_at`
 * nullo — non un dato mancante, ma la forma che quella direzione ha, perche'
 * azzerare l'istante e' il modo in cui un annullamento viene scritto. Derivarla
 * qui invece di fidarsi di un campo scritto altrove e' cio' che rende leggibili
 * le due forme con un ramo solo.
 */
const listaDecisioni = Array.isArray(istantanea.decisions)
  ? istantanea.decisions
  : Array.isArray(istantanea.ticks)
    ? istantanea.ticks
    : null;

const spunte =
  listaDecisioni === null
    ? null
    : listaDecisioni.map((voce) => ({
        ...voce,
        direzione: voce?.tickedAt === null || voce?.tickedAt === undefined ? "annullata" : "spuntata",
      }));

const legami = Array.isArray(istantanea.links) ? istantanea.links : null;

if (spunte === null || legami === null) {
  rifiuta(
    "snapshot_incomplete",
    "l'istantanea non porta entrambe le due eccezioni di stato. Sono due, e una " +
      "mancante non e' uno zero: e' una misura che non c'e'."
  );
}

if (istantanea.calendarKey !== chiaveDichiarata) {
  // ⚠ Nessuna delle due chiavi viene stampata. Sarebbero due sigle pubbliche, ma
  // «dire meno» qui non costa nulla: chi esegue ha davanti il proprio comando e
  // il proprio file, e i due valori non aggiungono niente a cosa fare.
  rifiuta(
    "snapshot_calendar_mismatch",
    "l'istantanea e' di un calendario diverso da quello dichiarato. Nessuna delle due " +
      "chiavi viene riportata qui: chi esegue le ha entrambe davanti. Rimettere le " +
      "spunte di un calendario sopra le righe di un altro e' il modo esatto in cui un " +
      "rientro produce un danno che non c'era."
  );
}

di("  ── l'istantanea ──────────────────────────────────────────────────────");
const annullamentiNellIstantanea = spunte.filter((v) => v.direzione === "annullata").length;
di(`     porta ${spunte.length} + ${legami.length} da rimettere, e il proprio istante.`);
di(
  `     delle prime, ${annullamentiNellIstantanea} sono ANNULLAMENTI: attore pieno e nessun ` +
    "istante. Il calendario non sa chi ha tolto una casella piu' di quanto sappia"
);
di("       chi ne ha messa una.");

/* ────────────────────────────────────────────────────────────────────────────
 * Passo 5 — le credenziali, e il file d'ambiente si legge QUI
 * ──────────────────────────────────────────────────────────────────────────── */

function caricaAmbiente() {
  const fileAmbiente = join(ROOT, ".env.local");
  if (existsSync(fileAmbiente)) {
    try {
      process.loadEnvFile(fileAmbiente);
    } catch (errore) {
      rifiuta("env_unreadable", `.env.local esiste ma non si e' potuto leggere: ${errore.message}`);
    }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chiaveServizio = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const mancanti = [];
  if (!url) mancanti.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!chiaveServizio) mancanti.push("SUPABASE_SERVICE_ROLE_KEY");

  if (mancanti.length > 0) {
    rifiuta(
      "missing_credential",
      `variabile/i d'ambiente mancante/i: ${mancanti.join(", ")}. Questo strumento parla ` +
        "con un database solo e non inventa un secondo modo di raggiungerlo."
    );
  }

  registraSegreto(chiaveServizio);
  try {
    registraSegreto(new URL(url).hostname.split(".")[0]);
  } catch {
    rifiuta("bad_credential", "NEXT_PUBLIC_SUPABASE_URL non e' un indirizzo.");
  }
  registraSegreto(url);

  return { url, chiaveServizio };
}

const credenziali = caricaAmbiente();
di("  ✓ credenziali presenti (mai stampate, e oscurate da ogni riga)");

let createClient;
try {
  ({ createClient } = await import("@supabase/supabase-js"));
} catch (errore) {
  rifiuta("client_unavailable", `il client non si e' importato: ${errore.message}.`);
}

/**
 * Il client con il ruolo di servizio, che scavalca ogni policy.
 *
 * La giustificazione e' quella dell'importatore e non cambia: le sei tabelle di
 * produzione non hanno **alcuna** policy di scrittura (D-44-22), quindi un client
 * a cookie e' rifiutato per chiunque e questo non e' una preferenza.
 *
 * La meta' sull'input non fidato, qui, e' piu' forte che nell'importatore:
 * **questo processo non legge nessuna rete e nessuna sorgente esterna.** L'unico
 * input e' un file che ha scritto lo scrittore di questo stesso repository, e i
 * suoi valori non diventano mai un'istruzione — diventano due colonne e una
 * condizione su chiave primaria.
 */
const db = createClient(credenziali.url, credenziali.chiaveServizio, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Stampa `error.code` ed `error.message`. Mai l'oggetto, mai il terzo campo. */
function descrivi(errore) {
  return `${errore?.code ?? "senza_codice"}: ${errore?.message ?? "senza messaggio"}`;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Passo 6 — la corsa interrotta, chiesta al registro
 *
 * ⚠ **Non a chi esegue.** Un istante digitato e' un istante ricordato, e il
 * ricordo di che ora era quando e' morta una corsa notturna non e' un dato. La
 * riga con `finished_at` nullo E' l'osservazione — la migration lo dice di se
 * stessa e vieta di riempirla per far sembrare ordinata una tabella.
 * ──────────────────────────────────────────────────────────────────────────── */

const registro = await db
  .from("production_import_run")
  .select("id, started_at")
  .eq("calendar_key", chiaveDichiarata)
  .eq("dry_run", false)
  .is("finished_at", null)
  .order("started_at", { ascending: false });

if (registro.error) {
  rifiuta(
    "register_unreadable",
    `il registro non si e' potuto leggere, quindi l'ora dell'istantanea non e' ` +
      `verificabile — ${descrivi(registro.error)}. Rifiutato invece che trattato come ` +
      "se non ci fosse nessuna corsa interrotta: quella e' una conclusione, non un errore."
  );
}

if (registro.data.length === 0) {
  rifiuta(
    "no_interrupted_run",
    "il registro non porta nessuna corsa interrotta per questo calendario. Un rientro " +
      "fuori da un rientro non e' un rientro: e' una riscrittura che nessuno ha " +
      "chiesto. Se la corsa e' morta prima di aprire la propria riga, allora non aveva " +
      "ancora cancellato niente — e non c'e' niente da rimettere."
  );
}

if (registro.data.length > 1) {
  rifiuta(
    "ambiguous_interrupted_run",
    `${registro.data.length} corse risultano interrotte per questo calendario. Quale sia ` +
      "quella di questa istantanea non e' una cosa da dedurre: due righe aperte " +
      "significano che un rientro precedente non e' stato chiuso, ed e' quello il " +
      "primo ritrovamento."
  );
}

const corsaInterrotta = registro.data[0];
const apertaIl = Date.parse(String(corsaInterrotta.started_at ?? ""));

if (!Number.isFinite(apertaIl)) {
  rifiuta("register_unreadable", "la corsa interrotta non porta un istante d'apertura leggibile.");
}

/* ────────────────────────────────────────────────────────────────────────────
 * Passo 7 — l'ora
 * ──────────────────────────────────────────────────────────────────────────── */

const distanzaMs = apertaIl - presoIl;
const distanzaSecondi = Math.round(distanzaMs / 1000);

di("  ── l'ora ─────────────────────────────────────────────────────────────");
di(
  `     l'istantanea precede l'apertura di ${distanzaSecondi} secondi · finestra ammessa ` +
    `${Math.round(FINESTRA_MS / 1000)}`
);

if (distanzaMs < 0) {
  rifiuta(
    "snapshot_after_run",
    "l'istantanea e' stata presa DOPO l'apertura della corsa interrotta. Lo scrittore la " +
      "prende prima, sempre e per costruzione, quindi questa non e' l'istantanea di " +
      "quella corsa. Il verso e' l'unica cosa che lo dice, e non si aggira."
  );
}

if (distanzaMs > FINESTRA_MS) {
  rifiuta(
    "snapshot_predates_run",
    "l'istantanea e' piu' vecchia della corsa interrotta di piu' della finestra ammessa: " +
      "e' l'istantanea di un altro giro. Rimetterla riporterebbe indietro spunte che nel " +
      "frattempo erano state tolte — che e' un danno nuovo, non un rientro. Cercare " +
      "l'istantanea giusta e' il passo 3, e non ha una scorciatoia."
  );
}

di("     ✓ e' l'istantanea di quella corsa.");
di("");

/* ────────────────────────────────────────────────────────────────────────────
 * Passo 8 — risolvere gli identificativi, che e' una LETTURA
 *
 * ⚠ Le condizioni larghe di questo file stanno tutte qui dentro, e questa e' una
 * `select`. Le due condizioni si restringono a vicenda: la chiave di calendario
 * e' lo scopo dichiarato, la lista degli identificativi stabili e' cio' che
 * l'istantanea porta. Se le due mai divergessero, la loro intersezione e'
 * l'insieme piu' piccolo — l'unica direzione in cui divergere e' sicura.
 * ──────────────────────────────────────────────────────────────────────────── */

const identificativiStabili = [
  ...new Set([...spunte, ...legami].map((riga) => riga?.planSourceUid).filter((v) => typeof v === "string")),
];

const lettura =
  identificativiStabili.length === 0
    ? { data: [], error: null }
    : await db
        .from("production_plan")
        .select("id, source_uid, linked_party_id")
        .eq("calendar_key", chiaveDichiarata)
        .in("source_uid", identificativiStabili);

if (lettura.error) {
  rifiuta("scope_unreadable", `lo scopo non si e' potuto leggere — ${descrivi(lettura.error)}.`);
}

const perIdentificativo = new Map();
for (const riga of lettura.data) perIdentificativo.set(riga.source_uid, riga);

di("  ── cosa si puo' rimettere ────────────────────────────────────────────");
di(
  `     ${perIdentificativo.size} su ${identificativiStabili.length} identificativi ` +
    "dell'istantanea hanno una riga davanti."
);

const senzaRiga = identificativiStabili.length - perIdentificativo.size;
if (senzaRiga > 0) {
  di(
    `     ⚠ ${senzaRiga} non ne hanno una. Quello stato resta nell'istantanea e in nessun ` +
      "altro posto: e' un ritrovamento, e va scritto come numero nel referto del rientro."
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Passo 9 — il giro a vuoto si ferma qui
 * ──────────────────────────────────────────────────────────────────────────── */

if (!opzioni.applica) {
  di("");
  di("     NULLA E' STATO SCRITTO. Per rimettere: --apply, dopo aver letto i conteggi.");
  const pulito = controllaIlProprioReferto();
  di("");
  di(pulito ? "  RESTORE_DRY_RUN_OK" : "  RESTORE_DRY_RUN_WITH_LEAKED_OUTPUT");
  di("");
  process.exit(pulito ? 0 : 1);
}

/* ────────────────────────────────────────────────────────────────────────────
 * Passo 10 — le due riscritture, per chiave primaria
 * ──────────────────────────────────────────────────────────────────────────── */

let scritte = 0;

async function passo(categoria, azione) {
  const { error } = await azione();
  if (error) fallisceAMeta(categoria, descrivi(error), scritte);
  scritte += 1;
}

let legamiRimessi = 0;
let legamiGiaAPosto = 0;
let legamiInConflitto = 0;

for (const legame of legami) {
  const riga = perIdentificativo.get(legame?.planSourceUid);
  if (riga === undefined) continue;

  if (riga.linked_party_id !== null) {
    if (riga.linked_party_id === legame.linkedPartyId) legamiGiaAPosto += 1;
    // ⚠ Un legame diverso da quello dell'istantanea NON viene sovrascritto. E'
    // posteriore allo schianto, quindi qualcuno l'ha posato dopo, e un ripristino
    // non scavalca una decisione presa da una persona.
    else legamiInConflitto += 1;
    continue;
  }

  await passo("restore_link", () =>
    db.from("production_plan").update({ linked_party_id: legame.linkedPartyId }).eq("id", riga.id)
  );
  legamiRimessi += 1;
}

let spunteRimesse = 0;
let annullamentiRimessi = 0;
let spunteGiaAPosto = 0;
let spunteSenzaVoce = 0;

for (const spunta of spunte) {
  const riga = perIdentificativo.get(spunta?.planSourceUid);
  if (riga === undefined) continue;

  // La condizione larga sta in una LETTURA, e serve a trovare la chiave primaria
  // su cui la scrittura di sotto insistera'. `(plan_id, kind, label)` e' la
  // chiave unica della voce con la meta' generata scambiata con quella stabile.
  const voce = await db
    .from("production_checklist_item")
    // `ticked_by` si legge insieme all'istante perche' e' l'unica cosa che
    // distingue *nessuno ha mai deciso qui* da *qualcuno ha tolto la casella*:
    // un annullamento non ha un istante, quindi l'istante da solo non risponde.
    .select("id, ticked_at, ticked_by")
    .eq("plan_id", riga.id)
    .eq("kind", spunta.kind)
    .eq("label", spunta.label)
    .limit(2);

  if (voce.error) {
    fallisceAMeta("item_unreadable", descrivi(voce.error), scritte);
  }

  if (voce.data.length !== 1) {
    // Zero: la corsa non ha riscritto quella voce. Due: la chiave stabile non e'
    // stabile su questa riga. Nessuna delle due si ripara indovinando.
    spunteSenzaVoce += 1;
    continue;
  }

  if (voce.data[0].ticked_at !== null) {
    // ⚠ Gia' spuntata DOPO lo schianto. Quell'istante e' piu' recente
    // dell'istantanea e l'ha prodotto una persona: riscriverlo con l'originale
    // toglierebbe la sua spunta per rimettere la stessa casella. Un ripristino
    // non e' un atto, e non ne annulla uno.
    spunteGiaAPosto += 1;
    continue;
  }

  if (spunta.direzione === "annullata" && voce.data[0].ticked_by !== null) {
    // ⚠ **Un annullamento non scavalca MAI una traccia gia' presente**, e la
    // ragione e' che non puo' sapere di essere il piu' recente: un annullamento
    // non porta un istante, quindi due annullamenti sulla stessa casella sono
    // indistinguibili per ordine. Se la riga porta gia' un attore con l'istante
    // nullo, o e' questo stesso — e riscriverlo non aggiunge niente — o e' uno
    // posteriore allo schianto, e riscriverlo cancellerebbe chi ha deciso dopo.
    // Fra i due esiti possibili di un dubbio, questo file sceglie sempre di non
    // toccare.
    spunteGiaAPosto += 1;
    continue;
  }

  await passo("restore_tick", () =>
    db
      .from("production_checklist_item")
      .update({
        // Gli originali. Mai adesso, mai chi sta eseguendo, e mai attraverso la
        // funzione che ri-registra l'autore a ogni chiamata.
        ticked_at: spunta.tickedAt,
        ticked_by: spunta.tickedBy,
        ticked_by_name: spunta.tickedByName,
      })
      .eq("id", voce.data[0].id)
  );
  spunteRimesse += 1;
  if (spunta.direzione === "annullata") annullamentiRimessi += 1;
}

di("");
di("  ── rimesso ───────────────────────────────────────────────────────────");
di(
  `     ${spunteRimesse} + ${legamiRimessi}, con l'attore e l'istante ORIGINALI — e ` +
    `${annullamentiRimessi} delle prime sono ANNULLAMENTI.`
);
di(
  `     gia' a posto e non toccati: ${spunteGiaAPosto} + ${legamiGiaAPosto} · in conflitto e ` +
    `non toccati: ${legamiInConflitto} · senza voce davanti: ${spunteSenzaVoce}`
);
di("  ⚠ Questi sono i conteggi che questa corsa CREDE. Riconfermali dal catalogo,");
di("    che e' uno strumento diverso da quello che ha prodotto l'effetto — e' il");
di("    passo 6 del rientro, e non e' compito di questo codice.");

const pulito = controllaIlProprioReferto();

di("");
di(pulito ? "  RESTORE_APPLIED_OK" : "  RESTORE_APPLIED_WITH_LEAKED_OUTPUT");
di("");
process.exit(pulito ? 0 : 1);

/* ────────────────────────────────────────────────────────────────────────────
 * Il controllo del referto di questa corsa
 *
 * Ogni stringa dell'istantanea, spezzata in token, non deve comparire in cio'
 * che questa corsa ha stampato — e nel referto non deve comparire nessun anno di
 * quattro cifre. Stesso congegno del controllo in coda all'importatore, stessa
 * ragione: la frase *questo non ha stampato materiale* vale solo quando e'
 * misurata.
 *
 * ⚠ **Nessuna lista di esenzioni**, e il campo che dichiara la forma del file non
 * ne e' una: e' cio' che rende «dire meno» una regola invece di un'intenzione.
 * Quando va rosso su una coincidenza, la riparazione e' riformulare la riga.
 * ──────────────────────────────────────────────────────────────────────────── */

function tokenDi(valore) {
  return new Set(
    String(valore)
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((token) => token.length >= 3)
  );
}

function foglieDiTesto(nodo, dentro) {
  if (typeof nodo === "string") {
    dentro.push(nodo);
    return;
  }
  if (Array.isArray(nodo)) {
    for (const figlio of nodo) foglieDiTesto(figlio, dentro);
    return;
  }
  if (nodo !== null && typeof nodo === "object") {
    for (const figlio of Object.values(nodo)) foglieDiTesto(figlio, dentro);
  }
}

/**
 * @returns `true` quando il referto non porta materiale. **Chi chiama DEVE
 *   ramificare su questo valore.** Un controllo il cui fallimento non cambia
 *   niente di osservabile non e' un controllo, e questo prodotto non ha error
 *   tracking che se ne accorga al posto suo.
 */
function controllaIlProprioReferto() {
  const foglie = [];
  foglieDiTesto(istantanea, foglie);

  const residui = new Set();
  for (const foglia of foglie) {
    for (const token of tokenDi(foglia)) residui.add(token);
  }

  const stampati = tokenDi(referto.join("\n"));
  const usciti = [...residui].filter((token) => stampati.has(token));
  const anni = [...stampati].filter((token) => /^(19|20)\d{2}$/.test(token));

  di("");
  if (usciti.length === 0 && anni.length === 0) {
    di(`  ✓ controllo del referto: ${residui.size} token nell'origine, 0 in cio' che e' uscito · 0 anni`);
    return true;
  }

  // ⚠ I token usciti NON vengono elencati. Stamparli per dire che sono stati
  // stampati e' il fallimento intero, eseguito dal controllo che l'ha trovato.
  di("  ✗ CONTROLLO DEL REFERTO FALLITO — cio' che e' uscito porta materiale.");
  if (usciti.length > 0) {
    di(`    ${usciti.length} token su ${residui.size} compaiono sopra. Non vengono elencati.`);
  }
  if (anni.length > 0) {
    di(`    ${anni.length} anno/i di quattro cifre compaiono sopra.`);
  }
  di("    NON INCOLLARE QUESTA CORSA DA NESSUNA PARTE. Riformula, mai allargare la regola.");
  return false;
}
