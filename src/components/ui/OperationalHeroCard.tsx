import { t } from "../../utils/i18n";
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";

import { TOKENS, FONT } from "../../constants/theme";
import { StatusPill, StatusType } from "./StatusPill";
import { Button, ButtonVariant } from "./Button";

export type EngineState =
  | "IDLE"
  | "GEOFENCE_CREATED"
  | "TRAVEL"
  | "ACTIVE_WORK"
  | "PAUSED"
  | "PENDING_EXIT_CONFIRMATION"
  | "CLOSED";

interface OperationalHeroCardProps {
  state: EngineState;
  destination?: string;
  timeString: string;
  earnings: string;
  onPrimaryAction: () => void;
  onSecondaryAction?: () => void;
  /** Fase C (8): trayecto aún sin llegada → ofrecer "Cancelar trayecto". */
  canCancel?: boolean;
  language?: "es" | "en";
}

export const OperationalHeroCard = React.memo(function OperationalHeroCard({
  state,
  destination,
  timeString,
  earnings,
  onPrimaryAction,
  onSecondaryAction,
  canCancel = false,
  language = "es",
}: OperationalHeroCardProps) {
  const getStateConfig = () => {
    switch (state) {
      case "IDLE":
        return {
          pillState: "info" as StatusType,
          pillLabel: t(language, "hero_pill_idle"),
          primaryLabel: t(language, "hero_setup"),
          primaryVariant: "primary" as ButtonVariant,
          secondaryLabel: null,
        };

      case "GEOFENCE_CREATED":
        return {
          pillState: "pending" as StatusType,
          pillLabel: t(language, "hero_pill_waiting"),
          primaryLabel: t(language, "hero_confirm_arrival"),
          primaryVariant: "primary" as ButtonVariant,
          secondaryLabel: canCancel ? t(language, "hero_cancel_trip") : null,
        };

      case "TRAVEL":
        return {
          pillState: "ACTIVE_WORK" as StatusType,
          pillLabel: t(language, "hero_pill_travel"),
          primaryLabel: t(language, "hero_arrived"),
          primaryVariant: "primary" as ButtonVariant,
          secondaryLabel: canCancel ? t(language, "hero_cancel_trip") : null,
        };

      case "ACTIVE_WORK":
        return {
          pillState: "ACTIVE_WORK" as StatusType,
          pillLabel: t(language, "hero_pill_active"),
          primaryLabel: t(language, "hero_finish"),
          primaryVariant: "danger" as ButtonVariant,
          secondaryLabel: t(language, "hero_pause"),
        };

      case "PAUSED":
        return {
          pillState: "warning" as StatusType,
          pillLabel: t(language, "hero_pill_paused"),
          primaryLabel: t(language, "hero_resume"),
          primaryVariant: "primary" as ButtonVariant,
          secondaryLabel: t(language, "hero_finish"),
        };

      case "PENDING_EXIT_CONFIRMATION":
        return {
          pillState: "warning" as StatusType,
          pillLabel: t(language, "hero_pill_pending_exit"),
          primaryLabel: t(language, "hero_finish"),
          primaryVariant: "danger" as ButtonVariant,
          secondaryLabel: t(language, "hero_other_job"),
        };

      case "CLOSED":
        return {
          pillState: "info" as StatusType,
          pillLabel: t(language, "hero_pill_closed"),
          primaryLabel: t(language, "hero_finish_save"),
          primaryVariant: "primary" as ButtonVariant,
          secondaryLabel: null,
        };

      default:
        return {
          pillState: "info" as StatusType,
          pillLabel: t(language, "hero_pill_unknown"),
          primaryLabel: t(language, "hero_refresh"),
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
            {t(language, "hero_time_label")}
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
            {t(language, "hero_earnings_label")}
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
});

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
