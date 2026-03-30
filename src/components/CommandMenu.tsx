"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useProjects } from "@/hooks/useProjects";
import {
  CommandDialog,
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  FolderOpen,
  CheckSquare,
  Timer,
  Settings,
  Sun,
  Plus,
  Search,
  Users,
} from "lucide-react";

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { projects } = useProjects();

  const { data: tasksData } = useQuery({
    queryKey: ["all-tasks-cmd"],
    queryFn: async () => {
      const res = await fetch("/api/tasks?limit=50");
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{
        tasks: { id: string; title: string; project?: { id: string; name: string } }[];
      }>;
    },
    enabled: open,
    staleTime: 30_000,
  });

  const tasks = tasksData?.tasks;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const navigate = useCallback(
    (path: string) => {
      setOpen(false);
      router.push(path);
    },
    [router]
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <Command>
        <CommandInput placeholder="Search tasks, projects, or navigate…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandGroup heading="Navigation">
            <CommandItem onSelect={() => navigate("/dashboard")}>
              <LayoutDashboard className="h-4 w-4 mr-2 text-muted-foreground" />
              Dashboard
              <CommandShortcut>Page</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => navigate("/today")}>
              <Sun className="h-4 w-4 mr-2 text-muted-foreground" />
              Today
              <CommandShortcut>Page</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => navigate("/projects")}>
              <FolderOpen className="h-4 w-4 mr-2 text-muted-foreground" />
              Projects
              <CommandShortcut>Page</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => navigate("/tasks")}>
              <CheckSquare className="h-4 w-4 mr-2 text-muted-foreground" />
              My Tasks
              <CommandShortcut>Page</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => navigate("/timer")}>
              <Timer className="h-4 w-4 mr-2 text-muted-foreground" />
              Timer
              <CommandShortcut>Page</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => navigate("/settings")}>
              <Settings className="h-4 w-4 mr-2 text-muted-foreground" />
              Settings
              <CommandShortcut>Page</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => navigate("/settings/members")}>
              <Users className="h-4 w-4 mr-2 text-muted-foreground" />
              Team members
              <CommandShortcut>Page</CommandShortcut>
            </CommandItem>
          </CommandGroup>

          {projects && projects.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Projects">
                {projects.map((project) => (
                  <CommandItem
                    key={project.id}
                    onSelect={() => navigate(`/projects/${project.id}`)}
                  >
                    <span
                      className="h-3 w-3 rounded-full mr-2 shrink-0"
                      style={{ backgroundColor: project.color }}
                    />
                    {project.name}
                    <CommandShortcut>Project</CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {tasks && tasks.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Tasks">
                {tasks.slice(0, 20).map((task) => (
                  <CommandItem
                    key={task.id}
                    onSelect={() =>
                      navigate(
                        task.project
                          ? `/projects/${task.project.id}?task=${task.id}`
                          : `/tasks?task=${task.id}`
                      )
                    }
                  >
                    <Search className="h-3.5 w-3.5 mr-2 text-muted-foreground shrink-0" />
                    <span className="truncate">{task.title}</span>
                    {task.project && (
                      <span className="ml-auto text-xs text-muted-foreground truncate">
                        {task.project.name}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
