import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

export type Severity = "info" | "warn" | "error";
export type Mode = "comment-only" | "block-on-error";

export interface Rule {
  name: string;
  severity: Severity;
  fileGlobs: string[];
  forbidRegex?: string[];
  requireRegex?: string[];
}

export interface Config {
  mode: Mode;
  comment: { updateInsteadOfSpam: boolean; header: string };
  pr: {
    titlePrefixes: string[];
    minBodyChars: number;
    requiredSections: string[];
    taskRegex: string;
  };
  size: { warnFilesChangedOver: number; warnLinesChangedOver: number };
  tests: {
    warnIfCodeChangedWithoutTests: boolean;
    codeGlobs: string[];
    testGlobs: string[];
  };
  rules: Rule[];
}

const DEFAULT_CONFIG: Config = {
  mode: "block-on-error",
  comment: { updateInsteadOfSpam: true, header: "🛡️ Denarixx Sentinel Report" },
  pr: {
    titlePrefixes: ["feat:", "fix:", "chore:", "docs:", "refactor:", "test:"],
    minBodyChars: 120,
    requiredSections: ["What", "Why", "How tested"],
    taskRegex: "(#\\d+|JIRA-\\d+|TASK-\\d+)",
  },
  size: { warnFilesChangedOver: 25, warnLinesChangedOver: 400 },
  tests: {
    warnIfCodeChangedWithoutTests: true,
    codeGlobs: ["**/*.ts", "**/*.js", "**/*.py"],
    testGlobs: ["**/*test*.*", "**/*spec*.*", "**/tests/**", "**/test/**"],
  },
  rules: [],
};

export function loadConfig(configPath: string, repoRoot: string): Config {
  const full = path.isAbsolute(configPath) ? configPath : path.join(repoRoot, configPath);
  if (!fs.existsSync(full)) return DEFAULT_CONFIG;

  const raw = fs.readFileSync(full, "utf8");
  const parsed = (yaml.load(raw) || {}) as Partial<Config>;

  return {
    ...DEFAULT_CONFIG,
    ...parsed,
    comment: { ...DEFAULT_CONFIG.comment, ...(parsed.comment || {}) },
    pr: { ...DEFAULT_CONFIG.pr, ...(parsed.pr || {}) },
    size: { ...DEFAULT_CONFIG.size, ...(parsed.size || {}) },
    tests: { ...DEFAULT_CONFIG.tests, ...(parsed.tests || {}) },
    rules: parsed.rules || DEFAULT_CONFIG.rules,
  };
}
