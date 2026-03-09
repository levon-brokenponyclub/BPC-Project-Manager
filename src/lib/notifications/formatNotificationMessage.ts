import { normalizeNotificationPayloadV2 } from "./notificationTypes";
import type { NotificationPayloadV2 } from "./notificationTypes";
import type { Notification } from "@/types/models";

export interface FormattedNotification {
  title: string;
  description?: string;
  actor: string;
  actorAvatarUrl: string | null;
  route: string | null;
  entity: string;
}

function resolveActorName(p: NotificationPayloadV2): string {
  const raw = p.actor.name?.trim() || p.actor.email?.split("@")[0];
  return raw || "Someone";
}

function quoted(name: string | null | undefined): string {
  if (!name) return "an item";
  return `\u201C${name}\u201D`;
}

function changeArrow(
  from?: string | null,
  to?: string | null,
): string | undefined {
  if (!from && !to) return undefined;
  return `${from ?? "\u2014"} \u2192 ${to ?? "\u2014"}`;
}

/**
 * Centralized notification formatter.
 * Powers inbox list rows, inbox detail view, and Sonner realtime toasts.
 * Uses actor-first language: Actor → Action → Object → Change
 */
export function formatNotificationMessage(
  notification: Notification,
): FormattedNotification {
  const payload = normalizeNotificationPayloadV2(
    notification.type,
    notification.payload ?? {},
    notification.workspace_id,
  );

  const actor = resolveActorName(payload);
  const entityTitle = payload.entity.name;
  const route = payload.target?.route ?? null;
  const entity = entityTitle ?? "General update";

  let title: string;
  let description: string | undefined;

  switch (notification.type) {
    case "task.created": {
      title = `${actor} created ${quoted(entityTitle)}`;
      break;
    }
    case "task.deleted": {
      title = `${actor} deleted ${quoted(entityTitle)}`;
      break;
    }
    case "task.duplicated": {
      title = `${actor} duplicated ${quoted(entityTitle)}`;
      break;
    }
    case "task.merged": {
      title = `${actor} merged ${quoted(entityTitle)}`;
      break;
    }
    case "task.template_merged": {
      title = `${actor} applied a template to ${quoted(entityTitle)}`;
      break;
    }
    case "task.status_changed": {
      title = `${actor} changed ${quoted(entityTitle)}`;
      description = changeArrow(payload.change?.from, payload.change?.to);
      break;
    }
    case "task.priority_changed": {
      title = `${actor} changed priority on ${quoted(entityTitle)}`;
      description = changeArrow(payload.change?.from, payload.change?.to);
      break;
    }
    case "task.due_date_changed": {
      title = `${actor} updated due date on ${quoted(entityTitle)}`;
      description = changeArrow(payload.change?.from, payload.change?.to);
      break;
    }
    case "task.start_date_changed": {
      title = `${actor} updated start date on ${quoted(entityTitle)}`;
      description = changeArrow(payload.change?.from, payload.change?.to);
      break;
    }
    case "task.time_estimate_changed": {
      title = `${actor} updated estimate on ${quoted(entityTitle)}`;
      description = changeArrow(payload.change?.from, payload.change?.to);
      break;
    }
    case "task.time_tracked_changed": {
      title = `${actor} logged time on ${quoted(entityTitle)}`;
      description = changeArrow(payload.change?.from, payload.change?.to);
      break;
    }
    case "task.sprint_points_changed": {
      title = `${actor} updated sprint points on ${quoted(entityTitle)}`;
      description = changeArrow(payload.change?.from, payload.change?.to);
      break;
    }
    case "task.name_changed": {
      const oldName = payload.change?.from;
      const newName = payload.change?.to;
      title = `${actor} renamed ${quoted(oldName ?? entityTitle)}`;
      if (newName) description = `New name: ${quoted(newName)}`;
      break;
    }
    case "task.description_changed": {
      title = `${actor} updated description on ${quoted(entityTitle)}`;
      break;
    }
    case "task.assignee_added": {
      const assignee =
        (payload.meta?.assignee_name as string | null) ?? payload.change?.to;
      title = assignee
        ? `${actor} assigned ${quoted(entityTitle)} to ${assignee}`
        : `${actor} assigned ${quoted(entityTitle)}`;
      break;
    }
    case "task.assignee_removed": {
      const assignee =
        (payload.meta?.assignee_name as string | null) ?? payload.change?.from;
      title = assignee
        ? `${actor} unassigned ${assignee} from ${quoted(entityTitle)}`
        : `${actor} unassigned ${quoted(entityTitle)}`;
      break;
    }
    case "task.follower_added": {
      title = `${actor} started following ${quoted(entityTitle)}`;
      break;
    }
    case "task.follower_removed": {
      title = `${actor} stopped following ${quoted(entityTitle)}`;
      break;
    }
    case "task.tags_changed": {
      title = `${actor} updated tags on ${quoted(entityTitle)}`;
      break;
    }
    case "task.custom_field_changed": {
      title = `${actor} updated a field on ${quoted(entityTitle)}`;
      description = changeArrow(payload.change?.from, payload.change?.to);
      break;
    }
    case "task.dependencies_changed": {
      title = `${actor} updated dependencies on ${quoted(entityTitle)}`;
      break;
    }
    case "task.recurring_changed": {
      title = `${actor} updated recurring settings on ${quoted(entityTitle)}`;
      break;
    }
    case "task.sharing_settings_changed": {
      title = `${actor} updated sharing settings on ${quoted(entityTitle)}`;
      break;
    }
    case "task.added_to_list": {
      const listName = payload.meta?.list_name as string | null;
      title = `${actor} added ${quoted(entityTitle)} to ${listName ? quoted(listName) : "a list"}`;
      break;
    }
    case "task.removed_from_list": {
      const listName = payload.meta?.list_name as string | null;
      title = `${actor} removed ${quoted(entityTitle)} from ${listName ? quoted(listName) : "a list"}`;
      break;
    }
    case "list.moved": {
      title = `${actor} moved ${quoted(entityTitle)}`;
      break;
    }
    case "comment.created": {
      title = `${actor} commented on ${quoted(entityTitle)}`;
      description =
        (payload.meta?.comment_body as string | null) ??
        (payload.meta?.commentPreview as string | null) ??
        undefined;
      break;
    }
    case "comment.assigned": {
      title = `${actor} assigned a comment on ${quoted(entityTitle)}`;
      break;
    }
    case "comment.reaction_added": {
      const reaction = payload.meta?.reaction as string | null;
      title = `${actor} reacted ${reaction ? `${reaction} ` : ""}to a comment on ${quoted(entityTitle)}`;
      break;
    }
    case "attachment.added": {
      title = `${actor} uploaded a file to ${quoted(entityTitle)}`;
      description = (payload.meta?.file_name as string | null) ?? undefined;
      break;
    }
    case "attachment.removed": {
      title = `${actor} removed a file from ${quoted(entityTitle)}`;
      description = (payload.meta?.file_name as string | null) ?? undefined;
      break;
    }
    case "content.embedded": {
      title = `${actor} embedded content in ${quoted(entityTitle)}`;
      description = (payload.meta?.content_name as string | null) ?? undefined;
      break;
    }
    case "integration.email_sent": {
      title = `${actor} sent an email update`;
      description = (payload.meta?.subject as string | null) ?? undefined;
      break;
    }
    case "integration.github_activity": {
      title = `${actor} synced GitHub activity`;
      description = (payload.meta?.event as string | null) ?? undefined;
      break;
    }
    case "integration.hubspot_activity": {
      title = `${actor} synced HubSpot activity`;
      description = (payload.meta?.event as string | null) ?? undefined;
      break;
    }
    case "integration.zoom_started": {
      title = `${actor} started a Zoom meeting`;
      break;
    }
    case "workspace.invite_sent": {
      const inviteeName =
        (payload.meta?.invitee_name as string | null) ??
        (payload.meta?.invitee_email as string | null) ??
        payload.change?.to;
      title = inviteeName
        ? `${actor} invited ${inviteeName} to the workspace`
        : `${actor} sent a workspace invite`;
      description =
        (payload.meta?.workspace_name as string | null) ??
        entityTitle ??
        undefined;
      break;
    }
    case "workspace.member_joined": {
      const memberName = payload.meta?.member_name as string | null;
      title = memberName
        ? `${memberName} joined the workspace`
        : `${actor} joined the workspace`;
      break;
    }
    case "workspace.member_removed": {
      const memberName = payload.meta?.member_name as string | null;
      title = memberName
        ? `${memberName} was removed from the workspace`
        : `${actor} was removed from the workspace`;
      break;
    }
    case "asset.created": {
      const assetTitle = entityTitle;
      const typeLabel =
        (payload.meta?.type_label as string | null) ?? "an asset";
      title = assetTitle
        ? `${actor} added ${quoted(assetTitle)} to the Asset Library`
        : `${actor} added ${typeLabel} to the Asset Library`;
      break;
    }
    case "asset.file_uploaded": {
      const assetTitle = entityTitle;
      title = assetTitle
        ? `${actor} uploaded a file to ${quoted(assetTitle)}`
        : `${actor} uploaded a file to the Asset Library`;
      break;
    }
    case "asset.updated": {
      const assetTitle = entityTitle;
      title = assetTitle
        ? `${actor} updated ${quoted(assetTitle)} in the Asset Library`
        : `${actor} updated an asset in the Asset Library`;
      break;
    }
    case "asset.deleted": {
      const assetTitle = entityTitle;
      title = assetTitle
        ? `${actor} removed ${quoted(assetTitle)} from the Asset Library`
        : `${actor} removed an asset from the Asset Library`;
      break;
    }
    default: {
      title = `${actor} updated ${quoted(entityTitle)}`;
      break;
    }
  }

  return {
    title,
    description,
    actor,
    actorAvatarUrl: payload.actor.avatar_url ?? null,
    route,
    entity,
  };
}
