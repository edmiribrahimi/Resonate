"use client";

import { useState, useTransition } from "react";
import type { UserRole } from "@/types/database";
import {
  updateMemberRole,
  deleteAccount,
} from "@/app/(admin)/admin/members/actions";
import MemberActionNotice, {
  type MemberNoticeKind,
} from "@/app/(admin)/admin/members/MemberActionNotice";
import {
  Button,
  FOCUS_RING,
  type ButtonVariant,
} from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Chip";
import { DataTable, type DataColumn } from "@/components/ui/DataTable";
import { Input, Select } from "@/components/ui/Input";

/**
 * ── COSA QUESTA SUPERFICIE E' DIVENTATA, CON LA FASE 50 ──────────────────────
 *
 * Era una tabella su **due assi**: il ruolo e lo stato. Disegnava quattro
 * schede (All / Pending / Approved / Rejected), una colonna di stato, sei
 * azioni — approva, rifiuta, ritira l'accesso, riammetti, e le due in blocco —
 * e il referral di ogni riga.
 *
 * Lo stato non esiste piu' (D-50-01): la colonna e' uscita dallo schema, e con
 * lei le sue transizioni, le sue mail e la sua metafora. **Togliere l'accesso a
 * qualcuno significa ora cancellare il suo account** (D-50-16), e il referral
 * e' sparito da ogni superficie (D-50-08/D-50-10).
 *
 * Quindi questa pagina e' una **lista di account con il loro ruolo**, con due
 * operazioni: crearne uno (il modulo sta sopra, sulla pagina) e cancellarne
 * uno — l'unica distruttiva, e l'unica che puo' rispondere di no.
 *
 * ── Cio' che NON e' cambiato ─────────────────────────────────────────────────
 *
 * Il modo di riferire un esito. Niente in questo file legge il `message` di un
 * errore catturato: Next lo **redige** in un build di produzione, quindi una
 * superficie che ramificasse su una frase funzionerebbe in `next dev` e
 * smetterebbe di funzionare dove conta. La categoria viaggia come VALORE.
 * L'unico caso in cui nessun valore esiste — l'azione non e' tornata affatto —
 * ha la sua etichetta, `transport_unavailable`, e la sua frase.
 */
type ActionNotice = { kind: MemberNoticeKind; detail?: string };

/**
 * L'esito di un atto, ridotto a cio' che questa superficie legge davvero.
 *
 * I due atti che questa tabella chiama portano vocabolari di fallimento
 * diversi — `MemberActFailure` e `DeleteAccountFailure` — e questa forma e' il
 * loro minimo comune: **riuscito**, oppure **rifiutato con una causa e il suo
 * dettaglio**. Entrambi vi si assegnano per struttura, quindi non c'e' nessun
 * cast fra i due e nessun punto in cui una causa possa essere inventata.
 *
 * `failure` e' una `string` qui e non l'unione: l'unione vive in
 * `MemberActionNotice`, che ha il `Record` esaustivo ed e' il posto dove
 * aggiungere una causa senza una frase e' un errore di build.
 */
type TaggedOutcome =
  | { ok: true }
  | { ok: false; failure: string; detail: string };

/**
 * ── Il VALORE del ruolo lo decide il `CHECK`, l'ETICHETTA no ────────────────
 *
 * `profiles_role_check` ammette quattro valori e nessun altro —
 * `master`, `organizer`, `staff`, `attendee` — quindi ogni letterale scritto
 * qui sotto e' un dato, non una parola scelta: un valore fuori da quei quattro
 * torna `23514` dal database, non un errore di build. **L'etichetta** che un
 * organizer legge accanto al valore e' invece discrezione di questo file e di
 * `CreateAccountForm.tsx`, che ne usano una sola e la stessa. Chi la cambiera'
 * domani cambi quella, mai il valore.
 *
 * **Il codice socio e' uscito da questa riga** con D-51-02: la sua colonna cade
 * nel piano 51-12, e una superficie che la interroga dopo il `DROP COLUMN` non
 * mostra un dato vuoto — chiede una colonna che non esiste. Il nome della
 * colonna non e' scritto qui: la stessa grep-igiene che il piano 51-04 ha
 * applicato agli elenchi d'accesso, cosi' che una ricerca per nome trovi i
 * lettori veri e non i commenti che ne parlano.
 */
interface MemberRow {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

/**
 * ── `callerRole` was REMOVED on 2026-08-08, and that is the point ────────────
 *
 * It existed to draw two controls for the master alone, mirroring a
 * `verifyMaster` gate that no longer exists. With nothing left for it to
 * decide, keeping the prop would have left a value named after a ROLE sitting
 * in a component that no longer branches on one — the exact shape a later
 * reader reads as a permission. Both call sites passed a LITERAL for it anyway,
 * so it never carried a fact about the session in the first place; the real
 * question is asked by `getAccessContext()` on the page and again inside every
 * action.
 */
interface MemberTableProps {
  members: MemberRow[];
  currentUserId: string;
  showActions: boolean;
}

// Badge components
function RoleBadge({ role }: { role: UserRole }) {
  // `Record<UserRole, string>` è stato per un'intera fase l'UNICO punto di
  // `src/` che l'allargamento di `UserRole` rompeva, e trovarlo correggeva una
  // previsione: `43-PATTERNS.md` § 21 si aspettava **zero** errori di build dal
  // quarto ruolo, sul ragionamento che diciassette punti di chiamata fanno
  // `role as UserRole` e un cast ferma il compilatore. Vero per i diciassette,
  // falso per un tipo mappato, che TypeScript controlla per esaustività.
  //
  // ── L'aspetto di `staff`, deciso qui invece che lasciato provvisorio ───────
  //
  // Due meta' che tirano in direzioni opposte, ed entrambe si tengono:
  //
  //   * `staff` NON deve prendere in prestito il vocabolario cromatico del
  //     potere. Misurato cella per cella nel piano 43-08 su 21 tabelle × 3
  //     verbi: `staff` non concede **nulla** che un `attendee` non abbia gia', e
  //     non porta alcuna riga `door.operate`. Il viola e il blu dicono «questo
  //     account puo' di piu'»; per `staff` sarebbe una bugia detta
  //     dall'interfaccia prima che qualcuno legga una parola.
  //   * `staff` deve restare TROVABILE a colpo d'occhio. Non piu' per il posto
  //     gratuito permanente — quello e' uscito con la tessera nella fase 51,
  //     vedi la legenda sotto la tabella — ma perche' chi conta gli account di
  //     lavoro prima di una serata li deve distinguere in una lista, e un badge
  //     identico pixel per pixel a quello di un attendee fa fare all'occhio un
  //     lavoro che dovrebbe fare la superficie.
  //
  // Quindi: stessa famiglia neutra, e bordo **tratteggiato** invece che pieno.
  // Il tratteggio si legge come condizionale invece che come elevato, che e'
  // esattamente cio' che il ruolo e'.
  //
  // ── FASE 41: le quattro tinte sono uscite, il tratteggio e' rimasto ────────
  //
  // Non esiste alcuna tinta di ruolo nel livello dei token e non c'e' posto per
  // una: le quattro semantiche nominano STATI, `--accent` e' riservato dal §5.1
  // a quattro cose fra cui un badge di ruolo non c'e', e inventare una quinta
  // famiglia sarebbe decidere in CSS cosa significa un ruolo. **La parola e' il
  // canale** — e lo e' sempre stata, visto che il contenuto del badge e' il
  // nome del ruolo.
  return (
    <Badge className={role === "staff" ? "border-dashed" : ""}>{role}</Badge>
  );
}

/**
 * The joined date, in one place instead of two.
 *
 * It used to be an inline expression written out twice — once in the table
 * branch and once in the card branch — which is the drift D-41-17 names: two
 * copies of one rendering, in two trees that must agree. The primitive drives
 * both branches from one column declaration now, so this has one home.
 */
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatJoined(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Action button with loading state.
 *
 * ── Two defects fixed here, both of them silent ───────────────────────────────
 *
 * `onClick` used to be typed `() => void` while every call site passed
 * `() => handleAction(...)`, which is `async`. So the returned promise was
 * dropped: the `startTransition` finished before the act had begun, the spinner
 * flashed for a frame and the button re-enabled itself while a write was still
 * in flight — which invites a second click on an act that is already running.
 * The type is now `() => Promise<void>` and the call is **awaited** inside the
 * transition, so the pending state is the real one.
 *
 * The same dropped promise also made this component's own `try/catch` dead
 * code — a rejection could never reach it — and with it the local error line
 * that used to render the caught error's message. Both are gone: the parent
 * owns the notice, because a refusal needs more room than a cell and because
 * that message is redacted in a production build.
 */
type ActionVariant = "promote" | "demote" | "delete";

/**
 * ── Tre nomi di atto, sui pioli della scala dei pulsanti ─────────────────────
 *
 * Erano sei, e cinque delle sei tinte **davano un voto a un atto su una
 * persona** — approvare disegnato nel colore del successo, rifiutare in quello
 * del fallimento. Quei cinque atti non esistono piu' (D-50-16), e cio' che
 * resta tiene la stessa regola: il cambio di ruolo e' un atto ordinario, e la
 * cancellazione no.
 *
 * **`delete` e' il piolo distruttivo, ed e' il solo.** Cancellare un account
 * toglie una persona dalla community e **non si puo' riprendere** — questo
 * repository non ha PITR. E' cio' per cui il piolo distruttivo esiste, ed e'
 * `--ground` su `--sem-crit` a **7.36 : 1**, non una tinta scelta da qualcuno.
 */
const ACTION_VARIANT: Record<ActionVariant, ButtonVariant> = {
  promote: "secondary",
  demote: "secondary",
  delete: "destructive",
};

/**
 * §6.3's shrink allow-list, closed at one item, and this is the item.
 *
 * It is applied **only** when the `DataTable` primitive says the button is in
 * its table branch — a branch that is hidden below 768px and therefore never
 * renders on a phone — and the variant shrinks it further only on a machine
 * with **no coarse pointer at all**. 36px is the floor and nothing goes lower.
 *
 * The flag comes from the primitive rather than from a viewport read, which is
 * D-41-07's construction: the default is the large target, and the query is
 * only ever used to shrink, so a wrong answer costs a slightly-too-large button
 * and never a too-small one.
 */
const DENSE_ROW_ACTION = "pointer-fine-only:min-h-9";

function ActionButton({
  onClick,
  label,
  variant,
  dense = false,
}: {
  onClick: () => Promise<void>;
  label: string;
  variant: ActionVariant;
  /** True only inside the table branch. See `DENSE_ROW_ACTION`. */
  dense?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    // Awaited: see the note above. `handleAction` already reports every outcome
    // through the parent's notice and never rejects, so there is deliberately
    // no `catch` here to swallow one.
    startTransition(async () => {
      await onClick();
    });
  };

  return (
    <Button
      size="sm"
      variant={ACTION_VARIANT[variant]}
      onClick={handleClick}
      disabled={isPending}
      className={dense ? DENSE_ROW_ACTION : ""}
    >
      {isPending ? (
        <span className="inline-flex items-center gap-1">
          <svg
            className="h-3 w-3 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          ...
        </span>
      ) : (
        label
      )}
    </Button>
  );
}

// =============================================================================
// LA CONFERMA, e l'unico atto che ne ha una
// =============================================================================
//
// Cancellare un account. Il cambio di ruolo deliberatamente **non** chiede:
// e' il lavoro ordinario, e la frizione li' e' puro costo — ed e' reversibile,
// che e' la differenza che decide.
//
// ── NOMINA L'ATTO E CIO' CHE COSTA. Non dice mai «sei sicuro» ────────────────
//
// Una conferma letta male e' peggio di nessuna conferma, perche' allena il
// riflesso a scartare la prossima. Quindi ogni riga qui sotto e' specifica:
// cosa succede, a chi, cosa dira' il registro, e che **non si torna indietro**.
// `nextjs-architecture.md`, gate *accessibilità al buio*: il colore non e' mai
// il solo canale — le parole lo portano.
//
// ── E NON E' UN PERMESSO ─────────────────────────────────────────────────────
//
// Una Server Action e' un endpoint pubblico. Questo riquadro impedisce a una
// mano di scivolare; non impedisce nient'altro, e la guardia in
// `admin/members/actions.ts` resta l'unico confine.

function DeleteConfirm({
  subject,
  onConfirm,
  onCancel,
}: {
  /** Il nome della persona, come la riga sopra lo mostra gia'. */
  subject: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}) {
  const title = `Delete ${subject}'s account?`;

  const lines = [
    "This removes the account entirely: the person stops being able to sign " +
      "in, and whatever the account holds stops being reachable.",
    "It cannot be undone. There is no point-in-time recovery on this " +
      "database, and no screen that puts an account back.",
    "It is recorded as a deletion, with your name and the time, and the row " +
      "keeps a short identifier of the account. The register is append-only: " +
      "the row cannot be edited or deleted afterwards.",
    "The account may refuse to be deleted — if it holds tickets, or has " +
      "worked a door, created a night's catalogue or touched a refund. The " +
      "answer will say which, and nothing will have been deleted.",
    "Nobody is told. This product has no message written for a deletion, so " +
      "the person finds out at the door.",
  ];

  return (
    <Card role="alertdialog" aria-label={title} className="w-full">
      {/* La semantica critica come INCHIOSTRO, mai come riquadro tinto.
          `Dialog.tsx` ha fissato la regola per questo prodotto: `--sem-crit` su
          `--surface` e' **6.99 : 1**, e una scatola intorno a una domanda e' un
          contenitore che non dice niente che il suo contenuto non dica. */}
      <p className="text-sm font-semibold text-sem-crit">{title}</p>
      <ul className="mt-2 flex flex-col gap-1">
        {lines.map((line) => (
          <li key={line} className="text-xs leading-relaxed text-muted">
            {line}
          </li>
        ))}
      </ul>
      {/* Cancel is FIRST in the DOM — §11's order for a destructive question. */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        {/* The spinner lives on the confirm button, and it is real:
            `ActionButton` awaits the promise inside its transition. */}
        <ActionButton
          onClick={onConfirm}
          label="Delete account"
          variant="delete"
        />
      </div>
    </Card>
  );
}

// Actions cell for a single member row
function MemberActions({
  member,
  currentUserId,
  dense = false,
}: {
  member: MemberRow;
  currentUserId: string;
  /**
   * True only inside the table branch, and passed down to every button here.
   * It is a fact about which of the primitive's two trees this is, never a
   * viewport read — see `DENSE_ROW_ACTION`.
   */
  dense?: boolean;
}) {
  const [notice, setNotice] = useState<ActionNotice | null>(null);
  const [confirming, setConfirming] = useState(false);

  // ── Il ponte `const role: string` e' scaduto, e per questo non c'e' piu' ────
  //
  // Stava qui perche' il database accettava `attendee` dal piano 51-08 mentre
  // l'unione `UserRole` lo riceveva dal 51-10: nella finestra fra i due,
  // confrontare l'unione vecchia col valore nuovo era un errore di build su un
  // confronto giusto a runtime. Quel piano e' atterrato — `UserRole` in
  // `src/types/database.ts` porta oggi il quarto valore — e la riga se ne va
  // come dichiarava di dover fare.
  //
  // I quattro confronti qui sotto leggono `member.role`, cioe' l'unione: un
  // refuso — `"attendeee"`, `"Attendee"` — adesso e' un errore di build invece
  // di una colonna di pulsanti che non compare mai. Cio' che si puo' SCRIVERE
  // resta chiuso altrove: `WritableRole` in `actions.ts`, e `isWritableRole`
  // contro il filo.

  // Don't show actions for the user's own row
  if (member.id === currentUserId) {
    return <span className="text-xs text-muted">--</span>;
  }

  // Don't show actions for other masters (shouldn't exist, but defense).
  //
  // Hiding is NOT refusing, and the server knows it: every act reads the
  // subject's current role and returns `forbidden` / `subject_is_master` for
  // one. This branch is the affordance; that check is the boundary.
  if (member.role === "master") {
    return <span className="text-xs text-muted">--</span>;
  }

  const handleAction = async (action: () => Promise<TaggedOutcome>) => {
    setNotice(null);
    try {
      const result = await action();
      if (!result.ok) {
        setNotice({
          kind: result.failure as MemberNoticeKind,
          detail: result.detail,
        });
      }
    } catch {
      // Still reachable, and the only case with no tag to read: a Server Action
      // can fail before its body runs — a lost connection, a framework error
      // Next has already redacted. The caught value is deliberately not
      // inspected: its message is redacted in a production build, so reading it
      // would produce a sentence that is informative in `next dev` and useless
      // where it matters.
      setNotice({ kind: "transport_unavailable" });
    }
  };

  const changeRole = (to: "organizer" | "staff" | "attendee") => () =>
    handleAction(() => updateMemberRole(member.id, to));

  // ── Chi raggiunge QUALE controllo: chiunque raggiunga questa tabella ────────
  //
  // Le sei azioni di stato che stavano qui non esistono piu' (D-50-16), e il
  // `callerRole` che ne disegnava due era gia' uscito il 2026-08-08. Cio' che
  // si disegna per RIGA e' lo stato del SOGGETTO, mai quello di chi guarda:
  // niente sulla propria riga (regola 2) e niente sulla riga di un master
  // (regola 1) — l'affordance che corrisponde a due rifiuti che il server tiene
  // comunque, qualunque cosa questo file disegni.
  //
  // `access-gating.md`, gate *coerenza navigazione/permessi*: nascondere un
  // controllo non e' proteggere un endpoint. Chi arriva qui con `showActions` ha
  // gia' risposto all'unica domanda che conta, e ogni atto se la ripone da solo.

  // La conferma SOSTITUISCE i pulsanti finche' e' aperta, cosi' un secondo
  // click mirato alla riga non puo' atterrare su un atto diverso da quello che
  // si sta confermando.
  if (confirming) {
    return (
      <div className="flex w-full flex-col gap-2">
        <DeleteConfirm
          subject={member.full_name || member.email}
          onCancel={() => setConfirming(false)}
          onConfirm={async () => {
            await handleAction(() => deleteAccount(member.id));
            // Chiusa solo dopo che l'atto ha risposto, cosi' la frase di un
            // rifiuto la disegna il ramo qui sotto invece di un componente gia'
            // smontato. **E la frase si mostra alla lettera**: le dodici cause
            // della cancellazione non si riscrivono e non si collassano.
            setConfirming(false);
          }}
        />
        {notice && (
          <MemberActionNotice
            kind={notice.kind}
            detail={notice.detail}
            compact
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* attendee -> staff, or attendee -> organizer */}
      {member.role === "attendee" && (
        <>
          <ActionButton
            onClick={changeRole("staff")}
            label="Make staff"
            variant="promote"
            dense={dense}
          />
          <ActionButton
            onClick={changeRole("organizer")}
            label="Make organizer"
            variant="promote"
            dense={dense}
          />
        </>
      )}

      {/* staff -> organizer, oppure staff -> attendee. Togliere `staff` non
          libera piu' alcun posto gratuito: il meccanismo e' uscito con la
          tessera nella fase 51. Toglie l'idoneita' a essere assegnato a una
          serata, che e' l'unica cosa che quel ruolo prepara. */}
      {member.role === "staff" && (
        <>
          <ActionButton
            onClick={changeRole("organizer")}
            label="Make organizer"
            variant="promote"
            dense={dense}
          />
          <ActionButton
            onClick={changeRole("attendee")}
            label="Remove staff"
            variant="demote"
            dense={dense}
          />
        </>
      )}

      {/* organizer -> staff, or organizer -> attendee. Two steps down and not
          one, because they are different outcomes: the first leaves the account
          eligible to be assigned to a night, the second does not. (Until phase
          51 the distinction was written as "the first keeps the free entry" —
          the card that granted it is gone, the two steps are not.) */}
      {member.role === "organizer" && (
        <>
          <ActionButton
            onClick={changeRole("staff")}
            label="Make staff"
            variant="demote"
            dense={dense}
          />
          <ActionButton
            onClick={changeRole("attendee")}
            label="Make attendee"
            variant="demote"
            dense={dense}
          />
        </>
      )}

      {/* L'unico atto distruttivo, e l'unico che chiede prima. Etichettato
          secondo l'ESITO e non secondo la funzione: «Delete account» dice cosa
          smette di esistere. */}
      <ActionButton
        onClick={async () => setConfirming(true)}
        label="Delete account"
        variant="delete"
        dense={dense}
      />

      {notice && (
        <span className="w-full">
          <MemberActionNotice
            kind={notice.kind}
            detail={notice.detail}
            compact
          />
        </span>
      )}
    </div>
  );
}

export default function MemberTable({
  members,
  currentUserId,
  showActions,
}: MemberTableProps) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // Client-side filtering
  const filtered = members.filter((m) => {
    const matchesSearch =
      search === "" ||
      m.full_name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase());

    const matchesRole = roleFilter === "all" || m.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  // Count summary
  const totalMembers = members.length;
  const organizerCount = members.filter((m) => m.role === "organizer").length;

  // ── Il conteggio che D-13 esiste per rendere leggibile ──────────────────────
  //
  // Un filtro da solo non lo soddisfa. `ACCESS-MODEL-DECISIONS.md` §8: gli
  // account staff non scadono, quindi ognuno e' **un posto gratuito permanente**
  // contro una sede che tiene 150–300 persone — *«dopo due stagioni e' un blocco
  // fisso di posti regalati con mesi d'anticipo invece che quella sera»*. Un
  // numero che va assemblato a mano e' un numero che nessuno assembla, e questa
  // e' la superficie dove gli account si creano.
  //
  // `community-membership.md`, gate *la capienza e' finita*: crescita e capienza
  // si guardano INSIEME, non in due cruscotti diversi.
  //
  // Contato su `members`, mai su `filtered`: un totale che si muovesse con la
  // casella di ricerca risponderebbe a una domanda diversa da quella che sembra
  // rispondere, e si leggerebbe come un calo del costo in posti ogni volta che
  // qualcuno digita un nome.
  //
  // Gli organizer si contano a parte e NON si sommano. Anche loro entrano
  // gratis, ma sono una decisione diversa con una ragione diversa, e una sola
  // cifra «ingressi gratuiti» nasconderebbe quale delle due sta crescendo.
  const staffCount = members.filter((m) => m.role === "staff").length;

  /**
   * Le quattro colonne, dichiarate una volta e disegnate due.
   *
   * E' l'intero argomento di D-41-17 in una costante. I due rami erano duecento
   * righe di markup scritte due volte, e la data un'espressione inline
   * duplicata byte per byte fra loro — che e' l'aspetto che ha «le due liste
   * divergono» prima di essere divergente. Aggiungere una colonna qui la
   * aggiunge alla tabella e alla card, e non c'e' nessun posto dove le due
   * possano essere in disaccordo.
   *
   * **La colonna dello stato e' uscita** (D-50-01), e con lei l'unica altra
   * colonna «mark» che c'era. Resta il ruolo, che e' l'unico asse rimasto — e
   * la frase che stava qui, *«`role` e `status` sono due colonne e restano
   * due»*, non descrive piu' niente.
   *
   * **E la colonna del codice e' uscita** (D-51-02). Era la credenziale della
   * porta; la porta non la verifica piu' e la colonna cade nel piano 51-12.
   * Toglierla **prima** del `DROP COLUMN` e' il verso del deploy: al contrario,
   * questa tabella chiederebbe una colonna inesistente. Le colonne sono quattro.
   *
   * `Joined` takes the data face so a column of dates aligns. Nothing here
   * re-declares the numeric-variant shorthand; the face already carries it.
   */
  const columns: DataColumn<MemberRow>[] = [
    {
      key: "name",
      header: "Name",
      card: "title",
      cell: (member) => member.full_name || "--",
    },
    {
      key: "email",
      header: "Email",
      card: "subtitle",
      cell: (member) => member.email,
    },
    {
      key: "role",
      header: "Role",
      card: "mark",
      cell: (member) => <RoleBadge role={member.role} />,
    },
    {
      key: "joined",
      header: "Joined",
      card: "meta",
      figure: true,
      cell: (member) => formatJoined(member.created_at),
    },
  ];

  const hasActiveFilters = search !== "" || roleFilter !== "all";

  return (
    <div>
      {/* Count summary.

          Le cifre erano quattro e ora sono tre: la quarta contava le richieste
          in attesa, e non esistono piu' richieste. Prendono la faccia dei dati e
          un inchiostro solo: la parola accanto a ciascuna e' cio' che le
          distingue, e lo e' sempre stata — un numero che legge «3» in blu non
          dice «organizer» a chi non ha gia' imparato la legenda. */}
      <div className="mb-2 flex flex-wrap items-center gap-4 text-sm text-muted">
        <span>
          <span className="font-mono font-semibold text-ink">{totalMembers}</span>{" "}
          accounts total
        </span>
        <span>
          <span className="font-mono font-semibold text-ink">{organizerCount}</span>{" "}
          organizers
        </span>
        {/* La cifra `staff` e' un link con filtro, e le altre due non lo sono.
            `NAV-05` (fase 52) vuole le altre come questa — e' una disuguaglianza
            nota, dichiarata invece che scoperta, e non e' di questa fase. */}
        <button
          type="button"
          onClick={() => setRoleFilter("staff")}
          className={`inline-flex min-h-11 items-center gap-1 underline decoration-dotted underline-offset-4 transition-colors hover:text-ink ${FOCUS_RING}`}
        >
          <span className="font-mono font-semibold text-ink">{staffCount}</span> staff
        </button>
      </div>

      {/*
        La legenda, e non e' decorazione.

        un badge staff e' disegnato nello stesso neutro di un badge attendee con un
        bordo tratteggiato — abbastanza vicino da dire «questo non concede nulla
        in piu'», abbastanza distinto da trovarsi in una lista. Uno stile di
        bordo non puo' dire PERCHE', quindi lo dice questa frase, sulla superficie
        dove gli account staff si creano.

        **Fino al 2026-09-22 questa frase prometteva «free entry to every night,
        permanently»**, e il meccanismo che la realizzava era la tessera. La
        fase 51 lo ha cancellato — la tessera, la pagina che la mostrava e la
        rotta che la verificava sono uscite coi piani 51-04 e 51-05, e
        `src/lib/rbac/roles.ts:100-107` lo registra nello stesso commit; con
        D-51-03, staff e organizer non vengono scansionati affatto. Una legenda
        che continua a promettere un beneficio cancellato e' peggio di una
        legenda assente: si legge **prima di promuovere qualcuno**, cioe' nel
        momento in cui quel beneficio verrebbe soppesato.

        Quindi oggi `staff` non concede nulla di suo. Chi fa la porta stasera lo
        tiene dall'assegnazione della serata, che scade con la serata — mai da
        questa colonna. Se l'ingresso gratuito deve tornare a essere una
        promessa di prodotto, ha bisogno di un meccanismo, ed e' una decisione
        del proprietario: non una frase da lasciare in piedi qui.
      */}
      <p className="mb-6 text-xs text-muted">
        A <span className="font-semibold text-ink">staff</span> account grants
        nothing of its own — it can do nothing an attendee cannot, and it opens
        no door on its own. Working the door or a gallery comes from the
        night&apos;s own assignment, which an organizer makes and which ends
        with the night.
      </p>

      {/* Filters.

          Le quattro schede di stato che stavano sopra questi controlli sono
          uscite con l'asse che filtravano (D-50-01), e con loro il menu a
          tendina degli stati. Restano la ricerca e il ruolo.

          RESP-04 asks that filters be visible from 768px up without opening
          anything, and they are — nothing here is behind a disclosure at any
          width. Each carries a name it did not have: both were unlabelled
          controls whose only description was a placeholder, and a placeholder
          disappears the moment somebody types into it. */}
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="md:flex-1">
          <Input
            id="member-search"
            aria-label="Search accounts by name or email"
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          <Select
            id="member-role-filter"
            aria-label="Filter by role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            {/*
              Quattro opzioni, in ordine di rango.

              L'opzione `staff` mancante era un difetto vero e non una
              disattenzione: un account staff non si poteva filtrare, quindi il
              conteggio che D-13 esiste per rendere visibile andava assemblato a
              occhio. Era anche invisibile a `npm run build` — di ventuno punti
              che enumerano i ruoli in questo repository esattamente UNO produce
              un errore di compilazione, perche' diciassette fanno
              `role as UserRole` e un cast ferma il compilatore.

              E questo elenco e' una comodita', non un soffitto. Cio' che un
              cambio di ruolo puo' scrivere e' `WritableRole` in
              `admin/members/actions.ts`, ritestato a runtime contro il corpo
              della richiesta; aggiungere `master` qui aggiungerebbe un'opzione
              che il server rifiuta, mai una capability.
            */}
            <option value="all">All roles</option>
            <option value="master">Master</option>
            <option value="organizer">Organizer</option>
            <option value="staff">Staff</option>
            <option value="attendee">Attendee</option>
          </Select>
        </div>
      </div>

      {/* Results count */}
      {hasActiveFilters ? (
        <p className="mb-4 text-xs text-muted">
          Showing {filtered.length} of {totalMembers} accounts
        </p>
      ) : null}

      {/* One array, one column declaration, two trees. The switch was at
          1024px here and at 640px on four other tables; it is 768px in one
          place now, and this file no longer names a breakpoint for it at all.

          Quali colonne sopravvivono su un telefono e' il giudizio che H41-3
          chiede, ed e' preso qui invece che dal layout: il NOME e' il titolo
          della card, l'INDIRIZZO il suo sottotitolo, il RUOLO il suo mark, e la
          DATA un dettaglio etichettato sotto. Niente viene lasciato cadere.

          La selezione multipla e' uscita con le due azioni in blocco, e il
          riquadro espandibile con il referral che conteneva (D-50-08). */}
      <DataTable
        rows={filtered}
        columns={columns}
        rowKey={(member) => member.id}
        caption="Accounts, with the role each one holds"
        empty="No accounts found"
        actions={
          showActions
            ? {
                header: "Actions",
                render: (member, dense) => (
                  <MemberActions
                    member={member}
                    currentUserId={currentUserId}
                    dense={dense}
                  />
                ),
              }
            : undefined
        }
      />
    </div>
  );
}
