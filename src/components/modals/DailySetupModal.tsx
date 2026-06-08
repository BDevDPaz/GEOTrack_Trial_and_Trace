import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Platform,
} from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';

// Importaciones adaptadas a la nueva arquitectura
import { useTheme } from '../../context/ThemeContext';
import { getSpringConfig } from '../../constants/animations';
import { RADIUS, FONT, SPACING } from '../../constants/theme';
import { Button } from '../ui/Button';

interface DailySetupModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: (destination: string, address?: string) => void;
}

export function DailySetupModal({
  visible,
  onCancel,
  onConfirm,
}: DailySetupModalProps) {
  // Consumo dinámico del tema centralizado y físicas
  const { colors } = useTheme();
  const springConfig = getSpringConfig();

  const [dest, setDest] = useState('');
  const [addr, setAddr] = useState('');

  useEffect(() => {
    if (visible) {
      setDest('');
      setAddr('');
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />

        <KeyboardAwareScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid={true}
          extraScrollHeight={Platform.OS === 'ios' ? 20 : 40}
        >
          <Animated.View
            entering={SlideInDown.springify()
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
            <View style={styles.headerRow}>
              <Ionicons name="play-circle-outline" size={22} color={colors.mutedGold} />
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                Iniciar jornada
              </Text>
            </View>

            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Ingresa el destino donde comenzarás la jornada.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Destino</Text>

              <View 
                style={[
                  styles.inputRow,
                  {
                    backgroundColor: colors.graphite,
                    borderColor: colors.steelLine,
                  }
                ]}
              >
                <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  placeholder="Ej. Taller central"
                  placeholderTextColor={colors.textMuted}
                  value={dest}
                  onChangeText={setDest}
                  autoFocus
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Dirección (opcional)</Text>

              <View 
                style={[
                  styles.inputRow,
                  {
                    backgroundColor: colors.graphite,
                    borderColor: colors.steelLine,
                  }
                ]}
              >
                <Ionicons name="map-outline" size={16} color={colors.textSecondary} />
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  placeholder="Ej. 123 Main St"
                  placeholderTextColor={colors.textMuted}
                  value={addr}
                  onChangeText={setAddr}
                />
              </View>
            </View>

            <View style={styles.footer}>
              <Button
                label="Cancelar"
                variant="ghost"
                onPress={onCancel}
                style={{ flex: 1 }}
              />

              <Button
                label="Iniciar jornada"
                variant="primary"
                onPress={() => onConfirm(dest || 'Destino no especificado', addr)}
                style={{ flex: 1 }}
                disabled={!dest.trim()}
              />
            </View>

          </Animated.View>
        </KeyboardAwareScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)', // Velo oscuro estructural
  },

  scrollContainer: {
    flexGrow: 1,
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
    // Color aplicado dinámicamente en el JSX
  },

  inputGroup: {
    marginBottom: SPACING.lg,
  },

  label: {
    ...FONT.caption,
    marginBottom: 8,
    // Color aplicado dinámicamente en el JSX
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: RADIUS.inputs,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    // backgroundColor y borderColor aplicados dinámicamente en el JSX
  },

  input: {
    flex: 1,
    height: 52,
    ...FONT.body,
    // Color aplicado dinámicamente en el JSX
  },

  footer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
});
