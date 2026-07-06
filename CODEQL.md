# CodeQL Static Analysis

This repository uses **GitHub CodeQL** to perform automated static application security testing (SAST) on every push, pull request, and on a weekly schedule.

## What is CodeQL?

[CodeQL](https://codeql.github.com/) is GitHub's semantic code analysis engine. It treats code as data, allowing security researchers to write queries that find vulnerabilities across the entire codebase. CodeQL is the same engine that powers GitHub's own security advisories and the [Code Scanning alerts](https://docs.github.com/en/code-security/code-scanning/introduction-to-code-scanning) you see in the **Security** tab.

## What is scanned

| Component                          | Language                  | Path                |
| ---------------------------------- | ------------------------- | ------------------- |
| Frontend (Next.js + React)         | JavaScript / TypeScript   | `frontend/src/**`   |
| Backend (Node.js / Express)        | JavaScript                | `backend/src/**`    |

The workflow lives at `.github/workflows/codeql.yml` and is configured to scan **JavaScript / TypeScript** with `[security-and-quality]` queries enabled.

## When it runs

The workflow is triggered on:

- **Push** to `main` / `master`
- **Pull request** targeting `main` / `master`
- **Schedule** — every Monday at `06:00 UTC` to catch newly disclosed vulnerabilities in dependencies

## How to view results

1. Go to the repository's **Security** tab → **Code scanning**.
2. Findings appear as alerts sorted by severity (`Error`, `Warning`, `Note`).
3. Each alert links back to the exact commit/PR that introduced it, the affected source file, and the rule that was violated.

For high-severity findings, GitHub can also open a Dependabot-style issue and warn maintainers automatically.

## Suppressing false positives

If a CodeQL alert is a known false positive:

```yaml
# In .github/codeql/codeql-config.yml (optional, can be added later)
filter:
  - exclude:
      id: js/clear-text-logging
      paths:
        - frontend/src/lib/debug/**
```

Or use a `// codeql[rule-id]` inline ignore-with-explanation directive in the affected source file. Always include a justification so future maintainers know why the suppression is intentional.

## Local development

You do **not** need CodeQL installed locally to develop on this repository — CI handles all scanning. However, if you want to run CodeQL locally before pushing:

```bash
# Install the CodeQL CLI (macOS / Linux)
brew install codeql
# or download a release from
# https://github.com/github/codeql-cli-binaries/releases

# Create a database for the frontend
codeql database create frontend-db --language=javascript-typescript --source-root=frontend

# Run the default query pack
codeql database analyze frontend-db \
  --download \
  --format=sarif-latest \
  --output=results.sarif
```

The `results.sarif` file can be uploaded to your fork's code scanning dashboard for inspection.

## Reporting a security issue

CodeQL is one layer of defense. If you discover a real security vulnerability, follow the [SECURITY.md](./SECURITY.md) disclosure process — **do not** open a public issue.

## References

- [GitHub CodeQL documentation](https://docs.github.com/en/code-security/codeql-cli)
- [CodeQL query packs](https://github.com/github/codeql/tree/main/javascript/ql/src)
- [Configuring CodeQL](https://docs.github.com/en/code-security/code-scanning/automatically-scanning-your-code-for-vulnerabilities-and-errors/customizing-code-scanning)
- [Interpreting SARIF results](https://docs.github.com/en/code-security/code-scanning/integrating-other-tools/sarif-file-output)

---

> Automated scanning is a safety net, not a replacement for secure design. Always follow the [Security Philosophy](./SECURITY.md) when authoring new features.
