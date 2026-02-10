import { context, getOctokit } from "@actions/github";

export function getClient(token: string) {
  return getOctokit(token);
}

export function requirePullRequest() {
  const pr = context.payload.pull_request;
  if (!pr) throw new Error("Denarixx Sentinel only runs on pull_request events.");
  return pr;
}

export async function listChangedFiles(
  octokit: ReturnType<typeof getOctokit>,
  prNumber: number
) {
  const owner = context.repo.owner;
  const repo = context.repo.repo;

  const files: { filename: string; additions: number; deletions: number; status: string }[] = [];
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

    if (res.data.length < 100) break;
    page += 1;
  }

  return files;
}

export async function upsertComment(
  octokit: ReturnType<typeof getOctokit>,
  prNumber: number,
  body: string,
  updateInsteadOfSpam: boolean
) {
  const owner = context.repo.owner;
  const repo = context.repo.repo;

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
  } else {
    await octokit.rest.issues.createComment({ owner, repo, issue_number: prNumber, body: finalBody });
  }
}

export function getRepoRoot(): string {
  return process.env.GITHUB_WORKSPACE || process.cwd();
}
