type Severity = "error" | "warn" | "info";

export type SentinelFinding = {
  severity: Severity;
  title: string;
  details?: string[];
  file?: string;
};

export type SentinelMeta = {
  repo?: string;
  prNumber?: number;
  sha?: string;
};

export function toSarif(findings: SentinelFinding[], meta: SentinelMeta) {
  const levelMap: Record<Severity, "error" | "warning" | "note"> = {
    error: "error",
    warn: "warning",
    info: "note",
  };

  const rules = findings.map((f, i) => ({
    id: `DENARIXX_SENTINEL_${i + 1}`,
    name: f.title,
    shortDescription: { text: f.title },
    fullDescription: { text: (f.details ?? []).join("\n") || f.title },
  }));

  const results = findings.map((f, i) => {
    const ruleId = `DENARIXX_SENTINEL_${i + 1}`;
    const msg = [f.title, ...(f.details ?? [])].filter(Boolean).join("\n");

    const locations = f.file
      ? [
          {
            physicalLocation: {
              artifactLocation: { uri: f.file },
            },
          },
        ]
      : [];

    return {
      ruleId,
      level: levelMap[f.severity],
      message: { text: msg },
      locations: locations.length ? locations : undefined,
    };
  });

  return {
    $schema:
      "https://json.schemastore.org/sarif-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: "Denarixx Sentinel",
            informationUri: "https://github.com/Dennis2y/Denarixx-Sentinel",
            rules,
          },
        },
        automationDetails: {
          id: "denarixx-sentinel",
        },
        properties: {
          repo: meta.repo ?? "",
          prNumber: meta.prNumber ?? null,
          sha: meta.sha ?? "",
        },
        results,
      },
    ],
  };
}
