import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { TOKENS, FONT } from "../../constants/theme";

export type StatusType =
  "ACTIVE_WORK" | "CLOSED" | "pending" | "warning" | "info";

interface StatusPillProps {
  status: StatusType;
  label: string;
}

export function StatusPill({ status, label }: StatusPillProps) {
  const getStatusStyle = () => {
    switch (status) {
      case "ACTIVE_WORK":
        return {
          backgroundColor: `${TOKENS.colors.status.success}15`,
          textColor: TOKENS.colors.status.success,
        };
      case "warning":
        return {
          backgroundColor: `${TOKENS.colors.status.warning}15`,
          textColor: TOKENS.colors.status.warning,
        };
      case "pending":
        return {
          backgroundColor: `${TOKENS.colors.status.info}15`,
          textColor: TOKENS.colors.status.info,
        };
      case "info":
        return {
          backgroundColor: `${TOKENS.colors.surface} `,
          textColor: TOKENS.colors.text.secondary,
        };
      case "CLOSED":
      default:
        return {
          backgroundColor: TOKENS.colors.surface,
          textColor: TOKENS.colors.text.secondary,
        };
    }
  };

  const statusStyle = getStatusStyle();

  return (
    <View
      style={[styles.pill, { backgroundColor: statusStyle.backgroundColor }]}
    >
      <Text style={[styles.text, { color: statusStyle.textColor }]}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: TOKENS.spacing.sm,
    paddingVertical: TOKENS.spacing.xs,
    borderRadius: TOKENS.radius.round,
    alignSelf: "flex-start",
  },
  text: {
    ...FONT.label,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
