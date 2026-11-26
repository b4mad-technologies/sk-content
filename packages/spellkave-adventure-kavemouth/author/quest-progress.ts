// pattern: quest-composition
// pattern: quest-xp-grant
import type { VerbCall } from "@spellkave/adventure-runtime/dm/lib";
import { CREATURE_NICHE_TAG } from "@spellkave/adventure-runtime/srd-ids";
import { COMPANION_ENTITY_KEYS } from "./lib/entity-keys.ts";
import { BUNDLE } from "./lib/ids.ts";
import { QUEST_BINDINGS, QUESTS, questBindings } from "./quests.ts";

/** Ysolde's work is an agreement with each visitor, including its reward latch. */
export const questProgressOnHero = (id: string): boolean =>
	Object.hasOwn(QUEST_BINDINGS, id) && questBindings(id).progress_home === "visitor";

export const questAcceptedState = (id: string): string =>
	Object.hasOwn(QUEST_BINDINGS, id)
		? questBindings(id).progress_state_id
		: `${BUNDLE}/quest/${id}/accepted`;
export const questXpAwardedState = (id: string): string =>
	Object.hasOwn(QUEST_BINDINGS, id)
		? questBindings(id).awarded_state_id
		: `${BUNDLE}/quest/${id}/xp-awarded`;
export const questRewardedState = (id: string): string =>
	Object.hasOwn(QUEST_BINDINGS, id)
		? questBindings(id).rewarded_state_id
		: `${BUNDLE}/quest/${id}/rewarded`;
export const questAcceptAction = (id: string): string =>
	Object.hasOwn(QUEST_BINDINGS, id)
		? questBindings(id).acceptance_action_id
		: `${BUNDLE}/quest/${id}/accept`;

/** Gameplay commitments and settled rewards survive the host. Conversation
 * steps and the currently offered choice remain private to the NPC brain. */
export function questProgressDefinitions(): VerbCall[] {
	return QUESTS.flatMap((quest) =>
		["accepted", "rewarded", "xp-awarded"].map((state) => ({
			toolName: "spellkave_define_resource",
			label: `quest-${quest.id}-${state}`,
			params: {
				bundle: BUNDLE,
				id: `quest/${quest.id}/${state}`,
				display_name: `${quest.name}: ${state}`,
				description: `Persistent ${state} outcome for ${quest.name}.`,
				min_value: 0,
				max_value: state === "accepted" ? 2 : 1,
				initial_value: 0,
				recovery_rule: "persistent",
			},
		})),
	);
}

/** Called after NPC placement; only the giver can record an accepted offer.
 * The reward latch belongs to the giver; recipient XP markers are independent. */
export function questProgressActions(): VerbCall[] {
	const companionXpHomes: VerbCall = {
		toolName: "spellkave_write_rows",
		label: "companion-quest-xp-homes",
		params: {
			bundle: BUNDLE,
			kind: "object_state",
			rows: Object.values(COMPANION_ENTITY_KEYS)
				.filter((key) => key !== COMPANION_ENTITY_KEYS.rogue)
				.map((entity_key) => ({
					bundle_id: BUNDLE,
					entity_key,
					state_id: "srd/xp",
					value_int: 0,
					source_template_id: "manifest",
				})),
		},
	};
	const questActions = QUESTS.flatMap((quest): VerbCall[] => {
		const capability = `${BUNDLE}/quest/${quest.id}/record-acceptance`;
		return [
			{
				toolName: "spellkave_define_capability",
				label: `quest-${quest.id}-capability`,
				params: {
					bundle: BUNDLE,
					id: `quest/${quest.id}/record-acceptance`,
					actor_kind: "entity",
					display_name: `Record ${quest.name}`,
					description: "Record the visitor's explicitly accepted offer.",
				},
			},
			{
				toolName: "spellkave_write_rows",
				label: `quest-${quest.id}-state`,
				params: {
					bundle: BUNDLE,
					kind: "object_state",
					rows: [
						...Object.values(COMPANION_ENTITY_KEYS)
							.filter((key) => key !== COMPANION_ENTITY_KEYS.rogue)
							.map((entity_key) => ({
								bundle_id: BUNDLE,
								entity_key,
								state_id: questXpAwardedState(quest.id),
								value_int: 0,
								source_template_id: "manifest",
							})),
						{
							bundle_id: BUNDLE,
							entity_key: quest.giverKey,
							state_id: questAcceptedState(quest.id),
							value_int: 0,
							value_bool: true,
							expires_at_tick: 0,
							source_template_id: "manifest",
						},
						{
							bundle_id: BUNDLE,
							entity_key: quest.giverKey,
							state_id: questRewardedState(quest.id),
							value_int: 0,
							value_bool: true,
							expires_at_tick: 0,
							source_template_id: "manifest",
						},
					],
				},
			},
			{
				toolName: "spellkave_write_rows",
				label: `quest-${quest.id}-grant`,
				params: {
					bundle: BUNDLE,
					kind: "actor_capabilities",
					rows: [
						{
							actor_entity_key: quest.giverKey,
							bundle_id: BUNDLE,
							capability_id: capability,
							source: BUNDLE,
							source_args_hash: "",
							elevation_class: "",
							extent_kind_ref: "",
							extent_ref: "",
						},
					],
				},
			},
			{
				toolName: "spellkave_define_action_verb",
				label: `quest-${quest.id}-accept`,
				params: {
					bundle: BUNDLE,
					id: `quest/${quest.id}/accept`,
					required_capability: capability,
					niche_id: CREATURE_NICHE_TAG,
					display_name: `Record ${quest.name} agreement`,
					description: "Record the accepted quest after the visitor chooses the offered answer.",
					predicate_source: `${questProgressOnHero(quest.id) ? "target" : "actor"}.stat('${questAcceptedState(quest.id)}') == 0`,
					self_eligible: !questProgressOnHero(quest.id),
					self_only: !questProgressOnHero(quest.id),
					cost_time_ms: 0,
					consequence: {
						frame_writes: [
							{
								ModifyResource: {
									actor: questProgressOnHero(quest.id) ? "TargetActor" : "Actor",
									resource: questAcceptedState(quest.id),
									delta_source: "1",
								},
							},
						],
					},
				},
			},
		];
	});
	return [companionXpHomes, ...questActions];
}
