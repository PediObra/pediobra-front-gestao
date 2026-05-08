"use client";

import { CalendarDays, Clock3, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toDateTimeLocal } from "@/lib/blog-post-editor";
import { cn } from "@/lib/utils";

export function DateTimePicker({
  id,
  value,
  onChange,
  disabled,
  placeholder,
  dateLabel,
  timeLabel,
  clearLabel,
  nowLabel,
  locale,
  className,
}: {
  id: string;
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder: string;
  dateLabel: string;
  timeLabel: string;
  clearLabel: string;
  nowLabel: string;
  locale?: string;
  className?: string;
}) {
  const { date, time } = splitDateTime(value);
  const displayValue = value ? formatDisplayDate(value, locale) : placeholder;

  const setDatePart = (nextDate: string) => {
    onChange(nextDate ? `${nextDate}T${time || "09:00"}` : "");
  };

  const setTimePart = (nextTime: string) => {
    onChange(date && nextTime ? `${date}T${nextTime}` : "");
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-9 w-full justify-start px-3 text-left font-normal",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <CalendarDays className="size-4" aria-hidden="true" />
          <span className="min-w-0 truncate">{displayValue}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(20rem,calc(100vw-2rem))]">
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor={`${id}-date`}>{dateLabel}</Label>
            <Input
              id={`${id}-date`}
              type="date"
              value={date}
              disabled={disabled}
              onChange={(event) => setDatePart(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${id}-time`}>{timeLabel}</Label>
            <div className="relative">
              <Clock3
                className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id={`${id}-time`}
                type="time"
                value={time}
                disabled={disabled || !date}
                onChange={(event) => setTimePart(event.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled || !value}
              onClick={() => onChange("")}
            >
              <X className="size-4" aria-hidden="true" />
              {clearLabel}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={disabled}
              onClick={() => onChange(toDateTimeLocal(new Date()))}
            >
              {nowLabel}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function splitDateTime(value?: string) {
  if (!value) return { date: "", time: "" };

  const [date = "", time = ""] = value.split("T");
  return { date, time: time.slice(0, 5) };
}

function formatDisplayDate(value: string, locale = "pt-BR") {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
