import type { AuditLogRecord } from "../core/contracts/types";

type RateFields = { hourlyRate: number; overtimeMultiplier: number };

/** Fase D (10): auditoría obligatoria de cambios de tarifa (solo tras PIN). */
export function buildRateChangeAudit(
  prev: RateFields,
  next: RateFields,
  nowMs: number,
): AuditLogRecord | null {
  const changes: string[] = [];
  if (prev.hourlyRate !== next.hourlyRate)
    changes.push(`hourlyRate ${prev.hourlyRate} -> ${next.hourlyRate}`);
  if (prev.overtimeMultiplier !== next.overtimeMultiplier)
    changes.push(
      `overtimeMultiplier ${prev.overtimeMultiplier} -> ${next.overtimeMultiplier}`,
    );
  if (changes.length === 0) return null;
  return {
    id: nowMs,
    sessionId: null,
    actionType: "RATE_CHANGED",
    details: `${changes.join("; ")} (PIN verificado)`,
    timestampMs: nowMs,
  };
}
