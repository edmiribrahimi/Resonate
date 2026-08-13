"use client";

import { useRef, useCallback } from "react";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

/**
 * The menu QR control — converted early, and the boundary it crosses is
 * declared rather than discovered.
 *
 * This file sits under the public tree and is rendered by two surfaces: the
 * bar's own menu page, which belongs to **Phase 41.2**, and the drinks work
 * page, which belongs to **Phase 41.1**. It is converted here **because the
 * owner decided on 2026-08-13 that it enters Phase 41.1** — it is the sixth
 * entry on D-41.1-19's authorised file list, added by its own decision — and
 * for the reason recorded there: the drinks work page reaches it, so without it
 * that page cannot be declared converted.
 *
 * **The measurements are the evidence for that decision, not the decision.**
 * They were taken first — 69 lines, seven class attributes, no reference to a
 * secret location, to a sum of money or to a card provider — and they were once
 * treated as settling the question by themselves. That was refused, correctly:
 * a measurement showing a crossing is *safe* is not the owner having
 * *authorised* it.
 *
 * The direction is the harmless one: 41.2 inherits a component already
 * converted, and a converted file cannot make an unconverted surface worse. The
 * reverse — 41.2 converting a file this phase had already declared whole —
 * would not have been.
 *
 * **The hidden print node's structure is deliberately untouched.** It exists so
 * the code can be printed, and a layout change there is a change to a physical
 * artefact rather than to a screen.
 */

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
    <Card>
      <h3 className="text-base font-semibold text-ink mb-1">Menu QR Code</h3>
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
        {/*
          Finding A2 paid on this control: an accent fill under white ink
          measures 2.91 : 1 and fails 1.4.3, while the primary rung's own ink on
          the same fill measures 6.85 : 1. The ink comes from the variant map,
          so it is not a value this file chose.
        */}
        <Button onClick={downloadPNG}>Download PNG</Button>
      </div>
    </Card>
  );
}
