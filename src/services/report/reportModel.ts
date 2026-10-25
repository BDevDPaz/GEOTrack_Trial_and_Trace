/**
 * Fase B (6) + D (9, 12): modelo y HTML del PDF, puros y testeables.
 * - Eliminadas/canceladas: fila roja, $0, no suman (antes sí sumaban).
 * - Cada jornada muestra sus propias entradas de auditoría.
 * - Textos vía i18n (idioma del PDF = idioma de la app).
 * - Dirección legible del punto de configuración (setup_address).
 * - Tramos encadenados (parent_session_id): el tránsito se paga desde
 *   start_time y se muestra como línea separada.
 */
import escapeHtml from "escape-html";
import dayjs from "../../utils/dayjsSetup";
import { formatDate, formatTime } from "../../utils/dateUtils";
import { calculateSessionDuration } from "../../utils/payrollUtils";
import { computeRangePayroll, workweekStartMs } from "../../core/payroll/weeklyPayroll";
import {
  classifyIntegrity,
  integrityColor,
  isExcludedFromPayroll,
  IntegrityClass,
} from "../../utils/integrity";
import { t, TKey } from "../../utils/i18n";

export type DbSession = any;
export type DbAudit = { session_id: number | null; action_type: string; details: string; timestamp: number };

export interface ReportRow {
  id: number;
  date: string;
  client: string;
  address: string;
  setupAddress: string;
  notes: string;
  start: string;
  end: string;
  lunchMinutes: number;
  hours: number;
  pay: number;
  integrity: IntegrityClass;
  color: string;
  isGeofenceIn: boolean;
  isGeofenceOut: boolean;
  transit: { from: string; to: string } | null;
  audit: DbAudit[];
}

export interface ReportModel {
  rows: ReportRow[];
  totals: { hours: number; overtime: number; pay: number };
  globalLogs: DbAudit[];
}

export const reportContextStartMs = (startTs: number) =>
  workweekStartMs(startTs) - 24 * 60 * 60 * 1000;

const effectiveStart = (s: DbSession) =>
  s.parent_session_id != null ? s.start_time : s.actual_start_time || s.start_time;

export function buildReportModel(
  contextSessions: DbSession[],
  logs: DbAudit[],
  settings: { hourly_rate: number; overtime_multiplier: number },
  range: { startMs: number; endMs: number },
  nowMs: number = dayjs().valueOf(),
): ReportModel {
  const classify = (s: DbSession) =>
    classifyIntegrity({
      isDeleted: s.is_deleted,
      isManualEdit: s.is_manual_edit,
      closeReason: s.close_reason,
      status: s.status,
      parentSessionId: s.parent_session_id,
    });
  const hoursOf = (s: DbSession) =>
    calculateSessionDuration(
      effectiveStart(s),
      s.end_time || nowMs,
      s.lunch_taken || 0,
      s.lunch_start,
      s.lunch_end,
    ) / 3_600_000;

  const payable = contextSessions.filter((s) => !isExcludedFromPayroll(classify(s)));
  const payroll = computeRangePayroll(
    payable.map((s) => ({
      id: s.id,
      startMs: effectiveStart(s),
      hours: hoursOf(s),
      hourlyRate: s.hourly_rate,
      overtimeMultiplier: s.overtime_multiplier,
    })),
    { hourlyRate: settings.hourly_rate, overtimeMultiplier: settings.overtime_multiplier },
    range,
  );

  const inRange = contextSessions.filter((s) => {
    const st = effectiveStart(s);
    return st >= range.startMs && st <= range.endMs;
  });

  const totals = { hours: 0, overtime: 0, pay: 0 };
  const rows: ReportRow[] = inRange.map((s) => {
    const integrity = classify(s);
    const excluded = isExcludedFromPayroll(integrity);
    const alloc = payroll.byId.get(s.id);
    const hours = excluded ? 0 : hoursOf(s);
    const pay = excluded ? 0 : (alloc?.totalPay ?? 0);
    if (!excluded) {
      totals.hours += hours;
      totals.overtime += alloc?.overtimeHours ?? 0;
      totals.pay += pay;
    }
    const audit = logs.filter((l) => l.session_id === s.id);
    const start = effectiveStart(s);
    const lunchMinutes =
      s.lunch_taken && s.lunch_start && s.lunch_end
        ? Math.max(0, Math.round((s.lunch_end - s.lunch_start) / 60000))
        : s.lunch_taken
          ? 60
          : 0;
    return {
      id: s.id,
      date: formatDate(start),
      client: escapeHtml(s.client_name || "General"),
      address: escapeHtml(s.address || ""),
      setupAddress: escapeHtml(s.setup_address || ""),
      notes: escapeHtml(s.manual_note || ""),
      start: formatTime(start),
      end: s.end_time ? formatTime(s.end_time) : "",
      lunchMinutes,
      hours,
      pay,
      integrity,
      color: integrityColor(integrity),
      isGeofenceIn: Boolean(s.actual_start_time),
      isGeofenceOut: audit.some((l) => l.action_type.includes("AUTO_CHECKOUT")),
      transit:
        s.parent_session_id != null
          ? { from: formatTime(s.start_time), to: s.actual_start_time ? formatTime(s.actual_start_time) : "" }
          : null,
      audit,
    };
  });

  return { rows, totals, globalLogs: logs.filter((l) => l.session_id == null) };
}

const money = (n: number) => `$${n.toFixed(2)}`;

export function renderSessionRow(row: ReportRow, lang: string): string {
  const tr = (k: TKey, v?: Record<string, string | number>) => t(lang, k, v);
  const auditHtml = row.audit
    .map(
      (l) =>
        `<div class="row-audit"><strong>${formatTime(l.timestamp)}</strong> [${escapeHtml(l.action_type)}] ${escapeHtml(l.details)}</div>`,
    )
    .join("");
  return `
    <tr class="integrity-${row.integrity}" style="background-color:${row.color};">
      <td>
        <strong>${row.date}</strong>
        <span class="integrity-label">${tr(`integrity_${row.integrity}` as TKey)}</span>
        ${row.lunchMinutes > 0 ? `<br><span class="lunch-badge">${tr("pdf_lunch", { min: row.lunchMinutes })}</span>` : ""}
      </td>
      <td>
        ${row.client !== "General" ? `<span class="client-badge">${row.client}</span><br>` : ""}
        ${row.address}
        ${row.setupAddress ? `<span class="notes">${tr("pdf_setup_address", { address: row.setupAddress })}</span>` : ""}
        ${row.notes ? `<span class="notes">"${row.notes}"</span>` : ""}
        ${auditHtml}
      </td>
      <td>
        ${row.start} - ${row.end || tr("pdf_in_progress")}
        ${row.transit ? `<span class="geo-badge-out">${tr("pdf_transit_leg", { from: row.transit.from, to: row.transit.to || tr("pdf_in_progress") })}</span>` : ""}
        ${row.isGeofenceIn ? `<span class="geo-badge-in">${tr("pdf_auto_in")}</span>` : ""}
        ${row.isGeofenceOut ? `<span class="geo-badge-out">${tr("pdf_auto_out")}</span>` : ""}
      </td>
      <td><strong>${row.hours.toFixed(2)}</strong></td>
      <td>${money(row.pay)}</td>
    </tr>`;
}

export function renderReportHtml(
  model: ReportModel,
  ctx: {
    lang: string;
    employeeName: string;
    employerName: string;
    settingsId: number;
    rangeTitle: string;
    generatedAt: string;
  },
): string {
  const tr = (k: TKey, v?: Record<string, string | number>) => t(ctx.lang, k, v);
  return `
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
    <style>
      body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #333; }
      .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #D4AF37; padding-bottom: 15px; }
      .title { font-size: 26px; font-weight: 800; color: #000; letter-spacing: 2px; text-transform: uppercase; }
      .subtitle { font-size: 11px; color: #D4AF37; text-transform: uppercase; margin-top: 5px; letter-spacing: 1px; }
      .info-grid { display: flex; justify-content: space-between; margin-bottom: 30px; background: #f8f8f8; padding: 15px; border-radius: 8px; }
      .info-col { width: 48%; }
      .info-label { font-size: 9px; color: #999; text-transform: uppercase; font-weight: bold; margin-bottom: 2px; }
      .info-value { font-size: 13px; color: #000; font-weight: 600; margin-bottom: 10px; }
      .stats-box { display: flex; justify-content: space-between; margin-bottom: 30px; border: 1px solid #eee; border-radius: 8px; overflow: hidden; }
      .stat-item { flex: 1; text-align: center; padding: 15px; border-right: 1px solid #eee; }
      .stat-item:last-child { border-right: none; background: #fffcf2; }
      .stat-num { font-size: 22px; font-weight: bold; color: #000; }
      .stat-desc { font-size: 9px; color: #666; text-transform: uppercase; margin-top: 5px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
      th { text-align: left; border-bottom: 2px solid #000; padding: 10px; text-transform: uppercase; font-size: 9px; color: #666; }
      td { border-bottom: 1px solid #eee; padding: 12px 10px; vertical-align: top; }
      .client-badge { background: #000; color: #fff; padding: 3px 6px; border-radius: 4px; font-size: 9px; font-weight: bold; text-transform: uppercase; display: inline-block; margin-bottom: 4px; }
      .integrity-label { display: block; font-size: 9px; font-weight: bold; text-transform: uppercase; margin-top: 2px; }
      .notes { font-style: italic; color: #666; font-size: 10px; display: block; margin-top: 4px; }
      .row-audit { font-size: 8px; color: #555; margin-top: 3px; border-left: 2px solid #bbb; padding-left: 6px; }
      .geo-badge-in { color: #2ecc71; font-size: 9px; font-weight: bold; display: block; margin-top: 2px; }
      .geo-badge-out { color: #e67e22; font-size: 9px; font-weight: bold; display: block; margin-top: 2px; }
      .lunch-badge { color: #e67e22; font-size: 9px; }
      .legend { font-size: 9px; color: #666; margin-bottom: 30px; }
      .audit-section { margin-top: 20px; border-top: 3px solid #eee; padding-top: 20px; page-break-inside: avoid; }
      .audit-title { font-size: 12px; font-weight: bold; color: #000; text-transform: uppercase; margin-bottom: 15px; }
      .log-item { font-size: 9px; color: #555; margin-bottom: 6px; border-left: 2px solid #ddd; padding-left: 10px; }
      .footer { margin-top: 50px; text-align: center; font-size: 9px; color: #aaa; border-top: 1px solid #eee; padding-top: 10px; }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="title">${tr("pdf_title")}</div>
      <div class="subtitle">${tr("pdf_subtitle")}</div>
    </div>
    <div class="info-grid">
      <div class="info-col">
        <div class="info-label">${tr("pdf_employee")}</div>
        <div class="info-value">${escapeHtml(ctx.employeeName)}</div>
        <div class="info-label">${tr("pdf_system_id")}</div>
        <div class="info-value">EMP-#${String(ctx.settingsId).padStart(4, "0")}</div>
      </div>
      <div class="info-col" style="text-align: right;">
        <div class="info-label">${tr("pdf_company")}</div>
        <div class="info-value">${escapeHtml(ctx.employerName)}</div>
        <div class="info-label">${tr("pdf_range")}</div>
        <div class="info-value">${ctx.rangeTitle}</div>
      </div>
    </div>
    <div class="stats-box">
      <div class="stat-item"><div class="stat-num">${model.totals.hours.toFixed(2)}</div><div class="stat-desc">${tr("pdf_total_hours")}</div></div>
      <div class="stat-item"><div class="stat-num">${model.totals.overtime.toFixed(2)}</div><div class="stat-desc">${tr("pdf_overtime")}</div></div>
      <div class="stat-item"><div class="stat-num" style="color: #D4AF37;">${money(model.totals.pay)}</div><div class="stat-desc">${tr("pdf_estimated_pay")}</div></div>
    </div>
    <table>
      <thead><tr>
        <th width="15%">${tr("pdf_col_date")}</th>
        <th width="40%">${tr("pdf_col_activity")}</th>
        <th width="25%">${tr("pdf_col_schedule")}</th>
        <th width="10%">${tr("pdf_col_hours")}</th>
        <th width="10%">${tr("pdf_col_total")}</th>
      </tr></thead>
      <tbody>${model.rows.map((r) => renderSessionRow(r, ctx.lang)).join("")}</tbody>
    </table>
    <div class="legend">${tr("pdf_legend")}</div>
    <div class="audit-section">
      <div class="audit-title">${tr("pdf_events_title")}</div>
      ${
        model.globalLogs.length === 0
          ? `<div style="font-size:10px; color:#999;">${tr("pdf_no_events")}</div>`
          : model.globalLogs
              .map(
                (l) =>
                  `<div class="log-item"><strong>${formatTime(l.timestamp)}</strong> — <span style="font-weight:bold">[${escapeHtml(l.action_type)}]</span> ${escapeHtml(l.details)}</div>`,
              )
              .join("")
      }
    </div>
    <div class="footer">
      ${tr("pdf_footer")}<br>
      ${tr("pdf_certified", { ts: ctx.generatedAt })}
    </div>
  </body>
</html>`;
}
