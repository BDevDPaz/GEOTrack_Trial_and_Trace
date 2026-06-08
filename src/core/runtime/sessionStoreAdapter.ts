import { SessionRecord, AppSettingsRecord } from '../contracts/types';

// Importamos las funciones reales de tu base de datos actual
import * as DB from '../../../database/db'; 
import { WorkSession, AppSettings } from '../../../types';

/**
 * CONTRATO ESTRICTO: 
 * El motor solo conoce estas funciones. No sabe que existe SQLite.
 */
export interface SessionStoreAdapter {
  createSession(session: Partial<SessionRecord>): Promise<number>;
  closeSession(id: number, endAtMs: number): Promise<void>;
  updateLunch(id: number, startAtMs: number, endAtMs: number): Promise<void>;
  updateSessionManual(id: number, startAtMs: number, endAtMs: number | null, note: string): Promise<void>;
  deleteSession(id: number): Promise<void>;
  checkOverlap(startAtMs: number, endAtMs: number, excludeId: number): Promise<boolean>;
  getSettings(): Promise<AppSettingsRecord | null>;
  saveSettings(settings: AppSettingsRecord): Promise<void>;
}

export const sessionStore: SessionStoreAdapter = {
  
  async createSession(session: Partial<SessionRecord>): Promise<number> {
    // Mapeamos el SessionRecord canónico al tipo WorkSession que espera la BD
    const dbPayload: WorkSession = {
      start_time: session.declaredStartAtMs || Date.now(),
      status: session.lifecycle?.domainStatus || 'pending_arrival',
      latitude: session.capturedLocation?.latitude || 0,
      longitude: session.capturedLocation?.longitude || 0,
      target_latitude: session.destination?.targetLatitude || 0,
      target_longitude: session.destination?.targetLongitude || 0,
      setup_latitude: session.destination?.setupLatitude || 0,
      setup_longitude: session.destination?.setupLongitude || 0,
      address: session.destination?.address || '',
      client_name: session.destination?.clientName || '',
      manual_note: session.notes?.manualNote || '',
      location_confirmed: session.lifecycle?.locationConfirmed ? 1 : 0,
      is_manual_edit: session.lifecycle?.isManualEdit ? 1 : 0,
      lunch_taken: session.lunch?.taken ? 1 : 0,
      date_string: session.bookkeeping?.dateString || new Date().toISOString().split('T')[0],
    };

    // Delegamos la transacción segura a tu db.ts
    return await DB.insertWorkSession(dbPayload);
  },

  async closeSession(id: number, endAtMs: number): Promise<void> {
    await DB.updateSessionEndTime(id, endAtMs);
  },

  async updateLunch(id: number, startAtMs: number, endAtMs: number): Promise<void> {
    await DB.updateSessionLunch(id, startAtMs, endAtMs);
  },

  async updateSessionManual(id: number, startAtMs: number, endAtMs: number | null, note: string): Promise<void> {
    await DB.updateWorkSessionManual(id, startAtMs, endAtMs, note);
  },

  async deleteSession(id: number): Promise<void> {
    await DB.deleteWorkSession(id);
  },

  async checkOverlap(startAtMs: number, endAtMs: number, excludeId: number): Promise<boolean> {
    return await DB.checkSessionOverlap(startAtMs, endAtMs, excludeId);
  },

  async getSettings(): Promise<AppSettingsRecord | null> {
    const rawSettings = await DB.getSettings();
    if (!rawSettings) return null;

    // Traducimos el resultado de SQLite al tipo canónico
    return {
      employeeName: rawSettings.employee_name || '',
      employerName: rawSettings.employer_name || '',
      companyEmail: rawSettings.company_email || '',
      toleranceRadiusMeters: rawSettings.tolerance_radius || 200,
      hourlyRate: rawSettings.hourly_rate || 0,
      language: (rawSettings.language as 'es' | 'en') || 'es',
      dailyReminderTime: rawSettings.start_time || '08:00',
      overtimeMultiplier: rawSettings.overtime_multiplier || 1.5,
    };
  },

  async saveSettings(settings: AppSettingsRecord): Promise<void> {
    const dbPayload: AppSettings = {
      id: 1, // ID fijo según tu db.ts
      employee_name: settings.employeeName,
      employer_name: settings.employerName,
      company_email: settings.companyEmail,
      tolerance_radius: settings.toleranceRadiusMeters,
      hourly_rate: settings.hourlyRate,
      language: settings.language,
      start_time: settings.dailyReminderTime,
      overtime_multiplier: settings.overtimeMultiplier,
    };
    
    await DB.saveSettings(dbPayload);
  }
};
