---
phase: 52-la-barra-di-navigazione-e-i-ritocchi
plan: 03
subsystem: admin/members
tags: [NAV-05, NAV-02, access-gating, legenda, staff, gallery.view]
requires: []
provides:
  - "tre cifre uguali nella pagina membri (NAV-05)"
  - "legenda staff vera dal giorno della migration gallery.view (D-52-12)"
affects:
  - "piano 52-06 (migration gallery.view): la legenda descrive la concessione che quella migration rende vera"
  - "piano 52-15 (atto di deploy): questa legenda e la migration devono spedire insieme"
tech-stack:
  added: []
  patterns: ["commento datato aggiunto sotto la storia, mai al suo posto"]
key-files:
  created: []
  modified:
    - src/components/admin/MemberTable.tsx
decisions:
  - "Import di FOCUS_RING tolto da MemberTable: il pulsante staff era il suo unico consumatore nel file"
  - "Il bordo tratteggiato del badge staff resta: ora dice «nessun potere operativo», non «nessuna concessione»"
metrics:
  duration: "~10 min"
  completed: 2026-09-23
  tasks: 2
  files: 1
---

# Fase 52 Piano 03: la cifra staff e la legenda vera — Summary

La cifra `staff` della pagina membri torna a essere una cifra (uno `span` identico a
`organizers`, non piu' un pulsante-filtro), e la legenda sotto la tabella smette di dire
che uno staff «non concede nulla»: dice che apre la gallery e nient'altro di suo, e che
la porta viene dall'assegnazione della serata.

## Cosa e' cambiato

**Task 1 — NAV-05 (commit `9b60064`).** `src/components/admin/MemberTable.tsx`: il
`<button onClick={() => setRoleFilter("staff")}>` con `min-h-11`, sottolineatura, hover e
`FOCUS_RING` e' diventato `<span><span className="font-mono font-semibold text-ink">{staffCount}</span>{" "}staff</span>`,
la stessa forma esatta di `organizerCount`. Il commento datato dice che la disuguaglianza
e' chiusa il 2026-09-23 (D-52-18) e che il filtro per ruolo resta nel selettore dei filtri,
dove `setRoleFilter` continua a essere usato. `FOCUS_RING` non aveva altri usi nel file:
tolto dall'import.

**Task 2 — la legenda (commit `a5ee23f`).**
- Testo visibile, prima: *«A staff account grants nothing of its own — it can do nothing
  an attendee cannot … Working the door or a gallery comes from the night's own assignment…»*.
  Dopo: *«A staff account opens the gallery — photos and videos from the nights — and
  nothing else of its own. It opens no door on its own: working the door comes from the
  night's own assignment, which an organizer makes and which ends with the night.»*
- Commento sopra la legenda: la storia (tessera, fase 51) resta intatta; sotto e' stato
  aggiunto il paragrafo datato 2026-09-23 con D-52-12, la ragione (la frase si legge prima
  di promuovere qualcuno), il richiamo a D-52-25 (la gallery porta anche foto di serate in
  sede segreta) e il vincolo di deploy congiunto con la migration (atto del piano 52-15).
- Commento del badge: `staff` tiene **una** chiave per ruolo, `gallery.view`, e nessuna
  riga `door.operate` per ruolo; il tratteggio resta e ora significa «non concede potere
  operativo». La riga del badge (`border-dashed`) non e' toccata dal diff.

## Vincolo di deploy — da tenere a vista

La nuova legenda e' vera **solo dopo** la migration del piano 52-06. Se questo commit
arrivasse in produzione prima di quella migration, la legenda direbbe per quel tempo che
uno staff apre la gallery quando ancora non la apre (errore nel verso prudente: promette
meno potere operativo, non di piu', ma resta un falso). Il piano la fa spedire nello stesso
atto (52-15): l'orchestratore deve mantenerle insieme.

## Verifica

- `npm run build` verde dopo ciascun task (typecheck incluso). Nessun test runner esiste:
  nessun test e' stato eseguito ne' dichiarato.
- Controlli meccanici: zero occorrenze di `setRoleFilter("staff")`, di «it can do nothing
  an attendee cannot» e di «Working the door or a gallery comes from»; `D-52-18` e
  `gallery.view` presenti; `git diff` non tocca la riga del badge.

**Procedura manuale (P-52-D), da percorrere sul laboratorio, non in produzione:**
1. Entrare come `master` (o `organizer`) e aprire `/admin/members`.
2. Osservare la riga delle cifre: `N accounts total`, `N organizers`, `N staff` hanno la
   stessa forma — nessuna sottolineatura tratteggiata sulla terza, nessun cambio al
   passaggio del mouse, nessun anello di focus con Tab.
3. Toccare/cliccare la cifra staff: la lista **non** si filtra.
4. Usare il selettore del ruolo nei filtri e scegliere `staff`: la lista si filtra
   (il filtro per ruolo e' ancora raggiungibile).
5. Leggere la legenda sotto le cifre: nomina la gallery e dice che la porta viene
   dall'assegnazione della serata; non contiene «member», «socio» ne' «attendee cannot».
6. Controllare che il badge `staff` in tabella abbia ancora il bordo tratteggiato.

## Deviazioni dal piano

Nessuna — piano eseguito come scritto. (La rimozione dell'import di `FOCUS_RING` era
prevista dal piano in forma condizionale.)

## Known Stubs

Nessuno.

## Threat Flags

Nessuna superficie nuova: il file cambia testo e un elemento non interattivo. T-52-08
(promozione decisa su una legenda falsa) e T-52-09 (commento cancellato invece che datato)
mitigati come da threat model.

## Self-Check: PASSED

- FOUND: src/components/admin/MemberTable.tsx
- FOUND: 9b60064
- FOUND: a5ee23f
