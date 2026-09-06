-- reserve_ticket smette di essere chiamabile da chi non ha pagato.
--
-- MISURATO IN PRODUZIONE il 2026-09-06, non dedotto. Tutti e tre i sovraccarichi
-- di `public.reserve_ticket` portavano:
--
--     proacl = {=X/postgres, postgres=X, anon=X, authenticated=X, service_role=X}
--     prosecdef = true
--     proconfig = NULL          -- nessun search_path fissato
--
-- `=X` e' la concessione a PUBLIC che Postgres mette su OGNI funzione nuova, e
-- PostgREST espone le funzioni dello schema `public` su `/rest/v1/rpc/`. La
-- funzione e' SECURITY DEFINER — quindi scavalca la RLS — e **riceve dal
-- chiamante chi compra e per quale tier**: `p_user_id` e `p_tier_id` sono
-- parametri, non valori riletti dal server.
--
-- Il percorso, per esteso: si registra un conto, si chiama
-- `/rest/v1/rpc/reserve_ticket` con il proprio `user_id`, e si ottiene un
-- biglietto **senza che nessun pagamento sia mai avvenuto**.
--
-- Il tetto residuo era `tickets_party_user_unique` — un biglietto per conto per
-- serata — che il piano 49-01 ha ricreato ristretto a `order_id IS NULL`,
-- quindi copre ancora questa strada. Un tetto non e' una porta chiusa: e' un
-- limite alla quantita' di ingressi gratuiti per persona.
--
-- ⚠ NON E' UN DIFETTO INTRODOTTO DALLA FASE 49. E' preesistente, e fino a oggi
-- non contava perche' non esisteva un solo biglietto in vendita. La fase 49 e'
-- quella che apre le vendite, quindi e' la fase in cui comincia a contare — e
-- il momento in cui si chiude e' prima che esista qualcosa da rubare, non dopo.
--
-- PERCHE' REVOCARE NON ROMPE NIENTE, verificato leggendo il codice e non
-- assumendolo: `reserve_ticket` ha **un solo chiamante in tutto `src/`**, ed e'
-- `src/app/api/webhooks/sumup/route.ts:49`, che usa `getServiceClient()`
-- (riga 2 e riga 28). Il `service_role` non passa dai permessi di `anon` ne' di
-- `authenticated`, quindi la revoca lascia intatto l'unico percorso reale.
--
-- Nessun `GRANT` nuovo: `service_role` ce l'ha gia' esplicitamente, e resta.
-- Si toglie soltanto — che e' la sola direzione che una guardia su un percorso
-- di denaro consente (`meta-gates.md`, guardie monotone).
--
-- Autorizzazione: proprietario, 2026-09-06, estensione dichiarata del perimetro
-- di `49-AUTHORISATION.md` da cinque migration a sei, con la ragione posta prima
-- della scelta.

-- I tre sovraccarichi, per firma esatta letta da `oid::regprocedure` e non
-- ricostruita a memoria. `IF EXISTS` non esiste per REVOKE: le firme sono state
-- lette dal catalogo lo stesso giorno.
REVOKE EXECUTE ON FUNCTION public.reserve_ticket(uuid, uuid, uuid, text, text, numeric)
  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.reserve_ticket(uuid, uuid, uuid, uuid, text, text, numeric)
  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.reserve_ticket(uuid, uuid, uuid, uuid, text, text, numeric, uuid)
  FROM PUBLIC, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- IL `search_path` NON SI FISSA QUI, ED E' UNA DECISIONE, NON UNA DIMENTICANZA.
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Tutti e tre i sovraccarichi sono SECURITY DEFINER con `proconfig = NULL`.
-- La correzione ovvia sarebbe `ALTER FUNCTION ... SET search_path = ''` accanto
-- alla revoca. Non si fa, e la ragione e' un'asimmetria fra i due modi di
-- sbagliare.
--
-- I tre corpi SONO risultati completamente qualificati — letti da `pg_proc.prosrc`
-- il 2026-09-06: 4, 5 e 7 riferimenti `public.`, e **zero** riferimenti nudi in
-- `FROM`, `JOIN`, `UPDATE` o `INSERT INTO`. L'evidenza e' a favore.
--
-- Ma `ALTER FUNCTION ... SET search_path` non riscrive il corpo, e in questo
-- repository **non esiste un test runner**: non c'e' modo di provare che le tre
-- funzioni continuino a girare senza scrivere righe in produzione, che
-- l'autorizzazione del 2026-09-06 esclude nominatamente.
--
--   * Se il fissaggio fosse sbagliato, **ogni acquisto fallirebbe dentro il
--     webhook dei pagamenti**: incasso avvenuto, biglietto mai emesso, e nessun
--     error tracking a dirlo. E' il fallimento peggiore che questo dominio abbia.
--   * Se il fissaggio manca, il rischio residuo e' l'ombreggiamento di un oggetto
--     da uno schema che precede — che richiede il diritto di crearlo, cioe' un
--     privilegio che **dopo la revoca qui sopra non ha piu' nessuno** dei ruoli
--     raggiungibili dall'esterno.
--
-- La revoca chiude il percorso. Il fissaggio sarebbe difesa in profondita'
-- contro una minaccia che la revoca ha gia' tolto di mezzo, pagata con il
-- rischio di rompere il percorso del denaro alla cieca.
--
-- Resta un debito DICHIARATO, non nascosto: va fatto insieme al primo esercizio
-- vero del webhook, quando un acquisto reale potra' provarlo.

COMMENT ON FUNCTION public.reserve_ticket(uuid, uuid, uuid, uuid, text, text, numeric, uuid) IS
  'Emette un biglietto dopo un pagamento verificato. Chiamabile SOLO dal service_role: '
  'e'' SECURITY DEFINER e riceve dal chiamante chi compra, quindi una concessione ad '
  'anon o authenticated e'' un percorso di biglietti gratuiti. Revocata il 2026-09-06 '
  'dopo averla misurata aperta in produzione. Unico chiamante: il webhook dei pagamenti.';
