"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { joinCommaList, parseCommaList } from "@/lib/blog-post-editor";
import { cn } from "@/lib/utils";

export function KeywordInput({
  id,
  value,
  onChange,
  disabled,
  placeholder,
  addLabel,
  removeLabel,
  emptyLabel,
}: {
  id: string;
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  addLabel: string;
  removeLabel: string;
  emptyLabel: string;
}) {
  const [draft, setDraft] = useState("");
  const keywords = parseCommaList(value);

  const commitDraft = () => {
    const nextKeywords = [...keywords, ...parseCommaList(draft)];
    setDraft("");
    onChange(joinCommaList(nextKeywords));
  };

  const removeKeyword = (keywordToRemove: string) => {
    onChange(
      joinCommaList(keywords.filter((keyword) => keyword !== keywordToRemove)),
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          id={id}
          value={draft}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              commitDraft();
              return;
            }

            if (event.key === "Backspace" && !draft && keywords.length > 0) {
              removeKeyword(keywords[keywords.length - 1]);
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          disabled={disabled || parseCommaList(draft).length === 0}
          onClick={commitDraft}
        >
          {addLabel}
        </Button>
      </div>
      <div
        className={cn(
          "flex min-h-9 flex-wrap gap-1.5 rounded-md border border-dashed border-border bg-muted/25 p-2",
          keywords.length === 0 && "items-center",
        )}
      >
        {keywords.length > 0 ? (
          keywords.map((keyword) => (
            <Badge key={keyword} variant="secondary" className="gap-1 pr-1">
              <span>{keyword}</span>
              <button
                type="button"
                disabled={disabled}
                className="rounded-sm p-0.5 text-muted-foreground transition hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                aria-label={`${removeLabel}: ${keyword}`}
                onClick={() => removeKeyword(keyword)}
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
