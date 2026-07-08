import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, FlatList, Pressable } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TOKENS, FONT } from '../../src/constants/theme';
import { useWorkTracker } from '../../src/core/hooks';
import { selectComputedSessions } from '../../src/core/selectors';
import { formatDate, formatTime } from '../../src/utils/dateUtils';
import {
  ScreenContainer,
  PageHeader,
  LoadingOverlay,
  EmptyState,
  Card,
  StatusPill
} from '../../src/components/ui';
import { ICONS } from '../../src/constants/icons';

/**
 * PANTALLA HISTORIAL
 */
export default function HistoryScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { state, dispatch } = useWorkTracker();
  const allSessions = selectComputedSessions(state);

  // Refrescar datos al ganar foco
  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      dispatch({ type: 'DATA_REFRESH_REQUESTED' });
    });
    return unsubscribe;
  }, [navigation, dispatch]);

  const [activeFilter, setActiveFilter] = useState<'Todos' | 'Semana' | 'Mes'>('Todos');

  const displaySessions = useMemo(() => {
    let filtered = [...allSessions];
    return filtered.sort((a, b) => {
      const timeA = a.actualStartAtMs || a.declaredStartAtMs;
      const timeB = b.actualStartAtMs || b.declaredStartAtMs;
      return timeB - timeA;
    });
  }, [allSessions]);

  const renderFilterButton = (label: 'Todos' | 'Semana' | 'Mes') => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Filtrar por ${label}`}
      accessibilityState={{ selected: activeFilter === label }}
      style={[
        styles.filterButton,
        {
          backgroundColor: TOKENS.colors.surface,
          borderColor: TOKENS.colors.border
        },
        activeFilter === label && {
          backgroundColor: `${TOKENS.colors.primary}15`,
          borderColor: TOKENS.colors.primary
        }
      ]}
      onPress={() => setActiveFilter(label)}
    >
      <Text style={[
        styles.filterText,
        { color: TOKENS.colors.text.secondary },
        activeFilter === label && { color: TOKENS.colors.primary, fontWeight: '700' }
      ]}>
        {label}
      </Text>
    </Pressable>
  );

  const renderSessionCard = ({ item }: { item: typeof allSessions[0] }) => {
    const startTimeMs = item.actualStartAtMs || item.declaredStartAtMs;
    const dateStr = formatDate(startTimeMs);
    const timeStr = `${formatTime(startTimeMs)} - ${item.endAtMs ? formatTime(item.endAtMs) : 'En curso'}`;
    const address = item.destination.address || 'Ubicación no especificada';
    const isActive = item.lifecycle.domainStatus === 'active';
    
    return (
      <Pressable 
        onPress={() => router.push(`/session/${item.id}` as any)}
        accessibilityRole="button"
        accessibilityLabel={`Ver detalle de sesión el ${dateStr}`}
      >
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={[styles.dateText, { color: TOKENS.colors.text.primary }]}>{dateStr}</Text>
            <StatusPill
              status={isActive ? 'active' : 'closed'}
              label={isActive ? 'ACTIVA' : 'CERRADA'}
            />
          </View>

          <Text style={[styles.addressText, { color: TOKENS.colors.text.secondary }]} numberOfLines={1}>
            {address}
          </Text>

          <View style={styles.timeRow}>
            <Ionicons name={ICONS.domain.time as any} size={14} color={TOKENS.colors.text.muted} />
            <Text style={[styles.timeText, { color: TOKENS.colors.text.primary }]}>{timeStr}</Text>

            {item.lunch.taken && (
              <View style={[styles.lunchBadge, { backgroundColor: `${TOKENS.colors.status.warning}15` }]}>
                <Ionicons name={ICONS.domain.lunch as any} size={12} color={TOKENS.colors.status.warning} />
                <Text style={[styles.lunchText, { color: TOKENS.colors.status.warning }]}>
                  Almuerzo (-${item.lunch.deductedMinutes || 60}m)
                </Text>
              </View>
            )}
          </View>

          <View style={[styles.statsDivider, { backgroundColor: TOKENS.colors.border }]} />
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: TOKENS.colors.text.muted }]}>TIEMPO TOTAL</Text>
              <Text style={[styles.statValue, { color: TOKENS.colors.text.primary }]}>{item.computedHours.toFixed(2)}h</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: TOKENS.colors.text.muted }]}>PAGO ESTIMADO</Text>
              <Text style={[styles.statValue, { color: TOKENS.colors.primary }]}>
                ${item.computedPay.toFixed(2)}
              </Text>
            </View>
            <Ionicons name={ICONS.actions.forward as any} size={20} color={TOKENS.colors.text.muted} style={styles.chevron} />
          </View>
        </Card>
      </Pressable>
    );
  };

  return (
    <ScreenContainer noPadding testID="history-screen-container">
      <LoadingOverlay visible={state.meta.bootState.isRehydrating} message="Cargando historial..." />
      <PageHeader title="Historial" />

      <View style={styles.filterRow}>
        {renderFilterButton('Todos')}
        {renderFilterButton('Semana')}
        {renderFilterButton('Mes')}
      </View>

      <FlatList
        data={displaySessions}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderSessionCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            title="Sin registros"
            description="Aún no tienes sesiones laborales en tu historial."
            icon={ICONS.domain.report}
          />
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: TOKENS.layout.screenPadding,
    marginBottom: TOKENS.spacing.md,
    gap: TOKENS.spacing.sm,
  },
  filterButton: {
    paddingVertical: TOKENS.spacing.sm,
    paddingHorizontal: TOKENS.spacing.lg,
    borderRadius: TOKENS.radius.round,
    borderWidth: 1,
  },
  filterText: {
    ...FONT.caption,
  },
  listContent: {
    paddingHorizontal: TOKENS.layout.screenPadding,
    paddingBottom: TOKENS.spacing['3xl'],
    gap: TOKENS.spacing.lg,
  },
  card: {
    // Estilos base manejados por el componente Card
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: TOKENS.spacing.sm,
  },
  dateText: {
    ...FONT.bodyStrong,
  },
  addressText: {
    ...FONT.body,
    marginBottom: TOKENS.spacing.md,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: TOKENS.spacing.md,
    gap: TOKENS.spacing.sm,
  },
  timeText: {
    ...FONT.caption,
    flex: 1,
  },
  lunchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: TOKENS.spacing.sm,
    paddingVertical: 2,
    borderRadius: TOKENS.radius.round,
    gap: 4,
  },
  lunchText: {
    ...FONT.label,
  },
  statsDivider: {
    height: 1,
    marginBottom: TOKENS.spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    ...FONT.label,
    marginBottom: 2,
  },
  statValue: {
    ...FONT.bodyStrong,
  },
  chevron: {
    marginLeft: TOKENS.spacing.sm,
  },
});
