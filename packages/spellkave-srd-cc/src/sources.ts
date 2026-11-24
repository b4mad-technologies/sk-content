import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Source forks live BESIDE the worktree container, not inside the repo:
//   <spellkave>/           (.bare + one dir per worktree: main, feat-srd, …)
//   <spellkave>/dnd-5e-srd-markdown/   fork of downfallx/dnd-5e-srd-markdown
//   <spellkave>/open5e-api/            fork of open5e/open5e-api
// From packages/spellkave-srd-cc/ that is usually three levels up, but nested
// agent worktrees / deeper layouts break a fixed hop count (finding #80 /
// issue #2102). Resolve by walking ancestors (or SPELLKAVE_FORKS_ROOT).

/** Sibling directory names that identify the forks container. */
export const FORKS_ROOT_MARKERS = ["dnd-5e-srd-markdown", "open5e-api"] as const;

const ENV_FORKS_ROOT = "SPELLKAVE_FORKS_ROOT";

function isForksRoot(dir: string): boolean {
	return FORKS_ROOT_MARKERS.every((name) => fs.existsSync(path.join(dir, name)));
}

/**
 * Locate the directory that holds the source forks.
 *
 * Resolution order:
 * 1. `SPELLKAVE_FORKS_ROOT` (absolute or relative) when set — must contain both markers
 * 2. Walk ancestors of `startDir` (default: this package root) until both markers exist
 * 3. Throw with every path tried
 */
export function resolveForksRoot(options?: { startDir?: string; env?: NodeJS.ProcessEnv }): string {
	const env = options?.env ?? process.env;
	const startDir = options?.startDir ?? path.dirname(path.dirname(fileURLToPath(import.meta.url)));

	const override = env[ENV_FORKS_ROOT]?.trim();
	if (override) {
		const resolved = path.resolve(override);
		if (!isForksRoot(resolved)) {
			throw new Error(
				`${ENV_FORKS_ROOT}=${resolved} does not contain required fork siblings ` +
					`(${FORKS_ROOT_MARKERS.join(", ")}).`,
			);
		}
		return resolved;
	}

	const tried: string[] = [];
	let dir = path.resolve(startDir);
	for (;;) {
		tried.push(dir);
		if (isForksRoot(dir)) return dir;
		const parent = path.dirname(dir);
		if (parent === dir) break;
		dir = parent;
	}

	throw new Error(
		`Could not locate SRD source forks root (expected sibling dirs ` +
			`${FORKS_ROOT_MARKERS.join(" and ")}). Searched ancestors of ${path.resolve(startDir)}: ` +
			`${tried.join(" → ")}. Set ${ENV_FORKS_ROOT} to override.`,
	);
}

const pkgRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

/**
 * Resolve forks for the package-level path exports. Must NOT throw on bare
 * import — CI offline suites import this module without the sibling forks
 * checked out (pre-#2102 fixed-hop paths never threw either). Loud failure
 * stays on explicit `resolveForksRoot()` / actual file reads in sync-cache.
 */
function forksRootForExports(): string {
	try {
		return resolveForksRoot({ startDir: pkgRoot });
	} catch {
		return path.resolve(pkgRoot, "../../..");
	}
}

const forksRoot = forksRootForExports();

/** Prose SRD 5.2.1 as chapter markdown (fork of downfallx/dnd-5e-srd-markdown). */
export const SRD_MARKDOWN_DIR = path.join(forksRoot, "dnd-5e-srd-markdown");

/**
 * Machine-readable SRD 5.2 as normalized Django-fixture JSON.
 * ONLY this directory of the open5e-api fork is CC-BY-4.0; sibling publisher
 * dirs (kobold-press, green-ronin, …) carry other licenses and MUST NOT be read.
 */
export const OPEN5E_SRD_2024_DIR = path.join(
	forksRoot,
	"open5e-api/data/v2/wizards-of-the-coast/srd-2024",
);

/**
 * `open5e/core` — a SECOND open5e-api directory, distinct from
 * `OPEN5E_SRD_2024_DIR` above. Its `Document.json` declares
 * `licenses: ["cc-by-40", "ogl-10a"]` (verified 2026-07-31,
 * `ledger/archive/general-decisions.md`'s 2026-07-31 addendum — upstream commit `f4c5c317`;
 * earlier `license: null` readings checked a singular key that doesn't exist)
 * — CC-BY-4.0 suffices for this package. Per `ledger/archive/general-decisions.md`'s operator
 * direction, this widening is consumer-gated, never blanket: only files
 * explicitly listed in `src/sync-cache.ts`'s `SYNCED_FILES` may be read from
 * here (first case: `Language.json`, C2's provenance source) — every other
 * file in this directory remains off-limits until it gets its own named
 * consumer and explicit sync-cache entry.
 */
export const OPEN5E_CORE_DIR = path.join(forksRoot, "open5e-api/data/v2/open5e/core");
