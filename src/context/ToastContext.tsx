import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

// Importaciones adaptadas a la nueva arquitectura
import { useTheme } from './ThemeContext';
import { getSpringConfig } from '../constants/animations';
import { RADIUS, SPACING, FONT } from '../constants/theme';
import { ICONS } from '../constants/icons';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  // Consumo dinámico del tema centralizado y físicas
  const { colors } = useTheme();
  const springConfig = getSpringConfig();

  const [message, setMessage] = useState('');
  const [type, setType] = useState<ToastType>('info');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Motores de animación nativos
  const translateY = useSharedValue(-150);
  const opacity = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const dismissToast = useCallback(() => {
    translateY.value = withTiming(-150, { duration: 250 }, (finished) => {
      if (finished) {
        opacity.value = 0;
        runOnJS(setMessage)('');
      }
    });
  }, [translateY, opacity]);

  const showToast = useCallback(
    (msg: string, toastType: ToastType = 'info') => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      setMessage(msg);
      setType(toastType);

      opacity.value = 1;

      translateY.value = withSpring(
        Platform.OS === 'ios' ? 60 : 40,
        {
          damping: springConfig.damping ?? 20,
          stiffness: springConfig.stiffness ?? 150,
        }
      );

      timerRef.current = setTimeout(() => {
        dismissToast();
      }, 3500);
    },
    [translateY, opacity, dismissToast, springConfig]
  );

  // ICONOGRAFÍA Y COLORES CENTRALIZADOS
  const getToastConfig = () => {
    switch (type) {
      case 'success':
        return {
          color: colors.successGreen,
          icon: ICONS.system.success,
        };
      case 'error':
        return {
          color: colors.deepRed,
          icon: ICONS.system.error,
        };
      case 'warning':
        return {
          color: colors.amberWarning,
          icon: ICONS.system.warning,
        };
      case 'info':
      default:
        return {
          color: colors.slateBlue,
          icon: ICONS.system.info,
        };
    }
  };

  const config = getToastConfig();

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Contenedor Flotante del Toast */}
      {message !== '' && (
        <Animated.View style={[styles.toastContainer, animatedStyle]}>
          <View 
            style={[
              styles.toastCard, 
              { 
                backgroundColor: colors.carbonMist,
                borderColor: config.color 
              }
            ]}
          >
            <Ionicons
              name={config.icon as keyof typeof Ionicons.glyphMap}
              size={22}
              color={config.color}
            />
            <Text 
              style={[styles.toastText, { color: colors.textPrimary }]} 
              numberOfLines={3}
            >
              {message}
            </Text>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error(
      'useToast debe ser consumido estrictamente dentro de un ToastProvider'
    );
  }
  return context;
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastCard: {
    flexDirection: 'row',
    width: '100%',
    borderRadius: RADIUS.inputs,
    paddingVertical: 14,
    paddingHorizontal: SPACING.lg,
    borderWidth: 1,
    alignItems: 'center',
    gap: SPACING.md,
    // Sombra estática para asegurar profundidad sobre la UI
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
    // BackgroundColor y borderColor se aplican dinámicamente en el JSX
  },
  toastText: {
    ...FONT.bodyStrong,
    fontSize: 14,
    flex: 1,
    lineHeight: 18,
    // Color se aplica dinámicamente en el JSX
  },
});
