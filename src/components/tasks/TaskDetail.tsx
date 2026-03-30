"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTask } from "@/hooks/useTasks";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertDialog } from "@/components/ui/alert-dialog";
import {
  Calendar,
  Clock,
  CheckSquare,
  Trash2,
  X,
  Plus,
  Tag,
  Paperclip,
  Download,
  Pencil,
  Check,
  File,
  FileText,
  FileImage,
  FileCode,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type TagType = { id: string; name: string; color: string };
type AttachmentType = {
  id: string;
  name: string;
  filename: string;
  size: number;
  mimeType: string;
  createdAt: string;
};

const STATUS_OPTIONS = [
  { value: "TODO", label: "To Do" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "IN_REVIEW", label: "In Review" },
  { value: "DONE", label: "Done" },
  { value: "CANCELLED", label: "Cancelled" },
];

const PRIORITY_OPTIONS = [
  { value: "NONE", label: "None" },
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

const STATUS_COLORS: Record<string, string> = {
  TODO: "bg-stone-100 text-stone-600",
  IN_PROGRESS: "bg-sky-100 text-sky-700",
  IN_REVIEW: "bg-violet-100 text-violet-700",
  DONE: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-600",
};

const PRIORITY_COLORS: Record<string, string> = {
  NONE: "bg-stone-100 text-stone-500",
  LOW: "bg-blue-100 text-blue-600",
  MEDIUM: "bg-amber-100 text-amber-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};

const TAG_COLOR_PRESETS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899",
  "#64748b", "#178B5C",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(ms: number) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function FileIcon({ mimeType, className }: { mimeType: string; className?: string }) {
  if (mimeType.startsWith("image/")) return <FileImage className={className} />;
  if (mimeType === "application/pdf" || mimeType.includes("text")) return <FileText className={className} />;
  if (mimeType.includes("code") || mimeType.includes("javascript") || mimeType.includes("json"))
    return <FileCode className={className} />;
  return <File className={className} />;
}

// ─── Tag Picker ───────────────────────────────────────────────────────────────

function TagPicker({
  assignedTagIds,
  taskId,
  onUpdate,
}: {
  assignedTagIds: string[];
  taskId: string;
  onUpdate: (tagIds: string[]) => void;
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [creatingNew, setCreatingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(TAG_COLOR_PRESETS[9]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [deleteTagId, setDeleteTagId] = useState<string | null>(null);

  const { data: allTags = [] } = useQuery<TagType[]>({
    queryKey: ["tags"],
    queryFn: () => fetch("/api/tags").then((r) => r.json()),
  });

  const createTagMutation = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed");
      }
      return res.json() as Promise<TagType>;
    },
    onSuccess: (newTag) => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      onUpdate([...assignedTagIds, newTag.id]);
      setCreatingNew(false);
      setNewName("");
      setNewColor(TAG_COLOR_PRESETS[9]);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateTagMutation = useMutation({
    mutationFn: async ({ id, name, color }: { id: string; name: string; color: string }) => {
      const res = await fetch(`/api/tags/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
      setEditingId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteTagMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tags/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      onUpdate(assignedTagIds.filter((id) => id !== deleteTagId));
      setDeleteTagId(null);
    },
    onError: () => toast.error("Failed to delete tag"),
  });

  const filtered = allTags.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  function toggleTag(tagId: string) {
    const next = assignedTagIds.includes(tagId)
      ? assignedTagIds.filter((id) => id !== tagId)
      : [...assignedTagIds, tagId];
    onUpdate(next);
  }

  return (
    <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
      <Input
        placeholder="Search tags…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-7 text-xs"
        autoFocus
      />

      <div className="max-h-44 overflow-y-auto space-y-0.5">
        {filtered.map((tag) =>
          editingId === tag.id ? (
            <div key={tag.id} className="flex items-center gap-1.5 px-1.5 py-1 rounded-md bg-muted/40">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-6 text-xs flex-1 min-w-0"
                onKeyDown={(e) => {
                  if (e.key === "Enter") updateTagMutation.mutate({ id: tag.id, name: editName, color: editColor });
                  if (e.key === "Escape") setEditingId(null);
                }}
              />
              <div className="flex gap-0.5 flex-wrap w-28">
                {TAG_COLOR_PRESETS.slice(0, 5).map((c) => (
                  <button
                    key={c}
                    className="h-4 w-4 rounded-full border-2 flex-shrink-0"
                    style={{ backgroundColor: c, borderColor: editColor === c ? "#000" : "transparent" }}
                    onClick={() => setEditColor(c)}
                  />
                ))}
              </div>
              <button
                className="p-0.5 text-primary hover:text-primary/80"
                onClick={() => updateTagMutation.mutate({ id: tag.id, name: editName, color: editColor })}
              >
                {updateTagMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
              </button>
              <button className="p-0.5 text-muted-foreground hover:text-foreground" onClick={() => setEditingId(null)}>
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div
              key={tag.id}
              className="group flex items-center gap-2 px-1.5 py-1 rounded-md hover:bg-muted/40 cursor-pointer"
              onClick={() => toggleTag(tag.id)}
            >
              <div className="flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center"
                style={{ borderColor: assignedTagIds.includes(tag.id) ? tag.color : undefined,
                         backgroundColor: assignedTagIds.includes(tag.id) ? tag.color : undefined }}>
                {assignedTagIds.includes(tag.id) && <Check className="h-2.5 w-2.5 text-white" />}
              </div>
              <span
                className="flex-1 text-xs px-1.5 py-0.5 rounded font-medium truncate"
                style={{ backgroundColor: tag.color + "20", color: tag.color }}
              >
                {tag.name}
              </span>
              <button
                className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingId(tag.id);
                  setEditName(tag.name);
                  setEditColor(tag.color);
                }}
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTagId(tag.id);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          )
        )}
        {filtered.length === 0 && !creatingNew && (
          <p className="text-xs text-muted-foreground text-center py-2">No tags found</p>
        )}
      </div>

      <Separator className="my-0.5" />

      {creatingNew ? (
        <div className="space-y-2">
          <Input
            placeholder="Tag name…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="h-7 text-xs"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && newName.trim()) {
                createTagMutation.mutate({ name: newName.trim(), color: newColor });
              }
              if (e.key === "Escape") setCreatingNew(false);
            }}
          />
          <div className="flex gap-1.5 flex-wrap">
            {TAG_COLOR_PRESETS.map((c) => (
              <button
                key={c}
                className="h-5 w-5 rounded-full border-2"
                style={{ backgroundColor: c, borderColor: newColor === c ? "#000" : "transparent" }}
                onClick={() => setNewColor(c)}
              />
            ))}
          </div>
          {newName.trim() && (
            <span
              className="inline-flex text-xs px-2 py-0.5 rounded font-medium"
              style={{ backgroundColor: newColor + "20", color: newColor }}
            >
              {newName.trim()}
            </span>
          )}
          <div className="flex gap-1.5">
            <Button
              size="sm"
              className="h-7 text-xs flex-1"
              disabled={!newName.trim() || createTagMutation.isPending}
              onClick={() => createTagMutation.mutate({ name: newName.trim(), color: newColor })}
            >
              {createTagMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Create tag"}
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setCreatingNew(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <button
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-1.5 py-1 rounded-md hover:bg-muted/40"
          onClick={() => setCreatingNew(true)}
        >
          <Plus className="h-3 w-3" />
          New tag
        </button>
      )}

      <AlertDialog
        open={!!deleteTagId}
        onOpenChange={(open) => { if (!open) setDeleteTagId(null); }}
        title="Delete tag"
        description="This tag will be permanently deleted and removed from all tasks."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleteTagId && deleteTagMutation.mutate(deleteTagId)}
        loading={deleteTagMutation.isPending}
      />
    </div>
  );
}

// ─── Attachments section ──────────────────────────────────────────────────────

function AttachmentsSection({
  attachments,
  taskId,
  onRefresh,
}: {
  attachments: AttachmentType[];
  taskId: string;
  onRefresh: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const images = attachments.filter((a) => a.mimeType.startsWith("image/"));
  const files = attachments.filter((a) => !a.mimeType.startsWith("image/"));

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File is too large (max 10 MB)");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/tasks/${taskId}/attachments`, { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Upload failed");
      }
      toast.success("File uploaded");
      onRefresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeletePending(true);
    try {
      const res = await fetch(`/api/attachments/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Attachment deleted");
      onRefresh();
    } catch {
      toast.error("Failed to delete attachment");
    } finally {
      setDeletePending(false);
      setDeleteId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <Paperclip className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            Attachments{attachments.length > 0 && <span className="text-muted-foreground ml-1">({attachments.length})</span>}
          </span>
        </div>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
          {uploading ? "Uploading…" : "Add file"}
        </Button>
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
      </div>

      {attachments.length === 0 && !uploading ? (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full border-2 border-dashed border-border/60 rounded-xl p-5 text-center text-sm text-muted-foreground hover:border-primary/40 hover:text-primary/70 hover:bg-primary/5 transition-colors"
        >
          <Paperclip className="h-5 w-5 mx-auto mb-1.5 opacity-40" />
          <span className="block font-medium text-xs">Drag & drop or click to upload</span>
          <span className="text-[11px] opacity-60">Max 10 MB</span>
        </button>
      ) : (
        <div className="space-y-3">
          {/* Image gallery grid */}
          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {images.map((att) => (
                <div key={att.id} className="group relative aspect-square rounded-lg overflow-hidden border border-border/50 bg-muted/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/attachments/${att.id}`}
                    alt={att.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors" />
                  <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a
                      href={`/api/attachments/${att.id}`}
                      download={att.name}
                      className="h-6 w-6 flex items-center justify-center rounded-md bg-black/50 hover:bg-black/70 text-white"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Download className="h-3 w-3" />
                    </a>
                    <button
                      className="h-6 w-6 flex items-center justify-center rounded-md bg-black/50 hover:bg-destructive text-white"
                      onClick={() => setDeleteId(att.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent px-1.5 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-[10px] truncate">{att.name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Non-image files list */}
          {files.length > 0 && (
            <div className="space-y-1.5">
              {files.map((att) => (
                <div key={att.id} className="group flex items-center gap-2.5 p-2.5 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileIcon mimeType={att.mimeType} className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{att.name}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(att.size)}</p>
                  </div>
                  <a href={`/api/attachments/${att.id}`} download={att.name} className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-all" onClick={(e) => e.stopPropagation()}>
                    <Download className="h-3.5 w-3.5" />
                  </a>
                  <button className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-destructive rounded-md hover:bg-muted transition-all" onClick={() => setDeleteId(att.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title="Delete attachment"
        description="This file will be permanently deleted."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deletePending}
      />
    </div>
  );
}

// ─── Sidebar property row ─────────────────────────────────────────────────────

function PropRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs text-muted-foreground w-20 flex-shrink-0 pt-0.5">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TaskDetail({ projectId }: { projectId?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const taskId = searchParams.get("task");
  const queryClient = useQueryClient();

  const { data: task, isLoading } = useTask(taskId);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [description, setDescription] = useState<string | undefined>(undefined);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [tagPickerOpen, setTagPickerOpen] = useState(false);

  const updateMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task", taskId] });
      if (projectId) queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
    onError: () => toast.error("Failed to update task"),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      toast.success("Task deleted");
      closeDialog();
      if (projectId) queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
    onError: () => toast.error("Failed to delete task"),
  });

  function closeDialog() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("task");
    router.replace(`?${params.toString()}`);
  }

  function handleTitleSave() {
    const trimmed = titleValue.trim();
    if (trimmed && trimmed !== task?.title) {
      updateMutation.mutate({ title: trimmed });
    }
    setEditingTitle(false);
  }

  function refreshTask() {
    queryClient.invalidateQueries({ queryKey: ["task", taskId] });
  }

  const totalTime =
    task?.timeEntries?.reduce(
      (sum: number, e: { durationMs: number | null }) => sum + (e.durationMs ?? 0),
      0
    ) ?? 0;

  const assignedTagIds: string[] = task?.tags?.map(({ tag }: { tag: TagType }) => tag.id) ?? [];

  return (
    <>
      <Dialog
        open={!!taskId}
        onOpenChange={(open: boolean) => { if (!open) closeDialog(); }}
      >
        <DialogContent
          className="sm:max-w-4xl p-0 gap-0 overflow-hidden"
          showCloseButton={false}
        >
          {isLoading || !task ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-7 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : (
            <div className="flex flex-col max-h-[88vh]">
              {/* ── Title bar ── */}
              <div className="flex items-start gap-3 px-5 pt-4 pb-3 border-b">
                <div className="flex-1 min-w-0">
                  {editingTitle ? (
                    <input
                      autoFocus
                      value={titleValue}
                      onChange={(e) => setTitleValue(e.target.value)}
                      onBlur={handleTitleSave}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleTitleSave();
                        if (e.key === "Escape") setEditingTitle(false);
                      }}
                      className="w-full text-lg font-bold tracking-tight bg-transparent border-none outline-none focus:ring-0 ring-0 p-0"
                    />
                  ) : (
                    <h2
                      className="text-lg font-bold tracking-tight cursor-text hover:text-primary/90 leading-snug"
                      onClick={() => {
                        setTitleValue(task.title);
                        setEditingTitle(true);
                      }}
                      title="Click to edit title"
                    >
                      {task.title}
                    </h2>
                  )}
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[task.status] ?? ""}`}>
                      {STATUS_OPTIONS.find((s) => s.value === task.status)?.label ?? task.status}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[task.priority] ?? ""}`}>
                      {task.priority}
                    </span>
                    {task.project && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                        {task.project.name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground"
                    onClick={closeDialog}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* ── Body ── */}
              <div className="flex flex-1 overflow-hidden min-h-0">
                {/* Main content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                  {/* Description */}
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider mb-1.5 block">
                      Description
                    </label>
                    <RichTextEditor
                      value={description ?? task.description ?? ""}
                      onChange={(html) => setDescription(html)}
                      onBlur={() => {
                        if (description !== undefined && description !== task.description) {
                          updateMutation.mutate({ description });
                        }
                      }}
                      placeholder="Add a description…"
                      minHeight="96px"
                    />
                  </div>

                  <Separator />

                  {/* Attachments */}
                  <AttachmentsSection
                    attachments={task.attachments ?? []}
                    taskId={task.id}
                    onRefresh={refreshTask}
                  />

                  {/* Checklist */}
                  {task.checklist?.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <CheckSquare className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            Checklist ({task.checklist.filter((i: { isCompleted: boolean }) => i.isCompleted).length}/{task.checklist.length})
                          </span>
                        </div>
                        <div className="space-y-1">
                          {task.checklist.map((item: { id: string; title: string; isCompleted: boolean }) => (
                            <label key={item.id} className="flex items-center gap-2 text-sm cursor-pointer group">
                              <input
                                type="checkbox"
                                checked={item.isCompleted}
                                onChange={(e) =>
                                  updateMutation.mutate({ checklistItemId: item.id, isCompleted: e.target.checked })
                                }
                                className="rounded accent-primary"
                              />
                              <span className={item.isCompleted ? "line-through text-muted-foreground" : ""}>
                                {item.title}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Subtasks */}
                  {task.subtasks?.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm font-medium mb-2">
                          Subtasks ({task.subtasks.filter((s: { completedAt: string | null }) => s.completedAt).length}/{task.subtasks.length})
                        </p>
                        <div className="space-y-1">
                          {task.subtasks.map((sub: { id: string; title: string; completedAt: string | null }) => (
                            <div key={sub.id} className="flex items-center gap-2 text-sm">
                              <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${sub.completedAt ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
                              <span className={sub.completedAt ? "line-through text-muted-foreground" : ""}>{sub.title}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* ── Sidebar ── */}
                <div className="w-56 border-l bg-muted/10 overflow-y-auto p-4 space-y-4 flex-shrink-0">
                  {/* Properties */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider mb-2.5">Properties</p>
                    <div className="space-y-2.5">
                      <PropRow label="Status">
                        <select
                          value={task.status}
                          onChange={(e) => updateMutation.mutate({ status: e.target.value })}
                          className="w-full text-xs rounded-md border border-border/60 bg-background px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/50"
                        >
                          {STATUS_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </PropRow>

                      <PropRow label="Priority">
                        <select
                          value={task.priority}
                          onChange={(e) => updateMutation.mutate({ priority: e.target.value })}
                          className="w-full text-xs rounded-md border border-border/60 bg-background px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/50"
                        >
                          {PRIORITY_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </PropRow>

                      <PropRow label="Deadline">
                        <input
                          type="date"
                          value={task.deadline ? format(new Date(task.deadline), "yyyy-MM-dd") : ""}
                          onChange={(e) =>
                            updateMutation.mutate({
                              deadline: e.target.value ? new Date(e.target.value).toISOString() : null,
                            })
                          }
                          className="w-full text-xs rounded-md border border-border/60 bg-background px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/50"
                        />
                      </PropRow>

                      {task.assignee && (
                        <PropRow label="Assignee">
                          <div className="flex items-center gap-1.5">
                            <Avatar className="h-5 w-5 flex-shrink-0">
                              <AvatarImage src={task.assignee.image ?? undefined} />
                              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                {task.assignee.name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs truncate">{task.assignee.name}</span>
                          </div>
                        </PropRow>
                      )}

                      {task.project && (
                        <PropRow label="Project">
                          <div className="flex items-center gap-1.5">
                            <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: task.project.color }} />
                            <span className="text-xs truncate">{task.project.name}</span>
                          </div>
                        </PropRow>
                      )}

                      {task.column && (
                        <PropRow label="Column">
                          <span className="text-xs text-muted-foreground">{task.column.name}</span>
                        </PropRow>
                      )}

                      {totalTime > 0 && (
                        <PropRow label="Time">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDuration(totalTime)}
                          </div>
                        </PropRow>
                      )}

                      {task.deadline && (
                        <PropRow label="Due">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(task.deadline), "MMM d, yyyy")}
                          </div>
                        </PropRow>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Tags */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">Tags</p>
                      <Popover open={tagPickerOpen} onOpenChange={setTagPickerOpen}>
                        <PopoverTrigger
                          render={
                            <button className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors" />
                          }
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-3" side="left" align="start">
                          <TagPicker
                            assignedTagIds={assignedTagIds}
                            taskId={task.id}
                            onUpdate={(tagIds) => {
                              updateMutation.mutate({ tagIds });
                              queryClient.invalidateQueries({ queryKey: ["task", taskId] });
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {task.tags?.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {task.tags.map(({ tag }: { tag: TagType }) => (
                          <div key={tag.id} className="group flex items-center gap-0.5">
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                              style={{ backgroundColor: tag.color + "20", color: tag.color }}
                            >
                              {tag.name}
                            </span>
                            <button
                              className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-destructive rounded transition-opacity"
                              onClick={() =>
                                updateMutation.mutate({ tagIds: assignedTagIds.filter((id) => id !== tag.id) })
                              }
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <button
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setTagPickerOpen(true)}
                      >
                        <Tag className="h-3 w-3" />
                        Add tags
                      </button>
                    )}
                  </div>

                  {/* Created by */}
                  {task.createdBy && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider mb-2">Created by</p>
                        <div className="flex items-center gap-1.5">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={task.createdBy.image ?? undefined} />
                            <AvatarFallback className="text-[10px] bg-muted">{task.createdBy.name?.[0]}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground truncate">{task.createdBy.name}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                          {format(new Date(task.createdAt), "MMM d, yyyy")}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete task"
        description="This action cannot be undone. The task and all its data will be permanently deleted."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
      />
    </>
  );
}
