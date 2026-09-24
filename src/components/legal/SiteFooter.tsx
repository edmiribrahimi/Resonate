import Link from "next/link";
import Image from "next/image";

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
    <footer className="mt-16 border-t border-line pt-8 text-center text-xs text-muted">
      {/* Centred since 2026-09-24 (owner's request): links and the sign-off
          line sit on the page's axis rather than its left gutter.

          The wordmark above the links is the LOGO — the one place the
          reversed e lives (`brand-visual-system.md`): it is a drawn sign
          inside an image, and the alt text spells the name with a normal e,
          as every text surface does. `logo-white.png` is 3232×914, so 160px
          wide is 45px tall. */}
      <Image
        src="/images/logo-white.png"
        alt="re:sonate motion music hub"
        width={160}
        height={45}
        className="mx-auto mb-5 h-auto w-40 opacity-80"
      />
      <nav className="flex flex-wrap justify-center gap-x-4 gap-y-2">
        <Link href="/terms" className="inline-flex min-h-11 items-center hover:text-ink">Terms</Link>
        <Link href="/refunds" className="inline-flex min-h-11 items-center hover:text-ink">Refund policy</Link>
        <Link href="/privacy" className="inline-flex min-h-11 items-center hover:text-ink">Privacy</Link>
        <a href="mailto:info@resonatemotion.com" className="inline-flex min-h-11 items-center hover:text-ink">Contact</a>
      </nav>
      {/* The year is the render's, so the notice never ages on its own. The
          name is the brand's, not a legal entity's: the association is still
          to be constituted (`legal-compliance.md`), and a notice that named
          one would be claiming something that does not exist yet. */}
      <p className="mt-4">
        &copy; {new Date().getFullYear()} re:sonate. All rights reserved.
      </p>
    </footer>
  );
}
