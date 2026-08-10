---
created: 2026-08-10
source: 36-RESEARCH (reperto fuori scope) — ri-misurato dall'orchestratore prima di riferirlo
severity: critical
area: venue-secrecy, supabase-data, access-gating
resolves_phase: 37
---

> **Assegnato alla fase 37 dal proprietario il 2026-08-10.** La fase 36 prosegue
> e non tocca la relazione venue. Prima di scegliere il rimedio va misurato se lo
> stesso percorso esista anche via `events` o `event_media` — vedi *Cosa e' stato
> verificato, e cosa no*.

# L'indirizzo di un venue segreto e' leggibile con la sola chiave anonima

## Il fatto, misurato il 2026-08-10

`venues_select_public` (`supabase/migrations/20260226200000_venues.sql:25-27`) e':

```sql
create policy "venues_select_public"
  on public.venues for select
  using (true);
```

`using (true)` — **nessun predicato**. Ogni riga di `public.venues` e' leggibile
da chiunque, `address` e `google_maps_url` compresi.

`event_parties` porta `venue_id`, ed e' leggibile per gli eventi pubblicati
(`event_parties_select_published`, `20260225150000_party_architecture.sql:31-37`).
Le due cose si compongono in **una sola richiesta**:

```
GET /rest/v1/event_parties?select=id,venue_secret,venues(name,address,google_maps_url)&venue_secret=eq.true
```

con la sola `NEXT_PUBLIC_SUPABASE_ANON_KEY`, **senza sessione**.

**Misurato in produzione il 2026-08-10:** due serate hanno `venue_secret = true`,
entrambe portano un `venue_id` valorizzato, e per entrambe la richiesta sopra
restituisce **nome, indirizzo completo e URL di Google Maps**. Nessuna delle due
ha `venue_text` (l'indirizzo non passa da li'): passa dalla relazione.

I valori non sono riportati in questo file. **Il repository e' pubblico**, ed e'
la stessa ragione per cui il difetto conta.

## Perche' e' critico e non moderato

`venue_secret` **governa il rendering, non l'accesso al dato**. Le superfici
dell'app rispettano il flag: nascondono l'indirizzo, mostrano l'hint, aspettano
il cron. Ma il flag non e' un confine di sicurezza — e' una scelta di
presentazione applicata sopra un dato che chiunque puo' chiedere direttamente.

E' esattamente il pattern che `CLAUDE.md` chiama per nome: *«il middleware e' UX,
la RLS e' sicurezza»*. Qui non e' nemmeno il middleware: e' un `if` in un
componente.

**La rivelazione e' monotona.** Non c'e' un annullamento: una volta che un
indirizzo e' uscito, e' uscito. Il che significa due cose, e nessuna delle due e'
consolante:

1. Il difetto **non e' riparabile all'indietro** per gli indirizzi gia'
   raggiungibili — si puo' solo chiudere la porta da adesso.
2. **Non e' misurabile** se sia stato sfruttato: non esiste error tracking, non
   esiste log di accesso PostgREST consultabile da qui, e una lettura anonima non
   lascia traccia applicativa.

Il cron `venue-reveal` esiste per **decidere quando** un indirizzo diventa
pubblico. Finche' questa policy resta com'e', quel cron decide **quando parte la
mail**, non quando l'indirizzo diventa raggiungibile: quello e' gia' avvenuto,
alla creazione della riga.

## Cosa e' stato verificato, e cosa no

**Verificato** — con la chiave anonima, contro la produzione, il 2026-08-10:
- `venues_select_public` e' `using (true)` nel file di migration
- due serate in produzione hanno `venue_secret = true` e un `venue_id`
- la join annidata PostgREST restituisce `name`, `address`, `google_maps_url`
  per entrambe, senza sessione

**Non verificato:**
- se `venues` abbia altre policy `SELECT` che restringono (ne esiste almeno una
  per `insert`; il `SELECT` misurato passa, quindi la domanda e' accademica per
  l'esito ma non per il rimedio)
- se qualcuno abbia effettivamente eseguito questa richiesta. **Non e'
  determinabile da qui.**
- se lo stesso percorso esista su altre relazioni che espongono un venue
  (`events`, `event_media`) — **va guardato prima di scegliere il rimedio**, o si
  chiude una porta su un muro con due porte

## Perche' non e' stato ripiegato nella fase 36

La fase 36 aggiunge un catalogo di format e serie e un filtro pubblico. Questo
difetto e' sulla relazione venue, che la fase 36 non tocca. Ripiegarlo
significherebbe mettere una correzione Critical dentro una fase che sta gia'
costruendo superfici pubbliche — e la correzione merita la sua analisi d'impatto,
non un task in coda a qualcos'altro.

**Candidata naturale: la fase 37** (`Manual Venue Reveal`), che e' gia' il posto
dove si decide chi puo' rivelare e quando. Una fase che aggiunge un percorso
manuale di rivelazione mentre la rivelazione automatica e' gia' avvenuta per
costruzione sarebbe una fase che risolve il problema sbagliato.

## L'errore che questo todo esiste per impedire

Il ragionamento *«tanto le sedi sono gia' pubbliche, quindi anche il nome di una
serie che contiene una sede puo' esserlo»* e' **falso e pericoloso**. Una porta
gia' aperta non e' un argomento per aprirne una seconda: e' un argomento per
chiudere la prima. La decisione D-36-13 e la regola di degrado dell'UI-SPEC
restano in piedi indipendentemente da questo difetto, e non vanno rilassate
citandolo.
