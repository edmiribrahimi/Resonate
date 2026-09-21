"use client";

import { FOCUS_RING } from "@/components/ui/Button";

/**
 * Meno / piu' al posto della tendina, per «quanti biglietti».
 *
 * Decisione del proprietario, 2026-09-21, dal confronto con i concorrenti: una
 * tendina su un telefono apre un rullo di sistema per scegliere fra uno e sei;
 * due tasti si premono con il pollice senza lasciare il modulo. **Nessun minimo
 * per tier**: il minimo e' 1 finche' non esiste un tier di gruppo, e il massimo
 * e' `max`, che il chiamante calcola dal tetto della serata e dai posti rimasti
 * del tier scelto — mai una costante di questo file.
 *
 * I due tasti sono 44 × 44 (`h-11 w-11`): `verify:touch-targets` misura i
 * controlli convertiti, e un tasto piu' piccolo su un modulo che si compila in
 * piedi e' esattamente cio' che quel gate esiste per fermare. Il valore e' in
 * un `output` con `aria-live`, cosi' chi usa un lettore di schermo sente il
 * numero cambiare senza che i tasti debbano descriverlo.
 */
interface QuantityStepperProps {
  id: string;
  label: string;
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  hint?: string;
}

const STEP_BUTTON =
  "flex shrink-0 items-center justify-center rounded-full border border-control text-lg font-semibold text-ink " +
  "transition-transform active:scale-95 disabled:opacity-40 disabled:active:scale-100 " +
  FOCUS_RING;

export function QuantityStepper({
  id,
  label,
  value,
  min = 1,
  max,
  onChange,
  disabled = false,
  hint,
}: QuantityStepperProps) {
  const clampedMax = Math.max(min, max);
  const canDecrease = !disabled && value > min;
  const canIncrease = !disabled && value < clampedMax;

  return (
    <div className="space-y-1.5">
      <span id={`${id}-label`} className="block text-xs font-semibold text-ink-2">
        {label}
      </span>
      <div
        role="group"
        aria-labelledby={`${id}-label`}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="flex items-center gap-4"
      >
        <button
          type="button"
          className={`h-11 w-11 ${STEP_BUTTON}`}
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={!canDecrease}
          aria-label="One ticket fewer"
        >
          &minus;
        </button>
        <output
          id={id}
          aria-live="polite"
          className="min-w-[2ch] text-center text-xl font-bold tabular-nums text-ink"
        >
          {value}
        </output>
        <button
          type="button"
          className={`h-11 w-11 ${STEP_BUTTON}`}
          onClick={() => onChange(Math.min(clampedMax, value + 1))}
          disabled={!canIncrease}
          aria-label="One ticket more"
        >
          +
        </button>
      </div>
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
