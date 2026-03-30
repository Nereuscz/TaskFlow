"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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

  const { data: tasksData } = useQuery<{
    tasks: { id: string; title: string; status: string }[];
  }>({
    queryKey: ["all-tasks", "all"],
    queryFn: async () => {
      const res = await fetch("/api/tasks?limit=100");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const tasks = tasksData?.tasks;

  const { data: recentEntries, refetch } = useQuery({
    queryKey: ["recent-time-entries"],
    queryFn: async () => {
      if (!tasks) return [];
      const res = await fetch("/api/time-entries/recent");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: false,
  });

  const selectedTask = tasks?.find(
    (t: { id: string; title: string }) => t.id === selectedTaskId
  );

  const [manualTaskId, setManualTaskId] = useState("");
  const [manualDate, setManualDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  );
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
      <h1 className="text-2xl font-bold tracking-tight">Timer</h1>

      {/* Pomodoro */}
      <div className="border border-border/60 rounded-xl bg-card shadow-sm overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-3 border-b border-border/40">
          <div className="h-2 w-2 rounded-full bg-primary" />
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Pomodoro</h2>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-2">
            <Label>Working on</Label>
            <Select
              value={selectedTaskId ?? ""}
              onValueChange={(v: string | null) =>
                setSelectedTaskId(v || null)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a task (optional)" />
              </SelectTrigger>
              <SelectContent>
                {tasks
                  ?.filter(
                    (t: { status: string }) => t.status !== "DONE"
                  )
                  .map((t: { id: string; title: string }) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title}
                    </SelectItem>
                  ))}
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
      <div className="border border-border/60 rounded-xl bg-card shadow-sm overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-3 border-b border-border/40">
          <div className="h-2 w-2 rounded-full bg-amber-400" />
          <PenLine className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Log time manually</h2>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Task</Label>
              <Select
                value={manualTaskId}
                onValueChange={(v: string | null) =>
                  setManualTaskId(v ?? "")
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select task" />
                </SelectTrigger>
                <SelectContent>
                  {tasks?.map((t: { id: string; title: string }) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            {logLoading ? "Logging..." : "Log time"}
          </Button>
        </div>
      </div>
    </div>
  );
}
