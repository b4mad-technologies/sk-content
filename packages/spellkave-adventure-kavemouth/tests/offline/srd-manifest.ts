/**
 * The ONE place the kavemouth seed-fact lint reaches into srd-cc. Reading the
 * compiled srd fixtures is needed for claims that live in the ruleset (what
 * `srd.creature` grants, what `srd/takes-turn` expands to); keeping the
 * relative import here keeps that cross-package coupling to a single line.
 */
import { createLocalAuthorTarget } from "@spellkave/tool-node/authoring";
import { inspectManifest, loadFlattened } from "@spellkave/world-author";
import { FIXTURES_DIR } from "../../../spellkave-srd-cc/src/pipeline";

type Row = Record<string, unknown>;
let cached: Record<string, unknown> | undefined;

/** Rows of one kind from the flattened srd-cc fixtures (loaded once per file). */
export function srdRows(kind: string): Row[] {
	cached ??= inspectManifest(loadFlattened(FIXTURES_DIR)).manifest as Record<string, unknown>;
	const value = cached[kind];
	return Array.isArray(value) ? (value as Row[]) : [];
}

/** A local author target over the srd-cc fixtures, for `renderRuntimeDelta`. */
export const srdAuthorTarget = () => createLocalAuthorTarget(FIXTURES_DIR);
