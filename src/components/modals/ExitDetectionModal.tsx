import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

// Importaciones adaptadas a la nueva arquitectura
import { useTheme } from '../../context/ThemeContext';
import { getSpringConfig } from '../../constants/animations';
import { RADIUS, FONT, SPACING } from '../../constants/theme';
import { Button } from '../ui/Button';

interface ExitDetectionModalProps {
  visible: boolean;
  exitTime: string;
  onContinueOperating: () => void;
  onCloseShift: () => void;
}

export function ExitDetectionModal({
  visible,
  exitTime,
  onContinueOperating,
  onCloseShift,
}: ExitDetectionModalProps) {
  // Consumo dinámico del tema y físicas
  const { colors } = useTheme();
  const springConfig = getSpringConfig();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onContinueOperating}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onContinueOperating} />

        <Animated.View
          entering={FadeInDown.springify()
            .damping(springConfig.damping)
            .stiffness(springConfig.stiffness)}
          style={[
            styles.modalCard,
            {
              backgroundColor: colors.carbonMist,
              borderColor: colors.steelLine,
            },
          ]}
        >
          <View style={styles.alertHeader}>
            <View style={styles.iconWrapper}>
              <Ionicons
                name="warning-outline"
                size={24}
                color={colors.amberWarning}
              />
            </View>

            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Salida de zona detectada
            </Text>
          </View>

          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Se detectó una salida de la zona registrada a las{' '}
            <Text style={[styles.timeHighlight, { color: colors.amberWarning }]}>
              {exitTime}
            </Text>
            . ¿Deseas continuar con la jornada o finalizarla?
          </Text>

          <View style={styles.footer}>
            <Button
              label="Finalizar jornada"
              variant="secondary"
              onPress={onCloseShift}
              style={{ flex: 1 }}
            />

            <Button
              label="Continuar jornada"
              variant="primary"
              onPress={onContinueOperating}
              style={{ flex: 1 }}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)', // Velo oscuro estructural
    justifyContent: 'flex-end',
  },

  modalCard: {
    borderTopLeftRadius: RADIUS.cards,
    borderTopRightRadius: RADIUS.cards,
    padding: SPACING.xl,
    paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    // backgroundColor y borderColor se aplican dinámicamente en el JSX
  },

  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },

  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(242, 153, 74, 0.1)', // Fondo de advertencia translúcido estático
    justifyContent: 'center',
    alignItems: 'center',
  },

  title: {
    ...FONT.h2,
    // Color se aplica dinámicamente en el JSX
  },

  subtitle: {
    ...FONT.body,
    marginBottom: SPACING.xl,
    lineHeight: 22,
    // Color se aplica dinámicamente en el JSX
  },

  timeHighlight: {
    ...FONT.bodyStrong,
    // Color se aplica dinámicamente en el JSX
  },

  footer: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
});
