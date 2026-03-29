"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { KanbanColumn as KanbanColumnType } from "@prisma/client";
import type { TaskWithRelations } from "@/hooks/useTasks";
import { TaskCard } from "./TaskCard";
import { cn } from "@/lib/utils";
import { Plus, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface KanbanColumnProps {
  column: KanbanColumnType & { tasks: TaskWithRelations[] };
  projectId: string;
  onCreateTask: (columnId: string, title: string) => void;
  onRenameColumn: (columnId: string, name: string) => void;
  onDeleteColumn: (columnId: string) => void;
  isCreating?: boolean;
}

export function KanbanColumn({
  column,
  projectId,
  onCreateTask,
  onRenameColumn,
  onDeleteColumn,
  isCreating,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const [addingTask, setAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [columnName, setColumnName] = useState(column.name);

  const taskIds = column.tasks.map((t) => t.id);

  async function handleAddTask() {
    const title = newTaskTitle.trim();
    if (!title) return;
    onCreateTask(column.id, title);
    setNewTaskTitle("");
    setAddingTask(false);
  }

  async function handleRename() {
    const name = columnName.trim();
    if (!name || name === column.name) {
      setColumnName(column.name);
      setRenaming(false);
      return;
    }
    onRenameColumn(column.id, name);
    setRenaming(false);
  }

  return (
    <div className="flex flex-col w-72 shrink-0">
      {/* Column header */}
      <div className="flex items-center justify-between mb-2 px-1">
        {renaming ? (
          <Input
            autoFocus
            value={columnName}
            onChange={(e) => setColumnName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
              if (e.key === "Escape") { setColumnName(column.name); setRenaming(false); }
            }}
            className="h-6 text-sm font-medium px-1 py-0"
          />
        ) : (
          <button
            onDoubleClick={() => setRenaming(true)}
            className="text-sm font-medium text-foreground hover:text-foreground/80 flex items-center gap-2"
          >
            {column.name}
            <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-muted text-muted-foreground text-xs font-normal">
              {column.tasks.length}
            </span>
          </button>
        )}

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setAddingTask(true)}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex h-6 w-6 items-center justify-center rounded-md hover:bg-accent transition-colors">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setRenaming(true)}>
                Rename column
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => {
                  if (column.tasks.length > 0) {
                    toast.error("Move or delete tasks before deleting this column.");
                    return;
                  }
                  onDeleteColumn(column.id);
                }}
              >
                Delete column
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Task list */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 min-h-12 rounded-xl p-1.5 space-y-2 transition-colors bg-muted/40",
          isOver && "bg-primary/8 ring-1 ring-primary/25"
        )}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {column.tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </SortableContext>

        {/* Add task inline */}
        {addingTask && (
          <div className="space-y-1">
            <Input
              autoFocus
              placeholder="Task title…"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddTask();
                if (e.key === "Escape") { setAddingTask(false); setNewTaskTitle(""); }
              }}
              className="text-sm h-8"
            />
            <div className="flex gap-1">
              <Button size="sm" className="h-7 text-xs" onClick={handleAddTask} disabled={isCreating}>
                Add
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => { setAddingTask(false); setNewTaskTitle(""); }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {!addingTask && column.tasks.length === 0 && (
          <button
            onClick={() => setAddingTask(true)}
            className="w-full text-xs text-muted-foreground hover:text-foreground py-2 rounded-md hover:bg-accent transition-colors text-center"
          >
            + Add task
          </button>
        )}
      </div>
    </div>
  );
}
