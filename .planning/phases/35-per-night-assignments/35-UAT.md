---
status: partial
deferred_by: owner decision, 2026-08-09 — reaffirming decision 12 of 2026-08-06
phase: 35-per-night-assignments
source:
  - 35-HUMAN-UAT.md
  - 35-VERIFICATION.md
started: 2026-08-09
updated: 2026-08-09
---

# Fase 35 — sessione UAT

> **I test non sono generati dai SUMMARY.** Sono le tredici procedure già scritte
> in `35-HUMAN-UAT.md`, che questa sessione esegue e registra. Generarne una
> seconda versione avrebbe prodotto due liste di prove per la stessa fase — e due
> liste sono due risposte che aspettano di litigare.

## L'ordine, e perché non è quello dei numeri

Le prove sono ordinate per **chiusura della finestra**, non per numero. Quattro
hanno una finestra; nove no. Una lista in cui tutto è urgente è una lista in cui
niente lo è, quindi l'urgenza sta solo dove è reale.

| Ordine | Prova | Finestra | Perché qui |
|---|---|---|---|
| 1 | **12** — upgrade IndexedDB v4 → v5 su coda piena | **si sta chiudendo** | L'unica irreversibile della fase: il fallimento perde presenze già pagate, in silenzio |
| 2 | **10** — i metadati escono dal file | prima del primo caricamento da una sede segreta | Il fallimento è una rivelazione di sede in corso, e non ha rollback |
| 3 | **7** — staff assegnato raggiunge lo scanner | prima della prima serata reale | Altrimenti si scopre davanti a una fila, alle due di notte |
| 4 | **11** casi A/B — la scansione riceve la notte | nessuna (il caso C è perso) | — |
| 5–13 | 1, 2, 3, 4, 5, 6, 8, 9, 13 | nessuna | Seguono la decisione del proprietario |

## Rimandato per decisione del proprietario — 2026-08-09

Le prove manuali di questo file si eseguono **tutte insieme alla fine della
v1.5**, non ora. È la conferma della decisione 12 del 2026-08-06, già registrata
in `43-CONTEXT.md`: la costruzione prosegue attraverso 33, 43, 35, 34 e le
restanti, e la verifica a mano avviene alla fine.

**Il prezzo, scritto qui perché a fine v1.5 nessuno se lo ricorderà.** Nove di
queste prove non hanno finestra e si eseguiranno esattamente come sono scritte.
**Tre no** — e per quelle rimandare non è rimandare, è perdere:

| Prova | Muore quando | Cosa resta impossibile da osservare |
|---|---|---|
| **12** — upgrade IndexedDB v4 → v5 su coda piena | l'ultimo telefono della porta aggiorna il bundle | Lo stato «coda piena su v4» non è più costruibile senza reinstallare un bundle vecchio. È **l'unica irreversibile della fase**: il suo fallimento perde presenze già pagate, in silenzio, senza error tracking |
| **10** — i metadati escono dal file | un fotografo assegnato carica il primo file da dentro una sede segreta | Prima costa un file di test; dopo costa una sede, e `venue-secrecy.md` non ha rollback |
| **7** — staff assegnato raggiunge lo scanner | la prima serata reale | Non è irreversibile: è che si scoprirebbe davanti a una fila, alle due di notte |

A fine v1.5 queste tre esisteranno ancora come righe di un elenco. Non ci sarà
più niente da guardare. **Registrato, non contestato** — la decisione è del
proprietario e la costruzione prosegue.

## Current Test

[rimandato — sessione riaperta a fine v1.5]

number: 1
name: Prova 12 — l'upgrade di IndexedDB v4 → v5 su una coda non vuota
expected: |
  Precondizione da accertare per prima: esiste ancora un telefono con il bundle
  PRECEDENTE installato (`DB_VERSION` 4)? Se nessun dispositivo della porta lo ha
  più, la finestra è chiusa e la prova va registrata come tale — non come passata.

  Se il telefono c'è: con il bundle vecchio, aprire `/admin/scanner`, scegliere
  una notte, attendere la lista. In modalità aereo scansionare DUE biglietti —
  due flash verdi, chip `Pending (2)`. Chiudere l'app del tutto. Tornare online
  solo il tempo di aggiornare il service worker, e rimettere in aereo PRIMA di
  riaprire lo scanner. Riaprire: il chip deve dire ancora `Pending (2)`, la
  versione del database deve essere 5, e `pendingCheckins` deve contenere due
  righe con i loro `scannedAt` ORIGINALI. Tornare online: i due ingressi
  compaiono in `door_scan_events` con `source = 'offline_sync'`.
awaiting: user response

## Tests

### 1. Prova 12 — upgrade IndexedDB v4 → v5 su una coda non vuota
requisiti: ASSIGN-02, ASSIGN-08
finestra: irreversibile — prima della prima serata reale e prima che i telefoni della porta aggiornino il bundle
expected: chip ancora `Pending (2)` dopo l'upgrade; versione 5; due righe con `scannedAt` originali; drain corretto con `source = 'offline_sync'`
result: [pending]

### 2. Prova 10 — i metadati escono davvero dal file
requisiti: venue-secrecy
finestra: prima che un fotografo assegnato carichi il primo file da dentro una sede segreta
expected: nessuna coordinata GPS, data di scatto o modello di telefono nell'oggetto scaricato dall'URL pubblico; orientamento preservato; video verso sede segreta rifiutato
result: [pending]

### 3. Prova 7 — una persona `staff` assegnata alla porta RAGGIUNGE lo scanner
requisiti: ASSIGN-01
finestra: prima della prima serata reale
expected: rimbalzo senza assegnazione; ingresso con assegnazione; tre cause di rimbalzo distinte su tre schermate distinte
result: [pending]

### 4. Prova 11 casi A/B — la scansione riceve la notte
requisiti: ASSIGN-01, ASSIGN-08
expected: l'assegnatario scansiona la propria notte; è rifiutato con `door_night_other_night` su un'altra notte
result: [pending]
nota: il caso C è perso — vedi test 14

### 5. Prova 1 — la notte finita, su un dispositivo che non vede la rete da ore
expected: il bottone QR Scan sparisce dopo `ends_at` ma nessuna voce di coda sparisce; «Scan anyway» la fa tornare; una deriva dell'orologio non rifiuta mai una scansione
result: [pending]

### 6. Prova 2 — una scansione in coda non resta appesa quando l'assegnazione viene revocata
expected: il drain giudica a `scannedAt`; la voce si risolve invece di finire in `blocked`; la riga di `party_assignments` resta con `revoked_at` valorizzato
result: [pending]

### 7. Prova 3 — il rifiuto arriva come frase distinguibile
expected: 403 con `door_supervision_required` in build di produzione, non un messaggio generico
result: [pending]

### 8. Prova 4 — l'annullamento locale con la radio spenta non aggira la supervisione
expected: radio spenta, l'undo locale rifiuta ad alta voce con lo stesso motivo, senza toccare la coda
result: [pending]

### 9. Prova 5 — l'autorizzazione si risolve una volta sola
result: [pending]

### 10. Prova 6 — la superficie delle assegnazioni fa quello che dice
result: [pending]

### 11. Prova 8 — l'assegnazione «photo» sblocca il caricamento, e su UNA notte sola
result: [pending]

### 12. Prova 9 — l'organizer di una notte, e il gate che deve poter fallire
result: [pending]

### 13. Prova 13 — la demozione bloccata, e il suo percorso d'uscita
result: [pending]

### 14. Prova 11 caso C — 503 nella finestra fra deploy e coda
expected: nessun 503 nella finestra fra il deploy del codice e l'applicazione della riga 8
result: window-closed
reason: |
  La finestra esisteva solo fra il deploy del codice e l'applicazione della riga 8
  (`20260809001000_assignment_resolver.sql`). La regola del progetto — le migration
  prima, il codice dopo — è stata rispettata, quindi quella finestra non si è mai
  aperta. `35-HUMAN-UAT.md` lo aveva scritto in anticipo: «applicando la coda per
  prima il caso C non è rimandato, è perso». Registrato come perso e non come
  saltato: un test saltato si può rifare, questo no.

## Summary

total: 14
passed: 0
issues: 0
pending: 13
skipped: 0
window_closed: 1

## Gaps

[nessuno ancora]
