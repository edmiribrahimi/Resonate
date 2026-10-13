---
created: 2026-10-13
area: media-and-storage, comms-analytics, ticketing-payments
phase_hint: quick dopo la 52.3
source: il proprietario, in chat, la sera del 2026-10-13, subito dopo l'atto che ha acceso la pagina Music
---

# Il form del LiveCut prende durata e cover da SoundCloud, senza scriverle a mano

**Chiesto dal proprietario il 2026-10-13**, alla lettera: *«la durata e la cover
dovrebbe prenderla in automatico da soundcloud»*. Oggi il form
(`src/app/(admin)/admin/events/[id]/livecuts/LiveCutForm.tsx`) verifica il link
con l'oEmbed di SoundCloud, ma la durata la scrive l'organizer (`h:mm:ss`,
decisione D-52.3 del piano 52.3-16: l'oEmbed non la porta) e la cover la carica
dal proprio dispositivo (stripper via `finalize-cover`, `purpose: "livecut"`).

**Cosa si puo' fare**

1. **Cover automatica.** L'oEmbed gia' chiamato da `verifyLiveCutLink`
   (`src/lib/livecuts/soundcloud.ts`) porta `thumbnail_url`: l'artwork caricato
   su SoundCloud, che per la pipeline e' la stessa cover del LiveCut
   (`production-calendar.md`, cover 1:1 2000×2000 del martedi'). Il server la
   scarica, la passa dallo **stesso stripper** di oggi e la propone come cover;
   l'organizer puo' sostituirla. Nessuna nuova chiave.
2. **Durata automatica.** Tre strade, in ordine di leggerezza:
   - leggere `getDuration()` dal widget di SoundCloud nel browser al momento
     della verifica del link (nessuna chiave; dipende dal widget, che gia' si usa
     per il player: vedi `52.3-PLAYER-RESEARCH.md` e `52.3-SPIKE.md`);
   - l'API ufficiale di SoundCloud (registrazione di un'app, chiave su Vercel);
   - la pagina pubblica della traccia, che contiene la durata nel JSON di
     idratazione (fragile: si rompe quando SoundCloud cambia la pagina).
   Il campo resta modificabile: se la sorgente non risponde, si scrive a mano
   come oggi.

**Vincoli di dominio**
- La cover scaricata da SoundCloud passa **sempre** dallo stripper
  (`media-and-storage.md`, `venue-secrecy.md`: una foto dal posto porta le
  coordinate). La chiave pubblica non porta mai il nome originale.
- Il server scarica da `thumbnail_url` solo se l'host e' di SoundCloud
  (`sndcdn.com`/`soundcloud.com`): niente SSRF da un link inserito nel form.
- Il titolo resta quello pubblicato (D-52.3-03): non si rilegge dall'oEmbed
  per riscriverlo.
- Prova sul laboratorio con i due link reali (`MUSIC_SEED_LIVECUT_URL_BZ_*` in
  `.env.lab.local`), poi sulla serata vera dal form.
- La pagina Music e' gia' in produzione (2026-10-13): la modifica e' al form
  admin, non alla superficie pubblica; nessuna rivelazione in gioco.
