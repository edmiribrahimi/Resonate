"use client";

import { useState, useRef, useEffect, useCallback } from "react";

import { FOCUS_RING } from "@/components/ui/Button";

/**
 * The search-and-pick field — one text control, a suggestion list, and an
 * optional route to creating what nobody found.
 *
 * ── What this conversion moved, and what it deliberately did not ─────────────
 *
 * Moved: the boundary, the well, the type scale, the suggestion list's surface,
 * the option targets, and the focus expression. **Not moved: one line of
 * behaviour.** The debounce, the two-character floor, the outside-click close,
 * the open condition, the `onSelect` payload and the create-new predicate are
 * the same code they were.
 *
 * ── The boundary, and why it is spelled here rather than imported ────────────
 *
 * The field carries the same control string `src/components/ui/Input.tsx`
 * declares for all three of its controls — reproduced below as a constant and
 * **not quoted in this prose**, because to Tailwind a class string in a comment
 * is indistinguishable from a use and would emit a rule with no consumer, and
 * because a grep-based gate would count this docblock as a site. Two fields on
 * one form with two different boundaries is the inconsistency the token exists
 * to remove. The incumbent drew its edge with the legacy boundary name, which
 * aliases a decorative line token at **1.39 : 1**; `--control` is **7.03 : 1**
 * over `--sunk`, against WCAG 1.4.11's 3 : 1. The consequence is not cosmetic:
 * an input's well is `--sunk` inside a card of `--surface` at 1.04 : 1, so the
 * fill cannot show where the control is and **the boundary is the only
 * channel**.
 *
 * It is re-spelled rather than imported because that string is module-private
 * to `Input.tsx`, and `Input.tsx` is not a file this plan may open. Exporting
 * it is the right shape and it is owed, not done here.
 *
 * The focus expression, by contrast, **is** imported: it is exported for
 * exactly this, and one declaration in one place is what keeps the 2 px offset
 * from being dropped for density somewhere.
 *
 * ── The combobox's accessibility contract is behaviour, and it is UNCHANGED ──
 *
 * This control declares **no** `role="combobox"`, no `aria-expanded`, no
 * `aria-activedescendant` and no `aria-controls`, and it handles **no** arrow
 * keys — before this conversion and after it. That is stated rather than left
 * to be discovered: §12 asks for the contract, and the contract is absent.
 *
 * **It was deliberately not added here.** Adding the roles without the key
 * handling announces a widget that cannot be operated, which is worse than
 * announcing nothing; adding the key handling is a behaviour change, and a
 * conversion commit is where a behaviour change goes unreviewed. Recorded as
 * owed, with the measurement, rather than half-built.
 *
 * ── The list's rung is `z-50`, and it is the rung §10 assigns it ─────────────
 *
 * Written out so a later reader does not read it as an arbitrary number: §10's
 * ladder names this file and its wrapper as the dropdown rung. No new rung.
 */

export interface AutocompleteOption {
  id: string;
  name: string;
  detail?: string | null;
}

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (option: AutocompleteOption) => void;
  onCreateNew?: (name: string) => void;
  search: (query: string) => Promise<AutocompleteOption[]>;
  placeholder?: string;
  selectedId?: string | null;
  createLabel?: string;
  id?: string;
}

/**
 * The field, the list and an option — the three strings this file draws.
 *
 * `CONTROL` is `Input.tsx`'s, verbatim. `OPTION` carries the 44 px floor,
 * because a suggestion is a finger target and a row of 34 px rows is the
 * finding §6.1 exists for; the hover fill is `--raised`, the ladder's top step
 * and §5.1's answer for a dropdown, and never an accent tint — §5.1's closed
 * list forbids the accent as a state signal.
 */
const CONTROL =
  "min-h-11 w-full rounded-xl border border-control bg-sunk px-4 text-sm text-ink " +
  "placeholder:text-muted";

const LIST =
  "absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-line bg-surface shadow-lg";

const OPTION =
  "flex min-h-11 w-full items-center px-4 py-2 text-left text-sm transition-colors hover:bg-raised";

export default function AutocompleteInput({
  value,
  onChange,
  onSelect,
  onCreateNew,
  search,
  placeholder = "Search...",
  selectedId,
  createLabel = "Create new",
  id,
}: AutocompleteInputProps) {
  const [results, setResults] = useState<AutocompleteOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const doSearch = useCallback(
    async (query: string) => {
      if (query.trim().length < 2) {
        setResults([]);
        setIsOpen(false);
        return;
      }
      setIsLoading(true);
      try {
        const data = await search(query);
        setResults(data);
        setIsOpen(data.length > 0 || (!!onCreateNew && query.trim().length > 0));
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [search, onCreateNew]
  );

  function handleInputChange(val: string) {
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => {
          if (value.trim().length >= 2) doSearch(value);
        }}
        placeholder={placeholder}
        className={`${CONTROL} ${FOCUS_RING}`}
      />
      {selectedId && (
        /*
          The word is the channel. The incumbent said this in a raw green, and
          D-41.1-25 refuses an outcome tone the token set has no distinguishable
          pair for (D-41.1-29 measured the two semantic fills at 1.23 : 1). The
          colour is an accepted loss; the sentence is not.
        */
        <p className="mt-1 text-xs text-muted">Linked</p>
      )}
      {isLoading && (
        <div className="absolute right-3 top-3.5">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-accent" />
        </div>
      )}
      {isOpen && (
        <div className={LIST}>
          {results.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                onSelect(option);
                setIsOpen(false);
              }}
              className={`${OPTION} text-ink ${FOCUS_RING}`}
            >
              <span className="font-semibold">{option.name}</span>
              {option.detail && (
                <span className="ml-2 text-xs text-muted">({option.detail})</span>
              )}
            </button>
          ))}
          {onCreateNew && value.trim().length > 0 && (
            <button
              type="button"
              onClick={() => {
                onCreateNew(value.trim());
                setIsOpen(false);
              }}
              className={`${OPTION} border-t border-line text-accent ${FOCUS_RING}`}
            >
              + {createLabel} &ldquo;{value.trim()}&rdquo;
            </button>
          )}
        </div>
      )}
    </div>
  );
}
