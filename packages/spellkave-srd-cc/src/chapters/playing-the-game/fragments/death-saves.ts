// pattern: condition-hook-on-event
// → packages/spellkave-world-author/docs/patterns/condition-hook-on-event.md
//
// PC death-save clock (sk-609b.18): resources + turn-gated roll action.
// Unconscious/Stable conditions and the character-at-0-HP attack fold live
// in conditions.ts / attacks.ts; this fragment owns the clock machinery.
import type { AuthorTarget } from "@spellkave/tool-authoring";
import { readResourceFlavor } from "../../../flavor/read";
import {
	markdownHeadingBlock,
	srdTextAttachmentWriteCall,
	withSrdTextNamespace,
} from "../../../text";
import type { ChapterUnitSummary } from "../../chapter-types";
import { driveUnitScene, type VerbCall } from "../../verb-runner";
import { BUNDLE_ID } from "../constants";
import {
	DEATH_SAVE_ACTION_LOCAL_ID,
	DEATH_SAVE_CAPABILITY_LOCAL_ID,
	DEATH_SAVE_FAILURES_DISPLAY_NAME,
	DEATH_SAVE_FAILURES_LOCAL_ID,
	DEATH_SAVE_HEAL_CLEAR_CONSEQUENCE_LOCAL_ID,
	DEATH_SAVE_LAST_ROLL_DISPLAY_NAME,
	DEATH_SAVE_LAST_ROLL_LOCAL_ID,
	DEATH_SAVE_LAST_ROLL_MAX,
	DEATH_SAVE_LAST_ROLL_MIN,
	DEATH_SAVE_SUCCESSES_DISPLAY_NAME,
	DEATH_SAVE_SUCCESSES_LOCAL_ID,
	DEATH_SAVE_TALLY_MAX,
	DEATH_SAVE_TALLY_MIN,
	deathSaveCaptureDeltaExpr,
	deathSaveDeadThresholdExpr,
	deathSaveEligibilityExpr,
	deathSaveFailureTallyDeltaExpr,
	deathSaveNat1ExtraFailureDeltaExpr,
	deathSaveResetDeltaExpr,
	deathSaveStableThresholdExpr,
	deathSaveSuccessTallyDeltaExpr,
} from "../death-saves-units";
import { HP_ID } from "../hp-units";
import {
	DEAD_CONDITION_ID,
	DEATH_SAVE_CAPABILITY_ID,
	INCAPACITATED_CONDITION_ID,
	INCAPACITATED_NO_ACTION_CONDITION_ID,
	INCAPACITATED_NO_BONUS_ACTION_CONDITION_ID,
	INCAPACITATED_NO_REACTION_CONDITION_ID,
	STABLE_CONDITION_ID,
	UNCONSCIOUS_CONDITION_ID,
} from "./conditions";

const DEATH_SAVES_ANCHOR =
	"playing-the-game.md § Dropping to 0 Hit Points > Falling Unconscious + Death Saving Throws";

export const DEATH_SAVE_SUCCESSES_ID = `${BUNDLE_ID}/${DEATH_SAVE_SUCCESSES_LOCAL_ID}`;
export const DEATH_SAVE_FAILURES_ID = `${BUNDLE_ID}/${DEATH_SAVE_FAILURES_LOCAL_ID}`;
export const DEATH_SAVE_LAST_ROLL_ID = `${BUNDLE_ID}/${DEATH_SAVE_LAST_ROLL_LOCAL_ID}`;
export const DEATH_SAVE_ACTION_ID = `${BUNDLE_ID}/${DEATH_SAVE_ACTION_LOCAL_ID}`;
export const DEATH_SAVE_NICHE_ID = `capability:${DEATH_SAVE_CAPABILITY_ID}`;
export const DEATH_SAVE_HEAL_CLEAR_ID = `${BUNDLE_ID}/${DEATH_SAVE_HEAL_CLEAR_CONSEQUENCE_LOCAL_ID}`;

const HP_RESOURCE_ID = `${BUNDLE_ID}/${HP_ID}`;

function thresholdApplyStatus(when: string, conditionId: string): Record<string, unknown> {
	return {
		ForEachActorInRadius: {
			center_ref: "ActorSpatialRef",
			shape_id: "core/area/node_ball",
			shape_params_json: '{"ball_radius": 0}',
			predicate_source: when,
			body: [
				{
					ApplyStatus: {
						target_kind: "entity",
						target_ref: "Actor",
						condition_definition_id: conditionId,
					},
				},
			],
		},
	};
}

function thresholdResetClock(when: string): Record<string, unknown>[] {
	// After Stable or Dead lands, zero the three clock pools (brief: clock resets).
	const resources = [DEATH_SAVE_SUCCESSES_ID, DEATH_SAVE_FAILURES_ID, DEATH_SAVE_LAST_ROLL_ID];
	return resources.map((resource) => ({
		ForEachActorInRadius: {
			center_ref: "ActorSpatialRef",
			shape_id: "core/area/node_ball",
			shape_params_json: '{"ball_radius": 0}',
			predicate_source: when,
			body: [
				{
					ModifyResource: {
						actor: "Actor",
						resource,
						delta_source: deathSaveResetDeltaExpr(resource),
					},
				},
			],
		},
	}));
}

export async function buildDeathSavesFragment(
	target?: AuthorTarget,
): Promise<{ toml: string; units: ChapterUnitSummary[] }> {
	const eligibility = deathSaveEligibilityExpr(
		UNCONSCIOUS_CONDITION_ID,
		STABLE_CONDITION_ID,
		DEAD_CONDITION_ID,
	);
	const stableWhen = deathSaveStableThresholdExpr(DEATH_SAVE_SUCCESSES_ID, DEATH_SAVE_LAST_ROLL_ID);
	const deadWhen = deathSaveDeadThresholdExpr(DEATH_SAVE_FAILURES_ID);

	const calls: VerbCall[] = [
		{
			toolName: "spellkave_define_resource",
			label: "resource:death_save_successes",
			params: {
				id: DEATH_SAVE_SUCCESSES_LOCAL_ID,
				display_name: DEATH_SAVE_SUCCESSES_DISPLAY_NAME,
				min_value: DEATH_SAVE_TALLY_MIN,
				max_value: DEATH_SAVE_TALLY_MAX,
				initial_value: 0,
				recovery_rule: "persistent",
				description: readResourceFlavor("death-save-successes").body,
				tags: [],
			},
		},
		{
			toolName: "spellkave_define_resource",
			label: "resource:death_save_failures",
			params: {
				id: DEATH_SAVE_FAILURES_LOCAL_ID,
				display_name: DEATH_SAVE_FAILURES_DISPLAY_NAME,
				min_value: DEATH_SAVE_TALLY_MIN,
				max_value: DEATH_SAVE_TALLY_MAX,
				initial_value: 0,
				recovery_rule: "persistent",
				description: readResourceFlavor("death-save-failures").body,
				tags: [],
			},
		},
		{
			toolName: "spellkave_define_resource",
			label: "resource:death_save_last_roll",
			params: {
				id: DEATH_SAVE_LAST_ROLL_LOCAL_ID,
				display_name: DEATH_SAVE_LAST_ROLL_DISPLAY_NAME,
				min_value: DEATH_SAVE_LAST_ROLL_MIN,
				max_value: DEATH_SAVE_LAST_ROLL_MAX,
				initial_value: 0,
				recovery_rule: "persistent",
				description:
					"Scratch cell capturing ONE d20 draw per death-save roll so ordinal tallies never re-draw.",
				tags: [],
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "niche:death_save",
			params: {
				bundle: BUNDLE_ID,
				kind: "niche_definitions",
				rows: [
					{
						niche_id: DEATH_SAVE_NICHE_ID,
						bundle_id: BUNDLE_ID,
						display_name: "Death Saving Throw (self)",
						description:
							"actor-carried-verbs: self-only death-save roll while Unconscious and not Stable/Dead.",
						predicate_source: "",
						provider: "actor",
					},
				],
			},
		},
		{
			toolName: "spellkave_define_capability",
			label: "capability:death_save",
			params: {
				id: DEATH_SAVE_CAPABILITY_LOCAL_ID,
				actor_kind: "entity",
				display_name: "Roll a Death Saving Throw",
				description:
					"Turn-gated free self-action: an Unconscious character rolls a flat DC 10 check. " +
					"3 failures → Dead, 3 successes → Stable. Granted by Unconscious while active.",
				tags: ["srd.action"],
			},
		},
		// Heal-clear consequence invoked by Unconscious's ResourceDelta hook.
		{
			toolName: "spellkave_define_consequence",
			label: "consequence:death_save_heal_clear",
			params: {
				bundle: BUNDLE_ID,
				id: DEATH_SAVE_HEAL_CLEAR_CONSEQUENCE_LOCAL_ID,
				description:
					"HP rose above 0 while Unconscious: remove Unconscious + Stable and zero the death-save clock.",
				frame_writes: [
					// independent_lifetime: implies children are NOT auto-removed with
					// the parent — clear Unconscious cascade + Stable explicitly.
					...[
						UNCONSCIOUS_CONDITION_ID,
						STABLE_CONDITION_ID,
						INCAPACITATED_CONDITION_ID,
						INCAPACITATED_NO_ACTION_CONDITION_ID,
						INCAPACITATED_NO_BONUS_ACTION_CONDITION_ID,
						INCAPACITATED_NO_REACTION_CONDITION_ID,
					].map((condition_definition_id) => ({
						RemoveCondition: {
							target_kind: "entity",
							target_ref: "Actor",
							condition_definition_id,
							source_match: "Any",
						},
					})),
					{
						ModifyResource: {
							actor: "Actor",
							resource: DEATH_SAVE_SUCCESSES_ID,
							delta_source: deathSaveResetDeltaExpr(DEATH_SAVE_SUCCESSES_ID),
						},
					},
					{
						ModifyResource: {
							actor: "Actor",
							resource: DEATH_SAVE_FAILURES_ID,
							delta_source: deathSaveResetDeltaExpr(DEATH_SAVE_FAILURES_ID),
						},
					},
					{
						ModifyResource: {
							actor: "Actor",
							resource: DEATH_SAVE_LAST_ROLL_ID,
							delta_source: deathSaveResetDeltaExpr(DEATH_SAVE_LAST_ROLL_ID),
						},
					},
				],
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: "action:death_save_roll",
			params: {
				bundle: BUNDLE_ID,
				id: DEATH_SAVE_ACTION_LOCAL_ID,
				required_capability: DEATH_SAVE_CAPABILITY_ID,
				niche_id: DEATH_SAVE_NICHE_ID,
				display_name: "Roll a Death Saving Throw (DC 10)",
				description:
					"At 0 Hit Points you roll when you choose: no timer forces it. Each roll counts at once, so three failures can come within a minute if you roll fast. Waiting for a friend to heal you is allowed. DC 10: three successes wake you at 1 Hit Point, three failures kill you, and only the DM can bring back the dead.",
				self_eligible: true,
				// Free: SRD death saves are not an Action; incapacitated zeros the
				// primary channel so a spends_channel here would block the clock.
				predicate_source: eligibility,
				consequence: {
					description:
						"Capture one d20, tally success/failure (nat-1 extra failure, nat-20 +1 HP), " +
						"then flip Stable or Dead at threshold. Stable resets the clock; death keeps the failures, so the receipt reads 2 -> 3.",
					frame_writes: [
						// ordinal 0 — capture
						{
							ModifyResource: {
								actor: "Actor",
								resource: DEATH_SAVE_LAST_ROLL_ID,
								delta_source: deathSaveCaptureDeltaExpr(DEATH_SAVE_LAST_ROLL_ID),
							},
						},
						// ordinal 1 — success tally
						{
							ModifyResource: {
								actor: "Actor",
								resource: DEATH_SAVE_SUCCESSES_ID,
								delta_source: deathSaveSuccessTallyDeltaExpr(DEATH_SAVE_LAST_ROLL_ID),
							},
						},
						// ordinal 2 — failure tally
						{
							ModifyResource: {
								actor: "Actor",
								resource: DEATH_SAVE_FAILURES_ID,
								delta_source: deathSaveFailureTallyDeltaExpr(DEATH_SAVE_LAST_ROLL_ID),
							},
						},
						// ordinal 3 — nat-1 extra failure
						{
							ModifyResource: {
								actor: "Actor",
								resource: DEATH_SAVE_FAILURES_ID,
								delta_source: deathSaveNat1ExtraFailureDeltaExpr(DEATH_SAVE_LAST_ROLL_ID),
							},
						},
						// ordinal 4 — nat-20 regain 1 HP
						{
							ModifyResource: {
								actor: "Actor",
								resource: HP_RESOURCE_ID,
								delta_source:
									"cond(actor.stat('srd/death_save_last_roll') == 20 || actor.stat('srd/death_save_successes') >= 3 || actor.status('srd/condition/stable') == true, 1, 0)",
							},
						},
						// ordinal 5 — Stable threshold
						thresholdApplyStatus(`actor.stat('srd/hp') < 1 && ${stableWhen}`, STABLE_CONDITION_ID),
						// ordinal 6 — Dead threshold
						thresholdApplyStatus(deadWhen, DEAD_CONDITION_ID),
						// ordinal 7-9 — reset clock on Stable. Death keeps its tallies (sk-jay0.1.55.42);
						// srd/dm/revive clears them.
						...thresholdResetClock(stableWhen),
					],
				},
			},
		},
		// PLAYER observation reads outcome_template.description; names the window.
		{
			toolName: "spellkave_write_rows",
			label: "death-save-outcome-observation",
			params: {
				bundle: BUNDLE_ID,
				kind: "outcome_templates",
				rows: [
					{
						outcome_template_id: `${BUNDLE_ID}/${DEATH_SAVE_ACTION_LOCAL_ID}/outcome`,
						bundle_id: BUNDLE_ID,
						display_name: "Roll a Death Saving Throw (DC 10)",
						outcome_bool: true,
						manipulation_action_id: `${BUNDLE_ID}/${DEATH_SAVE_ACTION_LOCAL_ID}`,
						description:
							"You roll against death. No timer forces the next roll: you may wait for help. Three failures kill you, and only the DM can bring back the dead.",
					},
				],
			},
		},
	];

	const fragment = await driveUnitScene(
		BUNDLE_ID,
		withSrdTextNamespace([
			...calls,
			srdTextAttachmentWriteCall({
				targetKind: "resource_definition",
				targetRef: DEATH_SAVE_SUCCESSES_ID,
				extracted: markdownHeadingBlock("playing-the-game.md", "Dropping to 0 Hit Points"),
			}),
		]),
		target,
	);
	const header = [
		"# GENERATED by src/chapters/playing-the-game/fragments/death-saves.ts — DO NOT EDIT BY HAND.",
		"# Regenerate: pnpm --filter @spellkave/srd-cc run generate",
		"#",
		"# pattern: condition-hook-on-event",
		"# → packages/spellkave-world-author/docs/patterns/condition-hook-on-event.md",
		"#",
		"# PC death-save clock (sk-609b.18). Resources + free self-action roll.",
		"# Unconscious/Stable conditions: conditions.toml. Character-at-0-HP",
		"# ApplyStatus: attacks.toml characterUnconsciousFrameWrite.",
		"# Monster Death remains monster-only (weapon-attack-units.ts).",
		`# anchor: ${DEATH_SAVES_ANCHOR}`,
		"",
		"",
	].join("\n");
	return {
		toml: header + fragment,
		units: [
			{ kind: "resource_definitions", id: DEATH_SAVE_SUCCESSES_ID, sourcePk: "" },
			{ kind: "resource_definitions", id: DEATH_SAVE_FAILURES_ID, sourcePk: "" },
			{ kind: "resource_definitions", id: DEATH_SAVE_LAST_ROLL_ID, sourcePk: "" },
			{ kind: "niche_definitions", id: DEATH_SAVE_NICHE_ID, sourcePk: "" },
			{ kind: "capability_definitions", id: DEATH_SAVE_CAPABILITY_ID, sourcePk: "" },
			{ kind: "consequence_templates", id: DEATH_SAVE_HEAL_CLEAR_ID, sourcePk: "" },
			{ kind: "action_definitions", id: DEATH_SAVE_ACTION_ID, sourcePk: "" },
			{ kind: "affordance_templates", id: `${DEATH_SAVE_ACTION_ID}/affordance`, sourcePk: "" },
		],
	};
}
