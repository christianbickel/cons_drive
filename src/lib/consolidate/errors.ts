export type GraphQLVariables = Record<string, unknown>;

export interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    path?: unknown[];
    extensions?: Record<string, unknown>;
  }>;
}

export class ConsolidateApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly errors?: GraphQLResponse<unknown>["errors"]
  ) {
    super(message);
    this.name = "ConsolidateApiError";
  }
}

/** Raven/Consolidate sometimes fails deserializing a single indexed document. */
export function isConsolidateConversionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /Could not convert document\s+\S+\s+to entity/i.test(message);
}

/** Short, user-safe message (strips Raven JSON dumps). */
export function summarizeConsolidateError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const convert = message.match(
    /Could not convert document\s+(\S+)\s+to entity/i
  );
  if (convert?.[1]) {
    return `Ein Consolidate-Dokument konnte nicht geladen werden (${convert[1]}).`;
  }
  const withoutJson = message.replace(/\s*Json:\s*\{[\s\S]*$/i, "").trim();
  if (withoutJson && withoutJson.length <= 280) return withoutJson;
  return "Dokumente konnten nicht geladen werden.";
}
