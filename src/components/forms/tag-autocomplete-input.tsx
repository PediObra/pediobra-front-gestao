"use client";

import { useId, useMemo, useState } from "react";
import { Check, Plus, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  joinCommaList,
  parseCommaList,
  slugifyBlogSlug,
} from "@/lib/blog-post-editor";
import { cn } from "@/lib/utils";

const MAX_VISIBLE_SUGGESTIONS = 8;

export function TagAutocompleteInput({
  id,
  value,
  suggestions,
  onChange,
  disabled,
  placeholder,
  ariaLabel,
  addLabel,
  removeLabel,
  emptyLabel,
  createLabel,
  suggestionsLabel,
  noSuggestionsLabel,
  loading,
  loadingLabel,
}: {
  id: string;
  value?: string;
  suggestions: string[];
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  ariaLabel: string;
  addLabel: string;
  removeLabel: string;
  emptyLabel: string;
  createLabel: string;
  suggestionsLabel: string;
  noSuggestionsLabel: string;
  loading?: boolean;
  loadingLabel?: string;
}) {
  const generatedId = useId();
  const listboxId = `${id}-${generatedId}-listbox`;
  const [draft, setDraft] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const selectedTags = parseCommaList(value);
  const normalizedDraft = slugifyBlogSlug(draft);
  const selectedKeys = useMemo(
    () => new Set(selectedTags.map((tag) => slugifyBlogSlug(tag))),
    [selectedTags],
  );
  const suggestionItems = useMemo(
    () =>
      suggestions
        .filter((suggestion) => !selectedKeys.has(slugifyBlogSlug(suggestion)))
        .filter((suggestion) => {
          const query = draft.trim().toLowerCase();
          if (!query) return true;
          return suggestion.toLowerCase().includes(query);
        })
        .slice(0, MAX_VISIBLE_SUGGESTIONS),
    [draft, selectedKeys, suggestions],
  );
  const canCreate =
    draft.trim().length > 0 &&
    !selectedKeys.has(normalizedDraft) &&
    !suggestions.some((suggestion) => slugifyBlogSlug(suggestion) === normalizedDraft);
  const options = [
    ...suggestionItems.map((label) => ({ label, type: "suggestion" as const })),
    ...(canCreate ? [{ label: draft.trim(), type: "create" as const }] : []),
  ];
  const activeOption = options[activeIndex];

  const updateTags = (nextTags: string[]) => {
    onChange(joinCommaList(nextTags));
  };

  const addTags = (labels: string[]) => {
    const nextTags = [...selectedTags, ...labels].filter(Boolean);
    updateTags(nextTags);
    setDraft("");
    setIsOpen(false);
    setActiveIndex(0);
  };

  const commitDraft = () => {
    const nextTags = parseCommaList(draft);
    if (nextTags.length === 0) return;
    addTags(nextTags);
  };

  const removeTag = (tagToRemove: string) => {
    updateTags(selectedTags.filter((tag) => tag !== tagToRemove));
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          id={id}
          role="combobox"
          aria-label={ariaLabel}
          aria-autocomplete="list"
          aria-controls={isOpen ? listboxId : undefined}
          aria-expanded={isOpen}
          aria-activedescendant={
            isOpen && activeOption
              ? `${listboxId}-${activeOption.type}-${slugifyBlogSlug(activeOption.label)}`
              : undefined
          }
          value={draft}
          disabled={disabled}
          placeholder={placeholder}
          className="pl-9 pr-24"
          onFocus={() => setIsOpen(true)}
          onBlur={() => setIsOpen(false)}
          onChange={(event) => {
            setDraft(event.target.value);
            setIsOpen(true);
            setActiveIndex(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setIsOpen(true);
              setActiveIndex((index) =>
                options.length === 0 ? 0 : (index + 1) % options.length,
              );
              return;
            }

            if (event.key === "ArrowUp") {
              event.preventDefault();
              setIsOpen(true);
              setActiveIndex((index) =>
                options.length === 0
                  ? 0
                  : (index - 1 + options.length) % options.length,
              );
              return;
            }

            if (event.key === "Enter") {
              event.preventDefault();
              if (isOpen && activeOption) {
                addTags([activeOption.label]);
                return;
              }
              commitDraft();
              return;
            }

            if (event.key === ",") {
              event.preventDefault();
              commitDraft();
              return;
            }

            if (event.key === "Escape") {
              setIsOpen(false);
              return;
            }

            if (
              event.key === "Backspace" &&
              !draft &&
              selectedTags.length > 0
            ) {
              removeTag(selectedTags[selectedTags.length - 1]);
            }
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={disabled || parseCommaList(draft).length === 0}
          className="absolute right-1 top-1/2 h-7 -translate-y-1/2 px-2.5"
          onMouseDown={(event) => event.preventDefault()}
          onClick={commitDraft}
        >
          <Plus className="size-3.5" aria-hidden="true" />
          {addLabel}
        </Button>

        {isOpen && !disabled && (
          <div
            id={listboxId}
            role="listbox"
            aria-label={suggestionsLabel}
            className="absolute z-40 mt-2 max-h-72 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-xl"
          >
            {loading ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                {loadingLabel}
              </p>
            ) : options.length > 0 ? (
              options.map((option, index) => {
                const optionId = `${listboxId}-${option.type}-${slugifyBlogSlug(option.label)}`;
                const isActive = index === activeIndex;

                return (
                  <button
                    id={optionId}
                    key={optionId}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    className={cn(
                      "flex min-h-10 w-full items-center justify-between gap-3 rounded-sm px-3 py-2 text-left text-sm outline-none transition",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/70",
                    )}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => addTags([option.label])}
                  >
                    <span className="min-w-0 truncate">
                      {option.type === "create"
                        ? `${createLabel} ${option.label}`
                        : option.label}
                    </span>
                    {option.type === "create" ? (
                      <Plus className="size-4 shrink-0 text-primary" />
                    ) : (
                      <Check className="size-4 shrink-0 text-muted-foreground" />
                    )}
                  </button>
                );
              })
            ) : (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                {noSuggestionsLabel}
              </p>
            )}
          </div>
        )}
      </div>

      <div
        className={cn(
          "flex min-h-10 flex-wrap gap-1.5 rounded-md border border-dashed border-border bg-muted/25 p-2",
          selectedTags.length === 0 && "items-center",
        )}
      >
        {selectedTags.length > 0 ? (
          selectedTags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="max-w-full gap-1 pr-1"
            >
              <span className="truncate">{tag}</span>
              <button
                type="button"
                disabled={disabled}
                className="rounded-sm p-0.5 text-muted-foreground transition hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                aria-label={`${removeLabel}: ${tag}`}
                onClick={() => removeTag(tag)}
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </Badge>
          ))
        ) : (
          <span className="text-xs text-muted-foreground">{emptyLabel}</span>
        )}
      </div>
    </div>
  );
}
