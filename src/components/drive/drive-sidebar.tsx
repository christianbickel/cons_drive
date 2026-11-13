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
        "flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-left text-sm transition-colors duration-150 ease-[cubic-bezier(0.2,0,0,1)]",
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

export function DriveSidebar({
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
}: {
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
  total: number;
  userName?: string;
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
        origin,
        modified,
        scope: searchScope,
        view: viewMode,
      })
    );
  }

  return (
    <aside className="flex h-full w-[15.5rem] shrink-0 flex-col gap-6 overflow-y-auto border-r border-black/5 bg-[#f8f9fa] px-3 py-5">
      <div className="px-3">
        <div className="flex items-center gap-2 text-[1.05rem] font-medium tracking-tight text-[#1f1f1f]">
          <ListFilter className="size-5 text-[#1967d2]" aria-hidden />
          Consolidate Drive
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
          onClick={() => go({ groupBy: [] })}
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
                go({ groupBy: toggleDriveGroupField(groupBy, group.value) })
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
            onClick={() => go({ sortBy: sort.value })}
          >
            {sort.label}
          </SidebarButton>
        ))}
      </nav>

      <div className="mt-auto space-y-2 px-2 pb-2">
        {userName ? (
          <p className="truncate px-2 text-xs text-muted-foreground">
            {userName}
          </p>
        ) : null}
        <form action={logoutAction}>
          <Button
            type="submit"
            variant="ghost"
            className="w-full justify-start gap-2 rounded-full px-4"
          >
            <LogOut className="size-4" />
            Abmelden
          </Button>
        </form>
      </div>
    </aside>
  );
}
