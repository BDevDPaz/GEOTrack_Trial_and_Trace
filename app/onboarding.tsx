import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useWorkTracker } from "../src/core/hooks";
import { Button, ScreenContainer, AppBrandTitle } from "../src/components/ui";
import { TOKENS, FONT } from "../src/constants/theme";

export default function OnboardingScreen() {
  const { dispatch } = useWorkTracker();

  const handleComplete = () => {
    dispatch({ type: "ONBOARDING_COMPLETED" });
  };

  return (
    <ScreenContainer useSafeArea={false}>
      <View style={styles.content}>
        <Animated.View entering={FadeInDown.delay(200).duration(600)}>
          <AppBrandTitle />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(400).duration(600)}>
          <Text style={[styles.title, { color: TOKENS.colors.text.primary }]}>
            Bienvenido a GEOTrack
          </Text>
          <Text
            style={[
              styles.description,
              { color: TOKENS.colors.text.secondary },
            ]}
          >
            La solución definitiva para el seguimiento de jornadas laborales,
            trazabilidad GPS y auditoría de integridad.
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(800).duration(600)}
          style={styles.footer}
        >
          <Button
            label="COMENZAR"
            variant="primary"
            size="lg"
            onPress={handleComplete}
          />
        </Animated.View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: "center",
    padding: TOKENS.layout.screenPadding,
  },
  title: {
    ...FONT.h1,
    marginTop: TOKENS.spacing["3xl"],
    textAlign: "center",
  },
  description: {
    ...FONT.body,
    marginTop: TOKENS.spacing.lg,
    textAlign: "center",
    lineHeight: 24,
  },
  footer: {
    marginTop: TOKENS.spacing["4xl"],
  },
});
