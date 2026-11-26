/** Adventure-specific DM acts are authored once; live callers address current bodies. */
import {
	type AuthoredAct,
	authoredActCalls,
} from "@spellkave/adventure-runtime/author/dm/authored-act";
import { questRewardActs } from "@spellkave/adventure-runtime/author/dm/quest-xp-acts";
import { buildSpatialNicheAttachment, type VerbCall } from "@spellkave/adventure-runtime/dm/lib";
import { COMPANION_AGREEMENT_STATE, COMPANION_SPAWNED_STATE } from "./companion-agreement.ts";
import {
	BOND_RECORDED_RESOURCE,
	COMPANION_BONDED_RESOURCE,
	STONE_CARRIED_RESOURCE,
} from "./companion-stone.ts";
import { ADVENTURE_CANDIDATE_DEF_ID, CREATION_LIMBO_NODE_ID } from "./creation-candidate.ts";
import { BUNDLE } from "./lib/ids.ts";
import { questAcceptedState, questRewardedState, questXpAwardedState } from "./quest-progress.ts";
import { QUESTS, questBindings } from "./quests.ts";
import {
	ROGUE_COMPANION_DEF_ID,
	ROGUE_DEFAULT_JOIN_NODE,
	ROGUE_JOIN_ACTION_ID,
} from "./rogue-companion.ts";

export const COMMAND_BOND_CONDITION = `${BUNDLE}/companion/command-bond-active`;

const modify = (resource: string, delta_source: string) => ({
	ModifyResource: { actor: "TargetActor", resource, delta_source },
});

export function adventureDmActs(): VerbCall[] {
	const acts: AuthoredAct[] = questRewardActs({
		bundle: BUNDLE,
		quests: QUESTS,
		awardActionId: (id) => questBindings(id).award_action_id,
		settleActionId: (id) => questBindings(id).settle_action_id,
		awardedStateId: questXpAwardedState,
		acceptedStateId: questAcceptedState,
		rewardedStateId: questRewardedState,
	});

	acts.push(
		{
			id: `${BUNDLE}/dm/record-bond`,
			capability: "frontier.set_state",
			predicate: `target.stat('${STONE_CARRIED_RESOURCE}') == 1 && target.stat('${BOND_RECORDED_RESOURCE}') == 0`,
			writes: [
				{
					ApplyStatus: {
						target_kind: "entity",
						target_ref: "TargetActor",
						condition_definition_id: COMMAND_BOND_CONDITION,
					},
				},
				modify(BOND_RECORDED_RESOURCE, "1"),
			],
		},
		{
			id: `${BUNDLE}/dm/mark-bonded`,
			capability: "frontier.set_state",
			predicate: `target.stat('${COMPANION_BONDED_RESOURCE}') == 0`,
			writes: [modify(COMPANION_BONDED_RESOURCE, "1")],
		},
	);
	return [
		{
			toolName: "spellkave_define_condition",
			label: "delayed-command-bond",
			params: {
				bundle: BUNDLE,
				id: "companion/command-bond-active",
				display_name: "Recorded companion bond",
				description:
					"The bearer may address the authored companion extent after the DM records the bond.",
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "delayed-command-bond-extent",
			params: {
				bundle: BUNDLE,
				kind: "condition_capability_extent_grants",
				rows: [
					{
						bundle_id: BUNDLE,
						condition_definition_id: COMMAND_BOND_CONDITION,
						capability_id: `${BUNDLE}/companion/command-bond`,
						extent_kind_ref: "party",
						extent_ref: "kavemouth.companion.bond",
					},
				],
			},
		},
		...authoredActCalls(BUNDLE, acts),
		{
			toolName: "spellkave_write_rows",
			label: "late-rogue-spawn-effect",
			params: {
				bundle: BUNDLE,
				kind: "effect_definitions",
				rows: [
					{
						bundle_id: BUNDLE,
						effect_def_id: `${BUNDLE}/dm/join-rogue/spawn`,
						primitives_csv: "Spawn",
						parameters_schema_json: JSON.stringify({
							blueprint_id: ROGUE_COMPANION_DEF_ID,
							location_ref: { kind: "place_node", id: ROGUE_DEFAULT_JOIN_NODE },
							unbound_actor: true,
						}),
					},
				],
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: "late-rogue-join",
			params: {
				bundle: BUNDLE,
				id: ROGUE_JOIN_ACTION_ID.slice(BUNDLE.length + 1),
				display_name: "Join the accepted companion",
				description: "Spawn the agreed companion with its authored sheet and kit.",
				required_capability: "frontier.spawn_entity_definition",
				niche_id: `${BUNDLE}/dm/act-target`,
				predicate_source: `target.stat('${COMPANION_AGREEMENT_STATE}') == 1 && target.stat('${COMPANION_SPAWNED_STATE}') == 0`,
				cost_time_ms: 0,
				consequence: {
					effect_ref: `${BUNDLE}/dm/join-rogue/spawn`,
					frame_writes: [
						{
							SetEntityTag: {
								entity: "SpawnedEntity",
								tag: { allowed_ids: ["srd.faction.party"] },
								present: true,
							},
						},
						{
							ModifyResource: {
								actor: "TargetActor",
								resource: COMPANION_SPAWNED_STATE,
								delta_source: "1",
							},
						},
					],
				},
			},
		},

		{
			toolName: "spellkave_write_rows",
			label: "open-seat-spawn-effect",
			params: {
				bundle: BUNDLE,
				kind: "effect_definitions",
				rows: [
					{
						bundle_id: BUNDLE,
						effect_def_id: `${BUNDLE}/dm/open-seat/spawn`,
						primitives_csv: "Spawn",
						parameters_schema_json: JSON.stringify({
							blueprint_id: ADVENTURE_CANDIDATE_DEF_ID,
							location_ref: { kind: "binding", id: "TargetSpatialRef" },
							unbound_actor: true,
						}),
					},
				],
			},
		},
		buildSpatialNicheAttachment({
			bundle: BUNDLE,
			nicheId: "core/mark_surface",
			placeNodeId: CREATION_LIMBO_NODE_ID,
		}),
		{
			toolName: "spellkave_define_action_verb",
			label: "open-creation-seat",
			params: {
				bundle: BUNDLE,
				id: "dm/open-seat",
				display_name: "Open a creation seat",
				description: "Spawn an unbound world-owned playable vessel at the creation station.",
				required_capability: "frontier.spawn_entity_definition",
				niche_id: "core/mark_surface",
				cost_time_ms: 0,
				consequence: {
					effect_ref: `${BUNDLE}/dm/open-seat/spawn`,
					// The host classifies admitted instance faction rows. Materialize
					// that identity on this world-owned body; protected Party extent
					// membership remains blueprint-owned and is never written here.
					frame_writes: [
						{
							SetEntityTag: {
								entity: "SpawnedEntity",
								tag: { allowed_ids: ["srd.faction.party"] },
								present: true,
							},
						},
					],
				},
			},
		},
	];
}
