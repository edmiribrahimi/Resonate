import { PostHog } from "posthog-node";

let posthogServerInstance: PostHog | null = null;

const noopPostHog = {
  capture: () => {},
  identify: () => {},
  shutdown: () => Promise.resolve(),
} as unknown as PostHog;

export function getPostHogServer(): PostHog {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return noopPostHog;
  }

  if (!posthogServerInstance) {
    posthogServerInstance = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      flushAt: 1,
      flushInterval: 0,
    });
  }

  return posthogServerInstance;
}
