---
created: 2026-09-22
area: checkin-offline, nextjs-architecture
phase_hint: 52
source: il proprietario, durante la corsa «dopo» di P-51-1 (fase 51)
---

# La porta: «Recent scans» e gli avvisi in due linguette proprie

**Chiesto dal proprietario il 2026-09-22**, guardando la schermata della porta
dopo un drenaggio: la lista «RECENT SCANS» e i riquadri di avviso (lista non
aggiornata, voci trattenute, esito del drenaggio) si accumulano sopra la lista
degli ospiti e la schermata si sporca.

**Cosa vuole**
1. **«Recent scans» diventa una linguetta**, accanto a *All · Not Arrived ·
   Checked In*: la cronologia si apre solo quando serve.
2. **Gli avvisi hanno una linguetta propria**, nello stesso gruppo: il conteggio
   nella linguetta dice quanti ce ne sono; la lista degli ospiti resta pulita.

**Vincoli di dominio da rispettare quando si fa**
- La linguetta degli avvisi **non puo' nascondere** cio' che decide un ingresso
  a radio spenta: la pastiglia «Offline», «Pending (n)» e «Sign in again to
  record n entries» restano in testata, sempre visibili (`checkin-offline.md`,
  zero fallimenti silenziosi). Nella linguetta vanno i **testi** degli avvisi,
  non le pastiglie di stato.
- L'annullamento dalla cronologia (freccia accanto alla riga) deve restare
  raggiungibile con un tocco in piu', non sparire.
- Barra fissa di 51-07: titolo e «QR Scan» restano in vista anche con la
  linguetta della cronologia aperta.

**Non e' della fase 51**: e' un ridisegno della superficie, va nei ritocchi
della fase 52, insieme al todo sul ritaglio sotto la tastiera.
