# CATES Configuration Analyzer

> Score coding-agent configurations for **token efficiency**, **security**, and **CATES conformance** — zero LLM calls required.

This is the reference implementation for the **Coding Agent Token Economics Standard (CATES)**. It is vendor-neutral and analyzes common coding-agent configuration surfaces, including instructions, prompt libraries, MCP configs, setup steps, hooks, and editor settings.

---

## 🚀 Quick Start

### Install

CATES is distributed as an npm package and a Docker image. Pick one:

```bash
# 1) Run it once with npx (nothing to install)
npx cates-analyzer .

# 2) Install globally (recommended for repeat use)
npm install -g cates-analyzer
cates-analyzer .

# 3) Add it as a dev dependency in a project
npm install --save-dev cates-analyzer
npx cates-analyzer .

# 4) Run it in Docker (no Node.js required locally)
docker run --rm -v "$PWD:/work" ghcr.io/msfttoler/cates:latest .
```

Requires Node.js **>= 20** for the npm install paths. The Docker image
ships its own runtime plus `git` and `gh`.

### Use it

```bash
# Analyze current directory
cates-analyzer .

# Analyze a specific repo
cates-analyzer /path/to/repo

# JSON output for CI
cates-analyzer . --format json

# SARIF output for code scanning systems
cates-analyzer . --format sarif

# Review a GitHub repository, branch folder, file, or pull request
cates-analyzer review https://github.com/OWNER/REPO
cates-analyzer review https://github.com/OWNER/REPO/tree/main/path/to/folder
cates-analyzer review https://github.com/OWNER/REPO/pull/123
```

When running from this source checkout before publishing/installing the package, use one of these forms:

```bash
npm run --silent review -- https://github.com/OWNER/REPO
npm run --silent cates -- review https://github.com/OWNER/REPO
npx tsx src/cli/index.ts review https://github.com/OWNER/REPO
```

Do not run `tsc review ...` or `npm run typecheck -- review ...`; those commands invoke the TypeScript compiler and it will treat `review` and the URL as files to compile.

## 🐳 Docker

A small, non-root Alpine image is the easiest way to get a consistent
toolchain across Windows, macOS, and Linux (plus the right `git` and `gh`
versions baked in).

```bash
# Build locally
docker build -t cates-analyzer .

# Analyze the current directory (bind-mount it as /work)
docker run --rm -v "$PWD:/work" cates-analyzer .

# Review a public repo
docker run --rm cates-analyzer review https://github.com/OWNER/REPO

# Review a private repo (token never written to disk)
docker run --rm -e GH_TOKEN cates-analyzer review https://github.com/OWNER/REPO

# JSON to stdout, piped into your tooling
docker run --rm -v "$PWD:/work" cates-analyzer . --format json > report.json
```

Windows PowerShell users substitute `${PWD}` for `$PWD`.

The image runs as a non-root user, uses a read-only root filesystem, and
ships with `tini` as PID 1 so it behaves cleanly under Kubernetes/ACA.

## ☸️ Kubernetes / AKS (Helm chart)

The chart in [`deploy/helm/cates`](deploy/helm/cates/README.md) deploys
CATES as a `CronJob` (default) or one-shot `Job`. It supports AKS
Workload Identity, NetworkPolicies, a persistent reports volume, and a
ConfigMap-mounted `.cates.yml` policy.

```bash
helm install cates ./deploy/helm/cates \
  -n cates --create-namespace \
  --set image.tag=1.0.0 \
  --set githubToken.value=$GH_TOKEN \
  --set-json 'args=["demo","--limit","25","--format","json"]'
```

See [`deploy/helm/cates/README.md`](deploy/helm/cates/README.md) for
production values, Workload Identity setup, and PVC-backed reports.

## ☁️ Azure Container Apps

For a server-less, no-cluster deployment, run CATES as an **ACA Job**:

```bash
az deployment group create \
  -g rg-cates \
  -f deploy/aca/cates-job.bicep \
  -p image=ghcr.io/msfttoler/cates:1.0.0 githubToken=$GH_TOKEN
```

Schedule, manual, and event-triggered modes are all supported. Full
walkthrough in [`deploy/aca/README.md`](deploy/aca/README.md).

## ✨ Features at a Glance

| Capability | What you get |
|---|---|
| **Zero-LLM static analysis** | Deterministic, fast, no API keys, no data exfiltration |
| **30+ rules** across 6 dimensions | Token efficiency, security, specificity, completeness, conflict/reachability, harness quality |
| **Per-family tokenizers** | OpenAI `cl100k`, OpenAI `o200k`, Anthropic Claude, or an offline approximation — pick one or compare side-by-side |
| **Multi-surface discovery** | Instructions, prompt libraries, MCP configs, hooks, setup steps, editor settings |
| **Configurable** | Toggle any rule or whole dimension on/off, override severities, suppress with reasons + expirations |
| **Multiple output formats** | Human-readable text, JSON, **SARIF** for GitHub Advanced Security and other scanners |
| **CI-ready gates** | `--min-score`, `--require-level`, `--fail-on`, `--max-always-loaded` |
| **Conformance levels** | Score against CATES Level 1, 2, or 3 |
| **GitHub-native review** | `cates-analyzer review <url>` for repos, branches, folders, files, or PRs (uses local `gh` credentials) |
| **Portfolio scanning** | Roll up many repos into one report |
| **Demo mode** | 100-repo built-in manifest (Microsoft, GitHub, Anthropic, broader OSS) |
| **Safe autofix** | `--fix` / `--fix-dry-run` for mechanical, reviewable changes |
| **Token economics** | Per-finding token impact + conservative and projected savings estimates |
| **Hardened runtime** | Sandboxed reads, size/depth limits, binary detection, no network calls |
| **Multiple ship targets** | npm CLI, Docker image, Helm chart for AKS, Bicep template for Azure Container Apps |

## ⚙️ Configuring CATES

CATES is policy-driven. Drop a `.cates.yml`, `.cates.yaml`, or `.cates.json`
at your repo root (or pass `--policy <path>`) and you can:

- Set CI quality gates (`minScore`, `requireLevel`, `failOn`,
  `maxAlwaysLoadedTokens`)
- **Toggle any individual rule on/off**
- **Toggle an entire dimension on/off** (e.g. skip all security rules
  because your org already uses GitHub Advanced Security)
- **Override the severity** of any rule or dimension
- Suppress specific findings (with required reasons and optional
  expirations)

Both YAML and JSON are accepted. A minimal annotated example:

```yaml
# .cates.yml — full schema
minScore: 80
requireLevel: 1
failOn: [critical]
maxAlwaysLoadedTokens: 1500

# ─── Whole-dimension toggles ─────────────────────────────────────────
# Disable an entire category of rules in one line. Useful when another
# tool already covers it (e.g., GHAS for secret scanning / code scanning).
dimensions:
  security: off              # skip CATES SEC* and security-tagged MCP/STP rules
  # token-efficiency: off
  # specificity: off
  # completeness: off
  # conflict-reachability: off
  # harness-quality: off

# ─── Per-rule toggles & severity overrides ───────────────────────────
# Most specific wins: rules[<id>] > dimensions[<dim>] > built-in defaults.
# Shorthand:  off | on | <severity>   (critical|high|medium|low|info)
# Long form:  { enabled: true|false, severity: <severity> }
rules:
  SEC001: off                # disable a single rule
  TE004: low                 # downgrade Forced Verbosity from high to low
  MCP002: on                 # re-enable one rule even though `security: off`
  CMP002: { severity: high } # long form

# ─── Suppressions (for documented false positives / accepted risk) ───
suppressions:
  - ruleId: SEC004
    file: .github/copilot-instructions.md
    reason: Covered by organization-level prompt protection
    owner: @platform-team
    expires: 2026-12-31
```

The same shape works as JSON:

```json
{
  "minScore": 80,
  "dimensions": { "security": "off" },
  "rules": { "SEC001": "off", "TE004": "low" }
}
```

> **Tip — GHAS users:** set `dimensions.security: off` and let GitHub
> Advanced Security own secret scanning and code scanning. CATES will
> still score token efficiency, specificity, completeness, conflicts, and
> harness quality, and any individual security rule you want to keep
> (e.g. `MCP002`, `SEC005`) can be re-enabled with `rules.<ID>: on`.

Disabled rules and dimensions are reported in the JSON output under
`disabledFindings`, `disabledRuleIds`, and `disabledDimensions` so you
can audit exactly what was filtered.

## 🧭 So... What's Next?

Once you have a report, here's how to drive the score up:

### 1. Triage in this order

1. **Critical findings first** — almost always `SEC001` (hardcoded secrets)
   or `MCP002` (secrets in MCP config). Rotate the credential, then remove
   it from history and move it behind an env var / secret manager.
2. **High-severity security & token waste** — `SEC003` (overly permissive
   scope), `SEC005` (system-prompt leakage), `TE004` (forced verbosity),
   `TE006` (cross-file duplication).
3. **Token budget breach** — if `TE001` fires, your always-loaded config
   is over the 1,500-token budget. Move conditional or rarely-used
   guidance into scoped instruction files or on-demand prompt files.
4. **Specificity & completeness** — replace vague language (`SPC001`) with
   concrete file paths, commands, and decision criteria; add the missing
   essential topics flagged by `CMP002`.

### 2. Use the built-in helpers

```bash
# Explain any rule, including the CATES section it maps to and how to fix it
cates-analyzer explain SEC003
cates-analyzer explain TE004

# Apply mechanical, reviewable fixes (only rules marked autofix-safe)
cates-analyzer . --fix-dry-run     # preview
cates-analyzer . --fix             # apply

# Re-run with a stricter gate to confirm the fix
cates-analyzer . --min-score 85 --fail-on critical,high
```

### 3. Adopt the configuration loop

- Commit a `.cates.yml` so the policy is reviewed like code.
- If a rule is genuinely not applicable (e.g. you use GHAS), **disable
  it** in `.cates.yml` rather than ignoring it everywhere.
- If a finding is a known false positive, **suppress it** with a reason
  and (ideally) an `expires` date — the suppression report tells you
  when those expire.
- Wire CATES into CI with `--format sarif` and upload to GitHub code
  scanning, or `--format json` and feed it into your own dashboards.

### 4. Refactor toward the CATES recommendations

Every report contains a `recommendations` block, prioritized and
estimated in tokens saved per invocation. Start at priority 1 and work
down — each item lists the affected files, the safety classification,
and whether it's autofixable.

### 5. Track progress over time

```bash
# Compare scores across runs by saving JSON reports per commit
cates-analyzer . --format json > reports/$(git rev-parse --short HEAD).json
```

For multi-repo views use `cates-analyzer portfolio <path>` or the demo
manifest (`cates-analyzer demo --limit 25`).



## 📊 What It Scores

| Dimension | Weight | What It Checks |
|-----------|--------|----------------|
| **Security** | 25% | Secrets, prompt injection vectors, overly permissive grants, system prompt leakage |
| **Token Efficiency** | 25% | Redundancy, verbose examples, generic filler, forced verbosity, negative constraint spam |
| **Specificity** | 15% | Vague vs actionable instructions, project-specific context, concrete patterns |
| **Completeness** | 15% | Coverage of testing, error handling, style, architecture, security, scope, output |
| **Conflict & Reachability** | 10% | Contradictory instructions and precedence conflicts |
| **Harness Quality** | 10% | Scope limits, failure handling, output constraints, verification steps |

## 🔐 Security Design

This tool is hardened against adversarial configs:

- **Sandboxed reads** — `realpath()` verification prevents symlink escapes
- **Size/depth/count limits** — no DoS via deep trees or huge files
- **Binary detection** — skips non-text files
- **No execution** — never runs or evaluates discovered content
- **Secret redaction** — findings never expose full secrets
- **No network calls** — purely local analysis (zero data exfiltration risk)
- **Strict CLI validation** — invalid formats, gates, severities, and limits fail loudly
- **Auditable suppressions** — `.cates.yml` suppressions require reasons and support expiration dates

## ⚡ Token Efficiency (Dogfooding)

This tool practices what it preaches:

- **Zero LLM calls** for core scoring — pure heuristic-based analysis
- **Real tokenizers per model family**:
  - `openai-cl100k` (default) — GPT-3.5, GPT-4, GPT-4 Turbo
  - `openai-o200k` — GPT-4o, o1, o3, o4 series
  - `anthropic-claude` — Claude (BPE; exact for Claude 2, approximation for Claude 3+)
  - `approx` — offline character heuristic
- **Config precedence awareness** — knows which files are always-loaded vs conditional
- **Token reduction projections** with conservative direct-token reduction and projected retry/tool-call reduction percentages

Pick one for scoring with `--tokenizer`, or compare side-by-side with `--compare-tokenizers`:

```bash
cates-analyzer . --tokenizer anthropic-claude
cates-analyzer . --compare-tokenizers openai-cl100k,openai-o200k,anthropic-claude
cates-analyzer tokenizers                # list supported tokenizers
```

The default tokenizer can also be set via `CATES_TOKENIZER=anthropic-claude`.

## 📁 Files It Discovers

| File Pattern | Type | Loading Scope |
|-------------|------|---------------|
| `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `QWEN.md`, `.ai/instructions.md`, `.github/copilot-instructions.md` | Root instructions | Always-loaded |
| Nested `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `QWEN.md` | Scoped instructions | Conditional |
| `.github/prompts/*.md`, `.ai/prompts/*.md`, `.claude/commands/*.md`, `.gemini/commands/*.md` | Prompt/command files | On-demand |
| `agents/*`, `.github/agents/*`, `.ai/agents/*`, `.claude/agents/*`, `.gemini/agents/*` | Agent definitions | Conditional |
| `.cursorrules`, `.cursor/rules/*.mdc`, `.windsurfrules`, `.windsurf/rules/*`, `.clinerules`, `.cline/rules/*`, `.roo/rules/*`, `.ai/rules/*` | Rule files | Always/conditional |
| MCP configs (`mcp.json`, `.mcp.json`, `.vscode/mcp.json`, `.claude/mcp.json`, `.gemini/mcp.json`, `.ai/mcp.json`) | Tool/server configs | Conditional |
| `.vscode/settings.json`, `.cursor/settings.json`, `.claude/settings*.json`, `.gemini/settings.json`, `.aider.conf.yml`, `.aiderignore` | Editor/CLI settings | Conditional |
| Setup and hook configs (`.ai/agent-setup.yml`, `.github/copilot-setup-steps.yml`, `.pre-commit-config.yaml`, `.claude/hooks/*`, `.ai/hooks/*`) | Agent environment/harness | Environmental |

## 🛠 CLI Options

```
Usage:
  cates-analyzer analyze [options] [path]
  cates-analyzer review [options] <source>
  cates-analyzer conformance [options] [path]
  cates-analyzer rules [options]
  cates-analyzer explain <ruleId>
  cates-analyzer portfolio [options] [path]
  cates-analyzer demo [options]
  cates-analyzer tokenizers [options]

Common analyze options:
  -f, --format <format>       pretty, json, sarif
  --policy <path>             .cates.yml/.json policy file
  --min-score <n>             quality gate
  --require-level <n>         require CATES Level 1, 2, or 3
  --fail-on <list>            e.g. critical,high
  --max-always-loaded <n>     token budget gate
  --tokenizer <name>          openai-cl100k (default), openai-o200k, anthropic-claude, approx
  --compare-tokenizers <list> side-by-side counts, e.g. openai-cl100k,anthropic-claude
  --files <list>              comma-separated relative files to analyze
  --individual                score each --files entry separately
  --fix / --fix-dry-run       safe mechanical fixes
```

`review` accepts local folders and GitHub URLs. For private repositories, authenticate with `gh auth login` and use `review`; CATES uses local GitHub CLI credentials instead of asking for tokens.

`demo` scans a built-in 100-repository manifest: 25 Microsoft, 25 GitHub, 25 Claude/Anthropic ecosystem, and 25 broader open-source repositories. Override it with `--repos-file repos.txt`, where each non-comment line is either a GitHub URL or `<category> <GitHub URL>`.

You can also run demo mode through the default command with `cates-analyzer --demo`.

Policy suppressions can be used for documented false positives or temporary accepted risk:

```yaml
suppressions:
  - ruleId: SEC004
    file: .github/copilot-instructions.md
    reason: Covered by organization-level prompt protection
    expires: 2026-12-31
```

## 🏗 Architecture

```
src/
├── cli/index.ts              # Commander.js CLI entry point
├── analyzers/
│   ├── index.ts              # Orchestrator (parallel analyzer execution)
│   ├── discovery.ts          # Secure file enumeration + tokenization
│   ├── token-efficiency.ts   # Waste pattern detection
│   ├── security.ts           # Secret/injection/permission analysis
│   ├── specificity.ts        # Vagueness and project-context checks
│   ├── completeness.ts       # Topic coverage analysis
│   └── conflicts.ts          # Contradiction detection + harness quality
├── rules/
│   └── catalog.ts            # Machine-readable CATES rule catalog
├── scoring/
│   ├── calculator.ts         # Weighted multi-dimension scoring
│   ├── recommendations.ts    # Prioritized action generation
│   └── report.ts             # Pretty/JSON/SARIF formatters
├── conformance.ts            # Level/gate evaluation
├── policy.ts                 # .cates.yml loading
├── autofix.ts                # Safe fix/dry-run support
├── portfolio.ts              # Multi-repo scanning
├── utils/
│   └── tokenizer.ts          # cl100k_base tokenizer + context measurement
├── types.ts                  # Zod-validated type definitions
└── index.ts                  # Library entry point
```

## 🧪 Development

```bash
npm install
npm run typecheck     # TypeScript validation
npm test              # Vitest test suite
npm run test:coverage # Coverage report
npx tsx src/cli/index.ts ./fixtures/bad   # Test against bad config
npx tsx src/cli/index.ts ./fixtures/good  # Test against good config
```

## 📋 Rule Reference

This is an abbreviated reference. The complete machine-readable catalog is available with:

```bash
cates-analyzer rules --format json
cates-analyzer explain TE004
```

| Rule | Dimension | Severity | Description |
|------|-----------|----------|-------------|
| SEC001 | Security | Critical | Secrets/credentials in config |
| SEC002 | Security | High | Prompt injection vectors |
| SEC003 | Security | High | Overly permissive grants |
| SEC004 | Security | Medium | Missing prompt protection |
| SEC005 | Security | High | System prompt leakage |
| SEC006 | Security | High | Unsafe command patterns |
| TE001 | Token Efficiency | Medium | Always-loaded config >1,500 tokens |
| TE002 | Token Efficiency | Medium | Verbose code examples (>200 tokens) |
| TE003 | Token Efficiency | Low | Generic filler (platform defaults) |
| TE004 | Token Efficiency | High | Forced verbosity patterns |
| TE005 | Token Efficiency | Medium | Negative constraint spam |
| TE006 | Token Efficiency | High | Cross-file duplication |
| TE007 | Token Efficiency | Medium | Duplicated instructions within a file |
| SPC001 | Specificity | Medium | Vague/unactionable instructions |
| SPC002 | Specificity | Medium | No project-specific context |
| SPC003 | Specificity | Low | No architecture documentation |
| SPC004 | Specificity | Low | Long abstract blocks without examples |
| CMP001 | Completeness | High | No configuration found |
| CMP002 | Completeness | Medium | Missing essential topics |
| CMP003 | Completeness | Low | Single oversized config file |
| CNF001 | Conflicts | High | Contradictory instructions |
| CNF002 | Harness | Medium | Missing harness elements |

## 🔖 Versioning & Releases

This package follows [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).
Releases are automated by
[release-please](https://github.com/googleapis/release-please) from
[Conventional Commits](https://www.conventionalcommits.org/) on `main`:

- `feat:` → MINOR bump
- `fix:` / `perf:` → PATCH bump
- `feat!:` or `BREAKING CHANGE:` → MAJOR bump

The full policy (including how the CATES standard document is versioned
separately from the analyzer) is in [`VERSIONING.md`](./VERSIONING.md), and
all releases are recorded in [`CHANGELOG.md`](./CHANGELOG.md).

## License

MIT. See [LICENSE](LICENSE).
