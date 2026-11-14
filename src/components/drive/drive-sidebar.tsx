"use client";

import {
  ArrowDownAZ,
  ArrowDownWideNarrow,
  CalendarClock,
  CalendarPlus,
  FolderKanban,
  Layers,
  LayoutGrid,
  ListFilter,
  LogOut,
  UserRound,
  X,
} from "lucide-react";
import { logoutAction } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import {
  DRIVE_GROUP_FIELD_OPTIONS,
  drivePath,
  isModifiedFilterActive,
  toggleDriveGroupField,
} from "@/lib/drive/helpers";
import type {
  DriveCompanyFilter,
  DriveFileTypeFilter,
  DriveGroupBy,
  DriveGroupField,
  DriveModifiedFilter,
  DriveOriginFilter,
  DriveProjectFilter,
  DriveSearchScope,
  DriveSortBy,
  DriveViewMode,
} from "@/lib/drive/types";
import { cn } from "@/lib/utils";
import { useDriveNavigation } from "./drive-navigation";

const GROUP_ICONS: Record<DriveGroupField, typeof LayoutGrid> = {
  project: FolderKanban,
  responsible: UserRound,
  taskType: Layers,
};

const SORTS: Array<{
  value: DriveSortBy;
  label: string;
  icon: typeof CalendarPlus;
}> = [
  { value: "created", label: "Zuletzt erstellt", icon: CalendarPlus },
  { value: "modified", label: "Zuletzt geändert", icon: CalendarClock },
  { value: "name", label: "Name", icon: ArrowDownAZ },
  { value: "size", label: "Größe", icon: ArrowDownWideNarrow },
];

function SidebarButton({
  active,
  icon: Icon,
  onClick,
  children,
  badge,
}: {
  active: boolean;
  icon: typeof LayoutGrid;
  onClick: () => void;
  children: React.ReactNode;
  badge?: string;
}) {
  const { isPending } = useDriveNavigation();

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending && active}
      className={cn(
        "flex min-h-11 w-full items-center gap-3 rounded-full px-4 py-2.5 text-left text-sm transition-colors duration-150 ease-[cubic-bezier(0.2,0,0,1)] touch-manipulation",
        active
          ? "bg-[#c2e7ff] font-medium text-[#001d35]"
          : "text-foreground/80 hover:bg-black/[0.04]"
      )}
    >
      <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {badge ? (
        <span className="rounded-full bg-[#001d35]/10 px-1.5 py-0.5 text-[0.65rem] font-semibold tabular-nums text-[#001d35]">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function SidebarBody({
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
  total,
  userName,
  onNavigate,
  onClose,
}: {
  groupBy: DriveGroupBy;
  sortBy: DriveSortBy;
  fileType: DriveFileTypeFilter;
  project: DriveProjectFilter;
  companies: DriveCompanyFilter;
  origin: DriveOriginFilter;
  modified: DriveModifiedFilter;
  searchScope: DriveSearchScope;
  viewMode: DriveViewMode;
  pageSize: number;
  query: string;
  total: number;
  userName?: string;
  onNavigate: (next: { groupBy?: DriveGroupBy; sortBy?: DriveSortBy }) => void;
  onClose?: () => void;
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-2 px-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[1.05rem] font-medium tracking-tight text-[#1f1f1f]">
            <ListFilter className="size-5 shrink-0 text-[#1967d2]" aria-hidden />
            <span className="truncate">Consolidate Drive</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {total === 0
              ? query.trim() ||
                fileType !== "all" ||
                isModifiedFilterActive(modified)
                ? "Keine Treffer"
                : "Keine Dokumente"
              : `${total} Dokument${total === 1 ? "" : "e"}`}
          </p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-[#5f6368] transition-colors hover:bg-black/[0.05] touch-manipulation md:hidden"
            aria-label="Menü schließen"
          >
            <X className="size-5" />
          </button>
        ) : null}
      </div>

      <nav aria-label="Gruppierung" className="space-y-1">
        <p className="px-4 pb-1 text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase">
          Gruppieren
        </p>
        <p className="px-4 pb-2 text-[0.7rem] leading-snug text-muted-foreground">
          Mehrere Ebenen in Klickreihenfolge
        </p>
        <SidebarButton
          active={groupBy.length === 0}
          icon={LayoutGrid}
          onClick={() => onNavigate({ groupBy: [] })}
        >
          Keine Gruppierung
        </SidebarButton>
        {DRIVE_GROUP_FIELD_OPTIONS.map((group) => {
          const order = groupBy.indexOf(group.value);
          return (
            <SidebarButton
              key={group.value}
              active={order >= 0}
              icon={GROUP_ICONS[group.value]}
              badge={order >= 0 ? String(order + 1) : undefined}
              onClick={() =>
                onNavigate({
                  groupBy: toggleDriveGroupField(groupBy, group.value),
                })
              }
            >
              {group.label}
            </SidebarButton>
          );
        })}
      </nav>

      <nav aria-label="Sortierung" className="space-y-1">
        <p className="px-4 pb-1 text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase">
          Sortierung
        </p>
        {SORTS.map((sort) => (
          <SidebarButton
            key={sort.value}
            active={sortBy === sort.value}
            icon={sort.icon}
            onClick={() => onNavigate({ sortBy: sort.value })}
          >
            {sort.label}
          </SidebarButton>
        ))}
      </nav>

      <div className="mt-auto space-y-2 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {userName ? (
          <p className="truncate px-2 text-xs text-muted-foreground">
            {userName}
          </p>
        ) : null}
        <form action={logoutAction}>
          <Button
            type="submit"
            variant="ghost"
            className="min-h-11 w-full justify-start gap-2 rounded-full px-4 touch-manipulation"
          >
            <LogOut className="size-4" />
            Abmelden
          </Button>
        </form>
      </div>
    </>
  );
}

export function DriveSidebar({
  groupBy,
  sortBy,
  fileType,
  project,
  companies,
  origin,
  modified,
  searchScope,
  viewMode,
  pageSize,
  query,
  total,
  userName,
  mobileOpen = false,
  onMobileClose,
}: {
  groupBy: DriveGroupBy;
  sortBy: DriveSortBy;
  fileType: DriveFileTypeFilter;
  project: DriveProjectFilter;
  companies: DriveCompanyFilter;
  origin: DriveOriginFilter;
  modified: DriveModifiedFilter;
  searchScope: DriveSearchScope;
  viewMode: DriveViewMode;
  pageSize: number;
  query: string;
  total: number;
  userName?: string;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}) {
  const { navigate } = useDriveNavigation();

  function go(next: { groupBy?: DriveGroupBy; sortBy?: DriveSortBy }) {
    navigate(
      drivePath({
        groupBy: next.groupBy ?? groupBy,
        sortBy: next.sortBy ?? sortBy,
        page: 1,
        pageSize,
        q: query,
        type: fileType,
        project,
        companies,
        origin,
        modified,
        scope: searchScope,
        view: viewMode,
      })
    );
    onMobileClose?.();
  }

  const bodyProps = {
    groupBy,
    sortBy,
    fileType,
    project,
    companies,
    origin,
    modified,
    searchScope,
    viewMode,
    pageSize,
    query,
    total,
    userName,
    onNavigate: go,
  };

  return (
    <>
      <aside className="hidden h-full w-[15.5rem] shrink-0 flex-col gap-6 overflow-y-auto border-r border-black/5 bg-[#f8f9fa] px-3 py-5 md:flex">
        <SidebarBody {...bodyProps} />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button
            type="button"
            className="absolute inset-0 bg-black/40 touch-manipulation"
            aria-label="Menü schließen"
            onClick={onMobileClose}
          />
          <aside
            id="drive-mobile-nav"
            className="absolute inset-y-0 left-0 flex w-[min(18.5rem,92vw)] flex-col gap-6 overflow-y-auto bg-[#f8f9fa] px-3 pt-[max(1.25rem,env(safe-area-inset-top))] pb-5 shadow-[4px_0_24px_rgba(60,64,67,0.2)]"
          >
            <SidebarBody {...bodyProps} onClose={onMobileClose} />
          </aside>
        </div>
      ) : null}
    </>
  );
}
