# 52.3 — Elementi differiti

## Dal piano 52.3-01 (2026-10-03)

- **La riga del format cancellato il 2026-08-20 (`CAT-01`) e' ancora `listed` e
  non ritirata nel catalogo del laboratorio** (`public.formats`, letto
  `read_only` alle 12:45:26 UTC). Non verificato in produzione (questo piano non
  la legge). Impatto sulla fase: ogni superficie della pagina Music che elenca i
  format dal catalogo deve filtrare per `retired_at is null` *e* non mostrare
  quella riga finche' il catalogo non la ritira; il ritiro e' una decisione del
  proprietario, non un allineamento silenzioso.

## Dal piano 52.3-10 (2026-10-03)

- **`notFound()` sotto `admin/(work)` risponde HTTP 200, non 404.** Misurato sul
  laboratorio alle 14:30 UTC con `next dev`: a interruttore spento
  `/admin/events/<id>/livecuts` rende il confine not-found (`NEXT_HTTP_ERROR_FALLBACK;404`,
  `noindex`, nessun contenuto LiveCut) ma con status 200; lo stesso fa
  `/admin/calendar/<uuid inesistente>`, che esiste da prima — e' una proprieta'
  dell'albero `(work)` (il layout streamma prima che la pagina lanci), non della
  pagina nuova. `/music` (fuori da quell'albero) risponde 404. Nessun dato
  esposto, e le action rifiutano con `disabled` per conto loro. **Per P-523-H
  (piano 52.3-12):** chi percorre la prova legge «il confine not-found», non lo
  status; se il 404 come status serve, la strada e' l'interruttore nel
  middleware — decisione da prendere, non un allineamento silenzioso.
  **Provato e scartato alle 14:33 UTC:** un `layout.tsx` del segmento `livecuts`
  con lo stesso `notFound()` (la cura di `/music`, 52.3-05) risponde ancora 200,
  perche' il layout di `(work)` sopra di lui e' asincrono e streamma prima. Il
  file e' stato tolto, non committato.
- **Una serata non segreta dentro un evento segreto non ha la guardia del luogo
  sul link.** `actions.ts` guarda `event_parties.venue_secret` della serata; il
  seme del laboratorio tratta segreta una serata se lo e' lei *o* il suo evento
  (52.3-06, deviazione 2). Sul laboratorio l'evento N3 ha due serate: la prima
  (satellite) `venue_secret = false`. Da decidere se la guardia debba leggere
  anche l'evento (piano 52.3-07 / proprietario); non toccato qui.

> **2026-10-03, orchestratore — chiuso.** La guardia del luogo in `actions.ts` (`scopeParty`) ora legge anche `events.venue_secret`: una serata non segreta dentro un evento segreto e' trattata come segreta, la stessa regola del seme del laboratorio. Nessuna riga toccata; `tsc` ed eslint verdi. Da provare dal vivo in P-523-F sul satellite di N3 (piano 52.3-12).
