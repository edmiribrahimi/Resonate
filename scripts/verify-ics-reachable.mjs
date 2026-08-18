/**
 * verify-ics-reachable — i moduli del lettore del calendario esistono e si caricano
 *
 * QUELLO CHE ASSERISCE, in una frase: **i sei moduli sotto
 * `src/lib/production/ics/` esistono e il loro barrel si importa**, su qualunque
 * macchina, senza aprire `docs/` e senza toccare un database.
 *
 * ── PERCHE' ESISTE, e non e' un doppione di `verify:ics` ─────────────────────
 *
 * Reperto **B-2** dell'audit di milestone della v1.5, 2026-08-19.
 *
 * Quei moduli **non hanno alcun importatore statico**. L'unico consumatore e'
 * `scripts/import-production-calendar.mjs`, con un `await import()` il cui
 * percorso e' costruito a runtime:
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
 *   0  i sei file ci sono e il barrel si importa
 *   1  FALLIMENTO — un file manca, o l'import solleva
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

/** I moduli attesi. Il barrel per ultimo: e' quello che importa gli altri. */
const MODULI = ["parse", "unfold", "classify", "reconcile", "vocabulary", "index"];

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
 * Gli otto simboli che `scripts/import-production-calendar.mjs` chiama per nome.
 *
 * **Letti dal consumatore, non ricordati.** La prima stesura di questo file ne
 * aveva inventati tre — `parseCalendar`, `classifyEvent`, `reconcile` — e due su
 * tre non esistevano. Il controllo C li ha bocciati, ed e' esattamente il verso
 * in cui doveva fallire: un elenco inventato che fosse passato per caso avrebbe
 * difeso nomi che nessuno chiama.
 *
 * Presi con: `grep -oE "ics\.[a-zA-Z_]+" scripts/import-production-calendar.mjs`
 */
const attesi = [
  "MAX_INPUT_BYTES",
  "MAX_INPUT_LINES",
  "PIECE_KIND_LABELS",
  "classifyEntries",
  "isEmptyPlan",
  "joinKey",
  "parseIcs",
  "reconcile",
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
      say(`  ✓ C  tutti gli ${attesi.length} simboli che lo script dell'import chiama sono esportati`);
    } else {
      say(`  ✗ C  simboli attesi e non esportati: ${assenti.join(", ")}`);
      say("         scripts/import-production-calendar.mjs li chiama per nome:");
      say("         un rinominio qui e' un errore a runtime, la' e nient'altro.");
      fallimenti.push("C");
    }
  } catch (error) {
    say(`  ✗ B  il barrel non si importa: ${error.message}`);
    say("         L'unico consumatore di questi moduli e' un import() costruito a");
    say("         runtime dentro scripts/import-production-calendar.mjs. Se non si");
    say("         caricano, l'import del calendario e' rotto e nient'altro lo dice.");
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
