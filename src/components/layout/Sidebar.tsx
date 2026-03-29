"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  FolderOpen,
  CheckSquare,
  Timer,
  Settings,
  ChevronLeft,
  Plus,
  PanelLeftOpen,
  Sun,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useProjects } from "@/hooks/useProjects";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/today", icon: Sun, label: "Today" },
  { href: "/projects", icon: FolderOpen, label: "Projects" },
  { href: "/tasks", icon: CheckSquare, label: "My Tasks" },
  { href: "/timer", icon: Timer, label: "Timer" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const { projects } = useProjects();

  return (
    <aside
      className={cn(
        "flex flex-col border-r bg-card transition-all duration-200",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-4 border-b">
        {!collapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center justify-center h-6 w-6 rounded-md bg-primary shrink-0">
              <CheckSquare className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm truncate">TaskFlow</span>
          </div>
        )}
        {collapsed && (
          <div className="flex items-center justify-center h-6 w-6 rounded-md bg-primary mx-auto">
            <CheckSquare className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
        )}
        {!collapsed && (
          <Button
            variant="ghost"
            size="icon"
            className="ml-2 shrink-0"
            onClick={() => setCollapsed(true)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-1 px-2">
        {collapsed && (
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  onClick={() => setCollapsed(false)}
                  className="flex items-center justify-center gap-3 rounded-md px-2 py-2 text-sm transition-colors text-muted-foreground hover:bg-accent hover:text-foreground w-full"
                >
                  <PanelLeftOpen className="h-4 w-4 shrink-0" />
                </button>
              }
            />
            <TooltipContent side="right">Expand sidebar</TooltipContent>
          </Tooltip>
        )}
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          const linkEl = (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors",
                active
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
                collapsed && "justify-center"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={href}>
                <TooltipTrigger render={linkEl} />
                <TooltipContent side="right">{label}</TooltipContent>
              </Tooltip>
            );
          }
          return linkEl;
        })}

        {/* Projects section */}
        {!collapsed && (
          <div className="pt-4">
            <div className="flex items-center justify-between px-2 mb-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Projects
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => router.push("/projects")}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <div className="space-y-1">
              {projects?.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                    pathname.startsWith(`/projects/${project.id}`)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0 ring-1 ring-border"
                    style={{ backgroundColor: project.color }}
                  />
                  <span className="truncate">{project.name}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Settings */}
      <div className="px-2 pb-3 border-t pt-3">
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <Link
                  href="/settings"
                  className={cn(
                    "flex items-center justify-center gap-3 rounded-md px-2 py-2 text-sm transition-colors",
                    pathname.startsWith("/settings")
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Settings className="h-4 w-4 shrink-0" />
                </Link>
              }
            />
            <TooltipContent side="right">Settings</TooltipContent>
          </Tooltip>
        ) : (
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors",
              pathname.startsWith("/settings")
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Settings className="h-4 w-4 shrink-0" />
            <span>Settings</span>
          </Link>
        )}
      </div>
    </aside>
  );
}
