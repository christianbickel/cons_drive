"use client";

import { Check, LayoutGrid, List } from "lucide-react";
import { drivePath } from "@/lib/drive/helpers";
import type {
  DriveCompanyFilter,
  DriveFileTypeFilter,
  DriveGroupBy,
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

export function DriveViewToggle({
  viewMode,
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
  pageSize,
  query,
}: {
  viewMode: DriveViewMode;
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
  pageSize: number;
  query: string;
}) {
  const { navigate, isPending } = useDriveNavigation();

  function setView(view: DriveViewMode) {
    if (view === viewMode) return;
    navigate(
      drivePath({
        groupBy,
        sortBy,
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
        view,
      })
    );
  }

  return (
    <div
      role="group"
      aria-label="Ansicht"
      className="inline-flex rounded-full border border-black/8 bg-white p-0.5 shadow-[0_1px_2px_0_rgba(60,64,67,0.15)]"
    >
      <button
        type="button"
        disabled={isPending}
        onClick={() => setView("list")}
        aria-pressed={viewMode === "list"}
        aria-label="Listenansicht"
        className={cn(
          "inline-flex size-10 items-center justify-center rounded-full transition-colors touch-manipulation sm:size-8",
          viewMode === "list"
            ? "bg-[#c2e7ff] text-[#001d35]"
            : "text-[#5f6368] hover:bg-black/[0.04]"
        )}
      >
        {viewMode === "list" ? (
          <Check className="size-3.5" aria-hidden />
        ) : (
          <List className="size-4" aria-hidden />
        )}
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => setView("thumbs")}
        aria-pressed={viewMode === "thumbs"}
        aria-label="Kachelansicht"
        className={cn(
          "inline-flex size-10 items-center justify-center rounded-full transition-colors touch-manipulation sm:size-8",
          viewMode === "thumbs"
            ? "bg-[#c2e7ff] text-[#001d35]"
            : "text-[#5f6368] hover:bg-black/[0.04]"
        )}
      >
        {viewMode === "thumbs" ? (
          <Check className="size-3.5" aria-hidden />
        ) : (
          <LayoutGrid className="size-4" aria-hidden />
        )}
      </button>
    </div>
  );
}
