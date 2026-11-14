"use client";

import { Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { openConsolidateLink } from "@/lib/consolidate/open-link";
import type { DriveDocument } from "@/lib/drive/types";
import { cn } from "@/lib/utils";
import { useDocumentDetailsPin } from "./document-details-pin";
import { DocumentCardMenu } from "./document-card-menu";
import { DocumentThumbnail, FileTypeIcon } from "./document-thumbnail";
import { formatFileSize } from "./format";
import { TaskHoverDetails } from "./task-hover-details";

function fileIconTone(previewType: DriveDocument["previewType"]): string {
  switch (previewType) {
    case "Pdf":
      return "text-[#ea4335]";
    case "Office":
      return "text-[#34a853]";
    case "Image":
      return "text-[#fbbc04]";
    case "Video":
      return "text-[#a142f4]";
    case "Text":
      return "text-[#4285f4]";
    default:
      return "text-[#5f6368]";
  }
}

function useTapToRevealDetails() {
  const [tapMode, setTapMode] = useState(false);

  useEffect(() => {
    const hoverMedia = window.matchMedia("(hover: hover) and (pointer: fine)");
    const widthMedia = window.matchMedia("(max-width: 767px)");
    const sync = () => {
      setTapMode(!hoverMedia.matches || widthMedia.matches);
    };
    sync();
    hoverMedia.addEventListener("change", sync);
    widthMedia.addEventListener("change", sync);
    return () => {
      hoverMedia.removeEventListener("change", sync);
      widthMedia.removeEventListener("change", sync);
    };
  }, []);

  return tapMode;
}

export function DocumentCard({ document }: { document: DriveDocument }) {
  const tapMode = useTapToRevealDetails();
  const pin = useDocumentDetailsPin();
  const pinned = pin?.pinnedId === document.id;
  const detailsOpen = tapMode && pinned;
  const [cardHovered, setCardHovered] = useState(false);
  const hoverActive = !tapMode && cardHovered;
  const prefix =
    document.responsible?.name
      ? `Von ${document.responsible.name}`
      : document.project?.name;
  const sizeLabel = formatFileSize(document.size);

  const openDocument = () => {
    void openConsolidateLink(document.openUrl);
  };

  function onFileNameClick() {
    if (tapMode && pin) {
      pin.toggle(document.id);
      return;
    }
    openDocument();
  }

  return (
    <article
      className={cn(
        "relative z-0 isolate flex flex-col overflow-hidden rounded-2xl border border-transparent bg-white",
        "shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)]",
        "origin-center transition-[transform,box-shadow] duration-150 ease-[cubic-bezier(0.2,0,0,1)]",
        // Keep card above neighbors while the portaled ⋮ menu is open.
        "has-[[data-popup-open]]:z-40 has-[[data-popup-open]]:overflow-visible",
        "max-md:has-[[data-popup-open]]:z-40 max-md:has-[[data-popup-open]]:overflow-visible",
        "[@media(hover:none)]:has-[[data-popup-open]]:z-40 [@media(hover:none)]:has-[[data-popup-open]]:overflow-visible",
        (hoverActive || detailsOpen) &&
          "z-40 scale-[1.3] overflow-visible shadow-[0_1px_3px_0_rgba(60,64,67,0.3),0_4px_8px_3px_rgba(60,64,67,0.15)]"
      )}
      onMouseEnter={() => {
        if (!tapMode) setCardHovered(true);
      }}
      onMouseLeave={() => setCardHovered(false)}
    >
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5">
        <FileTypeIcon
          previewType={document.previewType}
          className={cn("size-4 shrink-0", fileIconTone(document.previewType))}
        />
        <button
          type="button"
          className={cn(
            "min-w-0 flex-1 truncate text-left text-sm font-medium text-[#1f1f1f] outline-none focus-visible:underline",
            !tapMode && "hover:underline"
          )}
          onClick={onFileNameClick}
          title={document.name}
          aria-expanded={tapMode ? detailsOpen : undefined}
          aria-label={
            tapMode
              ? detailsOpen
                ? `Details zu ${document.name} ausblenden`
                : `Details zu ${document.name} anzeigen`
              : undefined
          }
        >
          {document.name}
        </button>
        <DocumentCardMenu document={document} />
      </div>

      <div className="relative mx-2 mb-2">
        <div
          role="link"
          tabIndex={0}
          className="relative aspect-[25/27] cursor-pointer overflow-hidden rounded-md border border-black/10 bg-[#f1f3f4] outline-none focus-visible:ring-3 focus-visible:ring-[#1967d2]/40"
          onClick={(event) => {
            if ((event.target as HTMLElement).closest("[data-card-menu]")) return;
            openDocument();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openDocument();
            }
          }}
          aria-label={`${document.name} öffnen`}
        >
          <DocumentThumbnail
            src={document.thumbnailUrl}
            alt={document.name}
            previewType={document.previewType}
            zoomed={hoverActive || detailsOpen}
          />
          {document.task.status?.category === "Done" ? (
            <span
              className="pointer-events-none absolute top-2 right-2 z-10 size-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_2px_rgba(255,255,255,0.9)]"
              title="Erledigt"
              aria-label="Task erledigt"
            />
          ) : null}
        </div>
        <TaskHoverDetails
          document={document}
          open={detailsOpen || hoverActive}
        />
      </div>

      <div
        className={cn(
          "px-3 pb-3 transition-opacity duration-150",
          detailsOpen || hoverActive ? "opacity-0" : "opacity-100"
        )}
      >
        <p className="flex min-w-0 items-center gap-1.5 text-xs text-[#5f6368]">
          {prefix ? <span className="min-w-0 truncate">{prefix}</span> : null}
          {prefix ? <span className="shrink-0" aria-hidden>·</span> : null}
          {document.source === "email" ? (
            <span title="Aus E-Mail" className="inline-flex shrink-0">
              <Mail
                className="size-3.5 text-[#5f6368]"
                aria-label="Aus E-Mail"
              />
            </span>
          ) : null}
          <span className="shrink-0 tabular-nums">{sizeLabel}</span>
        </p>
      </div>
    </article>
  );
}
