"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRouter, useSearchParams } from "next/navigation";
import type { TaskWithRelations } from "@/hooks/useTasks";
import { PriorityBadge } from "@/components/tasks/PriorityBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckSquare, Clock } from "lucide-react";
import { format, isPast } from "date-fns";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: TaskWithRelations;
  isDragOverlay?: boolean;
}

export function TaskCard({ task, isDragOverlay = false }: TaskCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  function openDetail() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("task", task.id);
    router.replace(`?${params.toString()}`);
  }

  const isOverdue = task.deadline && isPast(new Date(task.deadline)) && task.status !== "DONE";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={openDetail}
      className={cn(
        "group relative bg-card border border-border/60 rounded-xl p-3.5 cursor-pointer select-none overflow-hidden",
        "shadow-sm hover:shadow-md hover:border-border hover:-translate-y-0.5 transition-all duration-150",
        isDragging && !isDragOverlay && "opacity-40",
        isDragOverlay && "shadow-lg rotate-1 scale-105"
      )}
    >
      {/* Priority indicator line */}
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-1",
          task.priority === "URGENT" && "bg-red-500",
          task.priority === "HIGH" && "bg-orange-500",
          task.priority === "MEDIUM" && "bg-yellow-500",
          task.priority === "LOW" && "bg-blue-500",
          task.priority === "NONE" && "bg-transparent"
        )}
      />

      <div className="space-y-2 pl-1">
        <p className="text-sm font-medium leading-snug tracking-tight line-clamp-2">{task.title}</p>

        {/* Tags */}
        {task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {task.tags.slice(0, 3).map(({ tag }) => (
              <span
                key={tag.id}
                className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium"
                style={{
                  backgroundColor: tag.color + "20",
                  color: tag.color,
                }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <PriorityBadge priority={task.priority} />

            {task.deadline && (
              <span
                className={cn(
                  "flex items-center gap-1 text-xs",
                  isOverdue ? "text-destructive" : "text-muted-foreground"
                )}
              >
                <Calendar className="h-3 w-3" />
                {format(new Date(task.deadline), "MMM d")}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {task._count.subtasks > 0 && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <CheckSquare className="h-3 w-3" />
                {task._count.subtasks}
              </span>
            )}
            {task._count.timeEntries > 0 && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
              </span>
            )}
            {task.assignee && (
              <Avatar className="h-5 w-5">
                <AvatarImage src={task.assignee.image ?? undefined} />
                <AvatarFallback className="text-xs">
                  {task.assignee.name?.[0]}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TaskCardOverlay({ task }: { task: TaskWithRelations }) {
  return <TaskCard task={task} isDragOverlay />;
}
