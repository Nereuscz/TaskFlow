"use client";

import { useTimerStore } from "@/stores/timerStore";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const PHASE_LABELS = {
  "focus": "Focus",
  "short-break": "Short break",
  "long-break": "Long break",
};

const PHASE_COLORS = {
  "focus": "text-primary",
  "short-break": "text-green-500",
  "long-break": "text-blue-500",
};

interface PomodoroTimerProps {
  activeTaskId?: string | null;
  activeTaskTitle?: string | null;
}

export function PomodoroTimer({ activeTaskId, activeTaskTitle }: PomodoroTimerProps) {
  const {
    phase,
    secondsLeft,
    isRunning,
    pomodoroCount,
    activeEntryId,
    start,
    pause,
    reset,
    setPhase,
  } = useTimerStore();

  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const seconds = String(secondsLeft % 60).padStart(2, "0");

  // Total seconds for current phase
  const totalSeconds = phase === "focus" ? 25 * 60 : phase === "short-break" ? 5 * 60 : 15 * 60;
  const progress = ((totalSeconds - secondsLeft) / totalSeconds) * 100;

  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  async function handleStart() {
    if (phase !== "focus" || !activeTaskId) {
      start();
      return;
    }

    // Create time entry in DB
    try {
      const res = await fetch(`/api/tasks/${activeTaskId}/time-entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: activeTaskId,
          startedAt: new Date().toISOString(),
          source: "POMODORO",
        }),
      });

      if (res.ok) {
        const entry = await res.json();
        start(activeTaskId, entry.id);
      } else {
        start(activeTaskId);
      }
    } catch {
      start(activeTaskId);
    }
  }

  async function handlePause() {
    pause();

    // Close open time entry
    if (activeEntryId) {
      try {
        const endedAt = new Date().toISOString();
        await fetch(`/api/time-entries/${activeEntryId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endedAt }),
        });
      } catch {
        toast.error("Failed to save time entry");
      }
    }
  }

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Phase switcher */}
      <div className="flex items-center gap-1 rounded-lg border p-1 bg-muted/50">
        {(["focus", "short-break", "long-break"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPhase(p)}
            disabled={isRunning}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm transition-colors",
              phase === p
                ? "bg-background shadow-sm font-medium"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {PHASE_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Circular timer */}
      <div className="relative flex items-center justify-center">
        <svg width="140" height="140" className="-rotate-90">
          <circle
            cx="70"
            cy="70"
            r="54"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-muted/30"
          />
          <circle
            cx="70"
            cy="70"
            r="54"
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={cn("transition-all duration-1000", PHASE_COLORS[phase])}
            style={{ stroke: "currentColor" }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className={cn("text-4xl font-mono font-bold tabular-nums", PHASE_COLORS[phase])}>
            {minutes}:{seconds}
          </span>
          <span className="text-xs text-muted-foreground mt-1">{PHASE_LABELS[phase]}</span>
        </div>
      </div>

      {/* Task name */}
      {activeTaskTitle && (
        <p className="text-sm text-muted-foreground text-center max-w-xs truncate">
          {activeTaskTitle}
        </p>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={reset} disabled={isRunning}>
          <RotateCcw className="h-4 w-4" />
        </Button>
        {isRunning ? (
          <Button size="lg" onClick={handlePause} className="w-28">
            <Pause className="h-4 w-4 mr-2" />
            Pause
          </Button>
        ) : (
          <Button size="lg" onClick={handleStart} className="w-28">
            <Play className="h-4 w-4 mr-2" />
            Start
          </Button>
        )}
      </div>

      {/* Pomodoro count */}
      {pomodoroCount > 0 && (
        <p className="text-xs text-muted-foreground">
          🍅 {pomodoroCount} pomodoro{pomodoroCount !== 1 ? "s" : ""} completed today
        </p>
      )}
    </div>
  );
}
