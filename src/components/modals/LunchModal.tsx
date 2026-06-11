import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

// Importaciones adaptadas a la nueva arquitectura
import { useTheme } from '../../context/ThemeContext';
import { getSpringConfig } from '../../constants/animations';
import { RADIUS, FONT, SPACING } from '../../constants/theme';
import { Button } from '../ui/Button';

interface LunchModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: (minutes: number) => void;
}

export function LunchModal({ visible, onCancel, onConfirm }: LunchModalProps) {
  // Consumo dinámico del tema y de las físicas
  const { colors } = useTheme();
  const springConfig = getSpringConfig();

  const [selected, setSelected] = useState(30);

  useEffect(() => {
    if (visible) {
      setSelected(30);
    }
  }, [visible]);

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
            }
          ]}
        >
          
          <View style={styles.headerRow}>
            <Ionicons name="restaurant-outline" size={22} color={colors.mutedGold} />
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Tiempo de descanso
            </Text>
          </View>

          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Selecciona el tiempo que se descontará de la jornada.
          </Text>

          <View style={styles.optionsRow}>
            {[0, 30, 45, 60].map((min) => (
              <Pressable
                key={min}
                onPress={() => setSelected(min)}
                style={[
                  styles.optionPill,
                  {
                    backgroundColor: colors.graphite,
                    borderColor: colors.steelLine,
                  },
                  selected === min && [
                    styles.optionPillActive, 
                    { borderColor: colors.mutedGold }
                  ],
                ]}
              >
                <Text
                  style={[
                    styles.optionText,
                    { color: colors.textSecondary },
                    selected === min && { color: colors.mutedGold },
                  ]}
                >
                  {min} min
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.footer}>
            <Button
              label="Omitir"
              variant="ghost"
              onPress={onCancel}
              style={{ flex: 1 }}
            />

            <Button
              label="Confirmar"
              variant="primary"
              onPress={() => onConfirm(selected)}
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
    // backgroundColor y borderColor aplicados dinámicamente en el JSX
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.xs,
  },

  title: {
    ...FONT.h2,
    // Color aplicado dinámicamente en el JSX
  },

  subtitle: {
    ...FONT.body,
    marginBottom: SPACING.xl,
    lineHeight: 22,
    // Color aplicado dinámicamente en el JSX
  },

  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
  },

  optionPill: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: RADIUS.inputs,
    borderWidth: 1,
    // backgroundColor y borderColor aplicados dinámicamente en el JSX
  },

  optionPillActive: {
    backgroundColor: 'rgba(212, 175, 55, 0.1)', // Fondo translúcido estático para selección activa
    // borderColor aplicado dinámicamente en el JSX
  },

  optionText: {
    ...FONT.bodyStrong,
    // Color aplicado dinámicamente en el JSX
  },

  footer: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
});
