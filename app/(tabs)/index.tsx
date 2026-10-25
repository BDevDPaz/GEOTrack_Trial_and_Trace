import {
  buildChainedTransitEvent,
  effectiveStartMs,
  lunchAlreadyTakenOnDay,
} from "../../src/core/transit/chainTransit";
import { Alert } from "react-native";
import { t } from "../../src/utils/i18n";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { TOKENS } from "../../src/constants/theme";
import { useWorkTracker } from "../../src/core/hooks";
import {
  selectActiveSession,
  selectEngineState,
} from "../../src/core/selectors";
import {
  calculatePay,
  calculateSessionDurationWithPause,
  resolveSessionRate,
} from "../../src/utils/payrollUtils";
import { now as getNow, todayDateString } from "../../src/utils/timeProvider";

import {
  Button,
  OperationalHeroCard,
  PageHeader,
  ScreenContainer,
  Section,
  SystemHealthBlock,
} from "../../src/components/ui";

import {
  DailySetupModal,
  type ResolvedStart,
} from "../../src/components/modals/DailySetupModal";
import { LunchModal } from "../../src/components/modals/LunchModal";

export default function HomeScreen() {
  const { state, dispatch } = useWorkTracker();

  const [dailySetupVisible, setDailySetupVisible] = useState(false);
  const [lunchModalVisible, setLunchModalVisible] = useState(false);
  const [now, setNow] = useState(getNow());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(getNow());
    }, 10000);

    return () => clearInterval(timer);
  }, []);

  const engineState = selectEngineState(state);
  const activeSession = selectActiveSession(state);

  const { timeString, earnings } = useMemo(() => {
    if (!activeSession) {
      return { timeString: "--:--", earnings: "$0.00" };
    }

    const startTime =
      effectiveStartMs(activeSession);

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
    const rate = resolveSessionRate(activeSession.pay, state.domain.settings);
    const { totalPay } = calculatePay(
      hours,
      rate.hourlyRate,
      rate.overtimeMultiplier,
    );

    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);

    return {
      timeString: `${h}h ${m}m`,
      earnings: `$${totalPay.toFixed(2)}`,
    };
  }, [activeSession, now, state.domain.settings]);

  const handleDailySetupConfirm = useCallback(
    (destination: string, resolved: ResolvedStart) => {
      setDailySetupVisible(false);
      // Fase C (7): un tramo TRAVEL encadenado recibe destino, no jornada nueva.
      if (
        activeSession &&
        activeSession.lifecycle.domainStatus === "TRAVEL" &&
        activeSession.parentSessionId != null
      ) {
        dispatch({
          type: "SESSION_DESTINATION_SET",
          sessionId: activeSession.id,
          address: resolved.address || destination,
          targetLatitude: resolved.target.latitude,
          targetLongitude: resolved.target.longitude,
          setupLatitude: resolved.setup?.latitude,
          setupLongitude: resolved.setup?.longitude,
          identifier: `SESSION_${activeSession.id}`,
        } as any);
        return;
      }
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
            address: resolved.address || destination,
            clientName: "General",
            targetLatitude: resolved.target.latitude,
            targetLongitude: resolved.target.longitude,
            setupLatitude: resolved.setup?.latitude ?? null,
            setupLongitude: resolved.setup?.longitude ?? null,
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
        targetLatitude: resolved.target.latitude,
        targetLongitude: resolved.target.longitude,
        setupLatitude: resolved.setup?.latitude,
        setupLongitude: resolved.setup?.longitude,
      });
    },
    [dispatch, activeSession],
  );

  // Fase C (7): si el tramo se creó desde la notificación, pedir destino al abrir.
  const promptedLegRef = React.useRef<number | null>(null);
  useEffect(() => {
    if (
      activeSession &&
      activeSession.lifecycle.domainStatus === "TRAVEL" &&
      activeSession.parentSessionId != null &&
      activeSession.destination.targetLatitude == null &&
      promptedLegRef.current !== activeSession.id
    ) {
      promptedLegRef.current = activeSession.id;
      setDailySetupVisible(true);
    }
  }, [activeSession]);

  const handleClockOutPress = useCallback(() => {
    // Fase C (7): si otro tramo del día ya descontó almuerzo, no volver a pedirlo.
    if (
      activeSession &&
      lunchAlreadyTakenOnDay(
        Object.values(state.domain.sessions.byId),
        activeSession.bookkeeping.dateString,
        activeSession.id,
      )
    ) {
      dispatch({
        type: "SESSION_CLOSED_MANUAL",
        sessionId: activeSession.id,
        endAtMs: getNow(),
      });
      return;
    }
    setLunchModalVisible(true);
  }, [activeSession, dispatch, state.domain.sessions.byId]);

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
    // Fase C (7): cerrar la jornada y abrir un tramo encadenado; luego
    // pedir el nuevo destino con el Daily Setup.
    const chained = buildChainedTransitEvent(activeSession, {
      nowMs: getNow(),
      lastExitTimestampMs: state.runtime.geofence.lastExitTimestampMs ?? null,
      newId: getNow(),
    });
    if (chained) {
      dispatch(chained);
      setDailySetupVisible(true);
      return;
    }
    dispatch({
      type: "SESSION_TRANSIT_STARTED",
      sessionId: activeSession.id,
    });
  }, [activeSession, dispatch, state.runtime.geofence.lastExitTimestampMs]);

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
        // Fase C (7): tramo encadenado aún sin destino → pedirlo primero.
        if (
          activeSession &&
          activeSession.parentSessionId != null &&
          activeSession.destination.targetLatitude == null
        ) {
          setDailySetupVisible(true);
          break;
        }
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
        break;
    }
  }, [
    engineState,
    activeSession,
    dispatch,
    handleClockOutPress,
    handleResumePress,
  ]);

  // Fase C (8): cancelar un trayecto sin llegada (soft delete, no paga).
  const canCancelTrip =
    !!activeSession &&
    activeSession.actualStartAtMs == null &&
    (activeSession.lifecycle.domainStatus === "GEOFENCE_CREATED" ||
      activeSession.lifecycle.domainStatus === "TRAVEL");

  const handleCancelTripPress = useCallback(() => {
    if (!activeSession || !canCancelTrip) return;
    const sessionId = activeSession.id;
    const lang = state.domain.settings.language;
    Alert.alert(
      t(lang, "cancel_trip_title"),
      t(lang, "cancel_trip_msg"),
      [
        { text: t(lang, "cancel_trip_back"), style: "cancel" },
        {
          text: t(lang, "cancel_trip_title"),
          style: "destructive",
          onPress: () =>
            dispatch({ type: "SESSION_PENDING_CANCELLED", sessionId }),
        },
      ],
    );
  }, [activeSession, canCancelTrip, dispatch, state.domain.settings.language]);

  const handleSecondaryAction = useCallback(() => {
    switch (engineState) {
      case "ACTIVE_WORK":
        handlePausePress();
        break;

      case "PAUSED":
        handleClockOutPress();
        break;

      case "GEOFENCE_CREATED":
      case "TRAVEL":
        handleCancelTripPress();
        break;

      // Fase C (7): el botón ya decía "Otro trabajo" pero cerraba la jornada.
      case "PENDING_EXIT_CONFIRMATION":
        handleTransitPress();
        break;

      default:
        break;
    }
  }, [
    engineState,
    handlePausePress,
    handleClockOutPress,
    handleTransitPress,
    handleCancelTripPress,
  ]);

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
          canCancel={canCancelTrip}
          language={state.domain.settings.language}
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
        language={state.domain.settings.language}
        distanceWarningMeters={state.domain.settings.distanceWarningMeters}
      />

      <LunchModal
        language={state.domain.settings.language}
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
