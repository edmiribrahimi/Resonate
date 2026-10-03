# 52.3 — Elementi differiti

## Dal piano 52.3-01 (2026-10-03)

- **La riga del format cancellato il 2026-08-20 (`CAT-01`) e' ancora `listed` e
  non ritirata nel catalogo del laboratorio** (`public.formats`, letto
  `read_only` alle 12:45:26 UTC). Non verificato in produzione (questo piano non
  la legge). Impatto sulla fase: ogni superficie della pagina Music che elenca i
  format dal catalogo deve filtrare per `retired_at is null` *e* non mostrare
  quella riga finche' il catalogo non la ritira; il ritiro e' una decisione del
  proprietario, non un allineamento silenzioso.
