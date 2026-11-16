"use client";

import { ArrowDownWideNarrow, Check, Layers } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import {
  DRIVE_GROUP_FIELD_OPTIONS,
  DRIVE_SORT_OPTIONS,
  drivePath,
  toggleDriveGroupField,
} from "@/lib/drive/helpers";
import type {
  DriveCompanyFilter,
  DriveFileTypeFilter,
  DriveGroupBy,
  DriveGroupField,
  DriveModifiedFilter,
  DriveMoreFilters,
  DriveOriginFilter,
  DrivePlace,
  DriveProjectFilter,
  DriveSearchScope,
  DriveSortBy,
  DriveViewMode,
} from "@/lib/drive/types";
import { cn } from "@/lib/utils";
import { useDriveNavigation } from "./drive-navigation";
import { DriveViewToggle } from "./drive-view-toggle";

const pillClassName = cn(
  "inline-flex min-h-10 w-auto max-w-full shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-white px-3 text-sm text-[#1f1f1f] shadow-[0_1px_2px_0_rgba(60,64,67,0.15)] touch-manipulation sm:h-9 sm:min-h-0 sm:px-3.5",
  "outline-none transition-[background-color,box-shadow] duration-150 ease-[cubic-bezier(0.2,0,0,1)]",
  "hover:bg-[#f1f3f4] focus-visible:ring-3 focus-visible:ring-ring/50"
);

const menuClassName = cn(
  "absolute top-[calc(100%+0.35rem)] right-0 z-50 min-w-52 overflow-hidden rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
);

const itemClassName = cn(
  "flex w-full cursor-default items-center gap-1.5 rounded-md px-1.5 py-1.5 text-left text-sm outline-none select-none",
  "hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground"
);

function useDismissibleMenu(open: boolean, setOpen: (open: boolean) => void) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, setOpen]);

  return rootRef;
}

export function DriveListControls({
  groupBy,
  sortBy,
  fileType,
  project,
  companies,
  place,
  more,
  origin,
  modified,
  searchScope,
  viewMode,
  pageSize,
  query,
}: {
  groupBy: DriveGroupBy;
  sortBy: DriveSortBy;
  fileType: DriveFileTypeFilter;
  project: DriveProjectFilter;
  companies: DriveCompanyFilter;
  place: DrivePlace;
  more: DriveMoreFilters;
  origin: DriveOriginFilter;
  modified: DriveModifiedFilter;
  searchScope: DriveSearchScope;
  viewMode: DriveViewMode;
  pageSize: number;
  query: string;
}) {
  const { navigate } = useDriveNavigation();
  const [groupOpen, setGroupOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const groupMenuId = useId();
  const sortMenuId = useId();
  const groupRootRef = useDismissibleMenu(groupOpen, setGroupOpen);
  const sortRootRef = useDismissibleMenu(sortOpen, setSortOpen);

  function path(next?: { groupBy?: DriveGroupBy; sortBy?: DriveSortBy }) {
    return drivePath({
      groupBy: next?.groupBy ?? groupBy,
      sortBy: next?.sortBy ?? sortBy,
      page: 1,
      pageSize,
      q: query,
      type: fileType,
      project,
      companies,
      place,
      more,
      origin,
      modified,
      scope: searchScope,
      view: viewMode,
    });
  }

  function applyGroupBy(next: DriveGroupBy) {
    setGroupOpen(false);
    navigate(path({ groupBy: next }));
  }

  function applySortBy(next: DriveSortBy) {
    setSortOpen(false);
    navigate(path({ sortBy: next }));
  }

  function toggleGroupField(field: DriveGroupField) {
    applyGroupBy(toggleDriveGroupField(groupBy, field));
  }

  const sortLabel =
    DRIVE_SORT_OPTIONS.find((option) => option.value === sortBy)?.label ??
    "Sortierung";
  const groupLabel =
    groupBy.length === 0
      ? "Gruppierung"
      : groupBy
          .map(
            (field) =>
              DRIVE_GROUP_FIELD_OPTIONS.find((option) => option.value === field)
                ?.label ?? field
          )
          .join(" › ");

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <div ref={groupRootRef} className="relative">
        <button
          type="button"
          className={cn(
            pillClassName,
            groupBy.length > 0 && "bg-[#c2e7ff] hover:bg-[#a8daff]",
            groupOpen &&
              "bg-white shadow-[0_1px_3px_0_rgba(60,64,67,0.3),0_4px_8px_3px_rgba(60,64,67,0.15)]"
          )}
          aria-label="Gruppierung wählen"
          aria-haspopup="menu"
          aria-expanded={groupOpen}
          aria-controls={groupOpen ? groupMenuId : undefined}
          onClick={() => {
            setSortOpen(false);
            setGroupOpen((open) => !open);
          }}
        >
          <Layers className="size-4 shrink-0 opacity-80" aria-hidden />
          <span className="min-w-0 max-w-[12rem] truncate">{groupLabel}</span>
        </button>
        {groupOpen ? (
          <div
            id={groupMenuId}
            role="menu"
            aria-label="Gruppierung"
            className={cn(menuClassName, "min-w-56")}
          >
            <button
              type="button"
              role="menuitem"
              className={cn(
                itemClassName,
                groupBy.length === 0 && "font-medium"
              )}
              onClick={() => applyGroupBy([])}
            >
              Keine Gruppierung
            </button>
            <div className="-mx-1 my-1 h-px bg-border" role="separator" />
            {DRIVE_GROUP_FIELD_OPTIONS.map((group) => {
              const order = groupBy.indexOf(group.value);
              return (
                <button
                  key={group.value}
                  type="button"
                  role="menuitem"
                  className={cn(itemClassName, order >= 0 && "font-medium")}
                  onClick={() => toggleGroupField(group.value)}
                >
                  <span className="min-w-0 flex-1 truncate">{group.label}</span>
                  {order >= 0 ? (
                    <span className="ml-2 rounded-full bg-[#001d35]/10 px-1.5 py-0.5 text-[0.65rem] font-semibold tabular-nums text-[#001d35]">
                      {order + 1}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div ref={sortRootRef} className="relative">
        <button
          type="button"
          className={cn(
            pillClassName,
            sortOpen &&
              "bg-white shadow-[0_1px_3px_0_rgba(60,64,67,0.3),0_4px_8px_3px_rgba(60,64,67,0.15)]"
          )}
          aria-label="Sortierung wählen"
          aria-haspopup="menu"
          aria-expanded={sortOpen}
          aria-controls={sortOpen ? sortMenuId : undefined}
          onClick={() => {
            setGroupOpen(false);
            setSortOpen((open) => !open);
          }}
        >
          <ArrowDownWideNarrow
            className="size-4 shrink-0 opacity-80"
            aria-hidden
          />
          <span className="min-w-0 max-w-[12rem] truncate">{sortLabel}</span>
        </button>
        {sortOpen ? (
          <div
            id={sortMenuId}
            role="menu"
            aria-label="Sortierung"
            className={menuClassName}
          >
            {DRIVE_SORT_OPTIONS.map((option) => {
              const selected = option.value === sortBy;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="menuitem"
                  className={cn(itemClassName, selected && "font-medium")}
                  onClick={() => applySortBy(option.value)}
                >
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  {selected ? (
                    <Check className="size-4 shrink-0 opacity-80" aria-hidden />
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <DriveViewToggle
        viewMode={viewMode}
        groupBy={groupBy}
        sortBy={sortBy}
        fileType={fileType}
        project={project}
        companies={companies}
        place={place}
        more={more}
        origin={origin}
        modified={modified}
        searchScope={searchScope}
        pageSize={pageSize}
        query={query}
      />
    </div>
  );
}
