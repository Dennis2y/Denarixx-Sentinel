"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasErrors = hasErrors;
exports.toMarkdown = toMarkdown;
function hasErrors(findings) {
    return findings.some((f) => f.severity === "error");
}
function toMarkdown(header, findings, meta) {
    const groups = { error: [], warn: [], info: [] };
    for (const f of findings)
        groups[f.severity].push(f);
    const lines = [];
    lines.push(`## ${header}`);
    if (meta?.length) {
        lines.push("");
        for (const m of meta)
            lines.push(`- ${m}`);
    }
    const render = (label, items) => {
        if (!items.length)
            return;
        lines.push("");
        lines.push(`### ${label}`);
        for (const item of items) {
            lines.push(`- **${item.title}**`);
            if (item.details?.length) {
                for (const d of item.details)
                    lines.push(`  - ${d}`);
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
