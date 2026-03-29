"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PomodoroTimer } from "@/components/timer/PomodoroTimer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { format, isToday } from "date-fns";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

function formatDuration(ms: number) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function TimerPage() {
  const queryClient = useQueryClient();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const { data: tasks } = useQuery({
    queryKey: ["all-tasks", "all"],
    queryFn: async () => {
      const res = await fetch("/api/tasks");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  // Get today's time entries across all tasks
  const { data: recentEntries, refetch } = useQuery({
    queryKey: ["recent-time-entries"],
    queryFn: async () => {
      if (!tasks) return [];
      const allEntries: {
        id: string;
        startedAt: string;
        endedAt: string | null;
        durationMs: number | null;
        description: string | null;
        task: { id: string; title: string };
        user: { name: string };
      }[] = [];

      // Fetch time entries for a few recent tasks (simplified)
      const res = await fetch("/api/time-entries/recent");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: false, // Disabled - we'll add a proper recent endpoint
  });

  const selectedTask = tasks?.find((t: { id: string; title: string }) => t.id === selectedTaskId);

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

      toast.success("Time logged");
      setManualDuration("");
      setManualDescription("");
      refetch();
    } catch {
      toast.error("Failed to log time");
    } finally {
      setLogLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-semibold">Timer</h1>

      {/* Pomodoro */}
      <div className="border rounded-xl p-6 bg-card space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Pomodoro
        </h2>

        {/* Task selector */}
        <div className="space-y-2">
          <Label>Working on</Label>
          <select
            className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
            value={selectedTaskId ?? ""}
            onChange={(e) => setSelectedTaskId(e.target.value || null)}
          >
            <option value="">Select a task (optional)</option>
            {tasks?.filter((t: { status: string }) => t.status !== "DONE").map((t: { id: string; title: string }) => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
        </div>

        <PomodoroTimer
          activeTaskId={selectedTaskId}
          activeTaskTitle={selectedTask?.title}
        />
      </div>

      <Separator />

      {/* Manual time log */}
      <div className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Log time manually
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Task</Label>
            <select
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
              value={manualTaskId}
              onChange={(e) => setManualTaskId(e.target.value)}
            >
              <option value="">Select task</option>
              {tasks?.map((t: { id: string; title: string }) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={manualDate}
              onChange={(e) => setManualDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Duration (HH:MM)</Label>
            <Input
              placeholder="1:30"
              value={manualDuration}
              onChange={(e) => setManualDuration(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Input
              placeholder="What did you work on?"
              value={manualDescription}
              onChange={(e) => setManualDescription(e.target.value)}
            />
          </div>
        </div>
        <Button
          onClick={handleManualLog}
          disabled={!manualTaskId || !manualDuration || logLoading}
        >
          {logLoading ? "Logging…" : "Log time"}
        </Button>
      </div>
    </div>
  );
}
