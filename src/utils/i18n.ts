export const translations = {
  es: {
    // --- Fase D (9): modales ---
    modal_note_title: "Agregar nota",
    modal_note_desc: "Agrega información adicional a esta jornada.",
    modal_note_save: "Guardar nota",
    modal_note_placeholder: "Escribe tu nota aquí...",
    modal_cancel: "Cancelar",
    modal_delete_title: "Eliminar jornada",
    modal_delete_desc:
      "La jornada se marcará como eliminada: no contará en la nómina y seguirá visible en el reporte de integridad.",
    modal_delete_confirm: "Eliminar",
    modal_edit_title: "Editar jornada",
    modal_edit_desc: "Ajusta los horarios registrados de esta jornada.",
    modal_edit_save: "Guardar cambios",
    modal_edit_start: "Hora de inicio",
    modal_edit_end: "Hora de fin",
    modal_edit_invalid: "Dato inválido",
    modal_edit_reason: "Motivo del ajuste",
    modal_edit_reason_placeholder: "Describe el motivo del cambio...",
    modal_exit_title: "Salida de zona",
    modal_exit_desc:
      "Se detectó una salida de la zona registrada a las {time}. ¿Deseas continuar con la jornada o finalizarla?",
    modal_exit_continue: "Continuar jornada",
    modal_exit_end: "Finalizar jornada",
    lunch_reminder_title: "Hora de almuerzo 🍽️",
    lunch_reminder_body: "Recuerda registrar tu almuerzo en GEOTrack.",
    modal_lunch_title: "Tiempo de descanso",
    modal_lunch_desc: "Selecciona el tiempo que se descontará de la jornada.",
    modal_lunch_confirm: "Confirmar",
    modal_lunch_skip: "Omitir",
    modal_lunch_minutes: "{min} minutos",
    cancel_trip_title: "Cancelar trayecto",
    cancel_trip_msg:
      "La jornada pendiente se descartará y quedará registrada como cancelada.",
    cancel_trip_back: "Volver",
    hero_cancel_trip: "Cancelar trayecto",
    hero_pill_idle: "Inactivo",
    hero_pill_waiting: "Esperando llegada",
    hero_pill_travel: "En tránsito",
    hero_pill_active: "Jornada Activa",
    hero_pill_paused: "Pausado",
    hero_pill_pending_exit: "Pendiente confirmación",
    hero_pill_closed: "Cerrada",
    hero_pill_unknown: "Estado desconocido",
    hero_setup: "Configurar jornada",
    hero_confirm_arrival: "Confirmar llegada",
    hero_arrived: "Llegué al sitio",
    hero_finish: "Terminar jornada",
    hero_pause: "Pausar",
    hero_resume: "Reanudar",
    hero_other_job: "Otro trabajo",
    hero_finish_save: "Finalizar y guardar",
    hero_refresh: "Actualizar",
    hero_time_label: "TIEMPO ACUMULADO",
    hero_earnings_label: "GANANCIA EST.",
    home_subtitle: "Trazabilidad y Seguimiento",
    home_controls: "Control Operativo",
    home_setup: "CONFIGURAR JORNADA",
    home_confirm_arrival_manual: "CONFIRMAR LLEGADA MANUAL",
    home_pause: "PAUSAR",
    home_finish: "TERMINAR",
    home_resume: "REANUDAR",
    home_other_job: "OTRO TRABAJO",
    home_arrived: "LLEGUÉ AL SITIO",
    home_finish_save: "FINALIZAR Y GUARDAR",
    // --- BOTONES GLOBALES ---
    btn_cancel: "CANCELAR",
    btn_save: "GUARDAR",
    btn_edit: "EDITAR",
    btn_delete: "ELIMINAR",
    btn_close: "CERRAR",
    btn_finished: "TERMINAR",
    btn_moving: "OTRO SITIO",

    // --- HEADER & HOME (Estados del Flujo Maestro) ---
    header_title: "WORK Tracker",
    status_active: "ACTIVO",
    status_inactive: "FUERA DE SERVICIO",
    status_pending: "ESPERANDO LLEGADA", // ✅ Vital para Fase 1
    status_transit: "EN TRÁNSITO", // ✅ Vital para Fase 4
    status_travel: "EN TRÁNSITO", // (Compatibilidad)

    // --- TARJETA PRINCIPAL (HOME) ---
    label_location: "UBICACIÓN ACTUAL",
    label_destination: "DESTINO CONFIGURADO",
    hint_geofence_active: "Geocerca Activa • Check-in automático al llegar",
    no_activity: "No hay actividad registrada.",

    // --- ACCIONES PRINCIPALES ---
    btn_clock_out: "TERMINAR JORNADA",
    btn_new_job: "INICIAR JORNADA",

    // --- ESTADÍSTICAS ---
    stats_hours: "HORAS",
    stats_earnings: "GANANCIA EST.",

    // --- MODAL CONFIGURACIÓN (DAILY SETUP & TRÁNSITO) ---
    modal_title_start: "INICIAR JORNADA",
    modal_subtitle_start: "Configura tu primer ubicación del día",
    modal_title_transit: "NUEVO DESTINO",
    modal_subtitle_transit: "Rumbo al siguiente trabajo",

    // ✅ Inputs Nuevos (Requeridos por el nuevo Modal)
    input_address: "Dirección del trabajo",
    input_client: "Cliente (Opcional)",
    input_notes: "Notas (Opcional)",

    daily_placeholder: "Ej: 1234 Ejemplo Ave...", // (Compatibilidad)

    btn_activate_geofence: "ACTIVAR GEOCERCA",
    btn_start_transit: "INICIAR TRAYECTO",

    // --- MODAL ALMUERZO ---
    lunch_title: "¿TOMASTE ALMUERZO?",
    lunch_subtitle: "Deducción automática de tiempo",
    lunch_yes_30: "SÍ (30 MIN)",
    lunch_yes_60: "SÍ (60 MIN)",
    lunch_no: "NO TOMÉ",
    status_lunch_taken: "🍴 Almuerzo 🍴",
    session_rate_applied: "Tarifa: ${rate}/h",

    // --- ALERTAS Y NOTIFICACIONES ---
    alert_exit_title: "📍 Saliste del Área",
    alert_exit_msg: "¿Terminaste tu jornada o vas a otro sitio?",
    alert_location_needed: "Se requiere ubicación precisa",
    alert_address_not_found: "Dirección no encontrada",

    toast_geofence_active: "Geocerca Activada. Ve al sitio.",
    toast_transit_started: "Tránsito iniciado.",
    toast_shift_ended: "Jornada finalizada.",
    toast_error_generic: "Ocurrió un error.",

    // --- REPORTES Y PDF (NUEVO) ---
    report_title: "REPORTE SEMANAL",
    report_subtitle: "NÓMINA Y AUDITORÍA",
    card_ready_title: "Listo para Generar",
    card_ready_desc:
      "Genera un PDF oficial con desglose de horas, clientes, notas y auditoría GPS.",
    btn_download_pdf: "DESCARGAR PDF",
    btn_send_email: "ENVIAR POR EMAIL",
    report_footer_note:
      "* Al enviar, se abrirá tu aplicación de correo predeterminada.",

    // --- HISTORIAL (COMPATIBILIDAD) ---
    history_title: "Historial",
    col_date: "Fecha",
    col_loc: "Ubicación",
    col_in: "Entrada",
    col_out: "Salida",

    // --- CONFIGURACIÓN & ADMIN (COMPATIBILIDAD) ---
    settings_title: "CONFIGURACIÓN",
    settings_general: "GENERAL",
    settings_save: "GUARDAR CAMBIOS",

    label_lang: "Idioma / Language",
    label_name: "Nombre Empleado",
    label_rate: "Tarifa por Hora ($)",
    label_start_time: "Hora Recordatorio Diario (HH:MM)",
    label_multiplier: "Multiplicador Tiempo Extra (x)",
    label_company_name: "Nombre Empresa",
    label_report_email: "Email Reportes",
    label_radius: "Radio Tolerancia (mts)",

    admin_zone: "ZONA ADMIN",
    admin_unlock: "Desbloquear",
    admin_pass_placeholder: "Código de Acceso Admin",
    admin_locked_msg: "Configuración de empresa bloqueada.",
    err_pass_wrong: "Código de acceso incorrecto",

    // --- AUDITORÍA PDF ---
    pdf_audit_title: "AUDITORÍA DE INTEGRIDAD DE DATOS",
    log_auto_exit: "Salida Automática por distancia",
    log_auto_entry: "Entrada Automática",
    // --- RESOLUCIÓN DE DIRECCIÓN (Fase A) ---
    addr_label: "Dirección",
    addr_required: "La dirección es obligatoria.",
    addr_not_found: "Dirección no encontrada, revísala",
    addr_geocode_error:
      "No se pudo verificar la dirección. Revisa tu conexión e inténtalo de nuevo.",
    addr_permission_denied:
      "Se necesita permiso de ubicación para iniciar la jornada con check-in automático.",
    addr_confirm_title: "Confirma la dirección",
    addr_confirm_msg: "¿Es esta la dirección correcta?",
    addr_far_title: "¿Estás seguro?",
    addr_far_msg: "Estás a {km} km de la dirección indicada. ¿Iniciar aquí?",
    btn_correct: "Corregir",
    btn_start_anyway: "Iniciar igual",
    btn_confirm: "Confirmar",
    addr_checking: "Verificando…",
    label_distance_warning: "Distancia de aviso al iniciar (m)",

    // --- Fase B/D: PDF e integridad ---
    pdf_title: "GEOTRACK",
    pdf_subtitle: "Reporte Oficial de Nómina y Auditoría",
    pdf_employee: "Empleado",
    pdf_system_id: "ID Sistema",
    pdf_company: "Empresa",
    pdf_range: "Rango del Reporte",
    pdf_current_week: "Semana Actual",
    pdf_total_hours: "Horas Totales",
    pdf_overtime: "Horas Extra (OT)",
    pdf_estimated_pay: "Pago Estimado",
    pdf_col_date: "Fecha",
    pdf_col_activity: "Actividad / Cliente",
    pdf_col_schedule: "Horario",
    pdf_col_hours: "Hrs",
    pdf_col_total: "Total",
    pdf_in_progress: "En curso",
    pdf_lunch: "Almuerzo: -{min} min",
    pdf_auto_in: "✓ Auto Check-in (GPS)",
    pdf_auto_out: "⚠ Auto Check-out (GPS)",
    pdf_setup_address: "Configurada en: {address}",
    pdf_transit_leg: "Tránsito {from} - {to}",
    pdf_events_title: "Registro de Eventos Críticos (GPS & Sistema)",
    pdf_no_events: "Sin eventos registrados en este periodo.",
    pdf_footer: "Documento generado electrónicamente por GEOTrack.",
    pdf_certified: "Certificado digitalmente: {ts}",
    pdf_legend:
      "Leyenda: verde = íntegra · amarillo = editada / cierre automático / tránsito · rojo = eliminada o cancelada ($0, no suma)",
    integrity_INTACT: "Íntegra",
    integrity_EDITED: "Editada",
    integrity_DELETED: "Eliminada",
    integrity_AUTO_CLOSED: "Cierre automático",
    integrity_TRANSIT: "Tránsito",
    integrity_CANCELLED: "Cancelada",
    mail_subject: "Nómina Semanal - {name}",
    mail_body:
      "Hola,\n\nAdjunto encontrarás mi reporte de horas y actividades detallado.\n\nPeriodo finalizado.\n\nAtentamente,\n{name}",
  },

  en: {
    // --- Phase D (9): modals ---
    modal_note_title: "Add note",
    modal_note_desc: "Add extra information to this shift.",
    modal_note_save: "Save note",
    modal_note_placeholder: "Write your note here...",
    modal_cancel: "Cancel",
    modal_delete_title: "Delete shift",
    modal_delete_desc:
      "The shift will be marked as deleted: it won't count toward payroll and will remain visible in the integrity report.",
    modal_delete_confirm: "Delete",
    modal_edit_title: "Edit shift",
    modal_edit_desc: "Adjust the recorded times of this shift.",
    modal_edit_save: "Save changes",
    modal_edit_start: "Start time",
    modal_edit_end: "End time",
    modal_edit_invalid: "Invalid value",
    modal_edit_reason: "Reason for the change",
    modal_edit_reason_placeholder: "Describe why you're changing it...",
    modal_exit_title: "Left the work zone",
    modal_exit_desc:
      "You left the registered zone at {time}. Do you want to continue the shift or end it?",
    modal_exit_continue: "Continue shift",
    modal_exit_end: "End shift",
    lunch_reminder_title: "Lunch time 🍽️",
    lunch_reminder_body: "Remember to log your lunch in GEOTrack.",
    modal_lunch_title: "Break time",
    modal_lunch_desc: "Choose how much time to deduct from the shift.",
    modal_lunch_confirm: "Confirm",
    modal_lunch_skip: "Skip",
    modal_lunch_minutes: "{min} minutes",
    cancel_trip_title: "Cancel trip",
    cancel_trip_msg:
      "The pending shift will be discarded and recorded as cancelled.",
    cancel_trip_back: "Back",
    hero_cancel_trip: "Cancel trip",
    hero_pill_idle: "Idle",
    hero_pill_waiting: "Awaiting arrival",
    hero_pill_travel: "In transit",
    hero_pill_active: "Shift active",
    hero_pill_paused: "Paused",
    hero_pill_pending_exit: "Pending confirmation",
    hero_pill_closed: "Closed",
    hero_pill_unknown: "Unknown state",
    hero_setup: "Set up shift",
    hero_confirm_arrival: "Confirm arrival",
    hero_arrived: "I'm on site",
    hero_finish: "End shift",
    hero_pause: "Pause",
    hero_resume: "Resume",
    hero_other_job: "Another job",
    hero_finish_save: "Finish and save",
    hero_refresh: "Refresh",
    hero_time_label: "ACCUMULATED TIME",
    hero_earnings_label: "EST. EARNINGS",
    home_subtitle: "Traceability and Tracking",
    home_controls: "Operational Control",
    home_setup: "SET UP SHIFT",
    home_confirm_arrival_manual: "CONFIRM ARRIVAL MANUALLY",
    home_pause: "PAUSE",
    home_finish: "END",
    home_resume: "RESUME",
    home_other_job: "ANOTHER JOB",
    home_arrived: "I'M ON SITE",
    home_finish_save: "FINISH AND SAVE",
    // --- GLOBAL BUTTONS ---
    btn_cancel: "CANCEL",
    btn_save: "SAVE",
    btn_edit: "EDIT",
    btn_delete: "DELETE",
    btn_close: "CLOSE",
    btn_finished: "FINISHED",
    btn_moving: "MOVING",

    // --- HEADER & HOME ---
    header_title: "WORK Tracker",
    status_active: "ACTIVE",
    status_inactive: "OFF DUTY",
    status_pending: "AWAITING ARRIVAL",
    status_transit: "IN TRANSIT",
    status_travel: "IN TRANSIT",

    // --- MAIN CARD ---
    label_location: "CURRENT LOCATION",
    label_destination: "TARGET DESTINATION",
    hint_geofence_active: "Geofence Active • Auto check-in on arrival",
    no_activity: "No active session.",

    // --- MAIN ACTIONS ---
    btn_clock_out: "CLOCK OUT",
    btn_new_job: "START SHIFT",

    // --- STATS ---
    stats_hours: "HOURS",
    stats_earnings: "EST. EARNINGS",

    // --- SETUP MODAL ---
    modal_title_start: "START SHIFT",
    modal_subtitle_start: "Set up your first location",
    modal_title_transit: "NEW DESTINATION",
    modal_subtitle_transit: "Heading to next job",

    input_address: "Job Address",
    input_client: "Client (Optional)",
    input_notes: "Notes (Optional)",

    daily_placeholder: "Ex: 1234 Example Ave...",

    btn_activate_geofence: "ACTIVATE GEOFENCE",
    btn_start_transit: "START TRANSIT",

    // --- LUNCH MODAL ---
    lunch_title: "DID YOU TAKE LUNCH?",
    lunch_subtitle: "Automatic time deduction",
    lunch_yes_30: "YES (30 MIN)",
    lunch_yes_60: "YES (60 MIN)",
    lunch_no: "NO LUNCH",
    status_lunch_taken: "🍴 Lunch Taken 🍴",
    session_rate_applied: "Rate: ${rate}/h",

    // --- ALERTS ---
    alert_exit_title: "📍 Left Work Area",
    alert_exit_msg: "Did you finish your shift or are you moving?",
    alert_location_needed: "Precise location required",
    alert_address_not_found: "Address not found",

    toast_geofence_active: "Geofence Active. Go to site.",
    toast_transit_started: "Transit started.",
    toast_shift_ended: "Shift ended successfully.",
    toast_error_generic: "An error occurred.",

    // --- REPORTS ---
    report_title: "WEEKLY REPORT",
    report_subtitle: "PAYROLL & AUDIT",
    card_ready_title: "Ready to Generate",
    card_ready_desc:
      "Generate official PDF with hours breakdown, clients, notes, and GPS audit.",
    btn_download_pdf: "DOWNLOAD PDF",
    btn_send_email: "SEND BY EMAIL",
    report_footer_note: "* Sending will open your default email app.",

    // --- HISTORY ---
    history_title: "History",
    col_date: "Date",
    col_loc: "Location",
    col_in: "In",
    col_out: "Out",

    // --- SETTINGS & ADMIN ---
    settings_title: "SETTINGS",
    settings_general: "GENERAL",
    settings_save: "SAVE CHANGES",

    label_lang: "Language / Idioma",
    label_name: "Employee Name",
    label_rate: "Hourly Rate ($)",
    label_start_time: "Daily Reminder Time (HH:MM)",
    label_multiplier: "Overtime Multiplier (x)",
    label_company_name: "Company Name",
    label_report_email: "Report Email",
    label_radius: "Tolerance Radius (m)",

    admin_zone: "ADMIN ZONE",
    admin_unlock: "Unlock",
    admin_pass_placeholder: "Admin Access Code",
    admin_locked_msg: "Company settings locked.",
    err_pass_wrong: "Incorrect access code",

    // --- AUDIT PDF ---
    pdf_audit_title: "DATA INTEGRITY AUDIT LOG",
    log_auto_exit: "Auto-Checkout by distance",
    log_auto_entry: "Auto Check-in",
    // --- ADDRESS RESOLUTION (Phase A) ---
    addr_label: "Address",
    addr_required: "Address is required.",
    addr_not_found: "Address not found, please check it",
    addr_geocode_error:
      "Could not verify the address. Check your connection and try again.",
    addr_permission_denied:
      "Location permission is required to start a shift with automatic check-in.",
    addr_confirm_title: "Confirm address",
    addr_confirm_msg: "Is this the correct address?",
    addr_far_title: "Are you sure?",
    addr_far_msg: "You are {km} km from the address. Start here?",
    btn_correct: "Correct",
    btn_start_anyway: "Start anyway",
    btn_confirm: "Confirm",
    addr_checking: "Checking…",
    label_distance_warning: "Start distance warning (m)",

    // --- Fase B/D: PDF e integridad ---
    pdf_title: "GEOTRACK",
    pdf_subtitle: "Official Payroll & Audit Report",
    pdf_employee: "Employee",
    pdf_system_id: "System ID",
    pdf_company: "Company",
    pdf_range: "Report Range",
    pdf_current_week: "Current Week",
    pdf_total_hours: "Total Hours",
    pdf_overtime: "Overtime (OT)",
    pdf_estimated_pay: "Estimated Pay",
    pdf_col_date: "Date",
    pdf_col_activity: "Activity / Client",
    pdf_col_schedule: "Schedule",
    pdf_col_hours: "Hrs",
    pdf_col_total: "Total",
    pdf_in_progress: "In progress",
    pdf_lunch: "Lunch: -{min} min",
    pdf_auto_in: "✓ Auto Check-in (GPS)",
    pdf_auto_out: "⚠ Auto Check-out (GPS)",
    pdf_setup_address: "Set up at: {address}",
    pdf_transit_leg: "Transit {from} - {to}",
    pdf_events_title: "Critical Events Log (GPS & System)",
    pdf_no_events: "No events recorded in this period.",
    pdf_footer: "Document generated electronically by GEOTrack.",
    pdf_certified: "Digitally certified: {ts}",
    pdf_legend:
      "Legend: green = intact · yellow = edited / auto-closed / transit · red = deleted or cancelled ($0, not counted)",
    integrity_INTACT: "Intact",
    integrity_EDITED: "Edited",
    integrity_DELETED: "Deleted",
    integrity_AUTO_CLOSED: "Auto-closed",
    integrity_TRANSIT: "Transit",
    integrity_CANCELLED: "Cancelled",
    mail_subject: "Weekly Payroll - {name}",
    mail_body:
      "Hello,\n\nAttached is my detailed hours and activity report.\n\nPeriod completed.\n\nBest regards,\n{name}",
  },
};

export type Lang = keyof typeof translations;
export type TKey = keyof (typeof translations)["es"];

export function t(
  lang: string | undefined,
  key: TKey,
  vars?: Record<string, string | number>,
): string {
  const table =
    (translations as Record<string, Record<string, string>>)[lang ?? "es"] ??
    translations.es;
  let out =
    table[key] ??
    (translations.es as Record<string, string>)[key] ??
    String(key);
  if (vars)
    for (const [k, v] of Object.entries(vars))
      out = out.replace(`{${k}}`, String(v));
  return out;
}
