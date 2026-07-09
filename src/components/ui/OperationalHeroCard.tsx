import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";

import { TOKENS, FONT } from "../../constants/theme";
import { StatusPill, StatusType } from "./StatusPill";
import { Button, ButtonVariant } from "./Button";

export type EngineState =
  | "NO_INICIADA"
  | "ESPERANDO_LLEGADA"
  | "ASINCRONIA_CHECKIN"
  | "NO_SHOW"
  | "EN_TRASLADO"
  | "ACTIVA"
  | "SALIDA_DETECTADA"
  | "CERRADA";

interface OperationalHeroCardProps {
  state: EngineState;
  destination?: string;
  timeString: string;
  earnings: string;
  onPrimaryAction: () => void;
  onSecondaryAction?: () => void;
}

export function OperationalHeroCard({
  state,
  destination,
  timeString,
  earnings,
  onPrimaryAction,
  onSecondaryAction,
}: OperationalHeroCardProps) {
  const getStateConfig = () => {
    switch (state) {
      case "NO_INICIADA":
        return {
          pillState: "info" as StatusType,
          pillLabel: "Sin iniciar",
          primaryLabel: "Iniciar jornada",
          primaryVariant: "primary" as ButtonVariant,
          secondaryLabel: null,
        };

      case "ESPERANDO_LLEGADA":
        return {
          pillState: "pending" as StatusType,
          pillLabel: "En camino",
          primaryLabel: "Confirmar llegada",
          primaryVariant: "primary" as ButtonVariant,
          secondaryLabel: null,
        };

      case "ASINCRONIA_CHECKIN":
        return {
          pillState: "warning" as StatusType,
          pillLabel: "Ubicación inestable",
          primaryLabel: "Confirmar manual",
          primaryVariant: "danger" as ButtonVariant,
          secondaryLabel: "Ver detalles",
        };

      case "EN_TRASLADO":
        return {
          pillState: "active" as StatusType,
          pillLabel: "En traslado",
          primaryLabel: "Llegué al sitio",
          primaryVariant: "primary" as ButtonVariant,
          secondaryLabel: null,
        };

      case "ACTIVA":
        return {
          pillState: "active" as StatusType,
          pillLabel: "Jornada en curso",
          primaryLabel: "Finalizar jornada",
          primaryVariant: "primary" as ButtonVariant,
          secondaryLabel: "Cambiar sitio",
        };

      case "SALIDA_DETECTADA":
        return {
          pillState: "warning" as StatusType,
          pillLabel: "Fuera de zona",
          primaryLabel: "Resolver",
          primaryVariant: "primary" as ButtonVariant,
          secondaryLabel: "Finalizar ya",
        };

      default:
        return {
          pillState: "info" as StatusType,
          pillLabel: "Estado desconocido",
          primaryLabel: "Actualizar",
          primaryVariant: "primary" as ButtonVariant,
          secondaryLabel: null,
        };
    }
  };

  const config = getStateConfig();

  return (
    <Animated.View
      layout={LinearTransition.springify().damping(20).stiffness(150)}
      style={[
        styles.cardContainer,
        {
          backgroundColor: TOKENS.colors.surfaceElevated,
          borderColor: TOKENS.colors.border,
          ...TOKENS.shadows.md,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <StatusPill status={config.pillState} label={config.pillLabel} />

        {destination && (
          <Text
            style={[
              styles.destinationText,
              { color: TOKENS.colors.text.primary },
            ]}
            numberOfLines={1}
          >
            {destination}
          </Text>
        )}
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metricBlock}>
          <Text
            style={[
              styles.metricLabel,
              { color: TOKENS.colors.text.secondary },
            ]}
          >
            TIEMPO ACUMULADO
          </Text>
          <Text
            style={[
              styles.metricBigValue,
              { color: TOKENS.colors.text.primary },
            ]}
          >
            {timeString}
          </Text>
        </View>

        <View style={styles.metricBlockRight}>
          <Text
            style={[
              styles.metricLabel,
              { color: TOKENS.colors.text.secondary },
            ]}
          >
            GANANCIA EST.
          </Text>
          <Text
            style={[styles.metricBigValue, { color: TOKENS.colors.primary }]}
          >
            {earnings}
          </Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <Button
          label={config.primaryLabel}
          variant={config.primaryVariant}
          onPress={onPrimaryAction}
          style={styles.flexButton}
        />

        {config.secondaryLabel && onSecondaryAction && (
          <Button
            label={config.secondaryLabel}
            variant="secondary"
            onPress={onSecondaryAction}
            style={styles.flexButton}
          />
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    marginHorizontal: TOKENS.layout.screenPadding,
    borderRadius: TOKENS.radius.lg,
    padding: TOKENS.spacing.xl,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: TOKENS.spacing.lg,
  },
  destinationText: {
    ...FONT.bodyStrong,
    flex: 1,
    textAlign: "right",
    marginLeft: TOKENS.spacing.md,
  },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: TOKENS.spacing.xl,
  },
  metricBlock: {
    flex: 1,
  },
  metricBlockRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  metricLabel: {
    ...FONT.label,
    marginBottom: TOKENS.spacing.xs,
  },
  metricBigValue: {
    ...FONT.h1,
    fontSize: 36,
  },
  actionRow: {
    flexDirection: "row",
    gap: TOKENS.spacing.md,
  },
  flexButton: {
    flex: 1,
  },
});
