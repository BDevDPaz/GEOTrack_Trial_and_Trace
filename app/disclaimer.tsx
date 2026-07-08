import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useWorkTracker } from '../src/core/hooks';
import { Button, ScreenContainer, AppBrandTitle } from '../src/components/ui';
import { SPACING, PALETTE } from '../src/constants/theme';

export default function DisclaimerScreen() {
  const { dispatch } = useWorkTracker();

  const handleAccept = () => {
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
            \n\n
            Al continuar, usted acepta que:
            \n\n
            1. La aplicación acceda a su ubicación &quot;Siempre&quot;.
            \n
            2. Se utilicen notificaciones para informarle de cambios en su estado.
            \n
            3. Los datos recolectados se utilicen exclusivamente para la generación de reportes de horas trabajadas.
          </Text>
        </ScrollView>
        <View style={styles.footer}>
          <Button label="ACEPTAR Y CONTINUAR" variant="primary" onPress={handleAccept} />
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
    color: PALETTE.white,
    marginVertical: SPACING.xl,
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
    marginBottom: SPACING.xl,
  },
  text: {
    fontSize: 15,
    color: PALETTE.silver,
    lineHeight: 22,
  },
  footer: {
    paddingBottom: SPACING.xl,
  },
});
