import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

/**
 * La palette delle mail e' quella dell'app, copiata a valore.
 *
 * Una mail non legge `globals.css`, quindi i token si trascrivono: `--ground`,
 * `--ink`, `--accent`, `--surface`, `--muted` (`src/app/globals.css`), e il bordo
 * e' `--line` (rgba 13 %) appiattito sul fondo della card, perche' i client di
 * posta non compongono l'alfa in modo affidabile. Fino al 2026-09-21 qui stava
 * un rosso corallo (`#e5484d`) che non e' mai stato un colore del brand: il
 * proprietario l'ha visto sulla mail dell'ordine, e il confronto col token ha
 * dato ragione a lui. Se un token cambia, si cambia **qui** nello stesso commit.
 *
 * `onAccent` e' il testo sopra l'accento, **scuro come nell'app** (`Button.tsx`,
 * `bg-accent text-ground`): il bianco su `#FF5C93` sta sotto 3:1.
 */
export const BRAND = {
  background: "#0A0712",
  foreground: "#F3ECFA",
  accent: "#FF5C93",
  onAccent: "#0A0712",
  card: "#140D20",
  cardBorder: "#2C2340",
  muted: "#A493C0",
} as const;

/**
 * `logo-email.png`, non `logo-white.png`: il logo bianco e' un PNG trasparente,
 * e Gmail su iPhone in modalita' scura **inverte i colori della mail** — il
 * fondo `#0A0712` diventa quasi bianco — ma **non tocca le immagini**. Un logo
 * bianco trasparente su quel fondo invertito sparisce. Visto dal proprietario
 * il 2026-09-21 su una mail di prova. La versione per le mail porta il fondo
 * del brand **dentro il PNG**, opaco, con un margine: cosi' resta un blocco
 * scuro con il logo bianco in entrambe le modalita'. 816 px di larghezza per
 * 180 px resi, cioe' nitido anche su schermo retina.
 */
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.resonatemotion.com";

const LOGO_URL = `${APP_URL}/images/logo-email.png`;

/** I link del footer: colore del testo attenuato, sottolineati perche' in una mail il colore da solo non dice «link». */
const FOOTER_LINK = {
  color: BRAND.muted,
  textDecoration: "underline",
} as const;

interface EmailLayoutProps {
  preview: string;
  children: React.ReactNode;
}

export function EmailLayout({ preview, children }: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: BRAND.background,
          fontFamily: "'Orbitron', 'Arial', sans-serif",
          margin: 0,
          padding: 0,
        }}
      >
        <Container
          style={{
            maxWidth: "560px",
            margin: "0 auto",
            padding: "40px 20px",
          }}
        >
          {/* Logo */}
          <Section style={{ textAlign: "center" as const, marginBottom: "32px" }}>
            <Img
              src={LOGO_URL}
              alt="re:sonate"
              width="180"
              style={{ margin: "0 auto", display: "block" }}
            />
          </Section>

          {/* Content Card */}
          <Section
            style={{
              backgroundColor: BRAND.card,
              border: `1px solid ${BRAND.cardBorder}`,
              borderRadius: "12px",
              padding: "32px",
            }}
          >
            {children}
          </Section>

          {/*
            Footer — lo stesso del sito (`src/components/legal/SiteFooter.tsx`),
            decisione del proprietario del 2026-09-24: quattro voci legali, il
            profilo Instagram come link nativo e non come handle stampato,
            l'anno del render. La mail non puo' importare il componente del sito
            (client React, Tailwind), quindi le voci sono ripetute qui: chi
            cambia il footer del sito cambia anche questo.
          */}
          <Section style={{ textAlign: "center" as const, marginTop: "32px" }}>
            <Hr style={{ borderColor: BRAND.cardBorder }} />
            <Text
              style={{
                color: BRAND.muted,
                fontSize: "12px",
                lineHeight: "1.8",
                margin: "12px 0 0",
              }}
            >
              <Link href={`${APP_URL}/terms`} style={FOOTER_LINK}>Terms</Link>
              {"  ·  "}
              <Link href={`${APP_URL}/refunds`} style={FOOTER_LINK}>Refund policy</Link>
              {"  ·  "}
              <Link href={`${APP_URL}/privacy`} style={FOOTER_LINK}>Privacy</Link>
              {"  ·  "}
              <Link href="mailto:info@resonatemotion.com" style={FOOTER_LINK}>Contact</Link>
            </Text>
            <Text
              style={{
                color: BRAND.muted,
                fontSize: "12px",
                lineHeight: "1.8",
                margin: "4px 0 0",
              }}
            >
              <Link href="https://www.instagram.com/resonatemotion" style={FOOTER_LINK}>
                Follow us on Instagram
              </Link>
            </Text>
            <Text
              style={{
                color: BRAND.muted,
                fontSize: "12px",
                lineHeight: "1.5",
                margin: "12px 0 0",
              }}
            >
              &copy; {new Date().getFullYear()} re:sonate. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
