import type {
  NotificationEntity,
  NotificationPayloadV2,
  NotificationType,
} from "@/lib/notifications/notificationTypes";

export type LucideIconName =
  | "CheckCircle2"
  | "CircleDot"
  | "Flag"
  | "Calendar"
  | "UserPlus"
  | "UserMinus"
  | "Eye"
  | "EyeOff"
  | "MessageSquare"
  | "SmilePlus"
  | "Paperclip"
  | "FileText"
  | "Link2"
  | "Tag"
  | "SlidersHorizontal"
  | "Repeat"
  | "Share2"
  | "Clock3"
  | "Timer"
  | "Github"
  | "Mail"
  | "Video"
  | "Move"
  | "PlusCircle"
  | "Trash2"
  | "GitMerge"
  | "Copy"
  | "Users"
  | "UserCheck"
  | "UserX"
  | "LayoutList"
  | "Shield"
  | "Bell";

export interface NotificationDefinition {
  type: NotificationType;
  label: string;
  description: string;
  entity: NotificationEntity;
  icon: LucideIconName;
  template: (p: NotificationPayloadV2) => { title: string; subtitle?: string };
}

const actorName = (p: NotificationPayloadV2): string =>
  p.actor.name || p.actor.email || "Someone";

const entityName = (p: NotificationPayloadV2): string | null =>
  p.entity.name || null;

const withDetail = (base: string, detail?: string | null): string => {
  if (!detail) return base;
  return `${base} -- ${detail}`;
};

const changeDetail = (p: NotificationPayloadV2): string | null => {
  if (!p.change?.from && !p.change?.to) return null;
  const from = p.change?.from ?? "-";
  const to = p.change?.to ?? "-";
  return `${from} -> ${to}`;
};

const createTemplate =
  (action: string, detail?: (p: NotificationPayloadV2) => string | null) =>
  (p: NotificationPayloadV2) => {
    const title = `${actorName(p)} | ${action}`;
    const name = entityName(p);
    const detailText = detail ? detail(p) : null;
    if (!name && !detailText) return { title };
    if (!name) return { title, subtitle: detailText ?? undefined };
    return { title, subtitle: withDetail(name, detailText) };
  };

const createDefinition = (
  type: NotificationType,
  label: string,
  description: string,
  entity: NotificationEntity,
  icon: LucideIconName,
  action: string,
  detail?: (p: NotificationPayloadV2) => string | null,
): NotificationDefinition => ({
  type,
  label,
  description,
  entity,
  icon,
  template: createTemplate(action, detail),
});

export const notificationCatalog: Record<
  NotificationType,
  NotificationDefinition
> = {
  "task.created": createDefinition(
    "task.created",
    "Task Created",
    "See when a new task is created.",
    "task",
    "PlusCircle",
    "created task",
  ),
  "task.deleted": createDefinition(
    "task.deleted",
    "Task Deleted",
    "See when a task is deleted.",
    "task",
    "Trash2",
    "deleted task",
  ),
  "task.duplicated": createDefinition(
    "task.duplicated",
    "Task Duplicated",
    "See when a task is duplicated.",
    "task",
    "Copy",
    "duplicated task",
  ),
  "task.merged": createDefinition(
    "task.merged",
    "Task Merged",
    "See when tasks are merged together.",
    "task",
    "GitMerge",
    "merged task",
  ),
  "task.template_merged": createDefinition(
    "task.template_merged",
    "Template Merged",
    "See when a task template is merged into a task.",
    "task",
    "GitMerge",
    "merged template",
  ),

  "task.name_changed": createDefinition(
    "task.name_changed",
    "Task Name",
    "See when a task name changes.",
    "task",
    "FileText",
    "renamed task",
    changeDetail,
  ),
  "task.description_changed": createDefinition(
    "task.description_changed",
    "Description",
    "See when a task description changes.",
    "task",
    "FileText",
    "updated description",
  ),
  "task.status_changed": createDefinition(
    "task.status_changed",
    "Status",
    "See when a task status changes.",
    "task",
    "CheckCircle2",
    "updated status",
    changeDetail,
  ),
  "task.priority_changed": createDefinition(
    "task.priority_changed",
    "Priority",
    "See when a task priority changes.",
    "task",
    "Flag",
    "updated priority",
    changeDetail,
  ),
  "task.due_date_changed": createDefinition(
    "task.due_date_changed",
    "Due Date",
    "See when a task due date changes.",
    "task",
    "Calendar",
    "updated due date",
    changeDetail,
  ),
  "task.start_date_changed": createDefinition(
    "task.start_date_changed",
    "Start Date",
    "See when a task start date changes.",
    "task",
    "Calendar",
    "updated start date",
    changeDetail,
  ),
  "task.time_estimate_changed": createDefinition(
    "task.time_estimate_changed",
    "Time Estimate",
    "See when a task time estimate changes.",
    "task",
    "Timer",
    "updated estimate",
    changeDetail,
  ),
  "task.time_tracked_changed": createDefinition(
    "task.time_tracked_changed",
    "Time Tracked",
    "See when tracked time changes.",
    "task",
    "Clock3",
    "logged time",
    changeDetail,
  ),
  "task.sprint_points_changed": createDefinition(
    "task.sprint_points_changed",
    "Sprint Points",
    "See when sprint points are updated.",
    "task",
    "CircleDot",
    "updated sprint points",
    changeDetail,
  ),

  "task.assignee_added": createDefinition(
    "task.assignee_added",
    "Assignee",
    "See when a person is assigned to a task.",
    "task",
    "UserPlus",
    "assigned user",
    (p) => (p.meta?.assignee_name as string | null) ?? null,
  ),
  "task.assignee_removed": createDefinition(
    "task.assignee_removed",
    "Assignee",
    "See when an assignee is removed from a task.",
    "task",
    "UserMinus",
    "removed assignee",
    (p) => (p.meta?.assignee_name as string | null) ?? null,
  ),
  "task.follower_added": createDefinition(
    "task.follower_added",
    "Follower",
    "See when a follower is added to a task.",
    "task",
    "Eye",
    "added follower",
    (p) => (p.meta?.follower_name as string | null) ?? null,
  ),
  "task.follower_removed": createDefinition(
    "task.follower_removed",
    "Follower",
    "See when a follower is removed from a task.",
    "task",
    "EyeOff",
    "removed follower",
    (p) => (p.meta?.follower_name as string | null) ?? null,
  ),
  "comment.assigned": createDefinition(
    "comment.assigned",
    "Assigned Comment",
    "See when a comment is assigned to someone.",
    "comment",
    "UserPlus",
    "assigned comment",
  ),

  "task.added_to_list": createDefinition(
    "task.added_to_list",
    "List",
    "See when a task is added to a list.",
    "task",
    "LayoutList",
    "added to list",
    (p) => (p.meta?.list_name as string | null) ?? null,
  ),
  "task.removed_from_list": createDefinition(
    "task.removed_from_list",
    "List",
    "See when a task is removed from a list.",
    "task",
    "LayoutList",
    "removed from list",
    (p) => (p.meta?.list_name as string | null) ?? null,
  ),
  "list.moved": createDefinition(
    "list.moved",
    "List Moved",
    "See when a list is moved.",
    "list",
    "Move",
    "moved list",
  ),

  "task.tags_changed": createDefinition(
    "task.tags_changed",
    "Tags",
    "See when task tags are changed.",
    "task",
    "Tag",
    "updated tags",
  ),
  "task.custom_field_changed": createDefinition(
    "task.custom_field_changed",
    "Custom Field",
    "See when a custom field value changes.",
    "task",
    "SlidersHorizontal",
    "updated custom field",
    changeDetail,
  ),
  "task.dependencies_changed": createDefinition(
    "task.dependencies_changed",
    "Dependencies",
    "See when task dependencies change.",
    "task",
    "Link2",
    "updated dependencies",
  ),
  "task.recurring_changed": createDefinition(
    "task.recurring_changed",
    "Recurring",
    "See when recurring settings change.",
    "task",
    "Repeat",
    "updated recurring settings",
  ),
  "task.sharing_settings_changed": createDefinition(
    "task.sharing_settings_changed",
    "Sharing",
    "See when task sharing settings change.",
    "task",
    "Share2",
    "updated sharing settings",
  ),

  "comment.created": createDefinition(
    "comment.created",
    "Comment",
    "See when a new comment is added.",
    "comment",
    "MessageSquare",
    "commented",
    (p) => (p.meta?.commentPreview as string | null) ?? null,
  ),
  "comment.reaction_added": createDefinition(
    "comment.reaction_added",
    "Reaction",
    "See when someone reacts to a comment.",
    "comment",
    "SmilePlus",
    "added reaction",
    (p) => (p.meta?.reaction as string | null) ?? null,
  ),
  "attachment.added": createDefinition(
    "attachment.added",
    "Attachment",
    "See when an attachment is added.",
    "file",
    "Paperclip",
    "added attachment",
    (p) => (p.meta?.file_name as string | null) ?? null,
  ),
  "attachment.removed": createDefinition(
    "attachment.removed",
    "Attachment",
    "See when an attachment is removed.",
    "file",
    "Paperclip",
    "removed attachment",
    (p) => (p.meta?.file_name as string | null) ?? null,
  ),
  "content.embedded": createDefinition(
    "content.embedded",
    "Embedded Content",
    "See when external content is embedded.",
    "file",
    "FileText",
    "embedded content",
    (p) => (p.meta?.content_name as string | null) ?? null,
  ),

  "integration.email_sent": createDefinition(
    "integration.email_sent",
    "Email",
    "See when an integration sends an email update.",
    "integration",
    "Mail",
    "sent email",
    (p) => (p.meta?.subject as string | null) ?? null,
  ),
  "integration.github_activity": createDefinition(
    "integration.github_activity",
    "GitHub",
    "See when linked GitHub activity occurs.",
    "integration",
    "Github",
    "synced GitHub activity",
    (p) => (p.meta?.event as string | null) ?? null,
  ),
  "integration.hubspot_activity": createDefinition(
    "integration.hubspot_activity",
    "HubSpot",
    "See when linked HubSpot activity occurs.",
    "integration",
    "SlidersHorizontal",
    "synced HubSpot activity",
    (p) => (p.meta?.event as string | null) ?? null,
  ),
  "integration.zoom_started": createDefinition(
    "integration.zoom_started",
    "Zoom",
    "See when a Zoom meeting is started from work.",
    "integration",
    "Video",
    "started Zoom meeting",
  ),

  "workspace.invite_sent": createDefinition(
    "workspace.invite_sent",
    "Invite",
    "See when a workspace invite is sent.",
    "workspace",
    "Mail",
    "sent invite",
    (p) => (p.meta?.invitee_email as string | null) ?? null,
  ),
  "workspace.member_joined": createDefinition(
    "workspace.member_joined",
    "Member Joined",
    "See when a member joins the workspace.",
    "workspace",
    "UserCheck",
    "member joined",
    (p) => (p.meta?.member_name as string | null) ?? null,
  ),
  "workspace.member_removed": createDefinition(
    "workspace.member_removed",
    "Member Removed",
    "See when a member is removed from the workspace.",
    "workspace",
    "UserX",
    "member removed",
    (p) => (p.meta?.member_name as string | null) ?? null,
  ),
};

const fallbackDefinition: NotificationDefinition = {
  type: "task.created",
  label: "Activity",
  description: "See recent activity updates.",
  entity: "task",
  icon: "Bell",
  template: createTemplate("updated"),
};

export function getNotificationDefinition(
  type: string,
): NotificationDefinition {
  return notificationCatalog[type as NotificationType] ?? fallbackDefinition;
}

export function formatNotification(
  type: string,
  payload: NotificationPayloadV2,
): { title: string; subtitle?: string; icon: LucideIconName } {
  const definition = getNotificationDefinition(type);
  const formatted = definition.template(payload);
  return {
    title: formatted.title,
    subtitle: formatted.subtitle,
    icon: definition.icon,
  };
}
