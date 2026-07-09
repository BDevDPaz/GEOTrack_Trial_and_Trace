import React, { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { ModalShell } from "../ui/ModalShell";
import { ICONS } from "../../constants/icons";
import { TOKENS, FONT } from "../../constants/theme";

interface LunchModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: (minutes: number) => void;
}

export function LunchModal({ visible, onCancel, onConfirm }: LunchModalProps) {
  const [selected, setSelected] = useState(30);

  useEffect(() => {
    if (visible) {
      setSelected(30);
    }
  }, [visible]);

  const options = [0, 30, 45, 60];

  return (
    <ModalShell
      visible={visible}
      title="Tiempo de descanso"
      description="Selecciona el tiempo que se descontará de la jornada."
      icon={ICONS.domain.lunch}
      onClose={onCancel}
      primaryAction={{
        label: "Confirmar",
        onPress: () => onConfirm(selected),
      }}
      secondaryAction={{
        label: "Omitir",
        onPress: onCancel,
      }}
    >
      <View style={styles.optionsRow}>
        {options.map((min) => (
          <Pressable
            key={min}
            onPress={() => setSelected(min)}
            style={[
              styles.optionPill,
              {
                backgroundColor: TOKENS.colors.surface,
                borderColor: TOKENS.colors.border,
              },
              selected === min && [
                styles.optionPillActive,
                { borderColor: TOKENS.colors.primary },
              ],
            ]}
            accessibilityRole="radio"
            accessibilityState={{ selected: selected === min }}
            accessibilityLabel={`${min} minutos`}
          >
            <Text
              style={[
                styles.optionText,
                { color: TOKENS.colors.text.secondary },
                selected === min && { color: TOKENS.colors.primary },
              ]}
            >
              {min} min
            </Text>
          </Pressable>
        ))}
      </View>
    </ModalShell>
  );
}

const styles = StyleSheet.create({
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: TOKENS.spacing.sm,
  },
  optionPill: {
    flex: 1,
    paddingVertical: TOKENS.spacing.md,
    alignItems: "center",
    borderRadius: TOKENS.radius.md,
    borderWidth: 1,
  },
  optionPillActive: {
    backgroundColor: `${TOKENS.colors.primary}15`,
  },
  optionText: {
    ...FONT.bodyStrong,
    fontSize: 14,
  },
});
