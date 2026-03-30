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
    task.deadline &&
    isPast(new Date(task.deadline)) &&
    !isToday(new Date(task.deadline)) &&
    !isDone;

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
        isDone ? "opacity-45" : "hover:bg-accent/50"
      )}
    >
      <button
        onClick={() => onToggleDone(task)}
        className="shrink-0 text-muted-foreground/50 hover:text-primary transition-colors"
        aria-label={isDone ? "Mark as not done" : "Mark as done"}
      >
        {isDone ? (
          <CheckCircle2 className="h-[18px] w-[18px] text-primary" />
        ) : (
          <Circle className="h-[18px] w-[18px]" />
        )}
      </button>

      <Link
        href={`/projects/${task.project?.id}?task=${task.id}`}
        className="flex-1 flex items-center gap-3 min-w-0"
      >
        <span
          className={cn(
            "text-sm truncate",
            isDone ? "line-through text-muted-foreground" : "text-foreground"
          )}
        >
          {task.title}
        </span>
      </Link>

      <div className="flex items-center gap-2 shrink-0">
        <PriorityBadge priority={task.priority} />
        {task.deadline && (
          <span
            className={cn(
              "flex items-center gap-1 text-xs",
              isOverdue
                ? "text-destructive font-medium"
                : "text-muted-foreground"
            )}
          >
            <Calendar className="h-3 w-3" />
            {formatDeadline(task.deadline)}
          </span>
        )}
        {task.project && (
          <span
            className="text-xs px-2 py-0.5 rounded-full hidden sm:inline font-medium"
            style={{
              backgroundColor: task.project.color + "15",
              color: task.project.color,
            }}
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
  dotColor,
}: {
  title: string;
  icon: React.ElementType;
  tasks: TaskItem[];
  onToggleDone: (task: TaskItem) => void;
  emptyMessage?: string;
  dotColor?: string;
}) {
  if (tasks.length === 0 && !emptyMessage) return null;

  return (
    <div className="border border-border/60 rounded-xl bg-card shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/40">
        <div className={cn("h-2 w-2 rounded-full", dotColor ?? "bg-muted-foreground")} />
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">{title}</h2>
        {tasks.length > 0 && (
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">
            {tasks.length}
          </span>
        )}
      </div>
      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 px-4 text-center">
          {emptyMessage}
        </p>
      ) : (
        <div className="py-1">
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

  const { data: tasksData, isLoading } = useQuery<{ tasks: TaskItem[] }>({
    queryKey: ["today-tasks"],
    queryFn: async () => {
      const res = await fetch("/api/tasks?limit=100");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const tasks = tasksData?.tasks;

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
      if (task.project?.id)
        queryClient.invalidateQueries({
          queryKey: ["project", task.project.id],
        });
    } catch {
      queryClient.setQueryData<TaskItem[]>(["today-tasks"], (old) =>
        old?.map((t) => (t.id === task.id ? task : t))
      );
      toast.error("Failed to update task");
    }
  }

  const active =
    tasks?.filter(
      (t) => t.status !== "DONE" && t.status !== "CANCELLED"
    ) ?? [];

  const overdue = active.filter(
    (t) =>
      t.deadline &&
      isPast(new Date(t.deadline)) &&
      !isToday(new Date(t.deadline))
  );

  const dueToday = active.filter(
    (t) => t.deadline && isToday(new Date(t.deadline))
  );

  const urgent = active.filter(
    (t) =>
      t.priority === "URGENT" &&
      !overdue.includes(t) &&
      !dueToday.includes(t)
  );

  const doneTodayCount =
    tasks?.filter(
      (t) => t.completedAt && isToday(new Date(t.completedAt))
    ).length ?? 0;

  const totalToday = overdue.length + dueToday.length + urgent.length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="pt-2">
        <p className="text-sm text-muted-foreground mb-1">
          {format(new Date(), "EEEE, MMMM d")}
          {doneTodayCount > 0 && (
            <span className="ml-2 text-primary font-medium">
              &middot; {doneTodayCount} completed
            </span>
          )}
        </p>
        <div className="flex items-center gap-2.5">
          <Sun className="h-6 w-6 text-amber-500" />
          <h1 className="text-2xl font-bold tracking-tight">Today</h1>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
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
          <CheckCircle2 className="h-12 w-12 text-primary/30 mb-4" />
          <h2 className="text-lg font-semibold mb-1">All clear</h2>
          <p className="text-sm text-muted-foreground">
            No urgent tasks or deadlines for today.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <Section
            title="Overdue"
            icon={AlertTriangle}
            dotColor="bg-red-500"
            tasks={overdue}
            onToggleDone={handleToggleDone}
          />
          <Section
            title="Due today"
            icon={Calendar}
            dotColor="bg-primary"
            tasks={dueToday}
            onToggleDone={handleToggleDone}
            emptyMessage={
              overdue.length === 0 && urgent.length === 0
                ? "Nothing due today."
                : undefined
            }
          />
          <Section
            title="Urgent"
            icon={AlertTriangle}
            dotColor="bg-amber-500"
            tasks={urgent}
            onToggleDone={handleToggleDone}
          />
        </div>
      )}

      <TaskDetail />
    </div>
  );
}
