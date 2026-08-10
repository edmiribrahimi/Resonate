---
created: 2026-08-10
source: 34-17 (finding F5) — misurato sull'albero corrente, non citato
severity: moderate
area: access-gating, nextjs-architecture
resolves_phase:
---

# `?next=` sulla pagina di login finisce in `window.location.href` senza allow-list

## Il fatto, verificato

`src/app/(auth)/login/page.tsx:11` legge il parametro:

```ts
const nextUrl = searchParams.get("next") || "";
```

`src/app/(auth)/login/page.tsx:52`, dopo un login riuscito, lo esegue:

```ts
window.location.href = nextUrl || "/dashboard";
```

Fra le due righe **non c'e' nessuna validazione**. `nextUrl` arriva da un URL,
quindi e' controllato da chi costruisce il link, e finisce in una navigazione
del browser. Un valore assoluto (`https://…`) o protocol-relative (`//…`) porta
la persona fuori dall'origine subito dopo aver inserito la password — che e' il
momento peggiore, perche' e' quello in cui si aspetta di essere autenticata.

## Perche' e' notevole: il percorso gemello *ha* gia' la difesa

`src/app/api/auth/callback/route.ts:44-49` dichiara `NEXT_ALLOW_LIST`, un
insieme di path relativi, e `resolveNext` (`:52-90`) rifiuta tutto cio' che non
combacia — richiedendo che il valore inizi con `/`, non con `//`, e che superi
la lista. Il suo stesso docblock a `:68-70` nomina `/admin` come **rifiutato**,
*«perche' una allow-list rifiuta per default»*.

Quindi il progetto **ha gia' la forma corretta della difesa**, applicata al
redirect lato server. Manca solo sulla sua controparte lato client. Non e' un
problema di progettazione: e' un percorso che non e' stato allineato.

`access-gating.md`, gate *redirect validato*, e' il riferimento:
> *«Ogni nuovo redirect parametrico usa una allow-list di path relativi, mai la
> stringa grezza.»*

## Cosa NON e' stato verificato

Se esista oggi un percorso che consegna a un utente un link di login con un
`?next=` assoluto. **Non e' stato cercato**, e non serve cercarlo per decidere:
la difesa non dipende da chi produce il link oggi, ma da chi lo produrra'.

E non e' stato misurato se un `?next=` assoluto sia effettivamente eseguito dal
browser in tutti i casi — la lettura del codice dice di si', ma **e' una lettura,
non un'osservazione**. Chi chiude questo todo lo provi con una richiesta reale
prima di dichiararlo risolto, e lo provi **anche dopo** il rimedio.

## Perche' non e' stato piegato dentro la fase 34

Deliberatamente. La fase 34 e' un cambio d'accesso **Critical** che collassa due
alberi di rotta, e un difetto di autenticazione non appartiene dentro di esso:
la revisione dei due cambi richiede occhi diversi, e mescolarli significa che
nessuno dei due viene guardato per quello che e'. La fase 34 ha soltanto
**registrato** questo difetto e **non lo ha peggiorato** — non ha aggiunto
nessun nuovo redirect parametrico.

## Cosa fare

Riusare la difesa che esiste invece di scriverne una seconda: estrarre
`resolveNext` / `NEXT_ALLOW_LIST` in un modulo condiviso e farlo leggere anche
dalla pagina di login, cosi' che i due percorsi non possano divergere. Una
seconda allow-list scritta a mano diverge dalla prima al primo indirizzo nuovo.

Da guardare nello stesso passaggio, perche' e' la stessa famiglia:

- **F4 — i due percorsi non usano lo stesso nome di parametro.**
  `src/lib/supabase/middleware.ts:466` scrive `?redirect=`;
  `src/app/(auth)/login/page.tsx:11` legge `?next=`. Chi viene rimbalzato dal
  middleware verso il login perde quindi la propria destinazione e atterra su
  `/dashboard`. E' un difetto di **usabilita'**, non di sicurezza, ed e'
  preesistente alla fase 34 — ma va corretto insieme, perche' unificare la
  validazione senza unificare il nome del parametro lascia meta' del problema.
