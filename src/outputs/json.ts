import { writeFileSync } from "fs";

export type FindingSeverity = "info" | "warn" | "error";

export type Finding = {
  severity: FindingSeverity;
  title: string;
  details?: string[]; // lines
};

export type JsonReport = {
  tool: { name: string; version?: string };
  generatedAt: string;
  summary: { errors: number; warnings: number; info: number; total: number };
  findings: Finding[];
};

export function writeJsonReport(params: {
  enabled: boolean;
  path: string;
  findings: Finding[];
  toolVersion?: string;
}): void {
  if (!params.enabled) return;

  const { findings } = params;
  const errors = findings.filter((f) => f.severity === "error").length;
  const warnings = findings.filter((f) => f.severity === "warn").length;
  const info = findings.filter((f) => f.severity === "info").length;

  const report: JsonReport = {
    tool: { name: "Denarixx Sentinel", version: params.toolVersion },
    generatedAt: new Date().toISOString(),
    summary: { errors, warnings, info, total: findings.length },
    findings,
  };

  writeFileSync(params.path, JSON.stringify(report, null, 2) + "\n", "utf8");
}
