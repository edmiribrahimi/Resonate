"use client";

import * as m from "motion/react-m";

interface PressableCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export default function PressableCard({
  children,
  className,
  onClick,
}: PressableCardProps) {
  return (
    <m.div
      className={className}
      onClick={onClick}
      whileHover={{
        y: -2,
        boxShadow: "0 8px 25px rgba(229, 72, 77, 0.08)",
        transition: { duration: 0.2 },
      }}
      whileTap={{ scale: 0.98 }}
    >
      {children}
    </m.div>
  );
}
