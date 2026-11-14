"use client";

import { Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { groupDriveDocuments } from "@/lib/drive/helpers";
import type {
  DriveCompanyFilter,
  DriveCompanyOption,
  DriveDocument,
  DriveFileTypeFilter,
  DriveGroupBy,
  DriveModifiedFilter,
  DriveOriginFilter,
  DriveProjectFilter,
  DriveProjectOption,
  DriveSearchScope,
  DriveSortBy,
  DriveViewMode,
} from "@/lib/drive/types";
import { cn } from "@/lib/utils";
import { DriveGroupAccordion } from "./drive-group-accordion";
import {
  DriveLoadingBar,
  DriveLoadingOverlay,
} from "./drive-loading-overlay";
import { DriveNavigationProvider, useDriveNavigation } from "./drive-navigation";
import { DrivePagination } from "./drive-pagination";
import { DriveSearchField } from "./drive-search-field";
import { DriveSidebar } from "./drive-sidebar";
import { DriveViewToggle } from "./drive-view-toggle";

function DriveViewContent({
  documents,
  total,
  recentProjects,
  selectedProjects,
  selectedCompanies,
  groupBy,
  sortBy,
  page,
  pageSize,
  query,
  fileType,
  project,
  companies,
  origin,
  modified,
  searchScope,
  viewMode,
  truncated,
  suggested,
  userName,
}: {
  documents: DriveDocument[];
  total: number;
  recentProjects: DriveProjectOption[];
  selectedProjects: DriveProjectOption[];
  selectedCompanies: DriveCompanyOption[];
  groupBy: DriveGroupBy;
  sortBy: DriveSortBy;
  page: number;
  pageSize: number;
  query: string;
  fileType: DriveFileTypeFilter;
  project: DriveProjectFilter;
  companies: DriveCompanyFilter;
  origin: DriveOriginFilter;
  modified: DriveModifiedFilter;
  searchScope: DriveSearchScope;
  viewMode: DriveViewMode;
  truncated?: boolean;
  suggested?: boolean;
  userName?: string;
}) {
  const { isPending } = useDriveNavigation();
  const [menuOpen, setMenuOpen] = useState(false);
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const groups = suggested
    ? [
        {
          key: "suggested",
          label: "Vorgeschlagene Dokumente",
          documents,
        },
      ]
    : groupDriveDocuments(documents, groupBy);

  useEffect(() => {
    if (!menuOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    function onChange(event: MediaQueryListEvent) {
      if (event.matches) setMenuOpen(false);
    }
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-1 bg-[#f8f9fa]">
      <DriveLoadingBar active={isPending} />
      <DriveSidebar
        groupBy={groupBy}
        sortBy={sortBy}
        fileType={fileType}
        project={project}
        companies={companies}
        origin={origin}
        modified={modified}
        searchScope={searchScope}
        viewMode={viewMode}
        pageSize={pageSize}
        query={query}
        total={total}
        userName={userName}
        mobileOpen={menuOpen}
        onMobileClose={() => setMenuOpen(false)}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center gap-2 border-b border-black/5 bg-[#f8f9fa] px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] md:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="inline-flex size-11 items-center justify-center rounded-full text-[#1f1f1f] transition-colors hover:bg-black/[0.05] touch-manipulation"
            aria-label="Menü öffnen"
            aria-expanded={menuOpen}
            aria-controls="drive-mobile-nav"
          >
            <Menu className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[#1f1f1f]">
              Consolidate Drive
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {total === 0
                ? "Keine Dokumente"
                : `${total} Dokument${total === 1 ? "" : "e"}`}
            </p>
          </div>
          <DriveViewToggle
            viewMode={viewMode}
            groupBy={groupBy}
            sortBy={sortBy}
            fileType={fileType}
            project={project}
            companies={companies}
            origin={origin}
            modified={modified}
            searchScope={searchScope}
            pageSize={pageSize}
            query={query}
          />
        </div>

        <header className="shrink-0 px-3 pt-4 pb-4 sm:px-6 sm:pt-8 sm:pb-5 md:px-10">
          <div className="mx-auto w-full max-w-5xl space-y-4 text-center sm:space-y-5">
            <h1 className="hidden text-[1.75rem] font-normal tracking-tight text-[#1f1f1f] md:block md:text-[2rem]">
              Willkommen bei Consolidate Drive
            </h1>
            <DriveSearchField
              groupBy={groupBy}
              sortBy={sortBy}
              fileType={fileType}
              project={project}
              selectedProjects={selectedProjects}
              companies={companies}
              selectedCompanies={selectedCompanies}
              origin={origin}
              recentProjects={recentProjects}
              modified={modified}
              searchScope={searchScope}
              viewMode={viewMode}
              pageSize={pageSize}
              query={query}
            />
          </div>
        </header>

        <div className="relative min-h-0 flex-1 overflow-y-auto px-3 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6 lg:px-8">
          <DriveLoadingOverlay active={isPending} />
          <div
            className={cn(
              "transition-[opacity,filter] duration-150",
              isPending && "pointer-events-none opacity-45 blur-[0.5px]"
            )}
          >
            <div className="mb-4 hidden items-center justify-end md:flex">
              <DriveViewToggle
                viewMode={viewMode}
                groupBy={groupBy}
                sortBy={sortBy}
                fileType={fileType}
                project={project}
                companies={companies}
                origin={origin}
                modified={modified}
                searchScope={searchScope}
                pageSize={pageSize}
                query={query}
              />
            </div>
            {truncated && !suggested ? (
              <p className="mb-4 text-xs text-amber-700">
                Es wurden nur die ersten Treffer aus Tasks und E-Mails geladen.
                Bitte gib einen exakteren Suchbegriff ein.
              </p>
            ) : null}
            <DriveGroupAccordion groups={groups} viewMode={viewMode} />
            {!suggested ? (
              <div className="mt-6">
                <DrivePagination
                  page={currentPage}
                  totalPages={totalPages}
                  groupBy={groupBy}
                  sortBy={sortBy}
                  fileType={fileType}
                  project={project}
                  companies={companies}
                  origin={origin}
                  modified={modified}
                  searchScope={searchScope}
                  viewMode={viewMode}
                  pageSize={pageSize}
                  query={query}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DriveView(
  props: React.ComponentProps<typeof DriveViewContent>
) {
  return (
    <DriveNavigationProvider>
      <div className="flex min-h-0 flex-1 flex-col">
        <DriveViewContent {...props} />
      </div>
    </DriveNavigationProvider>
  );
}
