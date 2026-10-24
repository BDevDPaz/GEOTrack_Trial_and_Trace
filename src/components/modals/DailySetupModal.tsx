import React, { useState, useEffect, useCallback } from "react";
import { Alert, Text } from "react-native";
import { ModalShell } from "../ui/ModalShell";
import { Input } from "../ui/Input";
import { ICONS } from "../../constants/icons";
import { TOKENS } from "../../constants/theme";
import {
  checkStart,
  Coordinates,
  DEFAULT_DISTANCE_WARNING_METERS,
} from "../../services/AddressResolver";
import { t } from "../../utils/i18n";

export interface ResolvedStart {
  /** Dirección confirmada por el usuario (formateada por el geocoder). */
  address: string;
  target: Coordinates;
  /** Posición del usuario al iniciar (null si el GPS no respondió). */
  setup: Coordinates | null;
  distanceMeters: number | null;
}

interface DailySetupModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: (destination: string, resolved: ResolvedStart) => void;
  language?: "es" | "en";
  distanceWarningMeters?: number;
}

const ask = (
  title: string,
  message: string,
  cancelLabel: string,
  okLabel: string,
): Promise<boolean> =>
  new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelLabel, style: "cancel", onPress: () => resolve(false) },
        { text: okLabel, onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });

export function DailySetupModal({
  visible,
  onCancel,
  onConfirm,
  language = "es",
  distanceWarningMeters = DEFAULT_DISTANCE_WARNING_METERS,
}: DailySetupModalProps) {
  const [dest, setDest] = useState("");
  const [addr, setAddr] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (visible) {
      setDest("");
      setAddr("");
      setError(null);
      setChecking(false);
    }
  }, [visible]);

  const handleStart = useCallback(async () => {
    setError(null);
    setChecking(true);
    try {
      const result = await checkStart(addr, distanceWarningMeters);
      if (result.kind === "blocked") {
        const key =
          result.reason === "empty"
            ? "addr_required"
            : result.reason === "not_found"
              ? "addr_not_found"
              : result.reason === "permission_denied"
                ? "addr_permission_denied"
                : "addr_geocode_error";
        setError(t(language, key));
        return;
      }

      // 1) Confirmar la dirección que entendió el geocoder.
      const addressOk = await ask(
        t(language, "addr_confirm_title"),
        `${t(language, "addr_confirm_msg")}\n\n${result.formattedAddress}`,
        t(language, "btn_correct"),
        t(language, "btn_confirm"),
      );
      if (!addressOk) return;

      // 2) Advertir si está lejos de la dirección.
      if (result.isFar && result.distanceMeters !== null) {
        const go = await ask(
          t(language, "addr_far_title"),
          t(language, "addr_far_msg", {
            km: (result.distanceMeters / 1000).toFixed(1),
          }),
          t(language, "btn_correct"),
          t(language, "btn_start_anyway"),
        );
        if (!go) return;
      }

      onConfirm(dest.trim() || "Destino no especificado", {
        address: result.formattedAddress,
        target: result.target,
        setup: result.current,
        distanceMeters: result.distanceMeters,
      });
    } finally {
      setChecking(false);
    }
  }, [addr, dest, distanceWarningMeters, language, onConfirm]);

  return (
    <ModalShell
      visible={visible}
      title="Iniciar jornada"
      description="Configura el destino inicial para el seguimiento automático."
      onClose={onCancel}
      primaryAction={{
        label: checking ? t(language, "addr_checking") : "Iniciar jornada",
        onPress: handleStart,
        disabled: checking || !dest.trim() || !addr.trim(),
      }}
      secondaryAction={{
        label: "Cancelar",
        onPress: onCancel,
      }}
      icon={ICONS.domain.location}
      scrollable
    >
      <Input
        label="Destino"
        placeholder="Ej. Taller central"
        icon={ICONS.domain.location}
        value={dest}
        onChangeText={setDest}
        autoFocus
      />
      <Input
        label={t(language, "addr_label")}
        placeholder="Ej. 123 Main St, Los Angeles, CA"
        icon="map-outline"
        value={addr}
        onChangeText={(v) => {
          setAddr(v);
          if (error) setError(null);
        }}
      />
      {error ? (
        <Text style={{ color: TOKENS.colors.status.danger, marginTop: 8 }}>
          {error}
        </Text>
      ) : null}
    </ModalShell>
  );
}
