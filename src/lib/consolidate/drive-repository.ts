import "server-only";

import type {
  DriveCompanyOption,
  DriveDocument,
  DriveFilterOption,
  DrivePreviewType,
  DriveProjectOption,
} from "@/lib/drive/types";
import { toAndSearchString } from "@/lib/drive/helpers";
import { getAuthSession } from "@/lib/auth/session";
import { consolidateGraphql } from "./client";
import {
  ConsolidateApiError,
  isConsolidateConversionError,
} from "./errors";
import {
  consolidateAttachmentViewUrl,
  consolidateEntryUrl,
  consolidateMailConversationUrl,
} from "./urls";

interface AttachmentNode {
  id: string;
  name: string;
  size: number;
  contentType?: string | null;
  previewType: DrivePreviewType;
  /** Tokenized Consolidate download URL (needed for E-Mail attachments). */
  downloadUrl?: string | null;
  created?: string | null;
  lastModified?: string | null;
  createdBy?: { id: string; displayName?: string | null } | null;
  lastModifiedBy?: { id: string; displayName?: string | null } | null;
}

interface AssociationEntityNode {
  __typename?: string;
  id?: string;
  displayName?: string | null;
}

interface AssociationItemNode {
  entityId?: string | null;
  entity?: AssociationEntityNode | null;
}

interface TaskNode {
  id: string;
  displayName: string;
  attachmentsCount: number;
  dataTypes: Array<{
    key: string;
    displayName: string;
    color?: string | null;
  }>;
  values: {
    subject?: string | null;
    status?: { name: string; category?: string | null } | null;
    responsible?: { id: string; displayName: string } | null;
    project?: { id: string; displayName: string; databaseId?: string | null } | null;
  };
  attachments: AttachmentNode[];
  associations?: { items?: AssociationItemNode[] | null } | null;
}

interface EmailConversationTaskNode {
  id: string;
  displayName: string;
  values?: {
    subject?: string | null;
    project?: { id: string; displayName: string; databaseId?: string | null } | null;
    responsible?: { id: string; displayName: string } | null;
  } | null;
}

interface EmailAddressNode {
  name?: string | null;
  email?: string | null;
}

interface EmailNode {
  id: string;
  hasAttachments: boolean;
  attachments: AttachmentNode[];
  envelope?: {
    subject?: string | null;
    date?: string | null;
    from?: EmailAddressNode[] | null;
  } | null;
}

interface EmailConversationNode {
  id: string;
  subject: string;
  attachmentsCount: number;
  date?: string | null;
  lastModified?: string | null;
  emails: EmailNode[];
  tasks: EmailConversationTaskNode[];
  associations?: { items?: AssociationItemNode[] | null } | null;
}

interface EmailFolderConversationNode {
  id: string;
  conversationId: string;
  folder?: string;
  conversation: EmailConversationNode;
}

type FolderConversationsPage = {
  mailboxFolderConversations: {
    pageInfo: { hasNextPage: boolean; endCursor?: string | null };
    nodes: Array<EmailFolderConversationNode | null>;
  };
};

interface MailboxFolderNode {
  id: string;
  name?: string | null;
  type?: string | null;
}

const ATTACHMENT_SELECTION = `
  id
  name
  size
  contentType
  previewType
  downloadUrl
  created
  lastModified
  createdBy { id displayName }
  lastModifiedBy { id displayName }
`;

/** Consolidate "Relations" — companies linked to Task / E-Mail. */
const ASSOCIATION_COMPANY_SELECTION = `
  associations {
    items {
      entity {
        __typename
        ... on Company { id displayName }
      }
    }
  }
`;

function companiesFromAssociations(
  associations: { items?: AssociationItemNode[] | null } | null | undefined
): Array<{ id: string; name: string }> {
  const companies: Array<{ id: string; name: string }> = [];
  const seen = new Set<string>();
  for (const item of associations?.items ?? []) {
    const entity = item.entity;
    if (!entity || entity.__typename !== "Company" || !entity.id) continue;
    if (seen.has(entity.id)) continue;
    seen.add(entity.id);
    companies.push({
      id: entity.id,
      name: entity.displayName?.trim() || "Unternehmen",
    });
  }
  return companies;
}

/** Proxy URLs; include tokenized `u` so E-Mail attachments resolve (root `attachment(id:)` is null). */
function driveAttachmentProxyUrls(attachment: AttachmentNode): {
  thumbnailUrl: string;
  downloadUrl: string;
} {
  const id = encodeURIComponent(attachment.id);
  const remote = attachment.downloadUrl?.trim();
  const u = remote ? `&u=${encodeURIComponent(remote)}` : "";
  const name = attachment.name?.trim()
    ? `&name=${encodeURIComponent(attachment.name)}`
    : "";
  return {
    thumbnailUrl: `/api/drive/thumbnail?id=${id}${u}`,
    downloadUrl: `/api/drive/download?id=${id}${u}${name}`,
  };
}

const TASK_SELECTION = `
  id
  displayName
  attachmentsCount
  dataTypes { key displayName color }
  values {
    subject
    status { name category }
    responsible { id displayName }
    project { id displayName databaseId }
  }
  attachments {
    ${ATTACHMENT_SELECTION}
  }
  ${ASSOCIATION_COMPANY_SELECTION}
`;

const EMAIL_CONVERSATION_SELECTION = `
  id
  subject
  attachmentsCount
  date
  lastModified
  emails {
    id
    hasAttachments
    envelope {
      subject
      date
      from { name email }
    }
    attachments {
      ${ATTACHMENT_SELECTION}
    }
  }
  tasks {
    id
    displayName
    values {
      subject
      project { id displayName databaseId }
      responsible { id displayName }
    }
  }
  ${ASSOCIATION_COMPANY_SELECTION}
`;

const LIST_TASKS_WITH_ATTACHMENTS = `
  query DriveTasksWithAttachments(
    $take: Int!
    $skip: Int!
    $order: [IOrderOperationInput!]
    $filter: [IFilterableInput!]
  ) {
    dataEntries_Task(
      take: $take
      skip: $skip
      order: $order
      filter: $filter
    ) {
      totalCount
      pageInfo { hasNextPage }
      items {
        ${TASK_SELECTION}
      }
    }
  }
`;

const LIST_RECENT_TASKS_WITH_ATTACHMENTS = `
  query DriveSuggestedTasksWithAttachments(
    $take: Int!
    $skip: Int!
    $order: [IOrderOperationInput!]
    $filter: [IFilterableInput!]
  ) {
    dataEntries_Task(
      take: $take
      skip: $skip
      order: $order
      filter: $filter
    ) {
      totalCount
      pageInfo { hasNextPage }
      items {
        ${TASK_SELECTION}
      }
    }
  }
`;

/** Lean selection for project picker — no download URLs / previews. */
const PROJECT_TASK_SELECTION = `
  id
  values {
    responsible { id }
    project { id displayName databaseId }
  }
  attachments {
    id
    createdBy { id }
    lastModifiedBy { id }
  }
`;

const LIST_RECENT_TASKS_FOR_PROJECTS = `
  query DriveRecentTasksForProjects(
    $take: Int!
    $skip: Int!
    $order: [IOrderOperationInput!]
    $filter: [IFilterableInput!]
  ) {
    dataEntries_Task(
      take: $take
      skip: $skip
      order: $order
      filter: $filter
    ) {
      pageInfo { hasNextPage }
      items {
        ${PROJECT_TASK_SELECTION}
      }
    }
  }
`;

const HAS_ATTACHMENTS_FILTER = [
  {
    metadata: {
      type: "HasAttachments",
      operation: { eq: true },
    },
  },
];

const LAST_MODIFIED_DESC = [
  { metadata: { type: "LastModified", direction: "Descending" } },
];

type TaskPageResult = {
  dataEntries_Task: {
    totalCount?: number;
    pageInfo: { hasNextPage: boolean };
    items: TaskNode[];
  };
};

/**
 * Fetch a Task page; if Consolidate fails on a corrupt document, binary-split
 * the range so healthy siblings still load.
 */
async function fetchTaskPageResilient(options: {
  query: string;
  take: number;
  skip: number;
  order: typeof LAST_MODIFIED_DESC;
  filter: typeof HAS_ATTACHMENTS_FILTER;
}): Promise<{ items: TaskNode[]; hasNextPage: boolean; skippedCorrupt: boolean }> {
  const { query, take, skip, order, filter } = options;
  try {
    const data = await consolidateGraphql<TaskPageResult>(query, {
      take,
      skip,
      order,
      filter,
    });
    return {
      items: data.dataEntries_Task.items ?? [],
      hasNextPage: Boolean(data.dataEntries_Task.pageInfo.hasNextPage),
      skippedCorrupt: false,
    };
  } catch (error) {
    if (!isConsolidateConversionError(error)) throw error;
    if (take <= 1) {
      // Skip the single corrupt document and keep paging.
      return { items: [], hasNextPage: true, skippedCorrupt: true };
    }
    const leftTake = Math.ceil(take / 2);
    const rightTake = take - leftTake;
    const left = await fetchTaskPageResilient({
      query,
      take: leftTake,
      skip,
      order,
      filter,
    });
    const right = await fetchTaskPageResilient({
      query,
      take: rightTake,
      skip: skip + leftTake,
      order,
      filter,
    });
    return {
      items: [...left.items, ...right.items],
      hasNextPage: left.hasNextPage || right.hasNextPage,
      skippedCorrupt: left.skippedCorrupt || right.skippedCorrupt,
    };
  }
}

const GLOBAL_SEARCH_TASKS_WITH_ATTACHMENTS = `
  query DriveFulltextTasksWithAttachments(
    $searchString: String
    $take: Int!
    $skip: Int!
  ) {
    globalSearch(
      searchString: $searchString
      take: $take
      skip: $skip
      dataCollectionHint: "Task"
    ) {
      totalCount
      items {
        __typename
        ... on Task {
          ${TASK_SELECTION}
        }
      }
    }
  }
`;

const GLOBAL_SEARCH_EMAILS_WITH_ATTACHMENTS = `
  query DriveFulltextEmailsWithAttachments(
    $searchString: String
    $take: Int!
    $skip: Int!
  ) {
    globalSearch(
      searchString: $searchString
      take: $take
      skip: $skip
      dataCollectionHint: "email"
    ) {
      totalCount
      items {
        __typename
        ... on EmailConversation {
          ${EMAIL_CONVERSATION_SELECTION}
        }
      }
    }
  }
`;

const LIST_MY_MAILBOXES = `
  query DriveMyMailboxes {
    myMailboxes {
      id
      email
      isDefaultMailbox
      folders { id name type }
    }
  }
`;

const LIST_MAILBOX_FOLDER_CONVERSATIONS = `
  query DriveMailboxFolderConversations(
    $folder: ID!
    $first: Int
    $after: String
  ) {
    mailboxFolderConversations(folder: $folder, first: $first, after: $after) {
      totalCount
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        conversationId
        folder
        conversation {
          ${EMAIL_CONVERSATION_SELECTION}
        }
      }
    }
  }
`;

const EMAIL_FOLDER_TYPES = new Set(["Inbox", "Sent"]);

function mapTaskDocument(
  task: TaskNode,
  attachment: AttachmentNode,
  apiUrl: string | undefined
): DriveDocument {
  const taskType = task.dataTypes[0];
  const proxies = driveAttachmentProxyUrls(attachment);
  return {
    id: attachment.id,
    name: attachment.name,
    size: Number(attachment.size) || 0,
    contentType: attachment.contentType ?? undefined,
    previewType: attachment.previewType ?? "Other",
    createdAt: attachment.created ?? undefined,
    modifiedAt: attachment.lastModified ?? attachment.created ?? undefined,
    thumbnailUrl: proxies.thumbnailUrl,
    downloadUrl: proxies.downloadUrl,
    openUrl: apiUrl
      ? consolidateAttachmentViewUrl(apiUrl, attachment.id)
      : "#",
    source: "task",
    task: {
      id: task.id,
      name: task.values.subject?.trim() || task.displayName,
      url: apiUrl ? consolidateEntryUrl(apiUrl, task.id) : undefined,
      status: task.values.status?.name
        ? {
            name: task.values.status.name,
            category: task.values.status.category ?? undefined,
          }
        : undefined,
    },
    project: task.values.project
      ? {
          id: task.values.project.id,
          name:
            task.values.project.displayName ||
            task.values.project.databaseId ||
            "Projekt",
        }
      : undefined,
    companies: companiesFromAssociations(task.associations),
    responsible: task.values.responsible
      ? {
          id: task.values.responsible.id,
          name: task.values.responsible.displayName,
        }
      : undefined,
    createdBy: attachment.createdBy?.id
      ? {
          id: attachment.createdBy.id,
          name: attachment.createdBy.displayName?.trim() || "Unbekannt",
        }
      : undefined,
    taskType: taskType
      ? {
          key: taskType.key,
          name: taskType.displayName || taskType.key,
          color: taskType.color ?? undefined,
        }
      : undefined,
  };
}

function projectFromConversation(conversation: EmailConversationNode) {
  for (const linked of conversation.tasks ?? []) {
    const project = linked.values?.project;
    if (!project?.id) continue;
    return {
      id: project.id,
      name: project.displayName || project.databaseId || "Projekt",
    };
  }
  return undefined;
}

function responsibleFromConversation(conversation: EmailConversationNode) {
  for (const linked of conversation.tasks ?? []) {
    const responsible = linked.values?.responsible;
    if (!responsible?.id) continue;
    return {
      id: responsible.id,
      name: responsible.displayName,
    };
  }
  return undefined;
}

function formatEmailAddress(address: EmailAddressNode | undefined): string | undefined {
  if (!address) return undefined;
  const name = address.name?.trim();
  const email = address.email?.trim();
  if (name && email) return `${name} <${email}>`;
  return name || email || undefined;
}

function mapEmailDocument(
  conversation: EmailConversationNode,
  email: EmailNode,
  attachment: AttachmentNode,
  apiUrl: string | undefined,
  folderContext?: {
    folderId?: string;
    folderConversationId?: string;
  }
): DriveDocument {
  const subject =
    email.envelope?.subject?.trim() ||
    conversation.subject?.trim() ||
    "E-Mail";
  const from = formatEmailAddress(email.envelope?.from?.[0]);
  const sentAt =
    email.envelope?.date ??
    attachment.created ??
    conversation.date ??
    undefined;

  const proxies = driveAttachmentProxyUrls(attachment);
  return {
    id: attachment.id,
    name: attachment.name,
    size: Number(attachment.size) || 0,
    contentType: attachment.contentType ?? undefined,
    previewType: attachment.previewType ?? "Other",
    createdAt: attachment.created ?? undefined,
    modifiedAt:
      attachment.lastModified ??
      attachment.created ??
      conversation.lastModified ??
      conversation.date ??
      undefined,
    thumbnailUrl: proxies.thumbnailUrl,
    downloadUrl: proxies.downloadUrl,
    openUrl: apiUrl
      ? consolidateAttachmentViewUrl(apiUrl, attachment.id)
      : "#",
    source: "email",
    task: {
      id: conversation.id,
      name: subject,
      url: apiUrl
        ? consolidateMailConversationUrl(apiUrl, conversation.id, folderContext)
        : undefined,
    },
    email: {
      subject,
      from,
      sentAt: sentAt ?? undefined,
    },
    project: projectFromConversation(conversation),
    companies: companiesFromAssociations(conversation.associations),
    responsible: responsibleFromConversation(conversation),
    createdBy: attachment.createdBy?.id
      ? {
          id: attachment.createdBy.id,
          name: attachment.createdBy.displayName?.trim() || "Unbekannt",
        }
      : undefined,
    taskType: {
      key: "email",
      name: "E-Mail",
    },
  };
}

function isTouchedByUser(attachment: AttachmentNode, userId: string): boolean {
  return (
    attachment.createdBy?.id === userId ||
    attachment.lastModifiedBy?.id === userId
  );
}

function documentTimestamp(doc: DriveDocument): number {
  return Date.parse(doc.modifiedAt ?? doc.createdAt ?? "") || 0;
}

function mergeDocuments(documents: DriveDocument[]): DriveDocument[] {
  const byId = new Map<string, DriveDocument>();
  for (const doc of documents) {
    const existing = byId.get(doc.id);
    if (!existing || documentTimestamp(doc) > documentTimestamp(existing)) {
      byId.set(doc.id, doc);
    }
  }
  return [...byId.values()];
}

function flattenConversationDocuments(
  conversation: EmailConversationNode,
  apiUrl: string | undefined,
  seenAttachmentIds: Set<string>,
  folderContext?: {
    folderId?: string;
    folderConversationId?: string;
  }
): DriveDocument[] {
  if (!conversation.attachmentsCount && !conversation.emails?.length) {
    return [];
  }
  const documents: DriveDocument[] = [];
  for (const email of conversation.emails ?? []) {
    if (!email.hasAttachments && !email.attachments?.length) continue;
    for (const attachment of email.attachments ?? []) {
      if (seenAttachmentIds.has(attachment.id)) continue;
      seenAttachmentIds.add(attachment.id);
      documents.push(
        mapEmailDocument(
          conversation,
          email,
          attachment,
          apiUrl,
          folderContext
        )
      );
    }
  }
  return documents;
}

function isDriveEmailFolder(folder: MailboxFolderNode): boolean {
  const type = folder.type?.trim();
  if (type && EMAIL_FOLDER_TYPES.has(type)) return true;
  const name = folder.name?.trim().toLowerCase() ?? "";
  return name === "inbox" || name === "sent" || name === "gesendet";
}

async function listEmailDriveDocuments(options?: {
  maxConversations?: number;
  pageSize?: number;
}): Promise<{
  documents: DriveDocument[];
  scannedConversations: number;
  truncated: boolean;
}> {
  const apiUrl = (await getAuthSession())?.apiUrl;
  const pageSize = options?.pageSize ?? 25;
  const maxConversations = options?.maxConversations ?? 80;
  const documents: DriveDocument[] = [];
  const seenAttachmentIds = new Set<string>();
  let scannedConversations = 0;
  let truncated = false;

  const mailboxesData = await consolidateGraphql<{
    myMailboxes: Array<{
      id: string;
      folders: MailboxFolderNode[];
    }>;
  }>(LIST_MY_MAILBOXES);

  const folders = (mailboxesData.myMailboxes ?? []).flatMap((mailbox) =>
    (mailbox.folders ?? []).filter(isDriveEmailFolder)
  );

  for (const folder of folders) {
    if (scannedConversations >= maxConversations) {
      truncated = true;
      break;
    }

    let after: string | null = null;
    let hasNextPage = true;

    while (hasNextPage && scannedConversations < maxConversations) {
      const first = Math.min(pageSize, maxConversations - scannedConversations);
      let data: FolderConversationsPage;
      try {
        data = await consolidateGraphql<FolderConversationsPage>(
          LIST_MAILBOX_FOLDER_CONVERSATIONS,
          {
            folder: folder.id,
            first,
            after,
          }
        );
      } catch (error) {
        if (
          !isConsolidateConversionError(error) &&
          !(error instanceof ConsolidateApiError && error.status === 500)
        ) {
          throw error;
        }
        // Skip this folder page / folder on corrupt mail documents.
        truncated = true;
        break;
      }

      const nodes = (data.mailboxFolderConversations.nodes ?? []).filter(
        (
          node: EmailFolderConversationNode | null
        ): node is EmailFolderConversationNode => !!node?.conversation
      );
      scannedConversations += nodes.length;

      for (const node of nodes) {
        documents.push(
          ...flattenConversationDocuments(
            node.conversation,
            apiUrl,
            seenAttachmentIds,
            {
              folderId: node.folder,
              folderConversationId: node.id,
            }
          )
        );
      }

      hasNextPage = data.mailboxFolderConversations.pageInfo.hasNextPage;
      after = data.mailboxFolderConversations.pageInfo.endCursor ?? null;
      if (!nodes.length || !after) break;
    }

    if (scannedConversations >= maxConversations && hasNextPage) {
      truncated = true;
      break;
    }
  }

  return { documents, scannedConversations, truncated };
}

async function searchEmailDriveDocumentsFulltext(options: {
  searchString: string;
  maxConversations?: number;
  pageSize?: number;
}): Promise<{
  documents: DriveDocument[];
  scannedConversations: number;
  truncated: boolean;
}> {
  const searchString = toAndSearchString(options.searchString);
  if (!searchString) {
    return { documents: [], scannedConversations: 0, truncated: false };
  }

  const apiUrl = (await getAuthSession())?.apiUrl;
  const pageSize = options.pageSize ?? 25;
  const maxConversations = options.maxConversations ?? 80;
  const documents: DriveDocument[] = [];
  const seenAttachmentIds = new Set<string>();
  let skip = 0;
  let scannedConversations = 0;
  let truncated = false;
  let totalCount = Number.POSITIVE_INFINITY;

  while (scannedConversations < maxConversations) {
    const take = Math.min(pageSize, maxConversations - scannedConversations);
    const data = await consolidateGraphql<{
      globalSearch: {
        totalCount: number;
        items: Array<(EmailConversationNode & { __typename?: string }) | null>;
      };
    }>(GLOBAL_SEARCH_EMAILS_WITH_ATTACHMENTS, {
      searchString,
      take,
      skip,
    });

    totalCount = data.globalSearch.totalCount ?? 0;
    const items = (data.globalSearch.items ?? []).filter(
      (item): item is EmailConversationNode & { __typename?: string } =>
        !!item &&
        (item.__typename === "EmailConversation" || !!item.id) &&
        Array.isArray(item.emails)
    );
    scannedConversations += items.length;

    for (const conversation of items) {
      documents.push(
        ...flattenConversationDocuments(
          conversation,
          apiUrl,
          seenAttachmentIds
        )
      );
    }

    if (items.length === 0 || scannedConversations >= totalCount) {
      break;
    }
    if (scannedConversations >= maxConversations && totalCount > scannedConversations) {
      truncated = true;
      break;
    }
    skip += take;
  }

  return { documents, scannedConversations, truncated };
}

async function listSuggestedEmailDriveDocuments(options?: {
  limit?: number;
  maxConversations?: number;
  pageSize?: number;
}): Promise<{ documents: DriveDocument[]; scannedConversations: number }> {
  const limit = options?.limit ?? 20;
  const result = await listEmailDriveDocuments({
    maxConversations: options?.maxConversations ?? 40,
    pageSize: options?.pageSize ?? 20,
  });

  const documents = mergeDocuments(result.documents)
    .sort((a, b) => documentTimestamp(b) - documentTimestamp(a))
    .slice(0, limit);

  return {
    documents,
    scannedConversations: result.scannedConversations,
  };
}

/**
 * Collect Task + E-Mail attachments visible to the current Consolidate session.
 * Pass `includeEmails: false` when filtering/grouping by project (E-Mails have none).
 */
export async function listDriveDocuments(options?: {
  maxTasks?: number;
  maxConversations?: number;
  pageSize?: number;
  includeEmails?: boolean;
  includeTasks?: boolean;
}): Promise<{ documents: DriveDocument[]; scannedTasks: number; truncated: boolean }> {
  const apiUrl = (await getAuthSession())?.apiUrl;
  const pageSize = options?.pageSize ?? 40;
  const maxTasks = options?.maxTasks ?? 250;
  const includeEmails = options?.includeEmails !== false;
  const includeTasks = options?.includeTasks !== false;
  const taskDocuments: DriveDocument[] = [];
  let skip = 0;
  let scannedTasks = 0;
  let taskTruncated = false;

  const emailPromise = includeEmails
    ? listEmailDriveDocuments({
        maxConversations: options?.maxConversations ?? 80,
        pageSize: 25,
      })
    : Promise.resolve({
        documents: [] as DriveDocument[],
        scannedConversations: 0,
        truncated: false,
      });

  let emailResult: {
    documents: DriveDocument[];
    scannedConversations: number;
    truncated: boolean;
  } = {
    documents: [],
    scannedConversations: 0,
    truncated: false,
  };

  try {
    if (includeTasks) {
      while (skip < maxTasks) {
        const take = Math.min(pageSize, maxTasks - skip);
        const page = await fetchTaskPageResilient({
          query: LIST_TASKS_WITH_ATTACHMENTS,
          take,
          skip,
          order: LAST_MODIFIED_DESC,
          filter: HAS_ATTACHMENTS_FILTER,
        });

        for (const task of page.items) {
          if (!task.attachments?.length) continue;
          for (const attachment of task.attachments) {
            taskDocuments.push(mapTaskDocument(task, attachment, apiUrl));
          }
        }

        scannedTasks += page.items.length;
        skip += take;

        if (page.skippedCorrupt && page.items.length === 0) {
          // Corrupt document skipped — keep paging past it.
          continue;
        }
        if (!page.hasNextPage || page.items.length === 0) {
          break;
        }
        if (skip >= maxTasks) {
          taskTruncated = true;
          break;
        }
      }
    }
  } finally {
    // Always settle the parallel mailbox fetch to avoid unhandled rejections.
    try {
      emailResult = await emailPromise;
    } catch (error) {
      if (!(error instanceof ConsolidateApiError)) throw error;
      // Mailbox conversion/HTTP failures should not blank the whole Drive.
      emailResult = {
        documents: [],
        scannedConversations: 0,
        truncated: true,
      };
    }
  }

  const documents = mergeDocuments([
    ...taskDocuments,
    ...emailResult.documents,
  ]);

  return {
    documents,
    scannedTasks: scannedTasks + emailResult.scannedConversations,
    truncated: taskTruncated || emailResult.truncated,
  };
}

/**
 * Full-text search via Consolidate globalSearch (Task + E-Mail).
 * Pass `includeEmails: false` when filtering/grouping by project.
 */
export async function searchDriveDocumentsFulltext(options: {
  searchString: string;
  maxTasks?: number;
  pageSize?: number;
  includeEmails?: boolean;
  includeTasks?: boolean;
}): Promise<{
  documents: DriveDocument[];
  scannedTasks: number;
  truncated: boolean;
}> {
  // Space-separated terms → explicit AND (not OR) for Consolidate globalSearch.
  const searchString = toAndSearchString(options.searchString);
  if (!searchString) {
    return { documents: [], scannedTasks: 0, truncated: false };
  }

  const apiUrl = (await getAuthSession())?.apiUrl;
  const pageSize = options.pageSize ?? 25;
  const maxTasks = options.maxTasks ?? 80;
  const includeEmails = options.includeEmails !== false;
  const includeTasks = options.includeTasks !== false;
  const taskDocuments: DriveDocument[] = [];
  const seenAttachmentIds = new Set<string>();
  let skip = 0;
  let scannedTasks = 0;
  let taskTruncated = false;
  let totalCount = Number.POSITIVE_INFINITY;

  const emailPromise = includeEmails
    ? searchEmailDriveDocumentsFulltext({
        searchString,
        maxConversations: maxTasks,
        pageSize,
      })
    : Promise.resolve({
        documents: [] as DriveDocument[],
        scannedConversations: 0,
        truncated: false,
      });

  let emailResult: {
    documents: DriveDocument[];
    scannedConversations: number;
    truncated: boolean;
  } = {
    documents: [],
    scannedConversations: 0,
    truncated: false,
  };

  try {
    if (includeTasks) {
      while (skip < maxTasks) {
        const take = Math.min(pageSize, maxTasks - skip);
        try {
          const data = await consolidateGraphql<{
            globalSearch: {
              totalCount: number;
              items: Array<(TaskNode & { __typename?: string }) | null>;
            };
          }>(GLOBAL_SEARCH_TASKS_WITH_ATTACHMENTS, {
            searchString,
            take,
            skip,
          });

          totalCount = data.globalSearch.totalCount ?? 0;
          const items = (data.globalSearch.items ?? []).filter(
            (item): item is TaskNode & { __typename?: string } =>
              !!item && (item.__typename === "Task" || !!item.id)
          );
          scannedTasks += items.length;
          skip += take;

          for (const task of items) {
            if (!task.attachments?.length) continue;
            for (const attachment of task.attachments) {
              if (seenAttachmentIds.has(attachment.id)) continue;
              seenAttachmentIds.add(attachment.id);
              taskDocuments.push(mapTaskDocument(task, attachment, apiUrl));
            }
          }

          if (items.length === 0 || skip >= totalCount) {
            break;
          }
          if (skip >= maxTasks && totalCount > skip) {
            taskTruncated = true;
            break;
          }
        } catch (error) {
          if (!isConsolidateConversionError(error)) throw error;
          // Skip this search window (corrupt indexed document) and continue.
          skip += Math.max(1, take);
          taskTruncated = true;
        }
      }
    }
  } finally {
    try {
      emailResult = await emailPromise;
    } catch (error) {
      if (!(error instanceof ConsolidateApiError)) throw error;
      emailResult = {
        documents: [],
        scannedConversations: 0,
        truncated: true,
      };
    }
  }

  const documents = mergeDocuments([
    ...taskDocuments,
    ...emailResult.documents,
  ]);

  return {
    documents,
    scannedTasks: scannedTasks + emailResult.scannedConversations,
    truncated: taskTruncated || emailResult.truncated,
  };
}

/**
 * 20 most recently created/modified attachments by the current user
 * (Task attachments touched by user + recent E-Mail attachments).
 */
export async function listSuggestedDriveDocuments(options?: {
  userId: string;
  limit?: number;
  maxTasks?: number;
  pageSize?: number;
}): Promise<{ documents: DriveDocument[]; scannedTasks: number }> {
  const session = await getAuthSession();
  const apiUrl = session?.apiUrl;
  const userId = options?.userId ?? session?.user.id;
  if (!userId) {
    return { documents: [], scannedTasks: 0 };
  }

  const limit = options?.limit ?? 20;
  const pageSize = options?.pageSize ?? 30;
  const maxTasks = options?.maxTasks ?? 120;
  const candidates: DriveDocument[] = [];
  let skip = 0;
  let scannedTasks = 0;

  const emailPromise = listSuggestedEmailDriveDocuments({
    limit,
    maxConversations: 40,
    pageSize: 20,
  });

  let emailDocuments: DriveDocument[] = [];
  let emailScanned = 0;

  try {
    while (skip < maxTasks && candidates.length < limit) {
      const take = Math.min(pageSize, maxTasks - skip);
      const page = await fetchTaskPageResilient({
        query: LIST_RECENT_TASKS_WITH_ATTACHMENTS,
        take,
        skip,
        order: LAST_MODIFIED_DESC,
        filter: HAS_ATTACHMENTS_FILTER,
      });

      scannedTasks += page.items.length;
      skip += take;

      for (const task of page.items) {
        if (!task.attachments?.length) continue;
        for (const attachment of task.attachments) {
          if (!isTouchedByUser(attachment, userId)) continue;
          candidates.push(mapTaskDocument(task, attachment, apiUrl));
        }
        if (candidates.length >= limit) break;
      }

      if (candidates.length >= limit) break;
      if (page.skippedCorrupt && page.items.length === 0) continue;
      if (!page.hasNextPage || page.items.length === 0) break;
    }
  } finally {
    try {
      const emailResult = await emailPromise;
      emailDocuments = emailResult.documents;
      emailScanned = emailResult.scannedConversations;
    } catch (error) {
      if (!(error instanceof ConsolidateApiError)) throw error;
    }
  }

  const documents = mergeDocuments([...candidates, ...emailDocuments])
    .sort((a, b) => documentTimestamp(b) - documentTimestamp(a))
    .slice(0, limit);

  return {
    documents,
    scannedTasks: scannedTasks + emailScanned,
  };
}

/**
 * Up to 20 distinct projects from recent tasks the current user worked on,
 * ordered by Task LastModified (newest first).
 */
export async function listRecentDriveProjects(options?: {
  userId: string;
  limit?: number;
  maxTasks?: number;
  pageSize?: number;
}): Promise<{ projects: DriveProjectOption[]; scannedTasks: number }> {
  const session = await getAuthSession();
  const userId = options?.userId ?? session?.user.id;
  if (!userId) {
    return { projects: [], scannedTasks: 0 };
  }

  const limit = options?.limit ?? 20;
  const pageSize = options?.pageSize ?? 40;
  const maxTasks = options?.maxTasks ?? 150;
  const projects: DriveProjectOption[] = [];
  const seen = new Set<string>();
  let skip = 0;
  let scannedTasks = 0;

  while (skip < maxTasks && projects.length < limit) {
    const take = Math.min(pageSize, maxTasks - skip);
    const page = await fetchTaskPageResilient({
      query: LIST_RECENT_TASKS_FOR_PROJECTS,
      take,
      skip,
      order: LAST_MODIFIED_DESC,
      filter: HAS_ATTACHMENTS_FILTER,
    });

    scannedTasks += page.items.length;
    skip += take;

    for (const task of page.items) {
      if (projects.length >= limit) break;
      const touched =
        task.values.responsible?.id === userId ||
        (task.attachments ?? []).some(
          (attachment) =>
            attachment.createdBy?.id === userId ||
            attachment.lastModifiedBy?.id === userId
        );
      if (!touched) continue;
      const project = task.values.project;
      if (!project?.id || seen.has(project.id)) continue;
      seen.add(project.id);
      projects.push({
        id: project.id,
        name: project.displayName || project.databaseId || "Projekt",
      });
    }

    if (page.skippedCorrupt && page.items.length === 0) continue;
    if (!page.hasNextPage || page.items.length === 0) break;
  }

  return { projects, scannedTasks };
}

const SEARCH_COMPANIES = `
  query DriveSearchCompanies($searchString: String, $take: Int!) {
    dataEntries_Company(take: $take, skip: 0, searchString: $searchString) {
      items {
        id
        displayName
        databaseId
      }
    }
  }
`;

const GET_COMPANY = `
  query DriveCompanyById($id: ID!) {
    dataEntry_Company(id: $id) {
      id
      displayName
      databaseId
    }
  }
`;

function mapCompanyOption(company: {
  id: string;
  displayName?: string | null;
  databaseId?: string | null;
}): DriveCompanyOption {
  return {
    id: company.id,
    name: company.displayName?.trim() || company.databaseId || "Unternehmen",
  };
}

/** Search Consolidate companies for the Unternehmen filter dropdown. */
export async function searchDriveCompanies(options: {
  searchString: string;
  take?: number;
}): Promise<DriveCompanyOption[]> {
  const searchString = options.searchString.trim();
  if (!searchString) return [];

  const data = await consolidateGraphql<{
    dataEntries_Company: {
      items: Array<{
        id: string;
        displayName?: string | null;
        databaseId?: string | null;
      }>;
    };
  }>(SEARCH_COMPANIES, {
    searchString,
    take: options.take ?? 20,
  });

  return (data.dataEntries_Company.items ?? []).map(mapCompanyOption);
}

/** Resolve selected company ids to labels for the filter pill. */
export async function getDriveCompaniesByIds(
  ids: string[]
): Promise<DriveCompanyOption[]> {
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (unique.length === 0) return [];

  const results = await Promise.all(
    unique.map(async (id) => {
      try {
        const data = await consolidateGraphql<{
          dataEntry_Company: {
            id: string;
            displayName?: string | null;
            databaseId?: string | null;
          } | null;
        }>(GET_COMPANY, { id });
        return data.dataEntry_Company
          ? mapCompanyOption(data.dataEntry_Company)
          : { id, name: "Unternehmen" };
      } catch {
        return { id, name: "Unternehmen" };
      }
    })
  );

  return results;
}

const SEARCH_PROJECTS = `
  query DriveSearchProjects($searchString: String, $take: Int!) {
    dataEntries_Project(take: $take, skip: 0, searchString: $searchString) {
      items {
        id
        displayName
        databaseId
      }
    }
  }
`;

const GET_PROJECT = `
  query DriveProjectById($id: ID!) {
    dataEntry_Project(id: $id) {
      id
      displayName
      databaseId
    }
  }
`;

function mapProjectOption(project: {
  id: string;
  displayName?: string | null;
  databaseId?: string | null;
}): DriveProjectOption {
  return {
    id: project.id,
    name: project.displayName?.trim() || project.databaseId || "Projekt",
  };
}

const LIST_TASK_STATUSES = `
  query DriveTaskStatuses {
    taskStatuses {
      id
      name
      category
      rank
    }
  }
`;

const LIST_ACTIVE_USERS = `
  query DriveActiveUsers {
    activeUsers {
      id
      displayName
    }
  }
`;

const LIST_ACTIVE_TASK_TYPES = `
  query DriveActiveTaskTypes {
    dataForm(dataCollection: "Task") {
      types {
        key
        displayName
        archived
      }
    }
  }
`;

function sortFilterOptionsByName(
  options: DriveFilterOption[]
): DriveFilterOption[] {
  return [...options].sort((a, b) =>
    a.name.localeCompare(b.name, "de", { sensitivity: "base" })
  );
}

/** All configured task statuses from Consolidate (workflow order). */
export async function listDriveTaskStatuses(): Promise<DriveFilterOption[]> {
  const data = await consolidateGraphql<{
    taskStatuses: Array<{
      id: string;
      name: string;
      category: string;
      rank: string;
    }>;
  }>(LIST_TASK_STATUSES);

  return [...(data.taskStatuses ?? [])]
    .sort((a, b) => a.rank.localeCompare(b.rank) || a.name.localeCompare(b.name, "de"))
    .map((status) => ({
      // Documents expose status by name — keep filter ids aligned.
      id: status.name,
      name: status.name,
    }));
}

/** All active Consolidate users for the Ersteller filter. */
export async function listDriveCreators(): Promise<DriveFilterOption[]> {
  const data = await consolidateGraphql<{
    activeUsers: Array<{
      id: string;
      displayName?: string | null;
    }>;
  }>(LIST_ACTIVE_USERS);

  return sortFilterOptionsByName(
    (data.activeUsers ?? []).map((user) => ({
      id: user.id,
      name: user.displayName?.trim() || "Benutzer",
    }))
  );
}

/** All non-archived Task data-types for the Task-Typ filter. */
export async function listDriveTaskTypes(): Promise<DriveFilterOption[]> {
  const data = await consolidateGraphql<{
    dataForm: {
      types: Array<{
        key: string;
        displayName?: string | null;
        archived?: boolean | null;
      }>;
    } | null;
  }>(LIST_ACTIVE_TASK_TYPES);

  return sortFilterOptionsByName(
    (data.dataForm?.types ?? [])
      .filter((type) => type.key && !type.archived)
      .map((type) => ({
        id: type.key,
        name: type.displayName?.trim() || type.key,
      }))
  );
}

/** Search Consolidate projects for the Projekt filter dropdown. */
export async function searchDriveProjects(options: {
  searchString: string;
  take?: number;
}): Promise<DriveProjectOption[]> {
  const searchString = options.searchString.trim();
  if (!searchString) return [];

  const data = await consolidateGraphql<{
    dataEntries_Project: {
      items: Array<{
        id: string;
        displayName?: string | null;
        databaseId?: string | null;
      }> | null;
    } | null;
  }>(SEARCH_PROJECTS, {
    searchString,
    take: options.take ?? 20,
  });

  return (data.dataEntries_Project?.items ?? []).map(mapProjectOption);
}

/** Resolve selected project ids to labels for the filter pill. */
export async function getDriveProjectsByIds(
  ids: string[]
): Promise<DriveProjectOption[]> {
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (unique.length === 0) return [];

  const results = await Promise.all(
    unique.map(async (id) => {
      try {
        const data = await consolidateGraphql<{
          dataEntry_Project: {
            id: string;
            displayName?: string | null;
            databaseId?: string | null;
          } | null;
        }>(GET_PROJECT, { id });
        return data.dataEntry_Project
          ? mapProjectOption(data.dataEntry_Project)
          : { id, name: "Projekt" };
      } catch {
        return { id, name: "Projekt" };
      }
    })
  );

  return results;
}
