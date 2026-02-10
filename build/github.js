"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClient = getClient;
exports.requirePullRequest = requirePullRequest;
exports.listChangedFiles = listChangedFiles;
exports.upsertComment = upsertComment;
exports.getRepoRoot = getRepoRoot;
const github_1 = require("@actions/github");
function getClient(token) {
    return (0, github_1.getOctokit)(token);
}
function requirePullRequest() {
    const pr = github_1.context.payload.pull_request;
    if (!pr)
        throw new Error("Denarixx Sentinel only runs on pull_request events.");
    return pr;
}
async function listChangedFiles(octokit, prNumber) {
    const owner = github_1.context.repo.owner;
    const repo = github_1.context.repo.repo;
    const files = [];
    let page = 1;
    while (true) {
        const res = await octokit.rest.pulls.listFiles({
            owner,
            repo,
            pull_number: prNumber,
            per_page: 100,
            page,
        });
        for (const f of res.data) {
            files.push({
                filename: f.filename,
                additions: f.additions ?? 0,
                deletions: f.deletions ?? 0,
                status: f.status ?? "modified",
            });
        }
        if (res.data.length < 100)
            break;
        page += 1;
    }
    return files;
}
async function upsertComment(octokit, prNumber, body, updateInsteadOfSpam) {
    const owner = github_1.context.repo.owner;
    const repo = github_1.context.repo.repo;
    const marker = "<!-- denarixx-sentinel -->";
    const finalBody = `${marker}\n${body}`;
    if (!updateInsteadOfSpam) {
        await octokit.rest.issues.createComment({ owner, repo, issue_number: prNumber, body: finalBody });
        return;
    }
    const comments = await octokit.rest.issues.listComments({
        owner,
        repo,
        issue_number: prNumber,
        per_page: 100,
    });
    const existing = comments.data.find((c) => (c.body || "").includes(marker));
    if (existing) {
        await octokit.rest.issues.updateComment({
            owner,
            repo,
            comment_id: existing.id,
            body: finalBody,
        });
    }
    else {
        await octokit.rest.issues.createComment({ owner, repo, issue_number: prNumber, body: finalBody });
    }
}
function getRepoRoot() {
    return process.env.GITHUB_WORKSPACE || process.cwd();
}
