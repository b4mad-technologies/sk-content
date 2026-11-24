// DOC-IMPL: attack-and-damage#consequence-side-idioms
// Temporary Hit Points (playing-the-game.md § Damage and Healing > Temporary
// Hit Points): a SEPARATE pool consumed before real Hit Points, non-stacking
// (take-higher), not Hit Points or healing. Ledger row: `ledger/
// playing-the-game.md` "Temporary Hit Points (Lose First / Duration / They
// Don't Stack / Not HP or Healing)".
//
// SOURCE: cached chapter markdown (same markdown-only posture as
// `hp-units.ts`/`damage-units.ts` — no isolating open5e Rule.json record).
//
// PROBED, NOT ASSUMED — the operator brief's own framing ("almost certainly
// needs substrate support that doesn't exist... probe, then finding + pattern
// note") undersold this one: BOTH sub-rules turn out to be expressible with
// EXISTING primitives, no new kernel primitive needed. Recorded as a positive
// finding, not a gap.
//
// "THEY DON'T STACK" (take the higher, discard the lower) — derived directly
// from `ModifyResource`'s own proven clamp-add semantics
// (`server/src/world_interaction/layer2/r_apply_consequence/modify_resource.rs`:
// `apply_resource_delta` computes `current.saturating_add(delta).clamp(min,
// max)`): a delta of `max(0, newAmount - current)` yields
// `current + max(0, newAmount - current)`, which is exactly `max(current,
// newAmount)` — "keep the higher, gain nothing if the new grant is lower" IS
// the take-higher rule, with zero new primitive required. `temporaryHpGainExpr`
// below is that one delta expression.
//
// "LOSE TEMPORARY HIT POINTS FIRST" (a damage source drains the temp-HP pool
// before the real HP pool, remainder carries over) — the two-ordinal pattern
// documented on `tempHpLoseFirstDeltas` below composes two `ModifyResource`
// frame_writes that both read the SAME pre-drain `srd/temp_hp` value (proven
// safe by the SAME "later ordinal reads an earlier ordinal's already-committed
// state, sequential commit" idiom `attack-melee.toml`'s lethal cascade and
// `death-saves.toml`'s tally-then-threshold ordinals both already rely on —
// see those files' own header comments). No fixture wires this pattern yet
// (this chapter authors no concrete temp-HP-granting spell/effect to attach
// it to — forcing one would be speculative content, against this package's
// sourcing discipline), so it ships as a PATTERN, proven exhaustively offline
// against the source's own worked example, not live.
//
// DURATION ("until depleted or you finish a Long Rest") — DELIBERATELY NOT
// MODELED: `recovery_rule` is chosen `"persistent"` below (accurate: nothing
// decays this pool automatically), not `"long_rest"` — verified by reading
// `server/src/world_interaction/layer3/resource_definition.rs` directly:
// `recovery_rule` is a bare `String` field, stored and round-tripped
// (`manifest/mod.rs:392`) but consulted by NO reducer anywhere in the server
// (grepped: no `.recovery_rule ==` match in `server/src` or `crates`) — it is
// currently DESCRIPTIVE METADATA, not an enforced mechanic. Recorded as
// finding #31 (`ledger/findings.md`): every existing
// `"long_rest"`-tagged resource in the sister bundle (including its own
// `srd/hp`) carries the same unenforced label.
//
// NOT HP OR HEALING: purely definitional (no delta composition needed — the
// rule is a NEGATIVE constraint: don't route a Temp-HP grant through
// `healingExpr`/the real `srd/hp` pool at all, satisfied by simply never doing
// so, not by any new mechanic).
import { readFileSync } from "node:fs";
import path from "node:path";
import { CACHE_MARKDOWN_DIR } from "../../markdown/paths";

export const TEMP_HP_ID = "temp_hp";
export const TEMP_HP_DISPLAY_NAME = "Temporary Hit Points";
export const MIN_TEMP_HP = 0;
/** Safety-bound ceiling, same reasoning as `hp-units.ts`'s `HP_SAFETY_MAX` — not a per-effect cap. */
export const TEMP_HP_SAFETY_MAX = 999;
export const INITIAL_TEMP_HP = 0;
export const TEMP_HP_RECOVERY_RULE = "persistent";

const BUFFER_SENTENCE =
	"Some spells and other effects confer Temporary Hit Points, which are a buffer against losing actual Hit Points";
const LOSE_FIRST_SENTENCE =
	"If you have Temporary Hit Points and take damage, those points are lost first, " +
	"and any leftover damage carries over to your Hit Points.";
const DONT_STACK_SENTENCE =
	"Temporary Hit Points can't be added together. If you have Temporary Hit " +
	"Points and receive more of them, you decide whether to keep the ones you " +
	"have or to gain the new ones.";
const DURATION_SENTENCE =
	"Temporary Hit Points last until they're depleted or you finish a Long Rest";
const NOT_HEALING_SENTENCE =
	"Temporary Hit Points can't be added to your Hit Points, healing can't restore them, " +
	"and receiving Temporary Hit Points doesn't count as healing.";

/**
 * Confirm both sourcing sentences are still present, verbatim, in the cached
 * chapter markdown's § Temporary Hit Points section.
 */
export function assertTempHpProvenanceSource(): void {
	const markdown = readFileSync(path.join(CACHE_MARKDOWN_DIR, "playing-the-game.md"), "utf8");
	if (!markdown.includes(BUFFER_SENTENCE)) {
		throw new Error(
			`temp-hp-units: expected Temporary Hit Points identity sentence not found in cached ` +
				"playing-the-game.md — the section may have been reworded.",
		);
	}
	if (!markdown.includes(LOSE_FIRST_SENTENCE)) {
		throw new Error(
			`temp-hp-units: expected 'Lose Temporary Hit Points First' sentence not found in cached ` +
				"playing-the-game.md — the section may have been reworded.",
		);
	}
	if (!markdown.includes(DONT_STACK_SENTENCE)) {
		throw new Error(
			`temp-hp-units: expected "They Don't Stack" sentence not found in cached ` +
				"playing-the-game.md — the section may have been reworded.",
		);
	}
	if (!markdown.includes(DURATION_SENTENCE)) {
		throw new Error(
			`temp-hp-units: expected Duration sentence not found in cached playing-the-game.md — ` +
				"the section may have been reworded.",
		);
	}
	if (!markdown.includes(NOT_HEALING_SENTENCE)) {
		throw new Error(
			`temp-hp-units: expected "They're Not Hit Points or Healing" sentence not found in ` +
				"cached playing-the-game.md — the section may have been reworded.",
		);
	}
}

/**
 * Build the take-higher gain delta: `max(0, <newAmount> - <current>)` — a
 * `ModifyResource` delta_source that, composed with the engine's own
 * clamp-add semantics, yields `max(current, newAmount)` (module header's own
 * derivation). `currentExpr` is the SAME subject's own `temp_hp` read (e.g.
 * `actor.stat('srd/temp_hp')`) — the caller's concern, not pre-read here,
 * matching every other idiom builder in this chapter.
 */
export function temporaryHpGainExpr(newAmountExpr: string, currentExpr: string): string {
	return `max(0, (${newAmountExpr}) - (${currentExpr}))`;
}

/** The composable inputs of the lose-first two-ordinal pattern. */
export interface TempHpLoseFirstOptions {
	/** Positive damage magnitude, e.g. `damageRollExpr(...)`'s own output. */
	damageExpr: string;
	/**
	 * Int-valued DSL subexpression reading the subject's CURRENT `temp_hp`
	 * value — must be read by BOTH ordinals below from the SAME pre-drain
	 * state (see `TempHpLoseFirstDeltas`'s own ordering contract).
	 */
	tempHpExpr: string;
}

/**
 * Two `ModifyResource` delta_source strings, both sign-negated (ready for a
 * damage consequence, the sister's own `"0 - ..."` convention) and BOTH
 * reading the SAME pre-drain `tempHpExpr` — proven correct against the
 * source's own worked example (5 Temp HP, 7 damage -> lose the 5, then lose 2
 * HP; see `src/test/offline/temp-hp-units.test.ts`).
 *
 * ORDERING CONTRACT (hard requirement, not incidental): `hpDeltaSource` MUST
 * be authored at an EARLIER ordinal than `tempHpDeltaSource` on the same
 * `consequence_templates` row. Both formulas read `tempHpExpr` as it stood
 * BEFORE either write ran; `tempHpDeltaSource`'s own ordinal is the one that
 * actually mutates `temp_hp` — if it ran FIRST, `hpDeltaSource`'s later
 * `tempHpExpr` read would observe the ALREADY-DRAINED value and compute the
 * wrong spillover. This is the same "later ordinal reads an earlier
 * ordinal's already-committed state" sequential-commit idiom every other
 * multi-ordinal consequence in this bundle's sister precedent relies on
 * (module header).
 */
export interface TempHpLoseFirstDeltas {
	/** Ordinal N (author FIRST): spillover applied to the real `srd/hp` pool. */
	hpDeltaSource: string;
	/** Ordinal N+1 (author SECOND): the temp-HP pool's own drain. */
	tempHpDeltaSource: string;
}

export function tempHpLoseFirstDeltas(options: TempHpLoseFirstOptions): TempHpLoseFirstDeltas {
	const { damageExpr, tempHpExpr } = options;
	return {
		hpDeltaSource: `0 - max(0, (${damageExpr}) - (${tempHpExpr}))`,
		tempHpDeltaSource: `0 - min(${tempHpExpr}, ${damageExpr})`,
	};
}
