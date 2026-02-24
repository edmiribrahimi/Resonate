"use client";

import { useEffect, useRef, useState } from "react";

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
      const res = await fetch(`/api/membership/verify?code=${encodeURIComponent(code)}`);
      const data = await res.json();

      if (data.valid) {
        setStatus("success");
        setMessage(`✓ ${data.member_name} — Attendance recorded`);
      } else {
        setStatus("error");
        setMessage("✗ Invalid membership");
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
