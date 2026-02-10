"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const DEFAULT_CONFIG = {
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
function loadConfig(configPath, repoRoot) {
    const full = node_path_1.default.isAbsolute(configPath) ? configPath : node_path_1.default.join(repoRoot, configPath);
    if (!node_fs_1.default.existsSync(full))
        return DEFAULT_CONFIG;
    const raw = node_fs_1.default.readFileSync(full, "utf8");
    const parsed = (js_yaml_1.default.load(raw) || {});
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
