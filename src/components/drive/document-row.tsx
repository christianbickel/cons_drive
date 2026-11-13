"use client";

import { FolderKanban } from "lucide-react";
import { openConsolidateLink } from "@/lib/consolidate/open-link";
import type { DriveDocument } from "@/lib/drive/types";
import { cn } from "@/lib/utils";
import { DocumentCardMenu } from "./document-card-menu";
import { FileTypeIcon } from "./document-thumbnail";
import { formatDriveDate, formatFileSize } from "./format";

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

export function DocumentListHeader() {
  return (
    <div className="hidden grid-cols-[minmax(0,2.2fr)_minmax(0,1.4fr)_minmax(0,1fr)_7.5rem_5.5rem_2.5rem] gap-3 border-b border-black/5 px-3 pb-2 text-[0.7rem] font-medium tracking-wide text-[#5f6368] uppercase md:grid">
      <span>Name</span>
      <span>Quelle</span>
      <span>Projekt</span>
      <span>Geändert</span>
      <span className="text-right">Größe</span>
      <span className="sr-only">Aktionen</span>
    </div>
  );
}

export function DocumentRow({ document }: { document: DriveDocument }) {
  const openDocument = () => {
    void openConsolidateLink(document.openUrl);
  };

  return (
    <div
      className={cn(
        "group grid grid-cols-[minmax(0,1fr)_2.5rem] items-center gap-2 rounded-xl px-2 py-2 transition-colors",
        "hover:bg-[#e8f0fe]/70 md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.4fr)_minmax(0,1fr)_7.5rem_5.5rem_2.5rem] md:gap-3 md:px-3"
      )}
    >
      <button
        type="button"
        onClick={openDocument}
        className="flex min-w-0 items-center gap-3 text-left outline-none"
        title={document.name}
      >
        <FileTypeIcon
          previewType={document.previewType}
          className={cn(
            "size-5 shrink-0",
            fileIconTone(document.previewType)
          )}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-[#1f1f1f]">
            {document.name}
          </span>
          <span className="mt-0.5 block truncate text-xs text-[#5f6368] md:hidden">
            {[document.task.name, document.project?.name]
              .filter(Boolean)
              .join(" · ") || "—"}
          </span>
        </span>
      </button>

      <p className="hidden min-w-0 truncate text-sm text-[#3c4043] md:block">
        {document.task.name || "—"}
      </p>

      <p className="hidden min-w-0 items-center gap-1.5 truncate text-sm text-[#3c4043] md:flex">
        {document.project?.name ? (
          <>
            <FolderKanban
              className="size-3.5 shrink-0 text-[#5f6368]"
              aria-hidden
            />
            <span className="truncate">{document.project.name}</span>
          </>
        ) : (
          "—"
        )}
      </p>

      <p className="hidden text-sm tabular-nums text-[#5f6368] md:block">
        {formatDriveDate(document.modifiedAt ?? document.createdAt)}
      </p>

      <p className="hidden text-right text-sm tabular-nums text-[#5f6368] md:block">
        {formatFileSize(document.size)}
      </p>

      <div className="flex justify-end">
        <DocumentCardMenu document={document} />
      </div>
    </div>
  );
}
