import React from "react";
import { StyleSheet, View, Text, ScrollView, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TOKENS, FONT } from "../../src/constants/theme";
import { useWorkTracker } from "../../src/core/hooks";
import {
  ScreenContainer,
  PageHeader,
  Section,
  Button,
  DocumentPreviewWidget,
  Card,
} from "../../src/components/ui";
import { now as getNow, currentDate } from "../../src/utils/timeProvider";
import { selectComputedSessions } from "../../src/core/selectors";
import { ICONS } from "../../src/constants/icons";

/**
 * PANTALLA DE REPORTES Y EXPORTACIÓN
 */
export default function ReportScreen() {
  const { state, dispatch } = useWorkTracker();

  const { selectedRange } = state.views.report;
  const allSessions = selectComputedSessions(state);

  const reportStats = React.useMemo(() => {
    if (!selectedRange.startAtMs || !selectedRange.endAtMs) {
      return { totalHours: "0.00", totalEarnings: "$0.00" };
    }

    const filtered = allSessions.filter((s) => {
      const startTime = s.actualStartAtMs || s.declaredStartAtMs;
      return (
        startTime >= selectedRange.startAtMs! &&
        startTime <= selectedRange.endAtMs!
      );
    });

    const hours = filtered.reduce((acc, s) => acc + s.computedHours, 0);
    const earnings = filtered.reduce((acc, s) => acc + s.computedPay, 0);

    return {
      totalHours: hours.toFixed(2),
      totalEarnings: `$${earnings.toFixed(2)}`,
    };
  }, [allSessions, selectedRange]);

  const { generationStatus, lastGeneratedUri } =
    state.runtime.background.weeklyReport;

  const isGenerating = generationStatus === "generating";
  const hasGenerated = generationStatus === "generated";
  const isFailed = generationStatus === "failed";

  const handleSelectRange = (type: "current_week" | "last_week" | "month") => {
    let startAtMs = getNow();
    let endAtMs = getNow();
    let label = "";

    const today = currentDate();
    if (type === "current_week") {
      label = "Semana Actual";
      const monday = today.startOf("isoWeek");
      startAtMs = monday.valueOf();
      endAtMs = getNow();
    } else if (type === "last_week") {
      label = "Semana Pasada";
      const lastMonday = today.subtract(1, "week").startOf("isoWeek");
      startAtMs = lastMonday.valueOf();

      const lastSunday = lastMonday.endOf("isoWeek");
      endAtMs = lastSunday.valueOf();
    } else {
      label = "Mes en Curso";
      const firstDayOfMonth = today.startOf("month");
      startAtMs = firstDayOfMonth.valueOf();
      endAtMs = getNow();
    }

    dispatch({
      type: "REPORT_RANGE_SELECTED",
      startAtMs,
      endAtMs,
      label,
    });
  };

  const handleGeneratePdf = () => {
    dispatch({ type: "REPORT_GENERATION_STARTED" });
  };

  const handleSharePdf = () => {
    if (!lastGeneratedUri) return;
    dispatch({ type: "REPORT_SHARE_REQUESTED" });
  };

  const handleEmailPdf = () => {
    if (!lastGeneratedUri) return;
    dispatch({ type: "REPORT_EMAIL_REQUESTED" });
  };

  const RangeOption = ({
    type,
    label,
    icon,
  }: {
    type: any;
    label: string;
    icon: any;
  }) => {
    const isSelected = selectedRange.label === label;
    return (
      <Pressable
        style={styles.flexOption}
        onPress={() => handleSelectRange(type)}
        accessibilityRole="radio"
        accessibilityState={{ selected: isSelected }}
      >
        <Card
          variant={isSelected ? "elevated" : "surface"}
          style={[
            styles.rangeCard,
            isSelected && { borderColor: TOKENS.colors.primary },
          ]}
        >
          <Ionicons
            name={icon}
            size={22}
            color={
              isSelected ? TOKENS.colors.primary : TOKENS.colors.text.muted
            }
          />
          <Text
            style={[
              styles.rangeCardText,
              {
                color: isSelected
                  ? TOKENS.colors.primary
                  : TOKENS.colors.text.secondary,
              },
              isSelected && { fontWeight: "700" },
            ]}
          >
            {label}
          </Text>
        </Card>
      </Pressable>
    );
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
            <RangeOption
              type="current_week"
              label="Semana Actual"
              icon="calendar-outline"
            />
            <RangeOption
              type="last_week"
              label="Semana Pasada"
              icon="play-back-outline"
            />
            <RangeOption
              type="month"
              label="Mes en Curso"
              icon="grid-outline"
            />
          </View>
        </Section>

        <Section title="2. Vista previa del documento">
          <DocumentPreviewWidget
            employeeName={state.domain.settings.employeeName}
            dateRange={selectedRange.label || "Seleccionar periodo"}
            totalHours={reportStats.totalHours}
            totalEarnings={reportStats.totalEarnings}
          />
        </Section>

        <View style={styles.actionsBlock}>
          {!hasGenerated ? (
            <Button
              label={
                isGenerating
                  ? "GENERANDO ARCHIVO PDF..."
                  : "COMPILAR REPORTE OFICIAL"
              }
              variant="primary"
              disabled={isGenerating || !selectedRange.label}
              onPress={handleGeneratePdf}
              isLoading={isGenerating}
              iconName={ICONS.actions.download as any}
            />
          ) : (
            <View style={styles.exportRow}>
              <Button
                label="COMPARTIR"
                variant="secondary"
                onPress={handleSharePdf}
                style={styles.flexButton}
                iconName={ICONS.actions.share as any}
              />
              <Button
                label="ENVIAR EMAIL"
                variant="primary"
                onPress={handleEmailPdf}
                style={styles.flexButton}
                iconName="mail-outline"
              />
            </View>
          )}

          {isFailed && (
            <Card variant="surface" style={styles.errorContainer}>
              <Ionicons
                name={ICONS.status.error as any}
                size={18}
                color={TOKENS.colors.status.danger}
              />
              <Text
                style={[
                  styles.errorText,
                  { color: TOKENS.colors.status.danger },
                ]}
              >
                Error al generar el reporte. Inténtalo de nuevo.
              </Text>
            </Card>
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
    paddingBottom: TOKENS.spacing["4xl"],
  },
  rangeOptionsContainer: {
    flexDirection: "row",
    gap: TOKENS.spacing.sm,
  },
  flexOption: {
    flex: 1,
  },
  rangeCard: {
    alignItems: "center",
    justifyContent: "center",
    gap: TOKENS.spacing.xs,
    padding: TOKENS.spacing.md,
  },
  rangeCardText: {
    ...FONT.label,
    textAlign: "center",
  },
  actionsBlock: {
    marginTop: TOKENS.spacing.xl,
    paddingHorizontal: TOKENS.layout.screenPadding,
  },
  exportRow: {
    flexDirection: "row",
    gap: TOKENS.spacing.md,
  },
  flexButton: {
    flex: 1,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: TOKENS.spacing.sm,
    marginTop: TOKENS.spacing.md,
    backgroundColor: `${TOKENS.colors.status.danger}10`,
  },
  errorText: {
    ...FONT.caption,
    flex: 1,
  },
});
