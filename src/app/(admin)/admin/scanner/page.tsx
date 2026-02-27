"use client";

import { useEffect, useRef, useState } from "react";

// UUID pattern: 8-4-4-4-12 hex chars
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Ticket token: uuid.64-hex-chars (HMAC signature)
const TICKET_TOKEN_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[0-9a-f]{64}$/i;
// Membership QR: URL containing code=RSN-
const MEMBERSHIP_PATTERN = /code=RSN-/i;

export default function ScannerPage() {
  const [result, setResult] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const scannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let scanner: unknown;

    async function initScanner() {
      // Dynamic import for client-side only
      const { Html5QrcodeScanner } = await import("html5-qrcode");
      scanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );

      (scanner as { render: (onSuccess: (text: string) => void, onError: () => void) => void }).render(
        (decodedText: string) => {
          setResult(decodedText);
          handleVerify(decodedText);
        },
        () => {
          // scan error - ignore, keeps scanning
        }
      );
    }

    initScanner();

    return () => {
      if (scanner) {
        (scanner as { clear: () => Promise<void> }).clear().catch(() => {});
      }
    };
  }, []);

  const handleVerify = async (code: string) => {
    try {
      if (TICKET_TOKEN_PATTERN.test(code)) {
        // Ticket QR code - check in via POST
        const res = await fetch("/api/tickets/checkin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: code }),
        });
        const data = await res.json();

        if (data.valid) {
          setStatus("success");
          const details = [data.member_name, data.party_title || data.event_title]
            .filter(Boolean)
            .join(" — ");
          setMessage(`✓ Check-in OK — ${details}`);
        } else if (data.status === "already_checked_in") {
          setStatus("error");
          setMessage(`✗ Already checked in — ${data.member_name}`);
        } else if (data.status === "not_found") {
          setStatus("error");
          setMessage("✗ Ticket not found");
        } else if (data.status === "invalid_signature") {
          setStatus("error");
          setMessage("✗ Invalid ticket signature");
        } else {
          setStatus("error");
          setMessage("✗ Check-in failed");
        }
      } else if (MEMBERSHIP_PATTERN.test(code) || UUID_PATTERN.test(code)) {
        // Membership QR code - verify via GET (existing behavior)
        const url = MEMBERSHIP_PATTERN.test(code)
          ? code
          : `/api/membership/verify?code=${encodeURIComponent(code)}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.valid) {
          setStatus("success");
          setMessage(`✓ ${data.member_name} — Attendance recorded`);
        } else {
          setStatus("error");
          setMessage("✗ Invalid membership");
        }
      } else {
        setStatus("error");
        setMessage("✗ QR code not recognized");
      }
    } catch {
      setStatus("error");
      setMessage("Connection error");
    }
  };

  const resetScanner = () => {
    setResult(null);
    setStatus("idle");
    setMessage("");
  };

  return (
    <div className="min-h-dvh bg-background p-6">
      <h1 className="mb-6 text-2xl font-bold">QR Scanner</h1>

      {!result ? (
        <div ref={scannerRef}>
          <div id="qr-reader" className="overflow-hidden rounded-2xl" />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6">
          <div
            className={`w-full rounded-2xl border p-8 text-center ${
              status === "success"
                ? "border-green-500/30 bg-green-500/10"
                : status === "error"
                ? "border-accent/30 bg-accent/10"
                : "border-card-border bg-card"
            }`}
          >
            <p className="text-xl font-semibold">{message || "Verifying..."}</p>
          </div>

          <button
            onClick={resetScanner}
            className="w-full rounded-full bg-accent py-3 font-medium text-white hover:bg-accent-hover"
          >
            Scan another QR
          </button>
        </div>
      )}
    </div>
  );
}
