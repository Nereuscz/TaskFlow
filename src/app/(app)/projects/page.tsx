"use client";

import { useState } from "react";
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
import { FolderOpen, Plus, MoreHorizontal, Trash2 } from "lucide-react";
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
        <Button onClick={() => setOpen(true)} className="rounded-lg">
          <Plus className="h-4 w-4 mr-2" />
          New project
        </Button>
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
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects?.map((project) => (
            <div
              key={project.id}
              className="group relative border border-border/60 rounded-xl bg-card shadow-sm hover:shadow-md hover:border-border transition-all overflow-hidden"
            >
              <div
                className="h-2 w-full"
                style={{ backgroundColor: project.color }}
              />
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <Link
                    href={`/projects/${project.id}`}
                    className="flex items-center gap-2.5 min-w-0 flex-1"
                  >
                    <span
                      className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: project.color + "18" }}
                    >
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: project.color }}
                      />
                    </span>
                    <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                      {project.name}
                    </h3>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex h-7 w-7 items-center justify-center rounded-lg hover:bg-accent shrink-0">
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() =>
                          setDeleteTarget({
                            id: project.id,
                            name: project.name,
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete project
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {project.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 ml-[42px]">
                    {project.description}
                  </p>
                )}
              </div>
            </div>
          ))}
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
