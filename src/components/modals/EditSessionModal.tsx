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
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

// Importaciones adaptadas a la nueva arquitectura
import { useTheme } from '../../context/ThemeContext';
import { getSpringConfig } from '../../constants/animations';
import { RADIUS, FONT, SPACING } from '../../constants/theme';
import { Button } from '../ui/Button';

interface EditSessionModalProps {
  visible: boolean;
  onCancel: () => void;
  onSave: () => void;
}

export function EditSessionModal({
  visible,
  onCancel,
  onSave,
}: EditSessionModalProps) {
  // Consumo dinámico del tema y físicas
  const { colors } = useTheme();
  const springConfig = getSpringConfig();

  const [inTime, setInTime] = useState('04:56 PM');
  const [outTime, setOutTime] = useState('06:34 PM');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (visible) {
      setNote('');
    }
  }, [visible]);

  const isCorrupted =
    inTime.includes('??') ||
    outTime.includes('??') ||
    inTime === '' ||
    outTime === '';

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

        <KeyboardAwareScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid={true}
          enableAutomaticScroll={false}
          extraScrollHeight={Platform.OS === 'ios' ? 20 : 40}
        >
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
            <View style={styles.headerRow}>
              <Ionicons name="create-outline" size={20} color={colors.mutedGold} />
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                Editar jornada
              </Text>
            </View>

            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Ajusta los horarios registrados de esta jornada.
            </Text>

            {isCorrupted ? (
              <View style={[styles.warningBanner, { borderColor: colors.deepRed }]}>
                <Ionicons name="warning-outline" size={16} color={colors.deepRed} />
                <Text style={[styles.warningText, { color: colors.deepRed }]}>
                  Se detectaron datos inválidos. Ingresa horarios correctos.
                </Text>
              </View>
            ) : (
              inTime !== '04:56 PM' && (
                <View style={[styles.infoBanner, { borderColor: colors.mutedGold }]}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={16}
                    color={colors.mutedGold}
                  />
                  <Text style={[styles.infoText, { color: colors.mutedGold }]}>
                    El cálculo de la jornada será actualizado.
                  </Text>
                </View>
              )
            )}

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.leftColumn]}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Hora de inicio
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.graphite,
                      borderColor: colors.steelLine,
                      color: colors.textPrimary,
                    },
                    isCorrupted && { borderColor: colors.deepRed },
                  ]}
                  value={inTime}
                  onChangeText={setInTime}
                  placeholder="08:00 AM"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={[styles.inputGroup, styles.rightColumn]}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Hora de fin
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.graphite,
                      borderColor: colors.steelLine,
                      color: colors.textPrimary,
                    },
                    isCorrupted && { borderColor: colors.deepRed },
                  ]}
                  value={outTime}
                  onChangeText={setOutTime}
                  placeholder="05:00 PM"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Motivo del ajuste
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    backgroundColor: colors.graphite,
                    borderColor: colors.steelLine,
                    color: colors.textPrimary,
                  },
                ]}
                placeholder="Describe el motivo del cambio..."
                placeholderTextColor={colors.textMuted}
                value={note}
                onChangeText={setNote}
                multiline
                textAlignVertical="top"
              />
            </View>

            <View style={styles.footer}>
              <Button
                label="Cancelar"
                variant="ghost"
                onPress={onCancel}
                style={{ flex: 1 }}
              />

              <Button
                label="Guardar cambios"
                variant="primary"
                onPress={onSave}
                style={{ flex: 1 }}
                disabled={!note.trim() || isCorrupted}
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
    backgroundColor: 'rgba(0,0,0,0.6)', // Estructural
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
    // backgroundColor y borderColor se aplican dinámicamente en el JSX
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.xs,
  },

  title: {
    ...FONT.h2,
    // color se aplica dinámicamente en el JSX
  },

  subtitle: {
    ...FONT.body,
    marginBottom: SPACING.lg,
    // color se aplica dinámicamente en el JSX
  },

  warningBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(235, 87, 87, 0.1)', // Fondo de advertencia estático
    padding: SPACING.md,
    borderRadius: RADIUS.inputs,
    borderWidth: 1,
    marginBottom: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.sm,
    // borderColor se aplica dinámicamente en el JSX
  },

  warningText: {
    ...FONT.caption,
    flex: 1,
    // color se aplica dinámicamente en el JSX
  },

  infoBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(212, 175, 55, 0.1)', // Fondo de info estático
    padding: SPACING.md,
    borderRadius: RADIUS.inputs,
    borderWidth: 1,
    marginBottom: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.sm,
    // borderColor se aplica dinámicamente en el JSX
  },

  infoText: {
    ...FONT.caption,
    flex: 1,
    // color se aplica dinámicamente en el JSX
  },

  row: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },

  inputGroup: {
    marginBottom: SPACING.sm,
  },

  leftColumn: {
    flex: 1,
    marginRight: SPACING.md,
  },

  rightColumn: {
    flex: 1,
  },

  label: {
    ...FONT.caption,
    marginBottom: 8,
    // color se aplica dinámicamente en el JSX
  },

  input: {
    borderRadius: RADIUS.inputs,
    height: 52,
    paddingHorizontal: SPACING.lg,
    ...FONT.body,
    borderWidth: 1,
    // backgroundColor, borderColor y color se aplican dinámicamente en el JSX
  },

  textArea: {
    height: 90,
    paddingTop: SPACING.md,
  },

  footer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
});
