import "server-only";

import { getAuthSession } from "@/lib/auth/session";
import {
  ConsolidateApiError,
  type GraphQLVariables,
} from "./errors";
import { consolidateHttpGraphql } from "./http";

export type { GraphQLVariables, GraphQLResponse } from "./errors";
export { ConsolidateApiError } from "./errors";

export interface ConsolidateClientOptions {
  apiUrl?: string;
  apiKey?: string;
  cookies?: string;
  signal?: AbortSignal;
}

export async function resolveConsolidateAuth(
  options: ConsolidateClientOptions = {}
) {
  if (options.apiUrl && (options.apiKey || options.cookies)) {
    return {
      apiUrl: options.apiUrl,
      apiKey: options.apiKey,
      cookies: options.cookies,
    };
  }

  const session = await getAuthSession();
  if (!session?.apiUrl || (!session.apiKey && !session.cookies)) {
    throw new ConsolidateApiError(
      "Nicht angemeldet. Bitte unter /login anmelden."
    );
  }

  return {
    apiUrl: options.apiUrl ?? session.apiUrl,
    apiKey: options.apiKey ?? session.apiKey,
    cookies: options.cookies ?? session.cookies,
  };
}

export async function consolidateGraphql<T>(
  query: string,
  variables?: GraphQLVariables,
  options: ConsolidateClientOptions = {}
): Promise<T> {
  const auth = await resolveConsolidateAuth(options);
  const { data } = await consolidateHttpGraphql<T>(
    auth.apiUrl,
    query,
    variables,
    { apiKey: auth.apiKey, cookies: auth.cookies },
    options.signal
  );
  return data;
}

export async function fetchConsolidateAsset(
  url: string,
  options: ConsolidateClientOptions = {}
): Promise<Response> {
  const auth = await resolveConsolidateAuth(options);
  const headers: Record<string, string> = {};
  if (auth.apiKey) headers["X-API-Key"] = auth.apiKey;
  if (auth.cookies) headers.Cookie = auth.cookies;
  return fetch(url, {
    method: "GET",
    headers,
    redirect: "follow",
    cache: "no-store",
    signal: options.signal,
  });
}
