import { now as getNow, todayDateString } from "../../src/utils/timeProvider";
import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { SPACING } from '../../src/constants/theme';

// Importaciones del Engine Canónico centralizadas
import { useWorkTracker } from '../../src/core/hooks';
import { selectEngineState, selectActiveSession } from '../../src/core/selectors';
import { calculateSessionDuration, calculatePay } from '../../src/utils/payrollUtils';

// Componentes de la UI centralizados
import {
  AppBrandTitle,
  OperationalHeroCard,
  SystemHealthBlock,
  Button,
  ScreenContainer
} from '../../src/components/ui';

// Modales
import { DailySetupModal } from '../../src/components/modals/DailySetupModal';
import { LunchModal } from '../../src/components/modals/LunchModal';

export default function HomeScreen() {
  const { state, dispatch } = useWorkTracker();

  const [dailySetupVisible, setDailySetupVisible] = useState(false);
  const [lunchModalVisible, setLunchModalVisible] = useState(false);
  const [now, setNow] = useState(getNow());

  // Timer para actualizar la vista en tiempo real si hay sesión activa
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(getNow());
    }, 10000); // Cada 10 segundos es suficiente para la UI
    return () => clearInterval(timer);
  }, []);

  const engineState = selectEngineState(state);
  const activeSession = selectActiveSession(state);

  // Cálculos de tiempo y ganancias en tiempo real para el HeroCard
  const { timeString, earnings } = useMemo(() => {
    if (!activeSession) {
      return { timeString: '--:--', earnings: '$0.00' };
    }

    const startTime = activeSession.actualStartAtMs || activeSession.declaredStartAtMs;
    const durationMs = calculateSessionDuration(
      startTime,
      now,
      activeSession.lunch.taken ? 1 : 0,
      activeSession.lunch.startAtMs || undefined,
      activeSession.lunch.endAtMs || undefined
    );

    const hours = durationMs / (1000 * 60 * 60);
    const { totalPay } = calculatePay(
      hours,
      state.domain.settings.hourlyRate,
      state.domain.settings.overtimeMultiplier
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
      type: 'SESSION_CREATED',
      session: {
        domainStatus: "pending_arrival",
        id: getNow(),
        declaredStartAtMs: getNow(),
        lifecycle: {
          domainStatus: 'pending_arrival',
          isDeleted: false,
          isManualEdit: false,
          locationConfirmed: false,
        },
        destination: {
          address: address || destination,
          clientName: 'General',
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
        type: 'SESSION_LUNCH_RECORDED',
        sessionId: activeSession.id,
        deductedMinutes: minutes,
      });
    }

    dispatch({
      type: 'SESSION_CLOSED_MANUAL',
      sessionId: activeSession.id,
      endAtMs: getNow(),
    });
  };

  const handleTransitPress = () => {
    if (!activeSession) return;
    dispatch({
      type: 'SESSION_TRANSIT_STARTED',
      sessionId: activeSession.id,
    });
  };

  const handlePrimaryAction = () => {
    if (engineState === 'NO_INICIADA') {
      setDailySetupVisible(true);
    } else if (engineState === 'ESPERANDO_LLEGADA' || engineState === 'EN_TRASLADO') {
      if (activeSession) {
        dispatch({
          type: 'SESSION_ARRIVAL_CONFIRMED_MANUAL',
          sessionId: activeSession.id,
          actualStartAtMs: getNow(),
        });
      }
    } else if (engineState === 'ACTIVA' || engineState === 'SALIDA_DETECTADA') {
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
        <View style={styles.brandContainer}>
          <AppBrandTitle />
        </View>

        <OperationalHeroCard
          state={engineState as any}
          destination={activeSession?.destination.address || undefined}
          timeString={timeString}
          earnings={earnings}
          onPrimaryAction={handlePrimaryAction}
          onSecondaryAction={engineState === 'ACTIVA' ? handleTransitPress : undefined}
        />

        <View style={styles.actionsContainer}>
          {engineState === 'ESPERANDO_LLEGADA' && (
            <Button
              label="FORZAR LLEGADA MANUAL"
              variant="secondary"
              onPress={handlePrimaryAction}
            />
          )}

          {(engineState === 'ACTIVA' || engineState === 'SALIDA_DETECTADA') && (
            <View style={styles.rowActions}>
              <View style={styles.flexButton}>
                <Button
                  label="OTRO SITIO"
                  variant="secondary"
                  onPress={handleTransitPress}
                />
              </View>
              <View style={styles.flexButton}>
                <Button
                  label="TERMINAR"
                  variant="danger"
                  onPress={handleClockOutPress}
                />
              </View>
            </View>
          )}

          {engineState === 'EN_TRASLADO' && (
            <Button
              label="LLEGUE AL NUEVO SITIO"
              variant="primary"
              onPress={handlePrimaryAction}
            />
          )}
        </View>

        <SystemHealthBlock
          engineState={engineState as any}
        />

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
    paddingBottom: SPACING.xxl,
  },
  brandContainer: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  actionsContainer: {
    marginHorizontal: SPACING.xl,
    marginVertical: SPACING.xl,
  },
  rowActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  flexButton: {
    flex: 1,
  },
});
