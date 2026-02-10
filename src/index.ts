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
    const token = core.getInput("github-token") || process.env.GITHUB_TOKEN || "";

    const repoRoot = getRepoRoot();
    const cfg = loadConfig(configPath, repoRoot);

    const pr = requirePullRequest();
    const prNumber = pr.number;
    const title = pr.title || "";
    const body = pr.body || "";

    const octokit = getClient(token);
    const changed = await listChangedFiles(octokit, prNumber);
    const changedPaths = changed.map((f) => f.filename);

    const testsTouched = changedPaths.some((f) =>
      cfg.tests.testGlobs.some((g) => require("minimatch").minimatch(f, g))
    );

    const findings: Finding[] = [];
    findings.push(...runPrChecks(cfg, title, body));
    findings.push(...runSizeChecks(cfg, changed));
    findings.push(...runTestHeuristics(cfg, changedPaths));
    findings.push(...runRuleChecks(cfg, repoRoot, changedPaths));
    findings.push(...runRiskScore(cfg, changed, changedPaths, testsTouched));

    // Write machine-readable outputs (optional)
    if (cfg.jsonOutput?.enabled) {
      writeJsonReport({
        enabled: true,
        path: cfg.jsonOutput.path,
        findings,
        meta: {
          prNumber,
          mode: cfg.mode,
          changedFiles: changed.length,
          repo: process.env.GITHUB_REPOSITORY || "",
          sha: process.env.GITHUB_SHA || "",
        },
      });
    }

    if (cfg.sarif?.enabled) {
      writeSarifReport({
        enabled: true,
        path: cfg.sarif.path,
        findings,
        repoRoot,
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
