/**
 * verify-ics-reachable — i moduli del lettore del calendario esistono e si caricano
 *
 * QUELLO CHE ASSERISCE, in una frase: **gli otto moduli sotto
 * `src/lib/production/ics/` esistono, il loro barrel si importa, ed espone ogni
 * simbolo che un consumatore a runtime chiama per nome** — su qualunque macchina,
 * senza aprire `docs/` e senza toccare un database.
 *
 * ── PERCHE' ESISTE, e non e' un doppione di `verify:ics` ─────────────────────
 *
 * Reperto **B-2** dell'audit di milestone della v1.5, 2026-08-19.
 *
 * Quei moduli **non hanno alcun importatore statico**. I consumatori sono **tre**
 * — `scripts/import-production-calendar.mjs`, `scripts/verify-ics-import.mjs` e
 * `scripts/verify-ics-grammar.mjs` — e tutti e tre usano un `await import()` il
 * cui percorso e' costruito a runtime:
 *
 *     ics = await import(join(ICS_DIR, "index.ts"));
 *
 * Un percorso costruito a runtime e' invisibile a `npm run build`, a
 * `verify:conversion` e a qualunque `grep`. Rinominare o cancellare uno di quei
 * file non rompe niente che qualcuno guardi: si scopre alla prossima esecuzione
 * dell'import, che in produzione **non e' mai stata fatta**.
 *
 * `verify:ics` li importa gia' — ma sta in `NEEDS_MATERIAL` di `verify-all.mjs`,
 * cioe' **e' dichiarato e non viene mai lanciato**, perche' leggendo `docs/`
 * rifiuterebbe su ogni macchina tranne una. La scelta e' giusta e non va
 * cambiata: e' la ragione per cui serve questo file, che materiale non ne chiede.
 *
 * ── COSA NON DICE ───────────────────────────────────────────────────────────
 *
 * Che i moduli **si caricano**, non che **leggono bene**. Un parser che sbaglia
 * ogni data passa questo controllo. Quello lo misura `verify:ics`, con il file
 * vero, sulla macchina che ce l'ha. Qui si difende soltanto il fatto che il
 * percorso esista ancora — che e' precisamente cio' che nessun altro strumento
 * di questo repository fa.
 *
 * ── ESITI ───────────────────────────────────────────────────────────────────
 *
 *   0  gli otto file ci sono, il barrel si importa, e nessun simbolo atteso manca
 *   1  FALLIMENTO — un file manca, l'import solleva, o un simbolo non e' esportato
 *
 * **Non esce mai 2.** Non ha precondizioni da cui possa essere rifiutato: se
 * puo' girare, misura. Un controllo senza precondizioni che uscisse «rifiutato»
 * sarebbe un posto in cui un difetto si nasconde, ed e' esattamente l'errore che
 * questo file e' stato scritto per chiudere.
 */

import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { registerHooks } from "node:module";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ICS_DIR = join(ROOT, "src", "lib", "production", "ics");

/**
 * I moduli attesi. Il barrel per ultimo: e' quello che importa gli altri.
 *
 * ⚠ **Otto, ed erano sei prima della fase 58.** `anchors` mancava dall'elenco pur
 * essendo sul disco e importato dal barrel: il controllo A non lo difendeva, e la
 * sua assenza sarebbe stata scoperta dal controllo B — che dice *«il barrel non
 * si importa»*, cioe' la diagnosi sbagliata per un file cancellato. Il conteggio
 * si legge da `MODULI.length` e non si scrive a mano, per la ragione registrata
 * nel piano 58-07: un numero fisso in una riga verde e' un numero che nessuno
 * rilegge quando scade.
 *
 * ⚠ **`guard` entra qui nello stesso commit in cui nasce, ed e' il modulo che
 * dimostra perche' questo controllo esiste.** E' il predicato che decide se uno
 * specchio non presidiato puo' cancellare un calendario: non ha alcun importatore
 * statico, quindi `npm run build` resta verde se sparisce, e la sua assenza si
 * scoprirebbe la notte in cui il cron gira senza guardia.
 */
const MODULI = [
  "parse",
  "unfold",
  "classify",
  "anchors",
  "reconcile",
  "guard",
  "vocabulary",
  "index",
];

const fallimenti = [];
const say = (l) => console.log(l);

say("");
say("verify-ics-reachable — il lettore del calendario esiste ancora");
say("");

/* A — i file sono sul disco */

const mancanti = MODULI.filter((m) => !existsSync(join(ICS_DIR, `${m}.ts`)));
if (mancanti.length === 0) {
  say(`  ✓ A  i ${MODULI.length} moduli sono al loro posto sotto src/lib/production/ics/`);
} else {
  say(`  ✗ A  ${mancanti.length} modulo/i assente/i: ${mancanti.join(", ")}`);
  say("         Nessuno di questi file ha un importatore statico, quindi la loro");
  say("         assenza non rompe il build e non la vede nessun grep.");
  fallimenti.push("A");
}

/* B — il barrel si importa davvero
 *
 * Il barrel importa i vicini come `./parse`, che il bundler risolve e Node no.
 * Lo stesso hook di `verify-ics-import.mjs`: aggiunge `.ts` a uno specificatore
 * relativo che nomina un file esistente. Non cambia cosa fanno i moduli, cambia
 * come vengono trovati — ed e' l'unica cosa che permette di esercitare lo stesso
 * codice che l'import esercita.
 */

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

/**
 * I simboli che i consumatori a runtime chiamano per nome.
 *
 * **Letti dai consumatori, non ricordati.** La prima stesura di questo file ne
 * aveva inventati tre — `parseCalendar`, `classifyEvent`, `reconcile` — e due su
 * tre non esistevano. Il controllo C li ha bocciati, ed e' esattamente il verso
 * in cui doveva fallire: un elenco inventato che fosse passato per caso avrebbe
 * difeso nomi che nessuno chiama.
 *
 * ⚠ **I consumatori sono TRE, e fino alla fase 58 questo elenco ne leggeva uno.**
 * `verify-ics-import.mjs` e `verify-ics-grammar.mjs` caricano lo stesso barrel
 * con lo stesso `import()` costruito a runtime, quindi un simbolo che sparisce li'
 * e' invisibile a `npm run build` esattamente come lo e' nell'import — ed e' il
 * reperto B-2 dell'audit v1.5 per intero. Difendere solo i simboli di uno dei tre
 * lasciava scoperti undici nomi.
 *
 * ⚠ **Nessun nome che nessuno chiama.** `MIRROR_DELETION_ORDER` e
 * `MIRRORED_TABLES`, nati con `ICS-01`, **continuano a non essere qui**, e la
 * ragione e' cambiata: il piano 58-09 li consuma davvero, ma **dentro il piano
 * che il riconciliatore restituisce** — mai per nome dal barrel. Un simbolo che
 * viaggia dentro un oggetto non e' un simbolo che un rinominio spezza qui, e
 * metterlo in questo elenco difenderebbe un nome che nessuno scrive.
 *
 * ⚠ **I tre della guardia del feed invece ci sono, dal piano 58-10**, perche' li'
 * l'importatore li chiama per nome: `mirrorGuard`, `mirrorShrinkMargin` e
 * `MIRROR_SHRINK_FLOOR`. E' il caso opposto al precedente, ed e' la ragione per
 * cui l'elenco si rilegge dai consumatori invece di ricordarlo.
 *
 * Presi con:
 * `grep -oE "ics\.[a-zA-Z_]+" scripts/import-production-calendar.mjs scripts/verify-ics-import.mjs scripts/verify-ics-grammar.mjs | sort -u`
 */
const attesi = [
  "ANCHOR_DIRECTIONS",
  "ANCHOR_KINDS",
  "CALENDAR_KEYS",
  "MAX_INPUT_BYTES",
  "MAX_INPUT_LINES",
  "MIRROR_SHRINK_FLOOR",
  "PIECE_DATE_ORIGINS",
  "PIECE_KINDS",
  "PIECE_KIND_LABELS",
  "UNRESOLVED_REASONS",
  "VENUE_STAGES",
  "attachNumberlessPieces",
  "classifyEntries",
  "conformsToRule",
  "countFoldedLines",
  "isEmptyPlan",
  "joinKey",
  "mirrorGuard",
  "mirrorShrinkMargin",
  "parseIcs",
  "proposePieceDate",
  "reconcile",
  "unfold",
];

if (fallimenti.length > 0) {
  say("  – B  non tentato: manca almeno un file, e l'esito direbbe la stessa cosa due volte");
} else {
  try {
    const ics = await import(pathToFileURL(join(ICS_DIR, "index.ts")).href);
    const esportati = Object.keys(ics);
    say(`  ✓ B  il barrel si importa ed espone ${esportati.length} simbolo/i`);

    const assenti = attesi.filter((n) => !esportati.includes(n));
    if (assenti.length === 0) {
      say(`  ✓ C  tutti i ${attesi.length} simboli che i tre consumatori chiamano sono esportati`);
    } else {
      say(`  ✗ C  simboli attesi e non esportati: ${assenti.join(", ")}`);
      say("         import-production-calendar, verify-ics-import e verify-ics-grammar");
      say("         li chiamano per nome: un rinominio qui e' un errore a runtime, la'.");
      fallimenti.push("C");
    }
  } catch (error) {
    say(`  ✗ B  il barrel non si importa: ${error.message}`);
    say("         I consumatori di questi moduli sono tre import() costruiti a");
    say("         runtime, invisibili al build. Se il barrel non si carica,");
    say("         l'import del calendario e' rotto e nient'altro lo dice.");
    fallimenti.push("B");
  }
}

say("");
if (fallimenti.length === 0) {
  say("  ICS_REACHABLE_OK — il percorso esiste.");
  say("  Dice che i moduli si caricano, NON che leggono bene: quello e' verify:ics,");
  say("  con il file vero, sulla macchina che ce l'ha.");
  say("");
  process.exit(0);
}
say(`  ICS_REACHABLE_FAILED — ${fallimenti.length} controllo/i: ${fallimenti.join(", ")}`);
say("");
process.exit(1);
