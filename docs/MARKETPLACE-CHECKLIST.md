# GitHub Marketplace Publishing Checklist (Denarixx Sentinel)

## Repo & Action Metadata
- [ ] action.yml has: name, description, author, branding (icon + color), inputs documented
- [ ] dist/index.js is committed and up to date (ncc bundle)
- [ ] LICENSE exists (MIT)
- [ ] README has: Quick install, config examples, presets, outputs (JSON/SARIF), screenshots

## Release & Tagging
- [ ] Use semver tags (v1.2.3)
- [ ] Keep a stable major tag (v1) pointing to latest v1.x.x release
- [ ] Create GitHub Release notes (auto via Release Please)

## Quality
- [ ] CI workflow passes on PRs
- [ ] Action runs on PRs and posts a single updating comment
- [ ] SARIF upload works (security-events: write, upload-sarif step)
- [ ] JSON report is produced when enabled

## Marketplace Listing
- [ ] Add topics: github-actions, pull-request, devsecops, code-quality, sarif
- [ ] Add a short “About” description and a link to docs
- [ ] Add at least one screenshot/gif of the PR comment in README
- [ ] Publish a GitHub Release (tag) BEFORE clicking “Publish to Marketplace”

## Docs & Support
- [ ] Add SECURITY.md
- [ ] Add CONTRIBUTING.md
- [ ] Add CODEOWNERS or maintainers section in README
