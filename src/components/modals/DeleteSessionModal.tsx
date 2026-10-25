import { t } from "../../utils/i18n";
import React from "react";
import { ModalShell } from "../ui/ModalShell";
import { ICONS } from "../../constants/icons";

interface DeleteSessionModalProps {
  language?: "es" | "en";
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteSessionModal({
  visible,
  onCancel,
  onConfirm,
  language = "es",
}: DeleteSessionModalProps) {
  return (
    <ModalShell
      visible={visible}
      title={t(language, "modal_delete_title")}
      description={t(language, "modal_delete_desc")}
      tone="danger"
      icon={ICONS.actions.delete}
      onClose={onCancel}
      primaryAction={{
        label: t(language, "modal_delete_confirm"),
        onPress: onConfirm,
        variant: "danger",
      }}
      secondaryAction={{
        label: t(language, "modal_cancel"),
        onPress: onCancel,
      }}
    />
  );
}
