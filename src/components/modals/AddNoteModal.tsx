import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TextInput, Pressable, Platform } from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../context/ThemeContext';
import { getSpringConfig } from '../../constants/animations';
import { RADIUS, FONT, SPACING } from '../../constants/theme';
import { Button } from '../ui/Button';

interface AddNoteModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: (note: string) => void;
}

export function AddNoteModal({ visible, onCancel, onConfirm }: AddNoteModalProps) {
  const { colors } = useTheme();
  const springConfig = getSpringConfig();
  const [note, setNote] = useState('');

  useEffect(() => {
    if (visible) setNote('');
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
              { backgroundColor: colors.carbonMist, borderColor: colors.steelLine },
            ]}
          >
            <View style={styles.headerRow}>
              <Ionicons name="document-text-outline" size={22} color={colors.slateBlue} />
              <Text style={[styles.title, { color: colors.textPrimary }]}>Añadir nota</Text>
            </View>

            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Registra un evento, retraso o material utilizado en esta jornada.
            </Text>

            <View style={styles.inputGroup}>
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
                placeholder="Ej. Esperando autorización de acceso..."
                placeholderTextColor={colors.textMuted}
                value={note}
                onChangeText={setNote}
                multiline
                textAlignVertical="top"
                autoFocus
              />
            </View>

            <View style={styles.footer}>
              <Button label="Cancelar" variant="ghost" onPress={onCancel} style={{ flex: 1 }} />
              <Button
                label="Guardar nota"
                variant="primary"
                onPress={() => onConfirm(note)}
                style={{ flex: 1 }}
                disabled={!note.trim()}
              />
            </View>
          </Animated.View>
        </KeyboardAwareScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  scrollContainer: { flexGrow: 1, justifyContent: 'flex-end' },
  modalCard: {
    borderTopLeftRadius: RADIUS.cards,
    borderTopRightRadius: RADIUS.cards,
    padding: SPACING.xl,
    paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.xs },
  title: { ...FONT.h2 },
  subtitle: { ...FONT.body, marginBottom: SPACING.xl },
  inputGroup: { marginBottom: SPACING.lg },
  input: {
    borderRadius: RADIUS.inputs,
    paddingHorizontal: SPACING.lg,
    ...FONT.body,
    borderWidth: 1,
  },
  textArea: { height: 120, paddingVertical: SPACING.md },
  footer: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.sm },
});
