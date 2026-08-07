---
created: 2026-08-08
source: 43-01 measurement 5 (A1 probe)
severity: moderate
area: access-gating, checkin-offline
resolves_phase:
---

# Su una violazione di CHECK, PostgREST restituisce la riga intera

## Il fatto, misurato

Il piano `43-01` ha sondato una violazione di CHECK attraverso il client JS e ha
osservato che `error.details` contiene:

```
Failing row contains (<uuid>, <indirizzo>, <full_name>, <membership_code>, …)
```

Cioe' **la riga per intero**, `membership_code` compreso.
`src/app/api/membership/list/route.ts:52-54` mostra che il roster della porta non
filtra ne' su ruolo ne' su stato: un `membership_code` e' l'unica credenziale
d'ingresso. Un codice in un log e' una credenziale fuori dalla porta.

## Cosa e' stato verificato, e cosa no

Misurato il 2026-08-08 con `grep` sul codice corrente:

- **Nessun endpoint rispedisce l'oggetto errore al client.** Zero occorrenze di
  `NextResponse.json({... error ...})` sotto `src/app/api/`. `error.details` non
  e' letto da nessuna parte in `src/`. **La fuga non raggiunge un utente.**
- Solo `error.message` viaggia verso il client, in 4 punti — porta il nome del
  constraint, che e' innocuo.
- **~20 siti fanno `console.error("<categoria>", error)`** passando l'oggetto
  intero. Li' la riga finisce nei log del server.

Quindi la severita' e' "log del server", non "pubblicazione". Ma i log
persistono, e il progetto non ha error tracking: nessuno li guarda, e nessuno si
accorgerebbe di quando ci finisce dentro un codice d'ingresso.

## Perche' peggiora con la fase 43

Il piano `43-06` aggiunge `profiles_role_implies_approved`, un CHECK che verra'
violato **esattamente dalle azioni della pagina membri** — assegnare un ruolo a
chi e' ancora `pending`. E `src/app/(admin)/admin/members/actions.ts` e' proprio
uno dei file che fanno `console.error(..., err)`.

Prima della fase 43 quel percorso d'errore era raro. Dopo, e' il percorso
normale di un'operazione quotidiana.

## Cosa fare

- Nei percorsi che possono violare un CHECK su `public.profiles`, loggare
  `error.code` e `error.message`, **mai** `error` intero e mai `error.details`.
- Vale sul vincolo nuovo quanto su `profiles_status_check`.
- Il branching applicativo deve restare sul **codice** (`23514`, osservato):
  `message` porta il nome del constraint, `details` porta i dati del membro, e
  Next redige il `message` di una Server Action in build di produzione
  (`src/lib/capabilities/server.ts:59-63`).

## Portato avanti

Questo vincolo e' stato consegnato agli esecutori dei piani `43-06`, `43-09` e
`43-11` dentro i loro prompt. Questo todo resta aperto per i **siti esistenti**,
che nessun piano della fase 43 possiede.
