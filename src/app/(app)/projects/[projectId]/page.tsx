"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useProjectBoard } from "@/hooks/useTasks";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { ListView } from "@/components/project/ListView";
import { TableView } from "@/components/project/TableView";
import { TaskDetail } from "@/components/tasks/TaskDetail";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ChevronRight, KanbanSquare, List, Table } from "lucide-react";
import { cn } from "@/lib/utils";

type ViewMode = "board" | "list" | "table";

const VIEW_OPTIONS: { mode: ViewMode; icon: React.ElementType; label: string }[] = [
  { mode: "board", icon: KanbanSquare, label: "Board" },
  { mode: "list", icon: List, label: "List" },
  { mode: "table", icon: Table, label: "Table" },
];

export default function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const { board, isLoading, createTask, isCreating } = useProjectBoard(projectId);
  const [viewMode, setViewMode] = useState<ViewMode>("board");

  useEffect(() => {
    const saved = localStorage.getItem(`project-view-${projectId}`);
    if (saved === "board" || saved === "list" || saved === "table") {
      setViewMode(saved);
    }
  }, [projectId]);

  function changeView(mode: ViewMode) {
    setViewMode(mode);
    localStorage.setItem(`project-view-${projectId}`, mode);
  }

  function handleCreateTask(data: { columnId: string; title: string; projectId: string }) {
    createTask(data);
  }

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
      {/* ── Header ── */}
      <div className="mb-4 flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1 min-w-0">
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

        {/* View toggle */}
        <div className="flex items-center rounded-lg border border-border/60 p-0.5 bg-muted/30 flex-shrink-0">
          {VIEW_OPTIONS.map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => changeView(mode)}
              title={label}
              className={cn(
                "flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium transition-colors",
                viewMode === mode
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── View content ── */}
      {viewMode === "board" ? (
        <div className="h-[calc(100%-4.5rem)] overflow-hidden">
          <KanbanBoard
            board={board}
            onCreateTask={handleCreateTask}
            isCreating={isCreating}
          />
        </div>
      ) : (
        <div className="overflow-y-auto h-[calc(100%-4.5rem)]">
          {viewMode === "list" && (
            <ListView
              board={board}
              onCreateTask={handleCreateTask}
              isCreating={isCreating}
            />
          )}
          {viewMode === "table" && (
            <TableView
              board={board}
              onCreateTask={handleCreateTask}
              isCreating={isCreating}
            />
          )}
        </div>
      )}

      <TaskDetail projectId={projectId} />
    </>
  );
}
