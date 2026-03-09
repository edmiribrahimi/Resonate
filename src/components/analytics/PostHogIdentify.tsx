"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

interface PostHogIdentifyProps {
  userId: string;
  email: string;
  role: string;
}

export default function PostHogIdentify({
  userId,
  email,
  role,
}: PostHogIdentifyProps) {
  useEffect(() => {
    posthog.identify(userId, { email, role });
  }, [userId, email, role]);

  return null;
}
