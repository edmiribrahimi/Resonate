"use client";

import { useState, useRef, useEffect, useCallback, type KeyboardEvent, type ChangeEvent } from "react";

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
}

export default function AutocompleteTagInput({
  value,
  onChange,
  search,
  onCreateNew,
  placeholder = "Artist name",
  createLabel = "Create new artist",
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
      <div
        className="rounded-xl border border-card-border bg-background p-3 focus-within:ring-1 focus-within:ring-accent/50 cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {value.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {value.map((tag, i) => (
              <span
                key={`${tag}-${i}`}
                className="inline-flex items-center gap-1 rounded-full bg-accent/20 px-3 py-1 text-sm text-accent"
              >
                {tag}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTag(i);
                  }}
                  className="ml-0.5 text-accent/60 hover:text-accent transition-colors"
                  aria-label={`Remove ${tag}`}
                >
                  <svg
                    className="h-3.5 w-3.5"
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
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (input.trim().length >= 2) doSearch(input);
            }}
            placeholder={value.length === 0 ? placeholder : "Add another..."}
            className="w-full bg-transparent text-foreground outline-none placeholder:text-muted text-sm"
          />
          {isLoading && (
            <div className="absolute right-0 top-0.5">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-accent" />
            </div>
          )}
        </div>
      </div>
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-card-border bg-card shadow-lg overflow-hidden">
          {results.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => selectResult(option)}
              className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-accent/10 transition-colors"
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
              className="w-full px-4 py-2.5 text-left text-sm text-accent hover:bg-accent/10 transition-colors border-t border-card-border"
            >
              + {createLabel} &ldquo;{input.trim()}&rdquo;
            </button>
          )}
        </div>
      )}
    </div>
  );
}
