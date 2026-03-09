"use client";

import * as m from "motion/react-m";

interface PressableButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}

export default function PressableButton({
  children,
  className,
  onClick,
  disabled,
  type = "button",
}: PressableButtonProps) {
  return (
    <m.button
      className={className}
      onClick={onClick}
      disabled={disabled}
      type={type}
      whileHover={
        disabled ? undefined : { scale: 1.02, transition: { duration: 0.15 } }
      }
      whileTap={disabled ? undefined : { scale: 0.97 }}
    >
      {children}
    </m.button>
  );
}
