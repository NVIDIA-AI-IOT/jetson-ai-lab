# Jetson AI Lab contributor guidance

Read `CONTENT_GUIDE.md` and `CONTRIBUTING.md` before changing site content.

## Sources of truth

- Collection schemas and model validation: `src/content/config.ts`
- Benchmark data: `src/data/benchmarks.json`
- Short machine-readable index: `src/pages/llms.txt.ts`
- Full documentation and runnable-command feed: `src/pages/llms-full.txt.ts`
- Repository skills: `skills/skills.yaml`

Do not duplicate schema values or catalog rules in new documentation. Link to the
source of truth so guidance does not drift.

## Validation

Run `npm run build` from the repository root after content, model, tutorial,
benchmark, feed, or asset changes. The `prebuild` chain checks model metadata
and model freshness; Astro then validates the content collections and
`src/data/benchmarks.json` while it builds.

For focused failures, use the commands documented in `package.json` and the
triage guidance in `skills/jetson-ai-lab-verify-build/SKILL.md`.
