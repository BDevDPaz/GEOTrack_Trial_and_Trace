import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

// Importaciones adaptadas a la nueva arquitectura
import { useTheme } from '../../context/ThemeContext';
import { getSpringConfig } from '../../constants/animations';
import { FONT } from '../../constants/theme';

export type BadgeType = 'valid' | 'manual' | 'auto' | 'warning' | 'error';

interface IntegrityBadgeProps {
  type: BadgeType;
}

export function IntegrityBadge({ type }: IntegrityBadgeProps) {
  // Inyección de tokens dinámicos y configuración de animaciones
  const { colors } = useTheme();
  const springConfig = getSpringConfig();

  const getConfig = () => {
    switch (type) {
      case 'valid':
        return {
          label: 'Correcto',
          color: colors.successGreen,
          icon: 'checkmark-circle-outline' as const,
        };
      case 'manual':
        return {
          label: 'Ajustado',
          color: colors.textSecondary,
          icon: 'create-outline' as const,
        };
      case 'auto':
        return {
          label: 'Automático',
          color: colors.slateBlue,
          icon: 'time-outline' as const,
        };
      case 'warning':
        return {
          label: 'Revisar',
          color: colors.amberWarning,
          icon: 'warning-outline' as const,
        };
      case 'error':
        return {
          label: 'Error',
          color: colors.deepRed,
          icon: 'alert-circle-outline' as const,
        };
      default:
        return {
          label: 'Desconocido',
          color: colors.textMuted,
          icon: 'help-circle-outline' as const,
        };
    }
  };

  const config = getConfig();

  return (
    <Animated.View
      layout={LinearTransition.springify()
        .damping(springConfig.damping ?? 20)
        .stiffness(springConfig.stiffness ?? 150)}
      style={[styles.badge, { borderColor: config.color }]}
    >
      <Ionicons
        name={config.icon}
        size={12}
        color={config.color}
        style={styles.icon}
      />

      <Text style={[styles.text, { color: config.color }]}>
        {config.label}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.2)', // El fondo translúcido estructural se mantiene estático
    alignSelf: 'flex-start',
  },

  icon: {
    marginRight: 4,
  },

  text: {
    ...FONT.caption,
    fontSize: 11,
    fontWeight: '700',
  },
});
