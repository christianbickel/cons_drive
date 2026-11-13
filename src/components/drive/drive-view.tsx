"use client";

import { groupDriveDocuments } from "@/lib/drive/helpers";
import type {
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
  groupBy,
  sortBy,
  page,
  pageSize,
  query,
  fileType,
  project,
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
  groupBy: DriveGroupBy;
  sortBy: DriveSortBy;
  page: number;
  pageSize: number;
  query: string;
  fileType: DriveFileTypeFilter;
  project: DriveProjectFilter;
  origin: DriveOriginFilter;
  modified: DriveModifiedFilter;
  searchScope: DriveSearchScope;
  viewMode: DriveViewMode;
  truncated?: boolean;
  suggested?: boolean;
  userName?: string;
}) {
  const { isPending } = useDriveNavigation();
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

  return (
    <div className="flex h-full min-h-0 flex-1 bg-[#f8f9fa]">
      <DriveLoadingBar active={isPending} />
      <DriveSidebar
        groupBy={groupBy}
        sortBy={sortBy}
        fileType={fileType}
        project={project}
        origin={origin}
        modified={modified}
        searchScope={searchScope}
        viewMode={viewMode}
        pageSize={pageSize}
        query={query}
        total={total}
        userName={userName}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="shrink-0 px-6 pt-8 pb-5 sm:px-10">
          <div className="mx-auto max-w-3xl space-y-5 text-center">
            <h1 className="text-[1.75rem] font-normal tracking-tight text-[#1f1f1f] sm:text-[2rem]">
              Willkommen bei Consolidate Drive
            </h1>
            <DriveSearchField
              groupBy={groupBy}
              sortBy={sortBy}
              fileType={fileType}
              project={project}
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

        <div className="relative min-h-0 flex-1 overflow-y-auto px-4 pb-8 sm:px-6 lg:px-8">
          <DriveLoadingOverlay active={isPending} />
          <div
            className={cn(
              "transition-[opacity,filter] duration-150",
              isPending && "pointer-events-none opacity-45 blur-[0.5px]"
            )}
          >
            <div className="mb-4 flex items-center justify-end">
              <DriveViewToggle
                viewMode={viewMode}
                groupBy={groupBy}
                sortBy={sortBy}
                fileType={fileType}
                project={project}
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
