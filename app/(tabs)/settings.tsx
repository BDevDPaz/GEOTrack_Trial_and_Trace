import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  SafeAreaView, 
  TextInput, 
  Platform,
  Pressable
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

// Tema y Componentes Reusables
import { PALETTE, SPACING, FONT, RADIUS } from '../../src/constants/theme';
import { Button } from '../../src/components/ui/Button';

// Motor Canónico
import { useWorkTracker } from '../../src/core/hooks/useWorkTracker';
import { AppSettingsRecord } from '../../src/core/contracts/types';

/**
 * PANTALLA DE AJUSTES Y SEGURIDAD
 * Vista tonta conectada al motor. Maneja el bloqueo por PIN y la edición de configuraciones.
 * No contiene lógica criptográfica ni llamadas directas a base de datos o AsyncStorage.
 */
export default function SettingsScreen() {
  const { state, dispatch } = useWorkTracker();

  // Lectura pura de la fuente única de verdad
  const { settings } = state.domain;
  const { adminAccess } = state.runtime.security;
  const { permissions } = state.runtime;

  // Estados locales solo para manejo de inputs visuales
  const [pinInput, setPinInput] = useState('');
  const [localSettings, setLocalSettings] = useState<AppSettingsRecord>(settings);

  // Sincronizar el formulario local cuando el engine recargue los ajustes reales
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  /**
   * Disparador: Solicita la validación del PIN al motor de seguridad
   */
  const handleUnlockRequest = () => {
    if (!pinInput.trim()) return;
    dispatch({ 
      type: 'ADMIN_ACCESS_VALIDATION_STARTED', 
      pin: pinInput 
    } as any); // Type assertion provisional si el payload pin se inyectó dinámicamente en el contrato
  };

  /**
   * Disparador: Bloquea inmediatamente la sesión administrativa
   */
  const handleLock = () => {
    setPinInput('');
    dispatch({ type: 'ADMIN_ACCESS_LOCKED' });
  };

  /**
   * Disparador: Envía los ajustes actualizados para persistencia y reprogramación (ej. alarmas)
   */
  const handleSaveSettings = () => {
    dispatch({ 
      type: 'SETTINGS_SAVE_REQUESTED', 
      settings: localSettings 
    } as any);
  };

  /**
   * Helper para actualizar campos del formulario localmente
   */
  const updateField = (key: keyof AppSettingsRecord, value: string | number) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  // ---------------------------------------------------------------------------
  // RENDER: COMPONENTE DE ESTADO DE PERMISOS
  // ---------------------------------------------------------------------------
  const PermissionRow = ({ label, status }: { label: string, status: string }) => {
    const isGranted = status === 'granted';
    return (
      <View style={styles.permissionRow}>
        <Text style={styles.permissionLabel}>{label}</Text>
        <View style={[styles.permissionBadge, isGranted && styles.permissionBadgeGranted]}>
          <Ionicons 
            name={isGranted ? 'checkmark-circle' : 'close-circle'} 
            size={14} 
            color={isGranted ? PALETTE.successGreen : PALETTE.deepRed} 
          />
          <Text style={[styles.permissionText, isGranted && styles.permissionTextGranted]}>
            {isGranted ? 'ACTIVO' : 'DENEGADO / PENDIENTE'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ajustes del Sistema</Text>
      </View>

      <KeyboardAwareScrollView 
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
      >
        
        {/* =========================================================
            BLOQUE 1: ESTADO DEL SISTEMA Y PERMISOS NATIVOS
            ========================================================= */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>ESTADO DEL DISPOSITIVO</Text>
          <View style={styles.card}>
            <PermissionRow label="Ubicación (Primer Plano)" status="unknown" />
            <View style={styles.divider} />
            <PermissionRow label="Ubicación (Fondo / Geocerca)" status="unknown" />
            <View style={styles.divider} />
            <PermissionRow label="Notificaciones (Recordatorios)" status="unknown" />
          </View>
        </Animated.View>

        {/* =========================================================
            BLOQUE 2: SEGURIDAD (CANDADO ADMINISTRATIVO)
            ========================================================= */}
        {!adminAccess.isUnlocked ? (
          <Animated.View entering={FadeInDown.delay(200)} style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>ZONA ADMINISTRATIVA</Text>
            <View style={styles.card}>
              <View style={styles.securityHeader}>
                <Ionicons name="lock-closed" size={32} color={PALETTE.mutedGold} />
                <Text style={styles.securityTitle}>Acceso Restringido</Text>
                <Text style={styles.securitySubtitle}>
                  Ingresa el PIN de seguridad corporativo para editar la configuración de la nómina y la aplicación.
                </Text>
              </View>

              <TextInput
                style={styles.pinInput}
                placeholder="PIN de Seguridad"
                placeholderTextColor={PALETTE.textMuted}
                secureTextEntry
                keyboardType="numeric"
                value={pinInput}
                onChangeText={setPinInput}
                maxLength={8}
                editable={adminAccess.validationStatus !== 'validating'}
              />

              {adminAccess.validationStatus === 'error' && (
                <Text style={styles.errorText}>PIN incorrecto. Inténtalo de nuevo.</Text>
              )}

              <Button
                label={adminAccess.validationStatus === 'validating' ? 'VERIFICANDO...' : 'DESBLOQUEAR AJUSTES'}
                variant="primary"
                disabled={pinInput.length < 4 || adminAccess.validationStatus === 'validating'}
                onPress={handleUnlockRequest}
                style={{ marginTop: SPACING.md }}
              />
            </View>
          </Animated.View>
        ) : (
          /* =========================================================
             BLOQUE 3: CONFIGURACIÓN LIBERADA
             ========================================================= */
          <Animated.View entering={FadeIn.duration(400)} style={styles.sectionBlock}>
            <View style={styles.unlockedHeader}>
              <Text style={[styles.sectionTitle, { color: PALETTE.successGreen, marginBottom: 0 }]}>
                ZONA ADMINISTRATIVA DESBLOQUEADA
              </Text>
              <Pressable onPress={handleLock} style={styles.lockButton}>
                <Ionicons name="lock-open" size={16} color={PALETTE.successGreen} />
                <Text style={styles.lockButtonText}>Bloquear</Text>
              </Pressable>
            </View>

            <View style={styles.card}>
              
              {/* Ajustes de Empleado y Empresa */}
              <Text style={styles.inputLabel}>Nombre del Empleado</Text>
              <TextInput
                style={styles.input}
                value={localSettings.employeeName}
                onChangeText={(val) => updateField('employeeName', val)}
                placeholderTextColor={PALETTE.textMuted}
              />

              <Text style={styles.inputLabel}>Empresa Contratista</Text>
              <TextInput
                style={styles.input}
                value={localSettings.employerName}
                onChangeText={(val) => updateField('employerName', val)}
                placeholderTextColor={PALETTE.textMuted}
              />

              <Text style={styles.inputLabel}>Correo de Recursos Humanos (Destino PDF)</Text>
              <TextInput
                style={styles.input}
                value={localSettings.companyEmail}
                onChangeText={(val) => updateField('companyEmail', val)}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={PALETTE.textMuted}
              />

              <View style={styles.divider} />

              {/* Ajustes de Nómina */}
              <View style={styles.rowInputs}>
                <View style={styles.flexInput}>
                  <Text style={styles.inputLabel}>Tarifa Base ($/hr)</Text>
                  <TextInput
                    style={styles.input}
                    value={localSettings.hourlyRate.toString()}
                    onChangeText={(val) => updateField('hourlyRate', parseFloat(val) || 0)}
                    keyboardType="decimal-pad"
                    placeholderTextColor={PALETTE.textMuted}
                  />
                </View>
                <View style={styles.flexInput}>
                  <Text style={styles.inputLabel}>Multiplicador OT</Text>
                  <TextInput
                    style={styles.input}
                    value={localSettings.overtimeMultiplier.toString()}
                    onChangeText={(val) => updateField('overtimeMultiplier', parseFloat(val) || 1.5)}
                    keyboardType="decimal-pad"
                    placeholderTextColor={PALETTE.textMuted}
                  />
                </View>
              </View>

              <View style={styles.divider} />

              {/* Ajustes Operativos */}
              <View style={styles.rowInputs}>
                <View style={styles.flexInput}>
                  <Text style={styles.inputLabel}>Radio Geocerca (m)</Text>
                  <TextInput
                    style={styles.input}
                    value={localSettings.toleranceRadiusMeters.toString()}
                    onChangeText={(val) => updateField('toleranceRadiusMeters', parseInt(val, 10) || 200)}
                    keyboardType="number-pad"
                    placeholderTextColor={PALETTE.textMuted}
                  />
                </View>
                <View style={styles.flexInput}>
                  <Text style={styles.inputLabel}>Recordatorio Diario</Text>
                  <TextInput
                    style={styles.input}
                    value={localSettings.dailyReminderTime}
                    onChangeText={(val) => updateField('dailyReminderTime', val)}
                    placeholder="07:00"
                    placeholderTextColor={PALETTE.textMuted}
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
          </Animated.View>
        )}

        <View style={styles.bottomSpacer} />
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PALETTE.obsidian,
    paddingTop: Platform.OS === 'android' ? 40 : 0,
  },
  header: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  headerTitle: {
    ...FONT.h1,
    color: PALETTE.textPrimary,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.xxl,
  },
  sectionBlock: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.xl,
  },
  sectionTitle: {
    ...FONT.label,
    color: PALETTE.textMuted,
    letterSpacing: 1.5,
    marginBottom: SPACING.sm,
  },
  card: {
    backgroundColor: PALETTE.carbonMist,
    borderRadius: RADIUS.cards,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: PALETTE.steelLine,
  },
  divider: {
    height: 1,
    backgroundColor: PALETTE.steelLine,
    marginVertical: SPACING.md,
  },
  // Permisos
  permissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  permissionLabel: {
    ...FONT.body,
    color: PALETTE.textPrimary,
  },
  permissionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(235, 87, 87, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.round,
    gap: 4,
  },
  permissionBadgeGranted: {
    backgroundColor: 'rgba(39, 174, 96, 0.1)',
  },
  permissionText: {
    ...FONT.caption,
    fontSize: 9,
    fontWeight: '700',
    color: PALETTE.deepRed,
  },
  permissionTextGranted: {
    color: PALETTE.successGreen,
  },
  // Seguridad
  securityHeader: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  securityTitle: {
    ...FONT.h2,
    color: PALETTE.textPrimary,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  securitySubtitle: {
    ...FONT.caption,
    color: PALETTE.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  pinInput: {
    backgroundColor: PALETTE.graphite,
    borderWidth: 1,
    borderColor: PALETTE.steelLine,
    borderRadius: RADIUS.inputs,
    padding: SPACING.md,
    color: PALETTE.textPrimary,
    ...FONT.h2,
    textAlign: 'center',
    letterSpacing: 8,
  },
  errorText: {
    ...FONT.caption,
    color: PALETTE.deepRed,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  unlockedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  lockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(39, 174, 96, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.round,
    gap: 4,
  },
  lockButtonText: {
    ...FONT.caption,
    fontWeight: '700',
    color: PALETTE.successGreen,
  },
  // Formulario de Ajustes
  inputLabel: {
    ...FONT.label,
    color: PALETTE.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: PALETTE.graphite,
    borderWidth: 1,
    borderColor: PALETTE.steelLine,
    borderRadius: RADIUS.inputs,
    padding: SPACING.md,
    color: PALETTE.textPrimary,
    ...FONT.body,
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
