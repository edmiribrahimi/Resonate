---
phase: 47-il-token-che-si-beve-e-si-fa-rimborsare
plan: 02
subsystem: ticketing-payments / cron
tags: [no-automatic-refund, cleanup-window, dead-code]
requires:
  - "47-03 — la finestra di richiesta, che la pulizia ora aspetta"
provides:
  - "un processo notturno che non muove piu' denaro"
  - "una pulizia che non cancella prima che la finestra sia chiusa"
affects:
  - "47-04 — l'unico rimborso rimasto lo emette una persona"
decisions:
  - "La voce di cron RESTA: la pulizia e' lavoro vero"
  - "Il percorso NON e' rinominato, e la ragione e' scritta sotto"
  - "toSafeError rimosso: senza chiamante era codice morto che sembrava una protezione"
metrics:
  duration: "~30 minuti, 2026-08-20"
  completed: 2026-08-20
  tasks: 3
---

# Fase 47 Piano 02 — Summary

Il solo processo di questo prodotto che restituiva denaro da solo non lo fa piu'.
Restano 252 righe che cancellano righe spese, e **aspettano** che nessuno possa
piu' chiedere nulla su di esse.

## Cosa e' andato via

| | |
|---|---|
| `refundTransaction` nel file | **0** |
| l'esito `cron_refund_refunds_failed` | rimosso, con il suo codice e la sua frase |
| i contatori `refunded` e `refundErrors` | rimossi dal `Record` dei conteggi |
| `getCheckout` | non piu' importato |
| `toSafeError` | rimosso — vedi sotto |

**Il `Record` degli esiti e' stato ridotto nella stessa modifica**, non lasciato
totale su una categoria irraggiungibile: un esito che nessun ramo puo' piu'
restituire e' un ramo morto che sembra vivo, e la totalita' del `Record` — che
esiste per costringere ogni categoria nuova a dichiarare il proprio codice — si
sarebbe svuotata di significato.

## Una decisione registrata che e' rimasta senza oggetto

Il commento in cima estendeva la regola del non-2xx a `refundErrors > 0`, per la
risposta **A** del proprietario in `46-COPY.md`. Quel terzo esito **non esiste
piu'**.

Scritto cosi', in quelle parole: **la decisione non e' stata revocata, e' rimasta
senza oggetto.** Sono due cose diverse, e cancellare la riga avrebbe fatto
sembrare che nessuno l'avesse mai presa — mentre lasciarla intatta avrebbe fatto
cercare a qualcuno un ramo che non c'e'.

## La pulizia aspetta la finestra

Cancellava i token spesi **24 ore** dopo la chiusura del menu. La finestra di
richiesta e' **72 di norma**, e ogni serata puo' cambiarla.

Ora aspetta il **massimo fra le due**, mai il minimo. Il ragionamento stato per
stato, come il piano chiedeva:

| stato | cancellato prima? | ora |
|---|---|---|
| `purchased` | **no**, e non deve — sono le righe su cui si puo' ancora chiedere | invariato |
| `redeemed` | si', a 24h — **e portava via `activation_count`** | aspetta la finestra |
| `refunded` | si', a 24h | aspetta la finestra |

**Il caso `redeemed` era il piu' grave e non era quello che il piano temeva.**
Cancellare a 24 ore avrebbe portato via il conteggio delle attivazioni, cioe'
**il dato che tutta la fase 47 esiste per creare**: chi esamina una richiesta a 70
ore non avrebbe piu' avuto modo di sapere se quel token era stato bevuto.

Il modo di fallire era **silenzioso**: chi chiedeva all'ora 70 avrebbe letto
*«questo drink non risulta più fra i nostri»* — vero, e colpa nostra.

Il `?? 72` sulla lettura non e' un default di comodo: la colonna e' `NOT NULL
DEFAULT 72`, quindi un null li' significa che la lettura non l'ha portata, e in
quel caso si aspetta **il piu' a lungo**, non il meno.

## `toSafeError`, e perche' rimuoverlo invece di lasciarlo

Restringeva un valore catturato a `code` e `message` prima di un log. Il suo
unico chiamante era il `catch` del ramo di rimborso. Senza chiamante era **codice
morto che sembrava una protezione attiva**, e su un percorso del denaro quello e'
peggio che altrove: chi legge il file conta una difesa in piu' di quelle che ci
sono.

Al suo posto c'e' una nota che conserva la lezione — il campo `details` di un
errore PostgREST, su una violazione di vincolo, porta **la riga rifiutata
intera** — e dice dove quella lezione vive ancora: `logMoneyPathFailure`, che il
file usa sulla cancellazione.

## Due cose che NON sono state fatte, con la ragione

**La voce di cron resta.** La pulizia e' lavoro vero, non un giro a vuoto.

**Il percorso NON e' stato rinominato**, e il nome ora e' sbagliato:
`refund-expired-tokens` non rimborsa piu' niente. Rinominarlo significa cambiare
`vercel.json` e la cartella insieme, e se il deploy li disallinea anche solo per
un momento **il cron risponde 404** — su un percorso che nessuno guarda, in un
progetto senza tracciamento degli errori. Il debito di nome e' preferibile a un
processo che smette in silenzio, e va saldato quando ci sara' una ragione per
toccare `vercel.json` comunque.

## Chi si accorge se questo processo smette di girare

**Nessuno.** Non esiste tracciamento degli errori, e i quattro lavori notturni
falliscono senza che nessuno lo sappia. L'unico canale e' il confine 2xx/non-2xx
letto dal cruscotto della piattaforma.

Questa fase **riduce** cio' che puo' fallire in silenzio — un intero ramo che
muoveva denaro non c'e' piu' — ed e' l'unico guadagno di osservabilita' che
l'intera fase produce. Vale scriverlo, invece di perderlo in un elenco di
modifiche.
