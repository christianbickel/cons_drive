/** Normalize user-entered Consolidate base or GraphQL URL to `…/graphql/`. */
export function normalizeApiUrl(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, "");
  if (!trimmed) {
    throw new Error("Consolidate-URL fehlt.");
  }
  if (trimmed.endsWith("/graphql")) return `${trimmed}/`;
  if (trimmed.includes("/graphql/")) return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
  return `${trimmed}/graphql/`;
}
