"use client";

import type { DriveDocument } from "@/lib/drive/types";
import { cn } from "@/lib/utils";
import { formatRelativeMoment } from "./format";

function DetailRow({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="grid grid-cols-[4.75rem_minmax(0,1fr)] gap-x-2">
      <dt className="text-[0.65rem] font-medium tracking-wide text-[#5f6368]">
        {label}
      </dt>
      <dd className="truncate text-[0.7rem] text-[#1f1f1f]">
        {value?.trim() || "—"}
      </dd>
    </div>
  );
}

/**
 * Task/E-Mail details below the thumbnail.
 * Shown while the thumbnail is hovered (desktop) or when `open` (mobile tap).
 * Absolutely positioned so the grid layout height stays unchanged.
 */
export function TaskHoverDetails({
  document: driveDocument,
  open = false,
}: {
  document: DriveDocument;
  open?: boolean;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute top-full right-0 -left-2 z-20 -mr-2 rounded-b-2xl bg-white px-3 pt-2 pb-3 shadow-[0_1px_3px_0_rgba(60,64,67,0.3),0_4px_8px_3px_rgba(60,64,67,0.15)] transition-opacity duration-150 ease-[cubic-bezier(0.2,0,0,1)]",
        open ? "opacity-100" : "opacity-0"
      )}
      role="tooltip"
    >
      <dl className="space-y-0.5">
        {driveDocument.source === "email" ? (
          <>
            <DetailRow
              label="Betreff"
              value={driveDocument.email?.subject ?? driveDocument.task.name}
            />
            <DetailRow label="Absender" value={driveDocument.email?.from} />
            <DetailRow
              label="Gesendet"
              value={formatRelativeMoment(driveDocument.email?.sentAt)}
            />
          </>
        ) : (
          <>
            <DetailRow label="Typ" value={driveDocument.taskType?.name} />
            <DetailRow label="Status" value={driveDocument.task.status?.name} />
            <DetailRow
              label="Verantw."
              value={driveDocument.responsible?.name}
            />
            <DetailRow label="Task" value={driveDocument.task.name} />
            <DetailRow label="Projekt" value={driveDocument.project?.name} />
            <DetailRow
              label="Geändert"
              value={formatRelativeMoment(
                driveDocument.modifiedAt ?? driveDocument.createdAt
              )}
            />
          </>
        )}
      </dl>
    </div>
  );
}
