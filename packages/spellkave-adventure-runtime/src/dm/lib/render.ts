/**
 * DM Runtime Library core (ADR-0096, S2 — `dm-runtime-library-arc.md`) —
 * the render step: `VerbCall[]` -> manifest TOML, in memory.
 *
 * A thin, deliberate wrapper around `@spellkave/tool-node`'s
 * `driveManifestScene` — the SAME `@spellkave/tool-authoring` authoring-
 * verb driver the fixtures PIPELINE uses ("one authoring engine",
 * `../../../AGENTS.md`) — over a FRESH in-memory workspace per call. Never
 * writes a file under `fixtures/`: a runtime delta is not a build-time
 * artifact (ADR-0096 D-1 replaces ADR-0094 D-1's "never composes manifest
 * content at runtime" for library-rendered content specifically).
 *
 * DETERMINISM (ADR-0096 D-2.2, "the playthrough is the true test" — the
 * package's minimal-unit-test ruling puts the render-determinism burden
 * here instead of a heavier static-analysis obligation): `driveManifestScene`
 * accumulates calls into one in-memory string with no wall-clock or RNG of
 * its own, so the SAME `VerbCall[]` renders BYTE-IDENTICAL TOML every call —
 * PROVIDED the caller's own builders stay pure (no `Date.now()`, no
 * unseeded RNG, no unordered `Map`/`Set` iteration feeding row order). Every
 * builder in this library (`dialogue.ts`/`niches.ts`/`grants.ts`/
 * `resources.ts`) is a pure function of its typed input for exactly this
 * reason.
 */
import type { AuthorTarget } from "@spellkave/tool-authoring";
import { driveManifestScene, type VerbCall } from "./scene-driver.ts";

export type { AuthorTarget } from "@spellkave/tool-authoring";
export type { VerbCall } from "./scene-driver.ts";
export { VerbRunnerError } from "./scene-driver.ts";

/**
 * Render ONE runtime manifest delta from a `VerbCall` sequence.
 *
 * The target resolves references against seeded vocabulary. Callers rendering
 * grants or instance state pass a live target, or a fixture-backed target
 * offline, to resolve the definitions those rows reference. Scripted creation
 * and level-up now perform authored acts rather than render runtime deltas.
 * The optional target remains useful for self-contained authoring sequences.
 */
export async function renderRuntimeDelta(
	calls: readonly VerbCall[],
	target?: AuthorTarget,
): Promise<string> {
	return driveManifestScene(calls, target);
}
