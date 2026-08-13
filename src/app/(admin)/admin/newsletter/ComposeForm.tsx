"use client";

import { useState, useTransition } from "react";
import { createAndSendBroadcast } from "./actions";
import FailureNotice, { type NoticeKind } from "./FailureNotice";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/Typography";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

/**
 * CR-01, third call site.
 *
 * This caught the throw and rendered `err.message` — which in a production
 * build is Next's redacted server-action string, not
 * `capabilities.resolve_failed: <code>`. So the diagnosis existed in
 * development and disappeared in the deployment where it mattered. The action
 * now returns the category as a value; a validation complaint stays a plain
 * inline message, because it is a different kind of thing and must not be
 * dressed as a system fault.
 *
 * ── Converted by plan 41.1-06 ────────────────────────────────────────────────
 *
 * The two fields take `Input` and `Textarea` from §8.6, and that is not a
 * restyle. **Neither field had an accessible name before this change**: both
 * labels were bare `<label>` elements with no `htmlFor` and no wrapping, so a
 * screen reader announced two controls called "edit text". The primitive binds
 * the label by id and is the whole reason the substitution is worth a diff.
 * Its boundary is the second half — `--control` measures 6.78 : 1 on a card
 * against the 1.39 : 1 the legacy line token reached, and on these controls the
 * boundary is the only channel there is: the well and the card differ by
 * 1.04 : 1, so the fill cannot say where the field starts.
 *
 * The validation complaint stays what the paragraph above says it is — one
 * plain inline sentence, not a boxed system fault — and it gains `role="alert"`
 * because §11 asks every error region for one. Its ink is the critical
 * semantic, which is the same ink the field-level error inside the primitive
 * uses, so the two cannot be told apart by colour when both are on screen. That
 * is deliberate: they are the same kind of thing.
 *
 * ── The email body below is NOT this plan's, and that is a decision ──────────
 *
 * `wrappedHtml` carries six literal hex values in inline styles. They are the
 * **email** palette, they are read by mail clients that support no custom
 * property and very little CSS, and `DI-40-01` defers the email palette
 * explicitly as an owner decision. A conversion that "tokenised" them would
 * have changed what lands in somebody's inbox, from a plan whose whole claim is
 * that it changes nothing that runs.
 */
export default function ComposeForm({ onSent }: { onSent: () => void }) {
  const [subject, setSubject] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [isPending, startTransition] = useTransition();
  const [inputError, setInputError] = useState<string | null>(null);
  const [failure, setFailure] = useState<{ kind: NoticeKind; detail?: string } | null>(
    null
  );
  const [showPreview, setShowPreview] = useState(false);

  const handleSend = () => {
    setFailure(null);
    if (!subject.trim() || !htmlContent.trim()) {
      setInputError("Subject and content are required");
      return;
    }
    setInputError(null);
    startTransition(async () => {
      try {
        const result = await createAndSendBroadcast(subject.trim(), wrappedHtml);
        if (!result.ok) {
          setFailure({ kind: result.failure, detail: result.detail });
          return;
        }
        setSubject("");
        setHtmlContent("");
        onSent();
      } catch (err) {
        setFailure({
          kind: "transport_unavailable",
          detail: err instanceof Error ? err.message : String(err),
        });
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
    <Card>
      <SectionHeading>Compose Broadcast</SectionHeading>

      {inputError && (
        <p role="alert" className="mb-4 text-xs text-sem-crit">
          {inputError}
        </p>
      )}

      {failure && (
        <div className="mb-4">
          <FailureNotice kind={failure.kind} detail={failure.detail} />
        </div>
      )}

      <div className="mb-4">
        <Input
          id="newsletter-subject"
          label="Subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Newsletter subject..."
        />
      </div>

      <div className="mb-4">
        <Textarea
          id="newsletter-html"
          label="HTML Content"
          value={htmlContent}
          onChange={(e) => setHtmlContent(e.target.value)}
          rows={10}
          className="font-mono"
          placeholder="<h1>Hello!</h1><p>Your content here...</p>"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={handleSend} disabled={isPending}>
          {isPending ? "Sending..." : "Send Now"}
        </Button>
        <Button variant="secondary" onClick={() => setShowPreview(!showPreview)}>
          {showPreview ? "Hide Preview" : "Preview"}
        </Button>
      </div>

      {showPreview && htmlContent && (
        <div className="mt-4 overflow-hidden rounded-xl border border-line">
          <div className="bg-raised px-3 py-1.5 text-xs text-muted">
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
    </Card>
  );
}
