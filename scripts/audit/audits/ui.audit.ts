import type { AuditFinding } from "../core/finding";
import { auditConfig } from "../core/config";
import { fileExists, readTextFile } from "../core/fileScanner";

export async function runUiAudit(): Promise<AuditFinding[]> {
  const findings: AuditFinding[] = [];

  const screens = [
    auditConfig.criticalFiles.homeScreen,
    auditConfig.criticalFiles.historyScreen,
    auditConfig.criticalFiles.reportScreen,
    auditConfig.criticalFiles.settingsScreen,
  ];

  for (const screen of screens) {
    if (!fileExists(screen)) {
      findings.push({
        id: "UI-001",
        domain: "ui",
        severity: "critical",
        title: "Critical tab screen missing",
        description: `Expected Expo Router tab screen not found: ${screen}`,
        recommendation:
          "Restore the missing route or update auditConfig if the route was intentionally renamed.",
        file: screen,
      });

      continue;
    }

    const content = readTextFile(screen);

    // Detección de colores hardcodeados (Hex)
    const hexMatch = content.match(/#[0-9A-Fa-f]{3,6}/g);
    if (hexMatch && !screen.includes("theme.ts")) {
      findings.push({
        id: "UI-005",
        domain: "ui",
        severity: "medium",
        title: "Hardcoded Hex color detected",
        description: `Found hardcoded color: ${hexMatch[0]}`,
        recommendation:
          "Use TOKENS.colors or PALETTE from src/constants/theme.ts instead.",
        file: screen,
      });
    }

    // Detección de uso de Modal nativo en lugar de ModalShell
    if (content.includes("<Modal") && !content.includes("ModalShell")) {
      findings.push({
        id: "UI-006",
        domain: "ui",
        severity: "medium",
        title: "Native Modal detected",
        description: "Component uses native <Modal /> directly.",
        recommendation:
          "Migrate to <ModalShell /> from src/components/ui/ModalShell.tsx.",
        file: screen,
      });
    }

    if (!content.includes("testID")) {
      findings.push({
        id: "UI-002",
        domain: "ui",
        severity: "low",
        title: "No testID detected in critical screen",
        description: `The screen ${screen} does not include testID markers.`,
        recommendation:
          "Add testID values to critical buttons, modals and summaries to improve React Native Testing Library coverage.",
        file: screen,
      });
    }
  }

  return findings;
}
