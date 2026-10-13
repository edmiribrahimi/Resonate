"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import CreateArtistModal from "@/components/artists/CreateArtistModal";

/**
 * "New artist" on the artists catalogue — the second mount of
 * `CreateArtistModal`, and the first that is not tied to a night's line-up.
 *
 * The dialog is opened without a `name`, so it asks for one itself. Reachability
 * is the page's verdict (`organizer.access`); the write is still refused on its
 * own by `createArtist`, which re-asks `catalogue.manage` and runs under the
 * cookie client, so this button widens where the form can be reached and
 * nothing about who may write.
 *
 * On success the list is refreshed in place — the action already revalidates
 * `/admin/artists` — rather than navigating away.
 */
export default function NewArtistButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        New artist
      </Button>
      <CreateArtistModal
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
