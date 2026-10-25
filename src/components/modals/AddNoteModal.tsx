import { t } from "../../utils/i18n";
import React, { useState, useEffect } from "react";
import { StyleSheet } from "react-native";
import { ModalShell } from "../ui/ModalShell";
import { Input } from "../ui/Input";
import { ICONS } from "../../constants/icons";

interface AddNoteModalProps {
  language?: "es" | "en";
  visible: boolean;
  onCancel: () => void;
  onSave: (note: string) => void;
}

export function AddNoteModal({
  visible,
  onCancel,
  onSave,
  language = "es",
}: AddNoteModalProps) {
  const [note, setNote] = useState("");

  useEffect(() => {
    if (visible) {
      setNote("");
    }
  }, [visible]);

  return (
    <ModalShell
      visible={visible}
      title={t(language, "modal_note_title")}
      description={t(language, "modal_note_desc")}
      onClose={onCancel}
      primaryAction={{
        label: t(language, "modal_note_save"),
        onPress: () => onSave(note),
        disabled: !note.trim(),
      }}
      secondaryAction={{
        label: t(language, "modal_cancel"),
        onPress: onCancel,
      }}
      icon={ICONS.actions.add}
    >
      <Input
        placeholder={t(language, "modal_note_placeholder")}
        value={note}
        onChangeText={setNote}
        multiline
        numberOfLines={4}
        style={styles.textArea}
        autoFocus
      />
    </ModalShell>
  );
}

const styles = StyleSheet.create({
  textArea: {
    height: 120,
    textAlignVertical: "top",
  },
});
