"use client";

import { Mail } from "lucide-react";
import { useState } from "react";
import { openConsolidateLink } from "@/lib/consolidate/open-link";
import type { DriveDocument } from "@/lib/drive/types";
import { cn } from "@/lib/utils";
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

export function DocumentCard({ document }: { document: DriveDocument }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const prefix =
    document.responsible?.name
      ? `Von ${document.responsible.name}`
      : document.project?.name;
  const sizeLabel = formatFileSize(document.size);

  const openDocument = () => {
    void openConsolidateLink(document.openUrl);
  };

  return (
    <article
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border border-transparent bg-white",
        "shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)]",
        "transition-[transform,box-shadow] duration-150 ease-[cubic-bezier(0.2,0,0,1)]",
        "hover:-translate-y-0.5 hover:shadow-[0_1px_3px_0_rgba(60,64,67,0.3),0_4px_8px_3px_rgba(60,64,67,0.15)]"
      )}
    >
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5">
        <FileTypeIcon
          previewType={document.previewType}
          className={cn("size-4 shrink-0", fileIconTone(document.previewType))}
        />
        <button
          type="button"
          className="min-w-0 flex-1 truncate text-left text-sm font-medium text-[#1f1f1f] outline-none hover:underline focus-visible:underline"
          onClick={openDocument}
          title={document.name}
        >
          {document.name}
        </button>
        <DocumentCardMenu document={document} onOpenChange={setMenuOpen} />
      </div>

      <div
        role="link"
        tabIndex={0}
        className="relative mx-2 mb-2 aspect-[4/3] cursor-pointer overflow-hidden rounded-xl bg-[#f1f3f4] outline-none focus-visible:ring-3 focus-visible:ring-[#1967d2]/40"
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
        />
        {document.task.status?.category === "Done" ? (
          <span
            className="pointer-events-none absolute top-2 right-2 z-20 size-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_2px_rgba(255,255,255,0.9)]"
            title="Erledigt"
            aria-label="Task erledigt"
          />
        ) : null}
        {!menuOpen ? <TaskHoverDetails document={document} /> : null}
      </div>

      <div className="px-3 pb-3">
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
