"use client";

import { useRef, useCallback } from "react";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";

interface EventQRCodeProps {
  url: string;
  eventTitle: string;
}

export default function EventQRCode({ url, eventTitle }: EventQRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const sanitizedTitle = eventTitle
    .replace(/[^a-zA-Z0-9]/g, "-")
    .toLowerCase();

  const downloadPNG = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `${sanitizedTitle}-menu-qr.png`;
    link.href = dataUrl;
    link.click();
  }, [sanitizedTitle]);

  return (
    <div className="rounded-xl border border-card-border bg-card p-6">
      <h3 className="text-sm font-semibold text-foreground mb-1">
        Menu QR Code
      </h3>
      <p className="text-xs text-muted mb-4">
        Scan to open the drink menu
      </p>

      <div className="flex justify-center">
        <QRCodeSVG
          value={url}
          size={200}
          level="H"
          data-qr-svg=""
          marginSize={2}
        />
      </div>

      {/* Hidden canvas for PNG download */}
      <div className="hidden">
        <QRCodeCanvas
          ref={canvasRef}
          value={url}
          size={400}
          level="H"
          marginSize={2}
        />
      </div>

      <div className="mt-4 flex justify-center">
        <button
          type="button"
          onClick={downloadPNG}
          className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-white transition-all hover:bg-accent-hover active:scale-95 active:opacity-80"
        >
          Download PNG
        </button>
      </div>
    </div>
  );
}
