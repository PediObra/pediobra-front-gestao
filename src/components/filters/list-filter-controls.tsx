"use client";

import type { ReactNode } from "react";
import { CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function FilterField({
  label,
  htmlFor,
  className,
  children,
}: {
  label: ReactNode;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label
        htmlFor={htmlFor}
        className="text-xs font-medium text-muted-foreground"
      >
        {label}
      </Label>
      {children}
    </div>
  );
}

export function DateRangeFilter({
  id,
  label,
  fromLabel,
  toLabel,
  fromValue,
  toValue,
  onFromChange,
  onToChange,
  className,
}: {
  id: string;
  label: string;
  fromLabel: string;
  toLabel: string;
  fromValue: string;
  toValue: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  className?: string;
}) {
  return (
    <FilterField label={label} className={className}>
      <div className="grid min-h-9 overflow-hidden rounded-md border border-input bg-transparent shadow-sm transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1 focus-within:ring-offset-background sm:grid-cols-2">
        <div className="flex min-w-0 items-center gap-2 px-3 py-1">
          <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
          <span className="shrink-0 text-xs font-medium text-muted-foreground">
            {fromLabel}
          </span>
          <Input
            id={`${id}-from`}
            type="date"
            aria-label={`${label} ${fromLabel}`}
            value={fromValue}
            onChange={(event) => onFromChange(event.target.value)}
            className="h-7 min-w-0 rounded-none border-0 px-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
        <div className="flex min-w-0 items-center gap-2 border-t border-border px-3 py-1 sm:border-l sm:border-t-0">
          <span className="shrink-0 text-xs font-medium text-muted-foreground">
            {toLabel}
          </span>
          <Input
            id={`${id}-to`}
            type="date"
            aria-label={`${label} ${toLabel}`}
            value={toValue}
            onChange={(event) => onToChange(event.target.value)}
            className="h-7 min-w-0 rounded-none border-0 px-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
      </div>
    </FilterField>
  );
}
