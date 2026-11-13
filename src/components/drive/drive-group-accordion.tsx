"use client";

import { ChevronRight } from "lucide-react";
import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { countGroupDocuments } from "@/lib/drive/helpers";
import type { DriveDocumentGroup, DriveViewMode } from "@/lib/drive/types";
import { cn } from "@/lib/utils";
import { DocumentCard } from "./document-card";
import { DocumentListHeader, DocumentRow } from "./document-row";

function GroupSection({
  group,
  defaultOpen,
  depth = 0,
  viewMode,
}: {
  group: DriveDocumentGroup;
  defaultOpen: boolean;
  depth?: number;
  viewMode: DriveViewMode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const total = countGroupDocuments(group);
  const hasChildren = Boolean(group.children?.length);
  const headingClass =
    depth === 0
      ? "text-[0.95rem] font-medium tracking-tight text-[#1f1f1f]"
      : depth === 1
        ? "text-[0.9rem] font-medium text-[#1f1f1f]"
        : "text-sm font-medium text-[#3c4043]";

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <section className={cn("space-y-3", depth > 0 && "ml-3 sm:ml-5")}>
        <CollapsibleTrigger
          className={cn(
            "group/acc flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-left outline-none transition-colors",
            "hover:bg-black/[0.03] focus-visible:ring-3 focus-visible:ring-ring/50"
          )}
        >
          <ChevronRight
            className={cn(
              "size-5 shrink-0 text-[#5f6368] transition-transform duration-150 ease-[cubic-bezier(0.2,0,0,1)]",
              open && "rotate-90"
            )}
            aria-hidden
          />
          <h2 className={headingClass}>{group.label}</h2>
          <span className="ml-1 text-sm tabular-nums text-[#5f6368]">
            {total}
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {hasChildren ? (
            <div className="space-y-4 border-l border-black/5 pl-2 sm:pl-3">
              {group.children!.map((child) => (
                <GroupSection
                  key={child.key}
                  group={child}
                  defaultOpen={depth < 1}
                  depth={depth + 1}
                  viewMode={viewMode}
                />
              ))}
            </div>
          ) : viewMode === "list" ? (
            <div className="overflow-hidden rounded-2xl border border-black/5 bg-white px-1 py-2 shadow-[0_1px_2px_0_rgba(60,64,67,0.15)]">
              <DocumentListHeader />
              <div className="divide-y divide-black/[0.04]">
                {group.documents.map((document) => (
                  <DocumentRow key={document.id} document={document} />
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
              {group.documents.map((document) => (
                <DocumentCard key={document.id} document={document} />
              ))}
            </div>
          )}
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}

export function DriveGroupAccordion({
  groups,
  viewMode,
}: {
  groups: DriveDocumentGroup[];
  viewMode: DriveViewMode;
}) {
  if (groups.every((g) => countGroupDocuments(g) === 0)) {
    return (
      <div className="rounded-2xl border border-dashed border-black/10 bg-white/60 px-6 py-16 text-center">
        <p className="text-sm font-medium text-[#1f1f1f]">
          Keine Dokumente gefunden
        </p>
        <p className="mt-1 text-sm text-[#5f6368]">
          Anhänge aus Consolidate-Tasks und E-Mails erscheinen hier, sobald sie für dich
          sichtbar sind.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <GroupSection
          key={group.key}
          group={group}
          defaultOpen
          viewMode={viewMode}
        />
      ))}
    </div>
  );
}
