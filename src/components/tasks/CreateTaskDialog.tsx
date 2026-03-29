"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useProjects } from "@/hooks/useProjects";
import { Check } from "lucide-react";
import type { TaskPriority } from "@prisma/client";
import type { ProjectBoard } from "@/hooks/useTasks";

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; activeClass: string; idleClass: string }[] = [
  { value: "NONE", label: "None", activeClass: "bg-muted text-muted-foreground border-muted", idleClass: "text-muted-foreground" },
  { value: "LOW", label: "Low", activeClass: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-600", idleClass: "text-blue-600 dark:text-blue-400" },
  { value: "MEDIUM", label: "Medium", activeClass: "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-600", idleClass: "text-yellow-600 dark:text-yellow-400" },
  { value: "HIGH", label: "High", activeClass: "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-600", idleClass: "text-orange-600 dark:text-orange-400" },
  { value: "URGENT", label: "Urgent", activeClass: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-600", idleClass: "text-red-600 dark:text-red-400" },
];

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProjectId?: string;
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  defaultProjectId,
}: CreateTaskDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState(defaultProjectId ?? "");
  const [columnId, setColumnId] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [deadline, setDeadline] = useState("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const queryClient = useQueryClient();
  const { projects } = useProjects();

  const { data: projectBoard } = useQuery<ProjectBoard>({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!projectId && open,
  });

  const { data: tags } = useQuery<{ id: string; name: string; color: string }[]>({
    queryKey: ["tags"],
    queryFn: async () => {
      const res = await fetch("/api/tags");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: open,
  });

  useEffect(() => {
    setColumnId("");
  }, [projectId]);

  useEffect(() => {
    if (projectBoard?.columns?.length && !columnId) {
      setColumnId(projectBoard.columns[0].id);
    }
  }, [projectBoard, columnId]);

  useEffect(() => {
    if (!projectId && projects?.length && !defaultProjectId) {
      setProjectId(projects[0].id);
    }
  }, [projects, defaultProjectId, projectId]);

  useEffect(() => {
    if (!open) {
      setTitle("");
      setDescription("");
      setProjectId(defaultProjectId ?? "");
      setColumnId("");
      setPriority("MEDIUM");
      setDeadline("");
      setTagIds([]);
    }
  }, [open, defaultProjectId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !projectId || !columnId) {
      toast.error("Title, project, and column are required");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          projectId,
          columnId,
          priority,
          deadline: deadline ? new Date(deadline).toISOString() : null,
          tagIds: tagIds.length > 0 ? tagIds : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to create task");
      }

      queryClient.invalidateQueries({ queryKey: ["all-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["today-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });

      toast.success("Task created");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setIsSubmitting(false);
    }
  }

  const columns = projectBoard?.columns ?? [];
  const selectClass =
    "w-full h-8 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-1">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="ct-title">Title</Label>
            <Input
              id="ct-title"
              placeholder="Task title…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              required
            />
          </div>

          {/* Project & Column */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ct-project">Project</Label>
              <select
                id="ct-project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className={selectClass}
                required
              >
                <option value="" disabled>Select project</option>
                {projects?.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ct-column">Column</Label>
              <select
                id="ct-column"
                value={columnId}
                onChange={(e) => setColumnId(e.target.value)}
                className={selectClass}
                disabled={!projectId || columns.length === 0}
                required
              >
                <option value="" disabled>Select column</option>
                {columns.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Priority */}
          <div className="space-y-1.5">
            <Label>Priority</Label>
            <div className="flex gap-1.5 flex-wrap">
              {PRIORITY_OPTIONS.map(({ value, label, activeClass, idleClass }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPriority(value)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-medium border transition-colors",
                    priority === value
                      ? activeClass
                      : cn("border-input hover:bg-accent", idleClass)
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Deadline */}
          <div className="space-y-1.5">
            <Label htmlFor="ct-deadline">Deadline</Label>
            <Input
              id="ct-deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          {/* Tags */}
          {tags && tags.length > 0 && (
            <div className="space-y-1.5">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => {
                  const selected = tagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() =>
                        setTagIds((prev) =>
                          selected ? prev.filter((id) => id !== tag.id) : [...prev, tag.id]
                        )
                      }
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-opacity",
                        selected ? "opacity-100" : "opacity-50 hover:opacity-75"
                      )}
                      style={{ backgroundColor: tag.color + "20", color: tag.color }}
                    >
                      {selected && <Check className="h-3 w-3" />}
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="ct-description">Description <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Textarea
              id="ct-description"
              placeholder="Add a description…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-16 text-sm resize-none"
            />
          </div>

          <DialogFooter showCloseButton>
            <Button
              type="submit"
              disabled={isSubmitting || !title.trim() || !projectId || !columnId}
            >
              {isSubmitting ? "Creating…" : "Create task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
