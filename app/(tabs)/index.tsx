import { now as getNow, todayDateString } from "../../src/utils/timeProvider";
import React, { useState, useEffect, useMemo } from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import { TOKENS } from "../../src/constants/theme";

// Importaciones del Engine Canónico centralizadas
import { useWorkTracker } from "../../src/core/hooks";
import {
  selectEngineState,
  selectActiveSession,
} from "../../src/core/selectors";
import {
  calculateSessionDuration,
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
    const durationMs = calculateSessionDuration(
      startTime,
      now,
      activeSession.lunch.taken ? 1 : 0,
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

  const handleDailySetupConfirm = (destination: string, address?: string) => {
    setDailySetupVisible(false);
    dispatch({
      type: "SESSION_CREATED",
      session: {
        domainStatus: "GEOFENCECREATED",
        id: getNow(),
        declaredStartAtMs: getNow(),
        lifecycle: {
          domainStatus: "GEOFENCECREATED",
          isDeleted: false,
          isManualEdit: false,
          locationConfirmed: false,
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
  };

  const handleClockOutPress = () => {
    setLunchModalVisible(true);
  };

  const handleLunchConfirm = (minutes: number) => {
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
  };

  const handleTransitPress = () => {
    if (!activeSession) return;
    dispatch({
      type: "SESSION_TRANSIT_STARTED",
      sessionId: activeSession.id,
    });
  };

  const handlePrimaryAction = () => {
    if (engineState === "IDLE") {
      setDailySetupVisible(true);
    } else if (
      engineState === "GEOFENCECREATED" ||
      engineState === "TRAVEL"
    ) {
      if (activeSession) {
        dispatch({
          type: "SESSION_ARRIVAL_CONFIRMED_MANUAL",
          sessionId: activeSession.id,
          actualStartAtMs: getNow(),
        });
      }
    } else if (engineState === "ACTIVEWORK" || engineState === "PENDINGEXITCONFIRMATION") {
      handleClockOutPress();
    }
  };

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
          onSecondaryAction={
            engineState === "ACTIVEWORK" ? handleTransitPress : undefined
          }
        />

        <Section title="Acciones de Sesión" style={styles.actionsSection}>
          {engineState === "GEOFENCECREATED" && (
            <Button
              label="FORZAR LLEGADA MANUAL"
              variant="secondary"
              onPress={handlePrimaryAction}
              accessibilityHint="Confirma manualmente que has llegado al sitio de trabajo"
            />
          )}

          {(engineState === "ACTIVEWORK" || engineState === "PENDINGEXITCONFIRMATION") && (
            <View style={styles.rowActions}>
              <Button
                label="OTRO SITIO"
                variant="secondary"
                onPress={handleTransitPress}
                style={styles.flexButton}
                accessibilityLabel="Ir a otro sitio"
              />
              <Button
                label="TERMINAR"
                variant="danger"
                onPress={handleClockOutPress}
                style={styles.flexButton}
                accessibilityLabel="Finalizar jornada"
              />
            </View>
          )}

          {engineState === "TRAVEL" && (
            <Button
              label="LLEGUE AL NUEVO SITIO"
              variant="primary"
              onPress={handlePrimaryAction}
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
