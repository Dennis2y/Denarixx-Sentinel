import * as core from "@actions/core";
import { loadConfig } from "./config";
import { getClient, requirePullRequest, listChangedFiles, upsertComment, getRepoRoot } from "./github";
import { toMarkdown, hasErrors, Finding } from "./report";
import { runPrChecks } from "./checks/pr";
import { runTestHeuristics } from "./checks/tests";
import { runRuleChecks } from "./checks/rules";
import { runSizeChecks } from "./checks/size";
import { runRiskScore } from "./checks/risk";

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

    const findings: Finding[] = [];
    findings.push(...runPrChecks(cfg, title, body));
    findings.push(...runSizeChecks(cfg, changed));
    findings.push(...runTestHeuristics(cfg, changedPaths));
    findings.push(...runRuleChecks(cfg, repoRoot, changedPaths));

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
