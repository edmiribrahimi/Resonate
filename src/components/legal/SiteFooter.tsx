import Link from "next/link";

/**
 * Il pie' di pagina delle superfici pubbliche: i tre link legali e il contatto.
 *
 * Aggiunto il 2026-09-21 con le pagine legali: senza un link raggiungibile da
 * ogni pagina che vende, i termini esistono ma non legano nessuno. Sta in fondo
 * al contenuto di `PageShell`, che gia' lascia spazio alla barra di navigazione
 * del telefono. Nessun nome di sede, nessuna ragione sociale (decisione del
 * proprietario, 2026-09-21): solo la tagline e l'indirizzo di contatto.
 */
export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line pt-6 text-xs text-muted">
      <nav className="flex flex-wrap gap-x-4 gap-y-2">
        <Link href="/terms" className="inline-flex min-h-11 items-center hover:text-ink">Terms</Link>
        <Link href="/refunds" className="inline-flex min-h-11 items-center hover:text-ink">Refund policy</Link>
        <Link href="/privacy" className="inline-flex min-h-11 items-center hover:text-ink">Privacy</Link>
        <a href="mailto:info@resonatemotion.com" className="inline-flex min-h-11 items-center hover:text-ink">Contact</a>
      </nav>
      <p className="mt-3">re:sonate motion music hub</p>
    </footer>
  );
}
