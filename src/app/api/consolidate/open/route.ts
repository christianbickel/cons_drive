import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { openInConsolidateDesktopApp } from "@/lib/consolidate/open-desktop.server";

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  let url = "";
  try {
    const body = (await request.json()) as { url?: string };
    url = body.url?.trim() ?? "";
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid-body" }, { status: 400 });
  }

  if (!url) {
    return NextResponse.json({ ok: false, reason: "missing-url" }, { status: 400 });
  }

  const result = await openInConsolidateDesktopApp({
    apiUrl: session.apiUrl,
    targetUrl: url,
  });

  return NextResponse.json(result);
}
