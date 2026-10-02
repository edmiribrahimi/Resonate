# Fase 52.1 — reperti differiti

Reperti trovati durante l'esecuzione dei piani e **non** riparati dentro il
piano che li ha trovati (fuori dal suo perimetro). Ognuno porta dove e' stato
misurato; la decisione su cosa farne e' del proprietario o di un piano futuro.

## Dal piano 52.1-22 (corsa U4, 2026-10-02, laboratorio)

### D22-1 — la porta si riaccende ~3 s, 33 s dopo il ritorno della radio

- **Dove:** `src/app/(admin)/admin/scanner/ScannerClient.tsx` — `channelLive`
  e il canale realtime ricostruito dopo `online` (piano 52.1-14).
- **Misura:** Android emulato, 2 corse su 2 osservate: avviso «Live updates are
  paused …» e pallino di Alerts accesi da `online`+33/34 s a +36/37 s, poi
  stabili per 3 minuti. ESITI §«Corsa U4 — la porta con i telefoni», P-521-H.
- **Verso:** prudente (nessun rifiuto, «let them in»). Costo: un falso avviso
  che insegna a non leggere l'avviso.
- **Cosa decidere:** se il secondo ricollegamento del canale debba avere una
  tolleranza prima di abbassare `channelLive`, o se va bene cosi'. Tocca la
  porta: analisi d'impatto prima.

### D22-2 — l'avviso visibile e' una regione live che rilegge se stesso

- **Dove:** l'avviso della guest list in testata ha `role="status"` (implica
  `aria-live="polite"`) e porta l'eta' della lista nel testo («updated 25s ago»).
- **Misura:** TalkBack 15 sull'Android emulato: 16 letture dell'avviso intero
  in 75 s di aereo (a coppie ogni ~5 s nel primo minuto, poi una al minuto);
  13 annunci in 20 s con Alerts aperta. ESITI §WR-05.
- **Cosa decidere:** togliere la semantica live all'avviso visibile (l'annuncio
  ce l'ha gia' la regione sr-only di WR-05) o togliere l'eta' dal testo
  annunciato. Non cambia l'ammissione; e' accessibilita' della porta.

### D22-3 — la riscansione dello stesso QR spinge l'ammissione fuori da Recent

- **Dove:** lo scanner riprende dopo il flash e Recent tiene cinque righe.
- **Misura:** QR lasciato davanti alla «fotocamera» dopo l'ammissione: 10 righe
  `already_recorded` in 26 s; l'ammissione vera esce da Recent e non si annulla
  piu' da li'; le righe dicono «Recorded at … by Unknown» anche per un ingresso
  fatto dallo stesso dispositivo. ESITI §P-521-I, P-52-E 6.
- **Cosa decidere:** se le ripetizioni dello stesso codice entro pochi secondi
  debbano fondersi in Recent (o non entrarci), e cosa deve dire «by» per lo
  stesso dispositivo. Tocca la porta: analisi d'impatto prima.

### D22-4 — i colori dei format nel catalogo del laboratorio

- **Misura:** `formats.color` sul laboratorio: RamaDub `#FF7A2F` (non
  `#6E8BFF`), MotionLab con un colore (invece di neutro), il format del tramonto
  ancora `listed`. Visibile sul chip RamaDub di `/events`.
- **Non misurato:** la produzione (fuori dal perimetro della corsa). Se porta
  gli stessi valori, e' `brand-visual-system.md`, gate *il colore non si
  eredita*, violato su una superficie pubblica.
