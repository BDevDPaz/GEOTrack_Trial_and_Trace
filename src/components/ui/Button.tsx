import React from 'react';
import {
  Text,
  StyleSheet,
  Pressable,
  PressableProps,
  ActivityIndicator,
  Platform,
  StyleProp,
  ViewStyle,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// Importaciones del sistema de diseño y contexto
import { useTheme } from '../../context/ThemeContext';
import { RADIUS, FONT, SPACING } from '../../constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  label: string;
  variant?: ButtonVariant;
  isLoading?: boolean;
  style?: StyleProp<ViewStyle>;
  iconName?: React.ComponentProps<typeof Ionicons>['name'];
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  label,
  variant = 'primary',
  isLoading = false,
  style,
  onPress,
  disabled = false,
  onPressIn,
  onPressOut,
  iconName,
  ...props
}: ButtonProps) {
  // Consumo dinámico del tema centralizado
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const isDisabled = disabled || isLoading;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (
    event: Parameters<NonNullable<PressableProps['onPressIn']>>[0]
  ) => {
    if (!isDisabled) {
      // Micro-interacción elástica de presión adaptada al diseño táctil premium
      scale.value = withSpring(0.96, { damping: 20, stiffness: 300 });
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }

    if (onPressIn) {
      onPressIn(event);
    }
  };

  const handlePressOut = (
    event: Parameters<NonNullable<PressableProps['onPressOut']>>[0]
  ) => {
    scale.value = withSpring(1, { damping: 20, stiffness: 300 });
    if (onPressOut) {
      onPressOut(event);
    }
  };

  const handlePress = (
    event: Parameters<NonNullable<PressableProps['onPress']>>[0]
  ) => {
    if (isDisabled) {
      return;
    }

    if (Platform.OS !== 'web') {
      if (variant === 'danger') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } else if (variant === 'primary') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    }

    if (onPress) {
      onPress(event);
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: colors.mutedGold,
          textColor: colors.obsidian,
          borderColor: colors.mutedGold,
        };
      case 'secondary':
        return {
          backgroundColor: 'transparent',
          textColor: colors.textPrimary,
          borderColor: colors.steelLine,
        };
      case 'danger':
        return {
          backgroundColor: colors.deepRed,
          textColor: '#FFFFFF',
          borderColor: colors.deepRed,
        };
      case 'ghost':
      default:
        return {
          backgroundColor: 'transparent',
          textColor: colors.textSecondary,
          borderColor: 'transparent',
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <AnimatedPressable
      {...props}
      disabled={isDisabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      accessibilityRole="button"
      style={[
        styles.button,
        {
          backgroundColor: variantStyles.backgroundColor,
          borderColor: variantStyles.borderColor,
        },
        isDisabled && styles.disabled,
        style,
        animatedStyle,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator color={variantStyles.textColor} />
      ) : (
        <View style={styles.content}>
          {iconName ? (
            <Ionicons
              name={iconName}
              size={18}
              color={variantStyles.textColor}
              style={styles.icon}
            />
          ) : null}

          <Text style={[styles.label, { color: variantStyles.textColor }]}>
            {label}
          </Text>
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 56,
    borderRadius: RADIUS.inputs,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  icon: {
    marginRight: 2,
  },
  label: {
    ...FONT.bodyStrong,
    fontSize: 16,
  },
  disabled: {
    opacity: 0.5,
  },
});
