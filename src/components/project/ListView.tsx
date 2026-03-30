"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ProjectBoard, TaskWithRelations } from "@/hooks/useTasks";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PriorityBadge } from "@/components/tasks/PriorityBadge";
import { BulkActionBar } from "@/components/project/BulkActionBar";
import { cn } from "@/lib/utils";
import { format, isPast } from "date-fns";
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Plus,
  Tag,
  RotateCcw,
} from "lucide-react";

const PRIORITY_DOT: Record<string, string> = {
  URGENT: "bg-red-500",
  HIGH: "bg-orange-500",
  MEDIUM: "bg-yellow-500",
  LOW: "bg-blue-400",
  NONE: "bg-muted-foreground/30",
};

interface ListViewProps {
  board: ProjectBoard;
  onCreateTask: (data: { columnId: string; title: string; projectId: string }) => void;
  isCreating?: boolean;
}

function TaskRow({
  task,
  selected,
  onToggleSelect,
}: {
  task: TaskWithRelations;
  selected: boolean;
  onToggleSelect: (id: string) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const isOverdue =
    task.deadline && isPast(new Date(task.deadline)) && task.status !== "DONE";

  function openDetail() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("task", task.id);
    router.replace(`?${params.toString()}`);
  }

  return (
    <div
      className={cn(
        "group flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 cursor-pointer transition-colors border-t border-border/30 first:border-t-0",
        selected && "bg-primary/5"
      )}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={selected}
        onChange={(e) => { e.stopPropagation(); onToggleSelect(task.id); }}
        onClick={(e) => e.stopPropagation()}
        className="h-3.5 w-3.5 rounded accent-primary flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        style={{ opacity: selected ? 1 : undefined }}
      />

      {/* Priority dot */}
      <div
        onClick={openDetail}
        className={cn(
          "h-2.5 w-2.5 rounded-full flex-shrink-0",
          PRIORITY_DOT[task.priority] ?? "bg-muted-foreground/30"
        )}
      />

      {/* Title */}
      <span
        onClick={openDetail}
        className={cn(
          "flex-1 text-sm truncate cursor-pointer",
          task.status === "DONE" && "line-through text-muted-foreground"
        )}
      >
        {task.title}
      </span>

      {/* Tags */}
      {task.tags.length > 0 && (
        <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
          {task.tags.slice(0, 2).map(({ tag }) => (
            <span
              key={tag.id}
              className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium"
              style={{ backgroundColor: tag.color + "20", color: tag.color }}
            >
              {tag.name}
            </span>
          ))}
          {task.tags.length > 2 && (
            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
              <Tag className="h-3 w-3" />+{task.tags.length - 2}
            </span>
          )}
        </div>
      )}

      {/* Priority badge */}
      <div className="hidden md:block flex-shrink-0">
        <PriorityBadge priority={task.priority} />
      </div>

      {/* Deadline */}
      {task.deadline ? (
        <span
          className={cn(
            "hidden sm:flex items-center gap-1 text-xs flex-shrink-0",
            isOverdue ? "text-destructive" : "text-muted-foreground"
          )}
        >
          <Calendar className="h-3 w-3" />
          {format(new Date(task.deadline), "MMM d")}
        </span>
      ) : (
        <span className="hidden sm:block w-16 flex-shrink-0" />
      )}

      {/* Recurrence icon */}
      {(task as { recurrence?: string }).recurrence && (task as { recurrence?: string }).recurrence !== "NONE" && (
        <RotateCcw className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" aria-label="Recurring task" />
      )}

      {/* Assignee */}
      {task.assignee ? (
        <Avatar className="h-6 w-6 flex-shrink-0">
          <AvatarImage src={task.assignee.image ?? undefined} />
          <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
            {task.assignee.name?.[0]}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="h-6 w-6 flex-shrink-0" />
      )}
    </div>
  );
}

function ColumnSection({
  column,
  projectId,
  onCreateTask,
  isCreating,
  selectedIds,
  onToggleSelect,
}: {
  column: ProjectBoard["columns"][0];
  projectId: string;
  onCreateTask: (data: { columnId: string; title: string; projectId: string }) => void;
  isCreating?: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [addingTask, setAddingTask] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const allSelected = column.tasks.length > 0 && column.tasks.every((t) => selectedIds.has(t.id));

  function handleAdd() {
    const title = newTitle.trim();
    if (!title) return;
    onCreateTask({ columnId: column.id, title, projectId });
    setNewTitle("");
    setAddingTask(false);
  }

  function toggleAll() {
    if (allSelected) column.tasks.forEach((t) => { if (selectedIds.has(t.id)) onToggleSelect(t.id); });
    else column.tasks.forEach((t) => { if (!selectedIds.has(t.id)) onToggleSelect(t.id); });
  }

  return (
    <div className="border border-border/60 rounded-xl bg-card shadow-sm overflow-hidden">
      {/* Section header */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/20 border-b border-border/40">
        <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-3.5 w-3.5 rounded accent-primary flex-shrink-0 cursor-pointer" />
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-2 flex-1 min-w-0 text-left"
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          )}
          <span className="text-sm font-semibold tracking-tight">{column.name}</span>
          <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-md bg-muted text-muted-foreground text-xs font-medium">
            {column.tasks.length}
          </span>
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-60 hover:opacity-100 flex-shrink-0"
          onClick={() => { setAddingTask(true); setExpanded(true); }}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {expanded && (
        <>
          {column.tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              selected={selectedIds.has(task.id)}
              onToggleSelect={onToggleSelect}
            />
          ))}

          {column.tasks.length === 0 && !addingTask && (
            <div className="px-4 py-3 text-sm text-muted-foreground/50 italic">
              No tasks yet
            </div>
          )}

          {addingTask ? (
            <div className="px-4 py-2 border-t border-border/30 space-y-1.5">
              <Input
                autoFocus
                placeholder="Task title…"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                  if (e.key === "Escape") { setAddingTask(false); setNewTitle(""); }
                }}
                className="h-7 text-sm"
              />
              <div className="flex gap-1.5">
                <Button size="sm" className="h-6 text-xs px-2.5" onClick={handleAdd} disabled={isCreating}>
                  Add
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-xs px-2"
                  onClick={() => { setAddingTask(false); setNewTitle(""); }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { setAddingTask(true); setExpanded(true); }}
              className="flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground/60 hover:text-primary hover:bg-primary/5 transition-colors w-full border-t border-border/20"
            >
              <Plus className="h-3.5 w-3.5" />
              Add task
            </button>
          )}
        </>
      )}
    </div>
  );
}

export function ListView({ board, onCreateTask, isCreating }: ListViewProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-3 pb-6">
      {/* Column header row */}
      <div className="hidden sm:flex items-center gap-3 px-4 pb-1 text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">
        <div className="w-3.5 flex-shrink-0" />
        <div className="w-2.5 flex-shrink-0" />
        <span className="flex-1">Title</span>
        <span className="hidden md:block w-20 text-right">Priority</span>
        <span className="w-16 text-right">Deadline</span>
        <span className="w-6 flex-shrink-0" />
      </div>

      {board.columns.map((column) => (
        <ColumnSection
          key={column.id}
          column={column}
          projectId={board.id}
          onCreateTask={onCreateTask}
          isCreating={isCreating}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
        />
      ))}

      <BulkActionBar
        selectedIds={selectedIds}
        projectId={board.id}
        onClear={() => setSelectedIds(new Set())}
      />
    </div>
  );
}
