import { mkdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import type { Reporter } from "vitest/reporters";

import {
	type BacklogItemResult,
	type EvidenceState,
	type FindingEvidenceResult,
	parseBacklogName,
	parseFindingName,
	parseSrdEvidenceName,
	parseSrdNotApplicableName,
	type SrdEvidenceResult,
} from "./protocol";

type TestRunEndArgs = Parameters<NonNullable<Reporter["onTestRunEnd"]>>;

const PACKAGE_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const OUTPUT_ROOT = process.env.SRD_COVERAGE_OUTPUT_ROOT ?? PACKAGE_DIR;
const LOGICAL_LEDGER_DIR = join(PACKAGE_DIR, "ledger");
const LOGICAL_COVERAGE_FILE = join(PACKAGE_DIR, "fixtures", "coverage.md");
const LEDGER_OUTPUT_DIR = join(OUTPUT_ROOT, "ledger");
const COVERAGE_OUTPUT_FILE = join(OUTPUT_ROOT, "fixtures", "coverage.md");
const FINDING_OUTPUT_FILE = join(LEDGER_OUTPUT_DIR, "findings.md");
const BACKLOG_OUTPUT_FILE = join(LEDGER_OUTPUT_DIR, "backlog.md");
const GENERATED_NOTICE = [
	"> [!NOTE]",
	"> GENERATED from Vitest results by `src/test/srd-coverage/reporter.ts` — DO NOT EDIT BY HAND.",
] as const;
const ASPECT_ORDER = { source: 0, mechanic: 1, fixture: 2, live: 3 } as const;
const ASPECT_EXPLANATIONS = [
	"**Source:** the test proves that the complete SRD rule was read from the CC source.",
	"**Mechanic:** the test proves that the generated expression or behavior implements the rule.",
	"**Fixture:** the test proves that generated fixture content carries the rule into the bundle.",
	"**Live:** the test proves the rule through a live world interaction.",
	"**➖ n/a:** a skipped declaration records why a non-source axis does not apply.",
] as const;
const STATUS_LABEL = {
	proven: "✅ proven",
	reproduced: "❌ reproduced",
	unencoded: "⚠️ unencoded",
	notRun: "⏸ not run",
	undeclared: "⚠️ undeclared",
	failed: "💥 failed",
	notApplicable: "➖ n/a",
} as const;
type CoverageState = EvidenceState | "undeclared";
const STATUS_LEGEND = `**Status:** ${STATUS_LABEL.proven} = assertion passed; ${STATUS_LABEL.reproduced} = desired assertion failed as expected; ${STATUS_LABEL.unencoded} = assertion not written; ${STATUS_LABEL.notRun} = declaration was skipped; ${STATUS_LABEL.undeclared} = required axis has no declaration; ${STATUS_LABEL.notApplicable} = explicit justified exception; ${STATUS_LABEL.failed} = test-lane failure.`;
const FINDING_STATUS_LEGEND = `**Status:** ${STATUS_LABEL.proven} = regression assertion passed; ${STATUS_LABEL.reproduced} = desired assertion failed as expected; ${STATUS_LABEL.notRun} = executable declaration was skipped because its lane did not run; ${STATUS_LABEL.failed} = test-lane failure.`;
const BACKLOG_STATUS_LABEL = {
	unencoded: "📝 declared",
	reproduced: "🚧 open (assertable)",
	notRun: "⏸ not run",
	failed: "⚠️ needs attention",
	proven: "✅ resolved (retire this declaration)",
} as const;
const BACKLOG_STATUS_LEGEND = `**Status:** ${BACKLOG_STATUS_LABEL.unencoded} = pure intent, no assertion written yet; ${BACKLOG_STATUS_LABEL.reproduced} = assertable, desired assertion fails as expected (still open); ${BACKLOG_STATUS_LABEL.notRun} = assertable declaration was skipped because its lane did not run; ${BACKLOG_STATUS_LABEL.failed} = the assertion unexpectedly passed (or a real test-lane failure) — resolve by retiring or promoting the declaration; ${BACKLOG_STATUS_LABEL.proven} = should not occur (assertable items always run via \`it.fails\`) — investigate if seen.`;

function backlogStatusLabel(state: Exclude<EvidenceState, "not-applicable">): string {
	if (state === "not-run") return BACKLOG_STATUS_LABEL.notRun;
	return BACKLOG_STATUS_LABEL[state];
}

function escapeCell(value: string): string {
	return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

function displayUnit(unit: string): string {
	return unit
		.split("-")
		.map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
		.join(" ");
}

function coverageStatusLabel(state: CoverageState): string {
	if (state === "not-applicable") return STATUS_LABEL.notApplicable;
	if (state === "not-run") return STATUS_LABEL.notRun;
	return STATUS_LABEL[state];
}

const STATE_PRIORITY: Record<Exclude<CoverageState, "not-applicable">, number> = {
	failed: 0,
	reproduced: 1,
	unencoded: 2,
	"not-run": 3,
	undeclared: 4,
	proven: 5,
};

function worstState(
	states: readonly Exclude<CoverageState, "not-applicable">[],
): Exclude<CoverageState, "not-applicable"> {
	return [...states].sort((a, b) => STATE_PRIORITY[a] - STATE_PRIORITY[b])[0] ?? "undeclared";
}

function normalizedTestFile(moduleId: string): string {
	const absolutePath = moduleId.startsWith("file:") ? fileURLToPath(moduleId) : moduleId;
	return relative(PACKAGE_DIR, absolutePath).replaceAll("\\", "/");
}

// File links remain stable when comments move assertions; evidence identities locate the test.
function testLink(testFile: string): string {
	const target = relative(LOGICAL_LEDGER_DIR, join(PACKAGE_DIR, testFile)).replaceAll("\\", "/");
	return `[${basename(testFile)}](${target})`;
}

function coverageUnitLink(chapter: string, unit: string): string {
	const target = relative(
		dirname(LOGICAL_COVERAGE_FILE),
		join(LOGICAL_LEDGER_DIR, `${chapter}.md`),
	).replaceAll("\\", "/");
	return `[${escapeCell(displayUnit(unit))}](${target})`;
}

function referenceLinks(references: readonly string[] | undefined, outputDir: string): string {
	return (
		(references ?? [])
			.map((reference) => {
				if (reference.startsWith("http://") || reference.startsWith("https://")) {
					return `[${escapeCell(reference)}](${reference})`;
				}
				const target = relative(outputDir, join(PACKAGE_DIR, reference)).replaceAll("\\", "/");
				return `[${escapeCell(basename(reference))}](${target})`;
			})
			.join("<br>") || "—"
	);
}

function sorted(results: readonly SrdEvidenceResult[]): SrdEvidenceResult[] {
	return [...results].sort(
		(a, b) =>
			a.chapter.localeCompare(b.chapter) ||
			a.unit.localeCompare(b.unit) ||
			ASPECT_ORDER[a.aspect] - ASPECT_ORDER[b.aspect] ||
			a.claim.localeCompare(b.claim),
	);
}

export function renderExecutableLedger(results: readonly SrdEvidenceResult[]): string {
	const lines = [
		"# Executable SRD ledger",
		"",
		...GENERATED_NOTICE,
		"",
		"Each row is an authored test declaration; its status and links are generated from the Vitest result. A semantic unit is authored test-plan scope, not source-code line coverage.",
		"",
		STATUS_LEGEND,
		"",
		...ASPECT_EXPLANATIONS,
		"",
		"| Status | Chapter | Unit | Aspect | Executable claim | References | Test |",
		"|---|---|---|---|---|---|---|",
		...sorted(results).map(
			(result) =>
				`| ${coverageStatusLabel(result.state)} | ${escapeCell(result.chapter)} | ${escapeCell(displayUnit(result.unit))} | ${result.aspect} | ${escapeCell(result.claim)} | ${referenceLinks(result.references, LOGICAL_LEDGER_DIR)} | ${testLink(result.testFile)} |`,
		),
		"",
	];
	return lines.join("\n");
}

export function renderExecutableCoverage(results: readonly SrdEvidenceResult[]): string {
	const byUnit = new Map<string, SrdEvidenceResult[]>();
	for (const result of sorted(results)) {
		const key = `${result.chapter}/${result.unit}`;
		const current = byUnit.get(key) ?? [];
		current.push(result);
		byUnit.set(key, current);
	}
	const lines = [
		"# Executable SRD coverage overview",
		"",
		...GENERATED_NOTICE,
		"",
		"One global SRD-content view, not JavaScript line coverage. Semantic units and applicability are an authored test plan in `src/test/**`; this generated report projects their Vitest status, links, and counts.",
		"",
		STATUS_LEGEND,
		"",
		...ASPECT_EXPLANATIONS,
		"",
		"| Chapter | Unit | Source | Mechanic | Fixture | Live | Overall |",
		"|---|---|---|---|---|---|---|",
	];
	let completeUnits = 0;
	for (const [key, unitResults] of byUnit) {
		const [chapter, unit] = key.split("/");
		const stateFor = (aspect: SrdEvidenceResult["aspect"]): CoverageState => {
			const matches = unitResults.filter((result) => result.aspect === aspect);
			if (matches.length === 0) return "undeclared";
			if (matches.some((result) => result.state === "not-applicable")) {
				return matches.every((result) => result.state === "not-applicable") && aspect !== "source"
					? "not-applicable"
					: "failed";
			}
			return worstState(
				matches.map((result) => result.state as Exclude<EvidenceState, "not-applicable">),
			);
		};
		const sourceState = stateFor("source");
		const mechanicState = stateFor("mechanic");
		const fixtureState = stateFor("fixture");
		const liveState = stateFor("live");
		const complete = [sourceState, mechanicState, fixtureState, liveState].every(
			(state) => state === "proven" || state === "not-applicable",
		);
		const overallState = complete
			? "proven"
			: worstState(
					[sourceState, mechanicState, fixtureState, liveState].filter(
						(state): state is Exclude<CoverageState, "not-applicable"> =>
							state !== "not-applicable",
					),
				);
		if (complete) completeUnits += 1;
		lines.push(
			`| ${escapeCell(chapter ?? key)} | ${coverageUnitLink(chapter ?? key, unit ?? key)} | ${coverageStatusLabel(sourceState)} | ${coverageStatusLabel(mechanicState)} | ${coverageStatusLabel(fixtureState)} | ${coverageStatusLabel(liveState)} | ${coverageStatusLabel(overallState)} |`,
		);
	}
	const applicableResults = results.filter((result) => result.state !== "not-applicable");
	lines.push(
		"",
		`**Authored semantic units:** ${byUnit.size}. **Complete:** ${completeUnits}/${byUnit.size}. **Applicable declarations:** ${applicableResults.length} (${applicableResults.filter((result) => result.state === "proven").length} proven, ${applicableResults.filter((result) => result.state === "reproduced").length} reproduced, ${applicableResults.filter((result) => result.state === "unencoded").length} unencoded, ${applicableResults.filter((result) => result.state === "not-run").length} not run, ${applicableResults.filter((result) => result.state === "failed").length} failed). **Not applicable:** ${results.length - applicableResults.length}.`,
		"",
	);
	return lines.join("\n");
}

export function renderFindingLedger(results: readonly FindingEvidenceResult[]): string {
	const ordered = [...results].sort((a, b) =>
		a.id.localeCompare(b.id, undefined, { numeric: true }),
	);
	const duplicateIds = [
		...new Set(
			ordered.map((result) => result.id).filter((id, index, ids) => ids.indexOf(id) !== index),
		),
	];
	if (duplicateIds.length > 0) {
		throw new Error(`Duplicate finding IDs: ${duplicateIds.join(", ")}`);
	}
	const unencodedIds = ordered
		.filter((result) => result.state === "unencoded")
		.map((result) => result.id);
	if (unencodedIds.length > 0) {
		throw new Error(
			`Findings must be executable when declared; unencoded finding IDs: ${unencodedIds.join(", ")}`,
		);
	}
	const executableLocations = new Map<string, string>();
	for (const result of ordered.filter(
		(result) => result.state === "proven" || result.state === "reproduced",
	)) {
		if (/^Historical finding #\d+$/.test(result.title)) {
			throw new Error(`Executable finding ${result.id} needs a concrete title.`);
		}
		const location = `${result.testFile}:${result.testLine ?? "?"}`;
		const previous = executableLocations.get(location);
		if (previous !== undefined) {
			throw new Error(`Executable findings ${previous} and ${result.id} share ${location}.`);
		}
		executableLocations.set(location, result.id);
	}
	const lines = [
		"# Executable findings",
		"",
		...GENERATED_NOTICE,
		"",
		"Every finding is an executable regression assertion authored beside its public execution path; status, commands, links, and counts are generated.",
		"",
		FINDING_STATUS_LEGEND,
		"",
		`**Findings:** ${ordered.length} (${ordered.filter((result) => result.state === "reproduced").length} reproduced, ${ordered.filter((result) => result.state === "not-run").length} not run, ${ordered.filter((result) => result.state === "proven").length} proven, ${ordered.filter((result) => result.state === "failed").length} failed).`,
		"",
	];
	for (const result of ordered.filter((entry) => entry.state === "reproduced")) {
		lines.push(
			`## ${STATUS_LABEL.reproduced} — #${escapeCell(result.id)} ${escapeCell(result.title)}`,
			"",
			`**Expected:** ${result.expected}`,
			"",
			`**Observed:** ${result.observed}`,
			"",
			`**Impact:** ${result.impact}`,
			"",
			`**Reproduce:** \`${reproductionCommand(result.testFile)}\``,
			"",
			`**Test:** ${testLink(result.testFile)}`,
			"",
			`**References:** ${referenceLinks(result.references, LOGICAL_LEDGER_DIR)}`,
			"",
		);
	}
	for (const [state, heading] of [
		["not-run", "Declared but not run"],
		["proven", "Proven regressions"],
		["failed", "Test-lane failures"],
	] as const) {
		const entries = ordered.filter((entry) => entry.state === state);
		if (entries.length === 0) continue;
		lines.push(
			`## ${coverageStatusLabel(state)} — ${heading}`,
			"",
			"| Finding | Expected | Observed | Impact | References | Test |",
			"|---|---|---|---|---|---|",
			...entries.map(
				(result) =>
					`| #${escapeCell(result.id)} ${escapeCell(result.title)} | ${escapeCell(result.expected)} | ${escapeCell(result.observed)} | ${escapeCell(result.impact)} | ${referenceLinks(result.references, LOGICAL_LEDGER_DIR)} | ${testLink(result.testFile)} |`,
			),
			"",
		);
	}
	return lines.join("\n");
}

export function renderBacklogLedger(results: readonly BacklogItemResult[]): string {
	const ordered = [...results].sort((a, b) =>
		a.id.localeCompare(b.id, undefined, { numeric: true }),
	);
	const duplicateIds = [
		...new Set(
			ordered.map((result) => result.id).filter((id, index, ids) => ids.indexOf(id) !== index),
		),
	];
	if (duplicateIds.length > 0) {
		throw new Error(`Duplicate backlog IDs: ${duplicateIds.join(", ")}`);
	}
	const counts = {
		declared: ordered.filter((result) => result.kind === "declared").length,
		assertableOpen: ordered.filter(
			(result) => result.kind === "assertable" && result.state === "reproduced",
		).length,
		notRun: ordered.filter((result) => result.state === "not-run").length,
		needsAttention: ordered.filter((result) => result.state === "failed").length,
	};
	const lines = [
		"# Executable backlog",
		"",
		...GENERATED_NOTICE,
		"",
		"Every open backlog item is an authored declaration — `backlogItemDeclared` (pure intent, no assertion yet) or `backlogItemAssertable` (a real assertion that fails today by design). Status, commands, and links are generated; retiring or promoting an item happens by editing the declaration, never this file.",
		"",
		BACKLOG_STATUS_LEGEND,
		"",
		`**Backlog:** ${ordered.length} (${counts.declared} declared, ${counts.assertableOpen} assertable-open, ${counts.notRun} not run, ${counts.needsAttention} needs attention).`,
		"",
	];
	for (const result of ordered) {
		lines.push(
			`## ${backlogStatusLabel(result.state)} — #${escapeCell(result.id)} ${escapeCell(result.title)}`,
			"",
			`**Expected:** ${result.expected}`,
			"",
			`**Context:** ${result.context}`,
			"",
		);
		if (result.kind === "assertable") {
			lines.push(
				`**Reproduce:** \`${reproductionCommand(result.testFile)}\``,
				"",
				`**Test:** ${testLink(result.testFile)}`,
				"",
			);
		} else {
			lines.push(`**Declared at:** ${testLink(result.testFile)}`, "");
		}
		lines.push(`**References:** ${referenceLinks(result.references, LOGICAL_LEDGER_DIR)}`, "");
	}
	return lines.join("\n");
}

export function reproductionCommand(testFile: string): string {
	const testInvocation = `pnpm --filter @spellkave/srd-cc exec vitest run ${testFile} --no-file-parallelism`;
	if (
		testFile.startsWith("src/test/live-preseeded/") ||
		testFile.startsWith("src/test/live-self-seeding/")
	) {
		return `just spacetime-start && just wipe && just seed && just seed packages/spellkave-srd-cc/fixtures && source scripts/dev/node-env.sh && SPELLKAVE_LOCAL_NODE=1 ${testInvocation}`;
	}
	return testInvocation;
}

export function evidenceStateForTest(test: {
	options: { mode: "run" | "only" | "skip" | "todo"; fails?: boolean };
	result(): { state: "pending" | "passed" | "failed" | "skipped" };
}): Exclude<EvidenceState, "not-applicable"> {
	if (test.options.mode === "todo") return "unencoded";
	if (test.options.mode === "skip") return "not-run";
	const state = test.result().state;
	if (state === "pending" || state === "skipped") return "not-run";
	if (state === "failed") return "failed";
	return test.options.fails === true ? "reproduced" : "proven";
}

export default class SrdCoverageReporter implements Reporter {
	onTestRunEnd(testModules: TestRunEndArgs[0], unhandledErrors: TestRunEndArgs[1]): void {
		if (unhandledErrors.length > 0) return;
		const results: SrdEvidenceResult[] = [];
		const findings: FindingEvidenceResult[] = [];
		const backlog: BacklogItemResult[] = [];
		for (const module of testModules) {
			for (const test of module.children.allTests()) {
				const evidence = parseSrdEvidenceName(test.name);
				const notApplicable = parseSrdNotApplicableName(test.name);
				const declaration = evidence ?? notApplicable;
				const finding = parseFindingName(test.name);
				const backlogItem = parseBacklogName(test.name);
				if (finding !== undefined) {
					findings.push({
						...finding,
						testFile: normalizedTestFile(module.moduleId),
						testLine: test.location?.line,
						state: evidenceStateForTest(test),
					});
				}
				if (backlogItem !== undefined) {
					backlog.push({
						...backlogItem,
						testFile: normalizedTestFile(module.moduleId),
						testLine: test.location?.line,
						state: evidenceStateForTest(test),
					});
				}
				if (declaration === undefined) continue;
				results.push({
					...declaration,
					testFile: normalizedTestFile(module.moduleId),
					testLine: test.location?.line,
					state: notApplicable === undefined ? evidenceStateForTest(test) : "not-applicable",
				});
			}
		}
		if (results.length === 0 && findings.length === 0 && backlog.length === 0) return;
		mkdirSync(LEDGER_OUTPUT_DIR, { recursive: true });
		mkdirSync(dirname(COVERAGE_OUTPUT_FILE), { recursive: true });
		for (const chapter of new Set(results.map((result) => result.chapter))) {
			const chapterResults = results.filter((result) => result.chapter === chapter);
			writeFileSync(
				join(LEDGER_OUTPUT_DIR, `${chapter}.md`),
				renderExecutableLedger(chapterResults),
				"utf8",
			);
		}
		if (results.length > 0) {
			writeFileSync(COVERAGE_OUTPUT_FILE, renderExecutableCoverage(results), "utf8");
		}
		if (findings.length > 0) {
			writeFileSync(FINDING_OUTPUT_FILE, renderFindingLedger(findings), "utf8");
		}
		if (backlog.length > 0) {
			writeFileSync(BACKLOG_OUTPUT_FILE, renderBacklogLedger(backlog), "utf8");
		}
	}
}
