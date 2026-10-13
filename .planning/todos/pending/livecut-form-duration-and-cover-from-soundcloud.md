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

**API ufficiale di SoundCloud — letto il 2026-10-14 da `developers.soundcloud.com/docs/api/register-app` e `/docs/api/guide`**
- Registrazione in «Your Apps» (`soundcloud.com/you/apps`: nome, descrizione, sito) o dalla CLI `sc-api-auth.mjs`; **serve un abbonamento SoundCloud Artist Pro** sull'account che registra. Si ottengono `client_id` e `client_secret`.
- Flusso client credentials (nessuna sessione utente, solo risorse pubbliche): `POST https://secure.soundcloud.com/oauth/token`, `Authorization: Basic base64(client_id:client_secret)`, body `grant_type=client_credentials`; risposta con `access_token` (~1 ora), `refresh_token` monouso, `expires_in`. **Limiti: 50 token ogni 12 ore per app, 30 l'ora per IP** → il token si tiene in cache lato server e si rinnova, mai un token per chiamata.
- `GET https://api.soundcloud.com/resolve?url=<link pubblico>` risponde **302** verso `/tracks/soundcloud:tracks:<id>`: seguire il redirect con lo stesso header `Authorization: OAuth <token>`. **Confermato il 2026-10-14 sulla 001**: `kind: track`, `duration` in **millisecondi** (3681613 → 1:01:21.6, la durata scritta a mano era 1:01:22), `access: playable`, `sharing: public`, `artwork_url` su `i1.sndcdn.com` nella variante `-large.jpg` (100 px): la versione grande si ottiene sostituendo `-large` con `-t500x500` o `-original`, da verificare con una GET prima di scaricare. Il `title` porta il nome dell'artista: non si salva.
- **Fatto il 2026-10-14:** app «re:sonate Music» registrata dal proprietario; `SOUNDCLOUD_CLIENT_ID` e `SOUNDCLOUD_CLIENT_SECRET` (32 caratteri ciascuna) in `.env.local`, `.env.lab.local`, e su Vercel in production e preview `lab`, scritte con `printf '%s'`; token di prova ottenuto (HTTP 200, `expires_in` 3599).
- Le chiavi stanno su Vercel come variabili **server-only** (mai `NEXT_PUBLIC_*`), scritte con `printf '%s'` per non ripetere l'a capo del 2026-10-13; la chiamata parte da `verifyLiveCutLink`, lato server.
