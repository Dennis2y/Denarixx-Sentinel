"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runRuleChecks = runRuleChecks;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const minimatch_1 = require("minimatch");
function runRuleChecks(cfg, repoRoot, changedFiles) {
    const findings = [];
    if (!cfg.rules?.length)
        return findings;
    const matchesAny = (file, globs) => globs.some((g) => (0, minimatch_1.minimatch)(file, g));
    for (const rule of cfg.rules) {
        const filesToScan = changedFiles.filter((f) => matchesAny(f, rule.fileGlobs));
        if (!filesToScan.length)
            continue;
        const forbid = compileRegex(rule.forbidRegex);
        const require = compileRegex(rule.requireRegex);
        const violations = [];
        for (const rel of filesToScan) {
            const abs = node_path_1.default.join(repoRoot, rel);
            if (!node_fs_1.default.existsSync(abs))
                continue;
            const text = node_fs_1.default.readFileSync(abs, "utf8");
            if (text.length > 400_000)
                continue;
            for (const re of forbid) {
                if (re.test(text))
                    violations.push(`${rel} matches forbidRegex: /${re.source}/`);
            }
            if (require.length) {
                const ok = require.some((re) => re.test(text));
                if (!ok)
                    violations.push(`${rel} did not match any requireRegex`);
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
function compileRegex(list) {
    if (!list?.length)
        return [];
    const out = [];
    for (const raw of list) {
        try {
            out.push(new RegExp(raw, "i"));
        }
        catch {
            // ignore invalid regex entries
        }
    }
    return out;
}
