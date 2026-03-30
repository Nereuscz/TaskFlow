"use client";

import { use } from "react";
import Link from "next/link";
import { useProjectBoard } from "@/hooks/useTasks";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { TaskDetail } from "@/components/tasks/TaskDetail";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ChevronRight } from "lucide-react";

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
      <div className="mb-4 space-y-1">
        <nav className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link href="/projects" className="hover:text-foreground transition-colors">
            Projects
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium truncate">{board.name}</span>
        </nav>
        <div className="flex items-center gap-3">
          <div
            className="h-4 w-4 rounded-full shrink-0"
            style={{ backgroundColor: board.color }}
          />
          <h1 className="text-xl font-bold tracking-tight">{board.name}</h1>
        </div>
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
