import { redirect } from "next/navigation";

/**
 * `/` — non e' piu' una superficie, e' un rimando.
 *
 * ── Cosa e' cambiato, e perche' non e' un ritocco ────────────────────────────
 *
 * Qui viveva la landing: il wordmark, `Discover Events`, `Join` e
 * `Already a member? Sign In`. **Il pulsante `Join` portava a `/register`**, e
 * con la fase 50 quell'indirizzo non esiste piu' (D-50-11): nessuno si iscrive
 * piu' da solo, entra chi compra un biglietto o chi e' invitato da guest list.
 * Una landing il cui invito principale porta a un 404 non e' una landing da
 * correggere: e' una landing senza piu' la domanda a cui rispondeva.
 *
 * D-50-12: `/` rimanda a `/events` **per tutti**. Anche per chi e' loggato —
 * prima una sessione finiva sulla propria pagina account, e ora no. Il ramo che
 * leggeva
 * `getAccessContext()` e' sparito con la pagina: qui non si legge piu' alcuna
 * sessione, quindi non c'e' piu' un esito che dipende da chi sei. Meno rami
 * significa anche che questo file non ha piu' niente da dire sulla colonna
 * `profiles.status`, che la migration di questa fase cancella (D-50-01) — e il
 * codice viene dispiegato **prima** di quella migration (D-50-24), quindi non
 * poteva restare a leggerla.
 *
 * ── La voce `Home` della barra esce nello stesso piano ───────────────────────
 *
 * `NAV_ITEMS` portava una voce `/` con l'etichetta `Home`, visibile solo a chi
 * non ha sessione. Con questa pagina ridotta a un rimando, quella voce
 * porterebbe **altrove che da se'**: la si toglie nello stesso piano
 * (`src/lib/rbac/roles.ts`). **Se `/` torni a essere una pagina, e con quale
 * significato, lo decide la fase 52 (`NAV-01`)** — non questa.
 *
 * ── Il `start_url` dell'app installata ───────────────────────────────────────
 *
 * `public/manifest.json` dichiarava `start_url: "/"`. Restando cosi', ogni
 * apertura dell'app installata pagherebbe questo salto: e' passato a `/events`
 * nello stesso commit.
 *
 * `redirect()` da un Server Component emette un 307 — **temporaneo, quindi non
 * memorizzato dal browser**. E' la proprieta' che qui serve, ed e' esattamente
 * l'opposto di quella del redirect *permanente* `/registrati` tolto da
 * `next.config.ts` nello stesso commit.
 */
export default function Home() {
  redirect("/events");
}
