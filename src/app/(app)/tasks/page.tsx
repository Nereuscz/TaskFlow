"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import Link from "next/link";
import { PriorityBadge } from "@/components/tasks/PriorityBadge";
import { TaskDetail } from "@/components/tasks/TaskDetail";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Calendar,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Search,
  X,
  ArrowUpDown,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { TaskPriority, TaskStatus } from "@prisma/client";

const STATUS_FILTER_OPTIONS: { value: TaskStatus | "all"; label: string }[] = [
  { value: "all", label: "Any status" },
  { value: "TODO", label: "To Do" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "IN_REVIEW", label: "In Review" },
  { value: "DONE", label: "Done" },
];

type SortOption = "deadline" | "title" | "priority" | "created";
const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "deadline", label: "Deadline" },
  { value: "title", label: "Title" },
  { value: "priority", label: "Priority" },
  { value: "created", label: "Created" },
];

const STATUS_SECTIONS: {
  value: TaskStatus;
  label: string;
  dotColor: string;
}[] = [
  { value: "TODO", label: "To Do", dotColor: "bg-stone-400" },
  { value: "IN_PROGRESS", label: "In Progress", dotColor: "bg-sky-500" },
  { value: "IN_REVIEW", label: "In Review", dotColor: "bg-amber-500" },
  { value: "DONE", label: "Done", dotColor: "bg-emerald-500" },
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
        "group grid items-center gap-2 px-3 py-2.5 border-b border-border/30 last:border-b-0",
        "hover:bg-accent/50 transition-colors cursor-pointer",
        task.status === "DONE" && "opacity-50",
        "[grid-template-columns:1fr_auto_auto_auto]"
      )}
    >
      <span
        className={cn(
          "text-sm truncate pr-4",
          task.status === "DONE"
            ? "line-through text-muted-foreground"
            : "text-foreground"
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
          <span className="text-xs text-muted-foreground/25">&mdash;</span>
        )}
      </div>

      <div className="w-28 flex justify-end">
        {task.project ? (
          <span
            className="text-xs px-2 py-0.5 rounded-full truncate max-w-[7rem] font-medium"
            style={{
              backgroundColor: task.project.color + "15",
              color: task.project.color,
            }}
          >
            {task.project.name}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground/25">&mdash;</span>
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
    <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2.5 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors border-b border-border/40"
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
        <span className={cn("h-2 w-2 rounded-full shrink-0", section.dotColor)} />
        <span className="text-sm font-semibold">{section.label}</span>
        <span className="text-xs text-muted-foreground/60 ml-0.5">
          {tasks.length}
        </span>
      </button>

      {expanded && (
        <>
          <div className="grid px-3 py-1.5 border-b border-border/30 [grid-template-columns:1fr_auto_auto_auto] gap-2">
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

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  URGENT: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  NONE: 4,
};

export default function TasksPage() {
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">(
    "all"
  );
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [sortBy, setSortBy] = useState<SortOption>("deadline");
  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<{
    tasks: TaskItem[];
    pagination: { page: number; totalPages: number; total: number };
  }>({
    queryKey: ["all-tasks", page],
    queryFn: async () => {
      const res = await fetch(`/api/tasks?page=${page}&limit=50`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const tasks = data?.tasks;
  const pagination = data?.pagination;

  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    let result = tasks.filter((task) => {
      if (priorityFilter !== "all" && task.priority !== priorityFilter)
        return false;
      if (statusFilter !== "all" && task.status !== statusFilter) return false;
      if (search && !task.title.toLowerCase().includes(search.toLowerCase()))
        return false;
      return true;
    });

    if (sortBy === "title") {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === "priority") {
      result = [...result].sort(
        (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
      );
    } else if (sortBy === "created") {
      result = [...result].sort((a, b) => b.id.localeCompare(a.id));
    }

    return result;
  }, [tasks, priorityFilter, statusFilter, search, sortBy]);

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

  const hasActiveFilters =
    priorityFilter !== "all" || statusFilter !== "all" || search;
  const totalVisible = filteredTasks.length;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Tasks</h1>
        {!isLoading && (
          <p className="text-sm text-muted-foreground mt-0.5">
            {totalVisible} task{totalVisible !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Toolbar */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search tasks..."
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

          <Select
            value={statusFilter}
            onValueChange={(v: string | null) =>
              v && setStatusFilter(v as TaskStatus | "all")
            }
          >
            <SelectTrigger className="w-fit" size="sm">
              <SelectValue>
                {(value: string | null) =>
                  STATUS_FILTER_OPTIONS.find((o) => o.value === value)?.label ?? "Status"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTER_OPTIONS.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={sortBy}
            onValueChange={(v: string | null) =>
              v && setSortBy(v as SortOption)
            }
          >
            <SelectTrigger className="w-fit" size="sm">
              <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
              <SelectValue>
                {(value: string | null) =>
                  SORT_OPTIONS.find((o) => o.value === value)?.label ?? "Sort"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <button
              onClick={() => {
                setPriorityFilter("all");
                setStatusFilter("all");
                setSearch("");
              }}
              className="text-xs text-primary font-medium hover:underline ml-auto"
            >
              Clear filters
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
              className={cn(
                "h-7 text-xs rounded-lg",
                priorityFilter === value
                  ? ""
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </Button>
          ))}
        </div>
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
          <CheckSquare className="h-10 w-10 text-muted-foreground/30 mb-4" />
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

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setPage((p) => Math.min(pagination.totalPages, p + 1))
            }
            disabled={page >= pagination.totalPages}
          >
            Next
          </Button>
        </div>
      )}

      <TaskDetail />
    </div>
  );
}
