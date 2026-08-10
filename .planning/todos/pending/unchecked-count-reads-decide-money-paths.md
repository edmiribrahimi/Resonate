---
created: 2026-08-10
source: 36-10 (l'esecutore ha chiuso la classe dentro `updateEvent`) — l'orchestratore ha misurato il resto dell'albero
severity: high
area: ticketing-payments, supabase-data
resolves_phase:
---

# Un conteggio letto senza controllarne l'errore decide due percorsi che muovono denaro

## Come e' emerso

Il piano `36-10` doveva chiudere un difetto misurato: `updateEvent` non
destrutturava `{ error }` da nessuna scrittura per-serata. L'esecutore ha chiuso
quello **e altre tre letture nella stessa funzione**, fra cui il conteggio dei
biglietti che protegge *«Cannot remove a sub-event that has sold tickets»* — dove
una lettura fallita faceva passare la guardia e cancellare una serata con
biglietti venduti.

Chiuso il difetto nel suo perimetro, **la classe e' stata cercata nel resto
dell'albero**. Otto siti leggono `const { count }` senza `error`. Sei sono
innocui — il conteggio finisce a schermo. **Due decidono qualcosa.**

## I due che decidono

### 1. Il cron dei rimborsi dichiara cancellato cio' che non ha cancellato

`src/app/api/cron/refund-expired-tokens/route.ts:163-168`

```ts
const { count } = await supabase
  .from("drink_tokens")
  .delete()
  .in("id", tokenIdsToDelete);
deletedCount = count ?? tokenIdsToDelete.length;
```

Il `?? tokenIdsToDelete.length` **e' il difetto, non la protezione**: se la
`delete` fallisce, `count` e' `null` e il fallback riporta come cancellati
esattamente i token che sono rimasti. La risposta JSON del cron dice
`{"deleted": N}` con N pari al numero di token **che voleva** cancellare.

**Perche' e' grave qui e non altrove:** il cron gira di notte, nessuno lo guarda,
e **non esiste error tracking** in questo progetto (`meta-gates.md`). Un
fallimento che si auto-dichiara successo non ha nessun altro percorso per
raggiungere un essere umano. I token restano in giro dopo essere stati
rimborsati.

### 2. Il limite d'uso di un codice sconto si apre su una lettura fallita

`src/app/(admin)/admin/events/actions.ts:1228-1233`

```ts
if (code.max_uses !== null) {
  const { count } = await supabase
    .from("tickets")
    .select("*", { count: "exact", head: true })
    .eq("discount_code_id", code.id);
  if ((count ?? 0) >= code.max_uses) throw new Error("Code usage limit reached");
}
```

Su lettura fallita `count` e' `null`, `count ?? 0` e' `0`, `0 >= max_uses` e'
falso: **la guardia passa**. Una lettura che fallisce trasforma un codice sconto
a uso limitato in un codice sconto illimitato — e lo fa in silenzio, sul percorso
di acquisto.

**Il verso del fallback e' il punto.** In entrambi i casi il `??` sceglie il
valore che fa proseguire. `ticketing-payments.md` chiede l'opposto: il denaro non
si fida di chi lo annuncia, e un dato che non si e' potuto leggere non e' un dato
permissivo.

## Cosa e' stato verificato, e cosa no

**Verificato** leggendo il codice il 2026-08-10:
- otto occorrenze di `const { count }` senza `error` in `src/`
- le due sopra sono lette dentro una condizione che decide
- le altre sei finiscono in un valore mostrato

**Non verificato:**
- se una di queste letture sia mai fallita davvero. **Non e' determinabile da
  qui**: non c'e' error tracking, e il cron non lascia altra traccia della propria
  esecuzione oltre alla risposta che si auto-dichiara riuscita
- se lo stesso verso di fallback (`?? valore-che-fa-passare`) esista su letture
  che non sono conteggi

## Il rimedio, e la parte che non e' meccanica

Destrutturare `{ count, error }` e trattare l'errore e' meccanico. **La decisione
non lo e': cosa deve succedere quando il conteggio non si puo' leggere.**

- Per il codice sconto la risposta e' chiara — **rifiutare**. Un limite che non
  si puo' verificare non e' stato rispettato.
- Per il cron dei rimborsi la risposta e' **riportare il fallimento con un
  effetto osservabile**, non un log: la risposta del cron deve poter dire
  *«rimborsati N, non cancellati M»* invece di dichiarare un successo che non c'e'
  stato.

Fuori perimetro per la fase 36, che non tocca ne' i rimborsi ne' gli sconti.
Candidata naturale: una fase o un giro dedicato ai percorsi che muovono denaro.
