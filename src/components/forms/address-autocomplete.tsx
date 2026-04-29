"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { geoService, type PlaceSuggestion } from "@/lib/api/geo";

const AUTOCOMPLETE_DEBOUNCE_MS = 500;

type AddressAutocompleteProps = {
  value: string;
  placeholder?: string;
  sessionToken: string;
  selectedPlaceId?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onSelect: (place: PlaceSuggestion) => void;
};

export function AddressAutocomplete({
  value,
  placeholder,
  sessionToken,
  selectedPlaceId,
  disabled,
  onChange,
  onSelect,
}: AddressAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [debouncedValue, setDebouncedValue] = useState(value);
  const searchValue = debouncedValue.trim();
  const canSearch = searchValue.length >= 3 && !selectedPlaceId && !disabled;

  useEffect(() => {
    const timeout = setTimeout(
      () => setDebouncedValue(value),
      AUTOCOMPLETE_DEBOUNCE_MS,
    );

    return () => clearTimeout(timeout);
  }, [value]);

  const suggestionsQ = useQuery({
    queryKey: ["geo-autocomplete", searchValue, sessionToken],
    queryFn: () => geoService.autocomplete(searchValue, sessionToken),
    enabled: open && canSearch,
    staleTime: 60_000,
  });

  return (
    <div className="space-y-2">
      <Input
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setOpen(true);
          onChange(event.target.value);
        }}
      />
      {selectedPlaceId && (
        <p className="flex items-center gap-1 text-xs text-emerald-600">
          <CheckCircle2 className="size-3.5" />
          Endereco selecionado
        </p>
      )}
      {open && canSearch && (suggestionsQ.data?.length ?? 0) > 0 && (
        <div className="overflow-hidden rounded-md border border-border bg-card shadow-sm">
          {suggestionsQ.data!.slice(0, 5).map((item) => (
            <button
              key={item.placeId}
              type="button"
              className="block w-full border-b border-border px-3 py-2 text-left hover:bg-muted"
              onClick={() => {
                setOpen(false);
                onSelect(item);
              }}
            >
              <span className="block text-sm font-medium">{item.mainText}</span>
              {item.secondaryText && (
                <span className="block text-xs text-muted-foreground">
                  {item.secondaryText}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      {open && canSearch && suggestionsQ.isError && (
        <p className="text-xs text-destructive">
          Nao foi possivel buscar enderecos.
        </p>
      )}
    </div>
  );
}
