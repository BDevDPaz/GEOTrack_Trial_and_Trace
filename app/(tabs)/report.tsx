import React from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';
import { SPACING, RADIUS } from '../../src/constants/theme';
import { useWorkTracker } from '../../src/core/hooks';
import { ScreenContainer, PageHeader, Section, Button, DocumentPreviewWidget } from '../../src/components/ui';
import { now as getNow, currentDate } from '../../src/utils/timeProvider';
import { selectComputedSessions } from '../../src/core/selectors';

/**
 * PANTALLA DE REPORTES Y EXPORTACIÓN
 */
export default function ReportScreen() {
  const { colors } = useTheme();
  const { state, dispatch } = useWorkTracker();

  const { selectedRange } = state.views.report;
  const allSessions = selectComputedSessions(state);

  const reportStats = React.useMemo(() => {
    if (!selectedRange.startAtMs || !selectedRange.endAtMs) {
      return { totalHours: '0.00', totalEarnings: '-bash.00' };
    }

    const filtered = allSessions.filter(s => {
      const startTime = s.actualStartAtMs || s.declaredStartAtMs;
      return startTime >= selectedRange.startAtMs! && startTime <= selectedRange.endAtMs!;
    });

    const hours = filtered.reduce((acc, s) => acc + s.computedHours, 0);
    const earnings = filtered.reduce((acc, s) => acc + s.computedPay, 0);

    return {
      totalHours: hours.toFixed(2),
      totalEarnings: `$${earnings.toFixed(2)}`
    };
  }, [allSessions, selectedRange]);
  const { generationStatus, lastGeneratedUri } = state.runtime.background.weeklyReport;

  const isGenerating = generationStatus === 'generating';
  const hasGenerated = generationStatus === 'generated';
  const isFailed = generationStatus === 'failed';

  const handleSelectRange = (type: 'current_week' | 'last_week' | 'month') => {
    let startAtMs = getNow();
    let endAtMs = getNow();
    let label = '';

    const today = currentDate();
    if (type === 'current_week') {
      label = 'Semana Actual';
      const monday = today.startOf('isoWeek');
      startAtMs = monday.valueOf();
      endAtMs = getNow();
    } else if (type === 'last_week') {
      label = 'Semana Pasada';
      const lastMonday = today.subtract(1, 'week').startOf('isoWeek');
      startAtMs = lastMonday.valueOf();
      
      const lastSunday = lastMonday.endOf('isoWeek');
      endAtMs = lastSunday.valueOf();
    } else {
      label = 'Mes en Curso';
      const firstDayOfMonth = today.startOf('month');
      startAtMs = firstDayOfMonth.valueOf();
      endAtMs = getNow();
    }

    dispatch({
      type: 'REPORT_RANGE_SELECTED',
      startAtMs,
      endAtMs,
      label,
    });
  };

  const handleGeneratePdf = () => {
    dispatch({ type: 'REPORT_GENERATION_STARTED' });
  };

  const handleSharePdf = () => {
    if (!lastGeneratedUri) return;
    dispatch({ type: 'REPORT_SHARE_REQUESTED' });
  };

  const handleEmailPdf = () => {
    if (!lastGeneratedUri) return;
    dispatch({ type: 'REPORT_EMAIL_REQUESTED' });
  };

  return (
    <ScreenContainer noPadding testID="report-screen-container">
      <PageHeader
        title="Reportes"
        subtitle="Exportación de nómina y auditorías"
      />

      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Section title="1. Seleccionar periodo">
          <View style={styles.rangeOptionsContainer}>
            <Pressable
              style={[
                styles.rangeCard,
                { backgroundColor: colors.carbonMist, borderColor: colors.steelLine },
                selectedRange.label === 'Semana Actual' && { borderColor: colors.mutedGold, backgroundColor: 'rgba(212, 175, 55, 0.03)' }
              ]}
              onPress={() => handleSelectRange('current_week')}
            >
              <Ionicons 
                name="calendar-outline" 
                size={22} 
                color={selectedRange.label === 'Semana Actual' ? colors.mutedGold : colors.textSecondary}
              />
              <Text style={[
                styles.rangeCardText,
                { color: colors.textSecondary },
                selectedRange.label === 'Semana Actual' && { color: colors.mutedGold, fontWeight: '700' }
              ]}>
                Semana Actual
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.rangeCard,
                { backgroundColor: colors.carbonMist, borderColor: colors.steelLine },
                selectedRange.label === 'Semana Pasada' && { borderColor: colors.mutedGold, backgroundColor: 'rgba(212, 175, 55, 0.03)' }
              ]}
              onPress={() => handleSelectRange('last_week')}
            >
              <Ionicons 
                name="play-back-outline" 
                size={22} 
                color={selectedRange.label === 'Semana Pasada' ? colors.mutedGold : colors.textSecondary}
              />
              <Text style={[
                styles.rangeCardText,
                { color: colors.textSecondary },
                selectedRange.label === 'Semana Pasada' && { color: colors.mutedGold, fontWeight: '700' }
              ]}>
                Semana Pasada
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.rangeCard,
                { backgroundColor: colors.carbonMist, borderColor: colors.steelLine },
                selectedRange.label === 'Mes en Curso' && { borderColor: colors.mutedGold, backgroundColor: 'rgba(212, 175, 55, 0.03)' }
              ]}
              onPress={() => handleSelectRange('month')}
            >
              <Ionicons 
                name="grid-outline" 
                size={22} 
                color={selectedRange.label === 'Mes en Curso' ? colors.mutedGold : colors.textSecondary}
              />
              <Text style={[
                styles.rangeCardText,
                { color: colors.textSecondary },
                selectedRange.label === 'Mes en Curso' && { color: colors.mutedGold, fontWeight: '700' }
              ]}>
                Mes Completo
              </Text>
            </Pressable>
          </View>
        </Section>

        <Section title="2. Vista previa del documento">
          <DocumentPreviewWidget
            employeeName={state.domain.settings.employeeName}
            dateRange={selectedRange.label || 'Seleccionar periodo'}
            totalHours={reportStats.totalHours}
            totalEarnings={reportStats.totalEarnings}
          />
        </Section>

        <View style={styles.actionsBlock}>
          {!hasGenerated ? (
            <Button
              label={isGenerating ? "GENERANDO ARCHIVO PDF..." : "COMPILAR REPORTE OFICIAL"}
              variant="primary"
              disabled={isGenerating || !selectedRange.label}
              onPress={handleGeneratePdf}
            />
          ) : (
            <View style={styles.exportRow}>
              <View style={styles.flexButton}>
                <Button
                  label="COMPARTIR"
                  variant="secondary"
                  onPress={handleSharePdf}
                />
              </View>
              <View style={styles.flexButton}>
                <Button
                  label="ENVIAR EMAIL"
                  variant="primary"
                  onPress={handleEmailPdf}
                />
              </View>
            </View>
          )}

          {isFailed && (
            <View style={[styles.errorContainer, { backgroundColor: 'rgba(235, 87, 87, 0.1)' }]}>
              <Ionicons name="warning-outline" size={16} color={colors.deepRed} />
              <Text style={[styles.errorText, { color: colors.deepRed }]}>
                Fallo la inyección o compilación del reporte. Inténtalo de nuevo.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.xxl,
  },
  rangeOptionsContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  rangeCard: {
    flex: 1,
    borderRadius: RADIUS.inputs,
    padding: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    gap: SPACING.sm,
  },
  rangeCardText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
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
    padding: SPACING.md,
    borderRadius: RADIUS.inputs,
    marginTop: SPACING.md,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '400',
    flex: 1,
  },
});
