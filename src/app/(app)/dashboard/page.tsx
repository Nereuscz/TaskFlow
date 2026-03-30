"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { PriorityBadge } from "@/components/tasks/PriorityBadge";
import {
  Calendar,
  FolderOpen,
  CheckCircle2,
  Circle,
  ArrowRight,
  Layers,
  TrendingUp,
} from "lucide-react";
import { format, isToday, isTomorrow } from "date-fns";
import { TaskDetail } from "@/components/tasks/TaskDetail";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { TaskStatus } from "@prisma/client";

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

function TaskCheckRow({
  task,
  onToggle,
}: {
  task: TaskItem;
  onToggle: (task: TaskItem) => void;
}) {
  const isDone = task.status === "DONE";

  return (
    <div
      className={cn(
        "group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
        isDone ? "opacity-45" : "hover:bg-accent/60"
      )}
    >
      <button
        onClick={() => onToggle(task)}
        className="shrink-0 text-muted-foreground/60 hover:text-primary transition-colors"
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
        <PriorityBadge priority={task.priority as never} />
        {task.project && (
          <span
            className="text-xs px-2 py-0.5 rounded-full hidden sm:inline-flex font-medium"
            style={{
              backgroundColor: task.project.color + "15",
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
    </div>
  );
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const { data: myTasksData, isLoading: tasksLoading } = useQuery<{
    tasks: TaskItem[];
  }>({
    queryKey: ["my-tasks"],
    queryFn: async () => {
      const res = await fetch(
        `/api/tasks?assigneeId=${session?.user.id}&limit=100`
      );
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!session?.user.id,
  });

  const myTasks = myTasksData?.tasks;

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  async function handleToggle(task: TaskItem) {
    const newStatus: TaskStatus = task.status === "DONE" ? "TODO" : "DONE";
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed");
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["today-tasks"] });
      if (task.project?.id)
        queryClient.invalidateQueries({
          queryKey: ["project", task.project.id],
        });
    } catch {
      toast.error("Failed to update task");
    }
  }

  const activeTasks: TaskItem[] =
    myTasks?.filter(
      (t: TaskItem) => t.status !== "DONE" && t.status !== "CANCELLED"
    ) ?? [];

  const todayTasks = activeTasks.filter(
    (t) =>
      (t.deadline && isToday(new Date(t.deadline))) ||
      t.priority === "URGENT" ||
      (t.priority === "HIGH" && !t.deadline)
  );

  const upcoming = activeTasks
    .filter((t) => t.deadline && !isToday(new Date(t.deadline)))
    .slice(0, 5);

  const completedToday =
    myTasks?.filter(
      (t: TaskItem) => t.completedAt && isToday(new Date(t.completedAt))
    ).length ?? 0;

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Greeting */}
      <div className="pt-2">
        <p className="text-sm text-muted-foreground mb-1">
          {format(new Date(), "EEEE, MMMM d")}
        </p>
        <h1 className="text-3xl font-bold tracking-tight">
          {greeting}, {session?.user.name?.split(" ")[0]}
        </h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            icon: Layers,
            label: "Open tasks",
            value: tasksLoading ? null : activeTasks.length,
            accent: "bg-primary/10 text-primary",
          },
          {
            icon: FolderOpen,
            label: "Projects",
            value: projectsLoading ? null : (projects?.length ?? 0),
            accent: "bg-amber-500/10 text-amber-600",
          },
          {
            icon: TrendingUp,
            label: "Done today",
            value: tasksLoading ? null : completedToday,
            accent: "bg-emerald-500/10 text-emerald-600",
          },
        ].map(({ icon: Icon, label, value, accent }) => (
          <div
            key={label}
            className="border border-border/60 rounded-xl p-4 bg-card shadow-sm"
          >
            <div className="flex items-center gap-2.5 mb-3">
              <div
                className={cn(
                  "flex items-center justify-center h-8 w-8 rounded-lg",
                  accent
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                {label}
              </span>
            </div>
            {value === null ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <p className="text-3xl font-bold tracking-tight">{value}</p>
            )}
          </div>
        ))}
      </div>

      {/* Today's focus — Basecamp-style to-do list */}
      <div className="border border-border/60 rounded-xl bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <h2 className="text-sm font-semibold">Today&apos;s focus</h2>
            {todayTasks.length > 0 && (
              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">
                {todayTasks.length}
              </span>
            )}
          </div>
          <Link
            href="/today"
            className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {tasksLoading ? (
          <div className="p-3 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-lg" />
            ))}
          </div>
        ) : todayTasks.length === 0 ? (
          <div className="flex items-center gap-3 py-8 px-4 text-muted-foreground justify-center">
            <CheckCircle2 className="h-5 w-5 text-primary/40" />
            <p className="text-sm">No urgent tasks for today. Enjoy the calm.</p>
          </div>
        ) : (
          <div className="py-1">
            {todayTasks.map((task) => (
              <TaskCheckRow
                key={task.id}
                task={task}
                onToggle={handleToggle}
              />
            ))}
          </div>
        )}
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="border border-border/60 rounded-xl bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-amber-400" />
              <h2 className="text-sm font-semibold">Upcoming</h2>
              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">
                {upcoming.length}
              </span>
            </div>
            <Link
              href="/tasks"
              className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
            >
              All tasks <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="py-1">
            {upcoming.map((task) => (
              <TaskCheckRow
                key={task.id}
                task={task}
                onToggle={handleToggle}
              />
            ))}
          </div>
        </div>
      )}

      {/* Projects */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Your projects</h2>
          <Link
            href="/projects"
            className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
          >
            See all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {projectsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : !projects || projects.length === 0 ? (
          <div className="flex items-center gap-3 py-8 px-4 border border-dashed border-border/60 rounded-xl text-muted-foreground justify-center">
            <FolderOpen className="h-5 w-5 shrink-0 text-muted-foreground/40" />
            <p className="text-sm">
              No projects yet.{" "}
              <Link href="/projects" className="text-primary hover:underline font-medium">
                Create your first project
              </Link>
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {projects
              ?.slice(0, 6)
              .map(
                (p: {
                  id: string;
                  name: string;
                  color: string;
                  description?: string;
                  _count?: { tasks: number };
                }) => (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    className="group border border-border/60 rounded-xl bg-card shadow-sm hover:shadow-md hover:border-border transition-all overflow-hidden"
                  >
                    <div
                      className="h-1.5 w-full"
                      style={{ backgroundColor: p.color }}
                    />
                    <div className="p-3.5">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: p.color }}
                        />
                        <span className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                          {p.name}
                        </span>
                      </div>
                      {p._count?.tasks !== undefined && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {p._count.tasks} task{p._count.tasks !== 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                  </Link>
                )
              )}
          </div>
        )}
      </div>

      <TaskDetail />
    </div>
  );
}
