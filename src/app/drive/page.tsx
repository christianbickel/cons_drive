import { Suspense } from "react";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/login/actions";
import { DriveView } from "@/components/drive/drive-view";
import { Button } from "@/components/ui/button";
import { getAuthSession } from "@/lib/auth/session";
import {
  listDriveDocuments,
  listRecentDriveProjects,
  listSuggestedDriveDocuments,
  searchDriveDocumentsFulltext,
} from "@/lib/consolidate/drive-repository";
import { ConsolidateApiError } from "@/lib/consolidate/errors";
import {
  isModifiedFilterActive,
  isOriginFilterActive,
  isProjectFilterActive,
  parseDriveFileType,
  parseDriveGroupBy,
  parseDriveModifiedFilter,
  parseDriveOriginFilter,
  parseDriveProjectFilter,
  parseDriveSearchScope,
  parseDriveSortBy,
  parseDriveViewMode,
  prepareDriveDocumentPage,
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
    project?: string;
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
  const origin = parseDriveOriginFilter(params.origin);
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
  const suggested =
    !query &&
    fileType === "all" &&
    !isProjectFilterActive(project) &&
    !isOriginFilterActive(origin) &&
    !isModifiedFilterActive(modified);
  // E-Mails have no project — skip mailbox scan when filtering/grouping by project.
  const includeEmails =
    origin !== "task" &&
    !isProjectFilterActive(project) &&
    !groupBy.includes("project");
  const includeTasks = origin !== "email";

  let allDocuments;
  let recentProjects;
  let truncated = false;
  try {
    const projectsPromise = listRecentDriveProjects({
      userId: session.user.id,
      limit: 20,
    });

    if (suggested) {
      const [result, projectsResult] = await Promise.all([
        listSuggestedDriveDocuments({
          userId: session.user.id,
          limit: 20,
        }),
        projectsPromise,
      ]);
      allDocuments = result.documents;
      recentProjects = projectsResult.projects;
    } else if (query && searchScope === "fulltext") {
      const [result, projectsResult] = await Promise.all([
        searchDriveDocumentsFulltext({
          searchString: query,
          includeEmails,
          includeTasks,
        }),
        projectsPromise,
      ]);
      allDocuments = result.documents;
      truncated = result.truncated;
      recentProjects = projectsResult.projects;
    } else {
      const [result, projectsResult] = await Promise.all([
        listDriveDocuments({ includeEmails, includeTasks }),
        projectsPromise,
      ]);
      allDocuments = result.documents;
      truncated = result.truncated;
      recentProjects = projectsResult.projects;
    }
  } catch (error) {
    const message =
      error instanceof ConsolidateApiError
        ? error.message
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

  const paged = prepareDriveDocumentPage(allDocuments, {
    query,
    searchScope,
    suggested,
    fileType,
    project,
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
      groupBy={suggested ? [] : groupBy}
      sortBy={suggested ? "modified" : sortBy}
      page={paged.page}
      pageSize={paged.pageSize}
      query={query}
      fileType={fileType}
      project={project}
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
    project?: string;
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
