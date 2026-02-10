from pathlib import Path

p = Path("src/index.ts")
s = p.read_text(encoding="utf-8")

# 1) Ensure imports exist
if 'from "./outputs"' not in s:
    # insert after the last import line
    lines = s.splitlines()
    last_import_idx = -1
    for i, line in enumerate(lines):
        if line.strip().startswith("import "):
            last_import_idx = i
    if last_import_idx >= 0:
        lines.insert(last_import_idx + 1, 'import { writeJsonReport, writeSarifReport } from "./outputs";')
        s = "\n".join(lines)

# 2) Inject writer block before markdown report generation
needle = "const report = toMarkdown"
if needle not in s:
    raise SystemExit("Could not find 'const report = toMarkdown' in src/index.ts")

if "writeJsonReport" not in s or "writeSarifReport" not in s:
    inject = r'''
    // Optional machine-readable outputs (JSON + SARIF)
    const jsonCfg = (cfg as any).jsonOutput as { enabled?: boolean; path?: string } | undefined;
    const sarifCfg = (cfg as any).sarif as { enabled?: boolean; path?: string } | undefined;

    const metaForOutputs = {
      repo: meta.repo,
      prNumber: meta.prNumber,
      sha: meta.sha,
    };

    if (jsonCfg?.enabled) {
      const outPath = jsonCfg.path ?? "denarixx-sentinel-report.json";
      writeJsonReport({ repoRoot, outPath, meta: metaForOutputs, findings: findings as any });
      core.setOutput("json-path", outPath);
    }

    if (sarifCfg?.enabled) {
      const outPath = sarifCfg.path ?? "denarixx-sentinel.sarif";
      writeSarifReport({ repoRoot, outPath, meta: metaForOutputs, findings: findings as any });
      core.setOutput("sarif-path", outPath);
    }
'''
    s = s.replace(needle, inject + "\n    " + needle)

p.write_text(s, encoding="utf-8")
print("✅ Patched src/index.ts with JSON + SARIF outputs")
