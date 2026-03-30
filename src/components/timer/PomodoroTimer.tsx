"use client";

import { useEffect } from "react";
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
  "focus": { text: "text-primary", stroke: "text-primary", bg: "bg-primary/10" },
  "short-break": { text: "text-emerald-500", stroke: "text-emerald-500", bg: "bg-emerald-500/10" },
  "long-break": { text: "text-blue-500", stroke: "text-blue-500", bg: "bg-blue-500/10" },
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

  const totalSeconds = phase === "focus" ? 25 * 60 : phase === "short-break" ? 5 * 60 : 15 * 60;
  const progress = ((totalSeconds - secondsLeft) / totalSeconds) * 100;
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const colors = PHASE_COLORS[phase];

  // Notify when a phase completes
  const prevSeconds = secondsLeft;
  useEffect(() => {
    if (prevSeconds === 0 && !isRunning) {
      if (phase === "short-break" || phase === "long-break") {
        toast.success("Break finished! Time to focus.", { duration: 4000 });
      } else {
        toast.success(`Focus session done! 🍅 Take a break.`, { duration: 4000 });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  async function handleStart() {
    if (phase !== "focus" || !activeTaskId) {
      start();
      return;
    }

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

    if (activeEntryId) {
      try {
        await fetch(`/api/time-entries/${activeEntryId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endedAt: new Date().toISOString() }),
        });
      } catch {
        toast.error("Failed to save time entry");
      }
    }
  }

  // Dots representing pomodoros in current cycle (4 = long break)
  const cyclePosition = pomodoroCount % 4;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Phase switcher */}
      <div className="flex items-center gap-1 rounded-lg border border-border/60 p-1 bg-muted/30">
        {(["focus", "short-break", "long-break"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPhase(p)}
            disabled={isRunning}
            className={cn(
              "px-3 py-1.5 rounded-md text-sm transition-all",
              phase === p
                ? "bg-background shadow-sm font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground disabled:cursor-not-allowed"
            )}
          >
            {PHASE_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Circular timer */}
      <div className="relative flex items-center justify-center">
        {/* Outer glow when running */}
        {isRunning && (
          <div className={cn(
            "absolute inset-0 rounded-full blur-xl opacity-20 animate-pulse",
            colors.bg
          )} style={{ transform: "scale(1.1)" }} />
        )}

        <svg width="152" height="152" className="-rotate-90">
          {/* Track */}
          <circle
            cx="76"
            cy="76"
            r={radius}
            fill="none"
            strokeWidth="5"
            className="text-border/60"
            stroke="currentColor"
          />
          {/* Progress */}
          <circle
            cx="76"
            cy="76"
            r={radius}
            fill="none"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={cn("transition-all duration-1000", colors.stroke)}
            stroke="currentColor"
          />
        </svg>

        <div className="absolute flex flex-col items-center select-none">
          <span className={cn(
            "text-[2.75rem] font-mono font-bold tabular-nums leading-none tracking-tighter",
            colors.text
          )}>
            {minutes}:{seconds}
          </span>
          <span className="text-[11px] text-muted-foreground mt-1.5 font-medium uppercase tracking-wider">
            {PHASE_LABELS[phase]}
          </span>
        </div>
      </div>

      {/* Active task name */}
      {activeTaskTitle ? (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50 max-w-xs">
          <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", isRunning ? "animate-pulse" : "", colors.bg.replace("bg-", "bg-"))} />
          <p className="text-sm text-muted-foreground truncate">{activeTaskTitle}</p>
        </div>
      ) : (
        <div className="h-7" />
      )}

      {/* Controls */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={reset}
          disabled={isRunning}
          className="h-9 w-9 rounded-full"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>

        {isRunning ? (
          <Button
            size="lg"
            variant="outline"
            onClick={handlePause}
            className="w-32 rounded-full border-2"
          >
            <Pause className="h-4 w-4 mr-2" />
            Pause
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={handleStart}
            className={cn("w-32 rounded-full", colors.text === "text-primary" ? "" : phase === "short-break" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-blue-500 hover:bg-blue-600")}
          >
            <Play className="h-4 w-4 mr-2" />
            Start
          </Button>
        )}
      </div>

      {/* Pomodoro cycle dots */}
      <div className="flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn(
                "h-2 w-2 rounded-full transition-all",
                i < cyclePosition
                  ? "bg-primary"
                  : "bg-border"
              )}
            />
          ))}
        </div>
        {pomodoroCount > 0 && (
          <p className="text-[11px] text-muted-foreground">
            {pomodoroCount} session{pomodoroCount !== 1 ? "s" : ""} today
          </p>
        )}
      </div>
    </div>
  );
}
