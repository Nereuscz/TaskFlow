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
  Leaf,
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
        "flex flex-col border-r border-border/50 bg-sidebar transition-all duration-200",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-4 border-b border-border/30">
        {!collapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary shrink-0">
              <Leaf className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm tracking-tight truncate">TaskFlow</span>
          </div>
        )}
        {collapsed && (
          <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary mx-auto">
            <Leaf className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
        )}
        {!collapsed && (
          <Button
            variant="ghost"
            size="icon"
            className="ml-2 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => setCollapsed(true)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
        {collapsed && (
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  onClick={() => setCollapsed(false)}
                  className="flex items-center justify-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors text-muted-foreground hover:bg-accent hover:text-foreground w-full mb-1"
                >
                  <PanelLeftOpen className="h-4 w-4 shrink-0" />
                </button>
              }
            />
            <TooltipContent side="right">Expand sidebar</TooltipContent>
          </Tooltip>
        )}
        {navItems.map(({ href, icon: Icon, label }) => {
          const active =
            pathname === href ||
            (href !== "/dashboard" && href !== "/projects" && pathname.startsWith(href)) ||
            (href === "/projects" && pathname === "/projects");
          const linkEl = (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors",
                active
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
                collapsed && "justify-center"
              )}
            >
              {active && !collapsed && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-primary rounded-r-full" />
              )}
              <Icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
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
          <div className="pt-5">
            <div className="flex items-center justify-between px-2.5 mb-1.5">
              <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">
                Projects
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-muted-foreground/60 hover:text-foreground"
                onClick={() => router.push("/projects")}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <div className="space-y-0.5">
              {projects?.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className={cn(
                    "relative flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors",
                    pathname.startsWith(`/projects/${project.id}`)
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  {pathname.startsWith(`/projects/${project.id}`) && (
                    <span className="absolute left-0 top-1 bottom-1 w-[3px] bg-primary rounded-r-full" />
                  )}
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0 ring-1 ring-black/5"
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
      <div className="px-2 pb-3 border-t border-border/30 pt-3">
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <Link
                  href="/settings"
                  className={cn(
                    "flex items-center justify-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors",
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
              "relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors",
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
