import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useWorkTracker } from '../src/core/hooks';
import { Button, ScreenContainer, PageHeader, Card } from '../src/components/ui';
import { TOKENS, FONT } from '../src/constants/theme';

export default function DisclaimerScreen() {
  const { dispatch } = useWorkTracker();
  const [accepted, setAccepted] = useState(false);

  const handleAccept = () => {
    if (!accepted) return;
    dispatch({ type: 'DISCLAIMER_ACCEPTED' });
  };

  return (
    <ScreenContainer noPadding>
      <PageHeader title="Aviso Legal" subtitle="Privacidad y Términos" />

      <View style={styles.container}>
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <Card variant="surface">
            <Text style={[styles.text, { color: TOKENS.colors.text.secondary }]}>
              GEOTrack utiliza su ubicación en segundo plano para registrar automáticamente su entrada y salida de los lugares de trabajo asignados.
              {"\n\n"}
              Al continuar, usted acepta que:
              {"\n\n"}
              1. La aplicación acceda a su ubicación “Siempre” para garantizar la precisión de la trazabilidad.
              {"\n\n"}
              2. Se utilicen notificaciones push para informarle de cambios en su estado operativo y recordatorios.
              {"\n\n"}
              3. Los datos recolectados (coordenadas GPS, marcas de tiempo) se utilicen exclusivamente para la generación de reportes de horas trabajadas y auditoría de integridad.
              {"\n\n"}
              Sus datos son almacenados localmente y solo se comparten cuando usted decide exportar un reporte oficial.
            </Text>
          </Card>
        </ScrollView>

        <Pressable
          style={styles.checkboxRow}
          onPress={() => setAccepted(prev => !prev)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: accepted }}
          accessibilityLabel="Acepto los términos y condiciones"
        >
          <View style={[
            styles.checkbox,
            { borderColor: TOKENS.colors.border },
            accepted && { backgroundColor: TOKENS.colors.primary, borderColor: TOKENS.colors.primary }
          ]}>
            {accepted && <Text style={[styles.checkboxMark, { color: TOKENS.colors.text.inverse }]}>✓</Text>}
          </View>

          <Text style={[styles.checkboxText, { color: TOKENS.colors.text.secondary }]}>
            He leído y acepto el aviso legal y la política de privacidad.
          </Text>
        </Pressable>

        <View style={styles.footer}>
          <Button
            label={accepted ? 'ACEPTAR Y CONTINUAR' : 'DEBE ACEPTAR PARA CONTINUAR'}
            variant="primary"
            onPress={handleAccept}
            disabled={!accepted}
            size="lg"
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: TOKENS.layout.screenPadding,
  },
  scroll: {
    flex: 1,
    marginBottom: TOKENS.spacing.xl,
  },
  text: {
    ...FONT.body,
    lineHeight: 22,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: TOKENS.spacing.xl,
    gap: TOKENS.spacing.md,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: TOKENS.radius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxMark: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  checkboxText: {
    flex: 1,
    ...FONT.caption,
    lineHeight: 18,
  },
  footer: {
    paddingBottom: TOKENS.spacing.xl,
  },
});
