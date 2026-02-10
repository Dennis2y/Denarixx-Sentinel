import fs from "node:fs";
import path from "node:path";
import type { Finding } from "../report";

type SarifLevel = "note" | "warning" | "error";

function toSarifLevel(sev: string): SarifLevel {
  if (sev === "error") return "error";
  if (sev === "warn") return "warning";
  return "note";
}

/**
 * Try to discover a real file path from a finding.
 * We only emit SARIF results when we can attach a physicalLocation.uri.
 */
function getFindingFile(f: any): string | undefined {
  return (
    f.filePath ||
    f.file ||
    f.path ||
    f.filename ||
    f.location?.path ||
    f.location?.file ||
    undefined
  );
}

function getFindingLine(f: any): number | undefined {
  const n =
    f.line ??
    f.location?.line ??
    f.location?.startLine ??
    f.location?.region?.startLine ??
    undefined;
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : undefined;
}

export function writeSarifReport(args: {
  enabled: boolean;
  path: string;
  findings: Finding[];
  toolName?: string;
  toolVersion?: string;
}) {
  if (!args.enabled) return;

  const toolName = args.toolName ?? "Denarixx Sentinel";
  const toolVersion = args.toolVersion ?? "unknown";

  // Only include findings that can be anchored to a real file.
  const fileBased = (args.findings as any[]).filter((f) => !!getFindingFile(f));

  const uniqueRuleIds = Array.from(
    new Set(
      fileBased.map((f) => String(f.ruleId ?? f.title ?? f.name ?? "sentinel"))
    )
  );

  const rules = uniqueRuleIds.map((id) => ({
    id,
    name: id,
    shortDescription: { text: id },
    fullDescription: { text: id },
  }));

  const results = fileBased.map((f) => {
    const ruleId = String(f.ruleId ?? f.title ?? f.name ?? "sentinel");
    const message = String(f.message ?? f.title ?? f.name ?? "Finding");

    // MUST exist for GitHub Code Scanning: physicalLocation.artifactLocation.uri
    const uri = String(getFindingFile(f));
    const startLine = getFindingLine(f) ?? 1;

    return {
      ruleId,
      level: toSarifLevel(String(f.severity ?? "info")),
      message: { text: message },
      locations: [
        {
          physicalLocation: {
            artifactLocation: { uri },
            region: { startLine },
          },
        },
      ],
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
            name: toolName,
            version: toolVersion,
            rules,
          },
        },
        results,
      },
    ],
  };

  const outPath = args.path;
  const dir = path.dirname(outPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(sarif, null, 2), "utf8");
}
