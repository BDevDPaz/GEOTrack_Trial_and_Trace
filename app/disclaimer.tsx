import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useWorkTracker } from '../src/core/hooks';
import { Button, ScreenContainer, AppBrandTitle } from '../src/components/ui';
import { SPACING, PALETTE } from '../src/constants/theme';

export default function DisclaimerScreen() {
  const { dispatch } = useWorkTracker();
  const [accepted, setAccepted] = useState(false);

  const handleAccept = () => {
    if (!accepted) return;
    dispatch({ type: 'DISCLAIMER_ACCEPTED' });
  };

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <AppBrandTitle />

        <Text style={styles.title}>Aviso Legal y Privacidad</Text>

        <ScrollView style={styles.scroll}>
          <Text style={styles.text}>
            WTracker utiliza su ubicación en segundo plano para registrar automáticamente su entrada y salida de los lugares de trabajo asignados.
            {'\n\n'}
            Al continuar, usted acepta que:
            {'\n\n'}
            1. La aplicación acceda a su ubicación “Siempre”.
            {'\n'}
            2. Se utilicen notificaciones para informarle de cambios en su estado.
            {'\n'}
            3. Los datos recolectados se utilicen exclusivamente para la generación de reportes de horas trabajadas.
          </Text>
        </ScrollView>

        <Pressable
          style={styles.checkboxRow}
          onPress={() => setAccepted(prev => !prev)}
        >
          <View style={[styles.checkbox, accepted && styles.checkboxChecked]}>
            {accepted && <Text style={styles.checkboxMark}>✓</Text>}
          </View>

          <Text style={styles.checkboxText}>
            He leído y acepto el aviso legal y la política de privacidad.
          </Text>
        </Pressable>

        <View style={[styles.footer, !accepted && styles.footerDisabled]}>
          <Button
            label={accepted ? 'ACEPTAR Y CONTINUAR' : 'MARQUE LA ACEPTACIÓN PARA CONTINUAR'}
            variant="primary"
            onPress={handleAccept}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SPACING.xl,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: PALETTE.textPrimary,
    marginVertical: SPACING.xl,
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
    marginBottom: SPACING.xl,
  },
  text: {
    fontSize: 15,
    color: PALETTE.textSecondary,
    lineHeight: 22,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: PALETTE.steelLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: PALETTE.mutedGold,
    borderColor: PALETTE.mutedGold,
  },
  checkboxMark: {
    color: PALETTE.obsidian,
    fontWeight: 'bold',
  },
  checkboxText: {
    flex: 1,
    color: PALETTE.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    paddingBottom: SPACING.xl,
  },
  footerDisabled: {
    opacity: 0.55,
  },
});
