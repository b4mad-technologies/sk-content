// Cover (playing-the-game.md § Combat > Cover): three degrees of cover, each
// giving a target a bonus to AC AND Dexterity saving throws — BEST-OF, never
// additive (a target behind multiple cover sources only benefits from the
// single most protective degree). Ledger row: "Cover"
// (`ledger/playing-the-game.md`).
//
// SOURCE: `cache/open5e/Rule.json`, pk `srd-2024_combat_cover` — the desc IS
// almost entirely the table (confirmed by reading the raw JSON directly, not
// assumed): a clean 3-column markdown pipe table, no markdown-cache fallback
// needed (same posture as the Cover table's siblings — Ability Checks,
// Saving Throws, Attack Rolls Abilities — all clean open5e pipe tables).
//
// MAXIM-AUDIT F1 (2026-07-28, `ledger/designs/equipment-ac-target-fact.md` §
// Grounding 4): Cover is now MODELED AS WORLD STATE, not generation-time
// algebra — "parameters live in the world" (AGENTS.md's own design maxims):
// Half/Three-Quarters Cover ship as real `condition_definitions` rows
// (`index.ts`'s `buildCoverConditionsFragment`, ids `${BUNDLE_ID}/
// COVER_HALF_LOCAL_ID` / `${BUNDLE_ID}/COVER_THREE_QUARTERS_LOCAL_ID`), each
// carrying its own ALWAYS-ACTIVE `modifier_templates` row (`applies_to =
// "srd/ac"`, `delta_kind = "Plus"`) built from the SAME parsed bonus
// constants below (`halfCoverBonus`/`threeQuartersCoverBonus` — never
// retyped). A DM now APPLIES Cover to a target via `ApplyStatus` (the same
// runtime mechanism the Advantage condition already proves,
// `proof-scene.ts`'s `advantage-grant`/`cover-grant` pair) instead of an
// author swapping a literal AC for `(base) + bonus` at generation time.
//
// RETIRED: `coverModifiedAcExpr` (the former generation-time compose-level
// builder — `(acExpr) + bonus`). Zero remaining consumers once the proof
// scene's `attack-roll-cover` check moved to the plain `target.effective(
// 'srd/ac')` read every other attack check already uses (F1 replaces the
// algebra, it does not wrap it) — the design maxims' own "historical, not a
// pattern to extend" framing applies literally here, not just to the DC-per-
// row precedent it was coined for: keeping a dead algebraic AC-modifier
// builder around, with no shipped call site and no test exercising it, would
// be exactly the "generated grid of near-duplicates" anti-pattern this
// chapter's own maxims warn against re-introducing at a FUTURE call site.
// Deleted outright rather than left dangling; this note (+ the design
// draft's own Grounding §4 record) is the historical trail.
//
// THIS UNIT IS STILL BOTH TABLE AND COMPOSE-LEVEL SOURCE for the two
// condition rows above (unlike the pure reference tables elsewhere in this
// chapter): Cover has a REAL, concrete consumer — the attack roll's target
// AC — so `halfCoverBonus`/`threeQuartersCoverBonus` below are genuine
// world-authoring inputs, not just a provenance record. This mirrors "Making
// an Attack"'s own framing (the next unit in this ledger): step 2,
// "Determine Modifiers", explicitly names Cover as one of the things a GM
// applies before resolving the attack roll.
//
// TOTAL COVER — PROBED, NOT ASSUMED (module's own decision, see
// `CoverDegree.targetable`): the table's own "Benefit to Target" cell for
// Total is "Can't be targeted directly" — not an AC/save bonus at all, a
// different KIND of rule (an eligibility gate, not a modifier). Grepped this
// chapter's and the sister's own affordance-targeting surface for a
// "target-is-untargetable" predicate hook: none exists — `attack-melee.toml`'s
// own `srd/niche/strikeable_target` niche gates on `target.state("core/grounded")`
// only, no cover-eligibility axis. So Total Cover is NOT expressible as a
// condition modifying the `srd/ac` axis (the other two degrees ARE) — it
// would need to gate the affordance's own TARGETING/eligibility (a
// `niche_definitions`/`spatial_niche_attachment` predicate, or a
// target-selection-time filter), a structurally different axis than an AC
// modifier. Recorded honestly as an UNBUILT eligibility gap (no concrete
// cover-authoring fixture exists in this chapter to compose it against, same
// "pattern ships, no speculative content" posture as `attackRollExpr`'s own
// weapon-proficiency term) — `CoverDegree.targetable` carries the
// distinction so no caller can accidentally treat Total Cover as a bonus
// term.
import { ruleByPk } from "../../open5e/rule";

export const COVER_RULE_PK = "srd-2024_combat_cover";

const EXPECTED_DEGREES = ["Half", "Three Quarters", "Total"] as const;
type CoverDegreeName = (typeof EXPECTED_DEGREES)[number];

/** One row of the Cover table (Degree | Benefit to Target | Offered By …). */
export interface CoverDegree {
	degree: CoverDegreeName;
	/**
	 * The AC/Dex-save bonus this degree grants — `undefined` for Total, whose
	 * "benefit" is untargetability, not a numeric bonus (see module header).
	 */
	bonus: number | undefined;
	/** `false` only for Total — see module header's "Total Cover" note. */
	targetable: boolean;
	/** Verbatim (trimmed) "Offered By …" cell. */
	offeredBy: string;
}

/**
 * Parse the Cover table (Degree | Benefit to Target | Offered By …) out of
 * the rule's own markdown-pipe-table desc. Throws loudly on any shape
 * surprise (AGENTS.md loud-fail parser posture).
 */
export function parseCoverTable(desc: string): CoverDegree[] {
	const lines = desc.split("\n").map((line) => line.trim());
	const headerIndex = lines.findIndex((line) =>
		/^\|Degree\|Benefit to Target\|Offered By/.test(line),
	);
	if (headerIndex === -1) {
		throw new Error(`cover-units: Cover table header not found in rule '${COVER_RULE_PK}'.`);
	}
	const separatorLine = lines[headerIndex + 1];
	if (separatorLine === undefined || !/^\|-+\|-+\|-+\|$/.test(separatorLine)) {
		throw new Error(
			"cover-units: no '|---|---|---|' separator immediately after the Cover header.",
		);
	}
	const rows: CoverDegree[] = [];
	for (let index = headerIndex + 2; index < lines.length; index += 1) {
		const line = lines[index];
		if (line === undefined || !/^\|[^|]+\|[^|]+\|[^|]+\|$/.test(line)) {
			break;
		}
		const cells = line
			.slice(1, -1)
			.split("|")
			.map((cell) => cell.trim());
		const [degreeCell, benefitCell, offeredByCell] = cells;
		if (degreeCell === undefined || benefitCell === undefined || offeredByCell === undefined) {
			throw new Error("cover-units: Cover row missing a cell.");
		}
		if (!(EXPECTED_DEGREES as readonly string[]).includes(degreeCell)) {
			throw new Error(
				`cover-units: unexpected cover degree '${degreeCell}' — expected one of ${EXPECTED_DEGREES.join(", ")}.`,
			);
		}
		const degree = degreeCell as CoverDegreeName;
		if (degree === "Total") {
			if (!/can.t be targeted directly/i.test(benefitCell)) {
				throw new Error(
					`cover-units: Total row benefit cell '${benefitCell}' is not the expected untargetable text.`,
				);
			}
			rows.push({ degree, bonus: undefined, targetable: false, offeredBy: offeredByCell });
			continue;
		}
		const bonusMatch = benefitCell.match(/^\+(\d+) bonus to AC and Dexterity saving throws$/);
		if (bonusMatch === null) {
			throw new Error(
				`cover-units: ${degree} row benefit cell '${benefitCell}' does not match the expected '+N bonus...' shape.`,
			);
		}
		rows.push({
			degree,
			bonus: Number.parseInt(bonusMatch[1] ?? "", 10),
			targetable: true,
			offeredBy: offeredByCell,
		});
	}
	if (rows.length !== EXPECTED_DEGREES.length) {
		throw new Error(
			`cover-units: expected exactly ${EXPECTED_DEGREES.length} Cover rows, got ${rows.length}.`,
		);
	}
	const seenDegrees = new Set(rows.map((row) => row.degree));
	for (const degree of EXPECTED_DEGREES) {
		if (!seenDegrees.has(degree)) {
			throw new Error(`cover-units: Cover table is missing the '${degree}' row.`);
		}
	}
	return rows;
}

/** The parsed Cover table, read from the committed cache. */
export function coverTable(): CoverDegree[] {
	return parseCoverTable(ruleByPk(COVER_RULE_PK).desc);
}

/** The Half-cover AC/Dex-save bonus (+2), pinned from the parsed table — never a bare literal at a call site. */
export function halfCoverBonus(): number {
	const row = coverTable().find((degree) => degree.degree === "Half");
	if (row?.bonus === undefined) {
		throw new Error("cover-units: Half cover row missing or has no numeric bonus.");
	}
	return row.bonus;
}

/** The Three-Quarters-cover AC/Dex-save bonus (+5), pinned from the parsed table. */
export function threeQuartersCoverBonus(): number {
	const row = coverTable().find((degree) => degree.degree === "Three Quarters");
	if (row?.bonus === undefined) {
		throw new Error("cover-units: Three Quarters cover row missing or has no numeric bonus.");
	}
	return row.bonus;
}

// ── World-authoring ids (F1) — the two condition rows `index.ts`'s
// `buildCoverConditionsFragment` ships. Bundle-relative local id stems, same
// `<slug>/<slug>` convention `armor-units.ts`'s `AC_ID`/equipment's own
// `armor/chain-mail` local ids use — `index.ts` qualifies them under
// `BUNDLE_ID`. Display names are ALSO exported (not just derived inline) so
// the proof scene and any future consumer never retype them either. ──

/** `condition_definitions` local id stem for Half Cover — full id `${BUNDLE_ID}/${COVER_HALF_LOCAL_ID}`. */
export const COVER_HALF_LOCAL_ID = "cover/half";
export const COVER_HALF_DISPLAY_NAME = "Half Cover";
/** `modifier_templates` local id stem for Half Cover's own AC modifier. */
export const COVER_HALF_MODIFIER_LOCAL_ID = "cover/half/ac_bonus";

/** `condition_definitions` local id stem for Three-Quarters Cover — full id `${BUNDLE_ID}/${COVER_THREE_QUARTERS_LOCAL_ID}`. */
export const COVER_THREE_QUARTERS_LOCAL_ID = "cover/three-quarters";
export const COVER_THREE_QUARTERS_DISPLAY_NAME = "Three-Quarters Cover";
/** `modifier_templates` local id stem for Three-Quarters Cover's own AC modifier. */
export const COVER_THREE_QUARTERS_MODIFIER_LOCAL_ID = "cover/three-quarters/ac_bonus";

// ── Self-sufficiency (AGENTS.md "Self-sufficiency", ledger/archive/general-decisions.md's
// 2026-07-28 operator ruling): `condition_definitions.stacking_rule`/
// `remove_time_policy` are cross-bundle vocabulary ids (`spellkave_define_
// condition`'s own `stacking_rule`/`remove_time_policy` params, `authoring-
// verbs.ts`) that default to `core/stacking/single`/`core/remove_policy/
// independent_lifetime` when omitted — a dependency on the `core` bundle this
// package must never carry. `buildCoverConditionsFragment` (`fragments/cover.ts`)
// authors srd-own equivalents instead (semantics mirrored from `core`'s own
// rows, `world-fixtures/core/base/conditions.toml:157-194` — read directly,
// never assumed): "Single active row" leaves `stack_count`/`expires_at_tick`
// unchanged on a re-apply (a second ApplyStatus is a harmless no-op refresh,
// never a stack), "Independent lifetime" never auto-removes by time
// (explicit removal is admitted, including implied children). Consumed by BOTH condition rows this
// module backs (`index.ts`'s two `spellkave_define_condition` calls) AND the
// proof scene's own `advantage_condition` (`proof-scene.ts`) — every
// `condition_definitions` row this package authors anywhere. ──

/** `stacking_discipline_definitions` local id stem — full id `${BUNDLE_ID}/${STACKING_SINGLE_LOCAL_ID}`. Semantics: `world-fixtures/core/base/conditions.toml:177-180` (`core/stacking/single`). */
export const STACKING_SINGLE_LOCAL_ID = "stacking/single";
export const STACKING_SINGLE_DISPLAY_NAME = "Single active row";
/** `stacking_discipline_definitions.stack_count_outcome_source` — leaves the existing stack_count unchanged. */
export const STACKING_SINGLE_STACK_COUNT_OUTCOME_SOURCE = "stack_count";
/** `stacking_discipline_definitions.expires_at_tick_outcome_source` — `-1` means "leave the existing expiry unchanged". */
export const STACKING_SINGLE_EXPIRES_AT_TICK_OUTCOME_SOURCE = "-1";

/** `condition_remove_policy_definitions` local id stem — full id `${BUNDLE_ID}/${REMOVE_POLICY_INDEPENDENT_LIFETIME_LOCAL_ID}`. Semantics: `world-fixtures/core/base/conditions.toml:157-161` (`core/remove_policy/independent_lifetime`). */
export const REMOVE_POLICY_INDEPENDENT_LIFETIME_LOCAL_ID = "remove_policy/independent_lifetime";
export const REMOVE_POLICY_INDEPENDENT_LIFETIME_DISPLAY_NAME = "Independent lifetime";
/** Round 3: permit removal of implied children, including older parent links.
 * This changes all users of this policy and requires canon review (d020).
 */
export const REMOVE_POLICY_INDEPENDENT_LIFETIME_REMOVE_PREDICATE_SOURCE = "implied_by_count() >= 0";
