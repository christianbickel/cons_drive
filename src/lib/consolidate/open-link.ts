/** Open Consolidate links in a new browser tab. */

export async function openConsolidateLink(webUrl: string): Promise<void> {
  const url = webUrl?.trim();
  if (!url || url === "#") return;
  window.open(url, "_blank", "noopener,noreferrer");
}
