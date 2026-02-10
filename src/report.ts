import { Severity } from "./config";

export interface Finding {
  severity: Severity;
  title: string;
  details?: string[];
}

export function hasErrors(findings: Finding[]): boolean {
  return findings.some((f) => f.severity === "error");
}

export function toMarkdown(header: string, findings: Finding[], meta?: string[]): string {
  const groups: Record<Severity, Finding[]> = { error: [], warn: [], info: [] };
  for (const f of findings) groups[f.severity].push(f);

  const lines: string[] = [];
  lines.push(`## ${header}`);

  if (meta?.length) {
    lines.push("");
    for (const m of meta) lines.push(`- ${m}`);
  }

  const render = (label: string, items: Finding[]) => {
    if (!items.length) return;
    lines.push("");
    lines.push(`### ${label}`);
    for (const item of items) {
      lines.push(`- **${item.title}**`);
      if (item.details?.length) {
        for (const d of item.details) lines.push(`  - ${d}`);
      }
    }
  };

  render("⛔ Errors (merge blockers)", groups.error);
  render("⚠️ Warnings", groups.warn);
  render("ℹ️ Info", groups.info);

  lines.push("");
  lines.push("> Denarixx Sentinel refreshes this report on every PR update.");
  return lines.join("\n");
}
