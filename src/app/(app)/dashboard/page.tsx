"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { PriorityBadge } from "@/components/tasks/PriorityBadge";
import { Calendar, FolderOpen, CheckSquare, Sparkles } from "lucide-react";
import { format, isToday, isTomorrow } from "date-fns";
import { TaskDetail } from "@/components/tasks/TaskDetail";
import { cn } from "@/lib/utils";

type TaskItem = {
  id: string;
  title: string;
  priority: string;
  status: string;
  deadline: string | null;
  completedAt: string | null;
  project?: { id: string; name: string; color: string };
};

function formatDeadline(date: string) {
  const d = new Date(date);
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  return format(d, "MMM d");
}

function TaskRow({ task, highlight }: { task: TaskItem; highlight?: boolean }) {
  return (
    <Link
      href={`/projects/${task.project?.id}?task=${task.id}`}
      className={cn(
        "flex items-center justify-between p-3 border rounded-lg bg-card hover:border-primary/50 transition-colors",
        highlight && "border-primary/30 bg-primary/5"
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <PriorityBadge priority={task.priority as never} />
        <span className="text-sm font-medium truncate">{task.title}</span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {task.project && (
          <span
            className="text-xs px-2 py-0.5 rounded-full hidden sm:inline-flex"
            style={{
              backgroundColor: task.project.color + "20",
              color: task.project.color,
            }}
          >
            {task.project.name}
          </span>
        )}
        {task.deadline && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {formatDeadline(task.deadline)}
          </span>
        )}
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const { data: session } = useSession();

  const { data: myTasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["my-tasks"],
    queryFn: async () => {
      const res = await fetch(`/api/tasks?assigneeId=${session?.user.id}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!session?.user.id,
  });

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const activeTasks: TaskItem[] = myTasks?.filter(
    (t: TaskItem) => t.status !== "DONE" && t.status !== "CANCELLED"
  ) ?? [];

  const todayTasks = activeTasks.filter(
    (t) =>
      (t.deadline && isToday(new Date(t.deadline))) ||
      (t.priority === "URGENT") ||
      (t.priority === "HIGH" && !t.deadline)
  );

  const upcoming = activeTasks
    .filter((t) => t.deadline && !isToday(new Date(t.deadline)))
    .slice(0, 5);

  const completedToday = myTasks?.filter(
    (t: TaskItem) => t.completedAt && isToday(new Date(t.completedAt))
  ).length ?? 0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">
          {greeting}, {session?.user.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {format(new Date(), "EEEE, MMMM d")}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="border rounded-xl p-4 bg-card">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10">
              <CheckSquare className="h-4 w-4 text-primary" />
            </div>
            <span className="text-xs text-muted-foreground">Open tasks</span>
          </div>
          {tasksLoading ? (
            <Skeleton className="h-7 w-10" />
          ) : (
            <p className="text-2xl font-semibold">{activeTasks.length}</p>
          )}
        </div>
        <div className="border rounded-xl p-4 bg-card">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10">
              <FolderOpen className="h-4 w-4 text-primary" />
            </div>
            <span className="text-xs text-muted-foreground">Projects</span>
          </div>
          {projectsLoading ? (
            <Skeleton className="h-7 w-10" />
          ) : (
            <p className="text-2xl font-semibold">{projects?.length ?? 0}</p>
          )}
        </div>
        <div className="border rounded-xl p-4 bg-card col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <span className="text-xs text-muted-foreground">Done today</span>
          </div>
          {tasksLoading ? (
            <Skeleton className="h-7 w-10" />
          ) : (
            <p className="text-2xl font-semibold">{completedToday}</p>
          )}
        </div>
      </div>

      {/* Today */}
      <div>
        <h2 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wide">
          Today
        </h2>
        {tasksLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        ) : todayTasks.length === 0 ? (
          <div className="flex items-center gap-3 py-4 px-3 border border-dashed rounded-lg text-muted-foreground">
            <Sparkles className="h-4 w-4 shrink-0" />
            <p className="text-sm">No urgent tasks for today. Enjoy the calm.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayTasks.map((task) => (
              <TaskRow key={task.id} task={task} highlight />
            ))}
          </div>
        )}
      </div>

      {/* Upcoming tasks */}
      {upcoming.length > 0 && (
        <div>
          <h2 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wide">
            Upcoming
          </h2>
          <div className="space-y-2">
            {upcoming.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </div>
        </div>
      )}

      {/* Projects */}
      <div>
        <h2 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wide">
          Your projects
        </h2>
        {projectsLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {projects?.slice(0, 6).map((p: { id: string; name: string; color: string }) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="flex items-center gap-3 p-3 border rounded-xl bg-card hover:border-primary/50 transition-colors"
              >
                <div
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: p.color }}
                />
                <span className="text-sm font-medium truncate">{p.name}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <TaskDetail />
    </div>
  );
}
