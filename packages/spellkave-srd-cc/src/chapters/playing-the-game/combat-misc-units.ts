// Combat "misc" bundle: Unseen Attackers and Targets, Ranged Attacks, Melee
// Attacks (Reach + Opportunity Attacks), Mounted Combat, Underwater Combat.
// Ledger rows: "Unseen Attackers and Targets", "Ranged Attacks", "Melee
// Attacks", "Mounted Combat", "Underwater Combat" (`ledger/playing-the-game.md`).
// Grouped into ONE module (unlike this chapter's usual one-file-per-unit
// convention) because the operator brief's own framing for this bundle is
// "mostly adv/dis-shaped -> #23 addenda each, plus the non-adv/dis kernels" —
// five short units, each a provenance/addendum verdict rather than a new
// idiom, are lower-friction to audit together than split across five near-
// empty files.
//
// SOURCE: `cache/open5e/Rule.json`, five pks (one per unit, see each parser
// below) — all clean H2-subsectioned prose, no markdown-cache fallback
// needed anywhere in this bundle.
//
// ── Unseen Attackers and Targets — Advantage/Disadvantage-shaped, #23 ──────
// "attack roll against a target you can't see: Disadvantage" / "a creature
// that can't see you: Advantage [FOR you]" — BOTH directions of the SAME
// visibility axis, both bare-`attackRollExpr`-incompatible per finding
// finding #23 (bare `d20` never consults `ComposedRollBias`) — the 7th/8th
// confirmed consumer (two independent grants on one rule, same posture as
// Travel Pace's Fast pace granting two simultaneous Disadvantages). NOT
// built — no concrete "target is unseen" fact/predicate exists anywhere in
// this chapter's own scope to gate a `cond()` on yet, matching Vision and
// Light's own "moot until the prerequisite gap closes" verdict.
//
// ── Ranged Attacks — TWO gaps, confirmed independently, not conflated ─────
// (a) the normal/long RANGE split itself: the sister's own `attack-ranged.
// toml` (grepped directly, not assumed) authors exactly ONE `range_m` per
// affordance — a hard eligibility cutoff, matching "you can't attack a
// target beyond this range" for the single-range case, but there is NO
// second, larger radius authored anywhere, so the two-range shape (normal
// range Disadvantage-only, long range hard cutoff) has no substrate
// equivalent at all: a real, additional gap distinct from #23, since even a
// fixed substrate Advantage/Disadvantage mechanism would still need a SECOND
// distance fact to gate on. (b) BOTH the long-range Disadvantage (once a
// second radius existed) and the "Disadvantage within 5 ft of a seeing,
// non-Incapacitated enemy" close-combat clause are Advantage/Disadvantage-
// shaped, #23's 9th/10th consumer. Neither built.
//
// ── Melee Attacks — Reach is ALREADY a shipped, live provenance row (NOT a
// gap): `attack-melee.toml`'s own `range_m = 1.5240000486373901` (= 5 ft) IS
// this exact rule, already cited by this chapter's own D20 core-procedure
// unit precedent survey. Opportunity Attacks: a PATTERN verdict, not new
// content — the reaction machinery this rule needs is CONFIRMED ALREADY
// BUILT (Bucket-3's own "Reactions" ledger row: `srd/action_class/reaction`,
// `off_turn_eligible = true`, `action_definitions`' `reaction_trigger`/
// `reaction_eligibility`/`reaction_window_ms` fields, TWO live-demoed shapes
// in `world-fixtures/srd/base/action-economy-demo.toml` — Shape 4 is
// explicitly the Opportunity Attack example). This unit does not re-build
// that (no server/crates change, no duplicate content, per this bucket's own
// scope) — "Avoiding Opportunity Attacks" (Disengage / Teleport / forced
// movement exemptions) is the trigger-PREDICATE's own concern
// (`reaction_trigger` authoring), not a new mechanism.
//
// ── Mounted Combat — the Falling Off DC-10 Dexterity save composes CLEANLY
// from the save machinery already shipped this chapter (`d20TestExpr`,
// `d20-units.ts`) — `MOUNTED_FALLING_OFF_DC` below is the literal DC this
// rule specifies, offline-tested as a `d20TestExpr` consumer (see the
// offline test) exactly like Saving Throw Proficiencies' own "no new
// function, d20TestExpr with proficiencyCapabilityId IS the deliverable"
// pattern (`saving-throw-units.ts`'s module header). Mounting/Dismounting's
// "half Speed, round down" cost and Controlling a Mount's Initiative-sync
// are both DEFINITIONAL/narrative — no numeric idiom beyond the DC.
//
// ── Underwater Combat — Impeded Weapons (non-Piercing melee Disadvantage
// without a Swim Speed; ranged auto-miss beyond normal range + Disadvantage
// within it) is Advantage/Disadvantage-shaped, #23's 11th consumer (the
// ranged-within-range clause) PLUS the same normal/long-range-adjacent gap
// Ranged Attacks itself already names (an underwater-specific auto-miss
// variant of the same missing-range-axis problem). Fire Resistance is a
// cross-reference to the (unbuilt) Damage and Healing > Resistance and
// Vulnerability unit — recorded as a forward pointer, not duplicated here.
import { ruleByPk } from "../../open5e/rule";
import { d20TestExpr } from "./d20-units";

export const UNSEEN_ATTACKERS_RULE_PK = "srd-2024_combat_unseen-attackers-and-target";
export const RANGED_ATTACKS_RULE_PK = "srd-2024_combat_ranged-attacks";
export const MELEE_ATTACKS_RULE_PK = "srd-2024_combat_melee-attacks";
export const MOUNTED_COMBAT_RULE_PK = "srd-2024_combat_mounted-combat";
export const UNDERWATER_COMBAT_RULE_PK = "srd-2024_combat_underwater-combat";

/** One parsed H2 sub-section (heading -> body text) — the shared shape every unit in this bundle needs. */
export interface CombatMiscSubSection {
	heading: string;
	text: string;
}

/**
 * Parse the named H2 sub-sections out of a rule's own desc, in the given
 * order. Throws loudly on any missing heading (AGENTS.md loud-fail parser
 * posture) — shared by every unit in this bundle rather than five
 * near-identical copies.
 */
function parseNamedSubSections(
	desc: string,
	rulePk: string,
	headings: readonly string[],
): CombatMiscSubSection[] {
	return headings.map((heading) => {
		const start = desc.indexOf(`## ${heading}`);
		if (start === -1) {
			throw new Error(`combat-misc-units: '## ${heading}' heading not found in rule '${rulePk}'.`);
		}
		const bodyStart = start + `## ${heading}`.length;
		const nextHeading = desc.indexOf("##", bodyStart);
		const body = (
			nextHeading === -1 ? desc.slice(bodyStart) : desc.slice(bodyStart, nextHeading)
		).trim();
		if (body.length === 0) {
			throw new Error(
				`combat-misc-units: '## ${heading}' section (rule '${rulePk}') has no body text.`,
			);
		}
		return { heading, text: body };
	});
}

/** Unseen Attackers and Targets has no H2 sub-sections (three plain paragraphs) — returned verbatim, trimmed. */
export function unseenAttackersText(): string {
	return ruleByPk(UNSEEN_ATTACKERS_RULE_PK).desc.trim();
}

const RANGED_ATTACKS_HEADINGS = ["Range", "Ranged Attacks in Close Combat"] as const;

/** The parsed § Ranged Attacks sub-sections (Range, Ranged Attacks in Close Combat). */
export function rangedAttacksSubSections(): CombatMiscSubSection[] {
	return parseNamedSubSections(
		ruleByPk(RANGED_ATTACKS_RULE_PK).desc,
		RANGED_ATTACKS_RULE_PK,
		RANGED_ATTACKS_HEADINGS,
	);
}

const MELEE_ATTACKS_HEADINGS = ["Reach", "Opportunity Attacks"] as const;

/** The parsed § Melee Attacks sub-sections (Reach, Opportunity Attacks). */
export function meleeAttacksSubSections(): CombatMiscSubSection[] {
	return parseNamedSubSections(
		ruleByPk(MELEE_ATTACKS_RULE_PK).desc,
		MELEE_ATTACKS_RULE_PK,
		MELEE_ATTACKS_HEADINGS,
	);
}

const MOUNTED_COMBAT_HEADINGS = [
	"Mounting and Dismounting",
	"Controlling a Mount",
	"Falling Off",
] as const;

/** The parsed § Mounted Combat sub-sections. */
export function mountedCombatSubSections(): CombatMiscSubSection[] {
	return parseNamedSubSections(
		ruleByPk(MOUNTED_COMBAT_RULE_PK).desc,
		MOUNTED_COMBAT_RULE_PK,
		MOUNTED_COMBAT_HEADINGS,
	);
}

const UNDERWATER_COMBAT_HEADINGS = ["Impeded Weapons", "Fire Resistance"] as const;

/** The parsed § Underwater Combat sub-sections. */
export function underwaterCombatSubSections(): CombatMiscSubSection[] {
	return parseNamedSubSections(
		ruleByPk(UNDERWATER_COMBAT_RULE_PK).desc,
		UNDERWATER_COMBAT_RULE_PK,
		UNDERWATER_COMBAT_HEADINGS,
	);
}

/** Melee reach in metres — the ALREADY-SHIPPED sister constant (attack-melee.toml's own `range_m`), cited here for the reconciliation verdict, never re-authored. */
export const MELEE_REACH_METERS = 1.5240000486373901;

/** Falling Off's save DC, pinned from the cached text (§ Mounted Combat > Falling Off: "DC 10 Dexterity saving throw"). */
export const MOUNTED_FALLING_OFF_DC = 10;

/**
 * The Falling Off save as a `d20TestExpr` consumer — no new idiom (same
 * "d20TestExpr IS the deliverable" posture as Saving Throw Proficiencies,
 * `saving-throw-units.ts`'s own module header): a DC-10 Dexterity saving
 * throw, success avoiding the fall.
 */
export function mountedFallingOffSaveExpr(dexScoreExpr: string): string {
	return d20TestExpr({ scoreExpr: dexScoreExpr, dc: MOUNTED_FALLING_OFF_DC });
}
