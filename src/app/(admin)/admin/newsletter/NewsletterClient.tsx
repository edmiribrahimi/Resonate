"use client";

import { useState } from "react";
import ComposeForm from "./ComposeForm";
import BroadcastList from "./BroadcastList";

export default function NewsletterClient() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-6">
      <ComposeForm onSent={() => setRefreshKey((k) => k + 1)} />
      <BroadcastList refreshKey={refreshKey} />
    </div>
  );
}
