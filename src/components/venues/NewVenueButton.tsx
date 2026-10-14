"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import CreateVenueModal from "@/components/venues/CreateVenueModal";

/**
 * "New venue" on the venues catalogue — the second mount of
 * `CreateVenueModal`, and the first that is not tied to a night being written
 * (phase 53, CUT-03; the exact analog of `NewArtistButton`).
 *
 * The dialog is opened without a `name`, so it asks for one itself.
 * Reachability is the page's verdict (`organizer.access`); the write is still
 * refused on its own by `createVenue`, which re-asks `catalogue.manage` and runs
 * under the cookie client (RLS `venues_insert_organizer`), so this button widens
 * where the form can be reached and nothing about who may write (D-53-09).
 *
 * Venue secrecy: the secrecy flag belongs to the night, on the event form, and
 * is not reachable from here. Creating a catalogue entry reads and writes no
 * reveal state, so nothing on this path can advance a reveal
 * (`venue-secrecy.md`).
 *
 * On success the list is refreshed in place — the action already revalidates
 * `/admin/venues` — rather than navigating away. The new venue's id and slug
 * are not needed here.
 */
export default function NewVenueButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        New venue
      </Button>
      <CreateVenueModal
        open={open}
        onClose={() => setOpen(false)}
        onCreated={() => {
          setOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
