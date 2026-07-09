import React, { useState } from "react";
import { StyleSheet, View, Text, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import * as Haptics from "expo-haptics";

import { TOKENS, FONT } from "../../src/constants/theme";
import { useWorkTracker } from "../../src/core/hooks";
import { useToast } from "../../src/context/ToastContext";
import {
  ScreenContainer,
  PageHeader,
  Section,
  Button,
  Card,
  Input,
} from "../../src/components/ui";
import { ICONS } from "../../src/constants/icons";

/**
 * PANTALLA DE CONFIGURACIÓN
 */
export default function SettingsScreen() {
  const { state, dispatch } = useWorkTracker();
  const { showToast } = useToast();

  // Estado local para edición
  const [localSettings, setLocalSettings] = useState({
    ...state.domain.settings,
  });
  const [pinInput, setPinInput] = useState("");
  const [adminAccess, setAdminAccess] = useState<{
    isUnlocked: boolean;
    validationStatus: "idle" | "validating" | "denied";
  }>({ isUnlocked: false, validationStatus: "idle" });

  const updateField = (field: keyof typeof localSettings, value: any) => {
    setLocalSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleUnlockRequest = () => {
    setAdminAccess((prev) => ({ ...prev, validationStatus: "validating" }));

    setTimeout(() => {
      if (pinInput === "1234" || pinInput === "0000") {
        setAdminAccess({ isUnlocked: true, validationStatus: "idle" });
        showToast("Acceso administrativo concedido", "success");
        if (Platform.OS !== "web")
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setAdminAccess({ isUnlocked: false, validationStatus: "denied" });
        showToast("PIN incorrecto", "error");
        if (Platform.OS !== "web")
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }, 800);
  };

  const handleLock = () => {
    setAdminAccess({ isUnlocked: false, validationStatus: "idle" });
    setPinInput("");
  };

  const handleSaveSettings = () => {
    // Al no existir SETTINGS_UPDATED, usamos un evento manual de rehidratación para guardar.
    // Esto es un refactor UI, no de negocio, pero necesitamos que no de error.
    dispatch({
      type: "SETTINGS_REHYDRATED",
      settings: localSettings,
    });
    showToast("Configuración guardada correctamente", "success");
  };

  const toggleLanguage = () => {
    showToast("Función de cambio de idioma en desarrollo", "info");
  };

  const PermissionItem = ({
    label,
    status,
  }: {
    label: string;
    status: boolean;
  }) => (
    <View style={styles.permissionRow}>
      <Text
        style={[styles.permissionLabel, { color: TOKENS.colors.text.primary }]}
      >
        {label}
      </Text>
      <View
        style={[
          styles.permissionBadge,
          {
            backgroundColor: status
              ? `${TOKENS.colors.status.success}20`
              : `${TOKENS.colors.status.danger}20`,
          },
        ]}
      >
        <Ionicons
          name={
            status ? (ICONS.status.success as any) : (ICONS.status.error as any)
          }
          size={12}
          color={
            status ? TOKENS.colors.status.success : TOKENS.colors.status.danger
          }
        />
        <Text
          style={[
            styles.permissionText,
            {
              color: status
                ? TOKENS.colors.status.success
                : TOKENS.colors.status.danger,
            },
          ]}
        >
          {status ? "CONCEDIDO" : "DENEGADO"}
        </Text>
      </View>
    </View>
  );

  return (
    <ScreenContainer noPadding>
      <PageHeader title="Configuración" />

      <KeyboardAwareScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Section title="Aplicación e Idioma">
          <Card variant="surface" style={styles.languageCard}>
            <View style={styles.languageRow}>
              <View style={styles.languageInfo}>
                <Ionicons
                  name={ICONS.actions.language as any}
                  size={20}
                  color={TOKENS.colors.primary}
                />
                <Text
                  style={[
                    styles.languageLabel,
                    { color: TOKENS.colors.text.primary },
                  ]}
                >
                  Idioma del sistema
                </Text>
              </View>
              <Button
                label="Español"
                variant="ghost"
                size="sm"
                onPress={toggleLanguage}
                iconName={ICONS.actions.forward as any}
              />
            </View>
          </Card>
        </Section>

        <Section title="Permisos del Sistema">
          <Card>
            <PermissionItem
              label="Ubicación (Siempre)"
              status={
                state.runtime.permissions.locationBackground === "granted"
              }
            />
            <View
              style={[
                styles.divider,
                { backgroundColor: TOKENS.colors.border },
              ]}
            />
            <PermissionItem
              label="Notificaciones"
              status={state.runtime.permissions.notifications === "granted"}
            />
          </Card>
        </Section>

        {!adminAccess.isUnlocked ? (
          <Section title="Zona Administrativa">
            <Card style={styles.adminLockCard}>
              <View style={styles.securityHeader}>
                <View
                  style={[
                    styles.lockIconWrapper,
                    { backgroundColor: `${TOKENS.colors.primary}15` },
                  ]}
                >
                  <Ionicons
                    name={ICONS.actions.lock as any}
                    size={32}
                    color={TOKENS.colors.primary}
                  />
                </View>
                <Text
                  style={[
                    styles.securityTitle,
                    { color: TOKENS.colors.text.primary },
                  ]}
                >
                  Acceso Restringido
                </Text>
                <Text
                  style={[
                    styles.securitySubtitle,
                    { color: TOKENS.colors.text.secondary },
                  ]}
                >
                  Ingresa el PIN de seguridad corporativo para editar la
                  configuración de la nómina.
                </Text>
              </View>

              <Input
                placeholder="PIN de Seguridad"
                secureTextEntry
                keyboardType="numeric"
                value={pinInput}
                onChangeText={setPinInput}
                maxLength={8}
                editable={adminAccess.validationStatus !== "validating"}
                style={styles.pinInput}
                error={
                  adminAccess.validationStatus === "denied"
                    ? "PIN incorrecto"
                    : undefined
                }
              />

              <Button
                label={
                  adminAccess.validationStatus === "validating"
                    ? "VERIFICANDO..."
                    : "DESBLOQUEAR AJUSTES"
                }
                variant="primary"
                disabled={
                  pinInput.length < 4 ||
                  adminAccess.validationStatus === "validating"
                }
                onPress={handleUnlockRequest}
                style={{ marginTop: TOKENS.spacing.md }}
              />
            </Card>
          </Section>
        ) : (
          <Animated.View entering={FadeIn.duration(400)}>
            <Section title="Zona Administrativa">
              <View style={styles.unlockedHeader}>
                <View style={styles.statusRow}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: TOKENS.colors.status.success },
                    ]}
                  />
                  <Text
                    style={[
                      styles.unlockedTitle,
                      { color: TOKENS.colors.status.success },
                    ]}
                  >
                    AJUSTES DESBLOQUEADOS
                  </Text>
                </View>
                <Button
                  label="Bloquear"
                  variant="ghost"
                  size="sm"
                  onPress={handleLock}
                  iconName={ICONS.actions.lock as any}
                />
              </View>

              <Card>
                <Input
                  label="Nombre del Empleado"
                  value={localSettings.employeeName}
                  onChangeText={(val) => updateField("employeeName", val)}
                  icon="person-outline"
                />

                <Input
                  label="Empresa Contratista"
                  value={localSettings.employerName}
                  onChangeText={(val) => updateField("employerName", val)}
                  icon="business-outline"
                />

                <Input
                  label="Correo de Recursos Humanos"
                  value={localSettings.companyEmail}
                  onChangeText={(val) => updateField("companyEmail", val)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  icon="mail-outline"
                />

                <View
                  style={[
                    styles.divider,
                    { backgroundColor: TOKENS.colors.border },
                  ]}
                />

                <View style={styles.rowInputs}>
                  <Input
                    label="Tarifa ($/hr)"
                    value={localSettings.hourlyRate.toString()}
                    onChangeText={(val) =>
                      updateField("hourlyRate", parseFloat(val) || 0)
                    }
                    keyboardType="decimal-pad"
                    containerStyle={styles.flexInput}
                  />
                  <Input
                    label="Multiplicador OT"
                    value={localSettings.overtimeMultiplier.toString()}
                    onChangeText={(val) =>
                      updateField("overtimeMultiplier", parseFloat(val) || 1.5)
                    }
                    keyboardType="decimal-pad"
                    containerStyle={styles.flexInput}
                  />
                </View>

                <View style={styles.rowInputs}>
                  <Input
                    label="Radio Geocerca (m)"
                    value={localSettings.toleranceRadiusMeters.toString()}
                    onChangeText={(val) =>
                      updateField(
                        "toleranceRadiusMeters",
                        parseInt(val, 10) || 200,
                      )
                    }
                    keyboardType="number-pad"
                    containerStyle={styles.flexInput}
                  />
                  <Input
                    label="Recordatorio"
                    value={localSettings.dailyReminderTime}
                    onChangeText={(val) =>
                      updateField("dailyReminderTime", val)
                    }
                    placeholder="07:00"
                    containerStyle={styles.flexInput}
                  />
                </View>

                <Button
                  label="GUARDAR Y APLICAR CAMBIOS"
                  variant="primary"
                  onPress={handleSaveSettings}
                  style={{ marginTop: TOKENS.spacing.md }}
                />
              </Card>
            </Section>
          </Animated.View>
        )}

        <View style={styles.bottomSpacer} />
      </KeyboardAwareScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: TOKENS.spacing["4xl"],
  },
  divider: {
    height: 1,
    marginVertical: TOKENS.spacing.md,
  },
  permissionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: TOKENS.spacing.xs,
  },
  permissionLabel: {
    ...FONT.body,
  },
  permissionBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: TOKENS.spacing.sm,
    paddingVertical: TOKENS.spacing.xs,
    borderRadius: TOKENS.radius.round,
    gap: 4,
  },
  permissionText: {
    ...FONT.label,
    fontWeight: "800",
  },
  languageCard: {
    padding: TOKENS.spacing.md,
  },
  languageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  languageInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: TOKENS.spacing.md,
  },
  languageLabel: {
    ...FONT.body,
  },
  adminLockCard: {
    alignItems: "center",
    padding: TOKENS.spacing.xl,
  },
  lockIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: TOKENS.spacing.md,
  },
  securityHeader: {
    alignItems: "center",
    marginBottom: TOKENS.spacing.xl,
  },
  securityTitle: {
    ...FONT.h2,
    marginBottom: TOKENS.spacing.xs,
  },
  securitySubtitle: {
    ...FONT.caption,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: TOKENS.spacing.md,
  },
  pinInput: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 8,
  },
  unlockedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: TOKENS.spacing.md,
    paddingHorizontal: TOKENS.spacing.xs,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: TOKENS.spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  unlockedTitle: {
    ...FONT.label,
    letterSpacing: 1,
  },
  rowInputs: {
    flexDirection: "row",
    gap: TOKENS.spacing.md,
  },
  flexInput: {
    flex: 1,
  },
  bottomSpacer: {
    height: 60,
  },
});
