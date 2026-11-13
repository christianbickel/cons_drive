"use client";

import { drivePath } from "@/lib/drive/helpers";
import type {
  DriveFileTypeFilter,
  DriveGroupBy,
  DriveModifiedFilter,
  DriveOriginFilter,
  DriveProjectFilter,
  DriveSearchScope,
  DriveSortBy,
  DriveViewMode,
} from "@/lib/drive/types";
import { cn } from "@/lib/utils";
import { useDriveNavigation } from "./drive-navigation";

export function DrivePagination({
  page,
  totalPages,
  groupBy,
  sortBy,
  fileType,
  project,
  origin,
  modified,
  searchScope,
  viewMode,
  pageSize,
  query,
}: {
  page: number;
  totalPages: number;
  groupBy: DriveGroupBy;
  sortBy: DriveSortBy;
  fileType: DriveFileTypeFilter;
  project: DriveProjectFilter;
  origin: DriveOriginFilter;
  modified: DriveModifiedFilter;
  searchScope: DriveSearchScope;
  viewMode: DriveViewMode;
  pageSize: number;
  query: string;
}) {
  const { navigate, isPending } = useDriveNavigation();

  if (totalPages <= 1) return null;

  const hrefFor = (p: number) =>
    drivePath({
      groupBy,
      sortBy,
      page: p,
      pageSize,
      q: query,
      type: fileType,
      project,
      origin,
      modified,
      scope: searchScope,
      view: viewMode,
    });

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2
  );

  const withEllipsis: Array<number | "…"> = [];
  for (let i = 0; i < pages.length; i++) {
    const current = pages[i]!;
    const prev = pages[i - 1];
    if (prev && current - prev > 1) withEllipsis.push("…");
    withEllipsis.push(current);
  }

  function PageButton({
    target,
    children,
    disabled,
    current,
    label,
  }: {
    target: number;
    children: React.ReactNode;
    disabled?: boolean;
    current?: boolean;
    label?: string;
  }) {
    return (
      <button
        type="button"
        disabled={disabled || isPending}
        onClick={() => navigate(hrefFor(target))}
        aria-label={label}
        aria-current={current ? "page" : undefined}
        className={cn(
          "min-h-10 rounded-md px-3 py-2 text-sm transition-colors duration-150 ease-[cubic-bezier(0.2,0,0,1)] touch-manipulation sm:min-h-0 sm:px-2.5 sm:py-1.5",
          current
            ? "min-w-10 bg-foreground text-center text-background tabular-nums sm:min-w-9"
            : "border border-border/80 hover:bg-muted",
          !current && "min-w-10 text-center tabular-nums sm:min-w-9",
          disabled && "pointer-events-none opacity-40"
        )}
      >
        {children}
      </button>
    );
  }

  return (
    <nav
      aria-label="Seiten"
      className="flex flex-wrap items-center justify-center gap-1.5 pt-2"
    >
      <PageButton
        target={Math.max(1, page - 1)}
        disabled={page <= 1}
        label="Zurück"
      >
        <span className="sm:hidden">‹</span>
        <span className="hidden sm:inline">Zurück</span>
      </PageButton>
      {withEllipsis.map((item, index) =>
        item === "…" ? (
          <span
            key={`e-${index}`}
            className="px-1 text-sm text-muted-foreground"
          >
            …
          </span>
        ) : (
          <PageButton key={item} target={item} current={item === page}>
            {item}
          </PageButton>
        )
      )}
      <PageButton
        target={Math.min(totalPages, page + 1)}
        disabled={page >= totalPages}
        label="Weiter"
      >
        <span className="sm:hidden">›</span>
        <span className="hidden sm:inline">Weiter</span>
      </PageButton>
    </nav>
  );
}
