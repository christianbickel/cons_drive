export interface DriveUserRef {
  id: string;
  displayName: string;
  email?: string;
}

export type DrivePreviewType =
  | "Image"
  | "Video"
  | "Audio"
  | "Pdf"
  | "Office"
  | "Text"
  | "Other";

/** `all` = no file-type restriction. */
export type DriveFileTypeFilter = "all" | DrivePreviewType;

/** `all` = no project restriction; otherwise Consolidate project id. */
export type DriveProjectFilter = "all" | string;

/** Recent project option for the Projekt filter dropdown. */
export interface DriveProjectOption {
  id: string;
  name: string;
}

/** Document origin: Task attachments, E-Mail attachments, or both. */
export type DriveOriginFilter = "all" | "email" | "task";

/** How the search box query is applied. */
export type DriveSearchScope = "name" | "fulltext";

/** Document layout: thumbnail grid or compact list. */
export type DriveViewMode = "thumbs" | "list";

export type DriveModifiedPreset =
  | "all"
  | "today"
  | "days7"
  | "days30"
  | "thisYear"
  | "lastYear"
  | "custom";

export interface DriveModifiedFilter {
  preset: DriveModifiedPreset;
  /** Inclusive start date `YYYY-MM-DD` (custom preset). */
  from?: string;
  /** Inclusive end date `YYYY-MM-DD` (custom preset). */
  to?: string;
}

/** Single grouping dimension (order in `DriveGroupBy` = hierarchy). */
export type DriveGroupField = "project" | "responsible" | "taskType";

/** Ordered grouping levels; empty = no grouping. */
export type DriveGroupBy = DriveGroupField[];

/** created/modified/size: descending; name: A–Z. */
export type DriveSortBy = "created" | "modified" | "name" | "size";

/** Parent entity that owns the attachment in Consolidate. */
export type DriveDocumentSource = "task" | "email";

/** Attachment from a Consolidate Task or E-Mail, enriched for Drive UI. */
export interface DriveDocument {
  id: string;
  name: string;
  size: number;
  contentType?: string;
  previewType: DrivePreviewType;
  createdAt?: string;
  modifiedAt?: string;
  /** Authenticated thumbnail proxy URL (same-origin). */
  thumbnailUrl: string;
  /** Authenticated download proxy URL (same-origin). */
  downloadUrl: string;
  /** Opens Consolidate attachment viewer. */
  openUrl: string;
  /** Whether the parent is a Task or an E-Mail conversation. */
  source: DriveDocumentSource;
  /** Parent Task or E-Mail (subject / display name). */
  task: {
    id: string;
    name: string;
    url?: string;
    status?: {
      name: string;
      category?: string;
    };
  };
  /** Present for `source: "email"` — subject + sender for hover/meta. */
  email?: {
    subject: string;
    from?: string;
    /** ISO send/receive time from the email envelope. */
    sentAt?: string;
  };
  project?: {
    id: string;
    name: string;
  };
  responsible?: {
    id: string;
    name: string;
  };
  taskType?: {
    key: string;
    name: string;
    color?: string;
  };
}

export interface DriveDocumentGroup {
  key: string;
  label: string;
  /** Leaf documents when this group has no further nesting. */
  documents: DriveDocument[];
  /** Nested groups for additional `DriveGroupBy` levels. */
  children?: DriveDocumentGroup[];
}
