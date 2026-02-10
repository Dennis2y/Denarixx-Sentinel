"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const config_1 = require("./config");
const github_1 = require("./github");
const report_1 = require("./report");
const pr_1 = require("./checks/pr");
const tests_1 = require("./checks/tests");
const rules_1 = require("./checks/rules");
const size_1 = require("./checks/size");
async function run() {
    try {
        const configPath = core.getInput("config") || ".denarixx-sentinel.yml";
        const token = core.getInput("github-token") || process.env.GITHUB_TOKEN || "";
        const repoRoot = (0, github_1.getRepoRoot)();
        const cfg = (0, config_1.loadConfig)(configPath, repoRoot);
        const pr = (0, github_1.requirePullRequest)();
        const prNumber = pr.number;
        const title = pr.title || "";
        const body = pr.body || "";
        const octokit = (0, github_1.getClient)(token);
        const changed = await (0, github_1.listChangedFiles)(octokit, prNumber);
        const changedPaths = changed.map((f) => f.filename);
        const findings = [];
        findings.push(...(0, pr_1.runPrChecks)(cfg, title, body));
        findings.push(...(0, size_1.runSizeChecks)(cfg, changed));
        findings.push(...(0, tests_1.runTestHeuristics)(cfg, changedPaths));
        findings.push(...(0, rules_1.runRuleChecks)(cfg, repoRoot, changedPaths));
        const meta = [
            `PR: #${prNumber}`,
            `Mode: \`${cfg.mode}\``,
            `Changed files: \`${changed.length}\``,
        ];
        const report = (0, report_1.toMarkdown)(cfg.comment.header, findings, meta);
        await (0, github_1.upsertComment)(octokit, prNumber, report, cfg.comment.updateInsteadOfSpam);
        if (cfg.mode === "block-on-error" && (0, report_1.hasErrors)(findings)) {
            core.setFailed("Denarixx Sentinel found merge-blocking errors.");
        }
    }
    catch (err) {
        core.setFailed(err?.message || String(err));
    }
}
run();
