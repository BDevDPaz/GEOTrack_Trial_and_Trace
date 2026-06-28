import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { FONT, SPACING } from '../../constants/theme';

interface SectionProps {
  title: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Section({ title, children, style }: SectionProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.sectionBlock, style]}>
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
        {title.toUpperCase()}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionBlock: {
    marginTop: SPACING.xl,
    paddingHorizontal: SPACING.xl,
  },
  sectionTitle: {
    ...FONT.label,
    letterSpacing: 1.5,
    marginBottom: SPACING.md,
  },
});
