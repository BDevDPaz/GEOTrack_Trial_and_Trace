import React from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
// Importaciones actualizadas según el nuevo ecosistema
import { useTheme } from '../../context/ThemeContext';
import { getSpringConfig } from '../../constants/animations';
import { RADIUS, FONT, SPACING } from '../../constants/theme';

export type PillStatus =
  | 'idle'
  | 'pending'
  | 'active'
  | 'warning'
  | 'error'
  | 'closed';

interface StatusPillProps {
  status: PillStatus;
  label: string;
}

export function StatusPill({ status, label }: StatusPillProps) {
  // Desestructuramos colors del contexto para tematización dinámica
  const { colors } = useTheme();
  // Centralizamos la configuración de físicas (resortes)
  const springConfig = getSpringConfig();

  const getConfig = () => {
    switch (status) {
      case 'idle':
        return {
          bg: colors.graphite,
          text: colors.textSecondary,
          icon: 'pause-outline' as const,
        };
      case 'pending':
        return {
          bg: 'rgba(92, 124, 250, 0.1)', // Fondo translúcido con opacidad controlada
          text: colors.slateBlue,
          icon: 'time-outline' as const,
        };
      case 'active':
        return {
          bg: 'rgba(212, 175, 55, 0.1)',
          text: colors.mutedGold,
          icon: 'play-outline' as const,
        };
      case 'warning':
        return {
          bg: 'rgba(242, 153, 74, 0.1)',
          text: colors.amberWarning,
          icon: 'warning-outline' as const,
        };
      case 'error':
        return {
          bg: 'rgba(235, 87, 87, 0.1)',
          text: colors.deepRed,
          icon: 'alert-circle-outline' as const,
        };
      case 'closed':
        return {
          bg: 'rgba(39, 174, 96, 0.1)',
          text: colors.successGreen,
          icon: 'checkmark-done-outline' as const,
        };
      default:
        return {
          bg: colors.graphite,
          text: colors.textSecondary,
          icon: 'pause-outline' as const,
        };
    }
  };

  const config = getConfig();

  return (
    <Animated.View
      layout={LinearTransition.springify()
        .damping(springConfig.damping)
        .stiffness(springConfig.stiffness)}
      style={[styles.pill, { backgroundColor: config.bg }]}
    >
      <Ionicons
        name={config.icon}
        size={14}
        color={config.text}
        style={styles.icon}
      />

      <Text style={[styles.label, { color: config.text }]}>
        {label}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.round, // Mantenemos RADIUS estático por ser estructural
    alignSelf: 'flex-start',
  },

  icon: {
    marginRight: SPACING.xs,
  },

  label: {
    ...FONT.caption,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
