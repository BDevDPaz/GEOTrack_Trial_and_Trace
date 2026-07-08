import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useWorkTracker } from '../src/core/hooks';
import { Button, ScreenContainer, AppBrandTitle } from '../src/components/ui';
import { SPACING, PALETTE } from '../src/constants/theme';

export default function OnboardingScreen() {
  const { dispatch } = useWorkTracker();

  const handleComplete = () => {
    dispatch({ type: 'ONBOARDING_COMPLETED' });
  };

  return (
    <ScreenContainer>
      <View style={styles.content}>
        <AppBrandTitle />
        <Text style={styles.title}>Bienvenido a WTracker</Text>
        <Text style={styles.description}>
          Esta aplicación le ayudará a realizar un seguimiento de sus horas de trabajo de forma automática y precisa.
        </Text>
        <View style={styles.footer}>
          <Button label="COMENZAR" variant="primary" onPress={handleComplete} />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: PALETTE.white,
    marginTop: SPACING.xxl,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: PALETTE.silver,
    marginTop: SPACING.lg,
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    marginTop: SPACING.xxl,
  },
});
