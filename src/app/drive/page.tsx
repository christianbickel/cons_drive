import { Suspense } from "react";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/login/actions";
import { DriveView } from "@/components/drive/drive-view";
import { Button } from "@/components/ui/button";
import { getAuthSession } from "@/lib/auth/session";
import {
  getDriveCompaniesByIds,
  getDriveProjectsByIds,
  listDriveDocuments,
  listDriveCreators,
  listDriveTaskStatuses,
  listDriveTaskTypes,
  listRecentDriveProjects,
  listSuggestedDriveDocuments,
  searchDriveDocumentsFulltext,
} from "@/lib/consolidate/drive-repository";
import {
  ConsolidateApiError,
  summarizeConsolidateError,
} from "@/lib/consolidate/errors";
import {
  drivePath,
  isCompanyFilterActive,
  isMinePlace,
  isModifiedFilterActive,
  isMoreFilterActive,
  isOriginFilterActive,
  isProjectFilterActive,
  parseDriveCompanyFilter,
  parseDriveFileType,
  parseDriveGroupBy,
  parseDriveModifiedFilter,
  parseDriveMoreFilters,
  parseDriveOriginFilter,
  parseDrivePlace,
  parseDriveProjectFilter,
  parseDriveSearchScope,
  parseDriveSortBy,
  parseDriveViewMode,
  prepareDriveDocumentPage,
  resolveDriveOriginFilter,
} from "@/lib/drive/helpers";

async function DriveContent({
  searchParams,
}: {
  searchParams: Promise<{
    group?: string;
    sort?: string;
    page?: string;
    pageSize?: string;
    q?: string;
    type?: string;
    project?: string | string[];
    company?: string | string[];
    place?: string;
    status?: string | string[];
    creator?: string | string[];
    taskType?: string | string[];
    origin?: string;
    modified?: string;
    from?: string;
    to?: string;
    scope?: string;
    view?: string;
  }>;
}) {
  const session = await getAuthSession();
  if (!session) {
    redirect("/login?next=/drive");
  }

  const params = await searchParams;
  const groupBy = parseDriveGroupBy(params.group);
  const sortBy = parseDriveSortBy(params.sort);
  const fileType = parseDriveFileType(params.type);
  const project = parseDriveProjectFilter(params.project);
  const companies = parseDriveCompanyFilter(params.company);
  const place = parseDrivePlace(params.place);
  const responsible = isMinePlace(place) ? [session.user.id] : [];
  const more = parseDriveMoreFilters({
    status: params.status,
    creator: params.creator,
    taskType: params.taskType,
  });
  const requestedOrigin = parseDriveOriginFilter(params.origin);
  const origin = resolveDriveOriginFilter(
    requestedOrigin,
    project,
    groupBy,
    more
  );
  const searchScope = parseDriveSearchScope(params.scope);
  const viewMode = parseDriveViewMode(params.view);
  const modified = parseDriveModifiedFilter({
    modified: params.modified,
    from: params.from,
    to: params.to,
  });
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const pageSizeRaw = Number.parseInt(params.pageSize ?? "24", 10) || 24;
  const pageSize = Math.min(48, Math.max(12, pageSizeRaw));
  const query = (params.q ?? "").trim();

  if (origin !== requestedOrigin) {
    redirect(
      drivePath({
        groupBy,
        sortBy,
        page,
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
      })
    );
  }

  // Unternehmen and Meine Ablage both use suggestions when no extra filters
  // are set; Meine Ablage still applies responsible (+ mailbox) scoping below.
  const suggested =
    !query &&
    fileType === "all" &&
    !isProjectFilterActive(project) &&
    !isCompanyFilterActive(companies) &&
    !isMoreFilterActive(more) &&
    !isOriginFilterActive(origin) &&
    !isModifiedFilterActive(modified);
  // E-Mails have no project — skip mailbox when origin is task-only.
  const includeEmails = origin !== "task";
  const includeTasks = origin !== "email";

  let allDocuments;
  let recentProjects;
  let selectedProjects;
  let selectedCompanies;
  let taskStatuses;
  let creators;
  let taskTypes;
  let truncated = false;
  try {
    const recentProjectsPromise = listRecentDriveProjects({
      userId: session.user.id,
      limit: 20,
    });
    const selectedProjectsPromise = getDriveProjectsByIds(project);
    const companiesPromise = getDriveCompaniesByIds(companies);
    const moreOptionsPromise = Promise.all([
      listDriveTaskStatuses(),
      listDriveCreators(),
      listDriveTaskTypes(),
    ]);

    if (suggested) {
      const [
        result,
        recentResult,
        selectedResult,
        companiesResult,
        [statusesResult, creatorsResult, taskTypesResult],
      ] = await Promise.all([
        listSuggestedDriveDocuments({
          userId: session.user.id,
          limit: 20,
        }),
        recentProjectsPromise,
        selectedProjectsPromise,
        companiesPromise,
        moreOptionsPromise,
      ]);
      allDocuments = result.documents;
      recentProjects = recentResult.projects;
      selectedProjects = selectedResult;
      selectedCompanies = companiesResult;
      taskStatuses = statusesResult;
      creators = creatorsResult;
      taskTypes = taskTypesResult;
    } else if (query && searchScope === "fulltext") {
      const [
        result,
        recentResult,
        selectedResult,
        companiesResult,
        [statusesResult, creatorsResult, taskTypesResult],
      ] = await Promise.all([
        searchDriveDocumentsFulltext({
          searchString: query,
          includeEmails,
          includeTasks,
        }),
        recentProjectsPromise,
        selectedProjectsPromise,
        companiesPromise,
        moreOptionsPromise,
      ]);
      allDocuments = result.documents;
      truncated = result.truncated;
      recentProjects = recentResult.projects;
      selectedProjects = selectedResult;
      selectedCompanies = companiesResult;
      taskStatuses = statusesResult;
      creators = creatorsResult;
      taskTypes = taskTypesResult;
    } else {
      const [
        result,
        recentResult,
        selectedResult,
        companiesResult,
        [statusesResult, creatorsResult, taskTypesResult],
      ] = await Promise.all([
        listDriveDocuments({ includeEmails, includeTasks }),
        recentProjectsPromise,
        selectedProjectsPromise,
        companiesPromise,
        moreOptionsPromise,
      ]);
      allDocuments = result.documents;
      truncated = result.truncated;
      recentProjects = recentResult.projects;
      selectedProjects = selectedResult;
      selectedCompanies = companiesResult;
      taskStatuses = statusesResult;
      creators = creatorsResult;
      taskTypes = taskTypesResult;
    }
  } catch (error) {
    const message =
      error instanceof ConsolidateApiError
        ? summarizeConsolidateError(error)
        : "Dokumente konnten nicht geladen werden.";
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-4 bg-[#f8f9fa] px-4">
        <div className="max-w-md space-y-3 rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold tracking-tight">
            Consolidate Drive
          </h1>
          <p className="text-sm text-destructive">{message}</p>
          <form action={logoutAction}>
            <Button type="submit" variant="outline">
              Abmelden
            </Button>
          </form>
        </div>
      </div>
    );
  }

  const moreOptions = {
    statuses: taskStatuses ?? [],
    creators: creators ?? [],
    taskTypes: taskTypes ?? [],
  };
  const paged = prepareDriveDocumentPage(allDocuments, {
    query,
    searchScope,
    suggested,
    fileType,
    project,
    companies,
    responsible,
    more,
    origin,
    modified,
    sortBy: suggested ? "modified" : sortBy,
    page: suggested ? 1 : page,
    pageSize: suggested ? 20 : pageSize,
  });

  return (
    <DriveView
      documents={paged.items}
      total={paged.total}
      recentProjects={recentProjects}
      selectedProjects={selectedProjects ?? []}
      selectedCompanies={selectedCompanies ?? []}
      more={more}
      moreOptions={moreOptions}
      groupBy={suggested ? [] : groupBy}
      sortBy={suggested ? "modified" : sortBy}
      page={paged.page}
      pageSize={paged.pageSize}
      query={query}
      fileType={fileType}
      project={project}
      companies={companies}
      place={place}
      origin={origin}
      modified={modified}
      searchScope={searchScope}
      viewMode={viewMode}
      truncated={truncated}
      suggested={suggested}
      userName={session.user.displayName}
    />
  );
}

export default function DrivePage({
  searchParams,
}: {
  searchParams: Promise<{
    group?: string;
    sort?: string;
    page?: string;
    pageSize?: string;
    q?: string;
    type?: string;
    project?: string | string[];
    company?: string | string[];
    place?: string;
    status?: string | string[];
    creator?: string | string[];
    taskType?: string | string[];
    origin?: string;
    modified?: string;
    from?: string;
    to?: string;
    scope?: string;
    view?: string;
  }>;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Suspense
        fallback={
          <div className="h-full min-h-0 flex-1 animate-pulse bg-[#f8f9fa]" />
        }
      >
        <DriveContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
