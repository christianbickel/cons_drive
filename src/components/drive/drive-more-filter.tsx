"use client";

import { Check, ChevronDown, MoreHorizontal, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isMoreFilterActive } from "@/lib/drive/helpers";
import type {
  DriveFilterOption,
  DriveMoreFilters,
} from "@/lib/drive/types";
import { cn } from "@/lib/utils";

function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
}

function OptionList({
  options,
  selected,
  emptyLabel,
  onToggle,
}: {
  options: DriveFilterOption[];
  selected: string[];
  emptyLabel: string;
  onToggle: (id: string) => void;
}) {
  if (options.length === 0) {
    return (
      <p className="px-2 py-3 text-xs text-muted-foreground">{emptyLabel}</p>
    );
  }

  const selectedSet = new Set(selected);
  return (
    <ul className="max-h-56 space-y-0.5 overflow-y-auto p-1">
      {options.map((option) => {
        const active = selectedSet.has(option.id);
        return (
          <li key={option.id}>
            <button
              type="button"
              onClick={() => onToggle(option.id)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent touch-manipulation"
            >
              <span
                className={cn(
                  "inline-flex size-4 shrink-0 items-center justify-center rounded border",
                  active
                    ? "border-[#0b57d0] bg-[#0b57d0] text-white"
                    : "border-border/80 bg-background"
                )}
              >
                {active ? <Check className="size-3" aria-hidden /> : null}
              </span>
              <span className="min-w-0 flex-1 truncate">{option.name}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function DriveMoreFilter({
  more,
  statuses,
  creators,
  taskTypes,
  onChange,
}: {
  more: DriveMoreFilters;
  statuses: DriveFilterOption[];
  creators: DriveFilterOption[];
  taskTypes: DriveFilterOption[];
  onChange: (next: DriveMoreFilters) => void;
}) {
  const active = isMoreFilterActive(more);
  const activeCount =
    more.status.length + more.creator.length + more.taskType.length;
  const label = !active
    ? "Mehr…"
    : activeCount === 1
      ? "1 Filter"
      : `${activeCount} Filter`;

  function clearAll() {
    onChange({ status: [], creator: [], taskType: [] });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex min-h-10 w-auto max-w-full shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-[#e9eef6] px-3 text-sm text-[#1f1f1f] touch-manipulation sm:h-9 sm:min-h-0 sm:px-3.5",
          "outline-none transition-[background-color,box-shadow] duration-150 ease-[cubic-bezier(0.2,0,0,1)]",
          "hover:bg-[#e1e7f0] focus-visible:ring-3 focus-visible:ring-ring/50",
          "data-popup-open:bg-white data-popup-open:shadow-[0_1px_3px_0_rgba(60,64,67,0.3),0_4px_8px_3px_rgba(60,64,67,0.15)]",
          active && "bg-[#c2e7ff] hover:bg-[#a8daff]"
        )}
        aria-label="Weitere Filter"
        title="Status, Ersteller und Task-Typ — schaltet Quelle auf Tasks"
      >
        <MoreHorizontal className="size-4 shrink-0 opacity-80" aria-hidden />
        <span className="min-w-0 max-w-[10rem] truncate sm:max-w-[14rem]">
          {label}
        </span>
        <ChevronDown className="size-3.5 shrink-0 opacity-70" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        <p className="px-2 py-1.5 text-xs text-muted-foreground">
          Nur für Task-Dokumente
        </p>
        {active ? (
          <>
            <button
              type="button"
              onClick={clearAll}
              className="mx-1 mb-1 inline-flex w-[calc(100%-0.5rem)] items-center gap-1 rounded-md px-2 py-1.5 text-xs text-[#5f6368] transition-colors hover:bg-black/[0.04] hover:text-[#1f1f1f] touch-manipulation"
            >
              <X className="size-3.5" aria-hidden />
              Alle zurücksetzen
            </button>
            <DropdownMenuSeparator />
          </>
        ) : null}

        <DropdownMenuSub>
          <DropdownMenuSubTrigger
            className={cn(more.status.length > 0 && "font-medium")}
          >
            Status
            {more.status.length > 0 ? (
              <span className="ml-auto tabular-nums text-muted-foreground">
                {more.status.length}
              </span>
            ) : null}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="min-w-56 p-0">
            <OptionList
              options={statuses}
              selected={more.status}
              emptyLabel="Keine Task-Status verfügbar."
              onToggle={(id) =>
                onChange({ ...more, status: toggleId(more.status, id) })
              }
            />
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger
            className={cn(more.creator.length > 0 && "font-medium")}
          >
            Ersteller
            {more.creator.length > 0 ? (
              <span className="ml-auto tabular-nums text-muted-foreground">
                {more.creator.length}
              </span>
            ) : null}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="min-w-56 p-0">
            <OptionList
              options={creators}
              selected={more.creator}
              emptyLabel="Keine aktiven Benutzer gefunden."
              onToggle={(id) =>
                onChange({ ...more, creator: toggleId(more.creator, id) })
              }
            />
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger
            className={cn(more.taskType.length > 0 && "font-medium")}
          >
            Task-Typ
            {more.taskType.length > 0 ? (
              <span className="ml-auto tabular-nums text-muted-foreground">
                {more.taskType.length}
              </span>
            ) : null}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="min-w-56 p-0">
            <OptionList
              options={taskTypes}
              selected={more.taskType}
              emptyLabel="Keine aktiven Task-Typen gefunden."
              onToggle={(id) =>
                onChange({ ...more, taskType: toggleId(more.taskType, id) })
              }
            />
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
