import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

// Importaciones adaptadas a la nueva arquitectura
import { useTheme } from '../../context/ThemeContext';
import { getSpringConfig } from '../../constants/animations';
import { RADIUS, FONT, SPACING } from '../../constants/theme';

interface DailySummaryBlockProps {
  hours: string;
  earnings: string;
}

export function DailySummaryBlock({ hours, earnings }: DailySummaryBlockProps) {
  // Consumo dinámico del tema y físicas de animación
  const { colors } = useTheme();
  const springConfig = getSpringConfig();

  return (
    <Animated.View
      entering={FadeInDown.delay(100)
        .springify()
        .damping(springConfig.damping)
        .stiffness(springConfig.stiffness)}
      style={[
        styles.block,
        {
          backgroundColor: colors.graphite,
          borderColor: colors.steelLine,
        },
      ]}
    >
      <View style={styles.metricZone}>
        <View style={styles.metricHeader}>
          <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
            Horas registradas
          </Text>
        </View>

        <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
          {hours}
        </Text>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.steelLine }]} />

      <View style={styles.metricZone}>
        <View style={styles.metricHeader}>
          <Ionicons name="cash-outline" size={16} color={colors.mutedGold} />
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
            Ganancias estimadas
          </Text>
        </View>

        <Text style={[styles.metricValue, { color: colors.mutedGold }]}>
          {earnings}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  block: {
    flexDirection: 'row',
    marginHorizontal: SPACING.xl,
    padding: 18,
    borderRadius: RADIUS.cards,
    marginBottom: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
    // BackgroundColor y borderColor se aplican dinámicamente en el JSX
  },
  metricZone: {
    flex: 1,
    alignItems: 'center',
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  metricLabel: {
    ...FONT.caption,
    // Color se aplica dinámicamente en el JSX
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    // Color se aplica dinámicamente en el JSX
  },
  divider: {
    width: 1,
    height: 40,
    // BackgroundColor se aplica dinámicamente en el JSX
  },
});
