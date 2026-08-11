import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Inter, Orbitron } from "next/font/google";
import MotionProvider from "@/components/motion/MotionProvider";
import { ToastProvider } from "@/components/toast/ToastContext";
import "./globals.css";

/*
 * Tre ruoli tipografici, e il volto display si applica PER RUOLO — non piu'
 * da `body` (D-40-08, D-40-09):
 *
 *   display      Orbitron   il wordmark e i titoli di pagina, nient'altro
 *   interfaccia  Inter      prosa, etichette, bottoni, testo dei form
 *   dati         mono       sigle, orari, conteggi, ogni cifra
 *
 * I due volti web arrivano qui come CUSTOM PROPERTY, non come className: e'
 * l'opzione `variable` a produrle, e senza di quella `@theme inline` in
 * globals.css punterebbe a un nome che non esiste. Una var() che non risolve
 * non e' un errore: la proprieta' viene semplicemente lasciata cadere, il
 * build resta verde e il prodotto scende in silenzio sulla coda system-ui.
 *
 * Inter — neutrale, molto leggibile in locali con poca luce. La frase viene da
 * src/app/(public)/events/[slug]/menu/page.tsx, dove giustificava una deroga
 * locale: e' l'argomento su cui poggia D-40-08, quindi viene promossa a tutto
 * il prodotto invece di essere moltiplicata pagina per pagina.
 *
 * L'opzione `display` vale swap ed e' una DECISIONE, non un'eredita'
 * (40-UI-SPEC.md §5.2): `optional` eviterebbe lo scambio di volto ma su una
 * prima connessione lenta puo' lasciare il carattere non applicato affatto.
 * Alla porta un testo subito leggibile in fallback batte un testo che forse e'
 * perfetto e forse e' assente — l'asimmetria di `checkin-offline.md` applicata
 * a un carattere.
 *
 * D-40-10 — LA SOSTITUZIONE E' SCRITTA, NON FATTA IN SILENZIO.
 * 36-VISUAL-SOURCE.md:101 nomina per il sans "Avenir Next / Helvetica Neue /
 * system-ui". Avenir Next e' un volto di SISTEMA Apple: c'e' sulla macchina su
 * cui gira lo strumento interno, non sui dispositivi di chi visita un prodotto
 * web. Inter e' la sostituzione — era gia' una dipendenza di questo repository
 * ed era gia' stata scelta una volta, per la ragione giusta. Scritto qui
 * perche' nessuno "ripristini" un volto che non era mai stato raggiungibile.
 */
const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
});

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://resonatemotion.com"),
  // `re:sonate` con la e normale, ovunque un motore di ricerca, un lettore di
  // schermo o un'anteprima di link possa leggerlo. La `ɘ` (U+0258) e' un segno
  // disegnato che vive solo dentro il logo — `brand-visual-system.md`, gate
  // *grafia del brand*. In un `title` produce un nome che la ricerca non trova
  // e uno screen reader pronuncia come un fonema.
  title: "re:sonate",
  description: "motion music hub",
  manifest: "/manifest.json",
  openGraph: {
    title: "re:sonate",
    description: "motion music hub",
    images: [{ url: "/images/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "re:sonate",
    description: "motion music hub",
    images: ["/images/og-image.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "re:sonate",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Il colore della cornice del browser, dipinto PRIMA che qualunque foglio di
  // stile sia caricato — ed e' la ragione per cui nessuna conversione di
  // superficie potra' mai raggiungerlo (40-UI-SPEC.md §6.3, difetto F3). Il
  // valore e' `--ground`, il fondo del prodotto: tenerlo sul nero della
  // generazione precedente significa una cucitura visibile a ogni avvio.
  themeColor: "#0A0712",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${orbitron.variable} ${inter.variable}`}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className="min-h-dvh antialiased">
        <MotionProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </MotionProvider>
        <Script
          src="https://gateway.sumup.com/gateway/ecom/card/v2/sdk.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
