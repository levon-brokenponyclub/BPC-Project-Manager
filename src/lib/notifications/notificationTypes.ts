export const notificationTypes = [
  "task.created",
  "task.deleted",
  "task.duplicated",
  "task.merged",
  "task.template_merged",
  "task.name_changed",
  "task.description_changed",
  "task.status_changed",
  "task.priority_changed",
  "task.due_date_changed",
  "task.start_date_changed",
  "task.time_estimate_changed",
  "task.time_tracked_changed",
  "task.sprint_points_changed",
  "task.assignee_added",
  "task.assignee_removed",
  "task.follower_added",
  "task.follower_removed",
  "comment.assigned",
  "task.added_to_list",
  "task.removed_from_list",
  "list.moved",
  "task.tags_changed",
  "task.custom_field_changed",
  "task.dependencies_changed",
  "task.recurring_changed",
  "task.sharing_settings_changed",
  "comment.created",
  "comment.reaction_added",
  "attachment.added",
  "attachment.removed",
  "content.embedded",
  "integration.email_sent",
  "integration.github_activity",
  "integration.hubspot_activity",
  "integration.zoom_started",
  "workspace.invite_sent",
  "workspace.member_joined",
  "workspace.member_removed",
  "asset.created",
  "asset.updated",
  "asset.deleted",
  "asset.file_uploaded",
] as const;

export type NotificationType = (typeof notificationTypes)[number];

export type NotificationEntity =
  | "task"
  | "comment"
  | "file"
  | "list"
  | "workspace"
  | "integration"
  | "asset";

export interface NotificationPayloadV2 {
  actor: {
    id: string | null;
    name: string | null;
    email: string | null;
    avatar_url?: string | null;
  };
  entity: {
    type: NotificationEntity;
    id: string | null;
    name: string | null;
  };
  target?: {
    workspace_id: string;
    task_id?: string | null;
    route?: string | null;
  };
  change?: {
    field?: string;
    from?: string | null;
    to?: string | null;
  };
  meta?: Record<string, unknown>;
}

const legacyActorKeys = new Set([
  "actor",
  "actor_user_id",
  "actorUserId",
  "actor_id",
  "actorId",
  "actor_name",
  "actorName",
  "actor_first_name",
  "actorFirstName",
  "actor_surname",
  "actorSurname",
  "actor_last_name",
  "actorLastName",
  "actor_email",
  "actorEmail",
  "actor_avatar_url",
  "actorAvatarUrl",
]);

const legacyEntityKeys = new Set([
  "entity",
  "entity_type",
  "entityType",
  "entity_id",
  "entityId",
  "entity_name",
  "entityName",
  "task_id",
  "taskId",
  "task_title",
  "taskTitle",
  "task_name",
  "taskName",
]);

const legacyTargetKeys = new Set([
  "target",
  "workspace_id",
  "workspaceId",
  "route",
  "task_id",
  "taskId",
]);

const legacyChangeKeys = new Set(["change", "field", "from", "to"]);

const knownLegacyKeys = new Set([
  ...legacyActorKeys,
  ...legacyEntityKeys,
  ...legacyTargetKeys,
  ...legacyChangeKeys,
  "meta",
]);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
}

function detectEntityFromType(type: string): NotificationEntity {
  if (type === "comment_added") return "comment";
  if (type === "status_change" || type === "task_created") return "task";
  if (type.startsWith("comment.")) return "comment";
  if (type.startsWith("attachment.") || type.startsWith("content.")) {
    return "file";
  }
  if (type.startsWith("list.")) return "list";
  if (type.startsWith("workspace.")) return "workspace";
  if (type.startsWith("integration.")) return "integration";
  return "task";
}

function getLegacyTaskId(payload: Record<string, unknown>): string | null {
  return asString(payload.task_id) ?? asString(payload.taskId);
}

function getLegacyTaskName(payload: Record<string, unknown>): string | null {
  return (
    asString(payload.task_title) ??
    asString(payload.taskTitle) ??
    asString(payload.task_name) ??
    asString(payload.taskName) ??
    asString(payload.title)
  );
}

export interface PayloadActorFallback {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
}

export function normalizeNotificationPayloadV2(
  type: string,
  payload: Record<string, unknown>,
  workspaceId: string,
  actorFallback?: PayloadActorFallback,
): NotificationPayloadV2 {
  const actorPayload = isObject(payload.actor) ? payload.actor : {};
  const legacyTaskId = getLegacyTaskId(payload);
  const legacyTaskName = getLegacyTaskName(payload);

  const actorId =
    asString(actorPayload.id) ??
    asString(payload.actor_user_id) ??
    asString(payload.actorUserId) ??
    asString(payload.actor_id) ??
    asString(payload.actorId) ??
    actorFallback?.id ??
    null;

  const actorEmail =
    asString(actorPayload.email) ??
    asString(payload.actor_email) ??
    asString(payload.actorEmail) ??
    actorFallback?.email ??
    null;

  const actorName =
    ([
      asString(payload.actor_first_name) ?? asString(payload.actorFirstName),
      asString(payload.actor_surname) ??
        asString(payload.actorSurname) ??
        asString(payload.actor_last_name) ??
        asString(payload.actorLastName),
    ]
      .filter((part): part is string => Boolean(part))
      .join(" ") ||
      asString(actorPayload.name)) ??
    asString(payload.actor_name) ??
    asString(payload.actorName) ??
    actorFallback?.name ??
    actorEmail ??
    null;

  const actorAvatar =
    asString(actorPayload.avatar_url) ??
    asString(payload.actor_avatar_url) ??
    asString(payload.actorAvatarUrl) ??
    actorFallback?.avatar_url ??
    null;

  const entityPayload = isObject(payload.entity) ? payload.entity : {};
  const entityType =
    (asString(entityPayload.type) as NotificationEntity | null) ??
    (asString(payload.entity_type) as NotificationEntity | null) ??
    (asString(payload.entityType) as NotificationEntity | null) ??
    detectEntityFromType(type);

  const entityId =
    asString(entityPayload.id) ??
    asString(payload.entity_id) ??
    asString(payload.entityId) ??
    legacyTaskId ??
    null;

  const entityName =
    asString(entityPayload.name) ??
    asString(payload.entity_name) ??
    asString(payload.entityName) ??
    legacyTaskName ??
    null;

  const targetPayload = isObject(payload.target) ? payload.target : {};
  const taskId =
    asString(targetPayload.task_id) ??
    asString(targetPayload.taskId) ??
    legacyTaskId ??
    null;

  const route =
    asString(targetPayload.route) ??
    asString(payload.route) ??
    (taskId
      ? `/w/${workspaceId}/tasks?taskId=${encodeURIComponent(taskId)}`
      : `/w/${workspaceId}/dashboard`);

  const changePayload = isObject(payload.change) ? payload.change : {};
  const changeField =
    asString(changePayload.field) ?? asString(payload.field) ?? undefined;
  const changeFrom = asString(changePayload.from) ?? asString(payload.from);
  const changeTo = asString(changePayload.to) ?? asString(payload.to);

  const metaFromPayload = isObject(payload.meta) ? payload.meta : undefined;
  const looseMeta = Object.fromEntries(
    Object.entries(payload).filter(([key]) => !knownLegacyKeys.has(key)),
  );

  return {
    actor: {
      id: actorId,
      name: actorName,
      email: actorEmail,
      avatar_url: actorAvatar,
    },
    entity: {
      type: entityType,
      id: entityId,
      name: entityName,
    },
    target: {
      workspace_id: workspaceId,
      task_id: taskId,
      route,
    },
    ...(changeField || changeFrom || changeTo
      ? {
          change: {
            ...(changeField ? { field: changeField } : {}),
            ...(changeFrom ? { from: changeFrom } : {}),
            ...(changeTo ? { to: changeTo } : {}),
          },
        }
      : {}),
    ...(metaFromPayload || Object.keys(looseMeta).length > 0
      ? { meta: { ...(metaFromPayload ?? {}), ...looseMeta } }
      : {}),
  };
}

export function isNotificationType(value: string): value is NotificationType {
  return (notificationTypes as readonly string[]).includes(value);
}
