import { minimatch } from "minimatch";
import { Config, Severity } from "../config";
import { Finding } from "../report";

type ChangedFile = { filename: string; additions: number; deletions: number };

export function runRiskScore(
  cfg: Config,
  changed: ChangedFile[],
  changedPaths: string[],
  testsTouched: boolean
): Finding[] {
  if (!cfg.risk?.enabled) return [];

  const filesChanged = changed.length;
  const linesChanged = changed.reduce((sum, f) => sum + f.additions + f.deletions, 0);

  const matchAny = (file: string, globs: string[]) => globs.some((g) => minimatch(file, g));

  const sensitiveTouched = changedPaths.filter((p) => matchAny(p, cfg.risk.sensitivePaths));
  const depsTouched = changedPaths.filter((p) => matchAny(p, cfg.risk.dependencyFiles));

  // ---- Scoring (0..100) ----
  // Base on size:
  // - lines: up to 35 points
  // - files: up to 20 points
  // Then bonuses for risky areas:
  // - sensitive paths: up to 25 points
  // - dependency changes: up to 10 points
  // - no tests when code likely changed: up to 10 points
  const sizeLines = clamp(Math.round(linesChanged / 20), 0, 35); // 700 lines ~ 35 pts
  const sizeFiles = clamp(filesChanged * 2, 0, 20);             // 10 files ~ 20 pts

  const sensitivePts = clamp(sensitiveTouched.length * 6, 0, 25);
  const depsPts = clamp(depsTouched.length * 5, 0, 10);
  const testsPts = testsTouched ? 0 : 10;

  let score = sizeLines + sizeFiles + sensitivePts + depsPts + testsPts;
  score = clamp(score, 0, 100);

  const band = score >= 75 ? "High" : score >= 40 ? "Medium" : "Low";

  const reasons: string[] = [];
  reasons.push(`Score components: size(lines)=${sizeLines}, size(files)=${sizeFiles}, sensitive=${sensitivePts}, deps=${depsPts}, tests=${testsPts}`);
  if (sensitiveTouched.length) reasons.push(`Sensitive paths touched: ${sensitiveTouched.slice(0, 8).join(", ")}${sensitiveTouched.length > 8 ? "…" : ""}`);
  if (depsTouched.length) reasons.push(`Dependency files changed: ${depsTouched.join(", ")}`);
  if (!testsTouched) reasons.push("No tests detected in this PR (based on testGlobs).");

  // Severity logic:
  // - default: info
  // - if score is high: warn
  // - if blockIfScoreAbove set && score >= threshold: error
  const threshold = cfg.risk.blockIfScoreAbove;
  let sev: Severity = score >= 75 ? "warn" : "info";
  if (typeof threshold == "number" && score >= threshold) {
    sev = "error";
  }

  return [{
    severity: sev,
    title: `Risk Score: ${score}/100 (${band})`,
    details: reasons,
  }];
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
