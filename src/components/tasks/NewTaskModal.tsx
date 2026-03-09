import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import { Paperclip, X } from "lucide-react";

import { getWorkspaceUsers } from "@/api/workspaces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import type { TaskPriority, TaskStatus } from "@/types/models";

const statuses: TaskStatus[] = [
  "Todo",
  "Upcoming",
  "In Progress",
  "In Review",
  "Awaiting Client",
  "On Hold",
  "Complete",
  "Cancelled",
];

const priorities: TaskPriority[] = ["Low", "Medium", "High", "Urgent"];

export interface NewTaskInput {
  title: string;
  description: string;
  status: TaskStatus;
  due_date: string | null;
  assignee_user_id: string | null;
  priority: TaskPriority;
  parent_task_id?: string | null;
}

interface NewTaskModalProps {
  open: boolean;
  workspaceId: string;
  isSubmitting?: boolean;
  /** When set, the modal creates a subtask rather than a top-level task */
  parentTaskId?: string | null;
  parentTaskTitle?: string | null;
  onClose: () => void;
  onCreateTask: (input: NewTaskInput, files: File[]) => Promise<void>;
}

function formatUserDisplayName(email: string | null | undefined): string {
  if (!email) {
    return "Unassigned";
  }

  const localPart = email.split("@")[0] ?? "";
  const tokens = localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1));

  return tokens.length > 0 ? tokens.join(" ") : email;
}

export function NewTaskModal({
  open,
  workspaceId,
  isSubmitting = false,
  parentTaskId = null,
  parentTaskTitle = null,
  onClose,
  onCreateTask,
}: NewTaskModalProps): ReactElement | null {
  const isSubtask = Boolean(parentTaskId);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("Todo");
  const [assigneeUserId, setAssigneeUserId] = useState<string>("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("Medium");
  const [draftFiles, setDraftFiles] = useState<File[]>([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const workspaceUsersQuery = useQuery({
    queryKey: ["workspace", workspaceId, "users"],
    queryFn: () => getWorkspaceUsers(workspaceId),
    enabled: open && Boolean(workspaceId),
  });

  const workspaceNameQuery = useQuery({
    queryKey: ["workspace", workspaceId, "details"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspaces")
        .select("name")
        .eq("id", workspaceId)
        .single();

      if (error || !data?.name) {
        return "Workspace";
      }

      return data.name;
    },
    enabled: open && Boolean(workspaceId),
  });

  const workspaceName = useMemo(
    () => workspaceNameQuery.data ?? "Workspace",
    [workspaceNameQuery.data],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const onDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", onDocumentKeyDown);
    return () => document.removeEventListener("keydown", onDocumentKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setTitle("");
    setDescription("");
    setStatus("Todo");
    setAssigneeUserId("");
    setDueDate("");
    setPriority("Medium");
    setDraftFiles([]);
  }, [open]);

  if (!open) {
    return null;
  }

  const users = workspaceUsersQuery.data ?? [];

  const controlClassName =
    "h-10 w-full rounded-md border border-border/70 bg-background/40 px-3 text-sm text-foreground transition focus-ring";

  return (
    <div className="fixed inset-0 z-50 !mt-0 flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-[calc(100vh-3rem)] w-full max-w-[880px] flex-col overflow-hidden rounded-[4px] border border-[#292B38] bg-[#191A22] shadow-card">
        <header className="flex items-center justify-between border-b border-[#25262B] px-5 py-3">
          <div className="inline-flex items-center rounded-[4px] border border-border/70 bg-surface/60 p-0.5 text-sm">
            <button
              type="button"
              className="h-7 rounded-[3px] bg-card px-3 font-medium text-foreground"
              aria-current="page"
            >
              Task
            </button>
            <button
              type="button"
              disabled
              className="h-7 rounded-[3px] px-3 text-muted"
              aria-disabled="true"
            >
              Doc
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="focus-ring inline-flex h-7 items-center gap-1 rounded-[4px] border border-border/70 bg-card/70 px-2 text-xs font-medium text-muted transition-colors hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
            Close
          </button>
        </header>

        <div className="flex gap-3 border-b border-[#25262B] px-5 py-4">
          <div className="space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
              Workspace
            </p>
            <div className="flex h-10 items-center gap-2 rounded-[5px] border border-[#313339] bg-[#15161D] px-3 text-[13px] font-medium text-white">
              {workspaceName}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
              Type
            </p>
            <div className="flex h-10 items-center gap-2 rounded-[5px] border border-[#313339] bg-[#15161D] px-3 text-[13px] font-medium text-white">
              {isSubtask ? "Subtask" : "Task"}
            </div>
          </div>
        </div>

        {isSubtask && parentTaskTitle ? (
          <div className="flex items-center gap-2 border-b border-[#25262B] bg-[#15161D] px-5 py-2.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-[#97989E]">
              Parent task:
            </span>
            <span className="truncate text-[13px] font-medium text-[#C4C5CC]">
              {parentTaskTitle}
            </span>
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted">
                Task Name
              </label>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Write a clear task title"
                className={controlClassName}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted">
                Description
              </label>
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Add context, acceptance criteria, or links"
                className="min-h-[110px] rounded-md border-border/70 bg-background/40 text-sm text-foreground placeholder:text-muted"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted">Status</label>
                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as TaskStatus)
                  }
                  className={controlClassName}
                >
                  {statuses.map((statusOption) => (
                    <option key={statusOption} value={statusOption}>
                      {statusOption}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted">
                  Assignee
                </label>
                <select
                  value={assigneeUserId}
                  onChange={(event) => setAssigneeUserId(event.target.value)}
                  className={controlClassName}
                >
                  <option value="">Unassigned</option>
                  {users.map((workspaceUser) => (
                    <option
                      key={workspaceUser.user_id}
                      value={workspaceUser.user_id}
                    >
                      {`${workspaceUser.first_name ?? ""} ${workspaceUser.surname ?? ""}`.trim() ||
                        formatUserDisplayName(workspaceUser.email)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted">
                  Due Date
                </label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  className={controlClassName}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(event) =>
                    setPriority(event.target.value as TaskPriority)
                  }
                  className={controlClassName}
                >
                  {priorities.map((priorityOption) => (
                    <option key={priorityOption} value={priorityOption}>
                      {priorityOption}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {draftFiles.length > 0 ? (
              <div className="space-y-2 rounded-[6px] border border-border/70 bg-surface/30 p-3">
                {draftFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between rounded-[5px] border border-border/60 bg-card/60 px-3 py-2"
                  >
                    <span className="truncate pr-3 text-sm text-foreground">
                      {file.name}
                    </span>
                    <button
                      type="button"
                      className="focus-ring text-xs font-medium text-muted transition-colors hover:text-foreground"
                      onClick={() =>
                        setDraftFiles((previous) =>
                          previous.filter(
                            (_, currentIndex) => currentIndex !== index,
                          ),
                        )
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <footer className="flex items-center justify-between border-t border-[#25262B] bg-[#15161D] px-5 py-4">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(event) => {
              const selectedFiles = Array.from(event.target.files ?? []);
              if (selectedFiles.length === 0) {
                return;
              }
              setDraftFiles((previous) => [...previous, ...selectedFiles]);
              event.currentTarget.value = "";
            }}
          />
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="mr-1 h-3.5 w-3.5" />
            Add Attachment
          </Button>

          <Button
            type="button"
            variant="primary"
            size="md"
            disabled={!title.trim() || isSubmitting}
            onClick={async () => {
              await onCreateTask(
                {
                  title: title.trim(),
                  description: description.trim(),
                  status,
                  due_date: dueDate || null,
                  assignee_user_id: assigneeUserId || null,
                  priority,
                  parent_task_id: parentTaskId ?? null,
                },
                draftFiles,
              );
            }}
          >
            {isSubmitting
              ? "Creating..."
              : isSubtask
                ? "Create Subtask"
                : "Create Task"}
          </Button>
        </footer>
      </div>
    </div>
  );
}
