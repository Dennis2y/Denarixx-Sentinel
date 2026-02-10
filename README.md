# Denarixx-Sentinel

---

## Risk Score

Denarixx Sentinel computes a **Risk Score (0–100)** and shows it in the PR comment summary.

**What increases risk**
- Larger PRs (more files / more lines)
- Sensitive areas (auth, payments, infra, migrations, CI workflows, configs)
- Dependency updates (lockfiles / requirements)
- Code changes without tests (based on `testGlobs`)

### Configure Risk Score

Add this to `.denarixx-sentinel.yml`:

```yml
risk:
  enabled: true
  # blockIfScoreAbove: 90  # optional: block merge above this score
  sensitivePaths:
    - "**/auth/**"
    - "**/payments/**"
    - "**/infra/**"
    - "**/migrations/**"
    - "**/.github/workflows/**"
  dependencyFiles:
    - "**/package-lock.json"
    - "**/requirements.txt"
    - "**/pyproject.toml" 
