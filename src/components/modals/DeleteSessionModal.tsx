import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

// Importaciones adaptadas a la nueva arquitectura
import { useTheme } from '../../context/ThemeContext';
import { getSpringConfig } from '../../constants/animations';
import { RADIUS, FONT, SPACING } from '../../constants/theme';
import { Button } from '../ui/Button';

interface DeleteSessionModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteSessionModal({
  visible,
  onCancel,
  onConfirm,
}: DeleteSessionModalProps) {
  // Consumo dinámico del tema y de las físicas centralizadas
  const { colors } = useTheme();
  const springConfig = getSpringConfig();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />

        <Animated.View
          entering={FadeInDown.springify()
            .damping(springConfig.damping ?? 20)
            .stiffness(springConfig.stiffness ?? 150)}
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
                name="trash-bin-outline"
                size={24}
                color={colors.deepRed}
              />
            </View>

            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Eliminar jornada
            </Text>
          </View>

          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Esta acción es irreversible. Se eliminarán permanentemente todos los
            eventos, registros de tiempo y cálculos asociados a esta jornada.
          </Text>

          <View style={styles.footer}>
            <Button
              label="Cancelar"
              variant="ghost"
              onPress={onCancel}
              style={{ flex: 1 }}
            />

            <Button
              label="Eliminar"
              variant="danger"
              onPress={onConfirm}
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
    backgroundColor: 'rgba(0,0,0,0.6)', // Velo oscuro estructural estático
    justifyContent: 'flex-end',
  },

  modalCard: {
    borderTopLeftRadius: RADIUS.cards,
    borderTopRightRadius: RADIUS.cards,
    padding: SPACING.xl,
    paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    // BackgroundColor y borderColor se aplican dinámicamente en el JSX
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
    backgroundColor: 'rgba(235, 87, 87, 0.1)', // Fondo translúcido estático para el peligro
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

  footer: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
});
