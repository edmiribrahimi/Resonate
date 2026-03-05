"use client";

import { useState } from "react";
import Link from "next/link";
import { LockClosedIcon } from "@/components/ui/Icons";

interface SecretVenueDialogProps {
  hint: string | null;
  isAuthenticated: boolean;
  isApproved: boolean;
  revealHours: number | null;
  revealOnPurchase: boolean;
}

export default function SecretVenueDialog({
  hint,
  isAuthenticated,
  isApproved,
  revealHours,
  revealOnPurchase,
}: SecretVenueDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-sm text-accent hover:text-accent-hover transition-all active:scale-95 active:opacity-80"
      >
        <LockClosedIcon /> Secret Venue
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-card-border bg-card p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-4">
              <LockClosedIcon />
              <h3 className="text-lg font-semibold">Secret Venue</h3>
            </div>

            <div className="space-y-3 text-sm text-muted">
              {hint && isAuthenticated && (
                <p className="italic">
                  Hint: {hint}
                </p>
              )}

              <div className="space-y-2">
                <p className="font-medium text-foreground">How to unlock:</p>
                {!isAuthenticated ? (
                  <p className="mb-2">Sign up or sign in to access secret venues.</p>
                ) : !isApproved ? (
                  <p>Your account needs to be approved first.</p>
                ) : (
                  <ul className="list-disc list-inside space-y-1">
                    {revealOnPurchase && (
                      <li>Buy a ticket to unlock immediately</li>
                    )}
                    <li>
                      {revealOnPurchase ? "Or wait" : "Wait"} for the reveal{" "}
                      {revealHours
                        ? `${revealHours} hours before the event`
                        : "closer to the event"}
                    </li>
                  </ul>
                )}
              </div>
            </div>

            {!isAuthenticated && (
              <div className="mt-5 flex gap-3">
                <Link
                  href="/register"
                  className="flex-1 rounded-full bg-accent py-2.5 text-center text-sm font-medium text-white transition-all hover:bg-accent-hover active:scale-95 active:opacity-80"
                >
                  Sign up
                </Link>
                <Link
                  href="/login"
                  className="flex-1 rounded-full border border-card-border py-2.5 text-center text-sm font-medium text-foreground hover:bg-background transition-all active:scale-95 active:opacity-80"
                >
                  Sign in
                </Link>
              </div>
            )}

            <button
              type="button"
              onClick={() => setOpen(false)}
              className={`${!isAuthenticated ? "mt-3" : "mt-5"} w-full rounded-full bg-card border border-card-border py-2.5 text-sm font-medium text-muted hover:text-foreground transition-all active:scale-95 active:opacity-80`}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
