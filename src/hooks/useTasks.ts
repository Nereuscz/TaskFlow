import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Task, KanbanColumn, Tag, User } from "@prisma/client";
import { toast } from "sonner";

export type TaskWithRelations = Task & {
  assignee: Pick<User, "id" | "name" | "image"> | null;
  tags: { tag: Pick<Tag, "id" | "name" | "color"> }[];
  _count: { subtasks: number; checklist: number; timeEntries: number };
};

export type ProjectBoard = {
  id: string;
  name: string;
  color: string;
  columns: (KanbanColumn & { tasks: TaskWithRelations[] })[];
};

async function fetchProjectBoard(projectId: string): Promise<ProjectBoard> {
  const res = await fetch(`/api/projects/${projectId}`);
  if (!res.ok) throw new Error("Failed to fetch project");
  return res.json();
}

async function fetchTask(taskId: string) {
  const res = await fetch(`/api/tasks/${taskId}`);
  if (!res.ok) throw new Error("Failed to fetch task");
  return res.json();
}

async function createTask(data: {
  title: string;
  columnId: string;
  projectId: string;
  priority?: string;
  deadline?: string | null;
  assigneeId?: string | null;
  description?: string;
}) {
  const res = await fetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create task");
  return res.json();
}

async function updateTask(id: string, data: Record<string, unknown>) {
  const res = await fetch(`/api/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update task");
  return res.json();
}

async function deleteTask(id: string) {
  const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete task");
}

export function useProjectBoard(projectId: string) {
  const queryClient = useQueryClient();

  const { data: board, isLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => fetchProjectBoard(projectId),
    enabled: !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
    onError: () => toast.error("Failed to create task"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updateTask(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["project", projectId] });
      const previous = queryClient.getQueryData(["project", projectId]);
      queryClient.setQueryData(["project", projectId], (old: ProjectBoard | undefined) => {
        if (!old) return old;
        return {
          ...old,
          columns: old.columns.map((col) => ({
            ...col,
            tasks: col.tasks.map((task) =>
              task.id === id ? { ...task, ...data } : task
            ),
          })),
        };
      });
      return { previous };
    },
    onError: (_, __, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(["project", projectId], ctx.previous);
      }
      toast.error("Failed to update task");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      toast.success("Task deleted");
    },
    onError: () => toast.error("Failed to delete task"),
  });

  return {
    board,
    isLoading,
    createTask: createMutation.mutate,
    updateTask: updateMutation.mutate,
    deleteTask: deleteMutation.mutate,
    isCreating: createMutation.isPending,
  };
}

export function useTask(taskId: string | null) {
  return useQuery({
    queryKey: ["task", taskId],
    queryFn: () => fetchTask(taskId!),
    enabled: !!taskId,
  });
}
