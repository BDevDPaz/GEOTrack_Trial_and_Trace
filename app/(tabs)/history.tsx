import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/context/ThemeContext';
import { SPACING, RADIUS } from '../../src/constants/theme';
import { useWorkTracker } from '../../src/core/hooks';
import { selectComputedSessions } from '../../src/core/selectors';
import { formatDate, formatTime } from '../../src/utils/dateUtils';
import { ScreenContainer, PageHeader } from '../../src/components/ui';

/**
 * PANTALLA HISTORIAL
 */
export default function HistoryScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { state } = useWorkTracker();
  const allSessions = selectComputedSessions(state);

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
    <Pressable accessibilityRole="button" accessibilityLabel={`Filtrar por ${label}`}
      style={[
        styles.filterButton,
        { backgroundColor: colors.graphite, borderColor: colors.steelLine },
        activeFilter === label && { backgroundColor: colors.carbonMist, borderColor: colors.mutedGold }
      ]}
      onPress={() => setActiveFilter(label)}
    >
      <Text style={[
        styles.filterText,
        { color: colors.textSecondary },
        activeFilter === label && { color: colors.mutedGold, fontWeight: '700' }
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
    
    return (
      <Pressable 
        style={[styles.card, { backgroundColor: colors.carbonMist, borderColor: colors.steelLine }]}
        onPress={() => router.push(`/session/${item.id}`)}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.dateText, { color: colors.textPrimary }]}>{dateStr}</Text>
          <View style={[styles.statusBadge, { backgroundColor: colors.graphite }, item.lifecycle.domainStatus === 'active' && { backgroundColor: 'rgba(39, 174, 96, 0.1)' }]}>
            <Text style={[styles.statusText, { color: colors.textSecondary }, item.lifecycle.domainStatus === 'active' && { color: colors.successGreen }]}>
              {item.lifecycle.domainStatus === 'active' ? 'ACTIVA' : 'CERRADA'}
            </Text>
          </View>
        </View>

        <Text style={[styles.addressText, { color: colors.textSecondary }]} numberOfLines={2}>
          {address}
        </Text>

        <View style={styles.timeRow}>
          <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.timeText, { color: colors.textPrimary }]}>{timeStr}</Text>
          
          {item.lunch.taken && (
            <View style={[styles.lunchBadge, { backgroundColor: 'rgba(242, 153, 74, 0.1)' }]}>
              <Ionicons name="restaurant-outline" size={12} color={colors.amberWarning} />
              <Text style={[styles.lunchText, { color: colors.amberWarning }]}>Almuerzo (-${item.lunch.deductedMinutes || 60}m)</Text>
            </View>
          )}
        </View>

        <View style={[styles.statsDivider, { backgroundColor: colors.steelLine }]} />
        
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>TIEMPO TOTAL</Text>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{item.computedHours.toFixed(2)}h</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>PAGO ESTIMADO</Text>
            <Text style={[styles.statValue, { color: colors.mutedGold }]}>
              ${item.computedPay.toFixed(2)}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <ScreenContainer noPadding testID="history-screen-container">
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
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={48} color={colors.steelLine} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No hay sesiones registradas.</Text>
          </View>
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: RADIUS.round,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxl,
    gap: SPACING.lg,
  },
  card: {
    borderRadius: RADIUS.cards,
    padding: SPACING.lg,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.round,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  addressText: {
    fontSize: 16,
    fontWeight: '400',
    marginBottom: SPACING.md,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  lunchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.round,
    gap: 4,
  },
  lunchText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  statsDivider: {
    height: 1,
    marginBottom: SPACING.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl * 2,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '400',
    marginTop: SPACING.md,
  },
});
