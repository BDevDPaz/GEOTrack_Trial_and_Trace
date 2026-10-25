import { createInitialState } from "../../state/initialState";
import { SessionRecord } from "../../contracts/types";

export const H = 3600000;
export const at = (y: number, m: number, d: number) =>
  new Date(y, m - 1, d, 7, 0, 0).getTime();

export const buildState = (
  shifts: { startMs: number; hours: number; rate: number | null }[],
  settings = { hourlyRate: 18, overtimeMultiplier: 1.5 },
) => {
  const state = createInitialState();
  state.domain.settings.hourlyRate = settings.hourlyRate;
  state.domain.settings.overtimeMultiplier = settings.overtimeMultiplier;
  shifts.forEach((p, i) => {
    const id = i + 1;
    (state.domain.sessions.byId as any)[id] = {
      id,
      declaredStartAtMs: p.startMs,
      actualStartAtMs: p.startMs,
      endAtMs: p.startMs + p.hours * H,
      lifecycle: {
        domainStatus: "CLOSED",
        isDeleted: false,
        isManualEdit: false,
        locationConfirmed: true,
        totalPausedMs: 0,
        lastPauseStartMs: null,
      },
      destination: {},
      capturedLocation: {},
      lunch: {
        taken: false,
        startAtMs: null,
        endAtMs: null,
        deductedMinutes: null,
      },
      notes: { manualNote: null },
      bookkeeping: { dateString: "" },
      pay: { hourlyRate: p.rate, overtimeMultiplier: 1.5 },
    } as unknown as SessionRecord;
    (state.domain.sessions.order as any).push(id);
  });
  return state;
};

/** Filas SQLite equivalentes para el PDF. */
export const toDbRows = (
  shifts: { startMs: number; hours: number; rate: number | null }[],
) =>
  shifts.map((p, i) => ({
    id: i + 1,
    start_time: p.startMs,
    actual_start_time: p.startMs,
    end_time: p.startMs + p.hours * H,
    lunch_taken: 0,
    hourly_rate: p.rate,
    overtime_multiplier: 1.5,
    status: "CLOSED",
  }));
