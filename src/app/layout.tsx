import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Orbitron } from "next/font/google";
import MotionProvider from "@/components/motion/MotionProvider";
import { ToastProvider } from "@/components/toast/ToastContext";
import "./globals.css";

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
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
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={orbitron.variable}>
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
