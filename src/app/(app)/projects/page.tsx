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
import { Skeleton } from "@/components/ui/skeleton";
import { FolderOpen, Plus } from "lucide-react";

const PROJECT_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#0ea5e9", "#64748b",
];

export default function ProjectsPage() {
  const { projects, isLoading, createProject, isCreating } = useProjects();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(PROJECT_COLORS[0]);

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
        <h1 className="text-2xl font-semibold">Projects</h1>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New project
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : projects?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-medium mb-1">No projects yet</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first project to start organizing tasks.
          </p>
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New project
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects?.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="group relative flex flex-col p-5 border rounded-xl bg-card hover:border-primary/50 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className="h-10 w-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: project.color + "20" }}
                >
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                </div>
              </div>
              <h3 className="font-medium text-sm mb-1 group-hover:text-primary transition-colors">
                {project.name}
              </h3>
              {project.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{project.description}</p>
              )}
            </Link>
          ))}
        </div>
      )}

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
                    className="h-7 w-7 rounded-full ring-offset-2 transition-all"
                    style={{
                      backgroundColor: c,
                      outline: color === c ? `2px solid ${c}` : "none",
                      outlineOffset: "2px",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!name.trim() || isCreating}>
              {isCreating ? "Creating…" : "Create project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
