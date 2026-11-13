import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth/session";

async function HomeRedirect() {
  const session = await getAuthSession();
  redirect(session ? "/drive" : "/login");
  return null;
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="h-full min-h-0 flex-1 bg-[#f8f9fa]" />}>
      <HomeRedirect />
    </Suspense>
  );
}
