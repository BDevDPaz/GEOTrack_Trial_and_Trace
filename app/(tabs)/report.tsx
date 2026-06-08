import React from 'react';
import { StyleSheet, View, Text, SafeAreaView, ScrollView, Platform, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PALETTE, SPACING, FONT, RADIUS } from '../../src/constants/theme';

// Importaciones del Motor Canónico
import { useWorkTracker } from '../../src/core/hooks/useWorkTracker';

// Componentes del Sistema Visual de WTracker
import { Button } from '../../src/components/ui/Button';
import { DocumentPreviewWidget } from '../../src/components/DocumentPreviewWidget';

/**
 * PANTALLA DE REPORTES Y EXPORTACIÓN
 * Vista controlada de forma reactiva. Lee el estado canónico del subsistema de reportes
 * y despacha intenciones puros de exportación de nómina.
 */
export default function ReportScreen() {
  const { state, dispatch } = useWorkTracker();

  // Desestructuración directa de la fuente única de verdad (Sub-estados de reportes)
  const { selectedRange } = state.views.report;
  const { generationStatus, lastGeneratedUri } = state.runtime.background.weeklyReport;

  // Mapeos visuales derivados directamente de las uniones de tipos del engine
  const isGenerating = generationStatus === 'generating';
  const hasGenerated = generationStatus === 'generated';
  const isFailed = generationStatus === 'failed';

  /**
   * Cambiar de rango de fechas despachando el evento formal
   */
  const handleSelectRange = (type: 'current_week' | 'last_week' | 'month') => {
    let startAtMs = Date.now();
    let endAtMs = Date.now();
    let label = '';

    const now = new Date();
    if (type === 'current_week') {
      label = 'Semana Actual';
      // Ajuste al lunes actual a las 00:00:00
      const currentDay = now.getDay();
      const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
      const monday = new Date(now.setDate(now.getDate() + distanceToMonday));
      monday.setHours(0, 0, 0, 0);
      startAtMs = monday.getTime();
      endAtMs = Date.now();
    } else if (type === 'last_week') {
      label = 'Semana Pasada';
      const currentDay = now.getDay();
      const distanceToLastMonday = (currentDay === 0 ? -6 : 1 - currentDay) - 7;
      const lastMonday = new Date(now.setDate(now.getDate() + distanceToLastMonday));
      lastMonday.setHours(0, 0, 0, 0);
      startAtMs = lastMonday.getTime();
      
      const lastSunday = new Date(lastMonday);
      lastSunday.setDate(lastSunday.getDate() + 6);
      lastSunday.setHours(23, 59, 59, 999);
      endAtMs = lastSunday.getTime();
    } else {
      label = 'Mes en Curso';
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      startAtMs = firstDayOfMonth.getTime();
      endAtMs = Date.now();
    }

    dispatch({
      type: 'REPORT_RANGE_SELECTED',
      startAtMs,
      endAtMs,
      label,
    });
  };

  /**
   * Disparador: Solicitar la compilación física del PDF
   */
  const handleGeneratePdf = () => {
    dispatch({ type: 'REPORT_GENERATION_STARTED' });
  };

  /**
   * Disparador: Compartir mediante API compartida nativa del OS
   */
  const handleSharePdf = () => {
    if (!lastGeneratedUri) return;
    dispatch({ type: 'REPORT_SHARE_REQUESTED' });
  };

  /**
   * Disparador: Enviar por correo con plantilla formal pre-configurada
   */
  const handleEmailPdf = () => {
    if (!lastGeneratedUri) return;
    dispatch({ type: 'REPORT_EMAIL_REQUESTED' });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reportes</Text>
        <Text style={styles.headerSubtitle}>Exportación de nómina y auditorías</Text>
      </View>

      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Selector de periodo temporal */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>1. SELECCIONAR PERIODO</Text>
          <View style={styles.rangeOptionsContainer}>
            <Pressable
              style={[
                styles.rangeCard,
                selectedRange.label === 'Semana Actual' && styles.rangeCardActive
              ]}
              onPress={() => handleSelectRange('current_week')}
            >
              <Ionicons 
                name="calendar-outline" 
                size={22} 
                color={selectedRange.label === 'Semana Actual' ? PALETTE.mutedGold : PALETTE.textSecondary} 
              />
              <Text style={[styles.rangeCardText, selectedRange.label === 'Semana Actual' && styles.rangeCardTextActive]}>
                Semana Actual
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.rangeCard,
                selectedRange.label === 'Semana Pasada' && styles.rangeCardActive
              ]}
              onPress={() => handleSelectRange('last_week')}
            >
              <Ionicons 
                name="play-back-outline" 
                size={22} 
                color={selectedRange.label === 'Semana Pasada' ? PALETTE.mutedGold : PALETTE.textSecondary} 
              />
              <Text style={[styles.rangeCardText, selectedRange.label === 'Semana Pasada' && styles.rangeCardTextActive]}>
                Semana Pasada
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.rangeCard,
                selectedRange.label === 'Mes en Curso' && styles.rangeCardActive
              ]}
              onPress={() => handleSelectRange('month')}
            >
              <Ionicons 
                name="grid-outline" 
                size={22} 
                color={selectedRange.label === 'Mes en Curso' ? PALETTE.mutedGold : PALETTE.textSecondary} 
              />
              <Text style={[styles.rangeCardText, selectedRange.label === 'Mes en Curso' && styles.rangeCardTextActive]}>
                Mes Completo
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Previsualizador reactivo de documento físico */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>2. VISTA PREVIA DEL DOCUMENTO</Text>
          <DocumentPreviewWidget 
            status={generationStatus}
            selectedRangeLabel={selectedRange.label || 'Selecciona un periodo'}
          />
        </View>

        {/* Bloque operacional de acciones asíncronas de infraestructura */}
        <View style={styles.actionsBlock}>
          {!hasGenerated ? (
            <Button
              title={isGenerating ? "GENERANDO ARCHIVO PDF..." : "COMPILAR REPORTE OFICIAL"}
              type="primary"
              disabled={isGenerating || !selectedRange.label}
              onPress={handleGeneratePdf}
            />
          ) : (
            <View style={styles.exportRow}>
              <View style={styles.flexButton}>
                <Button
                  title="COMPARTIR"
                  type="secondary"
                  icon="share-social-outline"
                  onPress={handleSharePdf}
                />
              </View>
              <View style={styles.flexButton}>
                <Button
                  title="ENVIAR EMAIL"
                  type="primary"
                  icon="mail-outline"
                  onPress={handleEmailPdf}
                />
              </View>
            </View>
          )}

          {isFailed && (
            <View style={styles.errorContainer}>
              <Ionicons name="warning-outline" size={16} color={PALETTE.deepRed} />
              <Text style={styles.errorText}>
                Fallo la inyección o compilación del reporte. Inténtalo de nuevo.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PALETTE.obsidian,
    paddingTop: Platform.OS === 'android' ? 40 : 0,
  },
  header: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  headerTitle: {
    ...FONT.h1,
    color: PALETTE.textPrimary,
  },
  headerSubtitle: {
    ...FONT.caption,
    color: PALETTE.textSecondary,
    marginTop: 2,
  },
  container: {
    flex: 1,
    backgroundColor: PALETTE.obsidian,
  },
  scrollContent: {
    paddingBottom: SPACING.xxl,
  },
  sectionBlock: {
    marginTop: SPACING.xl,
    paddingHorizontal: SPACING.xl,
  },
  sectionTitle: {
    ...FONT.label,
    color: PALETTE.textMuted,
    letterSpacing: 1.5,
    marginBottom: SPACING.md,
  },
  rangeOptionsContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  rangeCard: {
    flex: 1,
    backgroundColor: PALETTE.carbonMist,
    borderRadius: RADIUS.inputs,
    padding: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: PALETTE.steelLine,
    gap: SPACING.sm,
  },
  rangeCardActive: {
    borderColor: PALETTE.mutedGold,
    backgroundColor: 'rgba(212, 175, 55, 0.03)',
  },
  rangeCardText: {
    ...FONT.label,
    fontSize: 11,
    fontWeight: '600',
    color: PALETTE.textSecondary,
    textAlign: 'center',
  },
  rangeCardTextActive: {
    color: PALETTE.mutedGold,
    fontWeight: '700',
  },
  actionsBlock: {
    marginTop: SPACING.xl,
    paddingHorizontal: SPACING.xl,
  },
  exportRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  flexButton: {
    flex: 1,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: 'rgba(235, 87, 87, 0.1)',
    padding: SPACING.md,
    borderRadius: RADIUS.inputs,
    marginTop: SPACING.md,
  },
  errorText: {
    ...FONT.caption,
    color: PALETTE.deepRed,
    flex: 1,
  },
});
