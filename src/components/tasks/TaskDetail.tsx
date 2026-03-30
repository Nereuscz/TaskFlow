"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTask } from "@/hooks/useTasks";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PriorityBadge } from "./PriorityBadge";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { Calendar, Clock, CheckSquare, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";

function formatDuration(ms: number) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function TaskDetail({ projectId }: { projectId?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const taskId = searchParams.get("task");
  const queryClient = useQueryClient();

  const { data: task, isLoading } = useTask(taskId);
  const [description, setDescription] = useState<string | undefined>(undefined);
  const [deleteOpen, setDeleteOpen] = useState(false);

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
      closeSheet();
      if (projectId) queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
    onError: () => toast.error("Failed to delete task"),
  });

  function closeSheet() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("task");
    router.replace(`?${params.toString()}`);
  }

  const totalTime = task?.timeEntries?.reduce((sum: number, e: { durationMs: number | null }) => sum + (e.durationMs ?? 0), 0) ?? 0;

  return (
    <Sheet open={!!taskId} onOpenChange={(open) => { if (!open) closeSheet(); }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {isLoading || !task ? (
          <div className="space-y-4 pt-6">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <>
            <SheetHeader className="space-y-1 pr-6">
              <div className="flex items-start justify-between gap-2">
                <SheetTitle className="text-left leading-tight">{task.title}</SheetTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-destructive hover:text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <PriorityBadge priority={task.priority} />
                <Badge variant="outline" className="text-xs">
                  {task.status.replace("_", " ")}
                </Badge>
                {task.project && (
                  <Badge variant="secondary" className="text-xs">
                    {task.project.name}
                  </Badge>
                )}
              </div>
              {task.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {task.tags.map(({ tag }: { tag: { id: string; name: string; color: string } }) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                      style={{ backgroundColor: tag.color + "20", color: tag.color }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}
            </SheetHeader>

            <div className="mt-6 space-y-5">
              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider mb-1.5 block">
                  Description
                </label>
                <Textarea
                  placeholder="Add a description…"
                  className="min-h-24 text-sm resize-none"
                  defaultValue={task.description ?? ""}
                  value={description ?? task.description ?? ""}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={() => {
                    if (description !== undefined && description !== task.description) {
                      updateMutation.mutate({ description });
                    }
                  }}
                />
              </div>

              <Separator />

              {/* Meta info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                {task.deadline && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{format(new Date(task.deadline), "MMM d, yyyy")}</span>
                  </div>
                )}
                {task.assignee && (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={task.assignee.image ?? undefined} />
                      <AvatarFallback className="text-xs">
                        {task.assignee.name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground truncate">{task.assignee.name}</span>
                  </div>
                )}
                {totalTime > 0 && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{formatDuration(totalTime)} logged</span>
                  </div>
                )}
              </div>

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
                        <label key={item.id} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.isCompleted}
                            onChange={(e) => {
                              updateMutation.mutate({ checklistItemId: item.id, isCompleted: e.target.checked });
                            }}
                            className="rounded"
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
                          <span className={sub.completedAt ? "line-through text-muted-foreground" : ""}>
                            {sub.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </SheetContent>

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
    </Sheet>
  );
}
