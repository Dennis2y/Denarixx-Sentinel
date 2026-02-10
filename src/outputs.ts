import fs from "node:fs";
import path from "node:path";
import type { SentinelFinding, SentinelMeta } from "./sarif";
import { toSarif } from "./sarif";

export function writeJsonReport(opts: {
  repoRoot: string;
  outPath: string;
  meta: SentinelMeta;
  findings: SentinelFinding[];
}) {
  const { repoRoot, outPath, meta, findings } = opts;

  const payload = {
    meta,
    summary: {
      errors: findings.filter((f) => f.severity === "error").length,
      warnings: findings.filter((f) => f.severity === "warn").length,
      info: findings.filter((f) => f.severity === "info").length,
    },
    findings,
  };

  const abs = path.resolve(repoRoot, outPath);
  fs.writeFileSync(abs, JSON.stringify(payload, null, 2), "utf-8");
}

export function writeSarifReport(opts: {
  repoRoot: string;
  outPath: string;
  meta: SentinelMeta;
  findings: SentinelFinding[];
}) {
  const { repoRoot, outPath, meta, findings } = opts;
  const sarif = toSarif(findings, meta);
  const abs = path.resolve(repoRoot, outPath);
  fs.writeFileSync(abs, JSON.stringify(sarif, null, 2), "utf-8");
}
