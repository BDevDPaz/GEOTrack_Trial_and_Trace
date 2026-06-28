import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { FONT, SPACING } from '../../constants/theme';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  style?: ViewStyle;
}

export function PageHeader({ title, subtitle, style }: PageHeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.header, style]}>
      <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  headerTitle: {
    ...FONT.h1,
  },
  headerSubtitle: {
    ...FONT.caption,
    marginTop: 2,
  },
});
