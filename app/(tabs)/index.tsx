import { now as getNow, todayDateString } from "../../src/utils/timeProvider";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import { TOKENS } from "../../src/constants/theme";

// Importaciones del Engine Canónico centralizadas
import { useWorkTracker } from "../../src/core/hooks";
import {
  selectEngineState,
  selectActiveSession,
} from "../../src/core/selectors";
import {
  calculateSessionDurationWithPause,
  calculatePay,
} from "../../src/utils/payrollUtils";

// Componentes de la UI centralizados
import {
  OperationalHeroCard,
  SystemHealthBlock,
  Button,
  ScreenContainer,
  PageHeader,
  Section,
} from "../../src/components/ui";

// Modales
import { DailySetupModal } from "../../src/components/modals/DailySetupModal";
import { LunchModal } from "../../src/components/modals/LunchModal";

export default function HomeScreen() {
  const { state, dispatch } = useWorkTracker();

  const [dailySetupVisible, setDailySetupVisible] = useState(false);
  const [lunchModalVisible, setLunchModalVisible] = useState(false);
  const [now, setNow] = useState(getNow());

  // Timer para actualizar la vista en tiempo real
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(getNow());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const engineState = selectEngineState(state);
  const activeSession = selectActiveSession(state);

  // Cálculos de tiempo y ganancias
  const { timeString, earnings } = useMemo(() => {
    if (!activeSession) {
      return { timeString: "--:--", earnings: "$0.00" };
    }

    const startTime =
      activeSession.actualStartAtMs || activeSession.declaredStartAtMs;

    const currentPauseMs =
      activeSession.lifecycle.domainStatus === "PAUSED" &&
      activeSession.lifecycle.lastPauseStartMs
        ? now - activeSession.lifecycle.lastPauseStartMs
        : 0;

    const durationMs = calculateSessionDurationWithPause(
      startTime,
      now,
      activeSession.lunch.taken ? 1 : 0,
      (activeSession.lifecycle.totalPausedMs || 0) + currentPauseMs,
      activeSession.lunch.startAtMs || undefined,
      activeSession.lunch.endAtMs || undefined,
    );

    const hours = durationMs / (1000 * 60 * 60);
    const { totalPay } = calculatePay(
      hours,
      state.domain.settings.hourlyRate,
      state.domain.settings.overtimeMultiplier,
    );

    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);

    return {
      timeString: `${h}h ${m}m`,
      earnings: `$${totalPay.toFixed(2)}`,
    };
  }, [activeSession, now, state.domain.settings]);

  const handleDailySetupConfirm = useCallback(
    (destination: string, address?: string) => {
      setDailySetupVisible(false);
      dispatch({
        type: "SESSION_CREATED",
        session: {
          domainStatus: "GEOFENCE_CREATED",
          id: getNow(),
          declaredStartAtMs: getNow(),
          lifecycle: {
            domainStatus: "GEOFENCE_CREATED",
            isDeleted: false,
            isManualEdit: false,
            locationConfirmed: false,
            totalPausedMs: 0,
            lastPauseStartMs: null,
          },
          destination: {
            address: address || destination,
            clientName: "General",
            targetLatitude: 34.0522,
            targetLongitude: -118.2437,
            setupLatitude: null,
            setupLongitude: null,
          },
          capturedLocation: {
            latitude: null,
            longitude: null,
          },
          lunch: {
            taken: false,
            startAtMs: null,
            endAtMs: null,
            deductedMinutes: null,
          },
          notes: {
            manualNote: null,
          },
          bookkeeping: {
            dateString: todayDateString(),
          },
        },
      });
    },
    [dispatch],
  );

  const handleClockOutPress = useCallback(() => {
    setLunchModalVisible(true);
  }, []);

  const handleLunchConfirm = useCallback(
    (minutes: number) => {
      setLunchModalVisible(false);
      if (!activeSession) return;

      if (minutes > 0) {
        dispatch({
          type: "SESSION_LUNCH_RECORDED",
          sessionId: activeSession.id,
          deductedMinutes: minutes,
        });
      }

      dispatch({
        type: "SESSION_CLOSED_MANUAL",
        sessionId: activeSession.id,
        endAtMs: getNow(),
      });
    },
    [activeSession, dispatch],
  );

  const handleTransitPress = useCallback(() => {
    if (!activeSession) return;
    dispatch({
      type: "SESSION_TRANSIT_STARTED",
      sessionId: activeSession.id,
    });
  }, [activeSession, dispatch]);

  const handlePausePress = useCallback(() => {
    if (!activeSession) return;
    dispatch({ type: "SESSION_PAUSED", sessionId: activeSession.id });
  }, [activeSession, dispatch]);

  const handleResumePress = useCallback(() => {
    if (!activeSession) return;
    dispatch({ type: "SESSION_RESUMED", sessionId: activeSession.id });
  }, [activeSession, dispatch]);

  const handlePrimaryAction = useCallback(() => {
    switch (engineState) {
      case "IDLE":
        setDailySetupVisible(true);
        break;
      case "GEOFENCE_CREATED":
      case "TRAVEL":
        if (activeSession) {
          dispatch({
            type: "SESSION_ARRIVAL_CONFIRMED_MANUAL",
            sessionId: activeSession.id,
            actualStartAtMs: getNow(),
          });
        }
        break;
      case "ACTIVE_WORK":
      case "PENDING_EXIT_CONFIRMATION":
        handleClockOutPress();
        break;
      case "PAUSED":
        handleResumePress();
        break;
      case "CLOSED":
        // Reset or Navigate Away? The proposal says "Finalizar y guardar"
        // In this implementation, we just clear the active session if it's already closed
        // Or maybe just show it's done.
        // For now, let's just do nothing or show a feedback.
        break;
    }
  }, [engineState, activeSession, dispatch, handleClockOutPress, handleResumePress]);

  const handleSecondaryAction = useCallback(() => {
    switch (engineState) {
      case "ACTIVE_WORK":
        handlePausePress();
        break;
      case "PAUSED":
      case "PENDING_EXIT_CONFIRMATION":
        handleClockOutPress();
        break;
      case "TRAVEL":
        // No secondary defined in proposal for TRAVEL
        break;
    }
  }, [engineState, handlePausePress, handleClockOutPress]);

  const handleCloseSession = useCallback(() => {
    dispatch({ type: "DATA_REFRESH_REQUESTED" });
  }, [dispatch]);

  return (
    <ScreenContainer noPadding testID="home-screen-container">
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <PageHeader
          title="GEOTrack"
          subtitle="Trazabilidad y Seguimiento"
          style={styles.header}
        />

        <OperationalHeroCard
          state={engineState as any}
          destination={activeSession?.destination.address || undefined}
          timeString={timeString}
          earnings={earnings}
          onPrimaryAction={handlePrimaryAction}
          onSecondaryAction={handleSecondaryAction}
        />

        <Section title="Control Operativo" style={styles.actionsSection}>
          {engineState === "IDLE" && (
            <Button
              label="CONFIGURAR JORNADA"
              variant="primary"
              onPress={() => setDailySetupVisible(true)}
            />
          )}

          {engineState === "GEOFENCE_CREATED" && (
            <Button
              label="CONFIRMAR LLEGADA MANUAL"
              variant="secondary"
              onPress={handlePrimaryAction}
            />
          )}

          {engineState === "ACTIVE_WORK" && (
            <View style={styles.rowActions}>
              <Button
                label="PAUSAR"
                variant="secondary"
                onPress={handlePausePress}
                style={styles.flexButton}
              />
              <Button
                label="TERMINAR"
                variant="danger"
                onPress={handleClockOutPress}
                style={styles.flexButton}
              />
            </View>
          )}

          {engineState === "PAUSED" && (
            <View style={styles.rowActions}>
              <Button
                label="REANUDAR"
                variant="primary"
                onPress={handleResumePress}
                style={styles.flexButton}
              />
              <Button
                label="TERMINAR"
                variant="danger"
                onPress={handleClockOutPress}
                style={styles.flexButton}
              />
            </View>
          )}

          {engineState === "PENDING_EXIT_CONFIRMATION" && (
            <View style={styles.rowActions}>
              <Button
                label="OTRO TRABAJO"
                variant="secondary"
                onPress={handleTransitPress}
                style={styles.flexButton}
              />
              <Button
                label="TERMINAR"
                variant="danger"
                onPress={handleClockOutPress}
                style={styles.flexButton}
              />
            </View>
          )}

          {engineState === "TRAVEL" && (
            <Button
              label="LLEGUE AL SITIO"
              variant="primary"
              onPress={handlePrimaryAction}
            />
          )}

          {engineState === "CLOSED" && (
            <Button
              label="FINALIZAR Y GUARDAR"
              variant="primary"
              onPress={handleCloseSession}
            />
          )}
        </Section>

        <SystemHealthBlock engineState={engineState as any} />
      </ScrollView>

      <DailySetupModal
        visible={dailySetupVisible}
        onCancel={() => setDailySetupVisible(false)}
        onConfirm={handleDailySetupConfirm}
      />

      <LunchModal
        visible={lunchModalVisible}
        onCancel={() => setLunchModalVisible(false)}
        onConfirm={(mins) => handleLunchConfirm(mins)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: TOKENS.spacing["3xl"],
  },
  header: {
    marginBottom: TOKENS.spacing.xs,
  },
  actionsSection: {
    marginTop: TOKENS.spacing.xl,
  },
  rowActions: {
    flexDirection: "row",
    gap: TOKENS.spacing.md,
  },
  flexButton: {
    flex: 1,
  },
});
