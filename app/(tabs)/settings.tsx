import { now } from "../../src/utils/timeProvider";
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useNavigation } from 'expo-router';
import { useTheme } from '../../src/context/ThemeContext';
import { SPACING, RADIUS } from '../../src/constants/theme';
import { useWorkTracker } from '../../src/core/hooks';
import { ScreenContainer, PageHeader, Section, Button } from '../../src/components/ui';

export default function SettingsScreen() {
  const { colors } = useTheme();
  const { state, dispatch } = useWorkTracker();
  const navigation = useNavigation();

  const [pinInput, setPinInput] = useState('');
  const [localSettings, setLocalSettings] = useState({ ...state.domain.settings });

  // Actualizar localSettings si el estado global cambia (ej. rehidratación o guardado exitoso)
  useEffect(() => {
    setLocalSettings({ ...state.domain.settings });
  }, [state.domain.settings]);

  // Refrescar permisos al ganar foco
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      dispatch({ type: 'PERMISSIONS_REFRESH_REQUESTED' });
    });
    return unsubscribe;
  }, [navigation, dispatch]);
  const adminAccess = state.runtime.security.adminAccess;

  const handleUnlockRequest = () => {
    dispatch({ type: 'ADMIN_ACCESS_VALIDATION_STARTED' });
    // Simulamos validación local ya que no hay evento ADMIN_UNLOCK_REQUESTED en el contrato formal actual
    // pero sí ADMIN_ACCESS_GRANTED/DENIED.
    // NOTA: En un sistema real esto lo manejaría un Effect, aquí dispatchamos el resultado directamente
    // para cumplir con los tipos del contrato.
    if (pinInput === '1234') {
        dispatch({ type: 'ADMIN_ACCESS_GRANTED', timestampMs: now() });
    } else {
        dispatch({ type: 'ADMIN_ACCESS_DENIED' });
    }
  };

  const handleLock = () => {
    dispatch({ type: 'ADMIN_ACCESS_LOCKED' });
    setPinInput('');
  };

  const handleSaveSettings = () => {
    dispatch({ type: 'SETTINGS_REHYDRATED', settings: localSettings });
  };

  const updateField = (field: keyof typeof localSettings, value: string | number) => {
    setLocalSettings(prev => ({ ...prev, [field]: value }));
  };

  const PermissionRow = ({ label, status }: { label: string; status: boolean }) => (
    <View style={styles.permissionRow}>
      <Text style={[styles.permissionLabel, { color: colors.textPrimary }]}>{label}</Text>
      <View style={[
        styles.permissionBadge,
        status ? { backgroundColor: 'rgba(39, 174, 96, 0.1)' } : { backgroundColor: 'rgba(235, 87, 87, 0.1)' }
      ]}>
        <Ionicons
          name={status ? "checkmark-circle" : "close-circle"}
          size={14}
          color={status ? colors.successGreen : colors.deepRed}
        />
        <Text style={[
          styles.permissionText,
          status ? { color: colors.successGreen } : { color: colors.deepRed }
        ]}>
          {status ? 'CONCEDIDO' : 'DENEGADO'}
        </Text>
      </View>
    </View>
  );

  return (
    <ScreenContainer noPadding testID="settings-screen-container">
      <PageHeader title="Ajustes" />

      <KeyboardAwareScrollView 
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Section title="Estatus de permisos">
          <View style={[styles.card, { backgroundColor: colors.carbonMist, borderColor: colors.steelLine }]}>
            <PermissionRow label="Ubicación (Primer Plano)" status={state.runtime.permissions.locationForeground === 'granted'} />
            <View style={[styles.divider, { backgroundColor: colors.steelLine }]} />
            <PermissionRow label="Ubicación (Fondo / Geocerca)" status={state.runtime.permissions.locationBackground === 'granted'} />
            <View style={[styles.divider, { backgroundColor: colors.steelLine }]} />
            <PermissionRow label="Notificaciones (Recordatorios)" status={state.runtime.permissions.notifications === 'granted'} />
          </View>
        </Section>

        {!adminAccess.isUnlocked ? (
          <Section title="Zona Administrativa">
            <View style={[styles.card, { backgroundColor: colors.carbonMist, borderColor: colors.steelLine }]}>
              <View style={styles.securityHeader}>
                <Ionicons name="lock-closed" size={32} color={colors.mutedGold} />
                <Text style={[styles.securityTitle, { color: colors.textPrimary }]}>Acceso Restringido</Text>
                <Text style={[styles.securitySubtitle, { color: colors.textSecondary }]}>
                  Ingresa el PIN de seguridad corporativo para editar la configuración de la nómina y la aplicación.
                </Text>
              </View>

              <TextInput
                style={[styles.pinInput, { backgroundColor: colors.graphite, borderColor: colors.steelLine, color: colors.textPrimary }]}
                placeholder="PIN de Seguridad"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                keyboardType="numeric"
                value={pinInput}
                onChangeText={setPinInput}
                maxLength={8}
                editable={adminAccess.validationStatus !== 'validating'}
              />

              {adminAccess.validationStatus === 'denied' && (
                <Text style={[styles.errorText, { color: colors.deepRed }]}>PIN incorrecto. Inténtalo de nuevo.</Text>
              )}

              <Button
                label={adminAccess.validationStatus === 'validating' ? 'VERIFICANDO...' : 'DESBLOQUEAR AJUSTES'}
                variant="primary"
                disabled={pinInput.length < 4 || adminAccess.validationStatus === 'validating'}
                onPress={handleUnlockRequest}
                style={{ marginTop: SPACING.md }}
              />
            </View>
          </Section>
        ) : (
          <Animated.View entering={FadeIn.duration(400)}>
            <Section title="Zona Administrativa">
              <View style={styles.unlockedHeader}>
                <Text style={[styles.unlockedTitle, { color: colors.successGreen }]}>
                  DESBLOQUEADA
                </Text>
                <Pressable onPress={handleLock} style={[styles.lockButton, { backgroundColor: 'rgba(39, 174, 96, 0.1)' }]}>
                  <Ionicons name="lock-open" size={16} color={colors.successGreen} />
                  <Text style={[styles.lockButtonText, { color: colors.successGreen }]}>Bloquear</Text>
                </Pressable>
              </View>

              <View style={[styles.card, { backgroundColor: colors.carbonMist, borderColor: colors.steelLine }]}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Nombre del Empleado</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.graphite, borderColor: colors.steelLine, color: colors.textPrimary }]}
                  value={localSettings.employeeName}
                  onChangeText={(val) => updateField('employeeName', val)}
                  placeholderTextColor={colors.textMuted}
                />

                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Empresa Contratista</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.graphite, borderColor: colors.steelLine, color: colors.textPrimary }]}
                  value={localSettings.employerName}
                  onChangeText={(val) => updateField('employerName', val)}
                  placeholderTextColor={colors.textMuted}
                />

                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Correo de Recursos Humanos</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.graphite, borderColor: colors.steelLine, color: colors.textPrimary }]}
                  value={localSettings.companyEmail}
                  onChangeText={(val) => updateField('companyEmail', val)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor={colors.textMuted}
                />

                <View style={[styles.divider, { backgroundColor: colors.steelLine }]} />

                <View style={styles.rowInputs}>
                  <View style={styles.flexInput}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Tarifa Base ($/hr)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.graphite, borderColor: colors.steelLine, color: colors.textPrimary }]}
                      value={localSettings.hourlyRate.toString()}
                      onChangeText={(val) => updateField('hourlyRate', parseFloat(val) || 0)}
                      keyboardType="decimal-pad"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                  <View style={styles.flexInput}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Multiplicador OT</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.graphite, borderColor: colors.steelLine, color: colors.textPrimary }]}
                      value={localSettings.overtimeMultiplier.toString()}
                      onChangeText={(val) => updateField('overtimeMultiplier', parseFloat(val) || 1.5)}
                      keyboardType="decimal-pad"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </View>

                <View style={[styles.divider, { backgroundColor: colors.steelLine }]} />

                <View style={styles.rowInputs}>
                  <View style={styles.flexInput}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Radio Geocerca (m)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.graphite, borderColor: colors.steelLine, color: colors.textPrimary }]}
                      value={localSettings.toleranceRadiusMeters.toString()}
                      onChangeText={(val) => updateField('toleranceRadiusMeters', parseInt(val, 10) || 200)}
                      keyboardType="number-pad"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                  <View style={styles.flexInput}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Recordatorio Diario</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.graphite, borderColor: colors.steelLine, color: colors.textPrimary }]}
                      value={localSettings.dailyReminderTime}
                      onChangeText={(val) => updateField('dailyReminderTime', val)}
                      placeholder="07:00"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </View>

                <Button
                  label="GUARDAR Y APLICAR CAMBIOS"
                  variant="primary"
                  onPress={handleSaveSettings}
                  style={{ marginTop: SPACING.xl }}
                />
              </View>
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
    paddingBottom: SPACING.xxl,
  },
  card: {
    borderRadius: RADIUS.cards,
    padding: SPACING.lg,
    borderWidth: 1,
  },
  divider: {
    height: 1,
    marginVertical: SPACING.md,
  },
  permissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  permissionLabel: {
    fontSize: 16,
    fontWeight: '400',
  },
  permissionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.round,
    gap: 4,
  },
  permissionText: {
    fontSize: 9,
    fontWeight: '700',
  },
  securityHeader: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  securityTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  securitySubtitle: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
  },
  pinInput: {
    borderWidth: 1,
    borderRadius: RADIUS.inputs,
    padding: SPACING.md,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 8,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  unlockedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.xl,
  },
  unlockedTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  lockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.round,
    gap: 4,
  },
  lockButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: RADIUS.inputs,
    padding: SPACING.md,
    fontSize: 16,
    fontWeight: '400',
    marginBottom: SPACING.md,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  flexInput: {
    flex: 1,
  },
  bottomSpacer: {
    height: 60,
  },
});
