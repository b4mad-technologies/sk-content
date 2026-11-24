import type { AuthorTarget } from "@spellkave/tool-authoring";

import type { ChapterUnitSummary } from "../../chapter-types";
import { driveUnitScene, type VerbCall } from "../../verb-runner";
import {
	BONUS_CHANNEL_ID,
	economyChannelModifierTargetRow,
	PRIMARY_CHANNEL_ID,
	REACTION_CHANNEL_ID,
} from "../action-economy-units";
import {
	assertConditionsProvenanceSource,
	CHARMED_DESCRIPTION,
	CHARMED_DISPLAY_NAME,
	CHARMED_LOCAL_ID,
	DEAD_DESCRIPTION,
	DEAD_DISPLAY_NAME,
	DEAD_LOCAL_ID,
	FRIGHTENED_ABILITY_CHECK_DISADVANTAGE_DESCRIPTION,
	FRIGHTENED_ABILITY_CHECK_DISADVANTAGE_LOCAL_ID,
	FRIGHTENED_DESCRIPTION,
	FRIGHTENED_DISPLAY_NAME,
	FRIGHTENED_LOCAL_ID,
	GRAPPLED_DESCRIPTION,
	GRAPPLED_DISPLAY_NAME,
	GRAPPLED_LOCAL_ID,
	INCAPACITATED_DESCRIPTION,
	INCAPACITATED_DISPLAY_NAME,
	INCAPACITATED_LOCAL_ID,
	INCAPACITATED_NO_ACTION_DESCRIPTION,
	INCAPACITATED_NO_ACTION_DISPLAY_NAME,
	INCAPACITATED_NO_ACTION_LOCAL_ID,
	INCAPACITATED_NO_BONUS_ACTION_DESCRIPTION,
	INCAPACITATED_NO_BONUS_ACTION_DISPLAY_NAME,
	INCAPACITATED_NO_BONUS_ACTION_LOCAL_ID,
	INCAPACITATED_NO_REACTION_DESCRIPTION,
	INCAPACITATED_NO_REACTION_DISPLAY_NAME,
	INCAPACITATED_NO_REACTION_LOCAL_ID,
	POISONED_ABILITY_CHECK_DISADVANTAGE_DESCRIPTION,
	POISONED_ABILITY_CHECK_DISADVANTAGE_LOCAL_ID,
	POISONED_DESCRIPTION,
	POISONED_DISPLAY_NAME,
	POISONED_LOCAL_ID,
	PRONE_DESCRIPTION,
	PRONE_DISPLAY_NAME,
	PRONE_LOCAL_ID,
	STABLE_DESCRIPTION,
	STABLE_DISPLAY_NAME,
	STABLE_LOCAL_ID,
	UNCONSCIOUS_DESCRIPTION,
	UNCONSCIOUS_DISPLAY_NAME,
	UNCONSCIOUS_LOCAL_ID,
} from "../conditions-units";
import { BUNDLE_ID } from "../constants";
import {
	REMOVE_POLICY_INDEPENDENT_LIFETIME_LOCAL_ID,
	STACKING_SINGLE_LOCAL_ID,
} from "../cover-units";
import {
	ABILITY_CHECK_RESOLUTION_SCOPE_ID,
	ATTACK_ROLL_RESOLUTION_SCOPE_ID,
	resolutionScopeModifierTargetRow,
} from "../resolution-scope-units";
import { ROLL_BIAS_DISADVANTAGE_TAG } from "../tag-value-vocabulary";

const CONDITIONS_ANCHOR =
	"rules-glossary.md § Incapacitated [Condition] (923-933); playing-the-game.md § Dropping to " +
	"0 Hit Points > Instant Death > Monster Death (1217); rules-glossary.md § Dead (670-674); " +
	"rules-glossary.md § Prone [Condition] (1183-1189)";

// CONDITIONS PACKAGE anchor (the five conditions below, `conditions-units.ts`'s
// own module header carries the full shared-design grounding): rules-glossary.md
// § Charmed [Condition] (434-440); § Frightened [Condition] (816-822);
// § Grappled [Condition] (824-832); § Poisoned [Condition] (1169-1173);
// § Prone [Condition] (1183-1189).
const CONDITIONS_PACKAGE_ANCHOR =
	"rules-glossary.md § Charmed [Condition] (434-440); § Frightened [Condition] (816-822); " +
	"§ Grappled [Condition] (824-832); § Poisoned [Condition] (1169-1173); § Prone [Condition] " +
	"(1183-1189)";

export const INCAPACITATED_CONDITION_ID = `${BUNDLE_ID}/${INCAPACITATED_LOCAL_ID}`;
export const DEAD_CONDITION_ID = `${BUNDLE_ID}/${DEAD_LOCAL_ID}`;
export const UNCONSCIOUS_CONDITION_ID = `${BUNDLE_ID}/${UNCONSCIOUS_LOCAL_ID}`;
export const STABLE_CONDITION_ID = `${BUNDLE_ID}/${STABLE_LOCAL_ID}`;
export const POISONED_CONDITION_ID = `${BUNDLE_ID}/${POISONED_LOCAL_ID}`;
/** Death-save capability id — defined in death-saves fragment; referenced here for grants/suppress. */
export const DEATH_SAVE_CAPABILITY_ID = `${BUNDLE_ID}/capability/death_save`;
export const POISONED_ABILITY_CHECK_DISADVANTAGE_CONDITION_ID = `${BUNDLE_ID}/${POISONED_ABILITY_CHECK_DISADVANTAGE_LOCAL_ID}`;
export const CHARMED_CONDITION_ID = `${BUNDLE_ID}/${CHARMED_LOCAL_ID}`;
export const FRIGHTENED_CONDITION_ID = `${BUNDLE_ID}/${FRIGHTENED_LOCAL_ID}`;
export const FRIGHTENED_ABILITY_CHECK_DISADVANTAGE_CONDITION_ID = `${BUNDLE_ID}/${FRIGHTENED_ABILITY_CHECK_DISADVANTAGE_LOCAL_ID}`;
export const GRAPPLED_CONDITION_ID = `${BUNDLE_ID}/${GRAPPLED_LOCAL_ID}`;
export const PRONE_CONDITION_ID = `${BUNDLE_ID}/${PRONE_LOCAL_ID}`;
export const PRONE_ATTACK_ROLL_DISADVANTAGE_MODIFIER_ID = `${BUNDLE_ID}/${PRONE_LOCAL_ID}/attack-roll-disadvantage`;

// sk-dms.40.2: the three economy-channel-zeroing siblings reached from
// Incapacitated via `implies`. Each condition carries EXACTLY ONE modifier
// (`spellkave_define_condition` auto-wires `modifier_template_id` to it), so
// the modifier id below deliberately REUSES the condition's own id stem —
// same string, two different tables (`condition_definitions`/
// `modifier_templates`), no collision.
export const INCAPACITATED_NO_ACTION_CONDITION_ID = `${BUNDLE_ID}/${INCAPACITATED_NO_ACTION_LOCAL_ID}`;
export const INCAPACITATED_NO_BONUS_ACTION_CONDITION_ID = `${BUNDLE_ID}/${INCAPACITATED_NO_BONUS_ACTION_LOCAL_ID}`;
export const INCAPACITATED_NO_REACTION_CONDITION_ID = `${BUNDLE_ID}/${INCAPACITATED_NO_REACTION_LOCAL_ID}`;
export const INCAPACITATED_NO_ACTION_MODIFIER_ID = INCAPACITATED_NO_ACTION_CONDITION_ID;
export const INCAPACITATED_NO_BONUS_ACTION_MODIFIER_ID = INCAPACITATED_NO_BONUS_ACTION_CONDITION_ID;
export const INCAPACITATED_NO_REACTION_MODIFIER_ID = INCAPACITATED_NO_REACTION_CONDITION_ID;

// Per-condition modifier_templates ids — exported so consumers (tests, the
// live proof) never retype the local-id stems authored below. Prone's own
// modifier id is origin/main's Prone Slice B shape
// (`PRONE_ATTACK_ROLL_DISADVANTAGE_MODIFIER_ID` above) — the merge resolution
// kept THEIRS for Prone (the more mechanized condition-definition shape,
// `condition:prone` below); this package's own four (Poisoned, Charmed
// [identity-only, no modifier], Frightened, Grappled) stay on this bundle's
// own attack_disadvantage naming.
export const POISONED_ATTACK_DISADVANTAGE_MODIFIER_ID = `${BUNDLE_ID}/condition/poisoned/attack_disadvantage`;
export const POISONED_ABILITY_CHECK_DISADVANTAGE_MODIFIER_ID = `${BUNDLE_ID}/condition/poisoned/ability-check-disadvantage/disadvantage`;
export const FRIGHTENED_ATTACK_DISADVANTAGE_MODIFIER_ID = `${BUNDLE_ID}/condition/frightened/attack_disadvantage`;
export const FRIGHTENED_ABILITY_CHECK_DISADVANTAGE_MODIFIER_ID = `${BUNDLE_ID}/condition/frightened/ability-check-disadvantage/disadvantage`;
export const GRAPPLED_ATTACK_DISADVANTAGE_MODIFIER_ID = `${BUNDLE_ID}/condition/grappled/attack_disadvantage`;

/**
 * Ship the three condition identities the combat-arena proof needs
 * (`ledger/designs/combat-arena-proof.md`): Incapacitated (the umbrella every
 * other "can't act" condition cascades into) and Dead (the Monster Death
 * terminal, cascading INTO Incapacitated via `implies`) from Slice A; Prone
 * (the voluntary Dropping Prone action's target condition) from the Slice 2
 * "denser monster roster" bonus units, extended in `prone-free-action.md`
 * Slice B with a real actor-side Disadvantage modifier on the shared
 * `srd/attack_roll` axis. Dead stays an identity-only carrier. Incapacitated's
 * OWN row also stays identity-only, but (sk-dms.40.2) its Inactive sub-effect
 * is now mechanized through three sibling condition rows reached via
 * `implies` — see `conditions-units.ts`'s own module header and
 * `INCAPACITATED_DESCRIPTION` for the full design/removability reasoning.
 *
 * DOES NOT ship the sister's own lethal-to-0-HP OUTCOME GRAPH wiring
 * (`world-fixtures/srd/base/attack-melee.toml`'s `srd/attack/dying_or_dead/
 * graph`, ApplyStatus(srd/condition/dead) guarded by `target.stat('srd/hp')
 * <= 0`) — CONFIRMED tooling gap, finding #66
 * (`ledger/findings.md`): a bare `outcome_graphs`/`outcome_graph_nodes`
 * pair is MUTUALLY referential (each row kind's static validator check
 * requires the OTHER to already exist), but `spellkave_write_rows` commits
 * and RE-VALIDATES THE WHOLE MANIFEST after every single call — so no
 * sequential two-call order ever satisfies both checks at once; the ONE verb
 * that authors a graph+nodes+edges ATOMICALLY (`spellkave_define_behavior`'s
 * `OutcomeGraph` write primitive) hardcodes every branch's consequence to
 * `ModifyResource(TargetActor, srd/hp, ...)` (`authoring-verbs.ts` line
 * ~4253), with no ApplyStatus branch option. No fixture content is forced
 * around this gap here (same "pattern ships, no speculative content"
 * posture `attackRollExpr`'s own weapon-proficiency term already
 * established) — this package's OWN already-shipped Unarmed Strike Damage
 * verb (`unarmed-strike-units.ts`) has the identical gap: it ALSO carries no
 * lethal-to-0-HP wiring, for the same reason, recorded honestly there too
 * (its own consequence is damage-only). `srd/attack/melee`/`srd/attack/
 * ranged` (`fragments/attacks.ts`) match that existing precedent exactly.
 */
export async function buildConditionsFragment(target?: AuthorTarget): Promise<{
	toml: string;
	units: ChapterUnitSummary[];
}> {
	assertConditionsProvenanceSource();
	const stackingRuleId = `${BUNDLE_ID}/${STACKING_SINGLE_LOCAL_ID}`;
	const removeTimePolicyId = `${BUNDLE_ID}/${REMOVE_POLICY_INDEPENDENT_LIFETIME_LOCAL_ID}`;
	const calls: VerbCall[] = [
		// Prone Slice B (`ledger/designs/prone-free-action.md`): seed the
		// `srd/attack_roll` actor-side axis — the FIRST modifier_target_
		// definitions row for it (`fragments/attacks.ts`'s melee/ranged/
		// unarmed-strike/opportunity-attack actions already declare
		// `resolution_scope = ATTACK_ROLL_RESOLUTION_SCOPE_ID`, but no
		// fragment has ever needed it as a modifier TARGET before — a
		// modifier's `applies_to` must resolve within THIS call's own
		// isolated workspace, same MF-VAL-225 constraint `cover.ts`'s own
		// module header already documents for `srd/ac`). Must precede the
		// Prone condition call below, which references this axis.
		{
			toolName: "spellkave_write_rows",
			label: "modifier-target:attack-roll",
			params: {
				bundle: BUNDLE_ID,
				kind: "modifier_target_definitions",
				rows: [resolutionScopeModifierTargetRow(ATTACK_ROLL_RESOLUTION_SCOPE_ID)],
			},
		},
		// sk-dms.40.2: seed the three action-economy channels as modifier
		// TARGETS — the FIRST modifier_target_definitions rows for them (no
		// fragment has ever needed an economy channel as a modifier target
		// before). Must precede the three sibling condition calls below, which
		// reference these axes (same MF-VAL-225 isolated-workspace constraint
		// the `srd/attack_roll` seed above documents).
		{
			toolName: "spellkave_write_rows",
			label: "modifier-target:incapacitated-economy-channels",
			params: {
				bundle: BUNDLE_ID,
				kind: "modifier_target_definitions",
				rows: [
					economyChannelModifierTargetRow(PRIMARY_CHANNEL_ID, "Action economy: primary channel"),
					economyChannelModifierTargetRow(BONUS_CHANNEL_ID, "Action economy: bonus channel"),
					economyChannelModifierTargetRow(REACTION_CHANNEL_ID, "Action economy: reaction channel"),
				],
			},
		},
		// sk-dms.40.2: the three channel-zeroing siblings — MUST be authored
		// before `condition:incapacitated` below, whose `implies` list
		// references them (Class 8 `implies` referential validation resolves
		// against the manifest accumulated so far in this workspace).
		{
			toolName: "spellkave_define_condition",
			label: "condition:incapacitated-no-action",
			params: {
				bundle: BUNDLE_ID,
				id: INCAPACITATED_NO_ACTION_LOCAL_ID,
				display_name: INCAPACITATED_NO_ACTION_DISPLAY_NAME,
				description: INCAPACITATED_NO_ACTION_DESCRIPTION,
				gate_predicate_source: "",
				stacking_rule: stackingRuleId,
				remove_time_policy: removeTimePolicyId,
				observable: false,
				modifiers: [
					{
						id: INCAPACITATED_NO_ACTION_LOCAL_ID,
						display_name: "Incapacitated: zero the primary action-economy channel",
						applies_to: PRIMARY_CHANNEL_ID,
						modifier_expression_source: "let unused = 0; unused",
						delta_kind: "FlatSet",
					},
				],
			},
		},
		{
			toolName: "spellkave_define_condition",
			label: "condition:incapacitated-no-bonus-action",
			params: {
				bundle: BUNDLE_ID,
				id: INCAPACITATED_NO_BONUS_ACTION_LOCAL_ID,
				display_name: INCAPACITATED_NO_BONUS_ACTION_DISPLAY_NAME,
				description: INCAPACITATED_NO_BONUS_ACTION_DESCRIPTION,
				gate_predicate_source: "",
				stacking_rule: stackingRuleId,
				remove_time_policy: removeTimePolicyId,
				observable: false,
				modifiers: [
					{
						id: INCAPACITATED_NO_BONUS_ACTION_LOCAL_ID,
						display_name: "Incapacitated: zero the bonus action-economy channel",
						applies_to: BONUS_CHANNEL_ID,
						modifier_expression_source: "let unused = 0; unused",
						delta_kind: "FlatSet",
					},
				],
			},
		},
		{
			toolName: "spellkave_define_condition",
			label: "condition:incapacitated-no-reaction",
			params: {
				bundle: BUNDLE_ID,
				id: INCAPACITATED_NO_REACTION_LOCAL_ID,
				display_name: INCAPACITATED_NO_REACTION_DISPLAY_NAME,
				description: INCAPACITATED_NO_REACTION_DESCRIPTION,
				gate_predicate_source: "",
				stacking_rule: stackingRuleId,
				remove_time_policy: removeTimePolicyId,
				observable: false,
				modifiers: [
					{
						id: INCAPACITATED_NO_REACTION_LOCAL_ID,
						display_name: "Incapacitated: zero the reaction action-economy channel",
						applies_to: REACTION_CHANNEL_ID,
						modifier_expression_source: "let unused = 0; unused",
						delta_kind: "FlatSet",
					},
				],
			},
		},
		{
			toolName: "spellkave_define_condition",
			label: "condition:incapacitated",
			params: {
				bundle: BUNDLE_ID,
				id: INCAPACITATED_LOCAL_ID,
				display_name: INCAPACITATED_DISPLAY_NAME,
				description: INCAPACITATED_DESCRIPTION,
				gate_predicate_source: "",
				stacking_rule: stackingRuleId,
				remove_time_policy: removeTimePolicyId,
				observable: true,
				implies: [
					INCAPACITATED_NO_ACTION_CONDITION_ID,
					INCAPACITATED_NO_BONUS_ACTION_CONDITION_ID,
					INCAPACITATED_NO_REACTION_CONDITION_ID,
				],
			},
		},
		// Seed capabilities named by Dead.suppresses / Unconscious.grants so
		// MF-VAL-316 resolves in this isolated workspace. Real capability rows
		// live in their owning fragments; these seeds are stripped via
		// omitRowKinds below.
		...[
			"action/attack",
			"action/dodge",
			"action/help",
			"action/drop-prone",
			"action/short-rest",
			"action/long-rest",
			"capability/walk",
			"capability/death_save",
		].map((id) => ({
			toolName: "spellkave_define_capability" as const,
			label: `seed-capability:${id}`,
			params: {
				bundle: BUNDLE_ID,
				id,
				actor_kind: "entity",
				display_name: id,
				description: "sk-609b.18 seed-then-strip placeholder — never emitted",
			},
		})),
		{
			toolName: "spellkave_define_condition",
			label: "condition:dead",
			params: {
				bundle: BUNDLE_ID,
				id: DEAD_LOCAL_ID,
				display_name: DEAD_DISPLAY_NAME,
				description: DEAD_DESCRIPTION,
				gate_predicate_source: "",
				stacking_rule: stackingRuleId,
				remove_time_policy: removeTimePolicyId,
				observable: true,
				implies: [INCAPACITATED_CONDITION_ID],
				// Corpse: suppress universal creature + death-save capabilities so
				// the factual manipulation action list is empty (sk-609b.18).
				suppresses_capability_while_active: [
					`${BUNDLE_ID}/action/attack`,
					`${BUNDLE_ID}/action/dodge`,
					`${BUNDLE_ID}/action/help`,
					`${BUNDLE_ID}/action/drop-prone`,
					`${BUNDLE_ID}/action/short-rest`,
					`${BUNDLE_ID}/action/long-rest`,
					`${BUNDLE_ID}/capability/walk`,
					DEATH_SAVE_CAPABILITY_ID,
				],
			},
		},
		// sk-609b.18: Unconscious + Stable (Falling Unconscious / Death Saving Throws).
		// Heal-clear consequence is authored in fragments/death-saves.ts under the
		// same template id the Unconscious hook invokes.
		{
			toolName: "spellkave_define_condition",
			label: "condition:unconscious",
			params: {
				bundle: BUNDLE_ID,
				id: UNCONSCIOUS_LOCAL_ID,
				display_name: UNCONSCIOUS_DISPLAY_NAME,
				description: UNCONSCIOUS_DESCRIPTION,
				gate_predicate_source: "",
				stacking_rule: stackingRuleId,
				remove_time_policy: removeTimePolicyId,
				observable: true,
				implies: [INCAPACITATED_CONDITION_ID],
				grants_capability_while_active: [DEATH_SAVE_CAPABILITY_ID],
				// pattern: condition-hook-on-event
				hooks: [
					{
						event_kind: "Layer2.ResourceDelta",
						detail_filter_source:
							"$event.detail.entity_id == target.stat('core/entity_id')" +
							` && $event.detail.resource_id == '${BUNDLE_ID}/hp'` +
							" && $event.detail.new_value > 0",
						expression_source: `invoke_outcome_graph('${BUNDLE_ID}/death_save/heal_clear')`,
					},
				],
			},
		},
		{
			toolName: "spellkave_define_condition",
			label: "condition:stable",
			params: {
				bundle: BUNDLE_ID,
				id: STABLE_LOCAL_ID,
				display_name: STABLE_DISPLAY_NAME,
				description: STABLE_DESCRIPTION,
				gate_predicate_source: "",
				stacking_rule: stackingRuleId,
				remove_time_policy: removeTimePolicyId,
				observable: true,
				implies: [],
			},
		},
		// CONDITIONS PACKAGE (conditions-units.ts's own module header carries the
		// full shared-design grounding: the actor-side resolution-scope roll-bias
		// channel, the absent per-instance source-identity read, and the now-live
		// condition-effective movement-reach path). The `srd/attack_roll`
		// axis is ALREADY seeded above (Prone Slice B's own modifier-target row,
		// `ledger/designs/prone-free-action.md`) — not re-declared a second time
		// here. `srd/ability_check` IS re-declared here (upsert-safe, MF-VAL-272
		// exempts modifier_target_definitions from the duplicate-id scan, same
		// finding #38 workaround `fragments/cover.ts`/`fragments/dodge.ts`
		// already use) because this fragment builds against its OWN isolated
		// throwaway workspace and this is the first call in THIS workspace that
		// needs it as a modifier target — it is already shipped by
		// `fragments/help.ts`, re-declared here identically.
		{
			toolName: "spellkave_write_rows",
			label: "modifier-target:ability-check",
			params: {
				bundle: BUNDLE_ID,
				kind: "modifier_target_definitions",
				rows: [resolutionScopeModifierTargetRow(ABILITY_CHECK_RESOLUTION_SCOPE_ID)],
			},
		},
		// Poisoned retains two separately applied primary rows. Round-3 d020
		// now permits implied-child removal; see conditions-units.ts.

		{
			toolName: "spellkave_define_condition",
			label: "condition:poisoned-ability-check-disadvantage",
			params: {
				bundle: BUNDLE_ID,
				id: POISONED_ABILITY_CHECK_DISADVANTAGE_LOCAL_ID,
				display_name: "Poisoned: Ability Check Disadvantage",
				observable: false,
				gate_predicate_source: "1 == 1",
				description: POISONED_ABILITY_CHECK_DISADVANTAGE_DESCRIPTION,
				stacking_rule: stackingRuleId,
				remove_time_policy: removeTimePolicyId,
				modifiers: [
					{
						id: "condition/poisoned/ability-check-disadvantage/disadvantage",
						display_name: "Poisoned: Disadvantage on ability checks",
						applies_to: ABILITY_CHECK_RESOLUTION_SCOPE_ID,
						modifier_expression_source: "let unused = 0; unused",
						delta_kind: "Disadvantage",
						tags: [ROLL_BIAS_DISADVANTAGE_TAG],
					},
				],
			},
		},
		{
			toolName: "spellkave_define_condition",
			label: "condition:poisoned",
			params: {
				bundle: BUNDLE_ID,
				id: POISONED_LOCAL_ID,
				display_name: POISONED_DISPLAY_NAME,
				gate_predicate_source: "1 == 1",
				description: POISONED_DESCRIPTION,
				stacking_rule: stackingRuleId,
				remove_time_policy: removeTimePolicyId,
				observable: true,
				modifiers: [
					{
						id: "condition/poisoned/attack_disadvantage",
						display_name: "Poisoned: Disadvantage on attack rolls",
						applies_to: ATTACK_ROLL_RESOLUTION_SCOPE_ID,
						modifier_expression_source: "let unused = 0; unused",
						delta_kind: "Disadvantage",
						tags: [ROLL_BIAS_DISADVANTAGE_TAG],
					},
				],
			},
		},
		// Charmed: IDENTITY-ONLY — both sub-effects need the absent per-instance
		// "who is my charmer" source-identity read (conditions-units.ts's own
		// module header); zero modifiers attached, same posture as
		// Incapacitated/Dead above.
		{
			toolName: "spellkave_define_condition",
			label: "condition:charmed",
			params: {
				bundle: BUNDLE_ID,
				id: CHARMED_LOCAL_ID,
				display_name: CHARMED_DISPLAY_NAME,
				description: CHARMED_DESCRIPTION,
				gate_predicate_source: "",
				stacking_rule: stackingRuleId,
				remove_time_policy: removeTimePolicyId,
				observable: true,
			},
		},
		// Frightened: SAME twin-condition shape as Poisoned (two separate
		// top-level rows, no `implies` link — same removability finding), but
		// the shipped Disadvantage pair is OVER-BROAD (the line-of-sight gate
		// cannot be expressed) — see FRIGHTENED_DESCRIPTION for the full honest
		// tiering.
		{
			toolName: "spellkave_define_condition",
			label: "condition:frightened-ability-check-disadvantage",
			params: {
				bundle: BUNDLE_ID,
				id: FRIGHTENED_ABILITY_CHECK_DISADVANTAGE_LOCAL_ID,
				display_name: "Frightened: Ability Check Disadvantage",
				observable: false,
				gate_predicate_source: "1 == 1",
				description: FRIGHTENED_ABILITY_CHECK_DISADVANTAGE_DESCRIPTION,
				stacking_rule: stackingRuleId,
				remove_time_policy: removeTimePolicyId,
				modifiers: [
					{
						id: "condition/frightened/ability-check-disadvantage/disadvantage",
						display_name: "Frightened: Disadvantage on ability checks",
						applies_to: ABILITY_CHECK_RESOLUTION_SCOPE_ID,
						modifier_expression_source: "let unused = 0; unused",
						delta_kind: "Disadvantage",
						tags: [ROLL_BIAS_DISADVANTAGE_TAG],
					},
				],
			},
		},
		{
			toolName: "spellkave_define_condition",
			label: "condition:frightened",
			params: {
				bundle: BUNDLE_ID,
				id: FRIGHTENED_LOCAL_ID,
				display_name: FRIGHTENED_DISPLAY_NAME,
				gate_predicate_source: "1 == 1",
				description: FRIGHTENED_DESCRIPTION,
				stacking_rule: stackingRuleId,
				remove_time_policy: removeTimePolicyId,
				observable: true,
				modifiers: [
					{
						id: "condition/frightened/attack_disadvantage",
						display_name: "Frightened: Disadvantage on attack rolls",
						applies_to: ATTACK_ROLL_RESOLUTION_SCOPE_ID,
						modifier_expression_source: "let unused = 0; unused",
						delta_kind: "Disadvantage",
						tags: [ROLL_BIAS_DISADVANTAGE_TAG],
					},
				],
			},
		},
		// Grappled: SHIPS ONLY the attack-roll Disadvantage (over-broad — cannot
		// exclude the grappler). "Speed 0" is not authored in this content slice;
		// the executable substrate path is covered by finding #90.
		{
			toolName: "spellkave_define_condition",
			label: "condition:grappled",
			params: {
				bundle: BUNDLE_ID,
				id: GRAPPLED_LOCAL_ID,
				display_name: GRAPPLED_DISPLAY_NAME,
				gate_predicate_source: "1 == 1",
				description: GRAPPLED_DESCRIPTION,
				stacking_rule: stackingRuleId,
				remove_time_policy: removeTimePolicyId,
				observable: true,
				modifiers: [
					{
						id: "condition/grappled/attack_disadvantage",
						display_name: "Grappled: Disadvantage on attack rolls",
						applies_to: ATTACK_ROLL_RESOLUTION_SCOPE_ID,
						modifier_expression_source: "let unused = 0; unused",
						delta_kind: "Disadvantage",
						tags: [ROLL_BIAS_DISADVANTAGE_TAG],
					},
				],
			},
		},
		// Prone: SHIPS the attack-roll Disadvantage EXACTLY (no over-breadth —
		// the SRD text carries no exception for this half). Restricted Movement
		// and the target-side range-conditional Advantage/Disadvantage are NOT
		// shipped — see PRONE_DESCRIPTION (cites finding #64).
		{
			toolName: "spellkave_define_condition",
			label: "condition:prone",
			params: {
				bundle: BUNDLE_ID,
				id: PRONE_LOCAL_ID,
				display_name: PRONE_DISPLAY_NAME,
				description: PRONE_DESCRIPTION,
				gate_predicate_source: "",
				stacking_rule: stackingRuleId,
				remove_time_policy: removeTimePolicyId,
				observable: true,
				// Actor-side half of "Attacks Affected" (rules-glossary.md:1189):
				// Disadvantage on the prone creature's OWN attack rolls — the
				// against-prone, distance-conditional half stays deferred; finding
				// #76 proves predicates execute, while the spatial inputs remain absent.
				modifiers: [
					{
						id: `${PRONE_LOCAL_ID}/attack-roll-disadvantage`,
						display_name: "Prone: Disadvantage on the prone creature's own attack rolls",
						applies_to: ATTACK_ROLL_RESOLUTION_SCOPE_ID,
						modifier_expression_source: "let unused = 0; unused",
						delta_kind: "Disadvantage",
						tags: [ROLL_BIAS_DISADVANTAGE_TAG],
					},
				],
			},
		},
	];
	const body = await driveUnitScene(BUNDLE_ID, calls, target, {
		omitRowKinds: ["capability_definitions", "capability_definition_tag"],
	});
	const units: ChapterUnitSummary[] = [
		{ kind: "modifier_target_definitions", id: ATTACK_ROLL_RESOLUTION_SCOPE_ID, sourcePk: "" },
		{ kind: "modifier_target_definitions", id: PRIMARY_CHANNEL_ID, sourcePk: "" },
		{ kind: "modifier_target_definitions", id: BONUS_CHANNEL_ID, sourcePk: "" },
		{ kind: "modifier_target_definitions", id: REACTION_CHANNEL_ID, sourcePk: "" },
		{ kind: "condition_definitions", id: INCAPACITATED_NO_ACTION_CONDITION_ID, sourcePk: "" },
		{ kind: "condition_definitions", id: INCAPACITATED_NO_BONUS_ACTION_CONDITION_ID, sourcePk: "" },
		{ kind: "condition_definitions", id: INCAPACITATED_NO_REACTION_CONDITION_ID, sourcePk: "" },
		{ kind: "modifier_templates", id: INCAPACITATED_NO_ACTION_MODIFIER_ID, sourcePk: "" },
		{ kind: "modifier_templates", id: INCAPACITATED_NO_BONUS_ACTION_MODIFIER_ID, sourcePk: "" },
		{ kind: "modifier_templates", id: INCAPACITATED_NO_REACTION_MODIFIER_ID, sourcePk: "" },
		{ kind: "condition_definitions", id: INCAPACITATED_CONDITION_ID, sourcePk: "" },
		{ kind: "condition_definitions", id: DEAD_CONDITION_ID, sourcePk: "" },
		{ kind: "condition_definitions", id: UNCONSCIOUS_CONDITION_ID, sourcePk: "" },
		{ kind: "condition_definitions", id: STABLE_CONDITION_ID, sourcePk: "" },
		{
			kind: "modifier_target_definitions",
			id: ABILITY_CHECK_RESOLUTION_SCOPE_ID,
			sourcePk: "",
		},
		{
			kind: "condition_definitions",
			id: POISONED_ABILITY_CHECK_DISADVANTAGE_CONDITION_ID,
			sourcePk: "",
		},
		{ kind: "condition_definitions", id: POISONED_CONDITION_ID, sourcePk: "" },
		{ kind: "condition_definitions", id: CHARMED_CONDITION_ID, sourcePk: "" },
		{
			kind: "condition_definitions",
			id: FRIGHTENED_ABILITY_CHECK_DISADVANTAGE_CONDITION_ID,
			sourcePk: "",
		},
		{ kind: "condition_definitions", id: FRIGHTENED_CONDITION_ID, sourcePk: "" },
		{ kind: "condition_definitions", id: GRAPPLED_CONDITION_ID, sourcePk: "" },
		{ kind: "condition_definitions", id: PRONE_CONDITION_ID, sourcePk: "" },
		{
			kind: "modifier_templates",
			id: PRONE_ATTACK_ROLL_DISADVANTAGE_MODIFIER_ID,
			sourcePk: "",
		},
	];
	const header = [
		"# GENERATED by src/chapters/playing-the-game/fragments/conditions.ts — DO NOT EDIT BY HAND.",
		"# Regenerate: pnpm --filter @spellkave/srd-cc run generate",
		"#",
		"# Incapacitated + Dead + Prone: self-sufficiency stacking/remove-policy",
		"# REFERENCES (bare id, see conditions-units.ts's own module header). Dead",
		"# implies Incapacitated (generic kernel cascade); Prone implies nothing",
		"# (Monster Death carries no prone-on-death clause, see conditions-units.ts).",
		"# Prone ALSO carries a real Disadvantage modifier on the srd/attack_roll",
		"# actor-side axis (Prone Slice B, `ledger/designs/prone-free-action.md`) —",
		"# the against-prone distance split stays deferred; finding #76 proves",
		"# predicate execution only. Lethal-to-0-HP AUTO-APPLY wiring is a",
		"# confirmed, recorded tooling gap — see this file's own module header",
		"# (finding #66).",
		"#",
		"# sk-dms.40.2: Incapacitated's own row stays an identity-only carrier, but",
		"# its Inactive sub-effect (can't take any action/Bonus Action/Reaction) is",
		"# now MECHANIZED via three sibling condition rows reached through",
		"# `implies` — condition/incapacitated/no-{action,bonus-action,reaction} —",
		"# each zeroing one srd/economy_channel/{primary,bonus,reaction} pool via a",
		"# FlatSet(0) Numeric modifier (see conditions-units.ts's own module header",
		"# and INCAPACITATED_DESCRIPTION for the full design/removability reasoning).",
		"#",
		"# CONDITIONS PACKAGE: Poisoned, Charmed, Frightened, Grappled, Prone.",
		"# Disadvantage halves ride the actor-side resolution-scope roll-bias",
		"# channel (srd/attack_roll / srd/ability_check, finding #56's",
		"# addendum), never the coarser target-keyed ResolutionCheck axis.",
		"# Charmed ships identity-only (no per-instance source-identity read",
		"# exists). Grappled's Speed-0 half is not authored in this content",
		"# slice; finding #90 proves the reducer's effective-reach path. Every",
		"# per-condition over-breadth/gap is documented on its own row's own",
		"# description field (conditions-units.ts).",
		"",
		`# anchor: ${CONDITIONS_ANCHOR}`,
		`# anchor: ${CONDITIONS_PACKAGE_ANCHOR}`,
		"",
		"",
	].join("\n");
	return { toml: header + body, units };
}
