import type {
  AppSettingsRecord,
  SessionRecord,
  WorkTrackerCanonicalState,
} from "../contracts/types";
import { lunchAlreadyTakenOnDay } from "../transit/chainTransit";

/**
 * Fase D (11): recordatorio de almuerzo.
 * Idea de LED 270126 (aviso a la hora de almuerzo durante la jornada),
 * adaptada: notificación única (no diaria) programada al entrar a ACTIVE_WORK,
 * cancelada al registrar almuerzo, pausar o cerrar. Desactivado por defecto.
 */
export const LUNCH_REMINDER_ID = "geotrack_lunch_reminder";
export const DEFAULT_LUNCH_REMINDER_TIME = "12:00";

export type LunchReminderAction =
  | { type: "schedule"; atMs: number; sessionId: number }
  | { type: "cancel" }
  | null;

export function lunchReminderTriggerMs(
  settings: Pick<AppSettingsRecord, "lunchReminderEnabled" | "lunchReminderTime">,
  nowMs: number,
): number | null {
  if (!settings.lunchReminderEnabled) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(
    settings.lunchReminderTime ?? DEFAULT_LUNCH_REMINDER_TIME,
  );
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  const d = new Date(nowMs);
  d.setHours(h, min, 0, 0);
  const at = d.getTime();
  return at > nowMs ? at : null;
}

function activeWorking(state: WorkTrackerCanonicalState): SessionRecord | null {
  const id = state.domain.sessions.activeSessionId;
  if (!id) return null;
  const s = (state.domain.sessions.byId as any)[id] as SessionRecord | undefined;
  if (!s || s.lifecycle.isDeleted) return null;
  return s.lifecycle.domainStatus === "ACTIVE_WORK" ? s : null;
}

function lunchDone(state: WorkTrackerCanonicalState, s: SessionRecord): boolean {
  if (s.lunch.taken) return true;
  const all = Object.values(state.domain.sessions.byId as any) as SessionRecord[];
  return lunchAlreadyTakenOnDay(all, s.bookkeeping.dateString, s.id);
}

export function decideLunchReminder(
  prev: WorkTrackerCanonicalState,
  next: WorkTrackerCanonicalState,
  nowMs: number,
): LunchReminderAction {
  const before = activeWorking(prev);
  const after = activeWorking(next);
  const settingsChanged =
    prev.domain.settings.lunchReminderEnabled !==
      next.domain.settings.lunchReminderEnabled ||
    prev.domain.settings.lunchReminderTime !==
      next.domain.settings.lunchReminderTime;

  if (!after) return before ? { type: "cancel" } : null;

  const enteredWork = !before || before.id !== after.id;
  const lunchJustTaken = before && !lunchDone(prev, before) && lunchDone(next, after);
  if (lunchJustTaken) return { type: "cancel" };
  if (!enteredWork && !settingsChanged) return null;

  const at = lunchDone(next, after)
    ? null
    : lunchReminderTriggerMs(next.domain.settings, nowMs);
  if (at === null) return settingsChanged || before ? { type: "cancel" } : null;
  return { type: "schedule", atMs: at, sessionId: after.id };
}
