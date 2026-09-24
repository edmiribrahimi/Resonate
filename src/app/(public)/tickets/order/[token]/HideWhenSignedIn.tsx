"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Rende i figli solo se nel browser NON c'e' una sessione.
 *
 * Serve al riquadro «Complete your account» della pagina ordine: chi ha
 * comprato da loggato (2026-09-24) apre quella pagina da dentro il suo
 * account, e invitarlo a completarlo e' un messaggio falso. La pagina che lo
 * monta e' un link al portatore e **per costruzione non legge la sessione**
 * (controllo G4 di `verify:venue-surfaces`): la domanda si fa qui, nel
 * browser, e la risposta nasconde un riquadro e nient'altro. Nessun dato
 * dell'ordine entra in questo componente.
 *
 * Finche' la risposta non c'e' non si rende nulla, cosi' chi e' loggato non
 * vede il riquadro comparire e sparire. Se la lettura fallisce si rende: il
 * riquadro e' innocuo per chi un account ce l'ha, e utile a chi non ce l'ha.
 */
export default function HideWhenSignedIn({ children }: { children: ReactNode }) {
  const [show, setShow] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (!cancelled) setShow(!data.user);
      })
      .catch(() => {
        if (!cancelled) setShow(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (show !== true) return null;
  return <>{children}</>;
}
