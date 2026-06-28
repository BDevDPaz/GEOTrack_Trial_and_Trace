import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeInDown, SlideInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { PALETTE, RADIUS, SPACING, FONT } from '../../src/constants/theme';
import { IntegrityBadge, BadgeType } from '../../src/components/ui/IntegrityBadge';
import { Button } from '../../src/components/ui/Button';
import { EditSessionModal } from '../../src/components/modals/EditSessionModal';
import { DeleteSessionModal } from '../../src/components/modals/DeleteSessionModal';

// Importaciones del motor canónico
import { useWorkTracker } from '../../src/core/hooks/useWorkTracker';
import { selectComputedSessions } from '../../src/core/selectors';
import { formatDate, formatTime } from '../../src/utils/dateUtils';

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  
  // Extraemos el estado y el despachador de nuestro motor global
  const { state, dispatch } = useWorkTracker();

  // Estados locales para controlar la visibilidad de los modales
  const [isEditVisible, setIsEditVisible] = useState(false);
  const [isDeleteVisible, setIsDeleteVisible] = useState(false);

  // Buscamos la sesión correspondiente usando el ID de la URL
  const sessionIdNum = Number(id);
  const allSessions = selectComputedSessions(state);
  const session = useMemo(() => {
    return allSessions.find(s => s.id === sessionIdNum);
  }, [allSessions, sessionIdNum]);

  const handleBack = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  const handleSaveEdit = () => {
    setIsEditVisible(false);
    // Nota: Aquí, la lógica real del modal de edición debe devolver los tiempos y notas.
    // Para ilustrar la conexión con el engine, disparamos el evento con datos simulados del formulario.
    // Deberás pasar los valores reales desde el modal en una implementación completa.
    dispatch({
      type: 'SESSION_EDITED_MANUAL',
      sessionId: sessionIdNum,
      startTime: Date.now(), // Sustituir por el valor real del input del modal
      endTime: Date.now(),   // Sustituir por el valor real del input del modal
      note: 'Ajuste manual desde vista de detalle' // Sustituir por el valor real del input
    });
  };

  const handleConfirmDelete = () => {
    setIsDeleteVisible(false);
    dispatch({
      type: 'SESSION_DELETED_SOFT',
      sessionId: sessionIdNum,
    });
    // Regresamos a la pantalla anterior tras eliminar
    setTimeout(() => {
      router.back();
    }, 500);
  };

  // Si no encontramos la sesión (ej. fue eliminada o el ID es inválido), mostramos un fallback seguro.
  if (!session) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton} hitSlop={15} accessibilityRole="button" accessibilityLabel="Cerrar detalle">
            <Ionicons name="close" size={28} color={PALETTE.textPrimary} />
          </Pressable>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={PALETTE.steelLine} />
          <Text style={styles.emptyText}>La sesión no existe o fue eliminada.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Preparamos los datos para renderizar la interfaz
  const startTimeMs = session.actualStartAtMs || session.declaredStartAtMs;
  const badgeType: BadgeType = session.lifecycle.isManualEdit ? 'manual' : 'valid';

  return (
    <SafeAreaView style={styles.safeArea}>
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton} hitSlop={15} accessibilityRole="button" accessibilityLabel="Cerrar detalle">
          <Ionicons name="close" size={28} color={PALETTE.textPrimary} />
        </Pressable>

        <Text style={styles.headerTitle}>Detalle de Sesión</Text>

        <View style={styles.headerSpacer} />
      </Animated.View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeInDown.delay(100).springify().damping(20)}
          style={styles.heroBlock}
        >
          <View style={styles.heroTopRow}>
            <Text style={styles.dateText}>{formatDate(startTimeMs)}</Text>
            <IntegrityBadge type={badgeType} />
          </View>

          <Text style={styles.destinationText}>
            {session.destination.address || session.destination.clientName || 'Ubicación no especificada'}
          </Text>
          <Text style={styles.idText}>ID: TRK-{session.id}</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(200).springify().damping(20)}
          style={styles.metricsGrid}
        >
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Horas Netas</Text>
            <Text style={styles.metricValue}>{session.computedHours.toFixed(2)} h</Text>
          </View>

          <View style={[styles.metricCard, styles.highlightMetricCard]}>
            <Text style={styles.metricLabel}>Total Estimado</Text>
            <Text style={[styles.metricValue, styles.highlightMetricValue]}>
              ${session.computedPay.toFixed(2)}
            </Text>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(300).springify().damping(20)}
          style={styles.timelineBlock}
        >
          <Text style={styles.sectionTitle}>Registro de Eventos</Text>

          {/* Evento: Jornada Iniciada */}
          <View style={styles.timelineNode}>
            <View style={[styles.nodeDot, styles.nodeDotStart]} />
            <View style={styles.nodeLine} />
            <View style={styles.nodeContent}>
              <Text style={styles.nodeTitle}>Jornada Declarada</Text>
              <Text style={styles.nodeTime}>{formatTime(session.declaredStartAtMs)}</Text>
            </View>
          </View>

          {/* Evento: Llegada Confirmada (Solo si existe) */}
          {session.actualStartAtMs && (
            <View style={styles.timelineNode}>
              <View style={[styles.nodeDot, styles.nodeDotArrival]} />
              <View style={session.endAtMs ? styles.nodeLine : {}} />
              <View style={styles.nodeContent}>
                <Text style={styles.nodeTitle}>Llegada Confirmada</Text>
                <Text style={styles.nodeTime}>
                  {formatTime(session.actualStartAtMs)} • {session.lifecycle.locationConfirmed ? 'GPS' : 'Manual'}
                </Text>
              </View>
            </View>
          )}

          {/* Evento: Cierre de Jornada (Solo si existe) */}
          {session.endAtMs && (
            <View style={styles.timelineNode}>
              <View style={[styles.nodeDot, styles.nodeDotClose]} />
              <View style={styles.nodeContent}>
                <Text style={styles.nodeTitle}>Cierre de Jornada</Text>
                <Text style={styles.nodeTime}>{formatTime(session.endAtMs)}</Text>
              </View>
            </View>
          )}
        </Animated.View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Solo permitimos editar/eliminar si la sesión no ha sido eliminada lógicamente */}
      {!session.lifecycle.isDeleted && (
        <Animated.View
          entering={SlideInDown.delay(400).springify().damping(20)}
          style={styles.actionFooter}
        >
          <Button
            label="Ajustar Registro"
            variant="secondary"
            onPress={() => setIsEditVisible(true)}
            style={{ flex: 1 }}
          />

          <Button
            label="Eliminar"
            variant="danger"
            onPress={() => setIsDeleteVisible(true)}
            style={{ width: 100 }}
          />
        </Animated.View>
      )}

      <EditSessionModal
        visible={isEditVisible}
        onCancel={() => setIsEditVisible(false)}
        onSave={handleSaveEdit}
      />

      <DeleteSessionModal
        visible={isDeleteVisible}
        onCancel={() => setIsDeleteVisible(false)}
        onConfirm={handleConfirmDelete}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PALETTE.obsidian,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: SPACING.xl,
    marginTop: Platform.OS === 'android' ? 40 : SPACING.md,
    marginBottom: SPACING.lg,
  },
  backButton: {
    padding: 4,
    marginLeft: -4,
  },
  headerTitle: {
    ...FONT.h3,
    fontSize: 18,
    color: PALETTE.textPrimary,
  },
  headerSpacer: {
    width: 28,
  },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
  },
  heroBlock: {
    backgroundColor: PALETTE.carbonMist,
    borderRadius: RADIUS.cards,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: PALETTE.steelLine,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  dateText: {
    ...FONT.bodyStrong,
    color: PALETTE.textSecondary,
  },
  destinationText: {
    fontSize: 22,
    fontWeight: '700',
    color: PALETTE.textPrimary,
    marginBottom: SPACING.xs,
  },
  idText: {
    ...FONT.caption,
    color: PALETTE.textMuted,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  metricCard: {
    flex: 1,
    backgroundColor: PALETTE.graphite,
    padding: SPACING.lg,
    borderRadius: RADIUS.cards,
    borderWidth: 1,
    borderColor: PALETTE.steelLine,
  },
  highlightMetricCard: {
    backgroundColor: 'rgba(212, 175, 55, 0.05)',
    borderColor: PALETTE.mutedGold,
  },
  metricLabel: {
    ...FONT.caption,
    color: PALETTE.textSecondary,
    marginBottom: SPACING.xs,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: PALETTE.textPrimary,
  },
  highlightMetricValue: {
    color: PALETTE.mutedGold,
  },
  timelineBlock: {
    backgroundColor: PALETTE.carbonMist,
    borderRadius: RADIUS.cards,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: PALETTE.steelLine,
  },
  sectionTitle: {
    ...FONT.h3,
    fontSize: 16,
    color: PALETTE.textPrimary,
    marginBottom: SPACING.xl,
  },
  timelineNode: {
    flexDirection: 'row',
    marginBottom: SPACING.lg,
    position: 'relative',
  },
  nodeContent: {
    flex: 1,
  },
  nodeDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginTop: 4,
    marginRight: SPACING.md,
    zIndex: 2,
  },
  nodeDotStart: {
    backgroundColor: PALETTE.mutedGold,
  },
  nodeDotArrival: {
    backgroundColor: PALETTE.successGreen,
  },
  nodeDotClose: {
    backgroundColor: PALETTE.carbonMist,
    borderColor: PALETTE.steelLine,
    borderWidth: 1,
  },
  nodeLine: {
    position: 'absolute',
    left: 6,
    top: 18,
    bottom: -24,
    width: 2,
    backgroundColor: PALETTE.steelLine,
    zIndex: 1,
  },
  nodeTitle: {
    ...FONT.bodyStrong,
    color: PALETTE.textPrimary,
  },
  nodeTime: {
    ...FONT.caption,
    color: PALETTE.textSecondary,
    marginTop: 4,
  },
  bottomSpacer: {
    height: 100,
  },
  actionFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: SPACING.md,
    padding: SPACING.xl,
    paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.xl,
    backgroundColor: PALETTE.obsidian,
    borderTopWidth: 1,
    borderTopColor: PALETTE.steelLine,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    ...FONT.bodyStrong,
    color: PALETTE.textSecondary,
    marginTop: SPACING.md,
  },
});
