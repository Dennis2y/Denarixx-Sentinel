import { writeFileSync } from "fs";
import type { Finding } from "./json";

type SarifLevel = "note" | "warning" | "error";

function mapLevel(sev: Finding["severity"]): SarifLevel {
  if (sev === "error") return "error";
  if (sev === "warn") return "warning";
  return "note"; // info
}

function stableRuleId(title: string): string {
  // Make a stable id from the title
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "finding";
}

export function writeSarifReport(params: {
  enabled: boolean;
  path: string;
  findings: Finding[];
}): void {
  if (!params.enabled) return;

  const rulesMap = new Map<string, { id: string; name: string }>();

  for (const f of params.findings) {
    const id = stableRuleId(f.title);
    if (!rulesMap.has(id)) rulesMap.set(id, { id, name: f.title });
  }

  const rules = Array.from(rulesMap.values()).map((r) => ({
    id: r.id,
    name: r.id,
    shortDescription: { text: r.name },
    help: { text: r.name },
  }));

  const results = params.findings.map((f) => {
    const ruleId = stableRuleId(f.title);
    const messageLines = [f.title, ...(f.details ?? [])].filter(Boolean);
    return {
      ruleId,
      level: mapLevel(f.severity),
      message: { text: messageLines.join("\n") },
      // No file locations available right now → keep it global.
    };
  });

  const sarif = {
    $schema:
      "https://schemastore.azurewebsites.net/schemas/json/sarif-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: "Denarixx Sentinel",
            informationUri: "https://github.com/Dennis2y/Denarixx-Sentinel",
            rules,
          },
        },
        results,
      },
    ],
  };

  writeFileSync(params.path, JSON.stringify(sarif, null, 2) + "\n", "utf8");
}
