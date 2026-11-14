import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { searchDriveCompanies } from "@/lib/consolidate/drive-repository";
import { ConsolidateApiError } from "@/lib/consolidate/errors";

export async function GET(request: Request) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) {
    return NextResponse.json({ companies: [] });
  }

  try {
    const companies = await searchDriveCompanies({
      searchString: q,
      take: 20,
    });
    return NextResponse.json({ companies });
  } catch (error) {
    const message =
      error instanceof ConsolidateApiError
        ? error.message
        : "Unternehmen konnten nicht geladen werden.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
