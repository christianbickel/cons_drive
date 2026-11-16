"use client";

import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { groupDriveDocuments } from "@/lib/drive/helpers";
import type {
  DriveCompanyFilter,
  DriveCompanyOption,
  DriveDocument,
  DriveFileTypeFilter,
  DriveFilterOption,
  DriveGroupBy,
  DriveModifiedFilter,
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
import { DriveGroupAccordion } from "./drive-group-accordion";
import { DriveListControls } from "./drive-list-controls";
import {
  DriveLoadingBar,
  DriveLoadingOverlay,
} from "./drive-loading-overlay";
import { DriveNavigationProvider, useDriveNavigation } from "./drive-navigation";
import { DrivePagination } from "./drive-pagination";
import { DriveSearchField } from "./drive-search-field";

function DriveViewContent({
  documents,
  total,
  recentProjects,
  selectedProjects,
  selectedCompanies,
  more,
  moreOptions,
  groupBy,
  sortBy,
  page,
  pageSize,
  query,
  fileType,
  project,
  companies,
  place,
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
  more: DriveMoreFilters;
  moreOptions: {
    statuses: DriveFilterOption[];
    creators: DriveFilterOption[];
    taskTypes: DriveFilterOption[];
  };
  groupBy: DriveGroupBy;
  sortBy: DriveSortBy;
  page: number;
  pageSize: number;
  query: string;
  fileType: DriveFileTypeFilter;
  project: DriveProjectFilter;
  companies: DriveCompanyFilter;
  place: DrivePlace;
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

  const listControlProps = {
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
  } as const;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-[#f8f9fa]">
      <DriveLoadingBar active={isPending} />

      <header className="shrink-0 px-3 pt-[max(1rem,env(safe-area-inset-top))] pb-4 sm:px-6 sm:pt-8 sm:pb-5 md:px-10">
        <div className="relative mx-auto w-full max-w-5xl space-y-4 text-center sm:space-y-5">
          <div className="absolute top-0 right-0 flex items-center gap-2">
            {userName ? (
              <p className="hidden max-w-[10rem] truncate text-xs text-muted-foreground sm:block lg:max-w-[14rem]">
                {userName}
              </p>
            ) : null}
            <form action={logoutAction}>
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 rounded-full px-3 text-xs text-[#5f6368]"
              >
                <LogOut className="size-3.5" />
                Abmelden
              </Button>
            </form>
          </div>
          <h1 className="pr-20 text-[1.35rem] font-normal tracking-tight text-[#1f1f1f] sm:pr-0 md:text-[2rem]">
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
            place={place}
            more={more}
            moreOptions={moreOptions}
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
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {total === 0
                ? "Keine Dokumente"
                : `${total} Dokument${total === 1 ? "" : "e"}`}
            </p>
            <DriveListControls {...listControlProps} />
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
                place={place}
                more={more}
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
