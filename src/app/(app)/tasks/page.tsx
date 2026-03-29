"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import Link from "next/link";
import { PriorityBadge } from "@/components/tasks/PriorityBadge";
import { TaskDetail } from "@/components/tasks/TaskDetail";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, CheckSquare, Search, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { TaskPriority, TaskStatus } from "@prisma/client";

const STATUS_OPTIONS: { value: TaskStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "TODO", label: "To Do" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "IN_REVIEW", label: "In Review" },
  { value: "DONE", label: "Done" },
];

const PRIORITY_OPTIONS: { value: TaskPriority | "all"; label: string }[] = [
  { value: "all", label: "Any priority" },
  { value: "URGENT", label: "Urgent" },
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
  { value: "NONE", label: "None" },
];

type TaskItem = {
  id: string;
  title: string;
  priority: TaskPriority;
  status: TaskStatus;
  deadline: string | null;
  project?: { id: string; name: string; color: string };
  _count: { subtasks: number };
};

export default function TasksPage() {
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">("all");
  const [search, setSearch] = useState("");

  const { data: tasks, isLoading } = useQuery<TaskItem[]>({
    queryKey: ["all-tasks", statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/tasks?${params}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    return tasks.filter((task) => {
      if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
      if (search && !task.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [tasks, priorityFilter, search]);

  const hasActiveFilters = priorityFilter !== "all" || search;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <h1 className="text-2xl font-semibold">My Tasks</h1>

      {/* Search + filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search tasks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-8"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {/* Status */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {STATUS_OPTIONS.map(({ value, label }) => (
              <Button
                key={value}
                variant={statusFilter === value ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(value)}
                className="h-7 text-xs"
              >
                {label}
              </Button>
            ))}
          </div>

          <div className="w-px bg-border self-stretch hidden sm:block" />

          {/* Priority */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {PRIORITY_OPTIONS.map(({ value, label }) => (
              <Button
                key={value}
                variant={priorityFilter === value ? "default" : "ghost"}
                size="sm"
                onClick={() => setPriorityFilter(value)}
                className="h-7 text-xs"
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {filteredTasks.length} result{filteredTasks.length !== 1 ? "s" : ""}
            </span>
            <button
              onClick={() => { setPriorityFilter("all"); setSearch(""); }}
              className="text-xs text-primary hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <CheckSquare className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-medium mb-1">
            {hasActiveFilters ? "No matching tasks" : "No tasks found"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {hasActiveFilters
              ? "Try adjusting your filters."
              : "Create tasks from any project's Kanban board or use New task."}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {filteredTasks.map((task) => (
            <Link
              key={task.id}
              href={`/projects/${task.project?.id}?task=${task.id}`}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg border bg-card shadow-xs",
                "hover:border-primary/50 transition-colors",
                task.status === "DONE" && "opacity-60"
              )}
            >
              <div
                className="w-1 h-5 rounded-full shrink-0"
                style={{
                  backgroundColor:
                    task.status === "DONE"
                      ? "#22c55e"
                      : task.status === "IN_PROGRESS"
                      ? "oklch(0.585 0.233 277)"
                      : "var(--border)",
                }}
              />

              <span
                className={cn(
                  "flex-1 text-sm font-medium truncate",
                  task.status === "DONE" && "line-through text-muted-foreground"
                )}
              >
                {task.title}
              </span>

              <div className="flex items-center gap-2 shrink-0">
                <PriorityBadge priority={task.priority} />
                {task.deadline && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(task.deadline), "MMM d")}
                  </span>
                )}
                {task.project && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full hidden sm:inline"
                    style={{
                      backgroundColor: task.project.color + "20",
                      color: task.project.color,
                    }}
                  >
                    {task.project.name}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      <TaskDetail />
    </div>
  );
}
