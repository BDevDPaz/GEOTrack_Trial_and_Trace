/**
 * Fase B (6): clasificación de integridad compartida entre el PDF y la
 * insignia de la app. Idea portada de leonsTrack_/WorkTrack1_0_APK
 * (ReportGenerator: filas coloreadas por estado de integridad).
 */
import { INTEGRITY_COLORS } from "../constants/theme";

export type IntegrityClass =
  | "INTACT"
  | "EDITED"
  | "DELETED"
  | "AUTO_CLOSED"
  | "TRANSIT"
  | "CANCELLED";

export interface IntegrityInput {
  isDeleted?: boolean | number | null;
  isManualEdit?: boolean | number | null;
  closeReason?: string | null;
  status?: string | null;
  parentSessionId?: number | null;
}

/** Precedencia: CANCELLED > DELETED > EDITED > AUTO_CLOSED > TRANSIT > INTACT. */
export function classifyIntegrity(input: IntegrityInput): IntegrityClass {
  if (input.closeReason === "CANCELLED") return "CANCELLED";
  if (input.isDeleted) return "DELETED";
  if (input.isManualEdit) return "EDITED";
  if (input.closeReason === "STALE_12H" || input.closeReason === "FAILSAFE_15M")
    return "AUTO_CLOSED";
  if (input.status === "TRAVEL" || input.parentSessionId != null) return "TRANSIT";
  return "INTACT";
}

export function integrityColor(c: IntegrityClass): string {
  switch (c) {
    case "INTACT":
      return INTEGRITY_COLORS.green;
    case "DELETED":
    case "CANCELLED":
      return INTEGRITY_COLORS.red;
    default:
      return INTEGRITY_COLORS.yellow;
  }
}

/** Sesiones que no suman a horas ni pago. */
export const isExcludedFromPayroll = (c: IntegrityClass) =>
  c === "DELETED" || c === "CANCELLED";

/** Mapeo a la insignia existente (BadgeType) sin cambiar su API. */
export function integrityToBadgeType(
  c: IntegrityClass,
): "valid" | "manual" | "auto" | "warning" | "error" {
  switch (c) {
    case "INTACT":
      return "valid";
    case "EDITED":
      return "manual";
    case "TRANSIT":
      return "auto";
    case "AUTO_CLOSED":
      return "warning";
    default:
      return "error";
  }
}
