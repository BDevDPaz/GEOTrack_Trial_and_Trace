import { t } from "../../utils/i18n";
import React, { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { ModalShell } from "../ui/ModalShell";
import { Input } from "../ui/Input";
import { ICONS } from "../../constants/icons";
import { TOKENS } from "../../constants/theme";

interface EditSessionModalProps {
  language?: "es" | "en";
  visible: boolean;
  onCancel: () => void;
  onSave: () => void;
}

export function EditSessionModal({
  visible,
  onCancel,
  onSave,
  language = "es",
}: EditSessionModalProps) {
  const [inTime, setInTime] = useState("04:56 PM");
  const [outTime, setOutTime] = useState("06:34 PM");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (visible) {
      setNote("");
    }
  }, [visible]);

  const isCorrupted =
    inTime.includes("??") ||
    outTime.includes("??") ||
    inTime === "" ||
    outTime === "";

  return (
    <ModalShell
      visible={visible}
      title={t(language, "modal_edit_title")}
      description={t(language, "modal_edit_desc")}
      onClose={onCancel}
      icon={ICONS.actions.edit}
      primaryAction={{
        label: t(language, "modal_edit_save"),
        onPress: onSave,
        disabled: !note.trim() || isCorrupted,
      }}
      secondaryAction={{
        label: t(language, "modal_cancel"),
        onPress: onCancel,
      }}
      scrollable
    >
      <View style={styles.row}>
        <Input
          label={t(language, "modal_edit_start")}
          value={inTime}
          onChangeText={setInTime}
          placeholder="08:00 AM"
          error={isCorrupted ? t(language, "modal_edit_invalid") : undefined}
          containerStyle={styles.flexInput}
        />
        <Input
          label={t(language, "modal_edit_end")}
          value={outTime}
          onChangeText={setOutTime}
          placeholder="05:00 PM"
          error={isCorrupted ? t(language, "modal_edit_invalid") : undefined}
          containerStyle={styles.flexInput}
        />
      </View>

      <Input
        label={t(language, "modal_edit_reason")}
        placeholder={t(language, "modal_edit_reason_placeholder")}
        value={note}
        onChangeText={setNote}
        multiline
        numberOfLines={3}
        style={styles.textArea}
      />
    </ModalShell>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: TOKENS.spacing.md,
  },
  flexInput: {
    flex: 1,
  },
  textArea: {
    height: 90,
    textAlignVertical: "top",
  },
});
