"use client";

import { useEffect, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { CheckCircle2, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { geoService, type PlaceSuggestion } from "@/lib/api/geo";
import {
  calculateDistanceMeters,
  formatDistanceShort,
  hasGeoPoint,
  type GeoPoint,
} from "@/lib/geo-distance";

const AUTOCOMPLETE_DEBOUNCE_MS = 500;

type AddressAutocompleteProps = {
  id?: string;
  value: string;
  placeholder?: string;
  sessionToken: string;
  selectedPlaceId?: string;
  disabled?: boolean;
  referencePoint?: GeoPoint | null;
  onChange: (value: string) => void;
  onSelect: (place: PlaceSuggestion) => void;
};

export function AddressAutocomplete({
  id,
  value,
  placeholder,
  sessionToken,
  selectedPlaceId,
  disabled,
  referencePoint,
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
  const suggestions = suggestionsQ.data ?? [];
  const visibleSuggestions = suggestions.slice(0, 5);
  const shouldResolveDistance = hasGeoPoint(referencePoint);
  const suggestionPlaceQueries = useQueries({
    queries: visibleSuggestions.map((item) => ({
      queryKey: ["geo-resolve", item.placeId, sessionToken],
      queryFn: () => geoService.resolve(item.placeId, sessionToken),
      enabled: open && canSearch && shouldResolveDistance,
      staleTime: 5 * 60_000,
    })),
  });

  return (
    <div className="space-y-2">
      <Input
        id={id}
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
      {open && canSearch && visibleSuggestions.length > 0 && (
        <div className="overflow-hidden rounded-md border border-border bg-card shadow-sm">
          {visibleSuggestions.map((item, index) => {
            const resolved = suggestionPlaceQueries[index]?.data;
            const distance = formatDistanceShort(
              calculateDistanceMeters(referencePoint, resolved),
            );

            return (
              <button
                key={item.placeId}
                type="button"
                className="flex w-full items-start gap-3 border-b border-border px-3 py-2 text-left hover:bg-muted"
                onClick={() => {
                  setOpen(false);
                  onSelect(item);
                }}
              >
                <span className="flex w-14 shrink-0 flex-col items-center gap-0.5 pt-0.5 text-muted-foreground">
                  <MapPin className="size-4" />
                  {distance ? (
                    <span className="text-[10px] font-medium leading-none">
                      {distance}
                    </span>
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {item.mainText}
                  </span>
                  {item.secondaryText && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {item.secondaryText}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
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
