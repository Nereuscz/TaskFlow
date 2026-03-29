"use client";

import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ProjectBoard, TaskWithRelations } from "@/hooks/useTasks";
import { KanbanColumn } from "./KanbanColumn";
import { TaskCardOverlay } from "./TaskCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface KanbanBoardProps {
  board: ProjectBoard;
  onCreateTask: (data: { columnId: string; title: string; projectId: string }) => void;
  isCreating?: boolean;
}

export function KanbanBoard({ board, onCreateTask, isCreating }: KanbanBoardProps) {
  const queryClient = useQueryClient();
  const [activeTask, setActiveTask] = useState<TaskWithRelations | null>(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const columnIds = board.columns.map((c) => c.id);

  function findTask(id: string) {
    for (const col of board.columns) {
      const task = col.tasks.find((t) => t.id === id);
      if (task) return { task, column: col };
    }
    return null;
  }

  function onDragStart({ active }: DragStartEvent) {
    const result = findTask(active.id as string);
    if (result) setActiveTask(result.task);
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;

    const activeResult = findTask(activeId);
    if (!activeResult) return;

    // Find target column (either the column itself or a task within it)
    const targetColumn =
      board.columns.find((c) => c.id === overId) ??
      board.columns.find((c) => c.tasks.some((t) => t.id === overId));

    if (!targetColumn || targetColumn.id === activeResult.column.id) return;

    // Optimistic: move task to target column
    queryClient.setQueryData(["project", board.id], (old: ProjectBoard | undefined) => {
      if (!old) return old;
      return {
        ...old,
        columns: old.columns.map((col) => {
          if (col.id === activeResult.column.id) {
            return { ...col, tasks: col.tasks.filter((t) => t.id !== activeId) };
          }
          if (col.id === targetColumn.id) {
            const overTaskIndex = col.tasks.findIndex((t) => t.id === overId);
            const newTasks = [...col.tasks];
            const movedTask = { ...activeResult.task, columnId: targetColumn.id };
            if (overTaskIndex >= 0) {
              newTasks.splice(overTaskIndex, 0, movedTask);
            } else {
              newTasks.push(movedTask);
            }
            return { ...col, tasks: newTasks };
          }
          return col;
        }),
      };
    });
  }

  const onDragEnd = useCallback(
    async ({ active, over }: DragEndEvent) => {
      setActiveTask(null);
      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      const activeResult = findTask(activeId);
      if (!activeResult) return;

      // Find target column
      const targetColumn =
        board.columns.find((c) => c.id === overId) ??
        board.columns.find((c) => c.tasks.some((t) => t.id === overId));

      if (!targetColumn) return;

      // Compute new order
      const overTaskIndex = targetColumn.tasks.findIndex((t) => t.id === overId);
      let newOrder: number;

      if (overTaskIndex < 0 || overId === targetColumn.id) {
        // Dropped into empty column or on column header
        const lastTask = targetColumn.tasks[targetColumn.tasks.length - 1];
        newOrder = (lastTask?.order ?? 0) + 1000;
      } else {
        const prev = targetColumn.tasks[overTaskIndex - 1];
        const curr = targetColumn.tasks[overTaskIndex];
        newOrder = Math.round(((prev?.order ?? 0) + (curr?.order ?? 0)) / 2) || curr.order - 500;
      }

      try {
        await fetch(`/api/tasks/${activeId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            columnId: targetColumn.id,
            order: newOrder,
          }),
        });
        queryClient.invalidateQueries({ queryKey: ["project", board.id] });
      } catch {
        toast.error("Failed to move task");
        queryClient.invalidateQueries({ queryKey: ["project", board.id] });
      }
    },
    [board, queryClient]
  );

  async function handleRenameColumn(columnId: string, name: string) {
    await fetch(`/api/columns/${columnId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    queryClient.invalidateQueries({ queryKey: ["project", board.id] });
  }

  async function handleDeleteColumn(columnId: string) {
    const res = await fetch(`/api/columns/${columnId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error ?? "Failed to delete column");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["project", board.id] });
    toast.success("Column deleted");
  }

  async function handleAddColumn() {
    const name = newColumnName.trim();
    if (!name) return;

    const maxOrder = Math.max(...board.columns.map((c) => c.order), 0);
    const res = await fetch(`/api/projects/${board.id}/columns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, order: maxOrder + 1000 }),
    });

    if (!res.ok) {
      toast.error("Failed to add column");
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["project", board.id] });
    setNewColumnName("");
    setAddingColumn(false);
    toast.success("Column added");
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 h-full items-start">
        <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
          {board.columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              projectId={board.id}
              onCreateTask={(columnId, title) =>
                onCreateTask({ columnId, title, projectId: board.id })
              }
              onRenameColumn={handleRenameColumn}
              onDeleteColumn={handleDeleteColumn}
              isCreating={isCreating}
            />
          ))}
        </SortableContext>

        {/* Add column */}
        <div className="w-72 shrink-0">
          {addingColumn ? (
            <div className="space-y-2">
              <Input
                autoFocus
                placeholder="Column name…"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddColumn();
                  if (e.key === "Escape") { setAddingColumn(false); setNewColumnName(""); }
                }}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddColumn}>Add column</Button>
                <Button size="sm" variant="ghost" onClick={() => { setAddingColumn(false); setNewColumnName(""); }}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full border-dashed"
              onClick={() => setAddingColumn(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add column
            </Button>
          )}
        </div>
      </div>

      <DragOverlay>
        {activeTask && <TaskCardOverlay task={activeTask} />}
      </DragOverlay>
    </DndContext>
  );
}
