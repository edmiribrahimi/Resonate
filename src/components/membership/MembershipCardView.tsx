"use client";

import { useEffect, useState } from "react";
import { generateMembershipQR } from "@/utils/qr";

/**
 * The card itself — the thing a person holds up at a door.
 *
 * ── Converted by plan 41.2-07, and what "converted" was allowed to mean ──────
 *
 * This component draws the code that a staff phone reads at two in the morning,
 * in a dark room, possibly with no network, with a queue behind the person
 * holding it. `checkin-offline.md` records the asymmetry: **refusing a valid
 * guest is worse than admitting a duplicate, because the first error happens in
 * front of a queue.** So a visual conversion may change how this card *sits* on
 * a screen and may not change what the code is, how it is produced, how large it
 * renders or how far its two tones are apart.
 *
 * Held, and each one is an assertion the plan's SUMMARY carries with its
 * measurement:
 *
 *  - **the payload.** `generateMembershipQR(membershipCode)` in an effect keyed
 *    on the same value — the same call, the same argument, the same module.
 *    `src/utils/qr.ts` was READ in order to be able to tell a rendering change
 *    from a payload change, and it was not opened: the encoded string, the 300px
 *    source, the two-module quiet zone and the two colours are all still its.
 *  - **the size.** The rendered box stays 192px square, and so does the box the
 *    fallback occupies while the effect is in flight, so nothing shifts when the
 *    code arrives. **A smaller code is a code that fails to scan at a door**, and
 *    no gate in this phase asks for one.
 *  - **the contrast.** Nothing here filters, dims or tints the image, and the
 *    fallback's well is an exact alias swap (below), so no tone moved.
 *
 * ── The four token swaps are aliases, which is why they are provably neutral ──
 *
 * `globals.css:247-249` declares the legacy names as aliases of the current
 * ones — the card ground **is** the surface, the page ground **is** the ground,
 * the text colour **is** the ink. So renaming them changes what a gate can read
 * and changes no computed value: the diff is provably a rename rather than a
 * restyle, which is the only kind of edit this file should accept.
 *
 * ── Why this card is NOT the card primitive, and it is a decision ────────────
 *
 * `ui/Card.tsx` fixes one ground, one line-token edge and one padding step. This
 * card is an accent-bordered gradient with two internal padding zones, and it is
 * the surface's whole visual identity. Adopting the primitive would delete the
 * edge, flatten the gradient and reflow both zones — a redesign of the object a
 * person presents at an entrance, performed under a mandate that says width may
 * change layout, never what the thing is. The primitive is adopted next door in
 * `CopyReferralLink.tsx`, where the shell genuinely is the plain card shell.
 *
 * The same accent-gradient shape recurs on `/dashboard`, on the drink token card
 * and on the ticket surface, all in later waves; this file is the first of them
 * to convert, and the disposition above is written here so the next four read a
 * decision rather than take a vote.
 */

interface MembershipCardViewProps {
  fullName: string;
  membershipCode: string;
  memberSince: string;
}

export default function MembershipCardView({
  fullName,
  membershipCode,
  memberSince,
}: MembershipCardViewProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    generateMembershipQR(membershipCode).then(setQrDataUrl);
  }, [membershipCode]);

  return (
    <div className="overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-br from-surface via-surface to-accent/10">
      {/* Card Header */}
      <div className="px-6 pt-6 pb-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">
          Resonate Member
        </p>
        <h2 className="mt-2 text-2xl font-bold">{fullName}</h2>
        <p className="mt-1 text-sm text-muted">
          Member since{" "}
          {(() => { const d = new Date(memberSince); const M = ["January","February","March","April","May","June","July","August","September","October","November","December"]; return `${M[d.getMonth()]} ${d.getFullYear()}`; })()}
        </p>
      </div>

      {/* QR Code — the box below is 192px square in BOTH branches, and stays the
          size it was. The door reads this. */}
      <div className="flex flex-col items-center px-6 py-6">
        {qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrDataUrl}
            alt="Membership QR Code"
            className="h-48 w-48 rounded-xl"
          />
        ) : (
          <div className="flex h-48 w-48 items-center justify-center rounded-xl bg-ground">
            <span className="text-muted">Loading...</span>
          </div>
        )}
        <p className="mt-3 font-mono text-sm tracking-widest text-muted">
          {membershipCode}
        </p>
      </div>
    </div>
  );
}
