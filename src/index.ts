import * as core from "@actions/core";
import { loadConfig } from "./config";
import {
  getClient,
  requirePullRequest,
  listChangedFiles,
  upsertComment,
  getRepoRoot,
} from "./github";
import { toMarkdown, hasErrors, Finding } from "./report";
import { runPrChecks } from "./checks/pr";
import { runTestHeuristics } from "./checks/tests";
import { runRuleChecks } from "./checks/rules";
import { runSizeChecks } from "./checks/size";
import { runRiskScore } from "./checks/risk";
import { writeJsonReport } from "./outputs/json";
import { writeSarifReport } from "./outputs/sarif";
import { minimatch } from "minimatch";

async function run() {
  try {
    const configPath = core.getInput("config") || ".denarixx-sentinel.yml";
    const token = core.getInput("github-token") || process.env.GITHUB_TOKEN || "";

    const repoRoot = getRepoRoot();
    const cfg = loadConfig(configPath, repoRoot);

    const pr = requirePullRequest();

    const actor = process.env.GITHUB_ACTOR || "";
    const isBot = actor.includes("[bot]") || actor === "dependabot";

    if (isBot) {
      core.info(`Bot PR detected (${actor}) -> forcing comment-only mode`);
      cfg.mode = "comment-only";
    }

    const prNumber = pr.number;
    const title = pr.title || "";
    const body = pr.body || "";

    const octokit = getClient(token);
    const changed = await listChangedFiles(octokit, prNumber);
    const changedPaths = changed.map((f) => f.filename);

    const testsTouched = changedPaths.some((f) =>
      cfg.tests.testGlobs.some((g) => minimatch(f, g))
    );

    const findings: Finding[] = [];
    findings.push(...runPrChecks(cfg, title, body));
    findings.push(...runSizeChecks(cfg, changed));
    findings.push(...runTestHeuristics(cfg, changedPaths));
    findings.push(...runRuleChecks(cfg, repoRoot, changedPaths));
    findings.push(...runRiskScore(cfg, changed, changedPaths, testsTouched));

    // Optional outputs (ALWAYS provide a safe path string)
    const jsonEnabled = cfg.jsonOutput?.enabled === true;
    const jsonPath = cfg.jsonOutput?.path || "denarixx-sentinel-report.json";

    const sarifEnabled = cfg.sarif?.enabled === true;
    const sarifPath = cfg.sarif?.path || "denarixx-sentinel.sarif";

    if (jsonEnabled) {
      writeJsonReport({
        enabled: true,
        path: jsonPath,
        findings,
      });
    }

    if (sarifEnabled) {
      writeSarifReport({
        enabled: true,
        path: sarifPath,
        findings,
      });
    }

    const meta = [
      `PR: #${prNumber}`,
      `Mode: \`${cfg.mode}\``,
      `Changed files: \`${changed.length}\``,
    ];

    const report = toMarkdown(cfg.comment.header, findings, meta);
    await upsertComment(octokit, prNumber, report, cfg.comment.updateInsteadOfSpam);

    if (cfg.mode === "block-on-error" && hasErrors(findings)) {
      core.setFailed("Denarixx Sentinel found merge-blocking errors.");
    }
  } catch (err: any) {
    core.setFailed(err?.message || String(err));
  }
}

run();
