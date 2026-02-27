"use client";

import { useState, useRef, useEffect, useCallback } from "react";

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
        className="w-full rounded-xl border border-card-border bg-background px-4 py-3 text-foreground placeholder:text-muted outline-none focus:ring-1 focus:ring-accent/50"
      />
      {selectedId && (
        <p className="text-xs text-green-400 mt-1">Linked</p>
      )}
      {isLoading && (
        <div className="absolute right-3 top-3.5">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-accent" />
        </div>
      )}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-card-border bg-card shadow-lg overflow-hidden">
          {results.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                onSelect(option);
                setIsOpen(false);
              }}
              className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-accent/10 transition-colors"
            >
              <span className="font-medium">{option.name}</span>
              {option.detail && (
                <span className="text-xs text-muted ml-2">({option.detail})</span>
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
              className="w-full px-4 py-2.5 text-left text-sm text-accent hover:bg-accent/10 transition-colors border-t border-card-border"
            >
              + {createLabel} &ldquo;{value.trim()}&rdquo;
            </button>
          )}
        </div>
      )}
    </div>
  );
}
