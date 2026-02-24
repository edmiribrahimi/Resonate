"use client";

import { useEffect, useState } from "react";
import { generateMembershipQR } from "@/utils/qr";

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
    <div className="overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-br from-card via-card to-accent/10">
      {/* Card Header */}
      <div className="px-6 pt-6 pb-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">
          Resonate Member
        </p>
        <h2 className="mt-2 text-2xl font-bold">{fullName}</h2>
        <p className="mt-1 text-sm text-muted">
          Membro dal{" "}
          {new Date(memberSince).toLocaleDateString("it-IT", {
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      {/* QR Code */}
      <div className="flex flex-col items-center px-6 py-6">
        {qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrDataUrl}
            alt="Membership QR Code"
            className="h-48 w-48 rounded-xl"
          />
        ) : (
          <div className="flex h-48 w-48 items-center justify-center rounded-xl bg-background">
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
