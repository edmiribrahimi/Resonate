/**
 * livecut-peaks.mjs — la forma d'onda di un LiveCut, dai NOSTRI file.
 *
 * Fase 52.3, piano 22 (MUS-06). Vedi `52.3-PLAYER-RESEARCH.md` §1.
 *
 * Legge la registrazione del mix (WAV/FLAC del registratore, anche in piu'
 * spezzoni), la decodifica con `ffmpeg` in mono 8 bit a 8 kHz, la divide in
 * 1800 secchi, prende il picco |campione| di ogni secchio e lo scala a 0..255.
 * Il risultato e' l'array che `livecuts.waveform_peaks smallint[]` accetta
 * (migration `20261006120000_livecut_waveform_peaks.sql`: 2..2000 valori,
 * ognuno 0..255) e che il player disegna in canvas.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DOVE GIRA, E DOVE NO.
 *
 * - Sul portatile di chi pubblica, una volta per LiveCut. MAI su Vercel: non
 *   c'e' ffmpeg la', e i file di registrazione non lasciano il disco locale.
 * - La PRODUZIONE NON E' MAI UNA DESTINAZIONE di questo script. La prima riga
 *   eseguita e' il rifiuto del ref di produzione; `--write` conosce solo il
 *   laboratorio. I picchi di produzione li scrive il piano 52.3-15, per la sua
 *   strada.
 * - Nessuna dipendenza nuova: Node ESM e `ffmpeg` gia' installato
 *   (`/opt/homebrew/bin/ffmpeg`, o quello nel PATH).
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * SORGENTI, in ordine di preferenza:
 *
 *   --file <audio> [<audio> …]   LA SORGENTE DI DEFAULT. Gli spezzoni si
 *                                concatenano nell'ordine dato (il registratore
 *                                spezza una registrazione lunga in `_1`, `_2`).
 *                                Stampa anche la durata in secondi calcolata
 *                                dai campioni: va confrontata con
 *                                `duration_seconds` della riga, perche' una
 *                                registrazione piu' lunga del mix pubblicato
 *                                (silenzio prima/dopo, upload tagliato) da' una
 *                                forma d'onda fuori asse con cio' che suona.
 *
 *   --soundcloud <permalink>     L'IMPORTER, per i LiveCut SENZA file: legge la
 *                                pagina della traccia, trova
 *                                `wave.sndcdn.com/<hash>_m.json` (1800 campioni
 *                                0..height) e li scala a 0..255. Non e' la
 *                                sorgente di default: l'URL non e' documentato
 *                                da SoundCloud e puo' sparire.
 *
 * USCITE:
 *
 *   --json                       stampa SOLO l'array JSON su stdout.
 *   --write <livecut-uuid>       UPDATE della riga del LABORATORIO per chiave
 *                                (endpoint SQL della Management API), poi
 *                                rilettura di `waveform_peaks` da PostgREST con
 *                                la service key del laboratorio — una sorgente
 *                                diversa da quella con cui si e' scritto — e
 *                                stampa della cardinalita'. Rifiuta di scrivere
 *                                se l'array calcolato non ha 1800 valori.
 *
 * USO (con `.env.local` e poi `.env.lab.local` caricati, come `dev-lab.sh`):
 *   set -a; source .env.local; source .env.lab.local; set +a
 *   node scripts/livecut-peaks.mjs --file <rec.wav> --json
 *   node scripts/livecut-peaks.mjs --file <rec_1.wav> <rec_2.wav> --write <uuid>
 *   node scripts/livecut-peaks.mjs --soundcloud https://soundcloud.com/<u>/<t> --write <uuid>
 *
 * Questo file e' su un repository PUBBLICO: nessun nome di artista, nessuna
 * data, nessun luogo e nessun percorso locale qui dentro. I percorsi dei file
 * stanno in `.env.lab.local` (ignorato da git) o sulla riga di comando.
 */

/* ───────────────────────── il rifiuto, prima di tutto ───────────────────────── */

const PRODUCTION_REF = "cjsfocnhfzycbbgkwocx";
if (process.env.LAB_PROJECT_REF === PRODUCTION_REF) {
  console.error(
    "RIFIUTO: LAB_PROJECT_REF e' il ref di PRODUZIONE.\n" +
      "La produzione non e' mai una destinazione di questo script."
  );
  process.exit(2);
}

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const BUCKETS = 1800;
const SAMPLE_RATE = 8000;
const MINI = 80; // 10 ms a 8 kHz: la risoluzione intermedia prima dei 1800 secchi
const FFMPEG = existsSync("/opt/homebrew/bin/ffmpeg") ? "/opt/homebrew/bin/ffmpeg" : "ffmpeg";

/* ───────────────────────────── argomenti ───────────────────────────── */

const argv = process.argv.slice(2);
const files = [];
let soundcloud = null;
let writeId = null;
let json = false;

for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--file") {
    while (i + 1 < argv.length && !argv[i + 1].startsWith("--")) files.push(argv[++i]);
  } else if (a === "--soundcloud") {
    soundcloud = argv[++i] ?? null;
  } else if (a === "--write") {
    writeId = argv[++i] ?? null;
  } else if (a === "--json") {
    json = true;
  } else {
    usage(`argomento sconosciuto: ${a}`);
  }
}

if ((files.length === 0) === (soundcloud === null)) usage("serve UNA sorgente: --file <audio>… oppure --soundcloud <permalink>");
if (writeId !== null && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(writeId)) {
  usage("--write vuole l'uuid della riga livecuts");
}

function usage(msg) {
  console.error(`livecut-peaks: ${msg}\n` +
    "  node scripts/livecut-peaks.mjs --file <audio> [<audio>…] [--json] [--write <uuid>]\n" +
    "  node scripts/livecut-peaks.mjs --soundcloud <permalink> [--json] [--write <uuid>]");
  process.exit(1);
}

/** Non su stdout quando `--json`: stdout e' l'array e nient'altro. */
function note(line) {
  (json ? console.error : console.log)(line);
}

/* ───────────────────────── --file: ffmpeg → 1800 picchi ───────────────────────── */

/**
 * Decodifica gli input (concatenati in ordine, demuxer `concat`) in PCM s8 mono
 * a 8 kHz su stdout, e riduce il flusso in picchi per mini-secchio di `MINI`
 * campioni. Il numero di campioni non e' noto prima della fine (l'intestazione
 * di uno spezzone puo' mentire), quindi i 1800 secchi finali si tagliano DOPO,
 * sui mini-secchi: l'errore di bordo e' al piu' 10 ms su secchi di secondi.
 */
async function peaksFromFiles(paths) {
  for (const p of paths) {
    if (!existsSync(p)) {
      console.error(`livecut-peaks: file assente: ${p}`);
      process.exit(1);
    }
  }
  const dir = mkdtempSync(join(tmpdir(), "livecut-peaks-"));
  const list = join(dir, "concat.txt");
  // Sintassi del demuxer concat: `file '<path>'`, con `'` scritto come `'\''`.
  writeFileSync(
    list,
    paths.map((p) => `file '${resolve(p).replace(/'/g, "'\\''")}'`).join("\n") + "\n",
    "utf8"
  );

  const args = [
    "-v", "error", "-nostdin",
    "-f", "concat", "-safe", "0", "-i", list,
    "-vn", "-ac", "1", "-ar", String(SAMPLE_RATE), "-f", "s8", "-",
  ];
  const ff = spawn(FFMPEG, args, { stdio: ["ignore", "pipe", "pipe"] });

  const minis = [];
  let miniMax = 0;
  let miniFill = 0;
  let total = 0;
  let stderr = "";

  ff.stderr.on("data", (d) => (stderr += d.toString()));
  ff.stdout.on("data", (chunk) => {
    total += chunk.length;
    for (let i = 0; i < chunk.length; i++) {
      const s = chunk[i] >= 128 ? chunk[i] - 256 : chunk[i]; // s8 → -128..127
      const a = s < 0 ? -s : s;
      if (a > miniMax) miniMax = a;
      if (++miniFill === MINI) {
        minis.push(miniMax);
        miniMax = 0;
        miniFill = 0;
      }
    }
  });

  const code = await new Promise((res, rej) => {
    ff.on("error", rej);
    ff.on("close", res);
  });
  rmSync(dir, { recursive: true, force: true });
  if (code !== 0) {
    console.error(`livecut-peaks: ffmpeg e' uscito con ${code}\n${stderr.slice(0, 800)}`);
    process.exit(1);
  }
  if (miniFill > 0) minis.push(miniMax);
  if (minis.length < BUCKETS) {
    console.error(`livecut-peaks: audio troppo corto (${total} campioni) per ${BUCKETS} secchi`);
    process.exit(1);
  }

  const peaks = new Array(BUCKETS);
  const K = minis.length;
  for (let b = 0; b < BUCKETS; b++) {
    const from = Math.floor((b * K) / BUCKETS);
    const to = Math.max(from + 1, Math.floor(((b + 1) * K) / BUCKETS));
    let m = 0;
    for (let k = from; k < to; k++) if (minis[k] > m) m = minis[k];
    peaks[b] = Math.min(255, Math.round((m * 255) / 128));
  }

  const seconds = total / SAMPLE_RATE;
  note(`file: ${paths.length} input, ${total} campioni a ${SAMPLE_RATE} Hz = ${seconds.toFixed(1)} s (${hms(seconds)})`);
  return peaks;
}

/* ───────────────────── --soundcloud: l'importer, non il default ───────────────────── */

async function peaksFromSoundCloud(permalink) {
  let url;
  try {
    url = new URL(permalink);
  } catch {
    usage("--soundcloud vuole un URL");
  }
  if (url.hostname !== "soundcloud.com") usage("--soundcloud vuole un permalink su soundcloud.com");

  const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36";
  const page = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html" } });
  if (!page.ok) {
    console.error(`livecut-peaks: la pagina della traccia risponde ${page.status}`);
    process.exit(1);
  }
  const html = (await page.text()).replace(/\\\//g, "/");
  const m = html.match(/"waveform_url":"(https:\/\/wave\.sndcdn\.com\/[A-Za-z0-9_-]+_m\.json)"/);
  if (!m) {
    console.error("livecut-peaks: nessun `waveform_url` `_m.json` nella pagina (l'importer dipende da un dato non documentato)");
    process.exit(1);
  }
  const wave = await fetch(m[1], { headers: { "User-Agent": UA } });
  if (!wave.ok) {
    console.error(`livecut-peaks: il JSON della waveform risponde ${wave.status}`);
    process.exit(1);
  }
  const body = await wave.json();
  const height = Number(body?.height);
  const samples = Array.isArray(body?.samples) ? body.samples : null;
  if (!samples || !Number.isFinite(height) || height <= 0) {
    console.error("livecut-peaks: JSON della waveform senza `samples`/`height`");
    process.exit(1);
  }
  note(`soundcloud: ${samples.length} campioni, altezza ${height} (${m[1]})`);
  return samples.map((v) => Math.max(0, Math.min(255, Math.round((Number(v) * 255) / height))));
}

/* ───────────────────────── --write: solo il laboratorio ───────────────────────── */

async function writeToLab(id, peaks) {
  const REF = process.env.LAB_PROJECT_REF;
  const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
  const LAB_URL = process.env.LAB_SUPABASE_URL;
  const LAB_SRK = process.env.LAB_SUPABASE_SERVICE_ROLE_KEY;
  if (!REF || !TOKEN || !LAB_URL || !LAB_SRK) {
    console.error("livecut-peaks: LAB_PROJECT_REF, SUPABASE_ACCESS_TOKEN, LAB_SUPABASE_URL o LAB_SUPABASE_SERVICE_ROLE_KEY assenti. Carica .env.local e poi .env.lab.local.");
    process.exit(2);
  }
  if (REF === PRODUCTION_REF || LAB_URL.includes(PRODUCTION_REF) || !LAB_URL.includes(REF)) {
    console.error("RIFIUTO: la destinazione non e' il laboratorio.");
    process.exit(2);
  }
  if (peaks.length !== BUCKETS) {
    console.error(`RIFIUTO: l'array ha ${peaks.length} valori, non ${BUCKETS}: non si scrive.`);
    process.exit(1);
  }
  if (!peaks.every((v) => Number.isInteger(v) && v >= 0 && v <= 255)) {
    console.error("RIFIUTO: un valore e' fuori da 0..255.");
    process.exit(1);
  }

  const query =
    `update public.livecuts set waveform_peaks = '{${peaks.join(",")}}'::smallint[] ` +
    `where id = '${id}' returning id`;
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    console.error(`livecut-peaks: lab.sql ${res.status}: ${(await res.text()).slice(0, 400)}`);
    process.exit(1);
  }
  const updated = await res.json();
  if (!Array.isArray(updated) || updated.length !== 1) {
    console.error(`livecut-peaks: l'UPDATE ha toccato ${Array.isArray(updated) ? updated.length : "?"} righe, non 1 (uuid sbagliato?)`);
    process.exit(1);
  }

  // Rilettura da una sorgente diversa: PostgREST con la service key.
  const back = await fetch(`${LAB_URL}/rest/v1/livecuts?select=id,waveform_peaks&id=eq.${id}`, {
    headers: { apikey: LAB_SRK, Authorization: `Bearer ${LAB_SRK}` },
  });
  const rows = back.ok ? await back.json() : null;
  const stored = Array.isArray(rows) && rows.length === 1 ? rows[0].waveform_peaks : null;
  const cardinality = Array.isArray(stored) ? stored.length : null;
  note(`write: riga ${id} aggiornata; PostgREST rilegge cardinality(waveform_peaks) = ${cardinality}`);
  if (cardinality !== BUCKETS) {
    console.error("livecut-peaks: la rilettura non concorda con cio' che e' stato scritto.");
    process.exit(1);
  }
}

/* ───────────────────────────── main ───────────────────────────── */

function hms(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

const peaks = files.length > 0 ? await peaksFromFiles(files) : await peaksFromSoundCloud(soundcloud);
const max = Math.max(...peaks);
const mean = peaks.reduce((a, b) => a + b, 0) / peaks.length;
note(`peaks: ${peaks.length} valori, max ${max}, media ${mean.toFixed(1)}`);

if (json) process.stdout.write(JSON.stringify(peaks) + "\n");
if (writeId) await writeToLab(writeId, peaks);
