"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  isPast,
  addMonths,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskDetail } from "@/components/tasks/TaskDetail";
import { cn } from "@/lib/utils";

type CalendarTask = {
  id: string;
  title: string;
  status: string;
  priority: string;
  deadline: string;
  project?: { id: string; name: string; color: string };
};

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: "#ef4444",
  HIGH: "#f97316",
  MEDIUM: "#eab308",
  LOW: "#22c55e",
  NONE: "#94a3b8",
};

export default function CalendarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const { data: tasksData } = useQuery<{ tasks: CalendarTask[] }>({
    queryKey: ["calendar-tasks", format(monthStart, "yyyy-MM"), format(monthEnd, "yyyy-MM-dd")],
    queryFn: () =>
      fetch(
        `/api/tasks?deadlineFrom=${format(calStart, "yyyy-MM-dd")}&deadlineTo=${format(calEnd, "yyyy-MM-dd")}&limit=200`
      ).then((r) => r.json()),
    staleTime: 60_000,
  });

  const tasks = tasksData?.tasks ?? [];

  function getTasksForDay(day: Date) {
    return tasks.filter((t) => t.deadline && isSameDay(new Date(t.deadline), day));
  }

  const openTask = useCallback(
    (task: CalendarTask) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("task", task.id);
      router.push(`/calendar?${params.toString()}`);
    },
    [router, searchParams]
  );

  const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <>
      <div className="flex flex-col h-full min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">{format(currentMonth, "MMMM yyyy")}</h1>
            <p className="text-sm text-muted-foreground">Tasks with deadlines</p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setCurrentMonth((m) => subMonths(m, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 px-3 rounded-lg text-xs" onClick={() => setCurrentMonth(new Date())}>
              Today
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setCurrentMonth((m) => addMonths(m, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Calendar grid */}
        <div className="flex-1 min-h-0 overflow-auto">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1.5">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 border-l border-t border-border/50 rounded-xl overflow-hidden">
            {days.map((day) => {
              const dayTasks = getTasksForDay(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isCurrentDay = isToday(day);

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "border-r border-b border-border/50 min-h-[100px] p-1.5",
                    !isCurrentMonth && "bg-muted/20",
                    isCurrentDay && "bg-primary/5"
                  )}
                >
                  {/* Day number */}
                  <div className={cn(
                    "text-xs font-medium mb-1 h-6 w-6 flex items-center justify-center rounded-full",
                    isCurrentDay
                      ? "bg-primary text-primary-foreground"
                      : isCurrentMonth
                      ? "text-foreground"
                      : "text-muted-foreground/40"
                  )}>
                    {format(day, "d")}
                  </div>

                  {/* Task chips */}
                  <div className="space-y-0.5">
                    {dayTasks.slice(0, 4).map((task) => {
                      const isDone = task.status === "DONE" || task.status === "CANCELLED";
                      const isOverdue = !isDone && isPast(new Date(task.deadline));
                      return (
                        <button
                          key={task.id}
                          onClick={() => openTask(task)}
                          className={cn(
                            "w-full text-left text-[10px] px-1.5 py-0.5 rounded-md truncate font-medium transition-opacity hover:opacity-80",
                            isDone && "opacity-40 line-through"
                          )}
                          style={{
                            backgroundColor: isOverdue
                              ? "#fee2e2"
                              : (task.project?.color ?? PRIORITY_COLORS[task.priority]) + "20",
                            color: isOverdue
                              ? "#dc2626"
                              : task.project?.color ?? PRIORITY_COLORS[task.priority],
                          }}
                          title={task.title}
                        >
                          <span className="flex items-center gap-1">
                            {isOverdue && !isDone && <AlertCircle className="h-2.5 w-2.5 flex-shrink-0" />}
                            <span className="truncate">{task.title}</span>
                          </span>
                        </button>
                      );
                    })}
                    {dayTasks.length > 4 && (
                      <p className="text-[10px] text-muted-foreground pl-1.5">+{dayTasks.length - 4} more</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <TaskDetail />
    </>
  );
}
