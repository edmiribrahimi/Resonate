# Fase 52.2 — voci differite (fuori perimetro)

Trovate durante il piano 52.2-13 (PRE-LAB, 2026-09-30T17:02Z), **non corrette
qui**: nessuna nasce da un commit della fase.

| Controllo | Esito | Dove | Da dove viene |
|---|---|---|---|
| `verify:tables` | FAILED | `src/lib/tickets/organizer-alert.ts:355` — una `<table>` inline nella mail di riepilogo vendita | `9f7d1542` (2026-09-25), fuori fase |
| `verify:breakpoints` | FAILED | 29 occorrenze `@2xl:` (container query) in `src/app/(public)/events/EventTabs.tsx` | `45ef6e76` / `8d94a2a4` (2026-09-24), fuori fase |
| `verify:conversion` | REFUSED | `src/components/ui/PageShell.tsx:164` legge `--nav-inset-block-end` in un punto non congelato | `8ac347df` (2026-09-24), fuori fase |

La mail e' HTML per client di posta: il gate `verify:tables` e' scritto per la
UI e con ogni probabilita' va **esentato** con una voce dichiarata, non
riscritto. `@2xl:` e' una container query, non un breakpoint di viewport: anche
qui la strada probabile e' un'esenzione dichiarata. Decisione da prendere fuori
da questa fase.
