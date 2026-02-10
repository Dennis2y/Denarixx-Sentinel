import fs from "node:fs";
import path from "node:path";
import { minimatch } from "minimatch";
import { Config } from "../config";
import { Finding } from "../report";

export function runRuleChecks(cfg: Config, repoRoot: string, changedFiles: string[]): Finding[] {
  const findings: Finding[] = [];
  if (!cfg.rules?.length) return findings;

  const matchesAny = (file: string, globs: string[]) => globs.some((g) => minimatch(file, g));

  for (const rule of cfg.rules) {
    const filesToScan = changedFiles.filter((f) => matchesAny(f, rule.fileGlobs));
    if (!filesToScan.length) continue;

    const forbid = compileRegex(rule.forbidRegex);
    const require = compileRegex(rule.requireRegex);

    const violations: string[] = [];

    for (const rel of filesToScan) {
      const abs = path.join(repoRoot, rel);
      if (!fs.existsSync(abs)) continue;

      const text = fs.readFileSync(abs, "utf8");
      if (text.length > 400_000) continue;

      for (const re of forbid) {
        if (re.test(text)) violations.push(`${rel} matches forbidRegex: /${re.source}/`);
      }

      if (require.length) {
        const ok = require.some((re) => re.test(text));
        if (!ok) violations.push(`${rel} did not match any requireRegex`);
      }
    }

    if (violations.length) {
      findings.push({
        severity: rule.severity,
        title: rule.name,
        details: violations.slice(0, 20),
      });
    }
  }

  return findings;
}

function compileRegex(list?: string[]): RegExp[] {
  if (!list?.length) return [];
  const out: RegExp[] = [];
  for (const raw of list) {
    try {
      out.push(new RegExp(raw, "i"));
    } catch {
      // ignore invalid regex entries
    }
  }
  return out;
}
