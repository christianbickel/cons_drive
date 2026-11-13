"use client";

import {
  Download,
  ExternalLink,
  MoreVertical,
  Share2,
  SquareArrowOutUpRight,
} from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { openConsolidateLink } from "@/lib/consolidate/open-link";
import type { DriveDocument } from "@/lib/drive/types";
import { cn } from "@/lib/utils";

async function shareDocument(
  document: DriveDocument
): Promise<"shared" | "copied"> {
  const url = document.openUrl;
  if (!url || url === "#") {
    throw new Error("Kein Link");
  }

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({
        title: document.name,
        text: document.task.name
          ? `${document.name} · ${document.task.name}`
          : document.name,
        url,
      });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }
    }
  }

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url);
    return "copied";
  }

  throw new Error("Teilen nicht verfügbar");
}

export function DocumentCardMenu({
  document,
  onOpenChange,
  className,
}: {
  document: DriveDocument;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}) {
  const [shareLabel, setShareLabel] = useState("Teilen");

  return (
    <div
      data-card-menu=""
      className={cn("relative z-30 shrink-0", className)}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <DropdownMenu onOpenChange={onOpenChange}>
        <DropdownMenuTrigger
          className={cn(
            "inline-flex size-8 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors",
            "hover:bg-black/5 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
            "data-popup-open:bg-black/5 data-popup-open:text-foreground"
          )}
          aria-label="Aktionen"
        >
          <MoreVertical className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="bottom" className="min-w-44">
          <DropdownMenuItem
            onClick={() => {
              void openConsolidateLink(document.openUrl);
            }}
          >
            <ExternalLink />
            Dokument öffnen
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!document.task.url}
            onClick={() => {
              if (document.task.url) {
                void openConsolidateLink(document.task.url);
              }
            }}
          >
            <SquareArrowOutUpRight />
            {document.source === "email" ? "E-Mail öffnen" : "Task öffnen"}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              window.location.assign(document.downloadUrl);
            }}
          >
            <Download />
            Herunterladen
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={async () => {
              try {
                const result = await shareDocument(document);
                if (result === "copied") {
                  setShareLabel("Link kopiert");
                  window.setTimeout(() => setShareLabel("Teilen"), 1500);
                }
              } catch (error) {
                if (
                  error instanceof DOMException &&
                  error.name === "AbortError"
                ) {
                  return;
                }
                setShareLabel("Fehlgeschlagen");
                window.setTimeout(() => setShareLabel("Teilen"), 1500);
              }
            }}
          >
            <Share2 />
            {shareLabel}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
