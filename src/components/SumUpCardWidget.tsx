"use client";

import { useEffect, useRef } from "react";

// ---------------------------------------------------------------------------
// SumUp Card Widget SDK global types
// ---------------------------------------------------------------------------

interface SumUpCardConfig {
  id: string;
  checkoutId: string;
  locale?: string;
  showSubmitButton?: boolean;
  showFooter?: boolean;
  showEmail?: boolean;
  email?: string;
  donateSubmitButton?: boolean;
  amount?: number;
  currency?: string;
  country?: string;
  nonce?: string;
  onResponse?: (
    type: SumUpResponseType,
    body: Record<string, unknown>
  ) => void;
  onLoad?: () => void;
}

type SumUpResponseType =
  | "sent"
  | "invalid"
  | "auth-screen"
  | "error"
  | "success"
  | "fail";

interface SumUpCardInstance {
  submit: () => void;
  unmount: () => void;
  update: (config: Partial<SumUpCardConfig>) => void;
}

interface SumUpCardSDK {
  mount: (config: SumUpCardConfig) => SumUpCardInstance;
}

declare global {
  interface Window {
    SumUpCard?: SumUpCardSDK;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface SumUpCardWidgetProps {
  checkoutId: string;
  onSuccess: (body: Record<string, unknown>) => void;
  onError: (body: Record<string, unknown>) => void;
  onLoad?: () => void;
  locale?: string;
}

export function SumUpCardWidget({
  checkoutId,
  onSuccess,
  onError,
  onLoad,
  locale = "en-GB",
}: SumUpCardWidgetProps) {
  const instanceRef = useRef<SumUpCardInstance | null>(null);

  // Stable callback refs to avoid stale closures without adding
  // callbacks to the useEffect dependency array.
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const onLoadRef = useRef(onLoad);

  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;
  onLoadRef.current = onLoad;

  useEffect(() => {
    if (!checkoutId || !window.SumUpCard) return;

    // Unmount previous instance (handles React Strict Mode double-mount)
    if (instanceRef.current) {
      instanceRef.current.unmount();
      instanceRef.current = null;
    }

    instanceRef.current = window.SumUpCard.mount({
      id: "sumup-card",
      checkoutId,
      locale,
      showFooter: false,
      onLoad: () => {
        onLoadRef.current?.();
      },
      onResponse: (type: SumUpResponseType, body: Record<string, unknown>) => {
        if (type === "success") {
          onSuccessRef.current(body);
        } else if (type === "error" || type === "fail" || type === "invalid") {
          onErrorRef.current(body);
        }
      },
    });

    return () => {
      if (instanceRef.current) {
        instanceRef.current.unmount();
        instanceRef.current = null;
      }
    };
  }, [checkoutId, locale]);

  return <div id="sumup-card" />;
}
