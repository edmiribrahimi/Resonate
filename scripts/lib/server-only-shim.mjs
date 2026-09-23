/**
 * server-only-shim.mjs — fa caricare a uno script Node un modulo del prodotto
 * che si apre con `import "server-only"`, risolvendo QUEL SOLO specificatore al
 * modulo vuoto che Next stesso usa lato server.
 *
 * COSA ASSERISCE, in una frase: dopo `await import("./lib/server-only-shim.mjs")`
 * lo specificatore esatto `server-only` si risolve a
 * `node_modules/next/dist/compiled/server-only/empty.js`, e ogni altro
 * specificatore passa intatto alla risoluzione di Node.
 *
 * ── PERCHE' ESISTE (52-PATTERNS P4, nodo 1; D-52-31) ─────────────────────────
 * Lo strumento di ri-spogliatura (`scripts/restrip-event-media.mjs`) deve usare
 * lo stripper DEL PRODOTTO — `src/lib/media/strip-metadata.ts`,
 * `stripImageMetadata` — e non una sua imitazione: una seconda copia della
 * chiamata a `sharp` e' «la seconda copia di un ordine», il modo in cui si smette
 * di spogliare nella copia che nessuno legge (`src/lib/media/finalize.ts`, testa
 * del file). Node 25 esegue il `.ts` con il type stripping nativo; l'unico
 * ostacolo e' la prima riga dello stripper, `import "server-only"`, che:
 *   - alla radice di `node_modules` NON e' installato (non e' una dipendenza
 *     dichiarata: Next lo porta dentro `next/dist/compiled/`);
 *   - anche se lo fosse, fuori dalla condizione `react-server` risolve a
 *     `index.js`, che LANCIA per costruzione.
 *
 * ── PERCHE' NON SI INSTALLA IL PACCHETTO `server-only` ──────────────────────
 * Cambierebbe `package.json` e il lockfile del prodotto per servire uno script
 * una-tantum, e non basterebbe comunque (vedi sopra: il suo `default` lancia).
 * Nessun `npm install` in questa fase (threat T-52-SC).
 *
 * ── COSA QUESTO HOOK NON E' ─────────────────────────────────────────────────
 * Non e' un modo di importare codice server in un bundle client. Il hook vale
 * SOLO nel processo Node che importa questo file esplicitamente, come prima
 * riga eseguita; il build di Next non lo vede, nessun file sotto `src/` lo
 * importa, e il marcatore `server-only` resta pienamente attivo nel bundle del
 * browser. Il suo unico effetto e' dire a UN processo Node, lanciato a mano da
 * chi esegue uno script, che il marcatore «solo server» e' soddisfatto — cosa
 * vera, perche' uno script Node e' un server.
 *
 * ── PERCHE' `register()` E UN `data:` URL ───────────────────────────────────
 * Il hook di risoluzione deve vivere in un modulo proprio (gira sul thread dei
 * loader). Scriverlo inline in un `data:` URL tiene tutto in questo file: un
 * secondo file sarebbe un secondo posto dove il perimetro del hook puo'
 * allargarsi senza che chi legge lo script lo veda.
 */

import { register } from "node:module";
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const EMPTY = resolve(
  HERE,
  "../../node_modules/next/dist/compiled/server-only/empty.js"
);

if (!existsSync(EMPTY)) {
  // Un hook che punta a un file inesistente farebbe fallire l'import dello
  // stripper con un errore di risoluzione generico, lontano da qui. Meglio dirlo
  // subito, con la sua categoria.
  console.error(
    "[server-only-shim.target_missing] next/dist/compiled/server-only/empty.js " +
      "non esiste in node_modules: il hook non ha un bersaglio. Nessun ripiego."
  );
  process.exit(1);
}

const EMPTY_URL = pathToFileURL(EMPTY).href;

// Il hook: SOLO lo specificatore esatto `server-only`. Nessun prefisso, nessuna
// espressione regolare, nessun `startsWith`: ogni altro specificatore delega a
// `nextResolve` senza essere toccato.
const HOOK_SOURCE = `
const EMPTY_URL = ${JSON.stringify(EMPTY_URL)};
export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") {
    return { url: EMPTY_URL, format: "commonjs", shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
`;

register(
  `data:text/javascript,${encodeURIComponent(HOOK_SOURCE)}`,
  import.meta.url
);
