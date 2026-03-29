"use client";

import { use } from "react";
import { useProjectBoard } from "@/hooks/useTasks";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { TaskDetail } from "@/components/tasks/TaskDetail";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";

export default function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const { board, isLoading, createTask, isCreating } = useProjectBoard(projectId);

  if (isLoading) {
    return (
      <div className="flex gap-4 h-full overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="w-72 shrink-0 space-y-3">
            <Skeleton className="h-6 w-32" />
            {Array.from({ length: 3 }).map((_, j) => (
              <Skeleton key={j} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Project not found.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        <div
          className="h-4 w-4 rounded-full shrink-0"
          style={{ backgroundColor: board.color }}
        />
        <h1 className="text-xl font-semibold">{board.name}</h1>
      </div>

      <div className="h-[calc(100%-3rem)] overflow-hidden">
        <KanbanBoard
          board={board}
          onCreateTask={(data) =>
            createTask({
              title: data.title,
              columnId: data.columnId,
              projectId: data.projectId,
            })
          }
          isCreating={isCreating}
        />
      </div>

      <TaskDetail projectId={projectId} />
    </>
  );
}
