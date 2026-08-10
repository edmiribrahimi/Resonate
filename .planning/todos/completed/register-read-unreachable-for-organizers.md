---
created: 2026-08-08
closed: 2026-08-10
source: 43-14 (segnalazione dell'esecutore) — confermato dall'orchestratore contro il middleware
severity: moderate
area: access-gating
resolves_phase: 34-one-work-surface (piano 34-10)
---

# `register.read` e' concesso agli organizer, ma la rotta li rimbalza prima

## Il fatto

La fase 43 concede la capability di lettura del registro degli atti anche agli
organizer, non solo al master. Ma la pagina che lo mostra vive sotto
`/admin/*`, e `src/lib/supabase/middleware.ts:186-190` giudica tutto `/admin`
che non sia lo scanner con `admin.access` — **concessa al solo master**.

Conseguenza: **un organizer che possiede la capability viene rimbalzato dalla
rotta prima che la pagina venga eseguita.** La capability e' concessa e
irraggiungibile per quella strada.

## Cosa NON e' un difetto

Non e' un buco di sicurezza: l'effetto e' piu' restrittivo, non piu' permissivo.
E la RLS del registro resta il confine vero — il middleware e' UX.

E' un difetto di **coerenza**: una capability che nessuno puo' esercitare
somiglia molto a un permesso presidiato, ed e' invece una porta murata.

## Perche' non e' stata risolta qui

L'esecutore di `43-14` ha deliberatamente **non allentato il middleware**: la
collassatura di `/admin/*` su `admin.access` appartiene alla fase 34, e
allargarla dentro un piano di interfaccia avrebbe cambiato chi entra in ogni
altra pagina `/admin` come effetto collaterale invisibile. La scelta e'
scritta nel file e nel suo SUMMARY.

## Le due strade, quando qualcuno la chiudera'

1. **Spostare la pagina fuori da `/admin`** — per esempio sotto `/organizer`,
   che e' gia' giudicato da `organizer.access`. Nessuna regola di accesso
   cambia; cambia un indirizzo.
2. **Dare alla rotta del registro la sua regola**, come `/admin/scanner` ha gia'
   la sua. Attenzione all'**ordine**: il commento in `middleware.ts` dichiara
   load-bearing il fatto che lo scanner sia testato prima del ramo `/admin`
   generale. Una regola nuova va inserita con la stessa cura, o si ottiene lo
   stesso guasto che quel commento esiste per prevenire.

La prima e' piu' economica e non tocca codice d'accesso.

---

## Chiuso il 2026-08-10 — piano 34-10, e **nessun permesso e' stato modificato**

**Ne' la prima strada ne' la seconda.** Nessuna delle due opzioni sopra e'
stata presa: la pagina non e' stata spostata sotto `/organizer`, e alla rotta
del registro non e' stata data una regola propria nel middleware. Il difetto e'
sparito **per costruzione**, che era esattamente la prova che la fase 34 doveva
superare — se chiuderlo avesse richiesto di toccare una concessione, il collasso
non sarebbe avvenuto e qualcosa sarebbe stato trattato come eccezione.

### Il meccanismo

**D-34-02 ha dissolto la regola di prefisso.** Le tre regole del middleware
(`/admin/scanner`, `/admin/*`, `/organizer/*`) sono diventate una lookup nella
mappa `src/lib/routes/capability-routes.ts` (piano 34-03), e la mappa lega la
rotta alla capability che la apre:

```
[CAP.REGISTER_READ]: {
  routes: ["/admin/members/register"],
  alsoGatesTables: true,
},
```

Un solo elemento. Da quel momento `admin.access` non significa piu' *"qualunque
cosa il cui path inizia per `/admin`"*: significa *"le sei superfici solo-master"*,
e il registro non e' una di quelle. Il piano 34-10 ha poi portato l'albero
`members` sotto il layout della superficie di lavoro, lasciando la rotta
all'indirizzo che la mappa gia' dichiarava.

**L'ordinamento di cui avvertiva questo file non e' un rischio in questa
strada.** Il timore era che una regola nuova, inserita male, riproducesse il
guasto che il commento sullo scanner esiste per prevenire. La mappa non e' una
lista di regole ordinate: `matchesPattern` pretende **lo stesso numero di
segmenti**, quindi i pattern sono **esatti, non prefissi** — `/admin` apre
`/admin` e nulla sotto. Non c'e' un ordine da sbagliare.

### Le quattro verifiche, eseguite il 2026-08-10

1. **Nessuna modifica sotto `supabase/` in tutta la fase.**
   ```
   $ git diff --name-only 99b8b89..HEAD -- supabase/
   $
   ```
   Output vuoto. Zero file, zero commit.

2. **`private.role_capabilities` non e' stata toccata.** La concessione
   `('organizer','register.read',true)` e' letta dove e' sempre stata:
   `supabase/migrations/20260808002000_membership_register.sql:130`. Il suo
   `requires_approved = true` e' il requisito **non negoziabile** di D-19 della
   fase 43 e **resta**: un organizer `pending` viene rifiutato al registro, ed e'
   il comportamento voluto. `staff.manage` — che porta
   `requires_approved = false` — non e' stata usata come gate e quel flag non e'
   stato ribaltato: da quel `false` dipende la porta.

3. **Nessun caso speciale per il registro nel middleware.**
   ```
   $ grep -ci "register" src/lib/supabase/middleware.ts
   0
   ```

4. **La mappa lega `register.read` a una sola rotta**, `/admin/members/register`,
   e non c'e' competizione con `/admin/members` (`organizer.access`) ne' con
   `/admin` (`organizer.access`): tre segmenti contro due contro uno, e il match
   pretende uguaglianza.

### Cosa non e' ancora osservato

La chiusura qui e' un **argomento di costruzione, non un'osservazione**. In
questo repo non esiste un test runner per il prodotto, e il sistema dei tipi non
puo' vedere chi raggiunge un indirizzo. Restano dovute due prove a mano, gia'
scritte in `34-VALIDATION.md`:

- **M-2** — un account `organizer` / `approved` apre `/admin/members/register` e
  la pagina si disegna;
- **M-3** — un account `organizer` / `pending` viene **rifiutato** li'.

Finche' M-2 non gira, questo todo e' chiuso sul meccanismo e non sull'effetto.
