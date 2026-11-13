/** App origin from GraphQL endpoint (`…/graphql/` → `https://host`). */
export function consolidateAppOrigin(apiUrl: string): string {
  return apiUrl.replace(/\/graphql\/?$/, "").replace(/\/+$/, "");
}

/** Consolidate SPA deep-link for any data entry (Project, Objective, …). */
export function consolidateEntryUrl(apiUrl: string, entryId: string): string {
  return `${consolidateAppOrigin(apiUrl)}/entry/${encodeURIComponent(entryId)}`;
}

/**
 * Open an E-Mail conversation in the Consolidate mail UI.
 * Prefers folder context when available; otherwise uses the shared/detail route
 * which loads via `emailConversation(id:)`.
 */
export function consolidateMailConversationUrl(
  apiUrl: string,
  conversationId: string,
  options?: {
    folderId?: string;
    folderConversationId?: string;
  }
): string {
  const origin = consolidateAppOrigin(apiUrl);
  if (options?.folderId && options?.folderConversationId) {
    return `${origin}/emails/folder/${encodeURIComponent(options.folderId)}/${encodeURIComponent(options.folderConversationId)}`;
  }
  return `${origin}/emails/shared/${encodeURIComponent(conversationId)}`;
}

/** Consolidate online viewer for an attachment (`/editor/view/:id`). */
export function consolidateAttachmentViewUrl(
  apiUrl: string,
  attachmentId: string
): string {
  return `${consolidateAppOrigin(apiUrl)}/editor/view/${encodeURIComponent(attachmentId)}`;
}

/** Absolute URL for Consolidate download/preview paths. */
export function resolveConsolidateAssetUrl(
  apiUrl: string,
  maybeRelative: string
): string {
  if (/^https?:\/\//i.test(maybeRelative) || maybeRelative.startsWith("blob:")) {
    return maybeRelative;
  }
  return new URL(
    maybeRelative,
    `${consolidateAppOrigin(apiUrl)}/`
  ).toString();
}

/**
 * Only allow proxying download URLs that point at the current Consolidate host
 * (tokenized `/api/Attachments/download` links from GraphQL).
 */
export function isTrustedConsolidateDownloadUrl(
  apiUrl: string,
  candidate: string
): boolean {
  try {
    const origin = consolidateAppOrigin(apiUrl);
    const resolved = resolveConsolidateAssetUrl(apiUrl, candidate);
    const url = new URL(resolved);
    return (
      url.origin === new URL(origin).origin &&
      /\/api\/attachments\/download/i.test(url.pathname)
    );
  } catch {
    return false;
  }
}

/** Same helper Consolidate uses for image/PDF thumbnails. */
export function withThumbnailQuery(downloadUrl: string): string {
  if (downloadUrl.startsWith("blob:")) return downloadUrl;
  const sep = downloadUrl.includes("?") ? "&" : "?";
  return `${downloadUrl}${sep}thumbnail=true`;
}
