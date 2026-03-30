"use client";

import { useState, useEffect } from "react";
import { useProjects } from "@/hooks/useProjects";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderOpen, Plus, MoreHorizontal, Trash2, LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";

const PROJECT_COLORS = [
  "#16a34a", "#0d9488", "#0284c7", "#6366f1",
  "#8b5cf6", "#ec4899", "#ef4444", "#f97316",
  "#eab308", "#64748b",
];

export default function ProjectsPage() {
  const { projects, isLoading, createProject, deleteProject, isCreating } =
    useProjects();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(PROJECT_COLORS[0]);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    const saved = localStorage.getItem("projects-view-mode");
    if (saved === "list" || saved === "grid") setViewMode(saved);
  }, []);

  function toggleViewMode(mode: "grid" | "list") {
    setViewMode(mode);
    localStorage.setItem("projects-view-mode", mode);
  }

  function handleCreate() {
    if (!name.trim()) return;
    createProject(
      { name: name.trim(), color },
      {
        onSuccess: () => {
          setOpen(false);
          setName("");
          setColor(PROJECT_COLORS[0]);
        },
      }
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          {!isLoading && projects && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {projects.length} project{projects.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-border/60 p-0.5 bg-muted/30">
            <button
              onClick={() => toggleViewMode("grid")}
              className={cn(
                "h-7 w-7 flex items-center justify-center rounded-md transition-colors",
                viewMode === "grid"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => toggleViewMode("list")}
              className={cn(
                "h-7 w-7 flex items-center justify-center rounded-md transition-colors",
                viewMode === "list"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <Button onClick={() => setOpen(true)} className="rounded-lg">
            <Plus className="h-4 w-4 mr-2" />
            New project
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : projects?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <FolderOpen className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h2 className="text-lg font-semibold mb-1">No projects yet</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first project to start organizing tasks.
          </p>
          <Button onClick={() => setOpen(true)} className="rounded-lg">
            <Plus className="h-4 w-4 mr-2" />
            New project
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects?.map((project) => {
            const projWithTags = project as typeof project & { tags?: { tag: { id: string; name: string; color: string } }[] };
            return (
              <div
                key={project.id}
                className="group relative border border-border/60 rounded-2xl bg-card shadow-sm hover:shadow-lg hover:border-border transition-all overflow-hidden"
              >
                {/* Cover image / placeholder */}
                <Link href={`/projects/${project.id}`} className="block">
                  {project.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/projects/${project.id}/cover`}
                      alt={project.name}
                      className="w-full h-36 object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-36 flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, ${project.color}18 0%, ${project.color}35 100%)`,
                      }}
                    >
                      <div
                        className="h-12 w-12 rounded-2xl flex items-center justify-center"
                        style={{ backgroundColor: project.color + "30" }}
                      >
                        <div className="h-5 w-5 rounded-full" style={{ backgroundColor: project.color }} />
                      </div>
                    </div>
                  )}
                </Link>

                <div className="p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/projects/${project.id}`} className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                        {project.name}
                      </h3>
                      {project.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {project.description}
                        </p>
                      )}
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex h-7 w-7 items-center justify-center rounded-lg hover:bg-accent shrink-0 mt-[-2px]">
                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteTarget({ id: project.id, name: project.name })}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete project
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {projWithTags.tags && projWithTags.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {projWithTags.tags.map(({ tag }) => (
                        <span
                          key={tag.id}
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
                          style={{ backgroundColor: tag.color + "20", color: tag.color }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── List view (Air/Basecamp style) ── */
        <div className="border border-border/60 rounded-xl bg-card shadow-sm overflow-hidden">
          {projects?.map((project, idx) => {
            const projWithTags = project as typeof project & { tags?: { tag: { id: string; name: string; color: string } }[] };
            return (
              <div
                key={project.id}
                className={cn(
                  "group flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors",
                  idx !== 0 && "border-t border-border/40"
                )}
              >
                {/* Cover thumbnail or color dot */}
                {project.coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/projects/${project.id}/cover`}
                    alt={project.name}
                    className="h-10 w-10 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: project.color + "18" }}
                  >
                    <div className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: project.color }} />
                  </div>
                )}

                <Link href={`/projects/${project.id}`} className="flex-1 min-w-0">
                  <p className="font-semibold text-sm group-hover:text-primary transition-colors">
                    {project.name}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    {project.description && (
                      <p className="text-xs text-muted-foreground truncate">{project.description}</p>
                    )}
                    {projWithTags.tags && projWithTags.tags.length > 0 && projWithTags.tags.map(({ tag }) => (
                      <span key={tag.id} className="inline-flex items-center px-1.5 py-0 rounded text-[10px] font-medium" style={{ backgroundColor: tag.color + "20", color: tag.color }}>
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </Link>

                <DropdownMenu>
                  <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex h-7 w-7 items-center justify-center rounded-lg hover:bg-accent shrink-0">
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setDeleteTarget({ id: project.id, name: project.name })}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete project
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(v) => {
          if (!v) setDeleteTarget(null);
        }}
        title="Delete project"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? All tasks and columns in this project will be permanently deleted.`}
        confirmLabel="Delete project"
        variant="destructive"
        onConfirm={() => {
          if (deleteTarget) deleteProject(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="proj-name">Project name</Label>
              <Input
                id="proj-name"
                placeholder="e.g. Marketing campaign"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {PROJECT_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={cn(
                      "h-7 w-7 rounded-full transition-all ring-offset-2 ring-offset-background",
                      color === c && "ring-2"
                    )}
                    style={{
                      backgroundColor: c,
                      ...(color === c ? { ringColor: c } : {}),
                      outline: color === c ? `2px solid ${c}` : "none",
                      outlineOffset: "2px",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!name.trim() || isCreating}
            >
              {isCreating ? "Creating..." : "Create project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
