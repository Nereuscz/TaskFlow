"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { PriorityBadge } from "@/components/tasks/PriorityBadge";
import { TaskDetail } from "@/components/tasks/TaskDetail";
import { Calendar, CheckCircle2, Circle, AlertTriangle, Sun } from "lucide-react";
import { format, isToday, isPast, isTomorrow } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { TaskPriority, TaskStatus } from "@prisma/client";

type TaskItem = {
  id: string;
  title: string;
  priority: TaskPriority;
  status: TaskStatus;
  deadline: string | null;
  completedAt: string | null;
  project?: { id: string; name: string; color: string };
  assignee?: { id: string; name: string | null } | null;
};

function formatDeadline(date: string) {
  const d = new Date(date);
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  if (isPast(d)) return `${format(d, "MMM d")} (overdue)`;
  return format(d, "MMM d");
}

function TaskRow({
  task,
  onToggleDone,
}: {
  task: TaskItem;
  onToggleDone: (task: TaskItem) => void;
}) {
  const isDone = task.status === "DONE";
  const isOverdue =
    task.deadline && isPast(new Date(task.deadline)) && !isToday(new Date(task.deadline)) && !isDone;

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg border bg-card transition-colors",
        isDone ? "opacity-50" : "hover:border-primary/40"
      )}
    >
      <button
        onClick={() => onToggleDone(task)}
        className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
        aria-label={isDone ? "Mark as not done" : "Mark as done"}
      >
        {isDone ? (
          <CheckCircle2 className="h-4 w-4 text-primary" />
        ) : (
          <Circle className="h-4 w-4" />
        )}
      </button>

      <Link
        href={`/projects/${task.project?.id}?task=${task.id}`}
        className="flex-1 flex items-center gap-3 min-w-0"
      >
        <span className={cn("text-sm font-medium truncate", isDone && "line-through text-muted-foreground")}>
          {task.title}
        </span>
      </Link>

      <div className="flex items-center gap-2 shrink-0">
        <PriorityBadge priority={task.priority} />
        {task.deadline && (
          <span
            className={cn(
              "flex items-center gap-1 text-xs",
              isOverdue ? "text-destructive font-medium" : "text-muted-foreground"
            )}
          >
            <Calendar className="h-3 w-3" />
            {formatDeadline(task.deadline)}
          </span>
        )}
        {task.project && (
          <span
            className="text-xs px-2 py-0.5 rounded-full hidden sm:inline"
            style={{ backgroundColor: task.project.color + "20", color: task.project.color }}
          >
            {task.project.name}
          </span>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  tasks,
  onToggleDone,
  emptyMessage,
  accent,
}: {
  title: string;
  icon: React.ElementType;
  tasks: TaskItem[];
  onToggleDone: (task: TaskItem) => void;
  emptyMessage?: string;
  accent?: string;
}) {
  if (tasks.length === 0 && !emptyMessage) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={cn("h-4 w-4", accent ?? "text-muted-foreground")} />
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
        {tasks.length > 0 && (
          <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-muted text-muted-foreground text-xs">
            {tasks.length}
          </span>
        )}
      </div>
      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2 px-3">{emptyMessage}</p>
      ) : (
        <div className="space-y-1.5">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} onToggleDone={onToggleDone} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TodayPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const { data: tasks, isLoading } = useQuery<TaskItem[]>({
    queryKey: ["today-tasks"],
    queryFn: async () => {
      const res = await fetch("/api/tasks");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  async function handleToggleDone(task: TaskItem) {
    const newStatus: TaskStatus = task.status === "DONE" ? "TODO" : "DONE";

    queryClient.setQueryData<TaskItem[]>(["today-tasks"], (old) =>
      old?.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
    );

    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed");
      queryClient.invalidateQueries({ queryKey: ["today-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
      if (task.project?.id) queryClient.invalidateQueries({ queryKey: ["project", task.project.id] });
    } catch {
      queryClient.setQueryData<TaskItem[]>(["today-tasks"], (old) =>
        old?.map((t) => (t.id === task.id ? task : t))
      );
      toast.error("Failed to update task");
    }
  }

  const active = tasks?.filter((t) => t.status !== "DONE" && t.status !== "CANCELLED") ?? [];

  const overdue = active.filter(
    (t) => t.deadline && isPast(new Date(t.deadline)) && !isToday(new Date(t.deadline))
  );

  const dueToday = active.filter((t) => t.deadline && isToday(new Date(t.deadline)));

  const urgent = active.filter(
    (t) => t.priority === "URGENT" && !overdue.includes(t) && !dueToday.includes(t)
  );

  const doneTodayCount =
    tasks?.filter((t) => t.completedAt && isToday(new Date(t.completedAt))).length ?? 0;

  const totalToday = overdue.length + dueToday.length + urgent.length;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sun className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-semibold">Today</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          {format(new Date(), "EEEE, MMMM d")}
          {doneTodayCount > 0 && (
            <span className="ml-2 text-primary font-medium">· {doneTodayCount} completed</span>
          )}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              {Array.from({ length: 3 }).map((_, j) => (
                <Skeleton key={j} className="h-12 rounded-lg" />
              ))}
            </div>
          ))}
        </div>
      ) : totalToday === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <CheckCircle2 className="h-12 w-12 text-primary/40 mb-4" />
          <h2 className="text-lg font-medium mb-1">All clear</h2>
          <p className="text-sm text-muted-foreground">No urgent tasks or deadlines for today.</p>
        </div>
      ) : (
        <div className="space-y-8">
          <Section
            title="Overdue"
            icon={AlertTriangle}
            accent="text-destructive"
            tasks={overdue}
            onToggleDone={handleToggleDone}
          />
          <Section
            title="Due today"
            icon={Calendar}
            accent="text-primary"
            tasks={dueToday}
            onToggleDone={handleToggleDone}
            emptyMessage={overdue.length === 0 && urgent.length === 0 ? "Nothing due today." : undefined}
          />
          <Section
            title="Urgent"
            icon={AlertTriangle}
            accent="text-orange-500"
            tasks={urgent}
            onToggleDone={handleToggleDone}
          />
        </div>
      )}

      <TaskDetail />
    </div>
  );
}
