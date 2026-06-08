import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, SafeAreaView, Platform } from 'react-native';
import { PALETTE, SPACING } from '../../src/constants/theme';

// Importaciones del Engine Canónico (Fase 9)
import { useWorkTracker } from '../../src/core/hooks/useWorkTracker';
import { selectEngineState, selectActiveSession, selectSystemHealth } from '../../src/core/selectors';

// Componentes de la UI Reusables e Inmutables
import { AppBrandTitle } from '../../src/components/ui/AppBrandTitle';
import { OperationalHeroCard } from '../../src/components/OperationalHeroCard';
import { SystemHealthBlock } from '../../src/components/SystemHealthBlock';
import { Button } from '../../src/components/ui/Button';

// Modales del Flujo Maestro
import { DailySetupModal } from '../../src/components/modals/DailySetupModal';
import { LunchModal } from '../../src/components/modals/LunchModal';

/**
 * PANTALLA HOY (DASHBOARD PRINCIPAL)
 * Componente visual puro controlado de manera reactiva por el motor.
 * Carece de estados locales de negocio; solo maneja visibilidad de overlays de UI.
 */
export default function HomeScreen() {
  const { state, dispatch } = useWorkTracker();

  // Estados locales puros de control de renderizado de Modales (UI Overlay state)
  const [dailySetupVisible, setDailySetupVisible] = useState(false);
  const [lunchModalVisible, setLunchModalVisible] = useState(false);

  // Derivaciones en tiempo real mediante selectores puros (Verdad absoluta)
  const engineState = selectEngineState(state);
  const activeSession = selectActiveSession(state);
  const health = selectSystemHealth(state);

  /**
   * Disparador: Confirmación del modal de configuración inicial del día
   */
  const handleDailySetupConfirm = (destination: string, address?: string) => {
    setDailySetupVisible(false);
    
    // Despachamos el hecho formal al engine canónico
    dispatch({
      type: 'SESSION_CREATED',
      session: {
        id: Date.now(),
        declaredStartAtMs: Date.now(),
        lifecycle: {
          domainStatus: 'pending_arrival',
          isDeleted: false,
          isManualEdit: false,
          locationConfirmed: false,
        },
        destination: {
          address: address || destination,
          clientName: 'General',
          targetLatitude: 34.0522, // Inyectados por defecto para geocerca base
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
          dateString: new Date().toISOString().split('T')[0],
        },
      },
    });
  };

  /**
   * Disparador: Flujo de terminación de jornada (Abre encuesta de almuerzo)
   */
  const handleClockOutPress = () => {
    setLunchModalVisible(true);
  };

  /**
   * Disparador: Confirmación del almuerzo y posterior cierre formal
   */
  const handleLunchConfirm = (tookLunch: boolean, minutes: number) => {
    setLunchModalVisible(false);
    if (!activeSession) return;

    if (tookLunch) {
      dispatch({
        type: 'SESSION_LUNCH_RECORDED',
        sessionId: activeSession.id,
        deductedMinutes: minutes,
      });
    }

    // Despacho síncrono encadenado de finalización de jornada
    dispatch({
      type: 'SESSION_CLOSED_MANUAL',
      sessionId: activeSession.id,
      endAtMs: Date.now(),
    });
  };

  /**
   * Disparador: Transición manual a trayecto ("Otro Sitio")
   */
  const handleTransitPress = () => {
    if (!activeSession) return;
    dispatch({
      type: 'SESSION_TRANSIT_STARTED',
      sessionId: activeSession.id,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Encabezado e Identidad visual animada de la App */}
        <AppBrandTitle />

        {/* Tarjeta de Control Operacional Central */}
        <OperationalHeroCard 
          engineState={engineState} 
          sessionAddress={activeSession?.destination.address || null}
          startTimeMs={activeSession?.actualStartAtMs || activeSession?.declaredStartAtMs || null}
        />

        {/* Bloque de Acciones Dinámicas en función del Estado del Motor */}
        <View style={styles.actionsContainer}>
          {engineState === 'NO_INICIADA' && (
            <Button
              title="INICIAR JORNADA"
              type="primary"
              onPress={() => setDailySetupVisible(true)}
            />
          )}

          {engineState === 'ESPERANDO_LLEGADA' && (
            <Button
              title="FORZAR LLEGADA MANUAL"
              type="secondary"
              onPress={() => {
                if (activeSession) {
                  dispatch({
                    type: 'SESSION_ARRIVAL_CONFIRMED_MANUAL',
                    sessionId: activeSession.id,
                    actualStartAtMs: Date.now(),
                  });
                }
              }}
            />
          )}

          {(engineState === 'ACTIVA' || engineState === 'SALIDA_DETECTADA') && (
            <View style={styles.rowActions}>
              <View style={styles.flexButton}>
                <Button
                  title="OTRO SITIO"
                  type="secondary"
                  onPress={handleTransitPress}
                />
              </View>
              <View style={styles.flexButton}>
                <Button
                  title="TERMINAR"
                  type="destructive"
                  onPress={handleClockOutPress}
                />
              </View>
            </View>
          )}

          {engineState === 'EN_TRASLADO' && (
            <Button
              title="LLEGUE AL NUEVO SITIO"
              type="primary"
              onPress={() => {
                if (activeSession) {
                  dispatch({
                    type: 'SESSION_ARRIVAL_CONFIRMED_MANUAL',
                    sessionId: activeSession.id,
                    actualStartAtMs: Date.now(),
                  });
                }
              }}
            />
          )}
        </View>

        {/* Monitor reactivo de Salud de Infraestructura de Hardware (GPS/Sync) */}
        <SystemHealthBlock 
          isTracking={health.isGpsActive}
          isError={health.isGpsError}
          isSyncing={health.isSyncing}
        />

      </ScrollView>

      {/* Overlays Modales Controlados */}
      <DailySetupModal
        visible={dailySetupVisible}
        onCancel={() => setDailySetupVisible(false)}
        onConfirm={handleDailySetupConfirm}
      />

      <LunchModal
        visible={lunchModalVisible}
        onCancel={() => setLunchModalVisible(false)}
        onConfirm={(took) => handleLunchConfirm(took, 30)} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PALETTE.obsidian,
    paddingTop: Platform.OS === 'android' ? 40 : 0,
  },
  container: {
    flex: 1,
    backgroundColor: PALETTE.obsidian,
  },
  scrollContent: {
    paddingBottom: SPACING.xxl,
  },
  actionsContainer: {
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  rowActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  flexButton: {
    flex: 1,
  },
});
