import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  Archive,
  CheckCircle2,
  Clock3,
  ChevronDown,
  ChevronRight,
  Inbox,
  LayoutGrid,
  ListTodo,
  MailOpen,
  MessageSquare,
  Moon,
  PanelLeftClose,
  ReceiptText,
  Search,
  Settings,
  Sun,
  Timer,
  Trash2,
  X,
  Users,
  UsersRound,
} from "lucide-react";
import { NavLink, useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  addComment,
  deleteNotification,
  getMyWorkspaces,
  getUnreadNotificationCount,
  listComments,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationUnread,
} from "@/api";
import { getMyWorkspaceRole, getWorkspaceUsers } from "@/api/workspaces";
import { ProfileEditModal } from "@/components/profile/ProfileEditModal";
import { Button } from "@/components/ui/button";
import { formatNotificationMessage } from "@/lib/notifications/formatNotificationMessage";
import { normalizeNotificationPayloadV2 } from "@/lib/notifications/notificationTypes";
import { getNotificationDefinition } from "@/lib/notifications/notificationCatalog";
import { timeAgo } from "@/lib/notifications/timeAgo";
import { queryKeys } from "@/lib/queryKeys";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import type { Comment, Notification } from "@/types/models";

type AppShellProps = {
  children: ReactNode;
};

const navItems = [
  {
    key: "project-overview",
    label: "Project Overview",
    to: "project-overview",
    Icon: LayoutGrid,
  },
  { key: "tasks", label: "Tasks", to: "tasks", Icon: ListTodo },
  { key: "assets", label: "Asset Library", to: "assets", Icon: Archive },
  { key: "users", label: "Users", to: "users", Icon: UsersRound },
  { key: "clients", label: "Clients", to: "clients", Icon: Users },
  { key: "time", label: "Time", to: "time", Icon: Timer },
  { key: "reports", label: "Reports", to: "reports", Icon: ReceiptText },
  { key: "settings", label: "Settings", to: "settings", Icon: Settings },
] as const;

const sidebarNavItemClassName =
  "focus-ring flex items-center rounded-[4px] px-[10px] py-[8px] text-[13px] font-medium leading-4 text-sidebar-foreground/90 transition-colors";

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick?: () => void;
  children: ReactNode;
}): React.ReactElement {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-xl bg-card/20 text-sidebar-muted transition-colors hover:bg-card/35 hover:text-sidebar-foreground"
    >
      {children}
    </button>
  );
}

// ─── Inbox helpers ────────────────────────────────────────────────────────────

function getInboxInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((token) => token.charAt(0).toUpperCase())
    .join("");
}

function getNotificationTypeLabel(type: string): string {
  return getNotificationDefinition(type).label;
}

function InboxPropertyRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}): ReactElement {
  return (
    <div className="px-4 py-3">
      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-muted">
        {label}
      </p>
      <div>{children}</div>
    </div>
  );
}

interface InboxListItemMsg {
  title: string;
  description?: string;
  entity: string;
  actor: string;
  actorAvatarUrl: string | null;
  route: string | null;
  status: string;
}

function InboxListItem({
  notification,
  isActive,
  msg,
  onSelect,
  onMarkRead,
  onMarkUnread,
  onDelete,
}: {
  notification: Notification;
  isActive: boolean;
  msg: InboxListItemMsg;
  onSelect: () => void;
  onMarkRead: () => void;
  onMarkUnread: () => void;
  onDelete: () => void;
}): ReactElement {
  const isUnread = !notification.read_at;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "group relative w-full cursor-pointer border-b border-border px-3 py-2.5 text-left transition-colors last:border-b-0",
        isActive ? "bg-surface" : "hover:bg-surface/60",
      )}
    >
      {isUnread ? (
        <span className="absolute left-1.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-primary" />
      ) : null}
      <div className="flex items-start gap-2.5 pl-2">
        {/* Actor avatar */}
        <div className="mt-0.5 shrink-0">
          {msg.actorAvatarUrl ? (
            <img
              src={msg.actorAvatarUrl}
              alt={msg.actor}
              className="h-7 w-7 rounded-full object-cover"
            />
          ) : (
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-[10px] font-medium text-muted">
              {getInboxInitials(msg.actor)}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-1">
            <p
              className={cn(
                "truncate text-[13px] font-medium leading-[18px]",
                isActive || isUnread ? "text-foreground" : "text-foreground/60",
              )}
            >
              {msg.title}
            </p>
            {/* Right slot: timestamp normally, quick actions on hover/active */}
            <div className="relative flex shrink-0 items-center">
              <span
                className={cn(
                  "text-[11px] leading-[18px] text-muted transition-opacity",
                  "group-hover:opacity-0",
                  isActive && "opacity-0",
                )}
              >
                {timeAgo(notification.created_at)}
              </span>
              <div
                className={cn(
                  "absolute right-0 flex items-center gap-0.5 transition-opacity",
                  "opacity-0 group-hover:opacity-100",
                  isActive && "opacity-100",
                )}
              >
                <button
                  type="button"
                  aria-label={isUnread ? "Mark as read" : "Mark as unread"}
                  title={isUnread ? "Mark as read" : "Mark as unread"}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isUnread) onMarkRead();
                    else onMarkUnread();
                  }}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-[4px] text-muted transition-colors hover:bg-surface hover:text-foreground"
                >
                  {isUnread ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <MailOpen className="h-3.5 w-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  aria-label="Delete notification"
                  title="Delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-[4px] text-muted transition-colors hover:bg-surface hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
          {msg.description ? (
            <p className="mt-0.5 truncate text-[12px] leading-[17px] text-muted">
              {msg.description}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ─── Comment-type detection ───────────────────────────────────────────────────

const COMMENT_NOTIFICATION_TYPES = new Set([
  "comment.created",
  "comment.assigned",
  "comment.reaction_added",
]);

// ─── InboxCommentThread ───────────────────────────────────────────────────────

/**
 * Renders the full comment thread + composer for a comment-type inbox
 * notification. Replicates the TaskDrawer Activity tab experience inline.
 */
function InboxCommentThread({
  taskId,
  workspaceId,
  currentUserAvatar,
  currentUserName,
}: {
  taskId: string;
  workspaceId: string;
  currentUserAvatar?: string;
  currentUserName: string;
}): ReactElement {
  const queryClient = useQueryClient();
  const threadScrollRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  const commentsQuery = useQuery({
    queryKey: queryKeys.taskComments(taskId),
    queryFn: () => listComments(taskId),
    enabled: Boolean(taskId),
  });

  const workspaceUsersQuery = useQuery({
    queryKey: queryKeys.workspaceUsers(workspaceId),
    queryFn: () => getWorkspaceUsers(workspaceId),
    enabled: Boolean(workspaceId),
  });

  const [composerBody, setComposerBody] = useState("");

  const addCommentMutation = useMutation({
    mutationFn: (body: string) => addComment(taskId, body),
    onSuccess: async () => {
      setComposerBody("");
      await queryClient.invalidateQueries({
        queryKey: queryKeys.taskComments(taskId),
      });
      setTimeout(() => {
        if (threadScrollRef.current) {
          threadScrollRef.current.scrollTo({
            top: threadScrollRef.current.scrollHeight,
            behavior: "smooth",
          });
        }
      }, 50);
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error ? err.message : "Failed to post comment.";
      notify.error("Comment failed", msg);
    },
  });

  // Scroll to bottom on first comment load
  useEffect(() => {
    const comments = commentsQuery.data;
    if (comments && comments.length > 0) {
      setTimeout(() => {
        if (threadScrollRef.current) {
          threadScrollRef.current.scrollTop =
            threadScrollRef.current.scrollHeight;
        }
      }, 50);
    }
  }, [commentsQuery.data]);

  const comments = commentsQuery.data ?? [];
  const workspaceUsers = workspaceUsersQuery.data ?? [];
  const usersById = new Map(workspaceUsers.map((u) => [u.user_id, u]));

  const resolveCommentActor = (
    userId: string,
  ): { name: string; avatar: string | null } => {
    const u = usersById.get(userId);
    if (!u) return { name: "Team member", avatar: null };
    const name =
      `${u.first_name ?? ""} ${u.surname ?? ""}`.trim() ||
      u.email?.split("@")[0] ||
      "Team member";
    return { name, avatar: u.avatar_url ?? null };
  };

  const submitComment = (): void => {
    const body = composerBody.trim();
    if (!body || addCommentMutation.isPending) return;
    addCommentMutation.mutate(body);
  };

  const handleReply = (comment: Comment): void => {
    const dateLabel = new Date(comment.created_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const normalised = comment.body.replace(/\s+/g, " ").trim();
    const excerpt =
      normalised.length > 120 ? `${normalised.slice(0, 120)}…` : normalised;
    const quote = `Replying to (${dateLabel}): "${excerpt}"\n`;
    setComposerBody((prev) => {
      const existing = prev.trim();
      return existing ? `${existing}\n\n${quote}` : quote;
    });
    setTimeout(() => composerRef.current?.focus(), 0);
  };

  const formatRelTime = (iso: string): string => {
    const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
    const abs = Math.abs(seconds);
    const units = [
      { threshold: 60, unit: "second" as const, div: 1 },
      { threshold: 3600, unit: "minute" as const, div: 60 },
      { threshold: 86400, unit: "hour" as const, div: 3600 },
      { threshold: 604800, unit: "day" as const, div: 86400 },
      { threshold: 2629800, unit: "week" as const, div: 604800 },
      { threshold: 31557600, unit: "month" as const, div: 2629800 },
      {
        threshold: Number.POSITIVE_INFINITY,
        unit: "year" as const,
        div: 31557600,
      },
    ];
    const sel = units.find((u) => abs < u.threshold) ?? units[0];
    const fmt = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
    return fmt.format(-Math.round(seconds / sel.div), sel.unit);
  };

  if (commentsQuery.isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-12">
        <p className="text-[13px] text-muted">Loading comments…</p>
      </div>
    );
  }

  if (commentsQuery.isError) {
    return (
      <div className="flex flex-1 items-center justify-center py-12">
        <p className="text-[13px] text-[#E05C5C]">
          Could not load comments for this task.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Thread */}
      <div
        ref={threadScrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4"
      >
        {comments.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="mb-2 h-7 w-7 text-border" />
            <p className="text-[13px] text-muted">
              No comments yet. Be the first to reply.
            </p>
          </div>
        ) : (
          <ul role="list" className="space-y-4 pb-4">
            {comments.map((comment, index) => {
              const actor = resolveCommentActor(comment.user_id);
              const isLast = index === comments.length - 1;
              const relTime = formatRelTime(comment.created_at);
              const absTime = new Date(comment.created_at).toLocaleString(
                undefined,
                {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                },
              );

              return (
                <li
                  key={comment.id}
                  className="relative grid grid-cols-[30px_minmax(0,1fr)] items-start gap-3"
                >
                  {/* connector line */}
                  <div className="relative flex justify-center">
                    {!isLast ? (
                      <span className="absolute bottom-[-16px] top-8 w-px bg-border" />
                    ) : null}
                    {actor.avatar ? (
                      <img
                        src={actor.avatar}
                        alt={actor.name}
                        className="relative z-10 mt-0.5 h-7 w-7 rounded-full border border-border bg-card object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="relative z-10 mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-[10px] font-medium text-muted">
                        {getInboxInitials(actor.name)}
                      </span>
                    )}
                  </div>

                  {/* Comment card */}
                  <div className="rounded-2xl border border-border bg-card px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm leading-5 text-foreground">
                        <span className="font-semibold">{actor.name}</span>{" "}
                        <span className="text-muted">commented</span>
                      </p>
                      <time
                        dateTime={comment.created_at}
                        title={absTime}
                        className="shrink-0 text-xs text-muted"
                      >
                        {relTime}
                      </time>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-[14px] leading-[22px] text-foreground/90">
                      {comment.body}
                    </p>
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleReply(comment)}
                        className="text-[12px] text-muted transition-colors hover:text-foreground"
                      >
                        Reply
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t border-border bg-card px-5 py-4">
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-3">
          {currentUserAvatar ? (
            <img
              src={currentUserAvatar}
              alt={currentUserName}
              className="mt-0.5 h-8 w-8 shrink-0 rounded-full border border-border object-cover"
            />
          ) : (
            <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-card text-[10px] font-semibold text-muted">
              {getInboxInitials(currentUserName)}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <label htmlFor="inbox-comment-composer" className="sr-only">
              Add your comment
            </label>
            <textarea
              id="inbox-comment-composer"
              ref={composerRef}
              value={composerBody}
              onChange={(e) => setComposerBody(e.target.value)}
              placeholder="Add your comment…"
              rows={3}
              className="w-full resize-none bg-transparent px-0 py-0 text-[14px] leading-[22px] text-foreground outline-none placeholder:text-muted"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  submitComment();
                }
              }}
            />
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <span className="text-[11px] text-muted/50">⌘↵ to submit</span>
              <button
                type="button"
                onClick={submitComment}
                disabled={!composerBody.trim() || addCommentMutation.isPending}
                className="focus-ring inline-flex h-8 items-center rounded-[5px] bg-[#5E69D1] px-3 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {addCommentMutation.isPending ? "Sending…" : "Comment"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── AppShell ─────────────────────────────────────────────────────────────────

export default function AppShell({
  children,
}: AppShellProps): React.ReactElement {
  const queryClient = useQueryClient();
  const { user, signOut } = useAuth();
  const { mode, setMode } = useTheme();
  const { workspaceId = "" } = useParams<{ workspaceId: string }>();
  const { pathname } = useLocation();
  const isDashboardRoute = pathname.includes("/dashboard");
  const navigate = useNavigate();

  useRealtimeNotifications({ userId: user?.id, workspaceId });

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("sidebarCollapsed") === "1";
  });

  const workspacesQuery = useQuery({
    queryKey: ["workspaces"],
    queryFn: getMyWorkspaces,
  });

  const notificationsQuery = useQuery({
    queryKey: queryKeys.notifications(workspaceId),
    queryFn: () => listNotifications(workspaceId),
    enabled: Boolean(workspaceId),
  });

  const unreadCountQuery = useQuery({
    queryKey: queryKeys.unreadNotifications(workspaceId),
    queryFn: () => getUnreadNotificationCount(workspaceId),
    enabled: Boolean(workspaceId),
  });

  const workspaces = workspacesQuery.data ?? [];
  const selectedWorkspace =
    workspaces.find((workspace) => workspace.id === workspaceId) ?? null;
  const selectedWorkspaceName = selectedWorkspace?.name ?? "Workspace";
  const notifications = notificationsQuery.data ?? [];
  const unreadCount = unreadCountQuery.data ?? 0;

  const workspaceNavItems = navItems.filter(
    (item) => !["clients", "time", "reports", "settings"].includes(item.key),
  );

  const adminNavItems = navItems.filter((item) =>
    ["clients", "time", "reports", "settings"].includes(item.key),
  );

  const [inboxOpen, setInboxOpen] = useState(false);
  const [activeNotificationId, setActiveNotificationId] = useState<
    string | null
  >(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [snoozedIds, setSnoozedIds] = useState<string[]>([]);

  const roleQuery = useQuery({
    queryKey: ["workspace", workspaceId, "myRole"],
    queryFn: () => getMyWorkspaceRole(workspaceId),
    enabled: Boolean(workspaceId),
  });
  const isAdmin = roleQuery.data === "admin";
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const profileFullName =
    typeof user?.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : "";
  const profileName: string =
    profileFullName.trim() || user?.email?.split("@")[0] || "Levon Gravett";
  const profileAvatarUrl = user?.user_metadata?.avatar_url as
    | string
    | undefined;
  const profileInitials = profileName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((token) => token.charAt(0).toUpperCase())
    .join("");

  const inboxItems = useMemo(
    () =>
      notifications.filter(
        (notification) => !snoozedIds.includes(notification.id),
      ),
    [notifications, snoozedIds],
  );

  const groupedInboxItems = useMemo(() => {
    const now = new Date();
    const todayStr = now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    const today: Notification[] = [];
    const yesterdayItems: Notification[] = [];
    const earlier: Notification[] = [];

    for (const item of inboxItems) {
      const itemStr = new Date(item.created_at).toDateString();
      if (itemStr === todayStr) {
        today.push(item);
      } else if (itemStr === yesterdayStr) {
        yesterdayItems.push(item);
      } else {
        earlier.push(item);
      }
    }
    return { today, yesterday: yesterdayItems, earlier };
  }, [inboxItems]);

  const activeNotification =
    inboxItems.find(
      (notification) => notification.id === activeNotificationId,
    ) ??
    inboxItems[0] ??
    null;

  useEffect(() => {
    if (!inboxOpen || inboxItems.length === 0) {
      return;
    }
    if (
      activeNotificationId &&
      inboxItems.some(
        (notification) => notification.id === activeNotificationId,
      )
    ) {
      return;
    }
    setActiveNotificationId(inboxItems[0].id);
  }, [activeNotificationId, inboxItems, inboxOpen]);

  useEffect(() => {
    if (!profileMenuOpen) return;

    const handlePointerDown = (event: PointerEvent): void => {
      const target = event.target as Node;
      if (!profileMenuRef.current?.contains(target)) {
        setProfileMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setProfileMenuOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [profileMenuOpen]);

  useEffect(() => {
    if (inboxOpen) {
      setInboxOpen(false);
    }
  }, [pathname]);

  const readMutation = useMutation({
    mutationFn: (notificationId: string) =>
      markNotificationRead(notificationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.notifications(workspaceId),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.unreadNotifications(workspaceId),
      });
    },
  });

  const unreadMutation = useMutation({
    mutationFn: (notificationId: string) =>
      markNotificationUnread(notificationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.notifications(workspaceId),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.unreadNotifications(workspaceId),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (notificationId: string) => deleteNotification(notificationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.notifications(workspaceId),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.unreadNotifications(workspaceId),
      });
      notify.info("Notification deleted");
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : "Failed to delete notification.";
      notify.error("Could not delete notification", message);
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(workspaceId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.notifications(workspaceId),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.unreadNotifications(workspaceId),
      });
      notify.success("Inbox cleared", "All notifications marked as read.");
    },
  });

  const toggleSidebar = (): void => {
    setCollapsed((previous) => {
      const next = !previous;
      if (typeof window !== "undefined") {
        window.localStorage.setItem("sidebarCollapsed", next ? "1" : "0");
      }
      return next;
    });
  };

  const shellStyle = {
    gridTemplateColumns: `${collapsed ? "72px" : "275px"} minmax(0, 1fr)`,
    "--sidebar-w": collapsed ? "72px" : "275px",
  } as CSSProperties;

  const isDarkThemeActive =
    mode === "dark" ||
    (mode === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const toggleTheme = (): void => {
    setMode(isDarkThemeActive ? "light" : "dark");
  };

  const handleSelectInboxItem = (notification: Notification): void => {
    setActiveNotificationId(notification.id);
    if (!notification.read_at && !readMutation.isPending) {
      void readMutation.mutateAsync(notification.id);
    }
  };

  const handleDeleteActive = (): void => {
    if (!activeNotification || deleteMutation.isPending) {
      return;
    }
    void deleteMutation.mutateAsync(activeNotification.id);
  };

  const handleSnoozeActive = (): void => {
    if (!activeNotification) {
      return;
    }
    setSnoozedIds((previous) => {
      if (previous.includes(activeNotification.id)) {
        return previous;
      }
      return [...previous, activeNotification.id];
    });
    notify.info("Snoozed", "Notification hidden for this session.");
  };

  const handleSignOut = async (): Promise<void> => {
    try {
      await signOut();
      navigate("/login");
      setProfileMenuOpen(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to log out.";
      notify.error("Sign out failed", message);
    }
  };

  const renderInboxMessage = (notification: Notification): InboxListItemMsg => {
    const formatted = formatNotificationMessage(notification);
    return {
      title: formatted.title,
      description: formatted.description,
      entity: formatted.entity,
      actor: formatted.actor,
      actorAvatarUrl: formatted.actorAvatarUrl,
      route: formatted.route,
      status: notification.read_at ? "Done" : "Unread",
    };
  };

  return (
    <div
      className="app-shell transition-[grid-template-columns] duration-200 ease-out"
      style={shellStyle}
    >
      <aside
        className={cn(
          "sidebar border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width,padding] duration-200 ease-out",
          collapsed ? "px-3 py-4" : "px-3 py-4",
        )}
        style={{ width: collapsed ? "72px" : "275px" }}
      >
        <div className="sidebar-top items-start">
          <button
            type="button"
            className={cn(
              "focus-ring flex min-w-0 items-center rounded-md transition-colors hover:bg-foreground/[0.05]",
              collapsed ? "h-10 w-10 justify-center px-0" : "gap-2 px-2 py-1.5",
            )}
            onClick={() => {
              setInboxOpen(false);
              navigate("/workspaces");
            }}
            aria-label="Go to workspaces"
          >
            <img src="/BPC-Logo.jpg" alt="BPC" className="h-5 w-5 rounded-sm" />
            {!collapsed ? (
              <span className="flex min-w-0 flex-col text-left">
                <span className="truncate text-[13px] font-semibold leading-4 text-sidebar-foreground">
                  Broken Pony Club
                </span>
                <span className="truncate text-xs font-medium leading-4 text-sidebar-muted">
                  Get Shit Done
                </span>
              </span>
            ) : null}
          </button>
        </div>

        <div className="mt-2 flex flex-1 flex-col overflow-hidden">
          <nav className="flex flex-col gap-2">
            {workspaceNavItems
              .filter((item) => item.key === "project-overview")
              .map(({ key, label, to, Icon }) => {
                const active = pathname.includes(`/${to}`);
                return (
                  <NavLink
                    key={key}
                    to={`/w/${workspaceId}/${to}`}
                    title={label}
                    onClick={() => setInboxOpen(false)}
                    className={cn(
                      sidebarNavItemClassName,
                      active
                        ? "bg-foreground/[0.07]"
                        : "hover:bg-foreground/[0.05]",
                      collapsed ? "h-10 justify-center px-0" : "gap-[10px]",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex h-4 w-4 shrink-0 items-center justify-center",
                        collapsed
                          ? "h-10 w-10 rounded-full bg-sidebar-border/40"
                          : "h-4 w-4 rounded-none bg-transparent",
                      )}
                    >
                      <Icon className="h-4 w-4 text-sidebar-muted" />
                    </span>
                    {!collapsed ? (
                      <span className="truncate">{label}</span>
                    ) : null}
                  </NavLink>
                );
              })}

            <button
              type="button"
              onClick={() => setInboxOpen(true)}
              title="Inbox"
              className={cn(
                sidebarNavItemClassName,
                inboxOpen
                  ? "bg-foreground/[0.07]"
                  : "hover:bg-foreground/[0.05]",
                collapsed ? "h-10 justify-center px-0" : "gap-[10px]",
              )}
            >
              <span
                className={cn(
                  "inline-flex h-4 w-4 shrink-0 items-center justify-center",
                  collapsed
                    ? "h-10 w-10 rounded-full bg-sidebar-border/40"
                    : "h-4 w-4 rounded-none bg-transparent",
                )}
              >
                <Inbox className="h-4 w-4 text-sidebar-muted" />
              </span>
              {!collapsed ? (
                <>
                  <span className="flex-1 truncate text-left">Inbox</span>
                  <span className="inline-flex min-w-[26px] items-center justify-center rounded-[4px] bg-[#5E69D1] px-[6px] py-[3px] text-[11px] font-normal leading-[13px] text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                </>
              ) : null}
            </button>

            {workspaceNavItems
              .filter((item) => item.key !== "project-overview")
              .map(({ key, label, to, Icon }) => {
                const active = pathname.includes(`/${to}`);

                return (
                  <NavLink
                    key={key}
                    to={`/w/${workspaceId}/${to}`}
                    title={label}
                    onClick={() => setInboxOpen(false)}
                    className={cn(
                      sidebarNavItemClassName,
                      active
                        ? "bg-foreground/[0.07]"
                        : "hover:bg-foreground/[0.05]",
                      collapsed ? "h-10 justify-center px-0" : "gap-[10px]",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex h-4 w-4 shrink-0 items-center justify-center",
                        collapsed
                          ? "h-10 w-10 rounded-full bg-sidebar-border/40"
                          : "h-4 w-4 rounded-none bg-transparent",
                      )}
                    >
                      <Icon className="h-4 w-4 text-sidebar-muted" />
                    </span>
                    {!collapsed ? (
                      <span className="truncate">{label}</span>
                    ) : null}
                  </NavLink>
                );
              })}
          </nav>

          {!collapsed && isAdmin && workspaces.length > 0 ? (
            <div className="mt-5 space-y-2">
              <div className="px-2 pt-2 text-[12px] font-medium leading-[15px] text-sidebar-muted">
                Workspaces
              </div>
              {workspaces.map((ws) => (
                <NavLink
                  key={ws.id}
                  to={`/w/${ws.id}/project-overview`}
                  title={ws.name}
                  onClick={() => setInboxOpen(false)}
                  className={cn(
                    sidebarNavItemClassName,
                    ws.id === workspaceId
                      ? "bg-foreground/[0.07]"
                      : "hover:bg-foreground/[0.05]",
                    "gap-[10px]",
                  )}
                >
                  <span className="truncate">{ws.name}</span>
                </NavLink>
              ))}
            </div>
          ) : null}

          {!collapsed && isAdmin ? (
            <div className="mt-5 space-y-2">
              <div className="px-2 pt-2 text-[12px] font-medium leading-[15px] text-sidebar-muted">
                Admin
              </div>
              {adminNavItems.map(({ key, label, to, Icon }) => {
                const active = pathname.includes(`/${to}`);

                return (
                  <NavLink
                    key={key}
                    to={`/w/${workspaceId}/${to}`}
                    title={label}
                    onClick={() => setInboxOpen(false)}
                    className={cn(
                      sidebarNavItemClassName,
                      active
                        ? "bg-foreground/[0.07]"
                        : "hover:bg-foreground/[0.05]",
                      "gap-[10px]",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-sidebar-muted" />
                    <span className="truncate">{label}</span>
                  </NavLink>
                );
              })}
            </div>
          ) : null}
        </div>
      </aside>

      <div className="relative flex h-full min-w-0 flex-col bg-background text-foreground">
        <header className="header z-50 h-14 shrink-0 border-b border-border/60 bg-card/95">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={toggleSidebar}
              className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-md border border-sidebar-border/70 bg-card/20 text-sidebar-muted transition-colors hover:bg-card/35 hover:text-sidebar-foreground"
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
            <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
            <h1 className="text-[18px] font-medium leading-[22px] text-foreground">
              {selectedWorkspaceName}
            </h1>
          </div>

          <div className="header-actions relative" ref={profileMenuRef}>
            <IconButton label="Search">
              <Search className="h-4 w-4" />
            </IconButton>
            <IconButton
              label={
                isDarkThemeActive
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
              onClick={toggleTheme}
            >
              {isDarkThemeActive ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </IconButton>
            <button
              type="button"
              className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-card/20 px-3 text-sidebar-muted transition-colors hover:bg-card/35 hover:text-sidebar-foreground"
              onClick={() => setProfileMenuOpen((open) => !open)}
              aria-haspopup="true"
              aria-expanded={profileMenuOpen}
              aria-label="Profile menu"
            >
              {profileAvatarUrl ? (
                <img
                  src={profileAvatarUrl}
                  alt={profileName}
                  className="h-7 w-7 rounded-full object-cover"
                />
              ) : (
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/25 text-xs font-semibold text-sidebar-foreground">
                  {profileInitials || "LG"}
                </span>
              )}
              <span className="max-w-[180px] truncate text-xs font-medium leading-4 text-sidebar-foreground">
                {profileName}
              </span>
              <ChevronDown className="h-4 w-4" />
            </button>

            {profileMenuOpen ? (
              <div className="absolute right-0 top-12 z-50 w-[224px] rounded-[8px] border border-border bg-popover p-[0.5px] shadow-soft">
                <div className="flex flex-col py-1">
                  <button
                    type="button"
                    className="focus-ring mx-1.5 inline-flex h-8 items-center justify-between rounded-[6px] px-[14px] text-[13px] leading-4 text-foreground transition-colors hover:bg-surface"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      setProfileEditOpen(true);
                    }}
                  >
                    <span>Preferences</span>
                  </button>

                  {isAdmin ? (
                    <>
                      <div className="my-1 border-b border-border/60" />

                      <button
                        type="button"
                        className="focus-ring mx-1.5 inline-flex h-8 items-center rounded-[6px] px-[14px] text-[13px] leading-4 text-foreground transition-colors hover:bg-surface"
                        onClick={() => {
                          navigate(`/w/${workspaceId}/settings`);
                          setProfileMenuOpen(false);
                        }}
                      >
                        Workspace settings
                      </button>

                      <button
                        type="button"
                        className="focus-ring mx-1.5 inline-flex h-8 items-center rounded-[6px] px-[14px] text-[13px] leading-4 text-foreground transition-colors hover:bg-surface"
                        onClick={() => {
                          navigate(`/w/${workspaceId}/clients`);
                          setProfileMenuOpen(false);
                        }}
                      >
                        Invite and manage members
                      </button>
                    </>
                  ) : null}

                  <div className="my-1 border-b border-border/60" />

                  <button
                    type="button"
                    className="focus-ring mx-1.5 inline-flex h-8 items-center justify-between rounded-[6px] px-[14px] text-[13px] leading-4 text-foreground transition-colors hover:bg-surface"
                    onClick={() => {
                      navigate("/workspaces");
                      setProfileMenuOpen(false);
                    }}
                  >
                    <span>Switch workspace</span>
                    <ChevronRight className="h-3 w-3 text-muted" />
                  </button>

                  <button
                    type="button"
                    className="focus-ring mx-1.5 inline-flex h-8 items-center justify-between rounded-[6px] px-[14px] text-[13px] leading-4 text-foreground transition-colors hover:bg-surface"
                    onClick={() => {
                      void handleSignOut();
                    }}
                  >
                    <span>Log out</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </header>

        {inboxOpen ? (
          <section className="min-h-0 flex-1 overflow-hidden bg-background">
            <div className="grid h-full min-h-0 grid-cols-[280px_minmax(0,1fr)_260px]">
              {/* ── LEFT: Inbox list ── */}
              <div className="flex min-h-0 flex-col border-r border-border bg-card">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Inbox className="h-[15px] w-[15px] text-muted" />
                    <span className="text-[13px] font-semibold text-foreground">
                      Inbox
                    </span>
                    {unreadCount > 0 ? (
                      <span className="inline-flex min-w-[18px] items-center justify-center rounded-[3px] bg-surface px-1 py-px text-[11px] font-medium leading-[16px] text-muted">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="text-[11px] text-muted transition-colors hover:text-foreground"
                      onClick={() => {
                        if (markAllReadMutation.isPending) return;
                        void markAllReadMutation.mutateAsync();
                      }}
                    >
                      Mark all read
                    </button>
                    <button
                      type="button"
                      onClick={() => setInboxOpen(false)}
                      className="focus-ring inline-flex h-6 w-6 items-center justify-center rounded-[4px] text-muted transition-colors hover:bg-surface hover:text-foreground"
                      aria-label="Close inbox"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Notification list */}
                <div className="min-h-0 flex-1 overflow-y-auto">
                  {inboxItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
                      <Inbox className="mb-3 h-8 w-8 text-border" />
                      <p className="text-[13px] text-muted">All caught up</p>
                    </div>
                  ) : (
                    <>
                      {(
                        [
                          { label: "Today", items: groupedInboxItems.today },
                          {
                            label: "Yesterday",
                            items: groupedInboxItems.yesterday,
                          },
                          {
                            label: "Earlier",
                            items: groupedInboxItems.earlier,
                          },
                        ] as const
                      ).map(({ label, items }) =>
                        items.length > 0 ? (
                          <div key={label}>
                            <div className="sticky top-0 z-10 bg-card px-3 pb-1 pt-3 text-[11px] font-medium uppercase tracking-[0.05em] text-muted/60">
                              {label}
                            </div>
                            {items.map((notification) => (
                              <InboxListItem
                                key={notification.id}
                                notification={notification}
                                isActive={
                                  activeNotification?.id === notification.id
                                }
                                msg={renderInboxMessage(notification)}
                                onSelect={() =>
                                  handleSelectInboxItem(notification)
                                }
                                onMarkRead={() => {
                                  void readMutation.mutateAsync(
                                    notification.id,
                                  );
                                }}
                                onMarkUnread={() => {
                                  void unreadMutation.mutateAsync(
                                    notification.id,
                                  );
                                }}
                                onDelete={() => {
                                  void deleteMutation.mutateAsync(
                                    notification.id,
                                  );
                                }}
                              />
                            ))}
                          </div>
                        ) : null,
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* ── MIDDLE + RIGHT ── */}
              <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] md:col-span-2 md:grid-cols-[minmax(0,1fr)_260px]">
                {/* Shared header bar */}
                <header className="flex items-center justify-between gap-3 border-b border-border bg-card px-5 py-[11px] md:col-span-2">
                  <div className="min-w-0 flex-1">
                    {activeNotification ? (
                      <p className="mb-0.5 flex items-center gap-1 truncate text-[11px] text-muted">
                        <span>{selectedWorkspaceName}</span>
                        <ChevronRight className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {renderInboxMessage(activeNotification).entity}
                        </span>
                      </p>
                    ) : null}
                    <h3 className="truncate text-[14px] font-semibold leading-[20px] text-foreground">
                      {activeNotification
                        ? renderInboxMessage(activeNotification).title
                        : "Select a notification"}
                    </h3>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="rounded-sm"
                      onClick={handleDeleteActive}
                      disabled={!activeNotification || deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="rounded-sm"
                      onClick={handleSnoozeActive}
                      disabled={!activeNotification}
                    >
                      <Clock3 className="h-4 w-4" />
                      Snooze
                    </Button>
                    {activeNotification &&
                    renderInboxMessage(activeNotification).route ? (
                      <Button
                        variant="primary"
                        size="sm"
                        className="rounded-sm"
                        onClick={() => {
                          const route =
                            renderInboxMessage(activeNotification).route;
                          if (!route) return;
                          setInboxOpen(false);
                          void navigate(route);
                        }}
                      >
                        Open Task
                      </Button>
                    ) : null}
                  </div>
                </header>

                {/* Middle: task-drawer-style content pane */}
                <div className="flex min-h-0 flex-col border-r border-border">
                  {activeNotification ? (
                    (() => {
                      const message = renderInboxMessage(activeNotification);
                      const typeLabel = getNotificationTypeLabel(
                        activeNotification.type,
                      );
                      const isChangedField =
                        activeNotification.type.endsWith("_changed");
                      const isCommentType = COMMENT_NOTIFICATION_TYPES.has(
                        activeNotification.type,
                      );

                      // Resolve task ID for comment thread experience
                      const taskIdForThread = isCommentType
                        ? (normalizeNotificationPayloadV2(
                            activeNotification.type,
                            activeNotification.payload,
                            activeNotification.workspace_id,
                          ).target?.task_id ?? null)
                        : null;

                      // ── Comment-notification branch: thread + composer ──
                      if (isCommentType && taskIdForThread) {
                        return (
                          <>
                            {/* Compact context header */}
                            <div className="shrink-0 border-b border-border px-6 py-5">
                              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
                                {typeLabel}
                              </p>
                              <h2 className="text-[18px] font-medium leading-[24px] tracking-[-0.2px] text-foreground">
                                {message.title}
                              </h2>
                              <div className="mt-2 flex items-center gap-2 text-[12px] text-muted">
                                {message.actorAvatarUrl ? (
                                  <img
                                    src={message.actorAvatarUrl}
                                    alt={message.actor}
                                    className="h-5 w-5 rounded-full object-cover"
                                  />
                                ) : (
                                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-surface text-[9px] font-bold text-muted">
                                    {getInboxInitials(message.actor)}
                                  </span>
                                )}
                                <span>{message.actor}</span>
                                <span>·</span>
                                <span>
                                  {timeAgo(activeNotification.created_at)}
                                </span>
                              </div>
                            </div>
                            {/* Full comment thread with composer */}
                            <InboxCommentThread
                              taskId={taskIdForThread}
                              workspaceId={workspaceId}
                              currentUserAvatar={profileAvatarUrl}
                              currentUserName={profileName}
                            />
                          </>
                        );
                      }

                      // ── All other notification types: original rendering ──
                      return (
                        <div className="flex-1 overflow-y-auto">
                          <div className="space-y-6 px-6 py-6">
                            {/* Title block */}
                            <div>
                              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
                                {typeLabel}
                              </p>
                              <h2 className="text-[22px] font-medium leading-[28px] tracking-[-0.3px] text-foreground">
                                {message.title}
                              </h2>
                              <div className="mt-2 flex items-center gap-2 text-[12px] text-muted">
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-surface text-[9px] font-bold text-muted">
                                  {getInboxInitials(message.actor)}
                                </span>
                                <span>{message.actor}</span>
                                <span>·</span>
                                <span>
                                  {timeAgo(activeNotification.created_at)}
                                </span>
                              </div>
                            </div>

                            <div className="border-t border-border" />

                            {/* Content block — comment fallback (no task ID) or fields */}
                            {isCommentType && message.description ? (
                              /* Comment card (fallback: no task ID resolvable) */
                              <div className="flex gap-3">
                                {message.actorAvatarUrl ? (
                                  <img
                                    src={message.actorAvatarUrl}
                                    alt={message.actor}
                                    className="mt-0.5 h-7 w-7 shrink-0 rounded-full object-cover"
                                  />
                                ) : (
                                  <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface text-[10px] font-bold text-muted">
                                    {getInboxInitials(message.actor)}
                                  </span>
                                )}
                                <div className="flex-1 rounded-[6px] border border-border bg-card px-4 py-3">
                                  <p className="mb-1.5 text-[12px] font-medium text-muted">
                                    {message.actor}
                                  </p>
                                  <p className="text-[14px] leading-[22px] text-foreground/90">
                                    {message.description}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              /* Fields block — TaskDrawer-style rows */
                              <div className="overflow-hidden rounded-[4px] border border-border bg-card">
                                {message.entity &&
                                message.entity !== "General update" ? (
                                  <div className="grid grid-cols-[120px_1fr] border-b border-border">
                                    <div className="px-3 py-2.5 text-[13px] font-medium text-muted">
                                      {activeNotification.type.startsWith(
                                        "comment.",
                                      )
                                        ? "Comment on"
                                        : "Task"}
                                    </div>
                                    <div className="px-3 py-2.5 text-[13px] font-medium text-foreground">
                                      {message.entity}
                                    </div>
                                  </div>
                                ) : null}
                                {message.description ? (
                                  <div className="grid grid-cols-[120px_1fr] border-b border-border">
                                    <div className="px-3 py-2.5 text-[13px] font-medium text-muted">
                                      {isChangedField ? "Change" : "Detail"}
                                    </div>
                                    <div className="px-3 py-2.5 text-[13px] font-medium text-foreground">
                                      {message.description}
                                    </div>
                                  </div>
                                ) : null}
                                <div className="grid grid-cols-[120px_1fr]">
                                  <div className="px-3 py-2.5 text-[13px] font-medium text-muted">
                                    From
                                  </div>
                                  <div className="flex items-center gap-1.5 px-3 py-2.5">
                                    {message.actorAvatarUrl ? (
                                      <img
                                        src={message.actorAvatarUrl}
                                        alt={message.actor}
                                        className="h-4 w-4 rounded-full object-cover"
                                      />
                                    ) : (
                                      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-surface text-[8px] font-bold text-muted">
                                        {getInboxInitials(message.actor)}
                                      </span>
                                    )}
                                    <span className="text-[13px] font-medium text-foreground">
                                      {message.actor}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="flex flex-1 flex-col items-center justify-center text-center">
                      <MessageSquare className="mb-3 h-8 w-8 text-border" />
                      <p className="text-[13px] text-muted">
                        Select an item to view details
                      </p>
                    </div>
                  )}
                </div>

                {/* Right: properties rail */}
                <div className="hidden min-h-0 bg-card md:flex md:flex-col">
                  <div className="border-b border-border px-4 py-2.5">
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
                      Properties
                    </h3>
                  </div>
                  {activeNotification ? (
                    (() => {
                      const message = renderInboxMessage(activeNotification);
                      return (
                        <div className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
                          <InboxPropertyRow label="Status">
                            <span
                              className={cn(
                                "inline-flex items-center rounded-[4px] px-2 py-0.5 text-[12px] font-medium",
                                message.status === "Unread"
                                  ? "bg-primary/15 text-primary"
                                  : "bg-surface text-muted",
                              )}
                            >
                              {message.status}
                            </span>
                          </InboxPropertyRow>
                          <InboxPropertyRow label="Type">
                            <span className="text-[13px] text-foreground/80">
                              {getNotificationTypeLabel(
                                activeNotification.type,
                              )}
                            </span>
                          </InboxPropertyRow>
                          <InboxPropertyRow label="From">
                            <div className="flex items-center gap-1.5">
                              {message.actorAvatarUrl ? (
                                <img
                                  src={message.actorAvatarUrl}
                                  alt={message.actor}
                                  className="h-5 w-5 rounded-full object-cover"
                                />
                              ) : (
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-surface text-[9px] font-bold text-muted">
                                  {getInboxInitials(message.actor)}
                                </span>
                              )}
                              <span className="text-[13px] text-foreground/80">
                                {message.actor}
                              </span>
                            </div>
                          </InboxPropertyRow>
                          <InboxPropertyRow label="Received">
                            <span className="text-[13px] text-foreground/80">
                              {timeAgo(activeNotification.created_at)}
                            </span>
                          </InboxPropertyRow>
                          {message.entity &&
                          message.entity !== "General update" ? (
                            <InboxPropertyRow label="Related">
                              <span className="text-[13px] text-foreground/80">
                                {message.entity}
                              </span>
                            </InboxPropertyRow>
                          ) : null}
                        </div>
                      );
                    })()
                  ) : (
                    <p className="px-4 py-4 text-[13px] text-muted">
                      No item selected.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <main
          className={cn(
            "main min-h-0 flex-1 overflow-y-auto",
            inboxOpen && "hidden",
            isDashboardRoute && "p-0",
          )}
        >
          {children}
        </main>
      </div>

      {profileEditOpen ? (
        <ProfileEditModal
          user={user}
          role={roleQuery.data ?? null}
          workspaceId={workspaceId}
          onClose={() => setProfileEditOpen(false)}
        />
      ) : null}
    </div>
  );
}
