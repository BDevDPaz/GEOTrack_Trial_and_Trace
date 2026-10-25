import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useWorkTracker } from "../src/core/hooks";
import {
  Button,
  ScreenContainer,
  AppBrandTitle,
  Input,
} from "../src/components/ui";
import { securityAdapter } from "../src/core/runtime/securityAdapter";
import { isValidPinFormat } from "../src/security/adminPin";
import { TOKENS, FONT } from "../src/constants/theme";

export default function OnboardingScreen() {
  const { dispatch } = useWorkTracker();

  // Fase D (10): el PIN de administrador se define aquí (ya no hay PIN de demo).
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [pinError, setPinError] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const handleComplete = async () => {
    if (!isValidPinFormat(pin)) {
      setPinError("El PIN debe tener 4 a 8 dígitos");
      return;
    }
    if (pin !== pinConfirm) {
      setPinError("Los PIN no coinciden");
      return;
    }
    setSaving(true);
    try {
      await securityAdapter.setAdminPin(pin);
      dispatch({ type: "ONBOARDING_COMPLETED" });
    } catch {
      setPinError("No se pudo guardar el PIN");
    } finally {
      setSaving(false);
    }
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
          <Input
            placeholder="Crea un PIN de administrador (4-8 dígitos)"
            secureTextEntry
            keyboardType="numeric"
            value={pin}
            onChangeText={setPin}
            maxLength={8}
          />
          <Input
            placeholder="Confirma el PIN"
            secureTextEntry
            keyboardType="numeric"
            value={pinConfirm}
            onChangeText={setPinConfirm}
            maxLength={8}
            error={pinError}
          />
          <Button
            label="COMENZAR"
            variant="primary"
            size="lg"
            disabled={saving || pin.length < 4}
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
