import "server-only";

import type {
  DriveDocument,
  DrivePreviewType,
  DriveProjectOption,
} from "@/lib/drive/types";
import { getAuthSession } from "@/lib/auth/session";
import { consolidateGraphql } from "./client";
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
}

interface EmailFolderConversationNode {
  id: string;
  conversationId: string;
  folder?: string;
  conversation: EmailConversationNode;
}

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
`;

const LIST_TASKS_WITH_ATTACHMENTS = `
  query DriveTasksWithAttachments($take: Int!, $skip: Int!) {
    dataEntries_Task(take: $take, skip: $skip) {
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
    responsible: task.values.responsible
      ? {
          id: task.values.responsible.id,
          name: task.values.responsible.displayName,
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
    responsible: responsibleFromConversation(conversation),
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
  const pageSize = options?.pageSize ?? 50;
  const maxConversations = options?.maxConversations ?? 500;
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
      const data = await consolidateGraphql<{
        mailboxFolderConversations: {
          pageInfo: { hasNextPage: boolean; endCursor?: string | null };
          nodes: Array<EmailFolderConversationNode | null>;
        };
      }>(LIST_MAILBOX_FOLDER_CONVERSATIONS, {
        folder: folder.id,
        first,
        after,
      });

      const nodes = (data.mailboxFolderConversations.nodes ?? []).filter(
        (node): node is EmailFolderConversationNode => !!node?.conversation
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
  const searchString = options.searchString.trim();
  if (!searchString) {
    return { documents: [], scannedConversations: 0, truncated: false };
  }

  const apiUrl = (await getAuthSession())?.apiUrl;
  const pageSize = options.pageSize ?? 50;
  const maxConversations = options.maxConversations ?? 200;
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
    maxConversations: options?.maxConversations ?? 200,
    pageSize: options?.pageSize ?? 40,
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
  const pageSize = options?.pageSize ?? 100;
  const maxTasks = options?.maxTasks ?? 2000;
  const includeEmails = options?.includeEmails !== false;
  const includeTasks = options?.includeTasks !== false;
  const taskDocuments: DriveDocument[] = [];
  let skip = 0;
  let scannedTasks = 0;
  let taskTruncated = false;

  const emailPromise = includeEmails
    ? listEmailDriveDocuments({
        maxConversations: options?.maxConversations ?? 500,
        pageSize: 50,
      })
    : Promise.resolve({
        documents: [] as DriveDocument[],
        scannedConversations: 0,
        truncated: false,
      });

  if (includeTasks) {
    while (scannedTasks < maxTasks) {
      const take = Math.min(pageSize, maxTasks - scannedTasks);
      const data = await consolidateGraphql<{
        dataEntries_Task: {
          totalCount: number;
          pageInfo: { hasNextPage: boolean };
          items: TaskNode[];
        };
      }>(LIST_TASKS_WITH_ATTACHMENTS, {
        take,
        skip,
      });

      const items = data.dataEntries_Task.items ?? [];
      scannedTasks += items.length;

      for (const task of items) {
        if (!task.attachments?.length) continue;
        for (const attachment of task.attachments) {
          taskDocuments.push(mapTaskDocument(task, attachment, apiUrl));
        }
      }

      if (!data.dataEntries_Task.pageInfo.hasNextPage || items.length === 0) {
        break;
      }
      if (scannedTasks >= maxTasks) {
        taskTruncated = true;
        break;
      }
      skip += take;
    }
  }

  const emailResult = await emailPromise;
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
  const searchString = options.searchString.trim();
  if (!searchString) {
    return { documents: [], scannedTasks: 0, truncated: false };
  }

  const apiUrl = (await getAuthSession())?.apiUrl;
  const pageSize = options.pageSize ?? 50;
  const maxTasks = options.maxTasks ?? 200;
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

  if (includeTasks) {
    while (scannedTasks < maxTasks) {
      const take = Math.min(pageSize, maxTasks - scannedTasks);
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

      for (const task of items) {
        if (!task.attachments?.length) continue;
        for (const attachment of task.attachments) {
          if (seenAttachmentIds.has(attachment.id)) continue;
          seenAttachmentIds.add(attachment.id);
          taskDocuments.push(mapTaskDocument(task, attachment, apiUrl));
        }
      }

      if (items.length === 0 || scannedTasks >= totalCount) {
        break;
      }
      if (scannedTasks >= maxTasks && totalCount > scannedTasks) {
        taskTruncated = true;
        break;
      }
      skip += take;
    }
  }

  const emailResult = await emailPromise;
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
  const pageSize = options?.pageSize ?? 50;
  const maxTasks = options?.maxTasks ?? 500;
  const candidates: DriveDocument[] = [];
  let skip = 0;
  let scannedTasks = 0;

  const order = [
    { metadata: { type: "LastModified", direction: "Descending" } },
  ];
  const filter = [
    {
      metadata: {
        type: "HasAttachments",
        operation: { eq: true },
      },
    },
  ];

  const emailPromise = listSuggestedEmailDriveDocuments({
    limit,
    maxConversations: 200,
    pageSize: 40,
  });

  while (scannedTasks < maxTasks) {
    const take = Math.min(pageSize, maxTasks - scannedTasks);
    const data = await consolidateGraphql<{
      dataEntries_Task: {
        pageInfo: { hasNextPage: boolean };
        items: TaskNode[];
      };
    }>(LIST_RECENT_TASKS_WITH_ATTACHMENTS, {
      take,
      skip,
      order,
      filter,
    });

    const items = data.dataEntries_Task.items ?? [];
    scannedTasks += items.length;

    for (const task of items) {
      if (!task.attachments?.length) continue;
      for (const attachment of task.attachments) {
        if (!isTouchedByUser(attachment, userId)) continue;
        candidates.push(mapTaskDocument(task, attachment, apiUrl));
      }
    }

    if (!data.dataEntries_Task.pageInfo.hasNextPage || items.length === 0) {
      break;
    }
    skip += take;
  }

  const emailResult = await emailPromise;
  const documents = mergeDocuments([
    ...candidates,
    ...emailResult.documents,
  ])
    .sort((a, b) => documentTimestamp(b) - documentTimestamp(a))
    .slice(0, limit);

  return {
    documents,
    scannedTasks: scannedTasks + emailResult.scannedConversations,
  };
}

function isTaskWorkedByUser(task: TaskNode, userId: string): boolean {
  if (task.values.responsible?.id === userId) return true;
  return (task.attachments ?? []).some((attachment) =>
    isTouchedByUser(attachment, userId)
  );
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
  const pageSize = options?.pageSize ?? 50;
  const maxTasks = options?.maxTasks ?? 500;
  const projects: DriveProjectOption[] = [];
  const seen = new Set<string>();
  let skip = 0;
  let scannedTasks = 0;

  const order = [
    { metadata: { type: "LastModified", direction: "Descending" } },
  ];
  const filter = [
    {
      metadata: {
        type: "HasAttachments",
        operation: { eq: true },
      },
    },
  ];

  while (scannedTasks < maxTasks && projects.length < limit) {
    const take = Math.min(pageSize, maxTasks - scannedTasks);
    const data = await consolidateGraphql<{
      dataEntries_Task: {
        pageInfo: { hasNextPage: boolean };
        items: TaskNode[];
      };
    }>(LIST_RECENT_TASKS_WITH_ATTACHMENTS, {
      take,
      skip,
      order,
      filter,
    });

    const items = data.dataEntries_Task.items ?? [];
    scannedTasks += items.length;

    for (const task of items) {
      if (projects.length >= limit) break;
      if (!isTaskWorkedByUser(task, userId)) continue;
      const project = task.values.project;
      if (!project?.id || seen.has(project.id)) continue;
      seen.add(project.id);
      projects.push({
        id: project.id,
        name: project.displayName || project.databaseId || "Projekt",
      });
    }

    if (!data.dataEntries_Task.pageInfo.hasNextPage || items.length === 0) {
      break;
    }
    skip += take;
  }

  return { projects, scannedTasks };
}
