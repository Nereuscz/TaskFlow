"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import Link from "next/link";
import { PriorityBadge } from "@/components/tasks/PriorityBadge";
import { TaskDetail } from "@/components/tasks/TaskDetail";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, CheckSquare, ChevronDown, ChevronRight, Search, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { TaskPriority, TaskStatus } from "@prisma/client";

const STATUS_SECTIONS: { value: TaskStatus; label: string; color: string }[] = [
  { value: "TODO", label: "To Do", color: "text-slate-500" },
  { value: "IN_PROGRESS", label: "In Progress", color: "text-blue-500" },
  { value: "IN_REVIEW", label: "In Review", color: "text-amber-500" },
  { value: "DONE", label: "Done", color: "text-emerald-500" },
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

function TaskRow({ task }: { task: TaskItem }) {
  return (
    <Link
      href={`/projects/${task.project?.id}?task=${task.id}`}
      className={cn(
        "group grid items-center gap-2 px-3 py-2.5 border-b border-border/50 last:border-b-0",
        "hover:bg-accent/50 transition-colors cursor-pointer",
        task.status === "DONE" && "opacity-55",
        "[grid-template-columns:1fr_auto_auto_auto]"
      )}
    >
      <span
        className={cn(
          "text-sm truncate pr-4",
          task.status === "DONE" ? "line-through text-muted-foreground" : "text-foreground"
        )}
      >
        {task.title}
      </span>

      <div className="flex justify-end">
        <PriorityBadge priority={task.priority} />
      </div>

      <div className="w-24 flex justify-end">
        {task.deadline ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3 shrink-0" />
            {format(new Date(task.deadline), "MMM d")}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground/30">—</span>
        )}
      </div>

      <div className="w-28 flex justify-end">
        {task.project ? (
          <span
            className="text-xs px-2 py-0.5 rounded-full truncate max-w-[7rem]"
            style={{
              backgroundColor: task.project.color + "1a",
              color: task.project.color,
            }}
          >
            {task.project.name}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground/30">—</span>
        )}
      </div>
    </Link>
  );
}

function StatusSection({
  section,
  tasks,
}: {
  section: (typeof STATUS_SECTIONS)[number];
  tasks: TaskItem[];
}) {
  const [expanded, setExpanded] = useState(true);

  if (tasks.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 bg-muted/40 hover:bg-muted/60 transition-colors border-b border-border/60"
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
        <span className={cn("text-xs font-semibold", section.color)}>{section.label}</span>
        <span className="text-xs text-muted-foreground/60 ml-1">{tasks.length}</span>
      </button>

      {expanded && (
        <>
          <div className="grid px-3 py-1.5 border-b border-border/40 [grid-template-columns:1fr_auto_auto_auto] gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
              Task name
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 text-right">
              Priority
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 text-right w-24">
              Due date
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 text-right w-28">
              Project
            </span>
          </div>
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </>
      )}
    </div>
  );
}

export default function TasksPage() {
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">("all");
  const [search, setSearch] = useState("");
  const [collapsedView, setCollapsedView] = useState<"sections" | "flat">("sections");

  const { data: tasks, isLoading } = useQuery<TaskItem[]>({
    queryKey: ["all-tasks"],
    queryFn: async () => {
      const res = await fetch("/api/tasks");
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

  const tasksByStatus = useMemo(() => {
    const map: Record<TaskStatus, TaskItem[]> = {
      TODO: [],
      IN_PROGRESS: [],
      IN_REVIEW: [],
      DONE: [],
      CANCELLED: [],
    };
    for (const task of filteredTasks) {
      if (task.status in map) map[task.status].push(task);
    }
    return map;
  }, [filteredTasks]);

  const hasActiveFilters = priorityFilter !== "all" || search;
  const totalVisible = filteredTasks.length;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Tasks</h1>
        {!isLoading && (
          <p className="text-sm text-muted-foreground mt-0.5">
            {totalVisible} task{totalVisible !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search tasks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-8 h-8 text-sm"
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

        {hasActiveFilters && (
          <button
            onClick={() => {
              setPriorityFilter("all");
              setSearch("");
            }}
            className="text-xs text-primary hover:underline ml-auto"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : totalVisible === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <CheckSquare className="h-10 w-10 text-muted-foreground/40 mb-4" />
          <h2 className="text-base font-medium mb-1">
            {hasActiveFilters ? "No matching tasks" : "No tasks found"}
          </h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            {hasActiveFilters
              ? "Try adjusting your filters."
              : "Create tasks from any project's Kanban board or use New task."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {STATUS_SECTIONS.map((section) => (
            <StatusSection
              key={section.value}
              section={section}
              tasks={tasksByStatus[section.value]}
            />
          ))}
        </div>
      )}

      <TaskDetail />
    </div>
  );
}
