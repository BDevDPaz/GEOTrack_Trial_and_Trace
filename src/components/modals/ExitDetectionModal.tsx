import { t } from "../../utils/i18n";
import React from "react";
import { ModalShell } from "../ui/ModalShell";
import { ICONS } from "../../constants/icons";

interface ExitDetectionModalProps {
  language?: "es" | "en";
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
  language = "es",
}: ExitDetectionModalProps) {
  return (
    <ModalShell
      visible={visible}
      title={t(language, "modal_exit_title")}
      description={t(language, "modal_exit_desc", { time: exitTime })}
      tone="warning"
      icon={ICONS.status.warning}
      onClose={onContinueOperating}
      primaryAction={{
        label: t(language, "modal_exit_continue"),
        onPress: onContinueOperating,
      }}
      secondaryAction={{
        label: t(language, "modal_exit_end"),
        onPress: onCloseShift,
        variant: "secondary",
      }}
    />
  );
}
