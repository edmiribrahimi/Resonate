import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

export const BRAND = {
  background: "#0a0a0a",
  foreground: "#ededed",
  accent: "#e5484d",
  card: "#141414",
  cardBorder: "#262626",
  muted: "#a1a1aa",
} as const;

const LOGO_URL = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/images/logo-white.png`
  : "https://resonate.app/images/logo-white.png";

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
              alt="Resonate"
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

          {/* Footer */}
          <Section style={{ textAlign: "center" as const, marginTop: "32px" }}>
            <Hr style={{ borderColor: BRAND.cardBorder }} />
            <Text
              style={{
                color: BRAND.muted,
                fontSize: "12px",
                lineHeight: "1.5",
              }}
            >
              Resonate Music Events Community
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
