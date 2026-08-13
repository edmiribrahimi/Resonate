"use client";

import { useState, useRef, useEffect, useCallback, type KeyboardEvent, type ChangeEvent } from "react";

import { FOCUS_RING } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";

/**
 * The lineup field — a text control that turns what is typed into removable
 * tags, wrapped around the same search the venue field uses.
 *
 * ── Converted in the same plan as the control it wraps ───────────────────────
 *
 * `src/components/ui/AutocompleteInput.tsx` and this file render **one control
 * between them** as far as anybody using the event form is concerned, and
 * converting one without the other leaves the seam visible at exactly the
 * boundary a person cannot see. So the boundary, the well, the list surface and
 * the option targets are the same here as there, deliberately.
 *
 * ── Each tag is a Chip, and that is a target decision, not a colour one ──────
 *
 * The incumbent drew each tag as a pill carrying a **14 px** removal glyph:
 * three artists in a line was three targets a thumb cannot reliably hit, which
 * is the finding §6.1 exists for and the same one the events listing carried.
 * `Chip.tsx`'s own opening sentence decides which rung this is — *a badge that
 * is a `<Link>` or a `<button>` is a Chip, not a Badge* — so the tag is a chip,
 * at the 44 px floor, and the removal is what pressing it does.
 *
 * **That is a behaviour change and it is named rather than slipped in.** Before,
 * only the glyph removed the tag and a press on the tag's text did nothing;
 * now the whole pill removes it. Two things were done to keep the change from
 * costing anything:
 *
 *  - **The accessible name is unchanged.** A screen reader announced
 *    `Remove <name>` from the glyph's label, and it announces `Remove <name>`
 *    from the chip, because the word is carried in a visually hidden span
 *    placed before the name. The same words, from a target four times the area.
 *  - **The glyph stays**, as the affordance that says what pressing it does.
 *
 * The alternative — keeping the small glyph as the only remover and growing it
 * to 44 px — puts a large destructive target immediately beside the text inside
 * a pill that is itself not pressable, which is a *worse* mis-press shape, not
 * a safer one.
 *
 * ── The keyboard contract is carried through EXACTLY ─────────────────────────
 *
 * Enter and comma commit what is typed, Backspace on an empty field removes the
 * last tag, Escape closes the suggestion list. Those three are the same code
 * they were. And what was **absent** stays absent and is stated: no
 * `role="combobox"`, no `aria-expanded`, no `aria-activedescendant`, and **no
 * arrow-key navigation of the suggestion list** — a person reaches an option
 * with a pointer or with Tab, not with an arrow. Adding it is behaviour and
 * belongs to a plan that says so; adding the roles without it would announce a
 * widget that cannot be operated.
 *
 * ── Focus lands on the element that has it ───────────────────────────────────
 *
 * The incumbent drew a ring around the whole box on `focus-within` and switched
 * the inner control's own outline off — the shape §5.4 says does not survive.
 * The shared focus expression is imported and applied to the control itself, so
 * the indicator is on the thing the keyboard is addressing.
 */

export interface ArtistOption {
  id: string;
  name: string;
  slug: string;
}

interface AutocompleteTagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  search: (query: string) => Promise<ArtistOption[]>;
  onCreateNew?: (name: string) => void;
  placeholder?: string;
  createLabel?: string;
  /**
   * Applied to the text input, so a visible `<label>` in the caller can name it
   * with `htmlFor`. Added 2026-08-14 by plan 41.1-24.
   *
   * Plan 41.1-18 converted the two lineup labels in `EventForm.tsx` and left
   * both UNBOUND, reporting it rather than papering over it: this component
   * exposed no `id`, so there was nothing for a `htmlFor` to name. That is the
   * whole defect and this prop is the whole fix — **a binding, not behaviour**.
   * Nothing about the search, the debounce, the keyboard handling, the creation
   * path or the option list is touched.
   *
   * Optional because the component has callers that do not label it, and a
   * required prop would have been a breaking change dressed as an
   * accessibility fix. Where it is omitted the input renders exactly as before.
   *
   * **The caller owns uniqueness.** This component mounts once per sub-event on
   * the event form, so a fixed identifier here would bind every visible label to
   * the first control of that name — the same defect plan 41.1-22 found and
   * scoped in the tier form. `EventForm.tsx` passes its per-sub-event prefix.
   */
  id?: string;
}

/**
 * The box, the list and an option. The box carries the control boundary of
 * `src/components/ui/Input.tsx` and its sunk well — the same edge every other
 * field on the event form draws — and the list carries §10's dropdown rung.
 */
const BOX = "rounded-xl border border-control bg-sunk p-3 cursor-text";

const LIST =
  "absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-line bg-surface shadow-lg";

const OPTION =
  "flex min-h-11 w-full items-center px-4 py-2 text-left text-sm transition-colors hover:bg-raised";

export default function AutocompleteTagInput({
  value,
  onChange,
  search,
  onCreateNew,
  placeholder = "Artist name",
  createLabel = "Create new artist",
  id,
}: AutocompleteTagInputProps) {
  const [input, setInput] = useState("");
  const [results, setResults] = useState<ArtistOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
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
        // Filter out already-added names
        const filtered = data.filter(
          (a) => !value.some((v) => v.toLowerCase() === a.name.toLowerCase())
        );
        setResults(filtered);
        setIsOpen(filtered.length > 0 || (!!onCreateNew && query.trim().length > 0));
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [search, value]
  );

  function addTag(raw: string) {
    const tag = raw.trim();
    if (!tag) return;
    const exists = value.some((t) => t.toLowerCase() === tag.toLowerCase());
    if (exists) {
      setInput("");
      setIsOpen(false);
      return;
    }
    onChange([...value, tag]);
    setInput("");
    setResults([]);
    setIsOpen(false);
  }

  function removeTag(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const name = input.trim();
      if (!name) return;
      addTag(name);
    } else if (e.key === "Backspace" && input === "" && value.length > 0) {
      removeTag(value.length - 1);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    if (val.includes(",")) {
      const parts = val.split(",");
      parts.slice(0, -1).forEach((part) => {
        if (part.trim()) addTag(part);
      });
      setInput(parts[parts.length - 1]);
    } else {
      setInput(val);
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
  }

  function selectResult(option: ArtistOption) {
    addTag(option.name);
  }

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className={BOX} onClick={() => inputRef.current?.focus()}>
        {value.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {value.map((tag, i) => (
              <Chip key={`${tag}-${i}`} onClick={() => removeTag(i)}>
                {/*
                  Before the name, so the announced name is the incumbent's
                  label word for word rather than a name that merely resembles
                  it.
                */}
                <span className="sr-only">Remove </span>
                {tag}
                <svg
                  className="h-3.5 w-3.5"
                  aria-hidden="true"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </Chip>
            ))}
          </div>
        )}
        <div className="relative">
          <input
            ref={inputRef}
            id={id}
            type="text"
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (input.trim().length >= 2) doSearch(input);
            }}
            placeholder={value.length === 0 ? placeholder : "Add another..."}
            className={`min-h-11 w-full bg-transparent text-sm text-ink placeholder:text-muted ${FOCUS_RING}`}
          />
          {isLoading && (
            <div className="absolute right-0 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-accent" />
            </div>
          )}
        </div>
      </div>
      {isOpen && (
        <div className={LIST}>
          {results.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => selectResult(option)}
              className={`${OPTION} text-ink ${FOCUS_RING}`}
            >
              {option.name}
            </button>
          ))}
          {onCreateNew && input.trim().length > 0 && !results.some(
            (r) => r.name.toLowerCase() === input.trim().toLowerCase()
          ) && (
            <button
              type="button"
              onClick={() => {
                const name = input.trim();
                addTag(name);
                onCreateNew(name);
              }}
              className={`${OPTION} border-t border-line text-accent ${FOCUS_RING}`}
            >
              + {createLabel} &ldquo;{input.trim()}&rdquo;
            </button>
          )}
        </div>
      )}
    </div>
  );
}
