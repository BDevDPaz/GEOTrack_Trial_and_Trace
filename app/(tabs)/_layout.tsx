import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

// Importaciones adaptadas a la nueva arquitectura
import { useTheme } from "../../src/context/ThemeContext";
import { FONT } from "../../src/constants/theme";
import { ICONS } from "../../src/constants/icons";

export default function TabLayout() {
  // Consumo dinámico del tema centralizado
  const { colors } = useTheme();

  const handleTabPress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.mutedGold,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.obsidian,
          borderTopWidth: 1,
          borderTopColor: colors.steelLine,
          height: Platform.OS === "ios" ? 88 : 68,
          paddingBottom: Platform.OS === "ios" ? 28 : 12,
          paddingTop: 12,
          elevation: 0,
        },
        tabBarLabelStyle: {
          ...FONT.caption,
          fontSize: 10,
          fontWeight: "700",
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Hoy",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={
                focused
                  ? (ICONS.tabs.home.active as keyof typeof Ionicons.glyphMap)
                  : (ICONS.tabs.home.inactive as keyof typeof Ionicons.glyphMap)
              }
              size={24}
              color={color}
            />
          ),
        }}
        listeners={{ tabPress: handleTabPress }}
      />

      <Tabs.Screen
        name="history"
        options={{
          title: "Historial",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={
                focused
                  ? (ICONS.tabs.history
                      .active as keyof typeof Ionicons.glyphMap)
                  : (ICONS.tabs.history
                      .inactive as keyof typeof Ionicons.glyphMap)
              }
              size={24}
              color={color}
            />
          ),
        }}
        listeners={{ tabPress: handleTabPress }}
      />

      <Tabs.Screen
        name="report"
        options={{
          title: "Reportes",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={
                focused
                  ? (ICONS.tabs.report.active as keyof typeof Ionicons.glyphMap)
                  : (ICONS.tabs.report
                      .inactive as keyof typeof Ionicons.glyphMap)
              }
              size={24}
              color={color}
            />
          ),
        }}
        listeners={{ tabPress: handleTabPress }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: "Ajustes",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={
                focused
                  ? (ICONS.tabs.settings
                      .active as keyof typeof Ionicons.glyphMap)
                  : (ICONS.tabs.settings
                      .inactive as keyof typeof Ionicons.glyphMap)
              }
              size={24}
              color={color}
            />
          ),
        }}
        listeners={{ tabPress: handleTabPress }}
      />
    </Tabs>
  );
}
