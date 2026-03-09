/**
 * Shared notification formatting utilities for Edge Functions
 * Mirrors the logic from src/lib/notifications/formatNotificationMessage.ts
 * but optimized for backend/Edge Function use
 */

export interface NotificationPayloadV2 {
  actor: {
    id: string | null;
    name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
  entity: {
    id: string | null;
    name: string | null;
    type: string | null;
  };
  change?: {
    from: string | null;
    to: string | null;
  };
  target?: {
    route: string | null;
  };
  meta?: Record<string, unknown>;
}

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
  return `"${name}"`;
}

function changeArrow(
  from?: string | null,
  to?: string | null,
): string | undefined {
  if (!from && !to) return undefined;
  return `${from ?? "—"} → ${to ?? "—"}`;
}

export function formatNotificationMessage(
  type: string,
  payload: NotificationPayloadV2,
): FormattedNotification {
  const actor = resolveActorName(payload);
  const entityTitle = payload.entity.name;
  const route = payload.target?.route ?? null;
  const entity = entityTitle ?? "General update";

  let title: string;
  let description: string | undefined;

  switch (type) {
    case "task.created": {
      title = `${actor} created ${quoted(entityTitle)}`;
      break;
    }
    case "task.status_changed": {
      title = `${actor} changed ${quoted(entityTitle)}`;
      description = changeArrow(payload.change?.from, payload.change?.to);
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
    case "comment.created": {
      title = `${actor} commented on ${quoted(entityTitle)}`;
      description =
        (payload.meta?.comment_body as string | null) ??
        (payload.meta?.commentPreview as string | null) ??
        undefined;
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
