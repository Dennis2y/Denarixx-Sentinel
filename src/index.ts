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

async function run() {
  try {
    const configPath = core.getInput("config") || ".denarixx-sentinel.yml";
    const token =
      core.getInput("github-token") || process.env.GITHUB_TOKEN || "";

    const repoRoot = getRepoRoot();
    const cfg = loadConfig(configPath, repoRoot);

    const pr = requirePullRequest();
    const prNumber = pr.number;
    const title = pr.title || "";
    const body = pr.body || "";

    const octokit = getClient(token);
    const changed = await listChangedFiles(octokit, prNumber);
    const changedPaths = changed.map((f) => f.filename);

    // Detect whether tests were touched (used by Risk Score)
    // (We keep this local to avoid modifying the tests check code.)
    const minimatch = require("minimatch") as typeof import("minimatch");
    const testsTouched = changedPaths.some((f) =>
      (cfg.tests?.testGlobs ?? []).some((g) => minimatch.minimatch(f, g))
    );

    const findings: Finding[] = [];
    findings.push(...runPrChecks(cfg, title, body));
    findings.push(...runSizeChecks(cfg, changed));
    findings.push(...runTestHeuristics(cfg, changedPaths));
    findings.push(...runRuleChecks(cfg, repoRoot, changedPaths));
    findings.push(...runRiskScore(cfg, changed, changedPaths, testsTouched));

    const meta = [
      `PR: #${prNumber}`,
      `Mode: \`${cfg.mode}\``,
      `Changed files: \`${changed.length}\``,
    ];

    // Optional outputs (JSON + SARIF) — includes info/warn/error
    writeJsonReport({
      enabled: cfg.jsonOutput?.enabled ?? false,
      path: cfg.jsonOutput?.path ?? "denarixx-sentinel-report.json",
      findings,
      toolVersion: process.env.GITHUB_ACTION_REF || undefined,
    });

    writeSarifReport({
      enabled: cfg.sarif?.enabled ?? false,
      path: cfg.sarif?.path ?? "denarixx-sentinel.sarif",
      findings,
    });

    // PR comment
    const report = toMarkdown(cfg.comment.header, findings, meta);
    await upsertComment(
      octokit,
      prNumber,
      report,
      cfg.comment.updateInsteadOfSpam
    );

    if (cfg.mode === "block-on-error" && hasErrors(findings)) {
      core.setFailed("Denarixx Sentinel found merge-blocking errors.");
    }
  } catch (err: any) {
    core.setFailed(err?.message || String(err));
  }
}

run();
