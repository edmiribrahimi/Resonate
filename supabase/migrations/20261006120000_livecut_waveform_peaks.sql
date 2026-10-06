-- ═══════════════════════════════════════════════════════════════════════════
-- La forma d'onda di un LiveCut — una colonna di picchi sulla riga.
--
-- Fase 52.3, piano 22 (MUS-06). Vedi `52.3-PLAYER-RESEARCH.md` §1.
--
-- `livecuts.waveform_peaks` porta i picchi di ampiezza del NOSTRO file di
-- registrazione: interi 0..255, calcolati una volta alla pubblicazione da
-- `scripts/livecut-peaks.mjs` (ffmpeg, mai su Vercel) e disegnati in canvas
-- dal player. Sono numeri di ampiezza: pubblici per natura, come il mix che
-- descrivono. NULL = nessuna forma d'onda, e il player mostra la linea di
-- oggi — mai una waveform finta.
--
-- ADDITIVA: una colonna NULL-abile e il suo CHECK. NESSUNA riga esistente
-- viene toccata: le righe gia' presenti ricevono NULL, e restano tali finche'
-- lo script non scrive i loro picchi per chiave. La RLS e' quella della riga
-- (`20261004120000_livecuts.sql`): nessuna policy cambia.
--
-- Una transazione sola, senza `BEGIN;`: l'endpoint
-- `POST /v1/projects/{ref}/database/migrations` la avvolge da solo (misurato
-- il 2026-09-21, vedi `20260923180100_gallery_close_data.sql`).
--
-- Questo repository e' PUBBLICO: nessun nome d'artista, nessuna data e nessun
-- luogo in questo file — solo la forma della colonna.
--
-- Idempotente: `ADD COLUMN IF NOT EXISTS`, `DROP CONSTRAINT IF EXISTS` prima di
-- `ADD CONSTRAINT`. Un vincolo DIVERSO e' una migration nuova, mai una modifica
-- a questa (`supabase-data.md`, gate *migration in avanti*).
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.livecuts
  ADD COLUMN IF NOT EXISTS waveform_peaks smallint[] NULL;

-- Fra 2 e 2000 campioni, ognuno 0..255. Lo script ne scrive 1800 (la stessa
-- risoluzione della waveform media di SoundCloud, `_m.json`); il limite alto
-- tiene la riga sotto i ~4 KB, il basso rifiuta un array vuoto o a un solo
-- punto, che non e' una forma d'onda.
ALTER TABLE public.livecuts
  DROP CONSTRAINT IF EXISTS livecuts_waveform_peaks_shape;

ALTER TABLE public.livecuts
  ADD CONSTRAINT livecuts_waveform_peaks_shape CHECK (
    waveform_peaks IS NULL
    OR (
      cardinality(waveform_peaks) BETWEEN 2 AND 2000
      AND 0 <= ALL (waveform_peaks)
      AND 255 >= ALL (waveform_peaks)
    )
  );

COMMENT ON COLUMN public.livecuts.waveform_peaks IS
  'Amplitude peaks 0..255 computed from our own recording (scripts/livecut-peaks.mjs); public by nature. NULL = no waveform, the player draws a plain line.';
