"use server";

import { redirect } from "next/navigation";
import {
  clearAuthSession,
  clearPendingTwoFactor,
  getAuthSession,
  getPendingTwoFactor,
  setAuthSession,
  setPendingTwoFactor,
} from "@/lib/auth/session";
import {
  loginWithPassword,
  loginWithTwoFactor,
  revokeSessionApiKey,
} from "@/lib/consolidate/login";
import { normalizeApiUrl } from "@/lib/consolidate/url";

export type LoginActionResult =
  | { ok: true }
  | { ok: false; error: string; needsTwoFactor?: boolean };

function safeNextPath(raw: FormDataEntryValue | null): string {
  const value = String(raw ?? "").trim();
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("://")) {
    return "/drive";
  }
  return value;
}

export async function loginWithPasswordAction(
  _prev: LoginActionResult | null,
  formData: FormData
): Promise<LoginActionResult> {
  try {
    const apiUrlRaw = String(formData.get("apiUrl") ?? "");
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!apiUrlRaw.trim() || !email || !password) {
      return {
        ok: false,
        error: "Consolidate-URL, E-Mail und Passwort ausfüllen.",
      };
    }

    let apiUrl: string;
    try {
      apiUrl = normalizeApiUrl(apiUrlRaw);
      new URL(apiUrl);
    } catch {
      return { ok: false, error: "Consolidate-URL ist ungültig." };
    }

    const result = await loginWithPassword(apiUrl, email, password);
    if (!result.ok) {
      if (result.reason === "two_factor" && result.pendingCookies) {
        await setPendingTwoFactor(apiUrl, result.pendingCookies);
        return { ok: false, error: result.message, needsTwoFactor: true };
      }
      return { ok: false, error: result.message };
    }

    await clearPendingTwoFactor();
    await setAuthSession(result.session);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Anmeldung fehlgeschlagen",
    };
  }
  redirect(safeNextPath(formData.get("next")));
}

export async function loginWithTwoFactorAction(
  _prev: LoginActionResult | null,
  formData: FormData
): Promise<LoginActionResult> {
  try {
    const code = String(formData.get("code") ?? "").trim();
    const pending = await getPendingTwoFactor();
    if (!pending?.cookies || !pending.apiUrl) {
      return {
        ok: false,
        error: "2FA-Sitzung abgelaufen. Bitte erneut anmelden.",
      };
    }
    if (!code) {
      return {
        ok: false,
        error: "Bitte den 2FA-Code eingeben.",
        needsTwoFactor: true,
      };
    }

    const result = await loginWithTwoFactor(
      pending.apiUrl,
      pending.cookies,
      code,
      true
    );
    if (!result.ok) {
      if (result.pendingCookies) {
        await setPendingTwoFactor(pending.apiUrl, result.pendingCookies);
      }
      return {
        ok: false,
        error: result.message,
        needsTwoFactor: true,
      };
    }

    await clearPendingTwoFactor();
    await setAuthSession(result.session);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "2FA fehlgeschlagen",
      needsTwoFactor: true,
    };
  }
  redirect(safeNextPath(formData.get("next")));
}

export async function logoutAction(): Promise<void> {
  const session = await getAuthSession();
  if (session?.apiUrl) {
    await revokeSessionApiKey(session.apiUrl, session);
  }
  await clearPendingTwoFactor();
  await clearAuthSession();
  redirect("/login");
}
