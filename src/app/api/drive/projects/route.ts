import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { searchDriveProjects } from "@/lib/consolidate/drive-repository";
import { ConsolidateApiError } from "@/lib/consolidate/errors";

export async function GET(request: Request) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) {
    return NextResponse.json({ projects: [] });
  }

  try {
    const projects = await searchDriveProjects({
      searchString: q,
      take: 20,
    });
    return NextResponse.json({ projects });
  } catch (error) {
    const message =
      error instanceof ConsolidateApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Projekte konnten nicht geladen werden.";
    console.error("[drive/projects]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
