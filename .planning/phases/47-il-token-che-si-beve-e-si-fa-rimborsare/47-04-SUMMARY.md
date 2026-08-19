---
phase: 47-il-token-che-si-beve-e-si-fa-rimborsare
plan: 04
subsystem: ticketing-payments / access-gating
tags: [refund-fork, review-surface, staff-manage, audit]
requires:
  - "47-01 — activation_count, il dato su cui la regola decide"
  - "47-03 — la richiesta da esaminare"
provides:
  - "la biforcazione: mai attivato -> automatico su richiesta; altrimenti -> una persona"
  - "approveDrinkRefund / rejectDrinkRefund, dietro staff.manage, con chi e quando"
  - "la lista delle richieste in attesa sulla pagina drink della serata"
  - "drink_refund_request.decided_automatically — una decisione ha sempre un autore"
affects:
  - "la fase si chiude qui, salvo le prove manuali dovute"
decisions:
  - "NUOVA MIGRATION non prevista dal piano: il vincolo di 47-03 aveva ragione, un rimborso automatico non ha decisore umano"
  - "La pagina NON e' stata ristretta a staff.manage: avrebbe cambiato chi vede il menu drink"
  - "Il conteggio si mostra come numero, senza tono ne' ordinamento"
metrics:
  duration: "~50 minuti, 2026-08-20"
  completed: 2026-08-20
  tasks: 3 su 4 — il quarto e' dovuto
---

# Fase 47 Piano 04 — Summary

Due strade: chi non ha mai toccato il suo drink riavuto i soldi appena lo chiede,
chi l'ha attivato e annullato passa da una persona **che vede quante volte**.

## Il vincolo di 47-03 aveva ragione, e l'ha detto nel momento giusto

`drink_refund_request_decider_present` pretendeva un `decided_by` su ogni riga
non in attesa. Costruendo la biforcazione si e' opposto: **un rimborso automatico
non ha un decisore umano.**

La strada facile era allentarlo e lasciare l'autore nullo su una riga approvata.
Sarebbe stata una riga **decisa da nessuno**, e fra sei mesi indistinguibile da
un difetto che ha dimenticato di scrivere l'autore.

Migration non prevista dal piano, `20260820120000`: il vincolo **resta** e cambia
cosa lo soddisfa. `decided_automatically`, e la regola diventa *«una persona
**oppure** la regola, mai entrambi e mai nessuno»* — uno `<>` fra i due, perche'
«l'ha approvata Tizio automaticamente» e' una frase che non significa niente e che
nasconderebbe quale dei due percorsi ha mosso il denaro. Piu' un secondo vincolo:
una riga in attesa non e' stata decisa da nessuno dei due.

**E non contraddice il divieto che 47-03 si era dato.** Quella riga vietava di
congelare un **giudizio** al momento della richiesta; questa registra **chi ha
preso la decisione** dopo che e' stata presa. Un pronostico e un verbale non sono
la stessa cosa.

## La biforcazione, e la riga che decide tutto

```
activation_count === 0   -> rimborso emesso subito, richiesta nata accolta
qualunque altro valore   -> in attesa, nessun denaro si muove
```

**`null` non e' zero, ed e' la riga piu' importante del blocco.** Significa «riga
creata prima che si contasse»: non sappiamo se sia stata attivata. Il confronto
stretto con `0` lo esclude da solo — ed e' il motivo per cui 47-01 ha reso quella
colonna nullable invece di seguire il piano.

**E non si legge `activated_at`.** Dal 2026-08-19 sopravvive all'annullamento:
`activated_at IS NULL` non significa piu' «mai attivato». Verificato: zero
occorrenze nella decisione.

**La regola del denaro, senza sconti:** il codice di transazione si **rilegge dal
checkout**, sempre, non solo come ripiego. Quel campo lo ha scritto un webhook, ed
e' esattamente il genere di valore che *«never trust webhook body for status»* dice
di non credere sulla parola.

**Quando l'emissione fallisce, la richiesta resta `pending` e visibile.** Non
«riprova piu' tardi» silenzioso: non esiste tracciamento degli errori, quindi la
riga rimasta in attesa **e'** l'effetto osservabile. E a chi ha chiesto si dice
che la richiesta c'e' — vero — non «rimborsato», che sarebbe falso, ne' «errore»,
che gli farebbe rifare una cosa gia' fatta.

## Il conteggio e' un numero, non un verdetto

Nessun colore, nessuna etichetta di sospetto, nessun ordinamento per conteggio.
Il commento accanto lo dice in entrambe le direzioni:

> Un conteggio alto puo' voler dire che qualcuno ha ciclato il token; puo' anche
> voler dire che il locale era pieno e la persona ci ha ripensato tre volte.

E porta la seconda meta', che e' la ragione per cui il numero non e' un'arma:
senza di esso **non si puo' nemmeno dimostrare che al banco si e' lavorato bene**.

Il valore `null` si disegna come **«attivazioni: nessun dato»**, non come 0: la
distinzione arriva fino alla superficie invece di fermarsi allo schema.

## Una coincidenza misurata, non assunta

La pagina chiede `organizer.access`; la policy della tabella chiede
`staff.manage`. **Misurate in produzione: le tengono gli stessi ruoli** — master
e organizer.

Quindi chi arriva alla pagina puo' leggere, e non esiste oggi il caso di una
lista vuota per rifiuto. **Ma e' una coincidenza, non un vincolo**, ed e' scritta
nel file: il giorno in cui divergessero, un lettore ammesso dalla pagina e
rifiutato dalla base dati leggerebbe **zero righe senza un errore** — PostgREST
non distingue «rifiutato» da «vuoto» — e la sezione gli direbbe «nessuna
richiesta», che sarebbe falso e credibile.

**La pagina non e' stata ristretta a `staff.manage`**, come il piano chiedeva alla
lettera: l'avrebbe fatto, ma avrebbe anche cambiato **chi vede il menu drink**,
che e' fuori dal perimetro di questa fase.

## I chiamanti di `refundTransaction`

| | prima della fase | ora |
|---|---|---|
| biglietti | 2 | 2 |
| drink — cron notturno | 1 | **0** |
| drink — ramo automatico su richiesta | 0 | 1 |
| drink — accoglimento da una persona | 0 | 1 |
| **totale** | **3** | **4** |

Il numero cresce di uno, e i due nuovi hanno entrambi un percorso di richiesta a
monte. Quello che se ne va e' l'unico che partiva **senza che nessuno chiedesse
niente**.

## Cosa resta dovuto

**Task 4 — le due strade percorse a mano — non e' stato eseguito**: richiede
acquisti veri e due account.

**Il passo 3 e' quello che nessuno fa**: aprire la pagina con un account **senza**
`staff.manage` e verificare che una lettura diretta della tabella **venga
rifiutata dalla base dati** — non che ci sia stato un redirect. E' l'unico passo
che misura un confine invece di un percorso.
