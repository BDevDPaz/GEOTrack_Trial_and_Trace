import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { SPACING } from '../../constants/theme';

interface ScreenContainerProps {
  children: React.ReactNode;
  noPadding?: boolean;
  style?: ViewStyle;
}

export function ScreenContainer({
  children,
  noPadding = false,
  style,
}: ScreenContainerProps) {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.obsidian }]}>
      <View
        style={[
          styles.innerContainer,
          !noPadding && styles.withPadding,
          style,
        ]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
  },
  withPadding: {
    paddingHorizontal: SPACING.xl,
  },
});
