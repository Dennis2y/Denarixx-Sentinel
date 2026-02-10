import { Config } from "../config";
import { Finding } from "../report";

export function runPrChecks(cfg: Config, title: string, body: string): Finding[] {
  const findings: Finding[] = [];
  const prBody = (body || "").trim();

  const okPrefix = cfg.pr.titlePrefixes.some((p) =>
    title.toLowerCase().startsWith(p.toLowerCase())
  );

  if (!okPrefix) {
    findings.push({
      severity: "warn",
      title: "PR title does not match expected prefixes",
      details: [`Expected one of: ${cfg.pr.titlePrefixes.join(", ")}`, `Current: "${title}"`],
    });
  } else {
    findings.push({ severity: "info", title: "PR title prefix looks good" });
  }

  const normalizedLen = prBody.replace(/\s+/g, " ").length;
  if (normalizedLen < cfg.pr.minBodyChars) {
    findings.push({
      severity: "warn",
      title: "PR description is too short",
      details: [`Minimum: ${cfg.pr.minBodyChars}`, `Current: ${normalizedLen}`, "Tip: explain What/Why/How and How tested"],
    });
  }

  for (const section of cfg.pr.requiredSections) {
    const re = new RegExp(`\\b${escapeRegex(section)}\\b`, "i");
    if (!re.test(prBody)) {
      findings.push({
        severity: "warn",
        title: `Missing required section: ${section}`,
        details: [`Add a "${section}" section to your PR description.`],
      });
    }
  }

  try {
    const taskRe = new RegExp(cfg.pr.taskRegex, "i");
    if (!taskRe.test(prBody)) {
      findings.push({
        severity: "warn",
        title: "No task/issue reference detected in PR description",
        details: [`Expected: ${cfg.pr.taskRegex}`, `Example: "#123" or "TASK-123"`],
      });
    }
  } catch {
    findings.push({
      severity: "warn",
      title: "Config taskRegex is invalid",
      details: [`taskRegex: ${cfg.pr.taskRegex}`],
    });
  }

  return findings;
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
