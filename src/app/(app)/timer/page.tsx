"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PomodoroTimer } from "@/components/timer/PomodoroTimer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { format } from "date-fns";
import { Clock, PenLine } from "lucide-react";
import { toast } from "sonner";

export default function TimerPage() {
  const queryClient = useQueryClient();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const { data: tasksData } = useQuery<{
    tasks: { id: string; title: string; status: string }[];
  }>({
    queryKey: ["timer-tasks"],
    queryFn: async () => {
      const res = await fetch("/api/tasks?limit=100");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const tasks = tasksData?.tasks ?? [];
  const activeTasks = tasks.filter((t) => t.status !== "DONE" && t.status !== "CANCELLED");

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  const [manualTaskId, setManualTaskId] = useState("");
  const [manualDate, setManualDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [manualDuration, setManualDuration] = useState("");
  const [manualDescription, setManualDescription] = useState("");
  const [logLoading, setLogLoading] = useState(false);

  async function handleManualLog() {
    if (!manualTaskId || !manualDuration) return;

    const [hours, minutes] = manualDuration.split(":").map(Number);
    const durationMs = ((hours || 0) * 60 + (minutes || 0)) * 60 * 1000;
    if (durationMs <= 0) {
      toast.error("Duration must be greater than 0");
      return;
    }

    setLogLoading(true);
    try {
      const startedAt = new Date(manualDate);
      const endedAt = new Date(startedAt.getTime() + durationMs);

      const res = await fetch(`/api/tasks/${manualTaskId}/time-entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: manualTaskId,
          description: manualDescription || undefined,
          startedAt: startedAt.toISOString(),
          endedAt: endedAt.toISOString(),
          durationMs,
          source: "MANUAL",
        }),
      });

      if (!res.ok) throw new Error("Failed");

      toast.success("Time logged successfully");
      setManualDuration("");
      setManualDescription("");
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
    } catch {
      toast.error("Failed to log time");
    } finally {
      setLogLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Timer</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Track your focus sessions</p>
      </div>

      {/* Pomodoro */}
      <div className="border border-border/60 rounded-xl bg-card shadow-xs overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-3 border-b border-border/40 bg-muted/20">
          <div className="h-2 w-2 rounded-full bg-primary" />
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Pomodoro</h2>
        </div>

        <div className="p-6 space-y-6">
          {/* Task selector */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Working on</Label>
            <Select
              value={selectedTaskId ?? ""}
              onValueChange={(v: string | null) => setSelectedTaskId(v || null)}
            >
              <SelectTrigger className="w-full h-9">
                <SelectValue placeholder="Select a task (optional)" />
              </SelectTrigger>
              <SelectContent>
                {activeTasks.length === 0 ? (
                  <div className="py-4 text-center text-sm text-muted-foreground">
                    No active tasks
                  </div>
                ) : (
                  activeTasks.map((t) => (
                    <SelectItem key={t.id} value={t.id} label={t.title}>
                      {t.title}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <PomodoroTimer
            activeTaskId={selectedTaskId}
            activeTaskTitle={selectedTask?.title}
          />
        </div>
      </div>

      {/* Manual time log */}
      <div className="border border-border/60 rounded-xl bg-card shadow-xs overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-3 border-b border-border/40 bg-muted/20">
          <div className="h-2 w-2 rounded-full bg-amber-400" />
          <PenLine className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Log time manually</h2>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Task</Label>
              <Select
                value={manualTaskId}
                onValueChange={(v: string | null) => setManualTaskId(v ?? "")}
              >
                <SelectTrigger className="w-full h-9">
                  <SelectValue placeholder="Select task" />
                </SelectTrigger>
                <SelectContent>
                  {tasks.map((t) => (
                    <SelectItem key={t.id} value={t.id} label={t.title}>
                      {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Date</Label>
              <Input
                type="date"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Duration (HH:MM)</Label>
              <Input
                placeholder="1:30"
                value={manualDuration}
                onChange={(e) => setManualDuration(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Description (optional)</Label>
              <Input
                placeholder="What did you work on?"
                value={manualDescription}
                onChange={(e) => setManualDescription(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
          <Button
            onClick={handleManualLog}
            disabled={!manualTaskId || !manualDuration || logLoading}
            size="sm"
          >
            {logLoading ? "Logging…" : "Log time"}
          </Button>
        </div>
      </div>
    </div>
  );
}
