"use client";

interface VenueProfilePromptProps {
  name: string;
  onCreateClick: () => void;
  onSkip: () => void;
}

export default function VenueProfilePrompt({
  name,
  onCreateClick,
  onSkip,
}: VenueProfilePromptProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-accent/30 bg-accent/5 px-4 py-2.5">
      <p className="text-sm text-foreground">
        Create a profile for <span className="font-semibold">{name}</span>?
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCreateClick}
          className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-white transition-opacity hover:opacity-90"
        >
          Create
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="rounded-full bg-card-border/50 px-3 py-1 text-xs font-medium text-muted transition-opacity hover:opacity-90"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
