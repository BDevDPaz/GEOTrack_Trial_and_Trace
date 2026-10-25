// --- src/services/ReportGenerator.ts ---
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as MailComposer from "expo-mail-composer";
import { getSettings, getAllAsync } from "../database/db";
// types removed
import { log } from "../utils/logger";
import dayjs from "../utils/dayjsSetup";
import { formatDate } from "../utils/dateUtils";
import { t } from "../utils/i18n";
import {
  buildReportModel,
  renderReportHtml,
  reportContextStartMs,
} from "./report/reportModel";
type AuditLog = any;
type AppSettings = any;
type WorkSession = any;

export const generateWeeklyReport = async (
  shouldShare: boolean = true,
  customRange?: { start: number; end: number },
): Promise<string | null> => {
  try {
    const settings = await getSettings();

    if (!settings) {
      log(
        "ROJO",
        "ERROR_CRITICO",
        "ERROR",
        "No se encontró la configuración (Settings) al generar reporte",
      );
      return null;
    }

    let startTs: number;
    let endTs: number;
    let rangeTitle = "";

    if (customRange) {
      startTs = customRange.start;
      endTs = customRange.end;
      rangeTitle = `${formatDate(startTs)} - ${formatDate(endTs)}`;
    } else {
      // Cálculo preciso e inmutable del inicio y fin de semana usando dayjs
      const start = dayjs().startOf("week");
      const end = dayjs().endOf("week");

      startTs = start.valueOf();
      endTs = end.valueOf();
      rangeTitle = "Semana Actual";
    }

    // Contexto: desde el lunes de la semana de startTs, para que el OT
    // semanal (>40 h) cuente las horas previas al inicio del rango.
    const contextSessions = await getAllAsync<WorkSession>(
      `SELECT * FROM work_sessions
       WHERE start_time >= ? AND start_time <= ?
       ORDER BY start_time ASC`,
      [reportContextStartMs(startTs), endTs],
    );

    const logs = await getAllAsync<AuditLog>(
      `SELECT * FROM audit_logs
       WHERE timestamp >= ? AND timestamp <= ?
       ORDER BY timestamp DESC`,
      [startTs, endTs],
    );

    const lang = settings.language || "es";
    const model = buildReportModel(
      contextSessions,
      logs,
      settings,
      { startMs: startTs, endMs: endTs },
    );
    const html = renderReportHtml(model, {
      lang,
      employeeName: settings.employee_name || "-",
      employerName: settings.employer_name || "-",
      settingsId: settings.id ?? 1,
      rangeTitle: customRange ? rangeTitle : t(lang, "pdf_current_week"),
      generatedAt: dayjs().tz().format("YYYY-MM-DD HH:mm:ss Z"),
    });

    const { uri } = await Print.printToFileAsync({ html, base64: false });

    if (shouldShare) {
      log(
        "VERDE",
        "OPERACION_EXITOSA",
        "INFO",
        "Reporte PDF compartido con éxito",
      );
      await Sharing.shareAsync(uri, {
        UTI: ".pdf",
        mimeType: "application/pdf",
      });
    }

    return uri;
  } catch (error) {
    log(
      "ROJO",
      "ERROR_CRITICO",
      "ERROR",
      "Fallo al generar el reporte PDF semanal",
      error,
    );
    return null;
  }
};

export const sendReportByEmail = async (
  pdfUri: string,
  settings: AppSettings,
) => {
  const isAvailable = await MailComposer.isAvailableAsync();

  if (isAvailable) {
    await MailComposer.composeAsync({
      recipients: [settings.company_email],
      subject: t(settings.language, "mail_subject", {
        name: settings.employee_name,
      }),
      body: t(settings.language, "mail_body", { name: settings.employee_name }),
      attachments: [pdfUri],
    });
  } else {
    await Sharing.shareAsync(pdfUri);
  }
};
