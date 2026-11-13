import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import {
  consolidateGraphql,
  fetchConsolidateAsset,
  resolveConsolidateAuth,
} from "@/lib/consolidate/client";
import { ConsolidateApiError } from "@/lib/consolidate/errors";
import {
  isTrustedConsolidateDownloadUrl,
  resolveConsolidateAssetUrl,
} from "@/lib/consolidate/urls";

function contentDisposition(filename: string): string {
  const safe =
    filename.replace(/[^\w.\- ()[\]]+/g, "_").slice(0, 120) || "download";
  const encoded = encodeURIComponent(filename);
  return `attachment; filename="${safe}"; filename*=UTF-8''${encoded}`;
}

export async function GET(request: Request) {
  const session = await getAuthSession();
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const fallbackUrl = searchParams.get("u");
  const fallbackName = searchParams.get("name");
  if (!id && !fallbackUrl) {
    return new NextResponse("Missing id", { status: 400 });
  }

  try {
    const auth = await resolveConsolidateAuth();
    let downloadUrl: string | undefined;
    let contentType: string | undefined;
    let name = fallbackName?.trim() || "download";

    if (fallbackUrl && isTrustedConsolidateDownloadUrl(auth.apiUrl, fallbackUrl)) {
      downloadUrl = fallbackUrl;
    } else if (id) {
      const data = await consolidateGraphql<{
        attachment: {
          id: string;
          name: string;
          downloadUrl: string;
          contentType?: string | null;
        } | null;
      }>(
        `query DriveAttachmentDownload($id: ID!) {
          attachment(id: $id) {
            id
            name
            downloadUrl
            contentType
          }
        }`,
        { id }
      );

      if (data.attachment?.downloadUrl) {
        downloadUrl = data.attachment.downloadUrl;
        contentType = data.attachment.contentType ?? undefined;
        name = data.attachment.name || name;
      }
    }

    if (!downloadUrl) {
      return new NextResponse("Not found", { status: 404 });
    }

    const target = resolveConsolidateAssetUrl(auth.apiUrl, downloadUrl);
    const upstream = await fetchConsolidateAsset(target);
    if (!upstream.ok) {
      return new NextResponse("Upstream error", { status: upstream.status });
    }

    const responseType =
      upstream.headers.get("content-type") ||
      contentType ||
      "application/octet-stream";
    const buffer = await upstream.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": responseType,
        "Content-Disposition": contentDisposition(name),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof ConsolidateApiError) {
      const status =
        typeof error.status === "number" && error.status >= 400
          ? error.status
          : 502;
      return new NextResponse(error.message, { status });
    }
    return new NextResponse("Download failed", { status: 500 });
  }
}
