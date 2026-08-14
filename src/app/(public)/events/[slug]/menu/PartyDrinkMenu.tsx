"use client";

import { useId, useState, useMemo, useTransition } from "react";
import type { DrinkItem } from "@/types/database";
import GuestDrinkMenu from "./GuestDrinkMenu";
import DrinkMenuManager from "@/app/(admin)/admin/events/[id]/drinks/DrinkMenuManager";
import { updateMenuClosesAt } from "./actions";
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
 * ── A failure this file does not report, recorded and NOT repaired ───────────
 *
 * Neither `handleSave` nor `handleClear` catches. The action throws on a refused
 * capability and on a failed write, and when it does the transition rejects, the
 * confirmation never appears, and **nothing at all is shown**. There is no error
 * tracking in this repository, so that failure reaches nobody: an organizer who
 * believes they closed the menu at midnight and did not is a bar still selling
 * tokens at two.
 *
 * It is recorded at its `file:line` in `41.2-11-FINDINGS.md` and left where it
 * is. Fixing it means designing what a person is told when a money-adjacent
 * write fails, which is new copy on a money path and is a decision of its own —
 * the same reason the four already-recorded silent failures on this path were
 * not repaired under a visual mandate.
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
  // The primitive binds label to control by id and requires one. It is
  // generated rather than derived from the party, because the same party can be
  // rendered twice in a tree and two controls may not share an id.
  const timeFieldId = useId();

  const hasChanged = time !== currentValue;
  const fallback = party.end_time
    ? `Falls back to end time (${party.end_time.slice(0, 5)})`
    : "No auto-close set";

  function handleSave() {
    startTransition(async () => {
      await updateMenuClosesAt(party.id, time || null);
      onUpdate(party.id, time || null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  function handleClear() {
    setTime("");
    startTransition(async () => {
      await updateMenuClosesAt(party.id, null);
      onUpdate(party.id, null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
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
