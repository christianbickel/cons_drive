"use client";

import {
  CalendarDays,
  ChevronDown,
  File,
  FileAudio,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType2,
  FileVideo,
  Files,
  Layers2,
  Search,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DRIVE_FILE_TYPE_OPTIONS,
  DRIVE_MODIFIED_PRESET_OPTIONS,
  DRIVE_ORIGIN_OPTIONS,
  DRIVE_SEARCH_SCOPE_OPTIONS,
  drivePath,
  isModifiedFilterActive,
  isMoreFilterActive,
  isOriginFilterActive,
  modifiedPresetLabel,
  requiresTaskOnlyOrigin,
} from "@/lib/drive/helpers";
import type {
  DriveCompanyFilter,
  DriveCompanyOption,
  DriveFileTypeFilter,
  DriveFilterOption,
  DriveGroupBy,
  DriveModifiedFilter,
  DriveModifiedPreset,
  DriveMoreFilters,
  DriveOriginFilter,
  DrivePlace,
  DriveProjectFilter,
  DriveProjectOption,
  DriveSearchScope,
  DriveSortBy,
  DriveViewMode,
} from "@/lib/drive/types";
import { cn } from "@/lib/utils";
import { DriveCompanyFilter as CompanyFilterControl } from "./drive-company-filter";
import { formatIsoDateOnly } from "./format";
import { DriveMoreFilter } from "./drive-more-filter";
import { DriveProjectFilterControl } from "./drive-project-filter";
import { useDriveNavigation } from "./drive-navigation";

function fileTypeMenuIcon(type: DriveFileTypeFilter) {
  const className = "size-5 shrink-0";
  switch (type) {
    case "Pdf":
      return <FileText className={cn(className, "text-[#ea4335]")} />;
    case "Office":
      return <FileSpreadsheet className={cn(className, "text-[#34a853]")} />;
    case "Image":
      return <FileImage className={cn(className, "text-[#ea4335]")} />;
    case "Video":
      return <FileVideo className={cn(className, "text-[#a142f4]")} />;
    case "Audio":
      return <FileAudio className={cn(className, "text-[#ea4335]")} />;
    case "Text":
      return <FileText className={cn(className, "text-[#4285f4]")} />;
    case "Other":
      return <File className={cn(className, "text-[#5f6368]")} />;
    default:
      return <Files className={cn(className, "text-[#5f6368]")} />;
  }
}

const DEBOUNCE_MS = 300;

const pillClassName = cn(
  "inline-flex min-h-10 w-auto max-w-full shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-[#e9eef6] px-3 text-sm text-[#1f1f1f] touch-manipulation sm:h-9 sm:min-h-0 sm:px-3.5",
  "outline-none transition-[background-color,box-shadow] duration-150 ease-[cubic-bezier(0.2,0,0,1)]",
  "hover:bg-[#e1e7f0] focus-visible:ring-3 focus-visible:ring-ring/50",
  "data-popup-open:bg-white data-popup-open:shadow-[0_1px_3px_0_rgba(60,64,67,0.3),0_4px_8px_3px_rgba(60,64,67,0.15)]"
);

function FilterPill({
  active,
  icon: Icon,
  label,
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuTrigger> & {
  active?: boolean;
  icon: typeof CalendarDays;
  label: string;
}) {
  return (
    <DropdownMenuTrigger
      className={cn(
        pillClassName,
        active && "bg-[#c2e7ff] hover:bg-[#a8daff]",
        className
      )}
      {...props}
    >
      <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
      <span className="min-w-0 max-w-[10rem] truncate sm:max-w-[14rem]">
        {label}
      </span>
      <ChevronDown className="size-3.5 shrink-0 opacity-70" aria-hidden />
    </DropdownMenuTrigger>
  );
}

function moreFiltersEqual(a: DriveMoreFilters, b: DriveMoreFilters): boolean {
  const same = (left: string[], right: string[]) =>
    left.length === right.length && left.every((id) => right.includes(id));
  return (
    same(a.status, b.status) &&
    same(a.creator, b.creator) &&
    same(a.taskType, b.taskType)
  );
}

export function DriveSearchField({
  groupBy,
  sortBy,
  fileType,
  project,
  selectedProjects,
  companies,
  selectedCompanies,
  place,
  more,
  moreOptions,
  origin,
  recentProjects,
  modified,
  searchScope,
  viewMode,
  pageSize,
  query,
  className,
}: {
  groupBy: DriveGroupBy;
  sortBy: DriveSortBy;
  fileType: DriveFileTypeFilter;
  project: DriveProjectFilter;
  selectedProjects: DriveProjectOption[];
  companies: DriveCompanyFilter;
  selectedCompanies: DriveCompanyOption[];
  place: DrivePlace;
  more: DriveMoreFilters;
  moreOptions: {
    statuses: DriveFilterOption[];
    creators: DriveFilterOption[];
    taskTypes: DriveFilterOption[];
  };
  origin: DriveOriginFilter;
  recentProjects: DriveProjectOption[];
  modified: DriveModifiedFilter;
  searchScope: DriveSearchScope;
  viewMode: DriveViewMode;
  pageSize: number;
  query: string;
  className?: string;
}) {
  const { navigate: navigateTo, setSearchPending } = useDriveNavigation();
  const [value, setValue] = useState(query);
  const [selectedFileType, setSelectedFileType] = useState(fileType);
  const [selectedProjectOptions, setSelectedProjectOptions] =
    useState(selectedProjects);
  const [selectedProjectIds, setSelectedProjectIds] = useState(project);
  const [selectedCompanyOptions, setSelectedCompanyOptions] =
    useState(selectedCompanies);
  const [selectedCompaniesIds, setSelectedCompaniesIds] = useState(companies);
  const [selectedMore, setSelectedMore] = useState(more);
  const [selectedOrigin, setSelectedOrigin] = useState(origin);
  const [selectedModified, setSelectedModified] = useState(modified);
  const [selectedScope, setSelectedScope] = useState(searchScope);
  const [customFrom, setCustomFrom] = useState(modified.from ?? "");
  const [customTo, setCustomTo] = useState(modified.to ?? "");
  const debounceRef = useRef<number | null>(null);
  const queryRef = useRef(query);
  const pathOptionsRef = useRef({
    groupBy,
    sortBy,
    pageSize,
    fileType: selectedFileType,
    project: selectedProjectIds,
    companies: selectedCompaniesIds,
    place,
    more: selectedMore,
    origin: selectedOrigin,
    modified: selectedModified,
    searchScope: selectedScope,
    viewMode,
  });

  queryRef.current = query;
  pathOptionsRef.current = {
    groupBy,
    sortBy,
    pageSize,
    fileType: selectedFileType,
    project: selectedProjectIds,
    companies: selectedCompaniesIds,
    place,
    more: selectedMore,
    origin: selectedOrigin,
    modified: selectedModified,
    searchScope: selectedScope,
    viewMode,
  };

  useEffect(() => {
    // Don't overwrite while the user is still typing (debounce active).
    if (debounceRef.current !== null) return;
    setValue(query);
  }, [query]);

  useEffect(() => {
    setSelectedFileType(fileType);
  }, [fileType]);

  useEffect(() => {
    setSelectedProjectIds(project);
    setSelectedProjectOptions(selectedProjects);
  }, [project, selectedProjects]);

  useEffect(() => {
    setSelectedCompaniesIds(companies);
    setSelectedCompanyOptions(selectedCompanies);
  }, [companies, selectedCompanies]);

  useEffect(() => {
    setSelectedMore(more);
  }, [more]);

  useEffect(() => {
    setSelectedOrigin(origin);
  }, [origin]);

  useEffect(() => {
    setSelectedModified(modified);
    setCustomFrom(modified.from ?? "");
    setCustomTo(modified.to ?? "");
  }, [modified]);

  useEffect(() => {
    setSelectedScope(searchScope);
  }, [searchScope]);

  // Clear loading once URL/server props match the optimistic UI
  // (covers filter-only changes where `query` stays the same).
  useEffect(() => {
    if (debounceRef.current !== null) return;
    const projectsSynced =
      project.length === selectedProjectIds.length &&
      project.every((id) => selectedProjectIds.includes(id));
    const companiesSynced =
      companies.length === selectedCompaniesIds.length &&
      companies.every((id) => selectedCompaniesIds.includes(id));
    const moreSynced = moreFiltersEqual(more, selectedMore);
    const filtersSynced =
      fileType === selectedFileType &&
      projectsSynced &&
      companiesSynced &&
      moreSynced &&
      origin === selectedOrigin &&
      searchScope === selectedScope &&
      modified.preset === selectedModified.preset &&
      (modified.from ?? "") === (selectedModified.from ?? "") &&
      (modified.to ?? "") === (selectedModified.to ?? "") &&
      value.trim() === query.trim();
    if (filtersSynced) {
      setSearchPending(false);
    }
  }, [
    fileType,
    project,
    companies,
    more,
    origin,
    searchScope,
    modified,
    selectedFileType,
    selectedProjectIds,
    selectedCompaniesIds,
    selectedMore,
    selectedOrigin,
    selectedScope,
    selectedModified,
    value,
    query,
    setSearchPending,
  ]);

  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      setSearchPending(false);
    };
  }, [setSearchPending]);

  function clearDebounce() {
    if (debounceRef.current === null) return;
    window.clearTimeout(debounceRef.current);
    debounceRef.current = null;
  }

  function scheduleSearch(nextValue: string) {
    clearDebounce();
    const trimmed = nextValue.trim();
    const committed = queryRef.current.trim();
    if (trimmed === committed) {
      setSearchPending(false);
      return;
    }

    setSearchPending(true);
    debounceRef.current = window.setTimeout(() => {
      debounceRef.current = null;
      const options = pathOptionsRef.current;
      // Hand off to route transition pending.
      setSearchPending(false);
      navigateTo(
        drivePath({
          groupBy: options.groupBy,
          sortBy: options.sortBy,
          page: 1,
          pageSize: options.pageSize,
          q: nextValue,
          type: options.fileType,
          project: options.project,
          companies: options.companies,
          place: options.place,
          more: options.more,
          origin: options.origin,
          modified: options.modified,
          scope: options.searchScope,
          view: options.viewMode,
        }),
        { replace: true }
      );
    }, DEBOUNCE_MS);
  }

  function onSearchChange(nextValue: string) {
    setValue(nextValue);
    scheduleSearch(nextValue);
  }

  function navigate(next: {
    q?: string;
    type?: DriveFileTypeFilter;
    project?: DriveProjectOption[];
    companies?: DriveCompanyOption[];
    more?: DriveMoreFilters;
    origin?: DriveOriginFilter;
    modified?: DriveModifiedFilter;
    scope?: DriveSearchScope;
  }) {
    clearDebounce();
    const nextType = next.type ?? selectedFileType;
    const nextProjectOptions = next.project ?? selectedProjectOptions;
    const nextProjects = nextProjectOptions.map((option) => option.id);
    const nextCompanyOptions = next.companies ?? selectedCompanyOptions;
    const nextCompanies = nextCompanyOptions.map((option) => option.id);
    const nextMore = next.more ?? selectedMore;
    const nextModified = next.modified ?? selectedModified;
    const nextScope = next.scope ?? selectedScope;
    const originLocked = requiresTaskOnlyOrigin(
      nextProjects,
      groupBy,
      nextMore
    );
    const nextOrigin = originLocked
      ? "task"
      : (next.origin ?? selectedOrigin);

    // Update dropdown UI immediately, then start navigation/search.
    if (next.type !== undefined) setSelectedFileType(next.type);
    if (next.project !== undefined) {
      setSelectedProjectOptions(next.project);
      setSelectedProjectIds(nextProjects);
    }
    if (next.companies !== undefined) {
      setSelectedCompanyOptions(next.companies);
      setSelectedCompaniesIds(nextCompanies);
    }
    if (next.more !== undefined) setSelectedMore(next.more);
    setSelectedOrigin(nextOrigin);
    if (next.modified !== undefined) setSelectedModified(next.modified);
    if (next.scope !== undefined) setSelectedScope(next.scope);

    // Route transition owns the loading state from here.
    setSearchPending(false);
    navigateTo(
      drivePath({
        groupBy,
        sortBy,
        page: 1,
        pageSize,
        q: next.q ?? value,
        type: nextType,
        project: nextProjects,
        companies: nextCompanies,
        place,
        more: nextMore,
        origin: nextOrigin,
        modified: nextModified,
        scope: nextScope,
        view: viewMode,
      }),
      { replace: true }
    );
  }

  function selectModified(preset: DriveModifiedPreset) {
    if (preset === "all") {
      navigate({ modified: { preset: "all" } });
      return;
    }
    if (preset === "custom") return;
    navigate({ modified: { preset } });
  }

  function applyCustomRange() {
    if (!customFrom && !customTo) return;
    navigate({
      modified: {
        preset: "custom",
        from: customFrom || undefined,
        to: customTo || undefined,
      },
    });
  }

  const modifiedActive = isModifiedFilterActive(selectedModified);
  const modifiedLabel = modifiedActive
    ? selectedModified.preset === "custom"
      ? [selectedModified.from, selectedModified.to]
          .filter(Boolean)
          .map((value) => formatIsoDateOnly(value))
          .join(" – ") || "Benutzerdefinierter Zeitraum"
      : modifiedPresetLabel(selectedModified.preset)
    : "Geändert";

  const fileTypeLabel =
    DRIVE_FILE_TYPE_OPTIONS.find((option) => option.value === selectedFileType)
      ?.label ?? "Typ";

  const originLocked = requiresTaskOnlyOrigin(
    selectedProjectIds,
    groupBy,
    selectedMore
  );
  const effectiveOrigin = originLocked ? "task" : selectedOrigin;
  const originActive = isOriginFilterActive(effectiveOrigin);
  const originLabel = originActive
    ? DRIVE_ORIGIN_OPTIONS.find((option) => option.value === effectiveOrigin)
        ?.label ?? "Quelle"
    : "Quelle";
  const moreLockedHint = isMoreFilterActive(selectedMore)
    ? "Bei Status-, Ersteller- oder Task-Typ-Filter nur Tasks"
    : undefined;

  return (
    <div className={cn("mx-auto w-full space-y-3", className)}>
      <div
        className="mx-auto flex w-full max-w-2xl flex-col gap-2 rounded-2xl bg-[#e9eef6] p-2 transition-[background-color,box-shadow] duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-[#e1e7f0] focus-within:bg-white focus-within:shadow-[0_1px_3px_0_rgba(60,64,67,0.3),0_4px_8px_3px_rgba(60,64,67,0.15)] sm:h-12 sm:flex-row sm:items-center sm:gap-2 sm:rounded-full sm:p-0 sm:pr-2 sm:pl-4"
        role="search"
      >
        <div className="relative min-w-0 flex-1 px-2 sm:px-0">
          <Search
            className="pointer-events-none absolute top-1/2 left-2 size-5 -translate-y-1/2 text-[#5f6368] sm:left-0"
            aria-hidden
          />
          <input
            type="search"
            value={value}
            onChange={(event) => onSearchChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              clearDebounce();
              setSearchPending(false);
              navigate({ q: value });
            }}
            placeholder={
              selectedScope === "fulltext"
                ? "Volltextsuche…"
                : "Dateiname suchen…"
            }
            aria-label={
              selectedScope === "fulltext"
                ? "Volltextsuche, mehrere Begriffe als UND"
                : "Nach Dateiname filtern, mehrere Begriffe als UND"
            }
            className="h-11 w-full border-0 bg-transparent pr-1 pl-8 text-base text-[#1f1f1f] outline-none placeholder:text-[#5f6368] sm:h-10 sm:text-[0.95rem]"
            autoComplete="off"
            enterKeyHint="search"
          />
        </div>

        <div
          role="group"
          aria-label="Suchmodus"
          className="flex w-full shrink-0 items-center rounded-full bg-black/[0.06] p-0.5 sm:w-auto"
        >
          {DRIVE_SEARCH_SCOPE_OPTIONS.map((option) => {
            const active = selectedScope === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                title={option.description}
                onClick={() => {
                  if (option.value === selectedScope) return;
                  navigate({ scope: option.value });
                }}
                className={cn(
                  "min-h-10 flex-1 rounded-full px-2.5 py-1.5 text-[0.7rem] font-medium whitespace-nowrap transition-colors duration-150 touch-manipulation sm:min-h-0 sm:flex-none",
                  active
                    ? "bg-white text-[#001d35] shadow-[0_1px_2px_0_rgba(60,64,67,0.25)]"
                    : "text-[#5f6368] hover:text-[#1f1f1f]"
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex w-full flex-wrap items-center justify-center gap-2">
        <DropdownMenu>
          <FilterPill
            active={modifiedActive}
            icon={CalendarDays}
            label={modifiedLabel}
            aria-label="Nach Änderungsdatum filtern"
          />
          <DropdownMenuContent align="start" className="min-w-56">
            <DropdownMenuItem
              onClick={() => selectModified("all")}
              className={cn(!modifiedActive && "font-medium")}
            >
              Beliebiger Zeitpunkt
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {DRIVE_MODIFIED_PRESET_OPTIONS.map((preset) => (
              <DropdownMenuItem
                key={preset}
                onClick={() => selectModified(preset)}
                className={cn(
                  selectedModified.preset === preset && "font-medium"
                )}
              >
                {modifiedPresetLabel(preset)}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger
                className={cn(
                  selectedModified.preset === "custom" && "font-medium"
                )}
              >
                Benutzerdefinierter Zeitraum
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="min-w-64 p-3">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="modified-from"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Von
                    </label>
                    <input
                      id="modified-from"
                      type="date"
                      value={customFrom}
                      onChange={(event) => setCustomFrom(event.target.value)}
                      className="h-9 w-full rounded-md border border-border/80 bg-background px-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="modified-to"
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Bis
                    </label>
                    <input
                      id="modified-to"
                      type="date"
                      value={customTo}
                      onChange={(event) => setCustomTo(event.target.value)}
                      className="h-9 w-full rounded-md border border-border/80 bg-background px-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={applyCustomRange}
                    disabled={!customFrom && !customTo}
                    className="h-9 w-full rounded-full bg-[#0b57d0] text-sm font-medium text-white transition-opacity disabled:opacity-40"
                  >
                    Anwenden
                  </button>
                </div>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <FilterPill
            active={selectedFileType !== "all"}
            icon={FileType2}
            label={selectedFileType === "all" ? "Typ" : fileTypeLabel}
            aria-label="Nach Dateityp filtern"
          />
          <DropdownMenuContent align="start" className="min-w-56 p-2">
            {DRIVE_FILE_TYPE_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => navigate({ type: option.value })}
                className={cn(
                  "gap-3 rounded-lg px-2 py-2",
                  selectedFileType === option.value && "bg-[#e8f0fe] font-medium"
                )}
              >
                {fileTypeMenuIcon(option.value)}
                <span>{option.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DriveProjectFilterControl
          projects={selectedProjectIds}
          selectedProjects={selectedProjectOptions}
          recentProjects={recentProjects}
          onChange={(next) => navigate({ project: next })}
        />

        <CompanyFilterControl
          companies={selectedCompaniesIds}
          selectedCompanies={selectedCompanyOptions}
          onChange={(next) => navigate({ companies: next })}
        />

        <DropdownMenu>
          <FilterPill
            active={originActive}
            icon={Layers2}
            label={originLabel}
            aria-label="Nach Quelle filtern"
            title={
              originLocked
                ? moreLockedHint ??
                  "Bei Projektfilter oder Gruppierung nur Tasks"
                : undefined
            }
          />
          <DropdownMenuContent align="start" className="min-w-56">
            {originLocked ? (
              <p className="px-2 py-1.5 text-xs text-muted-foreground">
                Bei Projekt-, Mehr-Filter oder Gruppierung sind nur
                Task-Dokumente verfügbar.
              </p>
            ) : null}
            {DRIVE_ORIGIN_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                disabled={originLocked && option.value !== "task"}
                onClick={() => navigate({ origin: option.value })}
                className={cn(
                  effectiveOrigin === option.value && "font-medium"
                )}
              >
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DriveMoreFilter
          more={selectedMore}
          statuses={moreOptions.statuses}
          creators={moreOptions.creators}
          taskTypes={moreOptions.taskTypes}
          onChange={(next) => navigate({ more: next })}
        />
      </div>
    </div>
  );
}
