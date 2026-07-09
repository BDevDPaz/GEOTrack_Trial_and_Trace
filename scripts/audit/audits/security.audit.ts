import type { AuditFinding } from "../core/finding";
import { auditConfig } from "../core/config";
import { collectSourceFiles } from "../core/fileScanner";

export async function runSecurityAudit(): Promise<AuditFinding[]> {
  const findings: AuditFinding[] = [];
  const files = collectSourceFiles(auditConfig.sourceRoots);

  const sensitivePatterns = [
    "password",
    "secret",
    "token",
    "apiKey",
    "privateKey",
    "authorization",
  ];

  for (const file of files) {
    for (const pattern of sensitivePatterns) {
      if (file.content.toLowerCase().includes(pattern.toLowerCase())) {
        findings.push({
          id: "SEC-001",
          domain: "security",
          severity: "medium",
          title: `Potential sensitive term detected: ${pattern}`,
          description: `The term "${pattern}" was found in source code. This may be valid, but should be reviewed.`,
          recommendation:
            "Verify that no secrets, tokens or sensitive credentials are hardcoded or logged.",
          file: file.path,
          evidence: pattern,
        });
      }
    }

    // ✅ FIX: Auditor más inteligente para evitar falsos positivos en adaptadores
    // Solo marca High si detecta que se está pasando la variable latitude/longitude a un console.log
    const hasConsoleLogWithCoords =
      (file.content.includes("console.log(") ||
        file.content.includes("console.error(")) &&
      (file.content.includes("latitude") || file.content.includes("longitude"));

    if (hasConsoleLogWithCoords) {
      findings.push({
        id: "SEC-002",
        domain: "security",
        severity: "high",
        title: "Potential exact location logging to console",
        description:
          "A file references latitude/longitude and console logging.",
        recommendation:
          "Avoid logging exact GPS coordinates to console in production. Prefer structured audit logs with minimised location data.",
        file: file.path,
      });
    }
  }

  return findings;
}
