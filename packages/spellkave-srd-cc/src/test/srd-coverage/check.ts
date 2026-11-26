import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGE_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const GENERATED_MARKER =
	"GENERATED from Vitest results by `src/test/srd-coverage/reporter.ts` — DO NOT EDIT BY HAND.";
/** Vitest CLI glob (equals-form so the shell cannot expand `**`). */
export const PIPELINE_TEST_EXCLUDE = "**/pipeline.test.ts";
const PIPELINE_TEST_FILE = "src/test/offline/pipeline.test.ts";

/** CI leftover-test shard count. Keep `SRD_COVERAGE_SHARD=i/K` in scripts/ci/run-ci-js.sh in sync. */
export const LEFTOVER_SHARD_COUNT = 4;

/** Vitest blob-reporter directory (package-relative). */
export const BLOB_REPORTS_DIR = ".vitest-reports";

export interface CoverageShard {
	/** 1-based shard index (`SRD_COVERAGE_SHARD=i/K`). */
	index: number;
	of: number;
}

/**
 * Parse `SRD_COVERAGE_SHARD=i/K` (1-based i). Empty/unset → unsharded leftover run.
 * Throws on any other value so a typo cannot silently run the full leftover suite.
 */
export function parseCoverageShard(raw: string | undefined): CoverageShard | undefined {
	if (raw === undefined || raw.trim() === "") return undefined;
	const match = /^([1-9]\d*)\/([1-9]\d*)$/.exec(raw.trim());
	if (match === null) {
		throw new Error(
			`SRD_COVERAGE_SHARD must be i/K with 1-based i (e.g. 1/${LEFTOVER_SHARD_COUNT}), got ${JSON.stringify(raw)}`,
		);
	}
	const index = Number(match[1]);
	const of = Number(match[2]);
	if (index > of) {
		throw new Error(`SRD_COVERAGE_SHARD index ${index} is greater than K=${of}`);
	}
	return { index, of };
}

/** Unique test file paths from `vitest list` stdout (`file > describe > it`). */
export function listedTestFiles(vitestArgs: string[]): string[] {
	const run = spawnSync("pnpm", ["exec", "vitest", "list", "--pool=threads", ...vitestArgs], {
		cwd: PACKAGE_DIR,
		encoding: "utf8",
		env: { ...process.env, SPELLKAVE_LOCAL_NODE: undefined },
	});
	if (run.status !== 0) {
		throw new Error(
			`vitest list failed (status ${run.status ?? "unknown"}): ${run.stderr || run.stdout}`,
		);
	}
	const files = new Set<string>();
	for (const line of run.stdout.split("\n")) {
		const file = line.split(" > ")[0]?.trim();
		if (file?.endsWith(".test.ts")) files.add(file);
	}
	return [...files].sort();
}

export function pipelineCollected(files: string[]): boolean {
	return files.some((file) => file === PIPELINE_TEST_FILE || file.endsWith("/pipeline.test.ts"));
}

/** File paths Vitest actually ran (`testResults[].name` = absolute filepath). */
export function collectedFilesFromVitestJson(json: string): string[] {
	const parsed = JSON.parse(json) as { testResults?: Array<{ name?: string }> };
	const files = new Set<string>();
	for (const result of parsed.testResults ?? []) {
		if (typeof result.name === "string" && result.name.length > 0) files.add(result.name);
	}
	return [...files].sort();
}

function phase(label: string, startedAt: number): void {
	console.error(`srd-coverage-check: ${label} ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
}

function markdownFiles(root: string): string[] {
	if (!existsSync(root)) return [];
	const files: string[] = [];
	for (const entry of readdirSync(root)) {
		const path = join(root, entry);
		if (statSync(path).isDirectory()) files.push(...markdownFiles(path));
		else if (entry.endsWith(".md")) files.push(path);
	}
	return files;
}

function generatedPaths(root: string): Set<string> {
	return new Set(markdownFiles(root).map((path) => relative(root, path).replaceAll("\\", "/")));
}

function managedWorkingPaths(root: string): Set<string> {
	const candidates = [
		...markdownFiles(join(root, "ledger")),
		join(root, "fixtures", "coverage.md"),
	].filter(existsSync);
	return new Set(
		candidates
			.filter((path) => readFileSync(path, "utf8").includes(GENERATED_MARKER))
			.map((path) => relative(root, path).replaceAll("\\", "/")),
	);
}

export function compareGeneratedReports(generatedRoot: string, workingRoot: string): string[] {
	const generated = generatedPaths(generatedRoot);
	const working = managedWorkingPaths(workingRoot);
	const paths = [...new Set([...generated, ...working])].sort();
	const differences: string[] = [];
	for (const path of paths) {
		if (!generated.has(path)) {
			differences.push(`${path}: committed generated report is no longer produced`);
			continue;
		}
		if (!working.has(path)) {
			differences.push(`${path}: generated report is missing from the working tree`);
			continue;
		}
		const actual = readFileSync(join(generatedRoot, path));
		const expected = readFileSync(join(workingRoot, path));
		if (!actual.equals(expected)) differences.push(`${path}: committed report is stale`);
	}
	return differences;
}

// The JS group shares one cgroup across parts. CLI flags override Vitest's
// environment defaults, so the existing four-worker ceiling must honor its cap.
export function coverageWorkerLimit(raw = process.env.VITEST_MAX_THREADS): number {
	if (raw === undefined || raw === "") return 4;
	const limit = Number(raw);
	if (!Number.isInteger(limit) || limit < 1) throw new Error("Invalid VITEST_MAX_THREADS");
	return Math.min(4, limit);
}

const VITEST_RUN_PREFIX = [
	"exec",
	"vitest",
	"run",
	"--pool=threads",
	"--maxWorkers=4",
	"--testTimeout=20000",
	"--includeTaskLocation",
] as const;

function coverageEnv(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
	const env: NodeJS.ProcessEnv = { ...process.env, ...overrides };
	delete env.SPELLKAVE_LOCAL_NODE;
	return env;
}

function runVitest(args: string[], env: NodeJS.ProcessEnv): number {
	const cappedArgs = args.map((arg) =>
		arg.startsWith("--maxWorkers=")
			? `--maxWorkers=${coverageWorkerLimit(env.VITEST_MAX_THREADS)}`
			: arg,
	);
	const run = spawnSync("pnpm", cappedArgs, {
		cwd: PACKAGE_DIR,
		env,
		stdio: "inherit",
	});
	return run.status ?? 1;
}

function assertPipelineExcluded(jsonPath: string, label: string): boolean {
	if (!existsSync(jsonPath)) {
		console.error(`srd-coverage-check: missing vitest json at ${jsonPath}`);
		return false;
	}
	const collected = collectedFilesFromVitestJson(readFileSync(jsonPath, "utf8"));
	if (pipelineCollected(collected)) {
		console.error(
			`pipeline.test.ts ran inside ${label} (${collected.length} files). Exclude glob ${PIPELINE_TEST_EXCLUDE} did not apply.`,
		);
		return false;
	}
	return true;
}

function compareAgainstWorkingTree(generatedRoot: string): number {
	const t = Date.now();
	const differences = compareGeneratedReports(generatedRoot, PACKAGE_DIR);
	phase("compareGeneratedReports", t);
	if (differences.length > 0) {
		console.error("Generated SRD evidence reports differ:");
		for (const difference of differences) console.error(`- ${difference}`);
		console.error("Run `pnpm --filter @spellkave/srd-cc run test:srd-coverage` to update them.");
		return 1;
	}
	console.log("Generated SRD evidence reports are current.");
	return 0;
}

function runLeftoverShard(shard: CoverageShard): number {
	const generatedRoot = mkdtempSync(join(tmpdir(), "spellkave-srd-shard-"));
	const jsonPath = join(generatedRoot, "vitest.json");
	try {
		let t = Date.now();
		const status = runVitest(
			[
				...VITEST_RUN_PREFIX,
				"--reporter=default",
				"--reporter=blob",
				"--reporter=json",
				`--outputFile.json=${jsonPath}`,
				`--shard=${shard.index}/${shard.of}`,
				"src",
				`--exclude=${PIPELINE_TEST_EXCLUDE}`,
			],
			coverageEnv(),
		);
		phase(`test:srd-coverage shard ${shard.index}/${shard.of}`, t);
		t = Date.now();
		if (!assertPipelineExcluded(jsonPath, `test:srd-coverage shard ${shard.index}/${shard.of}`)) {
			return 1;
		}
		phase("assert-pipeline-excluded", t);
		if (status !== 0) {
			console.error(`SRD leftover shard ${shard.index}/${shard.of} failed with status ${status}.`);
			return 1;
		}
		return 0;
	} finally {
		const t = Date.now();
		rmSync(generatedRoot, { recursive: true, force: true });
		phase("rmSync", t);
	}
}

function mergeLeftoverReports(): number {
	const generatedRoot = mkdtempSync(join(tmpdir(), "spellkave-srd-evidence-"));
	const jsonPath = join(generatedRoot, "vitest.json");
	try {
		let t = Date.now();
		const status = runVitest(
			[
				...VITEST_RUN_PREFIX,
				`--merge-reports=${BLOB_REPORTS_DIR}`,
				"--reporter=default",
				"--reporter=./src/test/srd-coverage/reporter.ts",
				"--reporter=json",
				`--outputFile=${jsonPath}`,
			],
			coverageEnv({ SRD_COVERAGE_OUTPUT_ROOT: generatedRoot }),
		);
		phase("test:srd-coverage merge-reports", t);
		if (status !== 0) {
			console.error(`SRD evidence merge failed with status ${status}.`);
			return 1;
		}
		t = Date.now();
		if (!assertPipelineExcluded(jsonPath, "test:srd-coverage merge-reports")) {
			return 1;
		}
		phase("assert-pipeline-excluded", t);
		return compareAgainstWorkingTree(generatedRoot);
	} finally {
		const t = Date.now();
		rmSync(generatedRoot, { recursive: true, force: true });
		phase("rmSync", t);
	}
}

export function checkGeneratedReports(): number {
	const shard = parseCoverageShard(process.env.SRD_COVERAGE_SHARD);
	const merge = process.env.SRD_COVERAGE_MERGE === "1";
	if (shard !== undefined && merge) {
		console.error("SRD_COVERAGE_SHARD and SRD_COVERAGE_MERGE=1 cannot both be set.");
		return 1;
	}
	if (shard !== undefined) return runLeftoverShard(shard);
	if (merge) return mergeLeftoverReports();

	const generatedRoot = mkdtempSync(join(tmpdir(), "spellkave-srd-evidence-"));
	const jsonPath = join(generatedRoot, "vitest.json");
	try {
		// Assert exclusion from THIS run's json reporter, not a second `vitest list`
		// collect of the same tree (sk-jay0.7.23.6: CI spent ~800s outside vitest).
		let t = Date.now();
		// Spawn vitest directly: `pnpm run test:srd-coverage -- --reporter=json`
		// inserts a `--` that Vitest treats as end-of-args, so the json file never
		// appears. Keep flags aligned with package.json test:srd-coverage.
		const status = runVitest(
			[
				...VITEST_RUN_PREFIX,
				"--reporter=default",
				"--reporter=./src/test/srd-coverage/reporter.ts",
				"--reporter=json",
				`--outputFile=${jsonPath}`,
				"src",
				`--exclude=${PIPELINE_TEST_EXCLUDE}`,
			],
			coverageEnv({ SRD_COVERAGE_OUTPUT_ROOT: generatedRoot }),
		);
		phase("test:srd-coverage", t);
		if (status !== 0) {
			console.error(`SRD evidence generation failed with status ${status}.`);
			return 1;
		}
		t = Date.now();
		if (!assertPipelineExcluded(jsonPath, "test:srd-coverage")) {
			return 1;
		}
		phase("assert-pipeline-excluded", t);
		return compareAgainstWorkingTree(generatedRoot);
	} finally {
		const t = Date.now();
		rmSync(generatedRoot, { recursive: true, force: true });
		phase("rmSync", t);
	}
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	process.exitCode = checkGeneratedReports();
}
