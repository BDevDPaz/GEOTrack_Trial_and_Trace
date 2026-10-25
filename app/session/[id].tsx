import { effectiveStartMs } from "../../src/core/transit/chainTransit";
import {
  classifyIntegrity,
  integrityToBadgeType,
} from "../../src/utils/integrity";
import { now } from "../../src/utils/timeProvider";
import React, { useState, useMemo } from "react";
import { StyleSheet, View, Text, ScrollView, Platform } from "react-native";
import { useLocalSearchParams } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";

import { TOKENS, FONT } from "../../src/constants/theme";
import { useWorkTracker } from "../../src/core/hooks";
import {
  selectWeeklyComputedSessions,
  selectIsHydrated,
} from "../../src/core/selectors";
import { formatDate, formatTime } from "../../src/utils/dateUtils";
import { t } from "../../src/utils/i18n";
import { resolveSessionRate } from "../../src/utils/payrollUtils";
import {
  ScreenContainer,
  Button,
  IntegrityBadge,
  SessionTimeline,
  TimelineEvent,
  LoadingOverlay,
  PageHeader,
  Card,
} from "../../src/components/ui";
import { BadgeType } from "../../src/components/ui/IntegrityBadge";

// Modales
import { EditSessionModal } from "../../src/components/modals/EditSessionModal";
import { DeleteSessionModal } from "../../src/components/modals/DeleteSessionModal";

/**
 * DETALLE DE SESIÓN
 */
export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, dispatch } = useWorkTracker();

  const [isEditVisible, setIsEditVisible] = useState(false);
  const [isDeleteVisible, setIsDeleteVisible] = useState(false);

  const sessionIdNum = Number(id);
  const allSessions = selectWeeklyComputedSessions(state);
  const session = useMemo(() => {
    return allSessions.find((s) => s.id === sessionIdNum);
  }, [allSessions, sessionIdNum]);

  const handleSaveEdit = () => {
    setIsEditVisible(false);
    dispatch({
      type: "SESSION_EDITED_MANUAL",
      sessionId: sessionIdNum,
      startTime: now(),
      endTime: now(),
      note: "Ajuste manual desde vista de detalle",
    });
  };

  const handleConfirmDelete = () => {
    setIsDeleteVisible(false);
    dispatch({
      type: "SESSION_DELETED_SOFT",
      sessionId: sessionIdNum,
    });
  };

  const timelineEvents = useMemo(() => {
    if (!session) return [];

    const events: TimelineEvent[] = [
      {
        id: "start",
        type: "start",
        title: "Jornada Declarada",
        time: formatTime(session.declaredStartAtMs),
      },
    ];

    if (session.actualStartAtMs) {
      events.push({
        id: "arrival",
        type: "arrival",
        title: "Llegada Confirmada",
        time: formatTime(session.actualStartAtMs),
        subtitle: session.lifecycle.locationConfirmed ? "Vía GPS" : "Manual",
      });
    }

    if (session.endAtMs) {
      events.push({
        id: "close",
        type: "close",
        title: "Cierre de Jornada",
        time: formatTime(session.endAtMs),
      });
    }

    return events;
  }, [session]);

  if (!selectIsHydrated(state)) {
    return <LoadingOverlay visible message="Sincronizando sesión..." />;
  }

  if (!session) {
    return (
      <ScreenContainer noPadding>
        <PageHeader title="Sesión no encontrada" showBack />
        <View style={styles.emptyContainer}>
          <Text
            style={[styles.emptyText, { color: TOKENS.colors.text.secondary }]}
          >
            La sesión no existe o fue eliminada.
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  const startTimeMs = effectiveStartMs(session);
  // Fase B (6): misma clasificación que el PDF.
  const badgeType: BadgeType = integrityToBadgeType(
    classifyIntegrity({
      isDeleted: session.lifecycle.isDeleted,
      isManualEdit: session.lifecycle.isManualEdit,
      closeReason: session.lifecycle.closeReason,
      status: session.lifecycle.domainStatus,
      parentSessionId: session.parentSessionId,
    }),
  );

  return (
    <ScreenContainer noPadding>
      <LoadingOverlay
        visible={state.meta.bootState.isRehydrating}
        message="Actualizando sesión..."
      />
      <PageHeader title="Detalle de Sesión" showBack />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(100).springify().damping(20)}>
          <Card style={styles.heroBlock}>
            <View style={styles.heroTopRow}>
              <Text
                style={[
                  styles.dateText,
                  { color: TOKENS.colors.text.secondary },
                ]}
              >
                {formatDate(startTimeMs)}
              </Text>
              <IntegrityBadge type={badgeType} />
            </View>

            <Text
              style={[
                styles.destinationText,
                { color: TOKENS.colors.text.primary },
              ]}
            >
              {session.destination.address ||
                session.destination.clientName ||
                "Ubicación no especificada"}
            </Text>
            <Text style={[styles.idText, { color: TOKENS.colors.text.muted }]}>
              ID: TRK-{session.id}
            </Text>
          </Card>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(200).springify().damping(20)}
          style={styles.metricsGrid}
        >
          <Card variant="surface" style={styles.metricCard}>
            <Text
              style={[
                styles.metricLabel,
                { color: TOKENS.colors.text.secondary },
              ]}
            >
              Horas Netas
            </Text>
            <Text
              style={[
                styles.metricValue,
                { color: TOKENS.colors.text.primary },
              ]}
            >
              {session.computedHours.toFixed(2)} h
            </Text>
          </Card>

          <Card
            variant="surface"
            style={[
              styles.metricCard,
              { borderColor: TOKENS.colors.primary, borderWidth: 1 },
            ]}
          >
            <Text
              style={[
                styles.metricLabel,
                { color: TOKENS.colors.text.secondary },
              ]}
            >
              Total Estimado
            </Text>
            <Text
              style={[styles.metricValue, { color: TOKENS.colors.primary }]}
            >
              ${session.computedPay.toFixed(2)}
            </Text>
            <Text
              style={[styles.metricLabel, { color: TOKENS.colors.text.muted }]}
              testID="session-rate-applied"
            >
              {t(state.domain.settings.language, "session_rate_applied", {
                rate: resolveSessionRate(session.pay, {
                  hourlyRate: state.domain.settings.hourlyRate,
                  overtimeMultiplier: state.domain.settings.overtimeMultiplier,
                }).hourlyRate.toFixed(2),
              })}
            </Text>
          </Card>
        </Animated.View>

        <SessionTimeline events={timelineEvents} />

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {!session.lifecycle.isDeleted && (
        <View
          style={[
            styles.actionFooter,
            { borderTopColor: TOKENS.colors.border },
          ]}
        >
          <Button
            label="Ajustar Registro"
            variant="secondary"
            onPress={() => setIsEditVisible(true)}
            style={styles.flexButton}
          />

          <Button
            label="Eliminar"
            variant="danger"
            onPress={() => setIsDeleteVisible(true)}
            style={styles.deleteButton}
          />
        </View>
      )}

      <EditSessionModal
        language={state.domain.settings.language}
        visible={isEditVisible}
        onCancel={() => setIsEditVisible(false)}
        onSave={handleSaveEdit}
      />

      <DeleteSessionModal
        language={state.domain.settings.language}
        visible={isDeleteVisible}
        onCancel={() => setIsDeleteVisible(false)}
        onConfirm={handleConfirmDelete}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: TOKENS.layout.screenPadding,
    paddingBottom: 120,
  },
  heroBlock: {
    marginBottom: TOKENS.spacing.lg,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: TOKENS.spacing.md,
  },
  dateText: {
    ...FONT.bodyStrong,
  },
  destinationText: {
    ...FONT.h2,
    marginBottom: TOKENS.spacing.xs,
  },
  idText: {
    ...FONT.caption,
  },
  metricsGrid: {
    flexDirection: "row",
    gap: TOKENS.spacing.md,
    marginBottom: TOKENS.spacing.lg,
  },
  metricCard: {
    flex: 1,
    padding: TOKENS.spacing.lg,
  },
  metricLabel: {
    ...FONT.label,
    marginBottom: TOKENS.spacing.xs,
  },
  metricValue: {
    ...FONT.h2,
  },
  bottomSpacer: {
    height: 60,
  },
  actionFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: TOKENS.spacing.md,
    padding: TOKENS.spacing.xl,
    paddingBottom: Platform.OS === "ios" ? 40 : TOKENS.spacing.xl,
    borderTopWidth: 1,
    backgroundColor: TOKENS.colors.background,
  },
  flexButton: {
    flex: 1,
  },
  deleteButton: {
    width: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    ...FONT.bodyStrong,
  },
});
