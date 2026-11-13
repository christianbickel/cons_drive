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
  withThumbnailQuery,
} from "@/lib/consolidate/urls";

export async function GET(request: Request) {
  const session = await getAuthSession();
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const fallbackUrl = searchParams.get("u");
  if (!id && !fallbackUrl) {
    return new NextResponse("Missing id", { status: 400 });
  }

  try {
    const auth = await resolveConsolidateAuth();
    let downloadUrl: string | undefined;
    let contentType: string | undefined;
    let previewType: string | undefined;

    if (id) {
      const data = await consolidateGraphql<{
        attachment: {
          id: string;
          downloadUrl: string;
          contentType?: string | null;
          previewType?: string | null;
        } | null;
      }>(
        `query DriveAttachmentThumbnail($id: ID!) {
          attachment(id: $id) {
            id
            downloadUrl
            contentType
            previewType
          }
        }`,
        { id }
      );

      if (data.attachment?.downloadUrl) {
        downloadUrl = data.attachment.downloadUrl;
        contentType = data.attachment.contentType ?? undefined;
        previewType = data.attachment.previewType ?? undefined;
      }
    }

    // E-Mail attachments are not resolvable via root `attachment(id:)`.
    if (!downloadUrl && fallbackUrl) {
      if (!isTrustedConsolidateDownloadUrl(auth.apiUrl, fallbackUrl)) {
        return new NextResponse("Invalid download URL", { status: 400 });
      }
      downloadUrl = fallbackUrl;
    }

    if (!downloadUrl) {
      return new NextResponse("Not found", { status: 404 });
    }

    const absolute = resolveConsolidateAssetUrl(auth.apiUrl, downloadUrl);
    const previewTypesWithThumb = new Set([
      "Image",
      "Pdf",
      "Office",
      "Video",
    ]);
    const useThumb =
      !previewType || previewTypesWithThumb.has(previewType);
    const target = useThumb ? withThumbnailQuery(absolute) : absolute;

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
        "Cache-Control": "private, max-age=300",
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
    return new NextResponse("Thumbnail failed", { status: 500 });
  }
}
