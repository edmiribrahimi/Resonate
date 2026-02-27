"use client";

import { useState, useTransition } from "react";
import { createAndSendBroadcast } from "./actions";

export default function ComposeForm({ onSent }: { onSent: () => void }) {
  const [subject, setSubject] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleSend = () => {
    if (!subject.trim() || !htmlContent.trim()) {
      setError("Subject and content are required");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await createAndSendBroadcast(subject.trim(), wrappedHtml);
        setSubject("");
        setHtmlContent("");
        onSent();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send");
      }
    });
  };

  // Wrap user HTML in Resonate branding
  const wrappedHtml = `
    <div style="background-color:#0a0a0a;font-family:'Arial',sans-serif;margin:0;padding:0;">
      <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
        <div style="text-align:center;margin-bottom:32px;">
          <img src="${process.env.NEXT_PUBLIC_APP_URL || "https://resonate.app"}/images/logo-white.png" alt="Resonate" width="180" style="margin:0 auto;display:block;" />
        </div>
        <div style="background-color:#141414;border:1px solid #262626;border-radius:12px;padding:32px;color:#ededed;">
          ${htmlContent}
        </div>
        <div style="text-align:center;margin-top:32px;border-top:1px solid #262626;padding-top:16px;">
          <p style="color:#a1a1aa;font-size:12px;">Resonate Music Events Community</p>
        </div>
      </div>
    </div>
  `.trim();

  return (
    <div className="rounded-2xl border border-card-border bg-card p-6">
      <h2 className="mb-4 text-lg font-bold">Compose Broadcast</h2>

      {error && (
        <div className="mb-4 rounded-lg border border-accent/30 bg-accent/10 p-3 text-sm text-accent">
          {error}
        </div>
      )}

      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium text-muted">
          Subject
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
          placeholder="Newsletter subject..."
        />
      </div>

      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium text-muted">
          HTML Content
        </label>
        <textarea
          value={htmlContent}
          onChange={(e) => setHtmlContent(e.target.value)}
          rows={10}
          className="w-full rounded-lg border border-card-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none font-mono"
          placeholder="<h1>Hello!</h1><p>Your content here...</p>"
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleSend}
          disabled={isPending}
          className="rounded-full bg-accent px-6 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {isPending ? "Sending..." : "Send Now"}
        </button>
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="rounded-full border border-card-border px-6 py-2 text-sm font-medium text-muted hover:text-foreground"
        >
          {showPreview ? "Hide Preview" : "Preview"}
        </button>
      </div>

      {showPreview && htmlContent && (
        <div className="mt-4 rounded-lg border border-card-border overflow-hidden">
          <div className="bg-zinc-900 px-3 py-1.5 text-xs text-muted">
            Preview
          </div>
          <iframe
            srcDoc={wrappedHtml}
            className="w-full border-0"
            style={{ minHeight: "400px" }}
            title="Email preview"
          />
        </div>
      )}
    </div>
  );
}
