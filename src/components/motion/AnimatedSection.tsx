"use client";

import * as m from "motion/react-m";

interface AnimatedSectionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  scrollTriggered?: boolean;
}

export default function AnimatedSection({
  children,
  className,
  delay = 0,
  scrollTriggered = false,
}: AnimatedSectionProps) {
  const initial = { opacity: 0, y: 20 };
  const target = { opacity: 1, y: 0 };
  const transition = { duration: 0.25, ease: "easeOut" as const, delay };

  if (scrollTriggered) {
    return (
      <m.div
        className={className}
        initial={initial}
        whileInView={target}
        viewport={{ once: true, amount: 0.2 }}
        transition={transition}
      >
        {children}
      </m.div>
    );
  }

  return (
    <m.div
      className={className}
      initial={initial}
      animate={target}
      transition={transition}
    >
      {children}
    </m.div>
  );
}
