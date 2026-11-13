import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getAuthSession, getLastApiUrl } from "@/lib/auth/session";

function safeNextPath(raw: string | undefined): string {
  const value = (raw ?? "").trim();
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("://")) {
    return "/drive";
  }
  return value;
}

function displayApiUrl(apiUrl: string | undefined): string {
  if (!apiUrl) return "";
  return apiUrl.replace(/\/graphql\/?$/, "");
}

async function LoginContent({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await getAuthSession();
  if (session) redirect("/drive");

  const { next } = await searchParams;
  const lastApiUrl = await getLastApiUrl();

  return (
    <div className="flex h-full min-h-0 flex-1 items-center justify-center bg-[#f8f9fa] px-4 py-16">
      <div className="w-full max-w-sm space-y-4 rounded-2xl border border-black/5 bg-white p-6 shadow-[0_1px_3px_0_rgba(60,64,67,0.3),0_4px_8px_3px_rgba(60,64,67,0.15)]">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold tracking-tight text-[#1f1f1f]">
            Consolidate Drive
          </h1>
          <p className="text-sm text-[#5f6368]">
            Mit Consolidate-Konto anmelden und Dokumente aus Tasks durchsuchen.
          </p>
        </div>
        <LoginForm
          defaultApiUrl={displayApiUrl(lastApiUrl)}
          nextPath={safeNextPath(next)}
        />
      </div>
    </div>
  );
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Suspense
        fallback={
          <div className="flex h-full min-h-0 flex-1 items-center justify-center bg-[#f8f9fa] px-4 py-16">
            <div className="h-64 w-full max-w-sm animate-pulse rounded-2xl bg-white/80" />
          </div>
        }
      >
        <LoginContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
