import { now } from "../../src/utils/timeProvider";
import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, SlideInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../../src/context/ThemeContext';
import { SPACING, RADIUS } from '../../src/constants/theme';
import { useWorkTracker } from '../../src/core/hooks';
import { selectComputedSessions, selectIsHydrated } from '../../src/core/selectors';
import { formatDate, formatTime } from '../../src/utils/dateUtils';
import {
  ScreenContainer,
  Button,
  IntegrityBadge,
  SessionTimeline,
  TimelineEvent,
  LoadingOverlay
} from '../../src/components/ui';
import { BadgeType } from '../../src/components/ui/IntegrityBadge';

// Modales
import { EditSessionModal } from '../../src/components/modals/EditSessionModal';
import { DeleteSessionModal } from '../../src/components/modals/DeleteSessionModal';

/**
 * DETALLE DE SESIÓN
 */
export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { state, dispatch } = useWorkTracker();

  const [isEditVisible, setIsEditVisible] = useState(false);
  const [isDeleteVisible, setIsDeleteVisible] = useState(false);

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
    dispatch({
      type: 'SESSION_EDITED_MANUAL',
      sessionId: sessionIdNum,
      startTime: now(),
      endTime: now(),
      note: 'Ajuste manual desde vista de detalle'
    });
  };

  const handleConfirmDelete = () => {
    setIsDeleteVisible(false);
    dispatch({
      type: 'SESSION_DELETED_SOFT',
      sessionId: sessionIdNum,
    });
    setTimeout(() => {
      router.back();
    }, 500);
  };

  const timelineEvents = useMemo(() => {
    if (!session) return [];

    const events: TimelineEvent[] = [
      {
        id: 'start',
        type: 'start',
        title: 'Jornada Declarada',
        time: formatTime(session.declaredStartAtMs),
      }
    ];

    if (session.actualStartAtMs) {
      events.push({
        id: 'arrival',
        type: 'arrival',
        title: 'Llegada Confirmada',
        time: formatTime(session.actualStartAtMs),
        subtitle: session.lifecycle.locationConfirmed ? 'Vía GPS' : 'Manual',
      });
    }

    if (session.endAtMs) {
      events.push({
        id: 'close',
        type: 'close',
        title: 'Cierre de Jornada',
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
      <ScreenContainer>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton} hitSlop={15}>
            <Ionicons name="close" size={28} color={colors.textPrimary} />
          </Pressable>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.steelLine} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>La sesión no existe o fue eliminada.</Text>
        </View>
      </ScreenContainer>
    );
  }

  const startTimeMs = session.actualStartAtMs || session.declaredStartAtMs;
  const badgeType: BadgeType = session.lifecycle.isManualEdit ? 'manual' : 'valid';

  return (
    <ScreenContainer noPadding>
      <LoadingOverlay visible={state.meta.bootState.isRehydrating} message="Actualizando sesión..." />
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton} hitSlop={15}>
          <Ionicons name="close" size={28} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Detalle de Sesión</Text>
        <View style={styles.headerSpacer} />
      </Animated.View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeInDown.delay(100).springify().damping(20)}
          style={[styles.heroBlock, { backgroundColor: colors.carbonMist, borderColor: colors.steelLine }]}
        >
          <View style={styles.heroTopRow}>
            <Text style={[styles.dateText, { color: colors.textSecondary }]}>{formatDate(startTimeMs)}</Text>
            <IntegrityBadge type={badgeType} />
          </View>

          <Text style={[styles.destinationText, { color: colors.textPrimary }]}>
            {session.destination.address || session.destination.clientName || 'Ubicación no especificada'}
          </Text>
          <Text style={[styles.idText, { color: colors.textMuted }]}>ID: TRK-{session.id}</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(200).springify().damping(20)}
          style={styles.metricsGrid}
        >
          <View style={[styles.metricCard, { backgroundColor: colors.graphite, borderColor: colors.steelLine }]}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Horas Netas</Text>
            <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{session.computedHours.toFixed(2)} h</Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: 'rgba(212, 175, 55, 0.05)', borderColor: colors.mutedGold }]}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Total Estimado</Text>
            <Text style={[styles.metricValue, { color: colors.mutedGold }]}>
              ${session.computedPay.toFixed(2)}
            </Text>
          </View>
        </Animated.View>

        <SessionTimeline events={timelineEvents} />

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {!session.lifecycle.isDeleted && (
        <Animated.View
          entering={SlideInDown.delay(400).springify().damping(20)}
          style={[styles.actionFooter, { backgroundColor: colors.obsidian, borderTopColor: colors.steelLine }]}
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
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
    fontSize: 18,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 28,
  },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
  },
  heroBlock: {
    borderRadius: RADIUS.cards,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
    borderWidth: 1,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
  },
  destinationText: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  idText: {
    fontSize: 13,
    fontWeight: '500',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  metricCard: {
    flex: 1,
    padding: SPACING.lg,
    borderRadius: RADIUS.cards,
    borderWidth: 1,
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: SPACING.xs,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
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
    borderTopWidth: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: SPACING.md,
  },
});
