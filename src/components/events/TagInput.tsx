"use client";

import { useState, useRef, type KeyboardEvent, type ChangeEvent } from "react";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export default function TagInput({
  value,
  onChange,
  placeholder = "Type and press Enter",
}: TagInputProps) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function addTag(raw: string) {
    const tag = raw.trim();
    if (!tag) return;

    // Prevent duplicates (case-insensitive)
    const exists = value.some(
      (t) => t.toLowerCase() === tag.toLowerCase()
    );
    if (exists) {
      setInput("");
      return;
    }

    onChange([...value, tag]);
    setInput("");
  }

  function removeTag(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault(); // Prevent form submission on Enter
      addTag(input);
    } else if (e.key === "Backspace" && input === "" && value.length > 0) {
      removeTag(value.length - 1);
    }
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    // If user pastes text with commas, split and add each
    if (val.includes(",")) {
      const parts = val.split(",");
      // Add all complete parts (before the last comma)
      parts.slice(0, -1).forEach((part) => addTag(part));
      // Keep the last part in the input
      setInput(parts[parts.length - 1]);
    } else {
      setInput(val);
    }
  }

  return (
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
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={value.length === 0 ? placeholder : "Add another..."}
        className="w-full bg-transparent text-foreground outline-none placeholder:text-muted text-sm"
      />
    </div>
  );
}
