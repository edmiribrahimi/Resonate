import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // Off, and this is a behaviour change rather than tidying. When on, a client
  // hook patches history.pushState/replaceState and posts each URL to a
  // dedicated worker, which writes STRAIGHT into caches.open("pages") — past
  // doorRuntimeCaching and defaultCache both, so even a route this repository
  // deliberately made NetworkOnly could acquire a document copy that way. And
  // `if (isPageCached) return;` means a document written under the old release
  // is NEVER rewritten: it is the second route to a document outliving the
  // stylesheet it names, which the activate purge in sw.ts closes on the first.
  // It was never a decision — the library default is false
  // (@serwist/next/dist/lib/types.d.ts) and, unlike its neighbour below, it
  // carried no written reason, which is the evidence it was inherited.
  // What it costs: documents reached only by client-side navigation are no
  // longer pre-warmed for offline. Small here — /events/* is already
  // NetworkOnly (sw.ts:110-113) and the door is warmed by an explicit online
  // visit (checkin-offline.md:57) — but real, and it belongs in the file.
  // Second-order effect: shouldBuildSWEntryWorker = cacheOnNavigation, so
  // public/swe-worker-*.js stops being generated and leaves the precache.
  cacheOnNavigation: false,
  // Deliberately false, not defaulted. On the door device a reload when the
  // signal returns tears down the camera stream, the selected party and the
  // in-memory undo list (ScannerClient's scanHistory) while entries are still
  // queued — and that undo list is the door's only correction mechanism.
  reloadOnOnline: false,
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  typedRoutes: true,
  turbopack: {},
  // The visual section publishes the capitolato's palette, and D-45-09 says it
  // READS those values from the token file instead of restating them — six
  // colours written twice are six colours that diverge, and
  // `verify:semantic-separation` check B forbids the second copy outright.
  //
  // So `src/lib/production/sections/tokens.ts` opens `src/app/globals.css` at
  // run time. A stylesheet is an input to the build, not an output of it, so
  // nothing would otherwise put it beside the server bundle: file tracing
  // follows imports, and this is a `readFileSync` of a path assembled from
  // `process.cwd()`. Naming it here is what makes the read succeed in
  // production rather than in development only.
  //
  // If this line is ever removed the failure is DECLARED — the reader returns
  // `token_file_unreadable` and the page prints it — because a palette that
  // silently came back empty would be a void nobody declared, on the one page
  // whose subject is that a void must declare itself.
  outputFileTracingIncludes: {
    "/admin/visual": ["./src/app/globals.css"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  async redirects() {
    // ── L'alias italiano dell'iscrizione e' uscito da qui (fase 50, D-50-11) ─
    //
    // **Erano quattro voci, sono tre.** La quarta era la coppia italiano →
    // inglese della pagina d'iscrizione, `permanent: true` come le altre, e se
    // ne va insieme alla pagina che puntava: quell'indirizzo risponde 404,
    // quindi un rimando verso di lui prometterebbe una porta che non c'e' piu'.
    //
    // **Il fatto che va dichiarato e non scoperto.** `permanent: true` emette un
    // **308**, e un 308 lo **memorizza il browser**: chi ha seguito quell'alias
    // anche una sola volta continuera' a essere mandato sulla pagina cancellata
    // **dalla propria cache**, anche dopo questa rimozione, finche' non la
    // svuota o l'ingresso non scade. Non e' un difetto di questa modifica — e'
    // la proprieta' di un redirect permanente — e si accetta dichiarandola
    // (T-50-28, disposizione `accept`): l'esito per quella persona e' un 404,
    // non un percorso sbagliato che la porta da qualche altra parte. **`P-50-1`
    // lo prova da un browser che l'aveva seguito**, non da uno pulito, che non
    // direbbe nulla.
    //
    // Il service worker non c'entra e non aiuta: `src/app/sw.ts:129-158`
    // cancella ogni documento in cache a ogni rilascio, quindi il rischio
    // residuo e' il **solo** ingresso di redirect HTTP del browser.
    //
    // ── E l'alias dello storico e' uscito qui (fase 51, MEM-02) ─────────────
    //
    // **Erano tre voci, sono due.** La terza era la coppia italiano → inglese
    // dello storico di chi e' stato alle serate, cancellato in questo stesso
    // piano: se ne va con la pagina che puntava, per la ragione gia' scritta
    // qui sopra — un rimando verso un indirizzo che risponde 404 promette una
    // porta che non c'e'.
    //
    // **Il costo e' lo stesso di `T-50-28`, e si dichiara invece di scoprirlo.**
    // Chi ha seguito quell'alias anche una sola volta continuera' a essere
    // mandato sulla pagina cancellata **dalla propria cache**, e ricevera' un
    // 404. Disposizione `accept` (`T-51-17`): e' la proprieta' di un 308, non
    // un difetto di questa modifica, e l'esito per quella persona e' una pagina
    // che non esiste — non un percorso che la porta da qualche altra parte.
    //
    // **Nessun letterale rimosso resta scritto qui**, ne' in questo paragrafo
    // ne' in quello della fase 50: questa funzione e' l'elenco di cio' che
    // viene rimandato, e un `grep` su di essa deve rispondere *«questo alias e'
    // servito?»*, non trovare il necrologio di uno che non lo e' piu'.
    //
    // ── E QUI E' ENTRATA LA TERZA, CHE NON E' UN ALIAS (fase 51, D-51-09b) ──
    //
    // **Erano due voci, sono tre**, e la terza non ha la forma delle altre. Le
    // due sopra sono coppie italiano → inglese: due nomi per la stessa pagina.
    // Questa e' **un indirizzo che si e' spostato** — la pagina dell'account e'
    // passata da `/dashboard` a `/account`, e questa voce e' cio' che tiene
    // vivo il vecchio.
    //
    // ⚠ **E' questa voce a tenere `/dashboard` dentro l'union di
    // `typedRoutes`, ed e' la ragione per cui i circa quaranta rifiuti delle
    // superfici di lavoro non sono stati toccati.** Misurato, non dedotto: i
    // `source` dei redirect dichiarati qui entrano fra i percorsi validi
    // (`.next/types/routes.d.ts`, `type RedirectRoutes`), quindi ogni
    // `redirect("/dashboard")` sotto `src/app/(admin)/admin/(work)/` continua a
    // compilare e resta **un** rifiuto solo. Misurato anche nell'altro verso,
    // spostando la pagina prima di scrivere questa riga: il build si e' fermato
    // su `artists/page.tsx:73` con *«Argument of type "/dashboard" is not
    // assignable»*. Togliere questa voce senza riscrivere quei quaranta siti
    // **rompe il build**, e non in silenzio — e' il verso buono in cui fallire.
    //
    // **Il costo, dichiarato e non scoperto, ed e' lo stesso di `T-50-28`.**
    // `permanent: true` emette un **308**, e un 308 lo **memorizza il browser**:
    // chi apre il vecchio indirizzo anche una sola volta continuera' a essere
    // mandato su quello nuovo **dalla propria cache**, anche se un giorno si
    // volesse tornare indietro. Disposizione `accept` (`T-51-24`). A differenza
    // dei due casi qui sopra, pero', l'esito per quella persona **non e' un
    // 404**: e' la pagina giusta al nuovo indirizzo, cioe' esattamente cio' che
    // il redirect promette. E' il motivo per cui qui la disposizione si accetta
    // senza riserve.
    //
    // **Ordine, perche' decide cosa vede un anonimo.** I redirect di questo file
    // girano **prima** del middleware: chi non ha sessione e digita il vecchio
    // indirizzo riceve 308 verso quello nuovo, e **poi** il rimbalzo a `/login`
    // con `next=/account`. Per questo `/account` sta in `NEXT_ALLOW_LIST`
    // **e** in `PROTECTED_PREFIXES` — le due liste in `src/lib/routes/
    // next-redirect.ts`, dove la ragione e' scritta per esteso.
    return [
      { source: "/eventi/:path*", destination: "/events/:path*", permanent: true },
      { source: "/galleria", destination: "/gallery", permanent: true },
      { source: "/dashboard", destination: "/account", permanent: true },
    ];
  },
};

export default withSerwist(nextConfig);
