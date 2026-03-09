import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Archive,
  Copy,
  Download,
  ExternalLink,
  FileText,
  KeyRound,
  Link2,
  Package,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  type AssetType,
  type CreateAssetInput,
  createAssetFileDownloadUrl,
  createWorkspaceAsset,
  deleteWorkspaceAsset,
  listWorkspaceAssets,
  updateWorkspaceAsset,
  uploadAssetFile,
} from "@/api";
import { Button } from "@/components/ui/button";
import { DataStateWrapper } from "@/components/ui/DataStateWrapper";
import { Input } from "@/components/ui/input";
import { timeAgo } from "@/lib/notifications/timeAgo";
import { queryKeys } from "@/lib/queryKeys";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { WorkspaceAsset } from "@/types/models";

// ─── Type config ─────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  AssetType,
  {
    label: string;
    Icon: React.FC<{ className?: string }>;
    color: string;
    bgColor: string;
  }
> = {
  file: {
    label: "File",
    Icon: FileText,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
  },
  link: {
    label: "Link",
    Icon: Link2,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
  },
  login: {
    label: "Login",
    Icon: KeyRound,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
  },
  plugin: {
    label: "Plugin",
    Icon: Package,
    color: "text-green-400",
    bgColor: "bg-green-500/10",
  },
};

type FilterType = "all" | AssetType;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function extractDomain(url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url.slice(0, 40);
  }
}

async function copyToClipboard(text: string, label: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    notify.success("Copied", `${label} copied to clipboard.`);
  } catch {
    notify.error("Copy failed", "Please copy manually.");
  }
}

// ─── Asset Card ───────────────────────────────────────────────────────────────

function AssetCard({
  asset,
  onEdit,
  onDelete,
  onDownload,
}: {
  asset: WorkspaceAsset;
  onEdit: (a: WorkspaceAsset) => void;
  onDelete: (a: WorkspaceAsset) => void;
  onDownload: (a: WorkspaceAsset) => void;
}): React.ReactElement {
  const assetType = asset.type as AssetType;
  const cfg = TYPE_CONFIG[assetType] ?? TYPE_CONFIG.link;
  const { Icon } = cfg;

  return (
    <div className="group flex items-start gap-4 rounded-lg border border-[#252636] bg-[#1A1B25] px-4 py-3.5 transition-colors hover:bg-[#1E1F2C]">
      {/* Type icon */}
      <div
        className={cn(
          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          cfg.bgColor,
        )}
      >
        <Icon className={cn("h-4 w-4", cfg.color)} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-foreground">{asset.title}</p>
          <span
            className={cn(
              "inline-flex items-center rounded-[4px] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              cfg.bgColor,
              cfg.color,
            )}
          >
            {cfg.label}
          </span>
          {asset.category ? (
            <span className="inline-flex items-center rounded-[4px] border border-[#292B38] px-1.5 py-0.5 text-[10px] text-[#6B6C7E]">
              {asset.category}
            </span>
          ) : null}
        </div>

        {asset.description ? (
          <p className="mt-1 line-clamp-2 text-xs text-muted">
            {asset.description}
          </p>
        ) : null}

        {/* Type-specific secondary info */}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#5F6272]">
          {assetType === "file" && (
            <>
              {asset.file_name ? (
                <span className="font-mono">{asset.file_name}</span>
              ) : null}
              {asset.file_size_bytes ? (
                <span>{formatFileSize(asset.file_size_bytes)}</span>
              ) : null}
            </>
          )}
          {assetType === "link" && asset.url ? (
            <span className="truncate">{extractDomain(asset.url)}</span>
          ) : null}
          {assetType === "login" && (
            <>
              {asset.username ? (
                <span className="truncate">{asset.username}</span>
              ) : null}
              {asset.url ? (
                <span className="truncate">{extractDomain(asset.url)}</span>
              ) : null}
              {asset.notes ? (
                <span className="truncate">{asset.notes.slice(0, 60)}</span>
              ) : null}
            </>
          )}
          {assetType === "plugin" && (
            <>
              {asset.vendor ? <span>{asset.vendor}</span> : null}
              {asset.url ? (
                <span className="truncate">{extractDomain(asset.url)}</span>
              ) : null}
              {asset.notes ? (
                <span className="truncate">{asset.notes.slice(0, 60)}</span>
              ) : null}
            </>
          )}
          <span className="ml-auto shrink-0">{timeAgo(asset.created_at)}</span>
        </div>
      </div>

      {/* Actions (appear on hover) */}
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {/* Open link */}
        {(assetType === "link" ||
          assetType === "login" ||
          assetType === "plugin") &&
        asset.url ? (
          <button
            type="button"
            title="Open link"
            onClick={() => window.open(asset.url!, "_blank", "noopener")}
            className="inline-flex h-7 w-7 items-center justify-center rounded-[4px] text-[#5F6272] transition-colors hover:bg-[#2A2C3A] hover:text-[#B0B1BC]"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        ) : null}

        {/* Download file */}
        {assetType === "file" && asset.file_path ? (
          <button
            type="button"
            title="Download"
            onClick={() => onDownload(asset)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-[4px] text-[#5F6272] transition-colors hover:bg-[#2A2C3A] hover:text-[#B0B1BC]"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
        ) : null}

        {/* Copy URL */}
        {asset.url ? (
          <button
            type="button"
            title="Copy URL"
            onClick={() => void copyToClipboard(asset.url!, "URL")}
            className="inline-flex h-7 w-7 items-center justify-center rounded-[4px] text-[#5F6272] transition-colors hover:bg-[#2A2C3A] hover:text-[#B0B1BC]"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        ) : null}

        {/* Copy username */}
        {assetType === "login" && asset.username ? (
          <button
            type="button"
            title="Copy username"
            onClick={() => void copyToClipboard(asset.username!, "Username")}
            className="inline-flex h-7 w-7 items-center justify-center rounded-[4px] text-[#5F6272] transition-colors hover:bg-[#2A2C3A] hover:text-[#B0B1BC]"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        ) : null}

        {/* Edit */}
        <button
          type="button"
          title="Edit"
          onClick={() => onEdit(asset)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-[4px] text-[#5F6272] transition-colors hover:bg-[#2A2C3A] hover:text-[#B0B1BC]"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>

        {/* Delete */}
        <button
          type="button"
          title="Delete"
          onClick={() => onDelete(asset)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-[4px] text-[#5F6272] transition-colors hover:bg-[#2A2C3A] hover:text-[#E05C5C]"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function AssetLibraryPage(): React.ReactElement {
  const { workspaceId = "" } = useParams<{ workspaceId: string }>();
  const queryClient = useQueryClient();

  // ── Filter ────────────────────────────────────────────────────────────────
  const [filter, setFilter] = useState<FilterType>("all");

  // ── Modal state ───────────────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<WorkspaceAsset | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkspaceAsset | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Form state ────────────────────────────────────────────────────────────
  const [formType, setFormType] = useState<AssetType>("link");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formUsername, setFormUsername] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formVendor, setFormVendor] = useState("");
  const [formClientVisible, setFormClientVisible] = useState(true);
  const [formFile, setFormFile] = useState<File | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ── Query ─────────────────────────────────────────────────────────────────
  const assetsQuery = useQuery({
    queryKey: queryKeys.workspaceAssets(workspaceId),
    queryFn: () => listWorkspaceAssets(workspaceId),
    enabled: Boolean(workspaceId),
  });

  const assets = assetsQuery.data ?? [];
  const filtered =
    filter === "all" ? assets : assets.filter((a) => a.type === filter);

  const counts = {
    all: assets.length,
    file: assets.filter((a) => a.type === "file").length,
    link: assets.filter((a) => a.type === "link").length,
    login: assets.filter((a) => a.type === "login").length,
    plugin: assets.filter((a) => a.type === "plugin").length,
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  function resetForm(type: AssetType = "link"): void {
    setFormType(type);
    setFormTitle("");
    setFormDescription("");
    setFormCategory("");
    setFormUrl("");
    setFormUsername("");
    setFormNotes("");
    setFormVendor("");
    setFormClientVisible(true);
    setFormFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function openCreate(type: AssetType = "link"): void {
    setEditingAsset(null);
    resetForm(type);
    setModalOpen(true);
  }

  function openEdit(asset: WorkspaceAsset): void {
    setEditingAsset(asset);
    setFormType(asset.type as AssetType);
    setFormTitle(asset.title);
    setFormDescription(asset.description ?? "");
    setFormCategory(asset.category ?? "");
    setFormUrl(asset.url ?? "");
    setFormUsername(asset.username ?? "");
    setFormNotes(asset.notes ?? "");
    setFormVendor(asset.vendor ?? "");
    setFormClientVisible(asset.client_visible);
    setFormFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setModalOpen(true);
  }

  function closeModal(): void {
    setModalOpen(false);
    setEditingAsset(null);
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!formTitle.trim() || formSubmitting) return;
    setFormSubmitting(true);

    try {
      const base: Partial<CreateAssetInput> = {
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        category: formCategory.trim() || null,
        url: formUrl.trim() || null,
        username: formUsername.trim() || null,
        notes: formNotes.trim() || null,
        vendor: formVendor.trim() || null,
        client_visible: formClientVisible,
      };

      if (editingAsset) {
        await updateWorkspaceAsset(workspaceId, editingAsset.id, base);
        notify.success("Asset updated", formTitle.trim());
      } else {
        let fileData: Partial<CreateAssetInput> = {};
        if (formType === "file" && formFile) {
          const uploaded = await uploadAssetFile(workspaceId, formFile);
          fileData = {
            file_name: uploaded.fileName,
            file_path: uploaded.filePath,
            file_size_bytes: uploaded.fileSizeBytes,
          };
        }

        await createWorkspaceAsset(workspaceId, {
          type: formType,
          ...base,
          ...fileData,
        } as CreateAssetInput);

        notify.success("Asset added", formTitle.trim());
      }

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.workspaceAssets(workspaceId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.notifications(workspaceId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.unreadNotifications(workspaceId),
        }),
      ]);

      closeModal();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Operation failed";
      notify.error("Failed", msg);
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleDelete(asset: WorkspaceAsset): Promise<void> {
    setIsDeleting(true);
    try {
      await deleteWorkspaceAsset(workspaceId, asset.id, asset.file_path);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.workspaceAssets(workspaceId),
      });
      setDeleteTarget(null);
      notify.success("Asset deleted");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      notify.error("Delete failed", msg);
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleDownload(asset: WorkspaceAsset): Promise<void> {
    if (!asset.file_path) return;
    try {
      const url = await createAssetFileDownloadUrl(asset.file_path);
      window.open(url, "_blank", "noopener");
    } catch {
      notify.error("Download failed", "Could not generate a download link.");
    }
  }

  // Auto-scroll modal title input into view when modal opens
  useEffect(() => {
    if (!modalOpen) return;
    const timer = setTimeout(() => {
      document.getElementById("asset-modal-title")?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, [modalOpen]);

  // ── Render ─────────────────────────────────────────────────────────────────

  const FILTERS: { key: FilterType; label: string }[] = [
    { key: "all", label: "All" },
    { key: "file", label: "Files" },
    { key: "link", label: "Links" },
    { key: "login", label: "Logins" },
    { key: "plugin", label: "Plugins" },
  ];

  return (
    <DataStateWrapper
      isLoading={assetsQuery.isLoading}
      isError={assetsQuery.isError}
      error={assetsQuery.error}
      onRetry={() => void assetsQuery.refetch()}
      isEmpty={false}
      skeleton={
        <div className="space-y-3 p-6">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-lg bg-[#1E1F2D]"
            />
          ))}
        </div>
      }
      empty={<span />}
    >
      <div className="flex flex-col space-y-5 p-6">
        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                Asset Library
              </h1>
            </div>
            <p className="mt-1 text-sm text-muted">
              Shared project assets — files, design links, login references, and
              plugin details.
            </p>
          </div>
          <Button onClick={() => openCreate()} className="shrink-0">
            <Plus className="h-4 w-4" />
            Add Asset
          </Button>
        </div>

        {/* ── Filter pills ──────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                "flex items-center gap-1.5 rounded-[6px] border px-3 py-1.5 text-xs font-medium transition-colors",
                filter === key
                  ? "border-primary/60 bg-primary/10 text-primary"
                  : "border-[#292B38] bg-[#1E1F2D] text-muted hover:border-[#3A3B4A] hover:text-foreground",
              )}
            >
              {label}
              <span className="tabular-nums opacity-70">{counts[key]}</span>
            </button>
          ))}
        </div>

        {/* ── Quick-add by type ─────────────────────────────────────────── */}
        {assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#292B38] py-16 text-center">
            <Archive className="mb-3 h-10 w-10 text-[#2E3040]" />
            <p className="text-sm font-medium text-foreground">No assets yet</p>
            <p className="mt-1 text-xs text-muted">
              Add project files, design links, logins, and plugin details.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {(["file", "link", "login", "plugin"] as AssetType[]).map(
                (type) => {
                  const cfg = TYPE_CONFIG[type];
                  const { Icon } = cfg;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => openCreate(type)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-[6px] border px-3 py-2 text-xs font-medium transition-colors",
                        "border-[#292B38] bg-[#1E1F2D] text-muted hover:border-[#3A3B4A] hover:text-foreground",
                      )}
                    >
                      <Icon className={cn("h-3.5 w-3.5", cfg.color)} />
                      Add {cfg.label}
                    </button>
                  );
                },
              )}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#292B38] py-12 text-center">
            <p className="text-sm text-muted">
              No{" "}
              {filter !== "all"
                ? TYPE_CONFIG[filter as AssetType].label.toLowerCase() + "s"
                : "assets"}{" "}
              found.
            </p>
            <button
              type="button"
              onClick={() =>
                openCreate(filter !== "all" ? (filter as AssetType) : "link")
              }
              className="mt-3 text-xs text-primary hover:underline"
            >
              Add one now
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
                onDownload={(a) => void handleDownload(a)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Create / Edit Modal ──────────────────────────────────────────── */}
      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-12 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="w-full max-w-lg rounded-xl border border-[#292B38] bg-[#181921] shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-[#292B38] px-6 py-4">
              <h3 className="text-sm font-semibold text-foreground">
                {editingAsset ? "Edit Asset" : "Add Asset"}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex h-6 w-6 items-center justify-center rounded text-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={(e) => void handleSubmit(e)} className="px-6 py-5">
              {/* Type selector (create-only) */}
              {!editingAsset ? (
                <div className="mb-5">
                  <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-muted">
                    Type
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {(["file", "link", "login", "plugin"] as AssetType[]).map(
                      (type) => {
                        const cfg = TYPE_CONFIG[type];
                        const { Icon } = cfg;
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setFormType(type)}
                            className={cn(
                              "flex flex-col items-center gap-1.5 rounded-lg border py-3 text-xs font-medium transition-colors",
                              formType === type
                                ? `border-primary/60 ${cfg.bgColor} ${cfg.color}`
                                : "border-[#292B38] bg-[#1E1F2D] text-muted hover:border-[#3A3B4A]",
                            )}
                          >
                            <Icon className="h-4 w-4" />
                            {cfg.label}
                          </button>
                        );
                      },
                    )}
                  </div>
                </div>
              ) : (
                <div className="mb-4 flex items-center gap-2">
                  {(() => {
                    const cfg = TYPE_CONFIG[formType];
                    const { Icon } = cfg;
                    return (
                      <>
                        <span
                          className={cn(
                            "inline-flex h-6 w-6 items-center justify-center rounded",
                            cfg.bgColor,
                          )}
                        >
                          <Icon className={cn("h-3.5 w-3.5", cfg.color)} />
                        </span>
                        <span
                          className={cn(
                            "text-xs font-semibold uppercase tracking-wide",
                            cfg.color,
                          )}
                        >
                          {cfg.label}
                        </span>
                      </>
                    );
                  })()}
                </div>
              )}

              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label
                    htmlFor="asset-modal-title"
                    className="mb-1 block text-[11px] uppercase tracking-wider text-muted"
                  >
                    Title <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="asset-modal-title"
                    type="text"
                    required
                    placeholder="e.g. Brand Guidelines"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="mb-1 block text-[11px] uppercase tracking-wider text-muted">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Optional description…"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full resize-none rounded-md border border-[#292B38] bg-[#191A22] px-3 py-2 text-sm text-foreground placeholder:text-muted/50 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </div>

                {/* File upload */}
                {formType === "file" ? (
                  <div>
                    <label className="mb-1 block text-[11px] uppercase tracking-wider text-muted">
                      File
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={(e) => setFormFile(e.target.files?.[0] ?? null)}
                      className="hidden"
                      id="asset-file-input"
                    />
                    {formFile ? (
                      <div className="flex items-center gap-2 rounded-md border border-[#292B38] bg-[#1E1F2D] px-3 py-2">
                        <FileText className="h-4 w-4 shrink-0 text-blue-400" />
                        <span className="min-w-0 flex-1 truncate text-xs text-foreground">
                          {formFile.name}
                        </span>
                        <span className="shrink-0 text-[11px] text-muted">
                          {formatFileSize(formFile.size)}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setFormFile(null);
                            if (fileInputRef.current)
                              fileInputRef.current.value = "";
                          }}
                          className="shrink-0 text-muted hover:text-foreground"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : editingAsset?.file_name ? (
                      <div className="flex items-center gap-2 rounded-md border border-[#292B38] bg-[#1E1F2D] px-3 py-2">
                        <FileText className="h-4 w-4 shrink-0 text-blue-400" />
                        <span className="min-w-0 flex-1 truncate text-xs text-muted">
                          {editingAsset.file_name}
                        </span>
                        <label
                          htmlFor="asset-file-input"
                          className="shrink-0 cursor-pointer text-xs text-primary hover:underline"
                        >
                          Replace
                        </label>
                      </div>
                    ) : (
                      <label
                        htmlFor="asset-file-input"
                        className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-[#292B38] bg-[#191A22] px-3 py-3 transition-colors hover:border-primary/40"
                      >
                        <Upload className="h-4 w-4 shrink-0 text-muted" />
                        <span className="text-xs text-muted">
                          Click to select a file
                        </span>
                      </label>
                    )}
                  </div>
                ) : null}

                {/* URL */}
                {formType === "link" ||
                formType === "login" ||
                formType === "plugin" ? (
                  <div>
                    <label className="mb-1 block text-[11px] uppercase tracking-wider text-muted">
                      {formType === "link"
                        ? "URL"
                        : formType === "login"
                          ? "Login Portal URL"
                          : "Download / Source URL"}
                    </label>
                    <Input
                      type="url"
                      placeholder="https://…"
                      value={formUrl}
                      onChange={(e) => setFormUrl(e.target.value)}
                    />
                  </div>
                ) : null}

                {/* Login-specific */}
                {formType === "login" ? (
                  <div>
                    <label className="mb-1 block text-[11px] uppercase tracking-wider text-muted">
                      Username / Email
                    </label>
                    <Input
                      type="text"
                      placeholder="admin@example.com"
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value)}
                    />
                  </div>
                ) : null}

                {/* Plugin-specific */}
                {formType === "plugin" ? (
                  <div>
                    <label className="mb-1 block text-[11px] uppercase tracking-wider text-muted">
                      Vendor / Source
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g. Elementor"
                      value={formVendor}
                      onChange={(e) => setFormVendor(e.target.value)}
                    />
                  </div>
                ) : null}

                {/* Notes (login + plugin) */}
                {formType === "login" || formType === "plugin" ? (
                  <div>
                    <label className="mb-1 block text-[11px] uppercase tracking-wider text-muted">
                      {formType === "login"
                        ? "Notes / Reference"
                        : "License / Reference Notes"}
                    </label>
                    <textarea
                      rows={3}
                      placeholder={
                        formType === "login"
                          ? "e.g. Credentials stored in 1Password under 'Client Sites'"
                          : "e.g. License key reference, single-site license"
                      }
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      className="w-full resize-none rounded-md border border-[#292B38] bg-[#191A22] px-3 py-2 text-sm text-foreground placeholder:text-muted/50 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                    />
                  </div>
                ) : null}

                {/* Category */}
                <div>
                  <label className="mb-1 block text-[11px] uppercase tracking-wider text-muted">
                    Category
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. Branding, Design, Hosting"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                  />
                </div>

                {/* Visibility */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formClientVisible}
                    onClick={() => setFormClientVisible((v) => !v)}
                    className={cn(
                      "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none",
                      formClientVisible ? "bg-primary" : "bg-[#292B38]",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
                        formClientVisible ? "translate-x-4" : "translate-x-0",
                      )}
                    />
                  </button>
                  <label className="text-xs text-muted">
                    Visible to clients
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={formSubmitting}
                  onClick={closeModal}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!formTitle.trim() || formSubmitting}
                >
                  {formSubmitting
                    ? editingAsset
                      ? "Saving…"
                      : "Adding…"
                    : editingAsset
                      ? "Save Changes"
                      : "Add Asset"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* ── Delete confirmation ──────────────────────────────────────────── */}
      {deleteTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteTarget(null);
          }}
        >
          <div className="mx-4 w-full max-w-sm rounded-xl border border-[#292B38] bg-[#181921] shadow-2xl">
            <div className="px-6 py-5">
              <p className="text-sm font-semibold text-foreground">
                Delete asset?
              </p>
              <p className="mt-1.5 text-xs text-muted">
                <span className="font-medium text-foreground">
                  "{deleteTarget.title}"
                </span>{" "}
                will be permanently removed
                {deleteTarget.file_path ? " along with the uploaded file" : ""}.
                This cannot be undone.
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#292B38] px-6 py-4">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="border-red-800/60 bg-red-950/40 text-red-400 hover:bg-red-950/70 hover:text-red-300"
                disabled={isDeleting}
                onClick={() => void handleDelete(deleteTarget)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {isDeleting ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </DataStateWrapper>
  );
}
