import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Paperclip, Plus, X } from "lucide-react";

import { getWorkspaceUsers } from "@/api/workspaces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import type { Task, TaskPriority, TaskStatus } from "@/types/models";

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

const priorities: TaskPriority[] = ["Normal", "Medium", "High", "Urgent"];

const PANEL_ANIMATION_MS = 500;
const PANEL_EASING = "cubic-bezier(0.32, 0.72, 0, 1)";

type EntryMode = "task" | "quick";

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
  onCreateTask: (input: NewTaskInput, files: File[]) => Promise<Task>;
}

interface PanelSectionProps {
  title: string;
  children: ReactElement | ReactElement[];
  className?: string;
  divider?: boolean;
}

function PanelSection({
  title,
  children,
  className,
  divider = true,
}: PanelSectionProps): ReactElement {
  return (
    <section
      className={cn(
        "space-y-4",
        divider
          ? "border-t border-[#DCDCDC] dark:border-[#25262B] pt-8"
          : "pt-0",
        className,
      )}
    >
      <div className="space-y-1">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#666666] dark:text-[#939496]">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

interface FieldProps {
  label: string;
  helper?: string;
  children: ReactElement;
}

function Field({ label, helper, children }: FieldProps): ReactElement {
  return (
    <label className="block space-y-2">
      <span className="block text-[13px] font-medium leading-4 text-[#1A1A1A] dark:text-white">
        {label}
      </span>
      {children}
      {helper ? (
        <span className="block text-[12px] leading-5 text-[#666666] dark:text-[#7E8087]">
          {helper}
        </span>
      ) : null}
    </label>
  );
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

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(baseDate: Date, days: number): Date {
  const nextDate = new Date(baseDate);
  nextDate.setHours(0, 0, 0, 0);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function startOfNextWeek(baseDate: Date): Date {
  const nextDate = new Date(baseDate);
  nextDate.setHours(0, 0, 0, 0);
  const day = nextDate.getDay();
  const daysUntilMonday = (8 - day) % 7 || 7;
  nextDate.setDate(nextDate.getDate() + daysUntilMonday);
  return nextDate;
}

function formatDateChipLabel(value: string): string {
  if (!value) {
    return "Pick date";
  }

  return value;
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
  const [priority, setPriority] = useState<TaskPriority>("Normal");
  const [draftFiles, setDraftFiles] = useState<File[]>([]);
  const [draftSubtaskTitle, setDraftSubtaskTitle] = useState("");
  const [draftSubtasks, setDraftSubtasks] = useState<string[]>([]);
  const [entryMode, setEntryMode] = useState<EntryMode>("task");
  const [quickEntryBody, setQuickEntryBody] = useState("");

  const [isRendered, setIsRendered] = useState(open);
  const [isVisible, setIsVisible] = useState(open);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);

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
    if (open) {
      setIsRendered(true);
      const frame = window.requestAnimationFrame(() => {
        setIsVisible(true);
      });
      return () => window.cancelAnimationFrame(frame);
    }

    setIsVisible(false);
    const timeout = window.setTimeout(() => {
      setIsRendered(false);
    }, PANEL_ANIMATION_MS);

    return () => window.clearTimeout(timeout);
  }, [open]);

  useEffect(() => {
    if (!isRendered) {
      return;
    }

    const onDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", onDocumentKeyDown);
    return () => document.removeEventListener("keydown", onDocumentKeyDown);
  }, [isRendered, onClose]);

  useEffect(() => {
    if (!open || !isRendered) {
      return;
    }

    setTitle("");
    setDescription("");
    setStatus("Todo");
    setAssigneeUserId("");
    setDueDate("");
    setPriority("Normal");
    setDraftFiles([]);
    setDraftSubtaskTitle("");
    setDraftSubtasks([]);
    setEntryMode("task");
    setQuickEntryBody("");

    const frame = window.requestAnimationFrame(() => {
      titleInputRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [open, isRendered]);

  if (!isRendered) {
    return null;
  }

  const users = workspaceUsersQuery.data ?? [];
  const panelTitle = isSubtask ? "Add subtask" : "New Task";
  const quickEntryLines = quickEntryBody
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const controlClassName =
    "h-[46px] w-full rounded-[5px] border border-[#DCDCDC] dark:border-[#25262B] bg-white dark:bg-[#15161D] px-3 text-[13px] text-[#1A1A1A] dark:text-white transition focus-ring placeholder:text-[#666666] dark:placeholder:text-[#939496]";
  const selectClassName = cn(
    controlClassName,
    "appearance-none bg-[image:none] pr-10",
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDateChips = [
    { label: "Today", value: toDateInputValue(today) },
    { label: "Tomorrow", value: toDateInputValue(addDays(today, 1)) },
    { label: "+2d", value: toDateInputValue(addDays(today, 2)) },
    { label: "Next Week", value: toDateInputValue(startOfNextWeek(today)) },
  ];

  function applyDueDate(nextDate: string) {
    setDueDate(nextDate);
  }

  function addDraftSubtask() {
    const trimmedTitle = draftSubtaskTitle.trim();
    if (!trimmedTitle) {
      return;
    }

    setDraftSubtasks((previous) => [...previous, trimmedTitle]);
    setDraftSubtaskTitle("");
  }

  async function handleTaskSubmit() {
    const createdTask = await onCreateTask(
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

    if (draftSubtasks.length > 0) {
      for (const subtaskTitle of draftSubtasks) {
        await onCreateTask(
          {
            title: subtaskTitle,
            description: "",
            status,
            due_date: dueDate || null,
            assignee_user_id: assigneeUserId || null,
            priority,
            parent_task_id: createdTask.id,
          },
          [],
        );
      }
    }

    onClose();
  }

  async function handleQuickEntrySubmit() {
    for (const line of quickEntryLines) {
      await onCreateTask(
        {
          title: line,
          description: "",
          status,
          due_date: dueDate || null,
          assignee_user_id: assigneeUserId || null,
          priority,
          parent_task_id: parentTaskId ?? null,
        },
        [],
      );
    }

    onClose();
  }

  const canSubmit =
    entryMode === "quick"
      ? quickEntryLines.length > 0
      : title.trim().length > 0;

  const panelStyle = {
    transform: isVisible
      ? "translateX(0) scale(1)"
      : "translateX(24px) scale(0.985)",
    opacity: isVisible ? 1 : 0,
    transition: `transform ${PANEL_ANIMATION_MS}ms ${PANEL_EASING}, opacity ${PANEL_ANIMATION_MS}ms ${PANEL_EASING}`,
  } satisfies CSSProperties;

  const contentStyle = {
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? "translateY(0)" : "translateY(10px)",
    transition: `transform ${PANEL_ANIMATION_MS}ms ${PANEL_EASING}, opacity ${PANEL_ANIMATION_MS}ms ${PANEL_EASING}`,
  } satisfies CSSProperties;

  return (
    <div className="fixed inset-0 z-50 !mt-0">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        aria-hidden="true"
        onClick={onClose}
      />

      <div className="absolute inset-0">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-task-panel-title"
          className="absolute bottom-6 right-6 top-6 flex w-[min(640px,calc(100vw-48px))] flex-col overflow-hidden rounded-[8px] border border-[#DCDCDC] dark:border-[#2A2B31] bg-white dark:bg-[#191A22] text-[#1A1A1A] dark:text-white shadow-[0_32px_80px_rgba(0,0,0,0.4),0_0_0_1px_#000]"
          style={panelStyle}
        >
          <header className="flex flex-col border-b border-[#DCDCDC] dark:border-[#25262B] pl-10 pr-5 pt-4">
            <div className="flex items-center justify-between">
              {/* Mode tabs */}
              <div className="-mb-px flex items-end gap-0">
                {(
                  [
                    ["task", "Task"],
                    ["quick", "Quick Entry"],
                  ] as const
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setEntryMode(mode)}
                    className={cn(
                      "focus-ring relative px-4 pb-3 text-[13px] font-medium transition-colors",
                      entryMode === mode
                        ? "text-[#1A1A1A] dark:text-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:rounded-full after:bg-[#1A1A1A] dark:after:bg-white after:content-['']"
                        : "text-[#666666] dark:text-[#6F7381] hover:text-[#1A1A1A] dark:hover:text-[#A5A8B3]",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="focus-ring inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] text-[#666666] dark:text-[#6F7381] transition-colors hover:bg-[#F5F5F5] dark:hover:bg-[#20212A] hover:text-[#1A1A1A] dark:hover:text-white"
                aria-label="Close task panel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto" style={contentStyle}>
            <div className="mx-auto w-full px-10 py-8">
              <div className="space-y-1">
                <p className="text-[28px] font-medium leading-[1.1] tracking-[-0.03em] text-[#1A1A1A] dark:text-white sm:text-[32px]">
                  {panelTitle}
                </p>
                {/* Breadcrumb */}
                <div className="flex flex-wrap items-center gap-1.5 text-[12px] font-medium text-[#666666] dark:text-[#6F7381]">
                  <span>{workspaceName}</span>
                  <span className="text-[#DCDCDC] dark:text-[#4E5058]">/</span>
                  <span>
                    {isSubtask && parentTaskTitle ? parentTaskTitle : "Task"}
                  </span>
                </div>
              </div>

              <div className="h-6" />

              {entryMode === "quick" ? (
                <>
                  <PanelSection title="Tasks" divider={false}>
                    <Field
                      label="Tasks"
                      helper="Each non-empty line creates a task using current defaults (priority, due date, tags)."
                    >
                      <Textarea
                        value={quickEntryBody}
                        onChange={(event) =>
                          setQuickEntryBody(event.target.value)
                        }
                        placeholder="Enter one task per line"
                        className="min-h-[220px] rounded-[6px] border border-[#DCDCDC] dark:border-[#2A2B31] bg-white dark:bg-[#15161D] px-4 py-3 text-[14px] leading-7 text-[#1A1A1A] dark:text-white placeholder:text-[#666666] dark:placeholder:text-[#666A75]"
                      />
                    </Field>
                  </PanelSection>
                </>
              ) : (
                <>
                  <PanelSection title="Task Name" divider={false}>
                    <Field label="Task Name">
                      <Input
                        ref={titleInputRef}
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        placeholder="What needs to be done?"
                        className="h-[50px] rounded-[6px] border border-[#DCDCDC] dark:border-[#2A2B31] bg-white dark:bg-[#15161D] px-4 text-[15px] font-medium text-[#1A1A1A] dark:text-white placeholder:text-[#666666] dark:placeholder:text-[#666A75]"
                      />
                    </Field>
                  </PanelSection>

                  <PanelSection title="Due Date">
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {dueDateChips.map((chip) => {
                          const active = dueDate === chip.value;

                          return (
                            <button
                              key={chip.label}
                              type="button"
                              onClick={() => applyDueDate(chip.value)}
                              className={cn(
                                "focus-ring inline-flex h-8 items-center rounded-full border px-3 text-[12px] font-medium transition-colors",
                                active
                                  ? "border-[#DCDCDC] dark:border-[#3E4453] bg-[#F5F5F5] dark:bg-[#23262F] text-[#1A1A1A] dark:text-white"
                                  : "border-[#DCDCDC] dark:border-[#2A2B31] bg-white dark:bg-[#15161D] text-[#666666] dark:text-[#A5A8B3] hover:border-[#DCDCDC] dark:hover:border-[#373A43] hover:text-[#1A1A1A] dark:hover:text-white",
                              )}
                            >
                              {chip.label}
                            </button>
                          );
                        })}

                        <button
                          type="button"
                          onClick={() => applyDueDate("")}
                          className={cn(
                            "focus-ring inline-flex h-8 items-center rounded-full border px-3 text-[12px] font-medium transition-colors",
                            dueDate === ""
                              ? "border-[#DCDCDC] dark:border-[#3E4453] bg-[#F5F5F5] dark:bg-[#23262F] text-[#1A1A1A] dark:text-white"
                              : "border-[#DCDCDC] dark:border-[#2A2B31] bg-white dark:bg-[#15161D] text-[#666666] dark:text-[#A5A8B3] hover:border-[#DCDCDC] dark:hover:border-[#373A43] hover:text-[#1A1A1A] dark:hover:text-white",
                          )}
                        >
                          No Date
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const input = dateInputRef.current;
                            if (!input) {
                              return;
                            }

                            if (typeof input.showPicker === "function") {
                              input.showPicker();
                            } else {
                              input.click();
                              input.focus();
                            }
                          }}
                          className={cn(
                            "focus-ring inline-flex h-8 items-center rounded-full border px-3 text-[12px] font-medium transition-colors",
                            dueDate
                              ? "border-[#DCDCDC] dark:border-[#3E4453] bg-[#F5F5F5] dark:bg-[#23262F] text-[#1A1A1A] dark:text-white"
                              : "border-[#DCDCDC] dark:border-[#2A2B31] bg-white dark:bg-[#15161D] text-[#666666] dark:text-[#A5A8B3] hover:border-[#DCDCDC] dark:hover:border-[#373A43] hover:text-[#1A1A1A] dark:hover:text-white",
                          )}
                        >
                          {formatDateChipLabel(dueDate)}
                        </button>
                      </div>

                      <input
                        ref={dateInputRef}
                        type="date"
                        value={dueDate}
                        onChange={(event) => setDueDate(event.target.value)}
                        className="sr-only"
                        aria-label="Choose due date"
                        tabIndex={-1}
                      />
                    </div>
                  </PanelSection>

                  <PanelSection title="Details">
                    <div className="grid gap-3 md:grid-cols-3">
                      <Field label="Status">
                        <div className="relative">
                          <select
                            value={status}
                            onChange={(event) =>
                              setStatus(event.target.value as TaskStatus)
                            }
                            className={selectClassName}
                          >
                            {statuses.map((statusOption) => (
                              <option key={statusOption} value={statusOption}>
                                {statusOption}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#666666] dark:text-[#6F7381]" />
                        </div>
                      </Field>

                      <Field label="Assigned to">
                        <div className="relative">
                          <select
                            value={assigneeUserId}
                            onChange={(event) =>
                              setAssigneeUserId(event.target.value)
                            }
                            className={selectClassName}
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
                          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#666666] dark:text-[#6F7381]" />
                        </div>
                      </Field>

                      <Field label="Priority">
                        <div className="relative">
                          <select
                            value={priority}
                            onChange={(event) =>
                              setPriority(event.target.value as TaskPriority)
                            }
                            className={selectClassName}
                          >
                            {priorities.map((priorityOption) => (
                              <option
                                key={priorityOption}
                                value={priorityOption}
                              >
                                {priorityOption}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#666666] dark:text-[#6F7381]" />
                        </div>
                      </Field>
                    </div>
                  </PanelSection>

                  <PanelSection title="Description">
                    <Field label="Description">
                      <Textarea
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder="Add context, acceptance criteria, or links"
                        className="min-h-[120px] rounded-[5px] border border-[#DCDCDC] dark:border-[#25262B] bg-white dark:bg-[#15161D] px-3 py-2.5 text-[13px] leading-6 text-[#1A1A1A] dark:text-white placeholder:text-[#666666] dark:placeholder:text-[#939496]"
                      />
                    </Field>
                  </PanelSection>

                  <PanelSection title="Add Subtasks">
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <Input
                          value={draftSubtaskTitle}
                          onChange={(event) =>
                            setDraftSubtaskTitle(event.target.value)
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              addDraftSubtask();
                            }
                          }}
                          placeholder="Add a subtask"
                          className="h-10 rounded-[5px] border border-[#DCDCDC] dark:border-[#25262B] bg-white dark:bg-[#15161D] px-3 text-[13px] text-[#1A1A1A] dark:text-white placeholder:text-[#666666] dark:placeholder:text-[#939496]"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="h-10 rounded-[5px] px-3"
                          onClick={addDraftSubtask}
                        >
                          <Plus className="mr-1 h-3.5 w-3.5" />
                          Add
                        </Button>
                      </div>

                      {draftSubtasks.length > 0 ? (
                        <div className="space-y-2">
                          {draftSubtasks.map((subtask, index) => (
                            <div
                              key={`${subtask}-${index}`}
                              className="flex items-center justify-between rounded-[5px] border border-[#DCDCDC] dark:border-[#25262B] bg-white dark:bg-[#15161D] px-3 py-2"
                            >
                              <span className="truncate text-[13px] text-[#1A1A1A] dark:text-white">
                                {subtask}
                              </span>
                              <button
                                type="button"
                                className="focus-ring rounded-[4px] px-2 py-1 text-[12px] font-medium text-[#666666] dark:text-[#939496] transition-colors hover:text-[#1A1A1A] dark:hover:text-white"
                                onClick={() =>
                                  setDraftSubtasks((previous) =>
                                    previous.filter(
                                      (_, currentIndex) =>
                                        currentIndex !== index,
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
                  </PanelSection>

                  <PanelSection title="Attach supporting files">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="mt-1 text-[12px] leading-5 text-[#666666] dark:text-[#7E8087]">
                            Upload briefs, screenshots, or reference docs
                            alongside the task.
                          </p>
                        </div>

                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="h-9 rounded-[5px]"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Paperclip className="mr-1 h-3.5 w-3.5" />
                          Add Attachment
                        </Button>
                      </div>

                      {draftFiles.length > 0 ? (
                        <div className="space-y-2">
                          {draftFiles.map((file, index) => (
                            <div
                              key={`${file.name}-${index}`}
                              className="flex items-center justify-between gap-3 rounded-[5px] border border-[#DCDCDC] dark:border-[#25262B] bg-white dark:bg-[#15161D] px-3 py-2.5"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-[13px] font-medium text-[#1A1A1A] dark:text-white">
                                  {file.name}
                                </p>
                                <p className="text-[12px] text-[#666666] dark:text-[#7E8087]">
                                  {(file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                              <button
                                type="button"
                                className="focus-ring rounded-[4px] px-2 py-1 text-[12px] font-medium text-[#666666] dark:text-[#939496] transition-colors hover:text-[#1A1A1A] dark:hover:text-white"
                                onClick={() =>
                                  setDraftFiles((previous) =>
                                    previous.filter(
                                      (_, currentIndex) =>
                                        currentIndex !== index,
                                    ),
                                  )
                                }
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[13px] leading-6 text-[#666666] dark:text-[#7E8087]">
                          No files attached yet.
                        </p>
                      )}
                    </div>
                  </PanelSection>
                </>
              )}

              <div className="h-6" />
            </div>
          </div>

          <footer className="border-t border-[#DCDCDC] dark:border-[#25262B] bg-[#FBFBFB] dark:bg-[#191A22] px-6 py-4">
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

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-[12px] leading-5 text-[#666666] dark:text-[#7E8087]">
                {draftFiles.length > 0
                  ? `${draftFiles.length} attachment${draftFiles.length === 1 ? "" : "s"} ready to upload`
                  : "Attachments will upload with the task when you create it."}
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 rounded-[5px]"
                  onClick={onClose}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className="h-9 rounded-[5px] px-3.5"
                  disabled={!canSubmit || isSubmitting}
                  onClick={async () => {
                    if (entryMode === "quick") {
                      await handleQuickEntrySubmit();
                      return;
                    }

                    await handleTaskSubmit();
                  }}
                >
                  {isSubmitting
                    ? "Creating..."
                    : entryMode === "quick"
                      ? isSubtask
                        ? "Create Subtasks"
                        : "Create Tasks"
                      : isSubtask
                        ? "Create Subtask"
                        : "Create Task"}
                </Button>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
