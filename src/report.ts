import { Severity } from "./config";

export interface Finding {
  severity: Severity;
  title: string;
  details?: string[];
}

export function hasErrors(findings: Finding[]): boolean {
  return findings.some((f) => f.severity === "error");
}

function group(findings: Finding[]) {
  const groups: Record<Severity, Finding[]> = { error: [], warn: [], info: [] };
  for (const f of findings) groups[f.severity].push(f);
  return groups;
}

function extractRisk(findings: Finding[]) {
  const risk = findings.find((f) => f.title.startsWith("Risk Score: "));
  if (!risk) return null;

  // Title format: "Risk Score: 42/100 (Medium)"
  const m = /Risk Score:\s*(\d+)\/100\s*\(([^)]+)\)/.exec(risk.title);
  if (!m) return { score: null, band: null, finding: risk };

  return { score: Number(m[1]), band: m[2], finding: risk };

  
}

function extractSize(findings: Finding[]) {
  const size = findings.find((f) => f.title === "PR size summary");
  if (!size?.details?.length) return null;

  // We generate these in size check:
  // - "Files changed: X"
  // - "Lines changed (add+del): Y"
  let files: number | null = null;
  let lines: number | null = null;

  for (const d of size.details) {
    const fm = /Files changed:\s*(\d+)/i.exec(d);
    if (fm) files = Number(fm[1]);

    const lm = /Lines changed \(add\+del\):\s*(\d+)/i.exec(d);
    if (lm) lines = Number(lm[1]);
  }

  return { files, lines };
}

function renderFinding(item: Finding): string[] {
  const lines: string[] = [];

  // Make Risk Score details collapsible for a cleaner PR view
  if (item.title.startsWith("Risk Score:")) {
    lines.push(`- **${item.title}**`);
    if (item.details?.length) {
      lines.push(`  <details>`);
      lines.push(`  <summary>Why this score</summary>`);
      lines.push("");
      for (const d of item.details) lines.push(`  - ${escapeMd(d)}`);
      lines.push("");
      lines.push(`  </details>`);
    }
    return lines;
  }

  // Normal finding
  lines.push(`- **${item.title}**`);
  if (item.details?.length) {
    for (const d of item.details) lines.push(`  - ${escapeMd(d)}`);
  }
  return lines;
}

function escapeMd(s: string): string {
  // light escaping to reduce accidental markdown breaks
  return s.replace(/\r?\n/g, " ").trim();
}

export function toMarkdown(header: string, findings: Finding[], meta?: string[]): string {
  const g = group(findings);
  const risk = extractRisk(findings);
  const size = extractSize(findings);

  const out: string[] = [];
  out.push(`## ${header}`);

  // Premium one-line summary (top)
  const parts: string[] = [];
  if (risk?.score != null && risk?.band) parts.push(`Risk: **${risk.score}/100 (${risk.band})**`);
  if (size?.files != null) parts.push(`Files: **${size.files}**`);
  if (size?.lines != null) parts.push(`Lines: **${size.lines}**`);

  if (parts.length) {
    out.push("");
    out.push(`**Summary:** ${parts.join(" • ")}`);
  }

  if (meta?.length) {
    out.push("");
    for (const m of meta) out.push(`- ${m}`);
  }

  const renderGroup = (label: string, items: Finding[]) => {
    if (!items.length) return;
    out.push("");
    out.push(`### ${label}`);
    for (const item of items) out.push(...renderFinding(item));
  };

  renderGroup("⛔ Errors (merge blockers)", g.error);
  renderGroup("⚠️ Warnings", g.warn);
  renderGroup("ℹ️ Info", g.info);

  out.push("");
  out.push("> Denarixx Sentinel refreshes this report on every PR update.");

  return out.join("\n");
}
