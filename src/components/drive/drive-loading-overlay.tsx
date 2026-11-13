"use client";

import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function DriveLoadingOverlay({
  active,
  label = "Dokumente werden geladen…",
  className,
}: {
  active: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <div
      aria-hidden={!active}
      aria-busy={active}
      className={cn(
        "pointer-events-none absolute inset-0 z-20 flex items-start justify-center pt-16 transition-opacity duration-150",
        active ? "opacity-100" : "opacity-0",
        className
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2.5 rounded-full bg-white/95 px-4 py-2.5 text-sm text-[#1f1f1f] shadow-[0_1px_3px_0_rgba(60,64,67,0.3),0_4px_8px_3px_rgba(60,64,67,0.15)] ring-1 ring-black/5",
          !active && "invisible"
        )}
        role={active ? "status" : undefined}
      >
        <LoaderCircle
          className="size-4 animate-spin text-[#0b57d0]"
          aria-hidden
        />
        <span>{label}</span>
      </div>
    </div>
  );
}

export function DriveLoadingBar({ active }: { active: boolean }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none fixed top-0 right-0 left-0 z-50 h-0.5 overflow-hidden bg-transparent transition-opacity duration-150",
        active ? "opacity-100" : "opacity-0"
      )}
    >
      <div
        className={cn(
          "h-full w-1/3 rounded-full bg-[#0b57d0]",
          active && "animate-[drive-loading-bar_1.1s_ease-in-out_infinite]"
        )}
      />
    </div>
  );
}
