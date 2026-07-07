import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  FadeInDown,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

// Importaciones adaptadas a la nueva arquitectura
import { useTheme } from '../../context/ThemeContext';
import { getSpringConfig } from '../../constants/animations';
import { RADIUS, FONT, SPACING } from '../../constants/theme';
import { EngineState } from './OperationalHeroCard';

interface SystemHealthBlockProps {
  engineState: EngineState;
}

export function SystemHealthBlock({ engineState }: SystemHealthBlockProps) {
  // Inyección de estilos dinámicos
  const { colors } = useTheme();
  const springConfig = getSpringConfig();

  const isTracking = ['ESPERANDO_LLEGADA', 'EN_TRASLADO', 'ACTIVA'].includes(engineState);
  const isIssue = ['ASINCRONIA_CHECKIN', 'NO_SHOW', 'SALIDA_DETECTADA'].includes(engineState);

  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    if (isTracking) {
      pulseOpacity.value = withRepeat(
        withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      pulseOpacity.value = withTiming(1, { duration: 300 });
    }
  }, [isTracking, pulseOpacity]);

  const animatedDotStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  // Determinación dinámica de colores según el estado actual
  const gpsColor = isIssue
    ? colors.deepRed
    : isTracking
    ? colors.successGreen
    : colors.textMuted;

  const syncColor = isIssue
    ? colors.amberWarning
    : colors.successGreen;

  return (
    <Animated.View
      entering={FadeInDown.delay(200)
        .springify()
        .damping(springConfig.damping ?? 20)
        .stiffness(springConfig.stiffness ?? 150)}
      style={[
        styles.block,
        {
          backgroundColor: colors.graphite,
          borderColor: colors.steelLine,
        },
      ]}
    >
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        Estado del sistema
      </Text>

      <View style={styles.row}>
        <Animated.View
          style={[styles.dot, { backgroundColor: gpsColor }, animatedDotStyle]}
        />

        <Ionicons
          name="locate-outline"
          size={16}
          color={gpsColor}
          style={styles.icon}
        />

        <Text style={[styles.text, { color: colors.textSecondary }]}>
          {isTracking
            ? 'Ubicación activa'
            : isIssue
            ? 'Problema de ubicación'
            : 'Ubicación inactiva'}
        </Text>
      </View>

      <View style={styles.row}>
        <View style={[styles.dot, { backgroundColor: syncColor }]} />

        <Ionicons
          name="sync-outline"
          size={16}
          color={syncColor}
          style={styles.icon}
        />

        <Text style={[styles.text, { color: colors.textSecondary }]}>
          {isIssue
            ? 'Pendiente de sincronización'
            : 'Sincronización activa'}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  block: {
    marginHorizontal: SPACING.xl,
    padding: 18,
    borderRadius: RADIUS.cards,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    // BackgroundColor y borderColor eliminados para aplicar en el JSX (Theme)
  },

  title: {
    ...FONT.h3,
    fontSize: 16,
    marginBottom: SPACING.md,
    // Color eliminado para aplicar en el JSX (Theme)
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SPACING.sm,
  },

  icon: {
    marginRight: SPACING.sm,
  },

  text: {
    ...FONT.body,
    fontSize: 14,
    // Color eliminado para aplicar en el JSX (Theme)
  },
});
