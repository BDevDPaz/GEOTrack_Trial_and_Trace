import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';

// Importaciones actualizadas según la arquitectura de contexto
import { useTheme } from '../../context/ThemeContext';
import { FONT, RADIUS } from '../../constants/theme';

type AppBrandTitleProps = {
  subtitle?: string;
};

export function AppBrandTitle({
  subtitle = 'CONTROL DE JORNADA',
}: AppBrandTitleProps) {
  // Consumo dinámico del tema centralizado
  const { colors } = useTheme();

  const glowOpacity = useSharedValue(0.14);
  const glowScale = useSharedValue(1);
  const lineScale = useSharedValue(0.35);
  const titleLift = useSharedValue(8);
  const titleOpacity = useSharedValue(0);

  useEffect(() => {
    titleLift.value = withTiming(0, {
      duration: 550,
      easing: Easing.out(Easing.cubic),
    });

    titleOpacity.value = withTiming(1, {
      duration: 500,
      easing: Easing.out(Easing.quad),
    });

    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.025, { duration: 1800 }),
        withTiming(1, { duration: 1800 })
      ),
      -1,
      false
    );

    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.24, { duration: 1800 }),
        withTiming(0.12, { duration: 1800 })
      ),
      -1,
      false
    );

    lineScale.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 1400 }),
        withTiming(0.85, { duration: 1200 }),
        withTiming(0.35, { duration: 1000 })
      ),
      -1,
      false
    );
  }, []);

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleLift.value }],
  }));

  const accentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  const lineAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: lineScale.value }],
    opacity: 0.7 + lineScale.value * 0.3,
  }));

  return (
    <View style={styles.container}>
      
      <Animated.View style={[styles.titleRow, titleAnimatedStyle]}>
        <View style={styles.wordmarkWrap}>
          <Animated.View 
            style={[
              styles.accentGlow, 
              accentAnimatedStyle, 
              { backgroundColor: colors.mutedGold }
            ]} 
          />

          <Text style={[styles.title, { color: colors.textPrimary }]}>
            <Text style={[styles.titleAccent, { color: colors.mutedGold }]}>W</Text>
            <Text style={[styles.titleMain, { color: colors.textPrimary }]}>Tracker</Text>
          </Text>
        </View>
      </Animated.View>

      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {subtitle}
      </Text>

      <View style={styles.lineTrack}>
        <Animated.View 
          style={[
            styles.lineAccent, 
            lineAnimatedStyle, 
            { backgroundColor: colors.mutedGold }
          ]} 
        />
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  wordmarkWrap: {
    position: 'relative',
    justifyContent: 'center',
  },

  accentGlow: {
    position: 'absolute',
    left: -4,
    top: 7,
    width: 44,
    height: 26,
    borderRadius: RADIUS.inputs,
    // BackgroundColor inyectado dinámicamente en el JSX
  },

  title: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.4,
    // Color inyectado dinámicamente en el JSX
  },

  titleAccent: {
    // Color inyectado dinámicamente en el JSX
  },

  titleMain: {
    // Color inyectado dinámicamente en el JSX
  },

  subtitle: {
    ...FONT.caption,
    marginTop: 4,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    // Color inyectado dinámicamente en el JSX
  },

  lineTrack: {
    marginTop: 10,
    height: 2,
    width: 120,
    backgroundColor: 'rgba(255,255,255,0.06)', // Riel estructural estático
    borderRadius: 2,
    overflow: 'hidden',
  },

  lineAccent: {
    height: 2,
    width: '100%',
    borderRadius: 2,
    // BackgroundColor inyectado dinámicamente en el JSX
  },
});
