import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, FlatList, Pressable, SafeAreaView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PALETTE, SPACING, FONT, RADIUS } from '../../src/constants/theme';
import { useWorkTracker } from '../../src/core/hooks';
import { selectComputedSessions } from '../../src/core/selectors';
import { formatDate, formatTime } from '../../src/utils/dateUtils';

/**
 * PANTALLA HISTORIAL
 */
export default function HistoryScreen() {
  const router = useRouter();
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
  }, [allSessions, activeFilter]);

  const renderFilterButton = (label: 'Todos' | 'Semana' | 'Mes') => (
    <Pressable accessibilityRole="button" accessibilityLabel={`Filtrar por ${label}`}
      style={[
        styles.filterButton,
        activeFilter === label && styles.filterButtonActive
      ]}
      onPress={() => setActiveFilter(label)}
    >
      <Text style={[
        styles.filterText,
        activeFilter === label && styles.filterTextActive
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
        style={styles.card}
        onPress={() => router.push(`/session/${item.id}`)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.dateText}>{dateStr}</Text>
          <View style={[styles.statusBadge, item.lifecycle.domainStatus === 'active' && styles.statusBadgeActive]}>
            <Text style={[styles.statusText, item.lifecycle.domainStatus === 'active' && styles.statusTextActive]}>
              {item.lifecycle.domainStatus === 'active' ? 'ACTIVA' : 'CERRADA'}
            </Text>
          </View>
        </View>

        <Text style={styles.addressText} numberOfLines={2}>
          {address}
        </Text>

        <View style={styles.timeRow}>
          <Ionicons name="time-outline" size={16} color={PALETTE.textSecondary} />
          <Text style={styles.timeText}>{timeStr}</Text>
          
          {item.lunch.taken && (
            <View style={styles.lunchBadge}>
              <Ionicons name="restaurant-outline" size={12} color={PALETTE.amberWarning} />
              <Text style={styles.lunchText}>Almuerzo (-${item.lunch.deductedMinutes || 60}m)</Text>
            </View>
          )}
        </View>

        <View style={styles.statsDivider} />
        
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>TIEMPO TOTAL</Text>
            <Text style={styles.statValue}>{item.computedHours.toFixed(2)}h</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>PAGO ESTIMADO</Text>
            <Text style={[styles.statValue, { color: PALETTE.mutedGold }]}>
              ${item.computedPay.toFixed(2)}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Historial</Text>
      </View>

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
            <Ionicons name="document-text-outline" size={48} color={PALETTE.steelLine} />
            <Text style={styles.emptyText}>No hay sesiones registradas.</Text>
          </View>
        }
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
  header: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  headerTitle: {
    ...FONT.h1,
    color: PALETTE.textPrimary,
  },
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
    backgroundColor: PALETTE.graphite,
    borderWidth: 1,
    borderColor: PALETTE.steelLine,
  },
  filterButtonActive: {
    backgroundColor: PALETTE.carbonMist,
    borderColor: PALETTE.mutedGold,
  },
  filterText: {
    ...FONT.caption,
    color: PALETTE.textSecondary,
  },
  filterTextActive: {
    color: PALETTE.mutedGold,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxl,
    gap: SPACING.lg,
  },
  card: {
    backgroundColor: PALETTE.carbonMist,
    borderRadius: RADIUS.cards,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: PALETTE.steelLine,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  dateText: {
    ...FONT.bodyStrong,
    color: PALETTE.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.round,
    backgroundColor: PALETTE.graphite,
  },
  statusBadgeActive: {
    backgroundColor: 'rgba(39, 174, 96, 0.1)',
  },
  statusText: {
    ...FONT.label,
    color: PALETTE.textSecondary,
  },
  statusTextActive: {
    color: PALETTE.successGreen,
  },
  addressText: {
    ...FONT.body,
    color: PALETTE.textSecondary,
    marginBottom: SPACING.md,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  timeText: {
    ...FONT.caption,
    color: PALETTE.textPrimary,
    flex: 1,
  },
  lunchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(242, 153, 74, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.round,
    gap: 4,
  },
  lunchText: {
    ...FONT.label,
    color: PALETTE.amberWarning,
  },
  statsDivider: {
    height: 1,
    backgroundColor: PALETTE.steelLine,
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
    ...FONT.label,
    color: PALETTE.textMuted,
    marginBottom: 2,
  },
  statValue: {
    ...FONT.bodyStrong,
    color: PALETTE.textPrimary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl * 2,
  },
  emptyText: {
    ...FONT.body,
    color: PALETTE.textMuted,
    marginTop: SPACING.md,
  },
});
