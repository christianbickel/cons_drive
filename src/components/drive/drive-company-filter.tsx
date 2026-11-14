"use client";

import { Building2, Check, ChevronDown, Loader2, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isCompanyFilterActive } from "@/lib/drive/helpers";
import type { DriveCompanyFilter, DriveCompanyOption } from "@/lib/drive/types";
import { cn } from "@/lib/utils";

const SEARCH_DEBOUNCE_MS = 250;

export function DriveCompanyFilter({
  companies,
  selectedCompanies,
  onChange,
}: {
  companies: DriveCompanyFilter;
  selectedCompanies: DriveCompanyOption[];
  onChange: (next: DriveCompanyOption[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DriveCompanyOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<number | null>(null);
  const selectedIds = new Set(companies);

  const active = isCompanyFilterActive(companies);
  const label = !active
    ? "Unternehmen"
    : selectedCompanies.length === 1
      ? selectedCompanies[0]?.name ?? "1 Unternehmen"
      : `${selectedCompanies.length} Unternehmen`;

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
    }

    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/drive/companies?q=${encodeURIComponent(trimmed)}`
        );
        if (!response.ok) {
          throw new Error("Suche fehlgeschlagen");
        }
        const data = (await response.json()) as {
          companies?: DriveCompanyOption[];
          error?: string;
        };
        if (data.error) throw new Error(data.error);
        setResults(data.companies ?? []);
      } catch (err) {
        setResults([]);
        setError(err instanceof Error ? err.message : "Suche fehlgeschlagen");
      } finally {
        setLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, [query, open]);

  function toggleCompany(option: DriveCompanyOption) {
    if (selectedIds.has(option.id)) {
      onChange(selectedCompanies.filter((item) => item.id !== option.id));
      return;
    }
    const next = [
      ...selectedCompanies.filter((item) => item.id !== option.id),
      option,
    ];
    onChange(next);
  }

  function clearAll() {
    onChange([]);
  }

  const visibleResults = results.filter(
    (option) => !selectedIds.has(option.id)
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex min-h-10 w-auto max-w-full shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-[#e9eef6] px-3 text-sm text-[#1f1f1f] touch-manipulation sm:h-9 sm:min-h-0 sm:px-3.5",
          "outline-none transition-[background-color,box-shadow] duration-150 ease-[cubic-bezier(0.2,0,0,1)]",
          "hover:bg-[#e1e7f0] focus-visible:ring-3 focus-visible:ring-ring/50",
          "data-popup-open:bg-white data-popup-open:shadow-[0_1px_3px_0_rgba(60,64,67,0.3),0_4px_8px_3px_rgba(60,64,67,0.15)]",
          active && "bg-[#c2e7ff] hover:bg-[#a8daff]"
        )}
        aria-label="Nach Unternehmen filtern"
      >
        <Building2 className="size-4 shrink-0 opacity-80" aria-hidden />
        <span className="min-w-0 max-w-[10rem] truncate sm:max-w-[14rem]">
          {label}
        </span>
        <ChevronDown className="size-3.5 shrink-0 opacity-70" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-[min(20rem,calc(100vw-2rem))] p-0"
      >
        <div className="border-b border-border/60 p-2">
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => event.stopPropagation()}
              placeholder="Unternehmen suchen…"
              aria-label="Unternehmen suchen"
              className="h-10 w-full rounded-md border border-border/80 bg-background pr-3 pl-9 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              autoFocus
            />
          </div>
        </div>

        {selectedCompanies.length > 0 ? (
          <div className="space-y-1 border-b border-border/60 p-2">
            <div className="flex items-center justify-between gap-2 px-1">
              <p className="text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase">
                Ausgewählt
              </p>
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-[#5f6368] transition-colors hover:bg-black/[0.04] hover:text-[#1f1f1f] touch-manipulation"
              >
                <X className="size-3.5" aria-hidden />
                Alle
              </button>
            </div>
            <ul className="max-h-36 space-y-0.5 overflow-y-auto">
              {selectedCompanies.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    onClick={() => toggleCompany(option)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent touch-manipulation"
                  >
                    <span className="inline-flex size-4 shrink-0 items-center justify-center rounded border border-[#0b57d0] bg-[#0b57d0] text-white">
                      <Check className="size-3" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1 truncate">{option.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="p-2">
          {!query.trim() ? (
            <p className="px-2 py-3 text-xs text-muted-foreground">
              Tippe einen Namen, um Unternehmen zu suchen. Mehrere Treffer
              können markiert werden.
            </p>
          ) : loading ? (
            <div className="flex items-center gap-2 px-2 py-3 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              Suche…
            </div>
          ) : error ? (
            <p className="px-2 py-3 text-xs text-destructive">{error}</p>
          ) : visibleResults.length === 0 ? (
            <p className="px-2 py-3 text-xs text-muted-foreground">
              {results.length > 0
                ? "Alle Treffer sind bereits ausgewählt."
                : "Keine Unternehmen gefunden."}
            </p>
          ) : (
            <ul className="max-h-56 space-y-0.5 overflow-y-auto">
              {visibleResults.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    onClick={() => toggleCompany(option)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent touch-manipulation"
                  >
                    <span className="inline-flex size-4 shrink-0 rounded border border-border/80 bg-background" />
                    <span className="min-w-0 flex-1 truncate">{option.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
