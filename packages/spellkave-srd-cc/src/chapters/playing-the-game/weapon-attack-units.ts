// DOC-IMPL: attack-and-damage#weapon-admitted-variants-and-item-sourced-facts
// DOC-IMPL: attack-and-damage#consequence-side-idioms
// Combat-arena proof, Slice A (`ledger/designs/combat-arena-proof.md`):
// generic melee/ranged weapon-attack archetypes, distinct from the already-
// shipped Unarmed Strike (`unarmed-strike-units.ts`, a FIXED 1+mod formula,
// no dice). Both reuse this chapter's existing idiom builders verbatim —
// `attackRollExpr` (to-hit), `damageRollExpr` (damage), `abilityModifierExpr`
// (the ability-modifier term) — never retyped.
//
// SOURCE:
//   - Reach (cache/markdown/playing-the-game.md:1092): "A creature has a
//     5-foot reach..." — reused verbatim from `combat-misc-units.ts`'s
//     already-shipped `MELEE_REACH_METERS` (that module's own header cites
//     this line; never re-derived here).
//   - Range (cache/markdown/playing-the-game.md:1076-1080): "the smaller
//     number is the normal range... Your attack roll has Disadvantage when
//     your target is beyond normal range, and you can't attack a target
//     beyond long range." Only the normal-range HARD CUTOFF is authored here
//     (`range_m`, an affordance eligibility bound) — the long-range-
//     Disadvantage half is a recorded gap (finding #64,
//     `ledger/findings.md`; also already a gap the chapter's own
//     `combat-misc-units.ts` names for Ranged Attacks generally).
//   - Attack Roll Abilities (playing-the-game.md § D20 Tests > Attack Rolls,
//     `attack-roll-units.ts`'s own parsed table): melee uses Strength,
//     ranged uses Dexterity — the `attackRollExpr` calls below select the
//     matching score expression per archetype, same idiom the shipped
//     Unarmed Strike / Opportunity Attack rows already use.
//
// WEAPON-PROVIDED VARIANTS AND FACTS: `srd.creature` supplies the shared
// `srd/action/attack` attempt capability. A manufactured or natural weapon
// makes exactly its matching melee/ranged variant attemptable through the
// live offer predicate: the wielded item must carry the corresponding
// `srd.weapon.range.*` tag. Ranged items also carry `srd/attack_range_mm`;
// melee composes actor-effective `srd/reach_mm` with the item's Reach tag.
// The hit consequence reads that same item's `srd/damage` magnitude and,
// and the item's `srd.damage_type.<type>` tag. With
// no matching wielded item, no weapon-attack affordance materialises;
// Unarmed Strike remains the universal no-weapon Attack variant. `range_m`
// is the catalog-derived outer candidate bound, while the predicate enforces
// the exact effective range for the selected variant.
//
// FINESSE (BL-49): the equipped weapon's modifier is baked INTO its damage
// slot at authoring time. The runtime `attackAbilityScoreExpr` applies the
// sourced Finesse tag to to-hit. The SRD's own Dart (Simple RANGED, Finesse)
// is why the ranged to-hit side needs the same gate.
// `meleeAttackRollExpr`'s own TO-HIT formula carries no per-weapon
// proficiency bonus beyond the baked `srd/proficiency_bonus` stat: a known,
// reported fidelity gap versus the flat monster-stat-block to-hit (PR body,
// probe sk-84i.1) — an EXPANSION of `attackRollExpr`'s existing
// `proficiencyLevelExpr`/finesse-aware scoring is a real, larger-blast-radius
// follow-up this probe does not attempt.
//
import { routeDamageMagnitude } from "@spellkave/tool-authoring";
import {
	feetToMillimetres,
	WEAPON_ATTACK_RANGE_SLOT_ID,
	WEAPON_DAMAGE_SLOT_ID,
} from "../equipment/weapon-damage-source-units";
import { WEAPON_SUBJECT } from "../equipment/weapon-subject";
import {
	damageTypeTag,
	SRD_DAMAGE_TYPES,
	WEAPON_RANGE_TAG_PREFIX,
	weaponFinessePropertyTag,
	weaponReachPropertyTag,
} from "../equipment/weapon-tag-values";
import { buildWeaponUnits, weaponAttackRangeFeet } from "../equipment/weapon-units";
import type { VerbCall } from "../verb-runner";
import { attackRollExpr } from "./attack-roll-units";
import { BUNDLE_ID } from "./constants";
import { MONSTER_TAG } from "./creature-type-units";
import { damageRollExpr } from "./damage-units";
import { MAX_REACH_MM, STANDARD_REACH_MM } from "./reach-units";

// actor-carried-verbs (D1/D7, ruling bead sk-rd0): `srd/niche/strikeable`'s
// niche_definitions row is RETIRED — its AC-gated predicate never did any
// selecting work (duplicated verbatim on every template that referenced it),
// and Gate B's provider-aware admission (server/src/world_interaction/
// affordance_materialiser/reconcile/candidates.rs) makes the whole shape
// unnecessary for capability-driven verbs: the actor's own capability now
// carries the verb everywhere, no place attachment or AC doorman required.
// `STRIKEABLE_NICHE_LOCAL_ID` stays exported UNCHANGED below — the
// combat-arena proof scene (`proof-scene/calls/combat-arena.ts`,
// `monsters/proof-scene.ts`) still attaches it as a plain PLACE niche id (no
// niche_definitions row needed for that shape, `creature-type-units.ts`'s own
// header note) and is out of this change's blast radius (design.md's own
// Out-of-Scope: only the elven-mini adventure's attachments retire).
// `ATTACK_VERB_NICHE_LOCAL_ID` is the NEW actor-provided niche every
// capability-driven attack template (this file's Melee/Ranged/Unarmed
// Strike/Opportunity Attack, `starter-behaviors.ts`'s per-creature actions,
// `spell-behaviors.ts`'s 13 curated spells) moves onto instead.
export const STRIKEABLE_NICHE_LOCAL_ID = "niche/strikeable";
export const ATTACK_VERB_NICHE_LOCAL_ID = "niche/attack-verb";
export const MELEE_ATTACK_LOCAL_ID = "attack/melee";
export const RANGED_ATTACK_LOCAL_ID = "attack/ranged";
export const SWING_ATTACK_LOCAL_ID = "attack/melee/swing";
export const MONSTER_DEATH_GRAPH_LOCAL_ID = "attack/monster-death/graph";

function maximumNormalRangeMeters(rangeClass: "melee" | "ranged"): number {
	const ranges = buildWeaponUnits()
		.filter((weapon) => weapon.rangeClass === rangeClass)
		.map((weapon) => weaponAttackRangeFeet(weapon));
	const maximumFeet = Math.max(...ranges);
	if (!Number.isFinite(maximumFeet)) {
		throw new Error(`weapon-attack-units: no ${rangeClass} weapons found in the SRD cache.`);
	}
	return feetToMillimetres(maximumFeet) / 1000;
}

/** Catalog-derived outer bound; the predicate enforces the equipped item's exact reach. */
export const MELEE_ATTACK_RANGE_METERS = (MAX_REACH_MM + STANDARD_REACH_MM) / 1000;
/** Unarmed strikes have no wielded Reach-property contribution. */
export const UNARMED_ATTACK_RANGE_METERS = MAX_REACH_MM / 1000;
/** Catalog-derived outer bound; the predicate enforces the equipped item's exact normal range. */
export const RANGED_ATTACK_RANGE_METERS = maximumNormalRangeMeters("ranged");

export function weaponAttackRangePredicate(rangeClass: "melee" | "ranged"): string {
	if (rangeClass === "melee") {
		return `${WEAPON_SUBJECT}.has_tag('${WEAPON_RANGE_TAG_PREFIX}.melee') && target.stat('core/distance_to_actor_mm') <= actor.effective('srd/reach_mm') + cond(${WEAPON_SUBJECT}.has_tag('${weaponReachPropertyTag()}'), ${STANDARD_REACH_MM}, 0)`;
	}
	return `${WEAPON_SUBJECT}.has_tag('${WEAPON_RANGE_TAG_PREFIX}.${rangeClass}') && target.stat('core/distance_to_actor_mm') <= ${WEAPON_SUBJECT}.source('${WEAPON_ATTACK_RANGE_SLOT_ID}')`;
}

export function opportunityAttackRangePredicate(): string {
	return `target.stat('core/distance_to_actor_mm') <= actor.effective('srd/reach_mm') + cond(${WEAPON_SUBJECT}.has_tag('${weaponReachPropertyTag()}'), ${STANDARD_REACH_MM}, 0)`;
}

// TO-HIT PROFICIENCY — sk-84i.4 (probe sk-84i.1's measured deltas vs open5e:
// wolf −2, zombie −2, bandit −3): this archetype's to-hit previously carried
// ONLY the ability modifier, never a Proficiency Bonus term — every wielder's
// to-hit undersold itself by its own Proficiency Bonus (SRD monsters are
// ALWAYS proficient with their own statted attacks; playing-the-game.md §
// Proficiency). Fixed by threading `proficiencyBonusExpr` through to
// `attackRollExpr`'s existing `circumstantialExpr` hook (the SAME slot
// Equipment Proficiencies' own weapon-proficiency bonus is documented against
// in `attack-roll-units.ts`) — the caller supplies
// `actor.stat('srd/proficiency_bonus')` (`modifier-units.ts`'s
// `PROFICIENCY_BONUS_STATE_ID`, baked per-entity from CR/level;
// `fragments/attacks.ts` is the wired call site).
//
// FINESSE — NOW WIRED (BL-49, 2026-08-13; supersedes sk-84i.4's deferral,
// whose reasoning is preserved below because it still explains the SHAPE
// chosen here). sk-84i.4 left finesse unwired for a stated reason: the
// archetype "has no wielded-item read at all ... so there is no finesse tag
// to gate on today", and the fix should "land together with actual weapon
// identity". BOTH preconditions are now met — natural weapons ship as
// wielded items (`monsters/natural-weapon-units.ts`) and BL-48 gave the
// ranged half the same wielded-item read melee already had.
//
// It evaluated two options: (a) leave the ability-mod selection alone, and
// (b) unconditionally widen it to `max(str_mod, dex_mod)`. (b) was rightly
// REJECTED as a blanket flip: it silently changes live combat odds for every
// combatant on the archetype, INCLUDING the combat-arena proof's own Goblin
// Warriors (STR 8 / DEX 15 — Strength mod −1 today, Dexterity mod +2 under
// (b)), entangled with the live-self-seeding mechanics suite. This slice
// ships neither (a) nor (b) but the WEAPON-GATED variant (c) that sk-84i.4
// itself pointed at: the widening applies ONLY when the wielded item carries
// `srd.weapon.property.finesse`. An actor wielding nothing, or a non-finesse
// weapon, takes the `cond`'s else-branch and computes EXACTLY as before —
// the Goblin Warriors stay at Strength mod −1, byte-identical odds, asserted
// (not assumed) by `weapon-attack-units.test.ts`'s own canary case.
//
// WHY ONE EXPRESSION FOR BOTH HALVES: this is the actual DEFECT BL-49
// reports, not just a missing feature. `meleeDamageDeltaExpr` was ALREADY
// finesse-aware while `meleeAttackRollExpr` was not, so a rogue with a
// rapier added Dexterity to damage while still rolling to hit off Strength —
// the two halves of one attack disagreed. The SRD grants the choice "for the
// attack and damage rolls" (one modifier, both rolls), so both sides now
// consume the SAME `attackAbilityScoreExpr`. Splitting them again in either
// direction is a rules error.
//
// SCORES, NOT MODIFIERS: the gate selects an ability SCORE and lets
// `abilityModifierExpr` convert once, because the ability modifier is
// monotonic in score — `abilityModifierExpr(max(str, dex))` ==
// `max(abilityModifierExpr(str), abilityModifierExpr(dex))` (floor is
// monotonic; sk-84i.4's own note). That lets the to-hit side keep
// `attackRollExpr`'s existing `scoreExpr` seam untouched while the damage
// side stays numerically identical to the `max(strMod, dexMod)` shape it
// shipped before.

/**
 * The shared attack-ability score expression used by both attack halves
 * (BL-49): `cond(actor.equipped_item('srd/slot/main-hand').has_tag('srd.weapon.property.finesse'),
 * max(<base>, <alternate>), <base>)`.
 *
 * `baseScoreExpr` is the archetype's own default ability — Strength for
 * melee, Dexterity for ranged — and `alternateScoreExpr` is the other one.
 * `max` is symmetric, so the same builder serves both archetypes; only the
 * else-branch differs, which is exactly the SRD's "you may use the other
 * one" reading of Finesse.
 *
 * `cond` is lazy (module header), and the else-branch is the bare
 * `baseScoreExpr` — so an actor wielding nothing or a non-finesse weapon is
 * unchanged from the pre-BL-49 formula.
 */
export function attackAbilityScoreExpr(baseScoreExpr: string, alternateScoreExpr: string): string {
	return `cond(${WEAPON_SUBJECT}.has_tag('${weaponFinessePropertyTag()}'), max(${baseScoreExpr}, ${alternateScoreExpr}), ${baseScoreExpr})`;
}

/** Melee to-hit: `attackRollExpr` on the finesse-aware attack ability (Strength unless a Finesse weapon is wielded) + the seeded Proficiency Bonus stat, vs the target's effective AC (`attack-roll-units.ts`'s idiom). */
export function meleeAttackRollExpr(
	strScoreExpr: string,
	dexScoreExpr: string,
	acExpr: string,
	proficiencyBonusExpr: string,
): string {
	return attackRollExpr({
		scoreExpr: attackAbilityScoreExpr(strScoreExpr, dexScoreExpr),
		acExpr,
		circumstantialExpr: proficiencyBonusExpr,
	});
}

/** Ranged to-hit: `attackRollExpr` on the finesse-aware attack ability (Dexterity unless a Finesse weapon is wielded — the SRD's own Dart is a Finesse RANGED weapon) + the seeded Proficiency Bonus stat, vs the target's effective AC. */
export function rangedAttackRollExpr(
	dexScoreExpr: string,
	strScoreExpr: string,
	acExpr: string,
	proficiencyBonusExpr: string,
): string {
	return attackRollExpr({
		scoreExpr: attackAbilityScoreExpr(dexScoreExpr, strScoreExpr),
		acExpr,
		circumstantialExpr: proficiencyBonusExpr,
	});
}

/**
 * Barbarian Rage damage while `srd/condition/raging` (L1–8 band = +2).
 * Inlined (not imported from classes/) to avoid a playing-the-game ↔ classes
 * cycle. Source: classes.md:244 + martial-features-units.ts RAGE_DAMAGE_BONUS_L1_TO_8.
 */
export function rageDamageBonusExpr(): string {
	return "cond(actor.status('srd/condition/raging') == true, 2, 0)";
}

/** Damage types Rage resists while the *target* is raging (classes.md:242). */
const RAGE_RESIST_DAMAGE_TYPES = new Set(["bludgeoning", "piercing", "slashing"] as const);

/**
 * Damage-type routing ladder with Rage B/P/S resistance folded in.
 *
 * Static `damage_resist:<type>` tags remain the general defense ladder
 * (world-author damage-type-routing.md). Rage cannot mint dynamic entity
 * tags from a condition (`collect_entity_tags` is entity + definition only),
 * so B/P/S folds `target.status('srd/condition/raging') == true` into the
 * resist arm — same half-damage integer division as the static ladder.
 * Source: cache/markdown/classes.md:242 (_Damage Resistance_ under Rage).
 */
// pattern: damage-type-routing
// → packages/spellkave-world-author/docs/damage-type-routing.md (+ Rage status fold; docs/authoring-damage.md)
export function routeDamageMagnitudeWithRageResist(amountExpr: string, damageType: string): string {
	if (!RAGE_RESIST_DAMAGE_TYPES.has(damageType as "bludgeoning" | "piercing" | "slashing")) {
		return routeDamageMagnitude(amountExpr, damageType);
	}
	const resist = `target.has_tag('damage_resist:${damageType}') || target.status('srd/condition/raging') == true`;
	return (
		`let dmg = ${amountExpr}; ` +
		`cond(target.has_tag('damage_immune:${damageType}'), 0, ` +
		`cond(${resist}, dmg / 2, ` +
		`cond(target.has_tag('damage_vulnerable:${damageType}'), dmg * 2, dmg)))`
	);
}

/** Rogue Sneak Attack capability — inlined to avoid playing-the-game ↔ classes cycle. */
const SNEAK_ATTACK_CAPABILITY_ID = "srd/class-feature/rogue/sneak-attack";
const SNEAK_ATTACK_DICE_RESOURCE_ID = "srd/rogue/sneak-attack-dice";
/**
 * Legacy expressible-half helper (L12a attempt 1). Prefer the dedicated
 * `srd/attack/sneak-attack` action (`sneak-attack-units.ts`, K-A facts) —
 * folding this into the shared multi-type damage tower hit MF-DSL-EXPECTED-RPAREN.
 * pattern: item-sourced-damage
 */
export function sneakAttackBonusExpr(): string {
	// Keep the expression shallow: nested cond+dice inside damage ladders hits
	// MF-DSL paren limits when folded into the multi-type weapon cond tower.
	const weaponOk = `${WEAPON_SUBJECT}.has_tag('${weaponFinessePropertyTag()}') || ${WEAPON_SUBJECT}.has_tag('${WEAPON_RANGE_TAG_PREFIX}.ranged')`;
	const gate = `actor.has_capability('${SNEAK_ATTACK_CAPABILITY_ID}') && actor.stat('${SNEAK_ATTACK_DICE_RESOURCE_ID}') >= 1 && (${weaponOk})`;
	return `cond(${gate}, 1d6, 0)`;
}

/** Damage delta sourced from the equipped weapon; type routing lives once here. */
export function meleeDamageDeltaExpr(): string {
	const magnitude = damageRollExpr({
		diceExpr: `${WEAPON_SUBJECT}.source('${WEAPON_DAMAGE_SLOT_ID}')`,
		// Strength melee while raging gains Rage Damage (martial L1-4 lane).
		// Sneak Attack expressible half (L12a) stacks as additive damage.
		modifierExpr: rageDamageBonusExpr(),
	});
	const untyped = `0 - (${magnitude})`;
	return [...SRD_DAMAGE_TYPES].reverse().reduce((elseBranch, type) => {
		const routed = `0 - (${routeDamageMagnitudeWithRageResist(magnitude, type)})`;
		return `cond(${WEAPON_SUBJECT}.has_tag('${damageTypeTag(type)}'), ${routed}, ${elseBranch})`;
	}, untyped);
}

/** Ranged weapon damage reads the identical equipped-item slot as melee damage. */
export function rangedDamageDeltaExpr(): string {
	return meleeDamageDeltaExpr();
}

/**
 * The Monster Death guard: `<subject>.has_tag('srd.monster') && <subject>.
 * stat('srd/hp') <= 0` (playing-the-game.md:1217). `subject` defaults to
 * `"target"` (the outcome-graph-edge shape finding #66 found blocked) but
 * MUST be `"actor"` when composing this inside a `ForEachActorInRadius`
 * body predicate (`monsterDeathFrameWrite` below) — the loop rebinds the
 * selected candidate as the `Actor` subject (`for_each_actor_in_radius.rs`'s
 * `per_actor_bindings`), so the guard reads ITS OWN facts, not a separate
 * `Target` binding.
 *
 * MONSTER-ONLY (sk-dms.39, sk-b3m correction): the SRD reserves instant
 * death at 0 HP for monsters — a character instead falls Unconscious and
 * makes Death Saving Throws (:1229-1247, not yet shipped, sk-b3m). Before
 * this guard carried no such split at all (`actor.stat(hp) <= 0` alone),
 * which killed a player character outright on the SAME rule. `MONSTER_TAG`
 * (`creature-type-units.ts`'s own doc comment has the full grounding,
 * including the SRD's own per-creature escape hatch this omission
 * expresses) is the DSL-readable fact this split needed and did not have.
 *
 * VERIFIED, not assumed (sk-dms.39): `has_tag` on the `ForEachActorInRadius`
 * rebound `actor` subject reads that SAME candidate's own tags, the
 * identical seam `actor.stat(...)` above already reads through —
 * `for_each_actor_in_radius.rs`'s per-candidate predicate eval calls
 * `build_actor_subject_facts(ctx, &actor_ref, &actor_ref)` with THIS
 * candidate's own `entity:{actor_id}` ref (not the parent frame's actor),
 * which folds `collect_entity_tags(ctx, eid)` for that same `eid` into the
 * `Actor`-subject tag pool (`entity_facts.rs`'s `collect_spatial_inputs` /
 * `manipulation_facts`) — the SAME `eid` resolution `actor_int_facts` (the
 * stat read) uses. Traced at the source, not live-reproduced (content-lane
 * session, no server/crates changes in scope).
 *
 * HAS_TAG FIRST (sk-awlo, 2026-08-23 flake fix): `&&` is evaluated
 * left-to-right and each operand is short-circuited on the first `false`
 * (`crates/spellkave-dsl/src/eval.rs`'s `Op::And` — a plain left-to-right
 * loop returning `false` immediately, never evaluating later operands), but
 * an evaluation ERROR is NOT swallowed by short-circuiting — the original
 * `stat(...) <= 0 && has_tag(...)` order read `srd/hp` on EVERY
 * `ForEachActorInRadius` candidate FIRST, including ones with no `srd/hp`
 * resource bound at all (e.g. `srd_proof/dummy_1`, a training dummy
 * authored with zero resource bounds, `fixtures/proofs/playing-the-game-
 * identity/checks/training-dummies.toml`). Any such candidate co-located
 * with an attack's target (radius-0 `core/area/node_ball`) threw
 * `UnknownField`. Before sk-pgsm that aborted the WHOLE consequence
 * dispatch (D-5 loud eval), rolling back even the attack's own legitimate
 * `ModifyResource` HP write on the actual target. Live-reproduced
 * (`proof-scene.test.ts`'s Unarmed Strike test, intermittent because whether
 * the dummy lands inside a given radius scan at all is itself
 * timing-dependent — SQL evidence: `evaluation_provenance` row
 * `r_manipulate:26:74`, `write_failure`, `"ForEachActorInRadius:
 * predicate_source eval failed for actor 5: UnknownField { subject: Actor,
 * field_id: "srd/hp" }"`, actor 5 = "Srd Proof Training Dummy 1"). The
 * kernel now skips that unevaluable bystander with a per-candidate
 * provenance row (sk-pgsm) instead of aborting the batch. Swapping to
 * `has_tag(...) && stat(...) <= 0` still makes the untagged, HP-less dummy
 * short-circuit on `has_tag` (always a defined, never-throwing set-membership
 * read) BEFORE the `srd/hp` read is ever attempted — semantically identical
 * final boolean, still the authoring rule (membership before measurement).
 * This guard has exactly one call site (`monsterDeathFrameWrite` below,
 * always `subject: "actor"`).
 */
export function monsterDeathGuardExpr(
	hpResourceId: string,
	subject: "target" | "actor" = "target",
): string {
	return `${subject}.has_tag('${MONSTER_TAG}') && ${subject}.stat('${hpResourceId}') <= 0`;
}

/**
 * WIRED (third attempt, combat-arena proof Slice C, 2026-07-31 correction):
 * the bare `outcome_graphs`/`outcome_graph_nodes` atomic-authoring route
 * finding #66 confirmed blocked (`ledger/findings.md`) is not
 * the only substrate shape for a guarded ApplyStatus. `ForEachActorInRadius`
 * (the `aoe-damage-spell` worked example's own primitive, `packages/
 * spellkave-world-author/docs/examples/aoe-damage-spell.md`) carries its OWN
 * per-actor `predicate_source` gate over a nested `body` — both fields land
 * in ONE `consequence_frame_writes` row authored through the SAME
 * `spellkave_define_action_verb`/`spellkave_define_consequence` call the
 * ordinal-0 damage write already uses, so no second call and no atomicity
 * gap. `center_ref: "TargetSpatialRef"` + `shape_id: "core/area/node_ball"`
 * (the CORRECT, FULLY-QUALIFIED kernel-genesis id — finding #67:
 * a second attempt's bare `"node_ball"` never actually validated;
 * `server/src/spatial/vocabulary.rs`'s `is_known_area_shape_id` gate — the
 * FIRST check `ForEachActorInRadius` runs — only accepts the closed,
 * `core/area/`-prefixed `KNOWN_AREA_SHAPE_IDS` five, no bare form; live-
 * reproduced as `write_failure: "unknown area_shape_definition 'node_ball'"`,
 * rolling back the WHOLE hit including its damage. `is_known_area_shape_id`
 * checks a closed Rust constant, never an authored `area_shape_definitions`
 * row — kernel-genesis vocabulary, the SAME class this package's own
 * `self-sufficiency.test.ts` already exempts for substrate/coordinate-kind
 * ids; that test carries a narrow, explicit carve-out for exactly these 5
 * strings per the operator's 2026-07-31 ruling, `ledger/archive/general-decisions.md`) +
 * `ball_radius: 0` selects every actor CO-LOCATED with the struck target's
 * own post-damage position; the guard predicate (`monsterDeathGuardExpr
 * (hpResourceId, "actor")`) then reads each selected candidate's OWN,
 * already-committed HP (ordinal 1 runs after ordinal 0's `ModifyResource`
 * commits — the same sequential-commit idiom `attack-melee.toml`'s retired
 * ordinals 1-3 and this package's own `damage-healing-misc-units.ts` module
 * header both document), so a hit that drops the target to 0 fires
 * `ApplyStatus(Actor, srd/condition/dead)`.
 *
 * CAVEAT, inherited on purpose (not a new gap): `node_ball` radius 0 selects
 * every co-located actor, not "the struck target alone" — the EXACT
 * contamination class `world-fixtures/srd/base/attack-melee.toml`'s own
 * module header records (#1968 A3) as why the sister retired this shape for
 * its OWN richer dying/death-save split. This proof's guard only ever kills
 * a candidate whose OWN hp is <= 0, so a live ally sharing the target's cell
 * is unaffected — the exposure is narrower: an ALREADY-0-HP bystander on the
 * same cell (e.g. two monsters both dropped to 0 in the same frame's
 * gather) would ALSO receive `srd/condition/dead` from this write, which is
 * not itself wrong (a 0-HP monster dies per Monster Death regardless of
 * which hit read its HP) but is a coincidence of the mechanism, not an
 * authored per-target selector. Recorded in `ledger/findings.md`
 * finding #66's addendum and `ledger/designs/combat-arena-proof.md`.
 *
 * RENAMED (sk-dms.39, sk-b3m): this was `lethalToDeadFrameWrite` —
 * "lethal" is not an SRD term, this package invented it, and the generic
 * name is what let a one-of-four-templates implementation (only
 * `srd/attack/melee`/`srd/attack/ranged` ever called it) look finished.
 * Named for what it actually does: Monster Death (playing-the-game.md:1217).
 */
export function monsterDeathFrameWrite(
	hpResourceId: string,
	deadConditionId: string,
): Record<string, unknown> {
	return {
		ForEachActorInRadius: {
			center_ref: "TargetSpatialRef",
			shape_id: "core/area/node_ball",
			shape_params_json: '{"ball_radius": 0}',
			predicate_source: monsterDeathGuardExpr(hpResourceId, "actor"),
			body: [
				{
					ApplyStatus: {
						target_kind: "entity",
						target_ref: "Actor",
						condition_definition_id: deadConditionId,
					},
				},
			],
		},
	};
}

/**
 * sk-jay0.1.8.63.40: a missed attack used to leave the TARGET perceiving
 * nothing — every `/miss` consequence across this package authored
 * `frame_writes: []` (a miss changes no resource, so
 * `visible_event_resource_delta` has nothing to report — `fragments/
 * attacks.ts`'s own module header), and no comparable trace existed either.
 * A miss now leaves a perceivable TRACE, the exact shape speech already
 * uses (`fragments/speech.ts`'s `speechInscribeFrameWrite`, the
 * directed-speech-anchor pattern). The trace kind is defined ONCE
 * (`attackMissTraceKindDefinitionCall`, called from `fragments/attacks.ts`
 * alongside the four generic attack templates); every other `/miss`
 * consequence in this package (weapon-mastery-riders, Sneak Attack, Flurry
 * of Blows, attack-roll spells) only references the id through
 * `attackMissInscribeFrameWrite` below and never redefines the kind.
 *
 * ANCHOR: `TargetSpatialRef` — the addressee's OWN current place, never
 * `TargetEntityRef` (sk-oj6: an entity anchor glues the row to a person and
 * it travels with them everywhere they later stand). This is `srd/speak-to`'s
 * exact anchor choice. `carry_addressee` is unconditional here (unlike
 * speech's per-chain toggle): every consequence that calls this helper
 * always names a real entity target — the one authored exception,
 * `srd/attack/melee/swing`, has no `/miss` consequence at all (a target-free
 * resolution, D9) and never reaches this helper.
 *
 * NO `carry_dispatch_text`: nothing here is a dispatched utterance. `label`
 * is a fixed AUTHORED string baked into the payload at generation time (the
 * missed attack's own display name plus its verb, e.g. "Ranged Attack
 * misses") — never a raw action/consequence id reaching player prose, and
 * never anything the dispatch itself supplied. `@spellkave/world-events`'s
 * `TraceAddressedEvent.label` reads exactly this key to render the line.
 *
 * The ATTACKER's own act result already says hit or miss
 * (`@spellkave/world-events`'s `renderActResultLine`) — this trace is for
 * the TARGET, and any bystander co-located with them, only. The attacker
 * never gets a duplicate line from their own inscription: the builder skips
 * a trace whose `inscribed_by` is the current actor's own id
 * (`@spellkave/sdk`'s `world-events/builder.ts`, the same rule
 * `speech_heard` already applies, sk-dms.17).
 */
export const ATTACK_MISS_TRACE_KIND_ID = `${BUNDLE_ID}/attack-miss`;

const ATTACK_MISS_SCHEMA_JSON = '{"label":"string","addressee":"integer?"}';

export function attackMissTraceKindDefinitionCall(): VerbCall {
	return {
		toolName: "spellkave_define_trace_kind",
		label: "trace-kind:attack-miss",
		params: {
			bundle: BUNDLE_ID,
			id: "attack-miss",
			// place_node ONLY, same scope as srd/speech — the anchor says WHERE
			// (the target's place), the payload says WHAT missed.
			location_kinds: "place_node",
			schema_json: ATTACK_MISS_SCHEMA_JSON,
			// An event, not a mark (trace-perceptibility-window.md): a miss is
			// perceptible only as it happens, never found on arrival.
			perceptible_for_ticks: 0,
			description:
				"An attack that missed, inscribed at the TARGET's own current place (TargetSpatialRef, " +
				"never the target's entity — sk-oj6). Local visibility: free perception for anyone " +
				"co-located with the target falls out for free, same as srd/speech. Carries a fixed " +
				"authored 'label' string (the missed attack's display name + verb, e.g. 'Ranged Attack " +
				"misses') and the target's entity id under 'addressee' (carry_addressee) — never a raw " +
				"action/consequence id.",
		},
	};
}

/** `label` should read as a full verb phrase (e.g. "Ranged Attack misses") —
 * the renderer (`@spellkave/world-events`'s `renderWorldEventLine`) only
 * ever concatenates `"{attacker}'s {label} {target}."`; it stays
 * setting-neutral by construction and never bakes the word "misses" itself,
 * so the phrase is this helper's callers' responsibility. */
export function attackMissInscribeFrameWrite(label: string): Record<string, unknown> {
	return {
		Inscribe: {
			kind: ATTACK_MISS_TRACE_KIND_ID,
			location_kind: "binding",
			location_ref: "TargetSpatialRef",
			payload_json: JSON.stringify({ label }),
			carry_dispatch_text: false,
			carry_addressee: true,
		},
	};
}
