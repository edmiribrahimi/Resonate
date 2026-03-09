interface SkeletonLineProps {
  className?: string;
}

export function SkeletonLine({ className = "" }: SkeletonLineProps) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-card-border/50 h-4 w-full ${className}`}
    />
  );
}

interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className = "" }: SkeletonCardProps) {
  return (
    <div
      className={`animate-pulse rounded-2xl border border-card-border bg-card p-5 ${className}`}
    >
      <SkeletonLine className="h-5 w-3/4 mb-3" />
      <SkeletonLine className="h-4 w-full mb-2" />
      <SkeletonLine className="h-4 w-2/3" />
    </div>
  );
}

interface SkeletonAvatarProps {
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-12 w-12",
  lg: "h-16 w-16",
};

export function SkeletonAvatar({ size = "md" }: SkeletonAvatarProps) {
  return (
    <div
      className={`animate-pulse rounded-full bg-card-border/50 ${sizeClasses[size]}`}
    />
  );
}
