"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ProjectBoard, TaskWithRelations } from "@/hooks/useTasks";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PriorityBadge } from "@/components/tasks/PriorityBadge";
import { cn } from "@/lib/utils";
import { format, isPast } from "date-fns";
import { Calendar, Plus, RotateCcw } from "lucide-react";
import { BulkActionBar } from "@/components/project/BulkActionBar";

const STATUS_COLORS: Record<string, string> = {
  TODO: "text-stone-500",
  IN_PROGRESS: "text-sky-600",
  IN_REVIEW: "text-violet-600",
  DONE: "text-emerald-600",
  CANCELLED: "text-red-500",
};

interface TableViewProps {
  board: ProjectBoard;
  onCreateTask: (data: { columnId: string; title: string; projectId: string }) => void;
  isCreating?: boolean;
}

interface FlatTask {
  task: TaskWithRelations;
  columnName: string;
  columnId: string;
}

function TableRow({
  item,
  selected,
  onToggleSelect,
}: {
  item: FlatTask;
  selected: boolean;
  onToggleSelect: (id: string) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { task } = item;

  const isOverdue =
    task.deadline && isPast(new Date(task.deadline)) && task.status !== "DONE";

  function openDetail() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("task", task.id);
    router.replace(`?${params.toString()}`);
  }

  return (
    <tr
      className={cn(
        "group cursor-pointer hover:bg-muted/30 transition-colors border-t border-border/30",
        selected && "bg-primary/5"
      )}
    >
      {/* Checkbox */}
      <td className="py-2.5 pl-3 pr-0 w-8">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => { e.stopPropagation(); onToggleSelect(task.id); }}
          onClick={(e) => e.stopPropagation()}
          className="h-3.5 w-3.5 rounded accent-primary cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ opacity: selected ? 1 : undefined }}
        />
      </td>

      {/* Title */}
      <td className="py-2.5 pl-2 pr-3" onClick={openDetail}>
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "text-sm font-medium group-hover:text-primary transition-colors",
              task.status === "DONE" && "line-through text-muted-foreground"
            )}
          >
            {task.title}
          </span>
          {(task as { recurrence?: string }).recurrence && (task as { recurrence?: string }).recurrence !== "NONE" && (
            <RotateCcw className="h-3 w-3 text-muted-foreground flex-shrink-0" aria-label="Recurring task" />
          )}
        </div>
        {task.tags.length > 0 && (
          <div className="flex items-center gap-1 mt-0.5">
            {task.tags.slice(0, 3).map(({ tag }) => (
              <span
                key={tag.id}
                className="inline-flex items-center px-1.5 py-0 rounded text-[10px] font-medium"
                style={{ backgroundColor: tag.color + "20", color: tag.color }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </td>


      {/* Column */}
      <td className="py-2.5 px-3 hidden sm:table-cell">
        <span
          className={cn(
            "text-xs font-medium",
            STATUS_COLORS[task.status] ?? "text-muted-foreground"
          )}
        >
          {item.columnName}
        </span>
      </td>

      {/* Priority */}
      <td className="py-2.5 px-3 hidden md:table-cell">
        <PriorityBadge priority={task.priority} />
      </td>

      {/* Assignee */}
      <td className="py-2.5 px-3 hidden lg:table-cell">
        {task.assignee ? (
          <div className="flex items-center gap-1.5">
            <Avatar className="h-5 w-5">
              <AvatarImage src={task.assignee.image ?? undefined} />
              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                {task.assignee.name?.[0]}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate max-w-24">
              {task.assignee.name}
            </span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground/40">—</span>
        )}
      </td>

      {/* Deadline */}
      <td className="py-2.5 pl-3 pr-4 hidden sm:table-cell">
        {task.deadline ? (
          <span
            className={cn(
              "flex items-center gap-1 text-xs",
              isOverdue ? "text-destructive" : "text-muted-foreground"
            )}
          >
            <Calendar className="h-3 w-3" />
            {format(new Date(task.deadline), "MMM d, yyyy")}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground/40">—</span>
        )}
      </td>
    </tr>
  );
}

export function TableView({ board, onCreateTask, isCreating }: TableViewProps) {
  const [addingInColumn, setAddingInColumn] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const allTasks: FlatTask[] = board.columns.flatMap((col) =>
    col.tasks.map((task) => ({
      task,
      columnName: col.name,
      columnId: col.id,
    }))
  );

  const allSelected = allTasks.length > 0 && allTasks.every((t) => selectedIds.has(t.task.id));

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(allTasks.map((t) => t.task.id)));
  }

  function handleAdd(columnId: string) {
    const title = newTitle.trim();
    if (!title) return;
    onCreateTask({ columnId, title, projectId: board.id });
    setNewTitle("");
    setAddingInColumn(null);
  }

  return (
    <div className="pb-6">
      <div className="border border-border/60 rounded-xl bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/20 border-b border-border/40">
              <th className="py-2.5 pl-3 pr-0 w-8">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-3.5 w-3.5 rounded accent-primary cursor-pointer" />
              </th>
              <th className="py-2.5 pl-2 pr-3 text-left text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">
                Title
              </th>
              <th className="py-2.5 px-3 text-left text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider hidden sm:table-cell">
                Column
              </th>
              <th className="py-2.5 px-3 text-left text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider hidden md:table-cell">
                Priority
              </th>
              <th className="py-2.5 px-3 text-left text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider hidden lg:table-cell">
                Assignee
              </th>
              <th className="py-2.5 pl-3 pr-4 text-left text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider hidden sm:table-cell">
                Deadline
              </th>
            </tr>
          </thead>
          <tbody>
            {allTasks.map((item) => (
              <TableRow
                key={item.task.id}
                item={item}
                selected={selectedIds.has(item.task.id)}
                onToggleSelect={toggleSelect}
              />
            ))}

            {allTasks.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="py-8 text-center text-sm text-muted-foreground/50 italic"
                >
                  No tasks yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add task row — picks the first column by default */}
      {board.columns.length > 0 && (
        <div className="mt-3">
          {addingInColumn ? (
            <div className="flex items-center gap-2 px-4 py-2 border border-border/60 rounded-xl bg-card shadow-sm">
              <Input
                autoFocus
                placeholder="Task title…"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd(addingInColumn);
                  if (e.key === "Escape") { setAddingInColumn(null); setNewTitle(""); }
                }}
                className="h-7 text-sm flex-1"
              />
              <select
                value={addingInColumn}
                onChange={(e) => setAddingInColumn(e.target.value)}
                className="text-xs rounded border border-border/60 bg-background px-2 py-1 focus:outline-none"
              >
                {board.columns.map((col) => (
                  <option key={col.id} value={col.id}>{col.name}</option>
                ))}
              </select>
              <Button
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => handleAdd(addingInColumn)}
                disabled={isCreating}
              >
                Add
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs px-2"
                onClick={() => { setAddingInColumn(null); setNewTitle(""); }}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setAddingInColumn(board.columns[0].id)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground/60 hover:text-primary hover:bg-primary/5 rounded-xl transition-colors w-full border border-dashed border-border/50"
            >
              <Plus className="h-4 w-4" />
              Add task
            </button>
          )}
        </div>
      )}

      <BulkActionBar
        selectedIds={selectedIds}
        projectId={board.id}
        onClear={() => setSelectedIds(new Set())}
      />
    </div>
  );
}
