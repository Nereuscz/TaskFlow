"use client";

import { use, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useProjectBoard } from "@/hooks/useTasks";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { ListView } from "@/components/project/ListView";
import { TableView } from "@/components/project/TableView";
import { TaskDetail } from "@/components/tasks/TaskDetail";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  ChevronRight,
  KanbanSquare,
  List,
  Table,
  ImageIcon,
  Trash2,
  Plus,
  Tag,
  Check,
  X,
  Pencil,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ViewMode = "board" | "list" | "table";
type TagType = { id: string; name: string; color: string };

const VIEW_OPTIONS: { mode: ViewMode; icon: React.ElementType; label: string }[] = [
  { mode: "board", icon: KanbanSquare, label: "Board" },
  { mode: "list", icon: List, label: "List" },
  { mode: "table", icon: Table, label: "Table" },
];

const TAG_COLOR_PRESETS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899",
  "#64748b", "#178B5C",
];

// ── Tag picker for project ────────────────────────────────────────────────────

function ProjectTagPicker({
  projectId,
  assignedTagIds,
  onUpdate,
}: {
  projectId: string;
  assignedTagIds: string[];
  onUpdate: (tagIds: string[]) => void;
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [creatingNew, setCreatingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(TAG_COLOR_PRESETS[9]);

  const { data: allTags = [] } = useQuery<TagType[]>({
    queryKey: ["tags"],
    queryFn: () => fetch("/api/tags").then((r) => r.json()),
  });

  async function createTag() {
    const name = newName.trim();
    if (!name) return;
    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color: newColor }),
    });
    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error ?? "Failed to create tag");
      return;
    }
    const tag: TagType = await res.json();
    queryClient.invalidateQueries({ queryKey: ["tags"] });
    onUpdate([...assignedTagIds, tag.id]);
    setCreatingNew(false);
    setNewName("");
  }

  const filtered = allTags.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
      <Input placeholder="Search tags…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-7 text-xs" autoFocus />
      <div className="max-h-40 overflow-y-auto space-y-0.5">
        {filtered.map((tag) => (
          <div
            key={tag.id}
            className="flex items-center gap-2 px-1.5 py-1 rounded-md hover:bg-muted/40 cursor-pointer"
            onClick={() => {
              const next = assignedTagIds.includes(tag.id)
                ? assignedTagIds.filter((id) => id !== tag.id)
                : [...assignedTagIds, tag.id];
              onUpdate(next);
            }}
          >
            <div
              className="flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center"
              style={{
                borderColor: assignedTagIds.includes(tag.id) ? tag.color : undefined,
                backgroundColor: assignedTagIds.includes(tag.id) ? tag.color : undefined,
              }}
            >
              {assignedTagIds.includes(tag.id) && <Check className="h-2.5 w-2.5 text-white" />}
            </div>
            <span className="flex-1 text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: tag.color + "20", color: tag.color }}>
              {tag.name}
            </span>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No tags found</p>}
      </div>
      <div className="border-t pt-1.5">
        {creatingNew ? (
          <div className="space-y-1.5">
            <Input placeholder="Tag name…" value={newName} onChange={(e) => setNewName(e.target.value)} className="h-7 text-xs" autoFocus
              onKeyDown={(e) => { if (e.key === "Enter" && newName.trim()) createTag(); if (e.key === "Escape") setCreatingNew(false); }} />
            <div className="flex gap-1 flex-wrap">
              {TAG_COLOR_PRESETS.map((c) => (
                <button key={c} className="h-4 w-4 rounded-full border-2" style={{ backgroundColor: c, borderColor: newColor === c ? "#000" : "transparent" }} onClick={() => setNewColor(c)} />
              ))}
            </div>
            <div className="flex gap-1">
              <Button size="sm" className="h-6 text-xs flex-1" disabled={!newName.trim()} onClick={createTag}>Create</Button>
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setCreatingNew(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-1.5 py-1 rounded-md hover:bg-muted/40 w-full" onClick={() => setCreatingNew(true)}>
            <Plus className="h-3 w-3" />New tag
          </button>
        )}
      </div>
    </div>
  );
}

// ── Cover upload button ───────────────────────────────────────────────────────

function CoverUploadButton({ projectId, hasCover, onUpdate }: { projectId: string; hasCover: boolean; onUpdate: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/projects/${projectId}/cover`, { method: "POST", body: form });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      toast.success("Cover updated");
      onUpdate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function removeCover() {
    const res = await fetch(`/api/projects/${projectId}/cover`, { method: "DELETE" });
    if (!res.ok) { toast.error("Failed to remove cover"); return; }
    toast.success("Cover removed");
    onUpdate();
  }

  return (
    <div className="flex items-center gap-1">
      <button
        className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground px-2 py-1 rounded-md hover:bg-muted/40 transition-colors"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
        {hasCover ? "Change cover" : "Add cover"}
      </button>
      {hasCover && (
        <button
          className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-destructive px-2 py-1 rounded-md hover:bg-muted/40 transition-colors"
          onClick={removeCover}
        >
          <Trash2 className="h-3.5 w-3.5" />Remove
        </button>
      )}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const { board, isLoading, createTask, isCreating } = useProjectBoard(projectId);
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>("board");
  const [tagPickerOpen, setTagPickerOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(`project-view-${projectId}`);
    if (saved === "board" || saved === "list" || saved === "table") setViewMode(saved);
  }, [projectId]);

  function changeView(mode: ViewMode) {
    setViewMode(mode);
    localStorage.setItem(`project-view-${projectId}`, mode);
  }

  function handleCreateTask(data: { columnId: string; title: string; projectId: string }) {
    createTask(data);
  }

  function refreshBoard() {
    queryClient.invalidateQueries({ queryKey: ["project", projectId] });
  }

  if (isLoading) {
    return (
      <div className="flex gap-4 h-full overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="w-72 shrink-0 space-y-3">
            <Skeleton className="h-6 w-32" />
            {Array.from({ length: 3 }).map((_, j) => (
              <Skeleton key={j} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Project not found.</p>
        </div>
      </div>
    );
  }

  const boardWithTags = board as typeof board & { coverImage?: string; tags?: { tag: TagType }[] };
  const assignedTagIds = boardWithTags.tags?.map(({ tag }) => tag.id) ?? [];

  return (
    <>
      {/* ── Cover banner ── */}
      {boardWithTags.coverImage && (
        <div className="relative -mx-6 -mt-6 mb-4 h-40 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/projects/${projectId}/cover`}
            alt={board.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20" />
        </div>
      )}

      {/* ── Header ── */}
      <div className="mb-4 flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1 min-w-0">
          <nav className="flex items-center gap-1 text-sm text-muted-foreground">
            <Link href="/projects" className="hover:text-foreground transition-colors">Projects</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground font-medium truncate">{board.name}</span>
          </nav>

          <div className="flex items-center gap-3">
            <div className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: board.color }} />
            <h1 className="text-xl font-bold tracking-tight">{board.name}</h1>
          </div>

          {/* Project tags row */}
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5 pl-7">
            {boardWithTags.tags?.map(({ tag }) => (
              <div key={tag.id} className="group flex items-center gap-0.5">
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ backgroundColor: tag.color + "20", color: tag.color }}
                >
                  {tag.name}
                </span>
                <button
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-destructive rounded transition-opacity"
                  onClick={() => {
                    const next = assignedTagIds.filter((id) => id !== tag.id);
                    fetch(`/api/projects/${projectId}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ tagIds: next }),
                    }).then(() => refreshBoard());
                  }}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}

            <Popover open={tagPickerOpen} onOpenChange={setTagPickerOpen}>
              <PopoverTrigger
                render={
                  <button className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-muted-foreground/60 hover:text-primary hover:bg-primary/5 border border-dashed border-border/50 hover:border-primary/30 transition-colors" />
                }
              >
                <Tag className="h-3 w-3" />
                <span>{assignedTagIds.length === 0 ? "Add tags" : "Edit"}</span>
              </PopoverTrigger>
              <PopoverContent className="w-60 p-3" side="bottom" align="start">
                <ProjectTagPicker
                  projectId={projectId}
                  assignedTagIds={assignedTagIds}
                  onUpdate={(tagIds) => {
                    fetch(`/api/projects/${projectId}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ tagIds }),
                    }).then(() => {
                      refreshBoard();
                      queryClient.invalidateQueries({ queryKey: ["projects"] });
                    });
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Cover actions */}
          <div className="pl-7 pt-0.5">
            <CoverUploadButton
              projectId={projectId}
              hasCover={!!boardWithTags.coverImage}
              onUpdate={() => {
                refreshBoard();
                queryClient.invalidateQueries({ queryKey: ["projects"] });
              }}
            />
          </div>
        </div>

        {/* View toggle */}
        <div className="flex items-center rounded-lg border border-border/60 p-0.5 bg-muted/30 flex-shrink-0">
          {VIEW_OPTIONS.map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => changeView(mode)}
              title={label}
              className={cn(
                "flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium transition-colors",
                viewMode === mode
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── View content ── */}
      {viewMode === "board" ? (
        <div className="h-[calc(100%-7rem)] overflow-hidden">
          <KanbanBoard board={board} onCreateTask={handleCreateTask} isCreating={isCreating} />
        </div>
      ) : (
        <div className="overflow-y-auto h-[calc(100%-7rem)]">
          {viewMode === "list" && <ListView board={board} onCreateTask={handleCreateTask} isCreating={isCreating} />}
          {viewMode === "table" && <TableView board={board} onCreateTask={handleCreateTask} isCreating={isCreating} />}
        </div>
      )}

      <TaskDetail projectId={projectId} />
    </>
  );
}
