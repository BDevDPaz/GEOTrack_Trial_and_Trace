import React from "react";
import { Text, StyleSheet } from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

import { TOKENS, FONT } from "../../constants/theme";
import { ICONS } from "../../constants/icons";

export type BadgeType = "valid" | "manual" | "auto" | "warning" | "error";

interface IntegrityBadgeProps {
  type: BadgeType;
}

export function IntegrityBadge({ type }: IntegrityBadgeProps) {
  const getConfig = () => {
    switch (type) {
      case "valid":
        return {
          label: "Correcto",
          color: TOKENS.colors.status.success,
          icon: ICONS.status.success,
        };
      case "manual":
        return {
          label: "Ajustado",
          color: TOKENS.colors.text.secondary,
          icon: ICONS.actions.edit,
        };
      case "auto":
        return {
          label: "Automático",
          color: TOKENS.colors.status.info,
          icon: ICONS.domain.time,
        };
      case "warning":
        return {
          label: "Revisar",
          color: TOKENS.colors.status.warning,
          icon: ICONS.status.warning,
        };
      case "error":
        return {
          label: "Error",
          color: TOKENS.colors.status.danger,
          icon: ICONS.status.error,
        };
      default:
        return {
          label: "Desconocido",
          color: TOKENS.colors.text.muted,
          icon: ICONS.status.neutral,
        };
    }
  };

  const config = getConfig();

  return (
    <Animated.View
      layout={LinearTransition.springify().damping(20).stiffness(150)}
      style={[
        styles.badge,
        {
          borderColor: config.color,
          backgroundColor: `${config.color}15`,
        },
      ]}
      accessibilityLabel={`Estado de integridad: ${config.label}`}
    >
      <Ionicons
        name={config.icon as any}
        size={12}
        color={config.color}
        style={styles.icon}
      />

      <Text style={[styles.text, { color: config.color }]}>
        {config.label.toUpperCase()}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: TOKENS.spacing.sm,
    paddingVertical: 4,
    borderRadius: TOKENS.radius.xs,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  icon: {
    marginRight: 4,
  },
  text: {
    ...FONT.label,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
