"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSizeChecks = runSizeChecks;
function runSizeChecks(cfg, changed) {
    const findings = [];
    const filesChanged = changed.length;
    const linesChanged = changed.reduce((sum, f) => sum + f.additions + f.deletions, 0);
    findings.push({
        severity: "info",
        title: "PR size summary",
        details: [`Files changed: ${filesChanged}`, `Lines changed (add+del): ${linesChanged}`],
    });
    if (filesChanged > cfg.size.warnFilesChangedOver) {
        findings.push({
            severity: "warn",
            title: "PR touches many files",
            details: [`Threshold: ${cfg.size.warnFilesChangedOver}`, `Current: ${filesChanged}`, "Tip: consider splitting into smaller PRs."],
        });
    }
    if (linesChanged > cfg.size.warnLinesChangedOver) {
        findings.push({
            severity: "warn",
            title: "PR changes many lines",
            details: [`Threshold: ${cfg.size.warnLinesChangedOver}`, `Current: ${linesChanged}`, "Tip: add tests and a clear rollout plan."],
        });
    }
    return findings;
}
