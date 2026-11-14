import type {
  DriveCompanyFilter,
  DriveDocument,
  DriveDocumentGroup,
  DriveFileTypeFilter,
  DriveGroupBy,
  DriveGroupField,
  DriveModifiedFilter,
  DriveModifiedPreset,
  DriveOriginFilter,
  DrivePreviewType,
  DriveProjectFilter,
  DriveSearchScope,
  DriveSortBy,
  DriveViewMode,
} from "@/lib/drive/types";

const GROUP_FIELDS: DriveGroupField[] = [
  "project",
  "responsible",
  "taskType",
];

export const DRIVE_GROUP_FIELD_OPTIONS: Array<{
  value: DriveGroupField;
  label: string;
}> = [
  { value: "project", label: "Projekt" },
  { value: "responsible", label: "Verantwortlicher" },
  { value: "taskType", label: "Task-Typ" },
];

const PREVIEW_TYPES: DrivePreviewType[] = [
  "Pdf",
  "Office",
  "Image",
  "Video",
  "Audio",
  "Text",
  "Other",
];

const MODIFIED_PRESETS: DriveModifiedPreset[] = [
  "all",
  "today",
  "days7",
  "days30",
  "thisYear",
  "lastYear",
  "custom",
];

export const DRIVE_FILE_TYPE_OPTIONS: Array<{
  value: DriveFileTypeFilter;
  label: string;
}> = [
  { value: "all", label: "Alle Typen" },
  { value: "Pdf", label: "PDFs" },
  { value: "Office", label: "Office" },
  { value: "Image", label: "Fotos und Bilder" },
  { value: "Video", label: "Videos" },
  { value: "Audio", label: "Audio" },
  { value: "Text", label: "Dokumente" },
  { value: "Other", label: "Sonstige" },
];

export function modifiedPresetLabel(
  preset: DriveModifiedPreset,
  now = new Date()
): string {
  const year = now.getFullYear();
  switch (preset) {
    case "today":
      return "Heute";
    case "days7":
      return "Letzte sieben Tage";
    case "days30":
      return "Letzte 30 Tage";
    case "thisYear":
      return `Dieses Jahr (${year})`;
    case "lastYear":
      return `Letztes Jahr (${year - 1})`;
    case "custom":
      return "Benutzerdefinierter Zeitraum";
    default:
      return "Beliebiger Zeitpunkt";
  }
}

export const DRIVE_MODIFIED_PRESET_OPTIONS: DriveModifiedPreset[] = [
  "today",
  "days7",
  "days30",
  "thisYear",
  "lastYear",
];

export const DRIVE_SEARCH_SCOPE_OPTIONS: Array<{
  value: DriveSearchScope;
  label: string;
  description: string;
}> = [
  {
    value: "name",
    label: "Dateiname",
    description: "Nur im Dateinamen suchen",
  },
  {
    value: "fulltext",
    label: "Volltext",
    description: "In Tasks, E-Mails und Dokumentinhalten suchen",
  },
];

function groupKeyAndLabel(
  doc: DriveDocument,
  field: DriveGroupField
): { key: string; label: string } {
  if (field === "project") {
    return {
      key: doc.project?.id ?? "none",
      label: doc.project?.name ?? "Ohne Projekt",
    };
  }
  if (field === "responsible") {
    return {
      key: doc.responsible?.id ?? "none",
      label: doc.responsible?.name ?? "Ohne Verantwortlichen",
    };
  }
  return {
    key: doc.taskType?.key ?? "none",
    label: doc.taskType?.name ?? "Ohne Task-Typ",
  };
}

function sortGroups(groups: DriveDocumentGroup[]): DriveDocumentGroup[] {
  return [...groups].sort((a, b) => {
    if (a.key === "none") return 1;
    if (b.key === "none") return -1;
    return a.label.localeCompare(b.label, "de");
  });
}

function groupDocumentsByField(
  documents: DriveDocument[],
  field: DriveGroupField
): DriveDocumentGroup[] {
  const map = new Map<string, DriveDocumentGroup>();

  for (const doc of documents) {
    const { key, label } = groupKeyAndLabel(doc, field);
    const existing = map.get(key);
    if (existing) {
      existing.documents.push(doc);
    } else {
      map.set(key, { key, label, documents: [doc] });
    }
  }

  return sortGroups([...map.values()]);
}

/** Groups documents by one or more ordered dimensions (nested). */
export function groupDriveDocuments(
  documents: DriveDocument[],
  groupBy: DriveGroupBy
): DriveDocumentGroup[] {
  if (groupBy.length === 0) {
    return [
      {
        key: "all",
        label: "Dokumente",
        documents,
      },
    ];
  }

  const [field, ...rest] = groupBy;
  const groups = groupDocumentsByField(documents, field!);

  if (rest.length === 0) return groups;

  return groups.map((group) => ({
    ...group,
    children: groupDriveDocuments(group.documents, rest),
    documents: [],
  }));
}

export function countGroupDocuments(group: DriveDocumentGroup): number {
  if (group.children?.length) {
    return group.children.reduce(
      (sum, child) => sum + countGroupDocuments(child),
      0
    );
  }
  return group.documents.length;
}

export function toggleDriveGroupField(
  groupBy: DriveGroupBy,
  field: DriveGroupField
): DriveGroupBy {
  if (groupBy.includes(field)) {
    return groupBy.filter((item) => item !== field);
  }
  return [...groupBy, field];
}

export function paginateDocuments<T>(
  items: T[],
  page: number,
  pageSize: number
): {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
} {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    pageSize,
    total,
    totalPages,
  };
}

export function parseDriveGroupBy(raw: string | undefined): DriveGroupBy {
  if (!raw || raw === "none") return [];
  const seen = new Set<DriveGroupField>();
  const result: DriveGroupBy = [];
  for (const part of raw.split(/[,+]/).map((item) => item.trim())) {
    if (!(GROUP_FIELDS as string[]).includes(part)) continue;
    const field = part as DriveGroupField;
    if (seen.has(field)) continue;
    seen.add(field);
    result.push(field);
  }
  return result;
}

export function serializeDriveGroupBy(groupBy: DriveGroupBy): string {
  return groupBy.length === 0 ? "none" : groupBy.join(",");
}

export function parseDriveSortBy(raw: string | undefined): DriveSortBy {
  if (raw === "modified" || raw === "name" || raw === "size") return raw;
  return "created";
}

export function parseDriveFileType(
  raw: string | undefined
): DriveFileTypeFilter {
  if (!raw || raw === "all") return "all";
  if ((PREVIEW_TYPES as string[]).includes(raw)) {
    return raw as DrivePreviewType;
  }
  return "all";
}

/** Project id from the URL, or `all` when unset/invalid. */
export function parseDriveProjectFilter(
  raw: string | undefined
): DriveProjectFilter {
  const value = raw?.trim();
  if (!value || value === "all") return "all";
  return value;
}

export function isProjectFilterActive(project: DriveProjectFilter): boolean {
  return project !== "all";
}

export function parseDriveCompanyFilter(
  raw: string | string[] | undefined
): DriveCompanyFilter {
  const parts = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const ids = parts
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);
  return [...new Set(ids)];
}

export function isCompanyFilterActive(companies: DriveCompanyFilter): boolean {
  return companies.length > 0;
}

export function filterDriveDocumentsByCompany(
  documents: DriveDocument[],
  companies: DriveCompanyFilter
): DriveDocument[] {
  if (companies.length === 0) return documents;
  const selected = new Set(companies);
  return documents.filter((doc) =>
    (doc.companies ?? []).some((company) => selected.has(company.id))
  );
}

export const DRIVE_ORIGIN_OPTIONS: Array<{
  value: DriveOriginFilter;
  label: string;
}> = [
  { value: "all", label: "Alle Dokumente" },
  { value: "email", label: "Nur aus E-Mails" },
  { value: "task", label: "Nur aus Tasks" },
];

export function parseDriveOriginFilter(
  raw: string | undefined
): DriveOriginFilter {
  if (raw === "email" || raw === "task") return raw;
  return "all";
}

/** Project filter or any grouping implies task attachments only (emails have no project). */
export function requiresTaskOnlyOrigin(
  project: DriveProjectFilter | undefined,
  groupBy: DriveGroupBy
): boolean {
  return isProjectFilterActive(project ?? "all") || groupBy.length > 0;
}

export function resolveDriveOriginFilter(
  origin: DriveOriginFilter | undefined,
  project: DriveProjectFilter | undefined,
  groupBy: DriveGroupBy
): DriveOriginFilter {
  if (requiresTaskOnlyOrigin(project, groupBy)) return "task";
  return origin ?? "all";
}

export function isOriginFilterActive(origin: DriveOriginFilter): boolean {
  return origin !== "all";
}

export function filterDriveDocumentsByOrigin(
  documents: DriveDocument[],
  origin: DriveOriginFilter
): DriveDocument[] {
  if (origin === "all") return documents;
  return documents.filter((doc) => doc.source === origin);
}

export function parseDriveSearchScope(
  raw: string | undefined
): DriveSearchScope {
  if (raw === "fulltext") return "fulltext";
  return "name";
}

export function parseDriveViewMode(raw: string | undefined): DriveViewMode {
  if (raw === "list") return "list";
  return "thumbs";
}

function isIsoDate(value: string | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function parseDriveModifiedFilter(options: {
  modified?: string;
  from?: string;
  to?: string;
}): DriveModifiedFilter {
  const raw = options.modified;
  if (!raw || raw === "all" || !(MODIFIED_PRESETS as string[]).includes(raw)) {
    return { preset: "all" };
  }
  const preset = raw as DriveModifiedPreset;
  if (preset === "custom") {
    return {
      preset,
      from: isIsoDate(options.from) ? options.from : undefined,
      to: isIsoDate(options.to) ? options.to : undefined,
    };
  }
  return { preset };
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfLocalDay(date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999
  );
}

function parseIsoDateLocal(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

/** Inclusive local-time range for the modified filter, or null if unrestricted. */
export function getModifiedFilterRange(
  filter: DriveModifiedFilter,
  now = new Date()
): { start: Date; end: Date } | null {
  if (filter.preset === "all") return null;

  if (filter.preset === "custom") {
    const from = filter.from ? parseIsoDateLocal(filter.from) : null;
    const to = filter.to ? parseIsoDateLocal(filter.to) : null;
    if (!from && !to) return null;
    const start = startOfLocalDay(from ?? to!);
    const end = endOfLocalDay(to ?? from!);
    if (start.getTime() <= end.getTime()) return { start, end };
    return {
      start: startOfLocalDay(to!),
      end: endOfLocalDay(from!),
    };
  }

  const end = endOfLocalDay(now);
  if (filter.preset === "today") {
    return { start: startOfLocalDay(now), end };
  }
  if (filter.preset === "days7") {
    const start = startOfLocalDay(now);
    start.setDate(start.getDate() - 6);
    return { start, end };
  }
  if (filter.preset === "days30") {
    const start = startOfLocalDay(now);
    start.setDate(start.getDate() - 29);
    return { start, end };
  }
  if (filter.preset === "thisYear") {
    return {
      start: new Date(now.getFullYear(), 0, 1),
      end,
    };
  }
  const year = now.getFullYear() - 1;
  return {
    start: new Date(year, 0, 1),
    end: endOfLocalDay(new Date(year, 11, 31)),
  };
}

/**
 * Split a user query into terms (whitespace-separated).
 * Quoted phrases stay intact; otherwise each word is its own AND-term.
 */
export function parseSearchTerms(query: string): string[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const terms: string[] = [];
  const tokenPattern = /"([^"]+)"|(\S+)/g;
  for (const match of trimmed.matchAll(tokenPattern)) {
    const term = (match[1] ?? match[2] ?? "").trim().toLowerCase();
    if (term) terms.push(term);
  }
  return terms;
}

/** Build a Consolidate/Elastic-style AND query from space-separated terms. */
export function toAndSearchString(query: string): string {
  const trimmed = query.trim();
  if (!trimmed) return "";

  const parts: string[] = [];
  const tokenPattern = /"([^"]+)"|(\S+)/g;
  for (const match of trimmed.matchAll(tokenPattern)) {
    if (match[1] !== undefined) {
      parts.push(`"${match[1].trim()}"`);
      continue;
    }
    const raw = (match[2] ?? "").trim();
    if (!raw) continue;
    // Keep explicit operators / exclusions as typed.
    if (/^(AND|OR|NOT)$/i.test(raw) || raw.startsWith("!")) {
      parts.push(raw);
      continue;
    }
    parts.push(raw);
  }

  if (parts.length <= 1) return parts[0] ?? trimmed;

  const alreadyAnd = parts.some(
    (part, index) => index > 0 && /^AND$/i.test(part)
  );
  if (alreadyAnd) return parts.join(" ");

  return parts
    .filter((part) => !/^(AND|OR)$/i.test(part))
    .join(" AND ");
}

function documentNameSearchHaystack(doc: DriveDocument): string {
  return doc.name.toLowerCase();
}

export function filterDriveDocumentsByName(
  documents: DriveDocument[],
  query: string
): DriveDocument[] {
  const terms = parseSearchTerms(query);
  if (terms.length === 0) return documents;
  return documents.filter((doc) => {
    const haystack = documentNameSearchHaystack(doc);
    // Every term must match (AND), not any term (OR).
    return terms.every((term) => haystack.includes(term));
  });
}

export function filterDriveDocumentsByType(
  documents: DriveDocument[],
  fileType: DriveFileTypeFilter
): DriveDocument[] {
  if (fileType === "all") return documents;
  return documents.filter((doc) => doc.previewType === fileType);
}

export function filterDriveDocumentsByModified(
  documents: DriveDocument[],
  filter: DriveModifiedFilter
): DriveDocument[] {
  const range = getModifiedFilterRange(filter);
  if (!range) return documents;
  return documents.filter((doc) => {
    const raw = doc.modifiedAt ?? doc.createdAt;
    if (!raw) return false;
    const ts = Date.parse(raw);
    if (Number.isNaN(ts)) return false;
    return ts >= range.start.getTime() && ts <= range.end.getTime();
  });
}

export function filterDriveDocumentsByProject(
  documents: DriveDocument[],
  project: DriveProjectFilter
): DriveDocument[] {
  if (project === "all") return documents;
  return documents.filter((doc) => doc.project?.id === project);
}

/** Server/client shared pipeline: filter → sort → paginate. */
export function prepareDriveDocumentPage(
  documents: DriveDocument[],
  options: {
    query: string;
    searchScope: DriveSearchScope;
    suggested?: boolean;
    fileType: DriveFileTypeFilter;
    project: DriveProjectFilter;
    companies?: DriveCompanyFilter;
    origin: DriveOriginFilter;
    modified: DriveModifiedFilter;
    sortBy: DriveSortBy;
    page: number;
    pageSize: number;
  }
) {
  const named =
    options.suggested || options.searchScope === "fulltext"
      ? documents
      : filterDriveDocumentsByName(documents, options.query);
  const typed = filterDriveDocumentsByType(named, options.fileType);
  const byOrigin = filterDriveDocumentsByOrigin(typed, options.origin);
  const byProject = filterDriveDocumentsByProject(byOrigin, options.project);
  const byCompany = filterDriveDocumentsByCompany(
    byProject,
    options.companies ?? []
  );
  const filtered = filterDriveDocumentsByModified(byCompany, options.modified);
  const sorted = sortDriveDocuments(filtered, options.sortBy);
  return paginateDocuments(sorted, options.page, options.pageSize);
}

export function isModifiedFilterActive(filter: DriveModifiedFilter): boolean {
  if (filter.preset === "all") return false;
  if (filter.preset === "custom") {
    return Boolean(filter.from || filter.to);
  }
  return true;
}

function timestampForSort(doc: DriveDocument, sortBy: DriveSortBy): number {
  const raw =
    sortBy === "modified"
      ? doc.modifiedAt ?? doc.createdAt
      : doc.createdAt ?? doc.modifiedAt;
  return raw ? Date.parse(raw) : 0;
}

/** created/modified/size descending; name ascending (A–Z). */
export function sortDriveDocuments(
  documents: DriveDocument[],
  sortBy: DriveSortBy
): DriveDocument[] {
  if (sortBy === "name") {
    return [...documents].sort((a, b) =>
      a.name.localeCompare(b.name, "de", { sensitivity: "base" })
    );
  }
  if (sortBy === "size") {
    return [...documents].sort((a, b) => b.size - a.size);
  }
  return [...documents].sort(
    (a, b) => timestampForSort(b, sortBy) - timestampForSort(a, sortBy)
  );
}

export function drivePath(options: {
  groupBy: DriveGroupBy;
  sortBy: DriveSortBy;
  page?: number;
  pageSize: number;
  q?: string;
  type?: DriveFileTypeFilter;
  project?: DriveProjectFilter;
  companies?: DriveCompanyFilter;
  origin?: DriveOriginFilter;
  modified?: DriveModifiedFilter;
  scope?: DriveSearchScope;
  view?: DriveViewMode;
}): string {
  const params = new URLSearchParams();
  params.set("group", serializeDriveGroupBy(options.groupBy));
  params.set("sort", options.sortBy);
  params.set("page", String(options.page ?? 1));
  params.set("pageSize", String(options.pageSize));
  const q = options.q?.trim();
  if (q) params.set("q", q);
  if (options.type && options.type !== "all") {
    params.set("type", options.type);
  }
  if (options.project && options.project !== "all") {
    params.set("project", options.project);
  }
  for (const companyId of options.companies ?? []) {
    if (companyId) params.append("company", companyId);
  }
  const origin = resolveDriveOriginFilter(
    options.origin,
    options.project,
    options.groupBy
  );
  if (origin !== "all") {
    params.set("origin", origin);
  }
  if (options.scope && options.scope !== "name") {
    params.set("scope", options.scope);
  }
  if (options.view && options.view !== "thumbs") {
    params.set("view", options.view);
  }
  const modified = options.modified;
  if (modified && modified.preset !== "all") {
    params.set("modified", modified.preset);
    if (modified.preset === "custom") {
      if (modified.from) params.set("from", modified.from);
      if (modified.to) params.set("to", modified.to);
    }
  }
  return `/drive?${params.toString()}`;
}
