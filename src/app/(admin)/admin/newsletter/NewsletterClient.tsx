"use client";

import { useState } from "react";
import ComposeForm from "./ComposeForm";
import BroadcastList from "./BroadcastList";

/**
 * The newsletter surface's state holder — and the one file in this closure that
 * the conversion measured and left alone.
 *
 * Plan 41.1-06 read it: **one class attribute, and it is a vertical spacing
 * utility on a step §3.1 already names.** No palette, no legacy token name, no
 * focus expression, no content maximum, no gutter of its own, no small-prefix
 * breakpoint, nothing interactive. There was nothing to convert.
 *
 * That is written here rather than left implicit, because a file in a declared
 * closure with no diff is otherwise indistinguishable from a file nobody
 * opened — and the surface can only be declared converted if the walk reached
 * every file in it. It was reached; it was clean; both facts are the record.
 */
export default function NewsletterClient() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-6">
      <ComposeForm onSent={() => setRefreshKey((k) => k + 1)} />
      <BroadcastList refreshKey={refreshKey} />
    </div>
  );
}
