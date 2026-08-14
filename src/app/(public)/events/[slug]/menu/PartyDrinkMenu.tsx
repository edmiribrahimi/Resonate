"use client";

import { useId, useState, useMemo, useTransition } from "react";
import type { DrinkItem } from "@/types/database";
import GuestDrinkMenu from "./GuestDrinkMenu";
import DrinkMenuManager from "@/app/(admin)/admin/events/[id]/drinks/DrinkMenuManager";
import { updateMenuClosesAt, type MenuCloseRefusal } from "./actions";
import { menuCloseInstant } from "@/utils/datetime";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Input } from "@/components/ui/Input";

/**
 * The organizer-facing party menu — converted by plan 41.2-11.
 *
 * ── The closing time is a PAYLOAD, and nothing about it moved ────────────────
 *
 * `menu_closes_at` decides when a drink token can still be bought and, through
 * the one-hour grace period, when one can still be redeemed. `actions.ts` was
 * **read** — so that a rendering change could be told from a payload change —
 * and was not edited. Across this conversion:
 *
 *  - the field is the same field, sent by the same call with the same two
 *    arguments in the same order: the party's id and the raw `"HH:MM"` string
 *    the time control produces, or null;
 *  - the empty-string-to-null coercion is byte-identical, on both the save and
 *    the clear path;
 *  - the `end_time` fallback in `getMenuCloseTime` is byte-identical;
 *  - the grace window is the same hour, written the same way, and it mirrors
 *    the server's own window in `redeemDrinkTokenGuest` — two authors of one
 *    measurement that a visual pass has no business reconciling.
 *
 * The control gained a 44px floor, a real `htmlFor` binding and a programmatic
 * association for its fallback sentence. It sends what it sent.
 *
 * ── The failure this file now REPORTS, and why it reports it twice ───────────
 *
 * Until plan 46-04 neither handler caught anything. The action threw on a
 * refused capability and on a failed write, the transition rejected, the
 * confirmation was never reached, and **nothing at all appeared** — an organizer
 * who believed they had closed the menu at midnight and had not is a bar still
 * selling tokens at two. That was recorded in `41.2-11-FINDINGS.md` and left
 * alone, because repairing it meant deciding what a person is told when a
 * money-adjacent write fails. `46-COPY.md` §1 decided it, and this is the half
 * that draws it.
 *
 * **Two causes, two sentences, and they are not allowed to merge (D-46-10b).**
 * *This account may not set the closing time* sends the organizer to find
 * someone who may; *saving failed* is theirs to try again. One catch for both
 * would be the newsletter defect on a staff money surface, which is the shape
 * this repository already has on record. A third — no session — and a fallback
 * for a refusal that arrives with no category at all make four outcomes; every
 * word of all four is approved copy, composed nowhere.
 *
 * **`onUpdate` and the confirmation are now conditional on success**, and that
 * is not tidiness. With a refusal returned rather than thrown, the three lines
 * that used to run unconditionally would run on failure too: the parent's party
 * list would be updated to a value the database does not hold and the word
 * *Saved* would appear over a save that did not happen. Converting the action
 * without converting these handlers would have armed a new silent divergence.
 *
 * **The clear path shows what is stored, not what was asked for.** `setTime("")`
 * used to run before the await, so a failed clear left the field reading empty
 * while the stored closing time was unchanged — the screen and the database
 * disagreeing, silently, about the moment a bar stops selling. It now runs on
 * the success branch only.
 *
 * ── The already-converted work module is NOT opened ──────────────────────────
 *
 * The drinks manager below is imported from the work surface and was converted
 * by plan 41.1-10. That is the harmless direction — the bar inherits a converted
 * component — and it stays that way: `git status` shows no modification to it.
 *
 * ── Two announcements added, and they are the only behaviour that changed ────
 *
 * The saved confirmation and the grace-period banner were colour and nothing
 * else: a green word and an amber panel, silent to anybody not looking straight
 * at them. Both now carry `role="status"`. `meta-gates.md` asks a failure — or,
 * here, a deadline — to have an observable effect rather than only a log, and
 * the grace banner is the sentence that tells a guest at a bar how long they
 * still have to redeem something they paid for. No wording changed.
 */

interface Party {
  id: string;
  title: string;
  date: string;
  end_time: string | null;
  menu_closes_at: string | null;
}

interface PartyDrinks {
  partyId: string;
  allItems: DrinkItem[];
  availableItems: DrinkItem[];
}

interface PartyDrinkMenuProps {
  eventId: string;
  eventTitle: string;
  parties: Party[];
  drinksByParty: PartyDrinks[];
  canManage: boolean;
  isAuthenticated: boolean;
}

/**
 * Compute the menu closing datetime for a party.
 * Uses menu_closes_at if set, otherwise falls back to end_time.
 * Returns null if neither is set (menu never closes automatically).
 */
function getMenuCloseTime(party: Party): Date | null {
  const closeTime = party.menu_closes_at ?? party.end_time;
  if (!closeTime) return null;

  // closeTime is "HH:MM" or "HH:MM:SS", party.date is "YYYY-MM-DD".
  // Both are Turin wall-clock values: in the browser they would otherwise be
  // read in the visitor's own zone, so someone abroad would see the menu close
  // at the wrong moment. Next-day closing is handled inside the helper.
  return menuCloseInstant(party.date, closeTime);
}

type MenuStatus = "open" | "grace" | "closed";

function getMenuStatus(party: Party): MenuStatus {
  const closeTime = getMenuCloseTime(party);
  if (!closeTime) return "open"; // no closing time = always open

  const now = new Date();
  if (now < closeTime) return "open";

  // Grace period: 1 hour after close
  const graceEnd = new Date(closeTime.getTime() + 60 * 60 * 1000);
  if (now < graceEnd) return "grace";

  return "closed";
}

function MenuCloseControl({
  party,
  onUpdate,
}: {
  party: Party;
  onUpdate: (partyId: string, time: string | null) => void;
}) {
  const currentValue = party.menu_closes_at ?? "";
  const [time, setTime] = useState(currentValue);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  /**
   * The category of the last refusal, kept apart from the sentence.
   *
   * It arrives as a returned value and never as the message of a thrown error,
   * because Next redacts those in a production build
   * (`src/lib/capabilities/server.ts:58-63`). Nothing in this control branches
   * on it today — the sentence beside it is what an organizer reads — and it is
   * held anyway, so the classification exists as a value here rather than
   * having to be recovered from words later. `src/lib/door/outcome.ts:274-276`
   * keeps its own statuses for the same stated reason.
   */
  const [refusal, setRefusal] = useState<MenuCloseRefusal | null>(null);
  const [refusalSentence, setRefusalSentence] = useState<string | null>(null);
  // The primitive binds label to control by id and requires one. It is
  // generated rather than derived from the party, because the same party can be
  // rendered twice in a tree and two controls may not share an id.
  const timeFieldId = useId();

  const hasChanged = time !== currentValue;
  const fallback = party.end_time
    ? `Falls back to end time (${party.end_time.slice(0, 5)})`
    : "No auto-close set";

  /**
   * The sentence for a refusal that arrived carrying no category at all —
   * approved copy (`46-COPY.md` §1), and modelled on
   * `src/components/events/EventForm.tsx:626-629`.
   *
   * Its next step differs from that model's on purpose: this is a money-adjacent
   * value, so the organizer is sent to *check what the field says* rather than
   * to *try again*. The save may or may not have landed, and telling somebody to
   * retry a write whose outcome is unknown is how a closing time gets set twice
   * or not at all.
   */
  const NO_REASON =
    "The save was refused and no reason travelled back. Reload the page and check what the closing time says before trying again.";

  /**
   * The one place a refusal is recorded, so the two handlers cannot drift into
   * two vocabularies. Category first, sentence second — the order at
   * `EventForm.tsx:625-629`, and the reason is that the category is what a later
   * reader can branch on, while the sentence is only what this render draws.
   */
  function refuse(category: MenuCloseRefusal | null, sentence: string | null) {
    setRefusal(category);
    setRefusalSentence(sentence ?? NO_REASON);
  }

  function handleSave() {
    setRefusal(null);
    setRefusalSentence(null);
    startTransition(async () => {
      try {
        const result = await updateMenuClosesAt(party.id, time || null);
        if (!result.success) {
          // Neither `onUpdate` nor `setSaved`: the parent's list must not learn
          // a value the database refused, and *Saved* must not appear over a
          // save that did not happen.
          refuse(result.refusal ?? null, result.error ?? null);
          return;
        }
        onUpdate(party.id, time || null);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch {
        // The action returns its three named causes rather than throwing them,
        // so reaching here means the call itself did not complete — a transport
        // failure, with no category to carry. That is the same fact the
        // no-category sentence states, and it gets the same words rather than a
        // new sentence invented outside the approved list. Leaving it uncaught
        // would put the silent failure back: an unhandled rejection inside a
        // transition renders nothing.
        refuse(null, null);
      }
    });
  }

  function handleClear() {
    setRefusal(null);
    setRefusalSentence(null);
    startTransition(async () => {
      try {
        const result = await updateMenuClosesAt(party.id, null);
        if (!result.success) {
          refuse(result.refusal ?? null, result.error ?? null);
          return;
        }
        // `setTime("")` used to run BEFORE the await, which left a failed clear
        // showing an empty field over an unchanged stored value. It runs here,
        // on the branch where the database has actually accepted the clear, so
        // the control shows what is stored on every path.
        setTime("");
        onUpdate(party.id, null);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch {
        refuse(null, null);
      }
    });
  }

  return (
    <Card className="mt-4">
      {/*
        The label and the fallback sentence are the same two strings, and both
        are now programmatically bound to the control: the label through a real
        `htmlFor`, which the hand-rolled `<label>` never had, and the sentence
        through `aria-describedby`, which it also never had. The condition on
        the sentence is unchanged — it shows while no time is set.
      */}
      <Input
        id={timeFieldId}
        label="Menu closes at"
        type="time"
        value={time}
        onChange={(e) => { setTime(e.target.value); setSaved(false); }}
        hint={!time ? fallback : undefined}
      />

      {/*
        Save takes the accent rung and Clear the quiet one, which is the ladder
        saying which of the two is the ordinary act. Clear is NOT on the
        destructive rung: it removes an explicit closing time and falls the party
        back to its end time, and setting the time again restores it in one
        action. The destructive rung is for acts that destroy.

        The incumbent Clear tinted its border red on hover. That is dropped
        rather than re-spelled: the ladder has no hover-tint rung and inventing
        one here would make this file a second author of the button contract.
        The consequence — that clearing widens the window in which tokens can be
        bought and redeemed — is real, and it is recorded in this plan's findings
        rather than carried by a colour only a pointer can see.
      */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {hasChanged && (
          <Button size="sm" onClick={handleSave} disabled={isPending}>
            {isPending ? "..." : "Save"}
          </Button>
        )}
        {currentValue && !hasChanged && (
          <Button
            size="sm"
            variant="secondary"
            onClick={handleClear}
            disabled={isPending}
          >
            Clear
          </Button>
        )}
        {saved && (
          <span role="status" className="text-xs text-sem-done">
            Saved
          </span>
        )}
      </div>

      {/*
        The refusal, in place and beside the control that produced it — not a
        toast. The confirmation for the same act is already here, and a failure
        that announces itself somewhere else than its success is a failure
        somebody has to go looking for.

        `role="alert"` is the contract rather than decoration: this region is the
        only place a refused closing time is reported, and without the role it is
        reported to nobody who is not looking straight at it. It is the shape of
        `src/components/events/EventForm.tsx:1316-1323`, on the same kind of act.

        The sentence is never generic. Four distinct causes reach this one region
        — no session, a refused capability, a refused write, and a refusal with
        no category at all — and each keeps its own approved words.
      */}
      {refusalSentence && (
        <div
          role="alert"
          className="mt-3 rounded-2xl border border-sem-crit/30 bg-sem-crit/10 p-3"
          data-refusal={refusal ?? "none"}
        >
          <p className="text-xs text-sem-crit">{refusalSentence}</p>
        </div>
      )}
    </Card>
  );
}

export default function PartyDrinkMenu({
  eventId,
  eventTitle,
  parties: initialParties,
  drinksByParty,
  canManage,
  isAuthenticated,
}: PartyDrinkMenuProps) {
  const [selectedPartyId, setSelectedPartyId] = useState(initialParties[0]?.id ?? "");
  const [parties, setParties] = useState(initialParties);

  const selectedParty = parties.find((p) => p.id === selectedPartyId);
  const partyDrinks = drinksByParty.find((d) => d.partyId === selectedPartyId);
  const availableDrinks = partyDrinks?.availableItems ?? [];
  const allItems = partyDrinks?.allItems ?? [];

  const menuStatus = useMemo(
    () => (selectedParty ? getMenuStatus(selectedParty) : "open"),
    [selectedParty]
  );

  function handleMenuCloseUpdate(partyId: string, time: string | null) {
    setParties((prev) =>
      prev.map((p) =>
        p.id === partyId ? { ...p, menu_closes_at: time } : p
      )
    );
  }

  return (
    <div>
      {/* Party selector — a filter among filters, so the chip's default
          `aria-current` is the right one. The pills carry the 44px floor and
          the one focus expression from the primitive; the accent fill is no
          longer the only channel saying which party is current. */}
      {parties.length > 1 && (
        <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
          {parties.map((party) => (
            <Chip
              key={party.id}
              selected={selectedPartyId === party.id}
              onClick={() => setSelectedPartyId(party.id)}
            >
              {party.title}
            </Chip>
          ))}
        </div>
      )}

      {/* Menu close time control (organizer/admin only) */}
      {canManage && selectedParty && (
        <MenuCloseControl
          key={selectedPartyId}
          party={selectedParty}
          onUpdate={handleMenuCloseUpdate}
        />
      )}

      {/* Drink menu manager (organizer/admin) — an already-converted work
          module, imported and not opened. */}
      {canManage && selectedPartyId && (
        <div className="mt-6">
          <DrinkMenuManager
            key={selectedPartyId}
            eventId={eventId}
            eventTitle={eventTitle}
            partyId={selectedPartyId}
            initialItems={allItems}
          />
        </div>
      )}

      {/* Menu closed / grace period banners */}
      {menuStatus === "closed" && (
        <Card className="mt-6 text-center">
          <p className="text-sm text-muted">
            The drink menu is closed.
          </p>
        </Card>
      )}

      {/*
        The grace sentence is a deadline on money, read at a bar: the menu has
        closed and a token already paid for can still be redeemed for another
        hour. It kept its wording and gained two things — the semantic amber
        instead of a raw palette hue, and `role="status"`, so it is not carried
        by colour alone. The shape is the one
        `(public)/tickets/[id]/RefundRequestButton.tsx:128-130` already uses for
        a money-adjacent warning panel; the radius is §9's container rung.
      */}
      {menuStatus === "grace" && (
        <div
          role="status"
          className="mt-6 rounded-2xl border border-sem-warn/30 bg-sem-warn/10 p-4"
        >
          <p className="text-sm text-sem-warn">
            The menu is closed. You can still redeem purchased tokens for the next hour.
          </p>
        </div>
      )}

      {/* Drink menu for ordering (only when open) */}
      {menuStatus === "open" && (
        <>
          {availableDrinks.length > 0 ? (
            <div className="mt-6">
              <GuestDrinkMenu
                key={`guest-${selectedPartyId}`}
                eventId={eventId}
                partyId={selectedPartyId}
                drinks={availableDrinks}
                isAuthenticated={isAuthenticated}
              />
            </div>
          ) : (
            <Card className="mt-6 text-center">
              <p className="text-sm text-muted">
                No drinks available{parties.length > 1 ? " for this party" : ""}.
              </p>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
