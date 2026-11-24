// DOC-IMPL: derived-values#where-macros-are-illegal
// Chapter unit: "Level Advancement" (`character-creation.md:649-810`) — slice
// C4, the chapter's FIRST behavior slice (`ledger/character-creation.md`'s C4
// row; scope contract: `ledger/designs/character-advancement.md`, read FULLY
// before touching this file). Four building blocks, per that design's
// Proposal:
//
//   1. `srd/xp` — a real, persistent int resource (Q2 DECIDED: XP is modeled
//      for real, diverging deliberately from the sister's milestone-first
//      #1812 stance — the operator named XP as a wanted consumer today).
//   2. `srd/xp_threshold` — a DSL macro encoding the 20-row Character
//      Advancement table's Level->XP column (`:657`), the SAME "table becomes
//      a macro when it has an in-world reader" shape `srd/proficiency_bonus`
//      already established. Built PROGRAMMATICALLY from
//      `readCharacterAdvancementTable()` (`../../markdown/character-
//      creation.ts`) — never hand-typed — because the XP column has no
//      closed-form reduction (unlike PB's `2 + (level-1)/4`): the body is
//      necessarily a 19-deep `cond` ladder.
//   3. ONE `srd/advancement/level-up` action, re-invocable across the whole
//      level range (never one row per level — this chapter's "treat
//      combinatorial row growth as a design smell" maxim). Gate:
//      `actor.stat('srd/xp') >= macro('srd/xp_threshold', actor.stat('srd/level') + 1)
//      && actor.stat('srd/level') < 20` — the explicit `< 20` term is an
//      OPERATOR DECISION (2026-07-31 addendum): never rely on the
//      `srd/level` resource's own `max_value = 20` clamp alone, since a
//      clamped write still "succeeds" with a silent zero `applied_delta` —
//      a confusing player-seat experience the explicit predicate avoids by
//      making the affordance simply unavailable at level 20.
//
//      TARGETING (actor-carried-verbs D2(c), operator ruling 2026-08-13):
//      "Aldwin affords advancement" — level-up is no longer `self_only`;
//      like `srd/claim-victory` (targets the corpse, Building Block 5
//      below), it TARGETS an external entity — any entity tagged
//      `srd.advancement_trainer` (`ADVANCEMENT_TRAINER_TAG`, a NEW
//      entity-provided niche this file ships alongside the action,
//      mirroring `CREATURE_NICHE_TAG`'s shape: the tag is pushed verbatim
//      into a candidate's derived niche set, the row's `provider = "entity"`
//      column is the whole fix, its predicate stays trivial). The GATE
//      predicate stays purely actor-shaped (XP/level, unaffected); the
//      TARGET is an argument (which trainer this creature levels up with),
//      never a precondition beyond "is a trainer".
//   4. HP growth reads an actor-carried `srd/hp_per_level` fact
//      (`actor.stat('srd/hp_per_level')` — NOT `target.stat`, since D2(c)
//      above makes `target` the TRAINER now: the acting creature's own HP
//      grows, never the trainer's) rather than a hardcoded literal
//      (the sister's `advancement.toml:349` anti-pattern, a scene-owned
//      literal applied to an entity-shaped fact — this chapter's CLAUDE.md
//      design maxims warn against exactly this). The Fixed HP by Class table
//      (`:779`) is per-class, i.e. Classes-chapter progression data
//      (`ledger/character-creation.md`'s "C4 scope boundary" ruling); C4
//      ships ONLY the generic reader (the resource identity + the delta_source
//      read) — the Classes chapter is the future writer of real per-class
//      values. Until then, C4's OWN proof scene seeds a plain, honest literal
//      directly on its proof actor (`proof-scene/calls/identity.ts`) — the
//      Fighter row's FLAT number (`fixedHitPointsPerLevelForClass("Fighter")`,
//      `:779`), WITHOUT the "+ Con. modifier" term: composing a per-actor
//      Constitution modifier into this single flat fact is a per-class
//      computation deliberately left to the Classes chapter's own
//      `hp_per_level` authoring (K2+) — an honest, named simplification, not
//      a silent one.
//
// Q4 (fixed vs. rolled HP on level-up, DECIDED by the operator per this
// brief): FIXED value ships as the authored default; rolled HP
// (`max(1, 1d<die> + <con-mod-idiom>)`, already fully supported by
// `ModifyResource.delta_source`'s dice-literal evaluation, Investigation 1)
// is a FUTURE stochastic variant, not built here.
//
// One real substrate constraint surfaced by the design's own Investigation 1,
// inert for this slice but recorded as a finding candidate (see
// the design doc): `ModifyResource.delta_source` evaluates via the
// non-macro-aware `parse_int_authoring` — a literal `macro(...)` call INSIDE
// a resource delta fails closed (`MF-DSL-MACRO-UNKNOWN`). Building Block 4's
// HP delta needs only a plain field read (`target.stat(...)`), never a macro
// call, so the constraint never bites THIS action.
//
// Building Block 5 (level-up DM arc, S1 — `ledger/designs/level-up-dm-arc-
// plan.md` §5): `srd/xp_value` + `srd/claim-victory`, the XP SOURCE this
// module's own header used to flag as missing. `srd/xp_value` is an
// actor-carried fact (same "identity/reader-only" posture as Building Block
// 4's `srd/hp_per_level`: a real per-creature mechanic — SRD: "The number of
// Experience Points (XP) a monster is worth is based on its CR"
// (monsters.md:203-209, the Experience Points by Challenge Rating table) —
// seeded on every `srd/creature/<slug>` blueprint from the CR→XP table
// (`creature-units.ts`, BL-55). `srd/claim-victory` is the
// affordance a killer acts on to collect it: gated on the target already
// carrying `srd/condition/dead` (Monster Death, `monsterDeathFrameWrite`)
// AND an unclaimed `srd/xp_value` (>= 1); its own consequence zeroes the
// target's `srd/xp_value` in the SAME dispatch (the sister's own "set a
// resource to an exact value" idiom, `target.stat(...)` subtracted from
// itself — `world-fixtures/srd/base/death-saves.toml:140`) so the affordance
// is an exactly-once latch, never a hand-rolled "claimed" flag. The XP GRANT
// itself no longer lives here: Aldwin awards the corpse's `srd/xp_value` at
// kill time (sk-0m4.27). Claim Victory stays as a flourish that only zeros
// the latch. The retired hardcoded `300` literal is gone — a second XP write
// here would double-pay whenever both paths run.
import type { AuthorTarget } from "@spellkave/tool-authoring";
import { readResourceFlavor } from "../../flavor/read";
import { readCharacterAdvancementTable } from "../../markdown/character-creation";
import { markdownHeadingBlock, srdTextAttachmentWriteCall, withSrdTextNamespace } from "../../text";
import type { ChapterUnitSummary } from "../chapter-types";
import { PRIMARY_CHANNEL_ID } from "../playing-the-game/action-economy-units";
import { MELEE_REACH_METERS } from "../playing-the-game/combat-misc-units";
import { CREATURE_NICHE_TAG } from "../playing-the-game/creature-type-units";
import { DEAD_CONDITION_ID } from "../playing-the-game/fragments/conditions";
import { HP_ID } from "../playing-the-game/hp-units";
import { LEVEL_ID } from "../playing-the-game/level-units";
import { ADVANCEMENT_TRAINER_TAG } from "../playing-the-game/tag-value-vocabulary";
import { driveUnitScene, type VerbCall } from "../verb-runner";

/**
 * actor-carried-verbs D2(c) (operator ruling 2026-08-13): "Aldwin affords
 * advancement" — any entity a scene tags `srd.advancement_trainer` offers
 * `srd/advancement/level-up` to a co-located, in-range, eligible actor.
 * Entity-provided (`provider = "entity"`, the `niche:advancement-trainer`
 * `spellkave_write_rows` call below), mirroring `CREATURE_NICHE_TAG`'s own
 * shape exactly: a candidate's `srd.advancement_trainer` tag — definition
 * or instance (`entity_tag`, BL-56 / #2227) — is pushed verbatim into its
 * derived target-niche set (`derive_entity_target_niches_from_parts`, no
 * niche_definitions predicate consulted for THAT) — this
 * row's job is the `provider` COLUMN, read by `resolve_niche_provider_flags`,
 * never its (deliberately trivial) predicate. No place attachment needed
 * anywhere a trainer stands.
 *
 * Vocabulary membership (`tag_value_definitions`) lives in the shared catalog
 * (`playing-the-game/tag-value-vocabulary.ts`, sk-0f5) — this chapter still
 * owns the niche that affords level-up.
 */
export { ADVANCEMENT_TRAINER_TAG };

const BUNDLE_ID = "srd";

const CHARACTER_ADVANCEMENT_ANCHOR = "character-creation.md:657-767 (§ Level Advancement)";
const GAINING_A_LEVEL_ANCHOR = "character-creation.md:769-810 (§ Gaining a Level)";
const FIXED_HP_ANCHOR =
	"character-creation.md:779-804 (§ Gaining a Level > Fixed Hit Points by Class)";

// --- Building Block 1: srd/xp -----------------------------------------------

export const XP_ID = "xp";
export const XP_DISPLAY_NAME = "Experience Points";
export const MIN_XP = 0;
export const INITIAL_XP = 0;
/**
 * Safety-bound ceiling, not a real per-creature maximum (the `srd/hp`/
 * `srd/level` precedent, `hp-units.ts`'s own header, adopted verbatim
 * reasoning): the Character Advancement table's highest threshold is
 * 355,000 XP (level 20, `:748`); 999,999 comfortably exceeds it with
 * headroom for an operator to grant XP past the table's own ceiling without
 * an immediate clamp surprise, while staying `i64`-safe
 * (`apply_resource_delta`'s `i64::clamp`, `modify_resource.rs:98-104`).
 */
export const MAX_XP = 999_999;
export const XP_RECOVERY_RULE = "persistent";

// --- Building Block 4 (reader half): srd/hp_per_level -----------------------

export const HP_PER_LEVEL_ID = "hp_per_level";
export const HP_PER_LEVEL_DISPLAY_NAME = "Hit Points Gained per Level";
export const MIN_HP_PER_LEVEL = 0;
/**
 * Safety-bound ceiling: the highest Fixed HP by Class flat number is 7
 * (Barbarian, `:788`); even the most generous plausible Constitution modifier
 * a future per-class writer might add leaves enormous headroom under 100 —
 * the same "bound generously, never model a real maximum" posture `srd/hp`
 * and `srd/xp` already use.
 */
export const MAX_HP_PER_LEVEL = 100;
export const INITIAL_HP_PER_LEVEL = 0;
export const HP_PER_LEVEL_RECOVERY_RULE = "persistent";

// --- Building Block 2: srd/xp_threshold -------------------------------------

export const XP_THRESHOLD_MACRO_ID = `${BUNDLE_ID}/xp_threshold`;

/**
 * Build the `srd/xp_threshold` macro body PROGRAMMATICALLY from the parsed
 * Character Advancement table (`readCharacterAdvancementTable()`) — never
 * hand-typed numbers. Unlike `srd/proficiency_bonus` (a closed-form formula,
 * `2 + (level_or_cr - 1) / 4`), the XP column has no such reduction: the
 * result is a 19-deep `cond` ladder, `level <= 1` clamped to 0 (level 1's own
 * threshold), levels 2..19 an explicit `cond(level == N, xp, ...)` rung each,
 * and level 20's XP (355,000) as the final `else` — which a stray future
 * caller passing `level > 20` would silently reuse (flagged as an authoring-
 * hygiene note in the design doc, not a blocker: THIS slice's only caller,
 * the level-up predicate, never reaches it because of the predicate's own
 * `< 20` term). Sanity-checked against the DSL's evaluation ceilings
 * (`crates/spellkave-dsl/src/eval.rs`'s `DslEvaluationLimits::default()` =
 * `max_depth: 64, max_nodes: 512`): depth ~19, node count in the low
 * hundreds — well under both.
 */
export function xpThresholdMacroBodySource(): string {
	return xpThresholdLadderSource("level");
}

/**
 * The shared ladder builder, parameterized over the level expression. Today
 * its one caller is the macro body (`levelExpr = "level"`); the
 * parameterization survives from the finding-#82 investigation (an inline
 * gate expansion briefly shipped while a wrong hypothesis was live-tested —
 * see the finding's retraction trail) and stays because it costs nothing and
 * keeps the builder reusable for future inline consumers.
 */
export function xpThresholdLadderSource(levelExpr: string): string {
	const rows = [...readCharacterAdvancementTable()].sort((a, b) => a.level - b.level);
	if (rows.length !== 20 || rows[0]?.level !== 1 || rows.at(-1)?.level !== 20) {
		throw new Error(
			`advancement-units: expected the Character Advancement table to run 1..20 in order, got ` +
				`levels ${JSON.stringify(rows.map((r) => r.level))}.`,
		);
	}
	const highest = rows.at(-1);
	if (highest === undefined) throw new Error("unreachable: rows.length === 20 above");
	let expr = String(highest.xp);
	for (let i = rows.length - 2; i >= 1; i -= 1) {
		const row = rows[i];
		if (row === undefined)
			throw new Error(`unreachable: index ${i} within rows.length ${rows.length}`);
		expr = `cond(${levelExpr} == ${row.level}, ${row.xp}, ${expr})`;
	}
	return `cond(${levelExpr} <= 1, 0, ${expr})`;
}

/**
 * TS-side mirror of the macro's own lookup semantics — the SAME source table,
 * read fresh each call (never a second literal copy) — used by the proof
 * scene and the live self-seeding test to compute an exact XP grant without
 * hand-typing a threshold number. Mirrors the macro's fall-through behavior
 * for `level > 20` (reuses the level-20 threshold) and `level <= 1` (0),
 * documented as an authoring-hygiene note in the design doc, not exercised by
 * the shipped level-up predicate itself.
 */
export function xpThresholdForLevel(level: number): number {
	if (level <= 1) return 0;
	const rows = readCharacterAdvancementTable();
	const row = rows.find((candidate) => candidate.level === level);
	if (row !== undefined) return row.xp;
	const highest = rows.reduce((max, candidate) => (candidate.level > max.level ? candidate : max));
	return highest.xp;
}

// --- Building Block 3: srd/advancement/level-up -----------------------------

export const LEVEL_UP_ACTION_ID = `${BUNDLE_ID}/advancement/level-up`;
export const LEVEL_UP_CAPABILITY_ID = `${BUNDLE_ID}/action/advancement/level-up`;

/**
 * The gate predicate (design doc Proposal §3, Investigation 2 confirms the
 * shape is legal — macros ARE expanded for gate predicates at act time with
 * live definitions, `r_manipulate/mod.rs:632-641`, and a macro argument may
 * be an arbitrary typed expression, not just a literal). The explicit
 * `actor.stat('srd/level') < 20` term is an OPERATOR DECISION (open decision
 * 4 in the design doc): never rely on `srd/level`'s own `max_value = 20`
 * clamp alone.
 */
export function levelUpGatePredicateSource(): string {
	// Finding #82: NOT `macro('srd/xp_threshold', …)` — affordance
	// gate predicates never macro-expand at act time (the affordance silently
	// drops out of the candidate set), so the gate inlines the same generated
	// ladder the macro carries. `xpThresholdLadderSource` is the ONE builder
	// for both; the offline test pins their equivalence.
	// Macro-call form — live-verified (2026-07-31 C4 lead debug session):
	// authored affordance gate predicates ARE macro-expanded at manifest
	// COMMIT time (`server/src/manifest/affordance.rs`'s
	// `template_predicate_and_locality_with_macros`, called from `commit.rs`
	// with the manifest's macro definitions), so `macro('srd/xp_threshold',…)`
	// is legal here — finding #82 records the full investigation
	// trail, including the retracted first hypothesis.
	return (
		`actor.stat('${BUNDLE_ID}/${XP_ID}') >= macro('${XP_THRESHOLD_MACRO_ID}', actor.stat('${BUNDLE_ID}/${LEVEL_ID}') + 1)` +
		` && actor.stat('${BUNDLE_ID}/${LEVEL_ID}') < 20`
	);
}

/**
 * Class and level pairs whose `srd.advancement.<class>.<level>` tag the level-up
 * sets: every class to level 5, the adventure band. Levels 6-20 are bead sk-jay0.1.55.46.
 */
const ALL_CLASS_SLUGS = [
	"barbarian",
	"bard",
	"cleric",
	"druid",
	"fighter",
	"monk",
	"paladin",
	"ranger",
	"rogue",
	"sorcerer",
	"warlock",
	"wizard",
] as const;
const LEVEL_UP_CLASS_TAG_RUNGS: ReadonlyArray<{ level: number; classes: readonly string[] }> = [
	{ level: 2, classes: ALL_CLASS_SLUGS },
	{ level: 3, classes: ALL_CLASS_SLUGS },
	{ level: 4, classes: ALL_CLASS_SLUGS },
	{ level: 5, classes: ALL_CLASS_SLUGS },
];

// pattern: identity-tag-capability-grant
/**
 * Set the class-level tag before the level bump, because the predicate reads the
 * pre-level `srd/level`. A ball of radius 0 is the DSL's class-gated write here,
 * so it also matches a co-located hero of the same class and level with enough XP.
 * That hero gets the tag early; its own level-up sets the same tag again.
 */
function levelUpClassTagFrameWrites(): Record<string, unknown>[] {
	const xpForLevel = new Map(readCharacterAdvancementTable().map((row) => [row.level, row.xp]));
	return LEVEL_UP_CLASS_TAG_RUNGS.flatMap(({ level, classes }) =>
		classes.map((slug) => ({
			ForEachActorInRadius: {
				center_ref: "ActorSpatialRef",
				predicate_source: `actor.has_tag('srd.class.${slug}') && actor.stat('${BUNDLE_ID}/${LEVEL_ID}') == ${level - 1} && actor.stat('${BUNDLE_ID}/${XP_ID}') >= ${xpForLevel.get(level)}`,
				shape_id: "core/area/node_ball",
				shape_params_json: '{"ball_radius":0}',
				body: [
					{
						SetEntityTag: {
							entity: "Actor",
							present: true,
							tag: { allowed_ids: [`srd.advancement.${slug}.${level}`] },
						},
					},
				],
			},
		})),
	);
}

// --- Building Block 5: srd/xp_value + srd/claim-victory ---------------------

export const XP_VALUE_ID = "xp_value";
export const XP_VALUE_DISPLAY_NAME = "Experience Point Value";
export const MIN_XP_VALUE = 0;
export const INITIAL_XP_VALUE = 0;
/** Reuses `srd/xp`'s own safety-bound ceiling (module header: i64-safe,
 * generous headroom past the Experience Points by Challenge Rating table's
 * own highest rung, 155,000 at CR 30, monsters.md:320-321). */
export const MAX_XP_VALUE = MAX_XP;
export const XP_VALUE_RECOVERY_RULE = "persistent";

export const EXPERIENCE_POINTS_BY_CR_ANCHOR =
	"monsters.md:203-209 (§ Challenge Rating > Experience Points, Experience Points by Challenge Rating table)";

export const CLAIM_VICTORY_ACTION_ID = `${BUNDLE_ID}/claim-victory`;
export const CLAIM_VICTORY_CAPABILITY_ID = `${BUNDLE_ID}/action/claim-victory`;

/**
 * The claim-victory OFFER gate: the target must already be a corpse
 * (`srd/condition/dead`, applied by a killing strike's own
 * `monsterDeathFrameWrite`) AND still carry an unclaimed `srd/xp_value` — the
 * SAME per-candidate-target read shape the shipped Melee/Ranged Attack OFFER
 * predicates already use for `target.stat('srd/ac')` (`fragments/
 * attacks.ts`'s `strikeablePredicateSource`), applied here to a different
 * pair of facts.
 */
export function claimVictoryGatePredicateSource(): string {
	return (
		`target.status('${DEAD_CONDITION_ID}') == true` +
		` && target.stat('${BUNDLE_ID}/${XP_VALUE_ID}') >= 1`
	);
}

/**
 * Author the C4 fragment: `srd/xp` + `srd/hp_per_level` resource identities,
 * the `srd/xp_threshold` macro, and the ONE `srd/advancement/level-up`
 * action — all in ONE `driveUnitScene` workspace so the macro (authored
 * first, via `spellkave_write_rows`) is resolvable when the action verb's
 * gate predicate references it (`onlyDslMacroDefinitionIds` keeps ONLY this
 * scene's own macro in the emitted fragment, dropping the automatically
 * seeded central catalog's 5 macros). `target` threads the ALREADY-COMMITTED
 * `fixtures/` bundle through so the action's references to `srd/level` /
 * `srd/hp` (playing-the-game's rows, not authored in THIS workspace) resolve
 * — the same mechanism `playing-the-game/fragments/attacks.ts` uses for its
 * own cross-fragment `srd/hp` write.
 */
export async function buildAdvancementFragment(
	target?: AuthorTarget,
): Promise<{ toml: string; units: ChapterUnitSummary[] }> {
	const calls: VerbCall[] = [
		{
			toolName: "spellkave_write_rows",
			label: "dsl-macro:xp-threshold",
			params: {
				bundle: BUNDLE_ID,
				kind: "dsl_macro_definitions",
				rows: [
					{
						macro_id: XP_THRESHOLD_MACRO_ID,
						bundle_id: BUNDLE_ID,
						return_type: "Int",
						parameters: [{ name: "level", value_type: "Int" }],
						body_source: xpThresholdMacroBodySource(),
						description:
							'SRD: "The Character Advancement table lists the XP you need to advance to a level ' +
							"... When your XP total equals or exceeds a number in the Experience Points column, " +
							`you reach the corresponding level." (${CHARACTER_ADVANCEMENT_ANCHOR}) Encodes the ` +
							"table's Level -> XP column as a 19-deep cond ladder (no closed-form reduction " +
							"exists, unlike srd/proficiency_bonus); level <= 1 clamps to 0.",
					},
				],
			},
		},
		{
			toolName: "spellkave_define_resource",
			label: `resource:${XP_ID}`,
			params: {
				id: XP_ID,
				display_name: XP_DISPLAY_NAME,
				min_value: MIN_XP,
				max_value: MAX_XP,
				initial_value: INITIAL_XP,
				recovery_rule: XP_RECOVERY_RULE,
				description: readResourceFlavor("xp").body,
				tags: [],
			},
		},
		{
			toolName: "spellkave_define_resource",
			label: `resource:${HP_PER_LEVEL_ID}`,
			params: {
				id: HP_PER_LEVEL_ID,
				display_name: HP_PER_LEVEL_DISPLAY_NAME,
				min_value: MIN_HP_PER_LEVEL,
				max_value: MAX_HP_PER_LEVEL,
				initial_value: INITIAL_HP_PER_LEVEL,
				recovery_rule: HP_PER_LEVEL_RECOVERY_RULE,
				description: readResourceFlavor("hp-per-level").body,
				tags: [],
			},
		},
		{
			toolName: "spellkave_define_capability",
			label: "capability:advancement-level-up",
			params: {
				bundle: BUNDLE_ID,
				id: "action/advancement/level-up",
				actor_kind: "entity",
				display_name: "Level Up",
				description:
					"Allows the acting creature to advance one character level once its XP total reaches " +
					`the Character Advancement table's next threshold. SRD: ${GAINING_A_LEVEL_ANCHOR}.`,
				tags: ["srd.action"],
			},
		},
		// actor-carried-verbs D2(c) (operator ruling 2026-08-13): the
		// entity-provided trainer niche — see `ADVANCEMENT_TRAINER_TAG`'s own
		// doc comment above for the full mechanism. Authored BEFORE the action
		// verb call below in the SAME workspace (niche_id is not
		// existence-checked, but this ordering matches `fragments/attacks.ts`'s
		// own `niche:attack-verb` precedent for readability).
		{
			toolName: "spellkave_write_rows",
			label: "niche:advancement-trainer",
			params: {
				bundle: BUNDLE_ID,
				kind: "niche_definitions",
				rows: [
					{
						niche_id: ADVANCEMENT_TRAINER_TAG,
						bundle_id: BUNDLE_ID,
						display_name: "Advancement Trainer (entity-provided)",
						description:
							"actor-carried-verbs D2(c): a grounded entity affords srd/advancement/level-up " +
							"via its own srd.advancement_trainer entity_definition_tag — no place attachment, " +
							"no per-target predicate. The elven-mini adventure tags Aldwin with it " +
							"(author/elven-mini/dm-npc.ts).",
						predicate_source: "",
						provider: "entity",
					},
				],
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: "action:advancement-level-up",
			params: {
				bundle: BUNDLE_ID,
				id: "advancement/level-up",
				required_capability: LEVEL_UP_CAPABILITY_ID,
				// D2(c): targets a co-located trainer entity now, not the actor
				// itself — see ADVANCEMENT_TRAINER_TAG's own doc comment.
				niche_id: ADVANCEMENT_TRAINER_TAG,
				display_name: "Level Up",
				description:
					"Advance one character level with a nearby trainer: srd/level +1, srd/hp grows by the " +
					"acting creature's own srd/hp_per_level fact (Building Block 4 — Constitution-modifier " +
					"composition is the Classes chapter's job). Sets the class-level tag that grants class features " +
					"at level 2 for every class and level 3 for cleric, fighter, rogue and wizard. " +
					"No ASI, spell slots, or multiclassing here. " +
					`SRD: ${GAINING_A_LEVEL_ANCHOR}.`,
				range_m: MELEE_REACH_METERS,
				spends_channel: PRIMARY_CHANNEL_ID,
				cost_time_ms: 0,
				predicate_source: levelUpGatePredicateSource(),
				consequence: {
					description:
						"Grant the class-level tag of the new level, then bump srd/level and grow srd/hp.",
					// The writes address the ACTOR, never the TARGET: D2(c) made the target
					// an external entity, so target.stat(...) would read the trainer's
					// unseeded hp_per_level fact.
					frame_writes: [
						...levelUpClassTagFrameWrites(),
						{
							ModifyResource: {
								actor: "Actor",
								resource: `${BUNDLE_ID}/${LEVEL_ID}`,
								delta_source: "1",
							},
						},
						{
							ModifyResource: {
								actor: "Actor",
								resource: `${BUNDLE_ID}/${HP_ID}`,
								delta_source: `actor.stat('${BUNDLE_ID}/${HP_PER_LEVEL_ID}')`,
							},
						},
					],
				},
			},
		},
		{
			toolName: "spellkave_define_resource",
			label: `resource:${XP_VALUE_ID}`,
			params: {
				id: XP_VALUE_ID,
				display_name: XP_VALUE_DISPLAY_NAME,
				min_value: MIN_XP_VALUE,
				max_value: MAX_XP_VALUE,
				initial_value: INITIAL_XP_VALUE,
				recovery_rule: XP_VALUE_RECOVERY_RULE,
				description: readResourceFlavor("xp-value").body,
				tags: [],
			},
		},
		{
			toolName: "spellkave_define_capability",
			label: "capability:claim-victory",
			params: {
				bundle: BUNDLE_ID,
				id: "action/claim-victory",
				actor_kind: "entity",
				display_name: "Claim Victory",
				description:
					"Allows the acting creature to claim the Experience Points a defeated creature is worth.",
				tags: ["srd.action"],
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: "action:claim-victory",
			params: {
				bundle: BUNDLE_ID,
				id: "claim-victory",
				required_capability: CLAIM_VICTORY_CAPABILITY_ID,
				niche_id: CREATURE_NICHE_TAG,
				display_name: "Claim Victory",
				description:
					"Claim the Experience Points a fallen creature was worth: requires the target to already " +
					`carry srd/condition/dead (Monster Death) with an unclaimed srd/xp_value. SRD: ${EXPERIENCE_POINTS_BY_CR_ANCHOR}.`,
				predicate_source: claimVictoryGatePredicateSource(),
				range_m: MELEE_REACH_METERS,
				cost_time_ms: 0,
				spends_channel: PRIMARY_CHANNEL_ID,
				consequence: {
					description:
						"Flourish: zero the target's own srd/xp_value latch so this offer cannot fire twice. " +
						"XP itself is awarded at kill time by Aldwin (sk-0m4.27) — this action no longer grants any.",
					frame_writes: [
						{
							ModifyResource: {
								actor: "TargetActor",
								resource: `${BUNDLE_ID}/${XP_VALUE_ID}`,
								// Set-to-zero idiom (sister precedent: `world-fixtures/srd/base/
								// death-saves.toml:140`'s "d20 - actor.stat(<same resource>)" — here
								// the target value is 0, so the delta is simply the negation of the
								// resource's own current value): an exactly-once claim latch.
								delta_source: `0 - target.stat('${BUNDLE_ID}/${XP_VALUE_ID}')`,
							},
						},
					],
				},
			},
		},
	];

	const body = await driveUnitScene(
		BUNDLE_ID,
		withSrdTextNamespace([
			...calls,
			srdTextAttachmentWriteCall({
				targetKind: "resource_definition",
				targetRef: `${BUNDLE_ID}/${XP_ID}`,
				extracted: markdownHeadingBlock("character-creation.md", "Level Advancement"),
			}),
		]),
		target,
		{
			onlyDslMacroDefinitionIds: [XP_THRESHOLD_MACRO_ID],
		},
	);

	const units: ChapterUnitSummary[] = [
		{
			kind: "dsl_macro_definitions",
			id: XP_THRESHOLD_MACRO_ID,
			sourcePk: CHARACTER_ADVANCEMENT_ANCHOR,
		},
		{
			kind: "resource_definitions",
			id: `${BUNDLE_ID}/${XP_ID}`,
			sourcePk: CHARACTER_ADVANCEMENT_ANCHOR,
		},
		{
			kind: "resource_definitions",
			id: `${BUNDLE_ID}/${HP_PER_LEVEL_ID}`,
			sourcePk: FIXED_HP_ANCHOR,
		},
		{ kind: "niche_definitions", id: ADVANCEMENT_TRAINER_TAG, sourcePk: "" },
		{
			kind: "capability_definitions",
			id: LEVEL_UP_CAPABILITY_ID,
			sourcePk: GAINING_A_LEVEL_ANCHOR,
		},
		{ kind: "action_definitions", id: LEVEL_UP_ACTION_ID, sourcePk: GAINING_A_LEVEL_ANCHOR },
		{ kind: "consequence_templates", id: `${LEVEL_UP_ACTION_ID}/success`, sourcePk: "" },
		{ kind: "outcome_templates", id: `${LEVEL_UP_ACTION_ID}/outcome`, sourcePk: "" },
		{ kind: "affordance_templates", id: `${LEVEL_UP_ACTION_ID}/affordance`, sourcePk: "" },
		{
			kind: "resource_definitions",
			id: `${BUNDLE_ID}/${XP_VALUE_ID}`,
			sourcePk: EXPERIENCE_POINTS_BY_CR_ANCHOR,
		},
		{
			kind: "capability_definitions",
			id: CLAIM_VICTORY_CAPABILITY_ID,
			sourcePk: EXPERIENCE_POINTS_BY_CR_ANCHOR,
		},
		{
			kind: "action_definitions",
			id: CLAIM_VICTORY_ACTION_ID,
			sourcePk: EXPERIENCE_POINTS_BY_CR_ANCHOR,
		},
		{ kind: "consequence_templates", id: `${CLAIM_VICTORY_ACTION_ID}/success`, sourcePk: "" },
		{ kind: "outcome_templates", id: `${CLAIM_VICTORY_ACTION_ID}/outcome`, sourcePk: "" },
		{ kind: "affordance_templates", id: `${CLAIM_VICTORY_ACTION_ID}/affordance`, sourcePk: "" },
	];

	const header = [
		"# GENERATED by src/chapters/character-creation/advancement-units.ts — DO NOT EDIT BY HAND.",
		"# Regenerate: pnpm --filter @spellkave/srd-cc run generate",
		"#",
		"# Level Advancement (character-creation.md:649-810) — C4, this chapter's",
		"# FIRST behavior slice (ledger/character-creation.md). Four building",
		"# blocks: srd/xp (real, persistent resource — Q2 DECIDED, diverging from",
		"# the sister's milestone-first #1812 stance), srd/xp_threshold (a DSL",
		"# macro encoding the 20-row Character Advancement XP column, built",
		"# programmatically — never hand-typed), ONE srd/advancement/level-up",
		"# action (never one row per level), and HP growth reading an",
		"# actor-carried srd/hp_per_level fact (the Fixed HP by Class table is",
		"# per-class/Classes-chapter progression data, out of this slice's scope —",
		"# see advancement-units.ts's own module header for the full design record,",
		"# grounded in ledger/designs/character-advancement.md). A fifth block",
		"# (level-up DM arc, S1) adds srd/xp_value (an actor-carried XP-worth fact,",
		"# monsters.md:203-209) and srd/claim-victory (the affordance that grants",
		"# it to a killer and zeroes it, an exactly-once latch) — see",
		"# advancement-units.ts's own module header for the full design record,",
		"# grounded in ledger/designs/level-up-dm-arc-plan.md.",
		"",
		"",
	].join("\n");

	return { toml: header + body, units };
}
