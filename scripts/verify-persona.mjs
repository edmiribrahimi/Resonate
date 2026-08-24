#!/usr/bin/env node
/**
 * verify-persona.mjs — controlli meccanici sull'Expert Persona di re:sonate.
 *
 * Perche' esiste: questo repo non ha un test runner, quindi ogni gate della
 * persona e' prosa che nessuno esegue. Sette delle sue regole sono pero'
 * verificabili meccanicamente, e questo script le esegue. Le altre restano
 * disciplina scritta — e va detto, invece di lasciar credere che il verde qui
 * significhi "la persona e' corretta". Significa "la persona e' coerente".
 *
 * Il controllo F e' l'eccezione: non riguarda la coerenza della persona ma la
 * riservatezza del materiale di produzione su un repository PUBBLICO. Sta qui
 * perche' e' l'unico posto del repo dove un controllo automatico esiste.
 *
 * Zero dipendenze, ESM puro. Exit non-zero se un controllo fallisce.
 *
 * Uso:  npm run verify:persona
 *
 * NON e' agganciato a `next build` di proposito: re:sonate spedisce serate, e
 * bloccare un deploy la sera di un evento perche' una riga di tabella markdown
 * e' andata in deriva sarebbe uno scambio pessimo. Il controllo si esegue
 * quando si tocca la persona, che e' quando serve.
 */

import { readdirSync, readFileSync, lstatSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RULES_DIR = `${ROOT}/.claude/rules`;

/**
 * I moduli deliberatamente senza `paths:`: governano materiale che non vive nel
 * repo (production tracker), quindi non possono caricarsi da soli e vanno
 * consultati a mano.
 *
 * Questa costante E' il gate "il set senza paths non cresce in silenzio"
 * (`ai-engineering.md`) reso eseguibile: aggiungere un modulo senza frontmatter
 * senza aggiungerlo qui fa fallire il controllo. E' l'unico modo perche' una
 * scelta del genere resti una decisione invece di diventare un'abitudine.
 */
const MANUAL_MODULES = new Set([
  'production-calendar',
  'brand-visual-system',
  'sound-manifesto',
  'venue-acquisition',
  'legal-compliance',
  'community-membership',
]);

/**
 * Tetto del context budget, PRE-REGISTRATO il 2026-08-04 prima di misurare
 * quale file lo raggiunge, e **ALZATO una volta** il 2026-08-24.
 *
 * ── La derivazione originale, che resta il criterio ─────────────────────────
 *
 * Non un numero scelto: ~1,5x il caso peggiore misurato allora (7.663 token).
 * La proprieta' che quel rapporto comprava e' **un modulo ordinario di
 * margine**: un modulo nuovo di dimensione ordinaria o un glob leggermente
 * allargato non lo toccano; un glob allargato in modo materiale si'.
 *
 * ── Perche' e' stato alzato, e da chi ───────────────────────────────────────
 *
 * ⚠ **Questo blocco diceva «non alzare questo numero». Il proprietario ha
 * deciso di alzarlo il 2026-08-24**, con il costo enunciato prima della
 * scelta: il tetto non e' un limite di memoria, e' la soglia oltre la quale
 * tenere insieme tutte le regole caricate smette di essere affidabile, e
 * alzarlo sposta il problema dove non si misura piu'.
 *
 * La riga vietava cio' che il codice ora fa, quindi e' stata riscritta invece
 * che lasciata: un commento che contraddice il proprio codice e' peggio di
 * nessun commento, ed e' il difetto che questa stessa persona vieta altrove.
 *
 * **Il nuovo valore non e' arbitrario: ricompra la stessa proprieta'.** Caso
 * peggiore misurato il 2026-08-24: **11.933 token**, con un margine sceso a
 * **67**. I cinque file del caso peggiore pesano in media ~2.400 token l'uno,
 * quindi 15.000 restituisce **poco piu' di un modulo ordinario** di margine —
 * la stessa distanza che 12.000 dava il 2026-08-04, non una di piu'.
 *
 * ── Cosa NON e' cambiato ────────────────────────────────────────────────────
 *
 * La correzione di prima scelta resta **restringere i `paths:` o accorciare la
 * prosa**, e la priorita' resta quella scritta in `ai-engineering.md`: se il
 * budget stringe **si taglia la descrizione, non la regola**. Alzare il tetto
 * e' stata una decisione del proprietario, **non una via ordinaria**, e una
 * seconda volta va chiesta di nuovo — non ereditata da questa.
 */
const BUDGET_CEILING_TOKENS = 15000;

/**
 * Materiale di produzione che NON deve finire su questo repository, che e'
 * **pubblico** (github.com/edmiribrahimi/Resonate).
 *
 * Perche' un controllo e non solo una riga di .gitignore: una pubblicazione su
 * repo pubblico e' **irreversibile** — resta nei fork, nelle cache e nella
 * history anche dopo la rimozione. Contro un'operazione irreversibile ci si
 * difende meccanicamente, non con l'attenzione. Stessa logica di
 * `venue-secrecy.md`, applicata al materiale invece che al singolo indirizzo.
 */
const PRIVATE_PATHS = ['docs', '.firecrawl', '.claude/settings.local.json'];

/** Rapporto byte/token per prosa italiana. Approssimato e dichiarato tale. */
const BYTES_PER_TOKEN = 3.6;

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  '.vercel',
  'dist',
  'build',
  'coverage',
]);

// ── lettura ───────────────────────────────────────────────────────────────

function listRepoFiles() {
  const out = [];
  const walk = rel => {
    for (const name of readdirSync(rel === '' ? ROOT : `${ROOT}/${rel}`)) {
      if (SKIP_DIRS.has(name)) continue;
      const child = rel === '' ? name : `${rel}/${name}`;
      const st = lstatSync(`${ROOT}/${child}`);
      if (st.isSymbolicLink()) continue;
      st.isDirectory() ? walk(child) : out.push(child);
    }
  };
  walk('');
  return out;
}

function parseFrontmatterPaths(text) {
  if (!text.startsWith('---')) return [];
  const end = text.indexOf('\n---', 3);
  if (end === -1) return [];
  const paths = [];
  let inPaths = false;
  for (const raw of text.slice(3, end).split('\n')) {
    const line = raw.trimEnd();
    if (/^paths:\s*$/.test(line)) {
      inPaths = true;
      continue;
    }
    if (!inPaths) continue;
    const m = /^\s*-\s*"([^"]+)"\s*$/.exec(line);
    if (m) {
      paths.push(m[1]);
      continue;
    }
    if (/^\s*#/.test(line) || line.trim() === '') continue;
    inPaths = false;
  }
  return paths;
}

function loadModules() {
  return readdirSync(RULES_DIR)
    .filter(f => f.endsWith('.md'))
    .sort()
    .map(f => {
      const text = readFileSync(`${RULES_DIR}/${f}`, 'utf8');
      return {
        name: f.slice(0, -3),
        paths: parseFrontmatterPaths(text),
        bytes: Buffer.byteLength(text),
      };
    });
}

/** Righe della tabella `| Domain | Scope |` di CLAUDE.md. */
function parseIndex(text) {
  const rows = [];
  let inTable = false;
  for (const line of text.split('\n')) {
    if (/^\|\s*Domain\s*\|\s*Scope\s*\|/.test(line)) {
      inTable = true;
      continue;
    }
    if (!inTable) continue;
    if (!line.startsWith('|')) break;
    if (/^\|[-|\s]+\|$/.test(line)) continue;
    const cells = line.split('|').map(c => c.trim());
    if (cells.length < 4) continue;
    rows.push({
      domain: cells[1],
      globs: [...cells[2].matchAll(/`([^`]+)`/g)].map(m => m[1]),
    });
  }
  return rows;
}

/** Glob -> RegExp ancorata. Supporta solo le forme usate nei frontmatter. */
function globToRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        if (glob[i + 2] === '/') {
          re += '(?:[^/]+/)*';
          i += 2;
        } else {
          re += '.*';
          i += 1;
        }
      } else {
        re += '[^/]*';
      }
    } else if (c === '?') {
      re += '[^/]';
    } else if ('\\^$.|+()[]{}'.indexOf(c) !== -1) {
      re += '\\' + c;
    } else {
      re += c;
    }
  }
  return new RegExp('^' + re + '$');
}

const key = globs => [...globs].sort().join(' ');

// ── controlli ─────────────────────────────────────────────────────────────

const failures = [];
const notes = [];

function check(label, problems, detail) {
  if (problems.length === 0) {
    console.log(`  ✓ ${label}`);
    if (detail) console.log(`      ${detail}`);
  } else {
    console.log(`  ✗ ${label}`);
    for (const p of problems) console.log(`      ${String(p).replace(/\n/g, '\n      ')}`);
    failures.push(label);
  }
}

console.log('\nverify-persona — Expert Persona re:sonate\n');

if (!existsSync(RULES_DIR)) {
  console.error(`FATAL: ${RULES_DIR} non esiste.`);
  process.exit(2);
}

const files = listRepoFiles();
const modules = loadModules();
const scoped = modules.filter(m => m.name !== 'meta-gates');
const claudeMd = readFileSync(`${ROOT}/CLAUDE.md`, 'utf8');
const index = parseIndex(claudeMd);

// Il controllo non deve poter passare su un insieme vuoto: senza questa
// asserzione un parser rotto renderebbe verdi tutti i controlli sotto.
if (modules.length < 5 || files.length < 100 || index.length < 5) {
  console.error(
    `FATAL: misurazione implausibile (moduli=${modules.length}, file=${files.length}, righe indice=${index.length}). ` +
      'Il controllo si rifiuta di dichiarare verde su un insieme vuoto.'
  );
  process.exit(2);
}

// A — nessun path dichiarato e' morto
check(
  'A · nessun path dichiarato e\' morto',
  modules.flatMap(m =>
    m.paths
      .filter(g => !files.some(f => globToRegExp(g).test(f)))
      .map(g => `${m.name}: "${g}" non matcha alcun file`)
  ),
  `${modules.reduce((n, m) => n + m.paths.length, 0)} glob su ${files.length} file`
);

// B — ogni modulo con paths ha una riga d'indice con lo stesso insieme di glob
{
  const byGlobs = new Map();
  for (const row of index) if (row.globs.length) byGlobs.set(key(row.globs), row.domain);
  const problems = [];
  for (const m of scoped) {
    if (m.paths.length === 0) continue;
    if (!byGlobs.has(key(m.paths))) {
      const near = index.find(r => r.domain.toLowerCase().includes(m.name.split('-')[0]));
      problems.push(
        `${m.name}\n  frontmatter: ${m.paths.join(' , ')}\n  indice:      ${near ? near.globs.join(' , ') || '(nessun glob)' : '(nessuna riga corrispondente)'}`
      );
    }
  }
  check('B · indice CLAUDE.md e frontmatter dichiarano gli stessi glob', problems);
}

// C — ogni modulo ha la sua riga (meta-gates escluso: sempre caricato)
check(
  'C · ogni modulo ha una riga nell\'indice',
  index.length === scoped.length
    ? []
    : [
        `moduli con scope: ${scoped.length} (${scoped.map(m => m.name).join(', ')})`,
        `righe indice:     ${index.length} (${index.map(r => r.domain).join(', ')})`,
      ],
  `${scoped.length} moduli, ${index.length} righe, meta-gates escluso`
);

// D — il set senza paths e' esattamente quello dichiarato
{
  const actual = new Set(scoped.filter(m => m.paths.length === 0).map(m => m.name));
  const problems = [];
  for (const n of actual)
    if (!MANUAL_MODULES.has(n))
      problems.push(`${n} non ha paths ma non e' nel set dichiarato in questo script`);
  for (const n of MANUAL_MODULES)
    if (!actual.has(n)) problems.push(`${n} e' dichiarato manuale ma ora ha paths (o non esiste)`);
  check(
    'D · il set di moduli senza paths e\' quello dichiarato',
    problems,
    `manuali: ${[...actual].join(', ') || '(nessuno)'}`
  );
}

// E — context budget, caso peggiore reale su tutti i file
{
  const always =
    Buffer.byteLength(claudeMd) + (modules.find(m => m.name === 'meta-gates')?.bytes ?? 0);
  const compiled = scoped
    .filter(m => m.paths.length)
    .map(m => ({ name: m.name, bytes: m.bytes, res: m.paths.map(globToRegExp) }));
  let worst = { file: '(nessuno)', bytes: always, mods: [] };
  for (const f of files) {
    const hit = compiled.filter(m => m.res.some(r => r.test(f)));
    const bytes = always + hit.reduce((s, m) => s + m.bytes, 0);
    if (bytes > worst.bytes) worst = { file: f, bytes, mods: hit.map(m => m.name) };
  }
  const tokens = Math.round(worst.bytes / BYTES_PER_TOKEN);
  check(
    'E · context budget entro il tetto pre-registrato',
    tokens <= BUDGET_CEILING_TOKENS
      ? []
      : [
          `${tokens} token > tetto ${BUDGET_CEILING_TOKENS}`,
          'Correzione di prima scelta: restringere i paths o accorciare la prosa — si taglia la descrizione, non la regola. Alzare il tetto resta una decisione del proprietario, presa una volta il 2026-08-24 e non ereditabile: va chiesta di nuovo.',
        ]
  );
  notes.push(
    `caso peggiore: ${worst.file}\n    ${worst.mods.length + 2} file caricati (CLAUDE.md, meta-gates, ${worst.mods.join(', ')})\n    ${worst.bytes} byte ~ ${tokens} token · tetto ${BUDGET_CEILING_TOKENS}`
  );
}

// F — il materiale di produzione resta fuori dal repo pubblico
{
  const problems = [];
  const present = [];
  for (const p of PRIVATE_PATHS) {
    // 1. Se esiste su disco, git deve ignorarlo.
    if (existsSync(`${ROOT}/${p}`)) {
      present.push(p);
      try {
        execFileSync('git', ['check-ignore', '-q', '--', p], { cwd: ROOT, stdio: 'ignore' });
      } catch {
        problems.push(`${p}/ esiste ma NON e' ignorato da git — un 'git add -A' lo pubblicherebbe`);
      }
    }
    // 2. Nulla al suo interno deve essere gia' tracciato. .gitignore non
    //    ha effetto su cio' che e' gia' in indice: le due condizioni sono
    //    indipendenti e vanno verificate separatamente.
    let tracked = '';
    try {
      tracked = execFileSync('git', ['ls-files', '--', p], { cwd: ROOT, encoding: 'utf8' }).trim();
    } catch {
      /* fuori da un repo git: la clausola 2 non si applica */
    }
    if (tracked) {
      const n = tracked.split('\n').length;
      problems.push(
        `${p}/ ha ${n} file GIA' TRACCIATI — .gitignore non li rimuove. Serve 'git rm --cached'`
      );
    }
  }
  check(
    'F · il materiale di produzione resta fuori dal repo pubblico',
    problems,
    present.length
      ? `presenti e ignorati: ${present.join(', ')}`
      : 'nessuna delle directory protette e\' presente su questa macchina'
  );
}

// G — la tabella di priorita' in meta-gates.md descrive il routing reale
//
// Perche' esiste: fino alla v1.4 quella tabella era un SECONDO indice che
// nessuno verificava, e aveva gia' derivato — dichiarava `access-gating`
// primario su `src/app/(admin)/**` mentre il frontmatter di quel modulo non
// lo agganciava. Il controllo B copre l'indice di CLAUDE.md, non questo.
//
// Cosa asserisce: per ogni riga, il modulo PRIMARIO dichiarato si carica
// davvero su tutti i file che la riga copre. I supplementari sono "domini da
// consultare" — spesso manuali o non agganciati a quel path — quindi di
// quelli si verifica solo che il nome esista.
{
  const metaText = readFileSync(`${RULES_DIR}/meta-gates.md`, 'utf8');
  const known = new Set(modules.map(m => m.name));
  const withPaths = new Map(modules.filter(m => m.paths.length).map(m => [m.name, m.paths.map(globToRegExp)]));
  const modNames = cell => [...cell.matchAll(/[a-z][a-z0-9]*(?:-[a-z0-9]+)+/g)].map(m => m[0]);

  const rows = [];
  let inTable = false;
  for (const line of metaText.split('\n')) {
    if (/^\|\s*Path\s*\|\s*Modulo primario\s*\|/.test(line)) {
      inTable = true;
      continue;
    }
    if (!inTable) continue;
    if (!line.startsWith('|')) break;
    if (/^\|[-|\s]+\|$/.test(line)) continue;
    const cells = line.split('|').map(c => c.trim());
    if (cells.length < 5) continue;
    rows.push({
      globs: [...cells[1].matchAll(/`([^`]+)`/g)].map(m => m[1]),
      primary: modNames(cells[2])[0],
      extra: modNames(cells[3]),
    });
  }

  const problems = [];
  if (rows.length < 5) {
    problems.push(`tabella non letta o troppo corta (${rows.length} righe): parser o intestazione cambiati`);
  }

  // Ogni glob della tabella, con la riga che lo dichiara. Un file appartiene
  // alla riga il cui glob e' PIU' SPECIFICO (piu' lungo) fra quelli che lo
  // matchano: e' cosi' che `src/app/api/cron/venue-reveal/**` sottrae i suoi
  // file a `src/app/api/cron/**` senza che la riga generica fallisca.
  const allGlobs = rows.flatMap((r, i) => r.globs.map(g => ({ g, re: globToRegExp(g), row: i })));

  for (const [i, row] of rows.entries()) {
    if (!row.primary || !known.has(row.primary)) {
      problems.push(`riga ${i + 1} (${row.globs.join(', ')}): modulo primario "${row.primary ?? '(assente)'}" non esiste`);
      continue;
    }
    for (const n of row.extra) if (!known.has(n)) problems.push(`riga ${i + 1}: supplementare "${n}" non esiste`);

    const primaryRes = withPaths.get(row.primary);
    if (!primaryRes) {
      problems.push(`riga ${i + 1}: "${row.primary}" e' dichiarato primario ma non ha paths — non puo' caricarsi`);
      continue;
    }
    for (const g of row.globs) {
      const re = globToRegExp(g);
      const matched = files.filter(f => re.test(f));
      if (matched.length === 0) {
        problems.push(`riga ${i + 1}: "${g}" non matcha alcun file`);
        continue;
      }
      const owned = matched.filter(
        f => !allGlobs.some(o => o.row !== i && o.g.length > g.length && o.re.test(f))
      );
      const missed = owned.filter(f => !primaryRes.some(r => r.test(f)));
      if (missed.length) {
        problems.push(
          `riga ${i + 1}: "${row.primary}" dichiarato primario su "${g}" ma NON si carica su ${missed.length} file` +
            `\n  es. ${missed.slice(0, 3).join('\n      ')}`
        );
      }
    }
  }
  check(
    'G · la tabella di meta-gates descrive il routing reale',
    problems,
    `${rows.length} righe verificate contro i frontmatter`
  );
}

// ── esito ─────────────────────────────────────────────────────────────────

if (notes.length) {
  console.log('\n  misure:');
  for (const n of notes) console.log(`    ${n}`);
}

console.log(
  '\n  Nota: questo script verifica la COERENZA della persona, non la sua correttezza.' +
    '\n  I gate di dominio restano prosa: questo repo non ha un test runner.\n'
);

if (failures.length) {
  console.error(`FALLITI ${failures.length}/7: ${failures.join(' · ')}\n`);
  process.exit(1);
}
console.log('7/7 verdi.\n');
