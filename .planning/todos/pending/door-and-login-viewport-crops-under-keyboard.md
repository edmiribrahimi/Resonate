---
created: 2026-09-22
area: nextjs-architecture
phase_hint: 52
source: P-51-1, corsa «prima», osservato dal proprietario su iPhone (Safari, scheda privata)
---

# La porta e il login si ritagliano sotto la tastiera invece di ridimensionarsi

**Osservato il 2026-09-22 su `lab.resonatemotion.com`**, telefono vero, durante
la corsa «prima» di `P-51-1`:

1. `/login`: quando la tastiera sale per email e password la pagina viene
   **ritagliata** (la parte bassa sparisce), non ridimensionata. Il pulsante
   «Sign In» resta visibile solo perche' sta in alto.
2. La porta, campo «Search by name…»: stessa cosa. Con la tastiera aperta la
   riga dell'invitato e il suo pulsante «Check in» finiscono **sotto** la barra
   degli strumenti di Safari e la tastiera, mezzi coperti.

**Perche' conta.** Alla porta si cerca per nome con una mano e una fila davanti:
un pulsante mezzo coperto e' un tocco mancato. E' un difetto di viewport
(`interactive-widget` / `100dvh` contro `100vh`, o un contenitore a altezza
fissa), non di logica: lo stesso schermo con la tastiera chiusa e' corretto.

**Dove.** `src/app/(auth)/login/**` e `src/app/(admin)/admin/scanner/ScannerClient.tsx`
(campo di ricerca). Da verificare su iOS Safari con `interactive-widget=resizes-content`
nel `viewport` e con `dvh` al posto di `vh`; prova manuale con la tastiera
aperta, nessun test automatico esiste.

**Non e' della fase 51**, che toglie superfici e non ridisegna la porta: va nei
ritocchi della fase 52.
