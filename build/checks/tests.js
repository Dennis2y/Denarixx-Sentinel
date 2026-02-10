"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runTestHeuristics = runTestHeuristics;
const minimatch_1 = require("minimatch");
function runTestHeuristics(cfg, changedFiles) {
    const findings = [];
    if (!cfg.tests.warnIfCodeChangedWithoutTests)
        return findings;
    const matchesAny = (file, globs) => globs.some((g) => (0, minimatch_1.minimatch)(file, g));
    const codeTouched = changedFiles.some((f) => matchesAny(f, cfg.tests.codeGlobs));
    const testsTouched = changedFiles.some((f) => matchesAny(f, cfg.tests.testGlobs));
    if (codeTouched && !testsTouched) {
        findings.push({
            severity: "warn",
            title: "Code changed but no tests detected in this PR",
            details: ["If the change affects behavior, add or update tests."],
        });
    }
    else if (codeTouched && testsTouched) {
        findings.push({ severity: "info", title: "Tests updated alongside code changes" });
    }
    else {
        findings.push({ severity: "info", title: "No code files detected (based on codeGlobs)" });
    }
    return findings;
}
