import { create } from "zustand";

type PomodoroPhase = "focus" | "short-break" | "long-break";

const PHASE_DURATIONS: Record<PomodoroPhase, number> = {
  "focus": 25 * 60,
  "short-break": 5 * 60,
  "long-break": 15 * 60,
};

interface TimerState {
  phase: PomodoroPhase;
  secondsLeft: number;
  isRunning: boolean;
  activeTaskId: string | null;
  activeEntryId: string | null;
  pomodoroCount: number;
  intervalRef: ReturnType<typeof setInterval> | null;

  start: (taskId?: string, entryId?: string) => void;
  pause: () => void;
  reset: () => void;
  setPhase: (phase: PomodoroPhase) => void;
  tick: () => void;
  setActiveEntry: (entryId: string | null) => void;
}

export const useTimerStore = create<TimerState>((set, get) => ({
  phase: "focus",
  secondsLeft: PHASE_DURATIONS["focus"],
  isRunning: false,
  activeTaskId: null,
  activeEntryId: null,
  pomodoroCount: 0,
  intervalRef: null,

  start: (taskId, entryId) => {
    const { intervalRef, tick } = get();
    if (intervalRef) clearInterval(intervalRef);

    const newInterval = setInterval(tick, 1000);
    set({
      isRunning: true,
      activeTaskId: taskId ?? get().activeTaskId,
      activeEntryId: entryId ?? get().activeEntryId,
      intervalRef: newInterval,
    });
  },

  pause: () => {
    const { intervalRef } = get();
    if (intervalRef) clearInterval(intervalRef);
    set({ isRunning: false, intervalRef: null });
  },

  reset: () => {
    const { intervalRef, phase } = get();
    if (intervalRef) clearInterval(intervalRef);
    set({
      isRunning: false,
      secondsLeft: PHASE_DURATIONS[phase],
      intervalRef: null,
      activeEntryId: null,
    });
  },

  setPhase: (phase) => {
    const { intervalRef } = get();
    if (intervalRef) clearInterval(intervalRef);
    set({
      phase,
      secondsLeft: PHASE_DURATIONS[phase],
      isRunning: false,
      intervalRef: null,
    });
  },

  tick: () => {
    const { secondsLeft, phase, pomodoroCount, intervalRef } = get();
    if (secondsLeft <= 1) {
      if (intervalRef) clearInterval(intervalRef);
      // Auto-advance phase
      const newCount = phase === "focus" ? pomodoroCount + 1 : pomodoroCount;
      const nextPhase: PomodoroPhase =
        phase === "focus"
          ? newCount % 4 === 0 ? "long-break" : "short-break"
          : "focus";

      set({
        isRunning: false,
        intervalRef: null,
        secondsLeft: PHASE_DURATIONS[nextPhase],
        phase: nextPhase,
        pomodoroCount: newCount,
        activeEntryId: null,
      });
    } else {
      set({ secondsLeft: secondsLeft - 1 });
    }
  },

  setActiveEntry: (entryId) => set({ activeEntryId: entryId }),
}));

export const PHASE_DURATIONS_MS: Record<PomodoroPhase, number> = {
  "focus": 25 * 60 * 1000,
  "short-break": 5 * 60 * 1000,
  "long-break": 15 * 60 * 1000,
};
