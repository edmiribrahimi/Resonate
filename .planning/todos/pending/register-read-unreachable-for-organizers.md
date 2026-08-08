---
created: 2026-08-08
source: 43-14 (segnalazione dell'esecutore) — confermato dall'orchestratore contro il middleware
severity: moderate
area: access-gating
resolves_phase:
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
