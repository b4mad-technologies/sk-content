import type { VerbCall } from "../../../verb-runner";
import {
	OBJECT_INTERACTION_CHANNEL_ID,
	PRIMARY_CHANNEL_ID,
	PROOF_BUNDLE_ID,
	PROOF_ENTITY_KEY,
	PROOF_FREE_LEVER_ACTION_ID,
	PROOF_FREE_OBJECT_INTERACTION_CAPABILITY_ID,
	PROOF_LEVER_ENTITY_KEY,
	PROOF_LEVER_NICHE_ID,
	PROOF_LEVER_PULLS_STATE_ID,
	PROOF_PLACE_NODE_ID,
	PROOF_UTILIZE_CAPABILITY_ID,
	PROOF_UTILIZE_LEVER_ACTION_ID,
} from "..";

export const OBJECT_INTERACTION_DEFINITION_CALLS: readonly VerbCall[] = [
	{
		toolName: "spellkave_define_capability",
		label: "proof-free-object-interaction-capability",
		params: {
			bundle: PROOF_BUNDLE_ID,
			id: "object-interaction/free",
			display_name: "Free Object Interaction (proof)",
			actor_kind: "entity",
			description: "TEST-ONLY eligibility for the SRD's one free object interaction per turn.",
		},
	},
	{
		toolName: "spellkave_define_niche",
		label: "proof-interactable-lever-niche",
		params: {
			bundle: PROOF_BUNDLE_ID,
			id: "object-interaction/lever",
			display_name: "Interactable Lever (proof)",
			description: "TEST-ONLY target niche for the concrete object-interaction vertical.",
			attachments: [{ node: PROOF_PLACE_NODE_ID }],
		},
	},
	{
		toolName: "spellkave_define_resource",
		label: "proof-lever-pulls-counter",
		params: {
			bundle: PROOF_BUNDLE_ID,
			id: "object-interaction/lever-pulls",
			display_name: "Lever pulls (proof counter)",
			value_kind: "int",
			min_value: 0,
			max_value: 1000000,
			initial_value: 0,
			recovery_rule: "persistent",
			description:
				"TEST-ONLY visible counter incremented by every admitted pull of the proof lever.",
		},
	},
	{
		toolName: "spellkave_define_action_verb",
		label: "proof-pull-lever-free",
		params: {
			bundle: PROOF_BUNDLE_ID,
			id: PROOF_FREE_LEVER_ACTION_ID.slice(`${PROOF_BUNDLE_ID}/`.length),
			required_capability: PROOF_FREE_OBJECT_INTERACTION_CAPABILITY_ID,
			niche_id: PROOF_LEVER_NICHE_ID,
			display_name: "Pull Lever — Free Interaction",
			description: "Pull the nearby lever using this turn's one free object interaction.",
			spends_channel: OBJECT_INTERACTION_CHANNEL_ID,
			cost_time_ms: 0,
			consequence: {
				description: "Move the proof lever once.",
				frame_writes: [
					{
						ModifyResource: {
							actor: "TargetActor",
							delta_source: "1",
							resource: PROOF_LEVER_PULLS_STATE_ID,
						},
					},
				],
			},
		},
	},
	{
		toolName: "spellkave_define_action_verb",
		label: "proof-pull-lever-utilize",
		params: {
			bundle: PROOF_BUNDLE_ID,
			id: PROOF_UTILIZE_LEVER_ACTION_ID.slice(`${PROOF_BUNDLE_ID}/`.length),
			required_capability: PROOF_UTILIZE_CAPABILITY_ID,
			niche_id: PROOF_LEVER_NICHE_ID,
			display_name: "Pull Lever — Utilize",
			description:
				"Pull the nearby lever as an additional interaction by taking the Utilize action.",
			spends_channel: PRIMARY_CHANNEL_ID,
			cost_time_ms: 0,
			consequence: {
				description: "Move the proof lever once.",
				frame_writes: [
					{
						ModifyResource: {
							actor: "TargetActor",
							delta_source: "1",
							resource: PROOF_LEVER_PULLS_STATE_ID,
						},
					},
				],
			},
		},
	},
];

export const OBJECT_INTERACTION_SCENE_CALLS: readonly VerbCall[] = [
	{
		toolName: "spellkave_place_entity",
		label: "proof-interactable-lever-placement",
		params: {
			bundle: PROOF_BUNDLE_ID,
			kind: "item",
			at: PROOF_PLACE_NODE_ID,
			key_prefix: "lever",
			description:
				"TEST-ONLY inanimate lever for the first playable Exploration object interaction.",
			// sk-9ll.7: the lever's own niche-opening INSTANCE entity_tag, folded into
			// the placement call itself instead of a separate spellkave_write_rows
			// (entity_tag) call — placementToolDef's `tags` param exists precisely so
			// this doesn't need its own call.
			tags: [PROOF_LEVER_NICHE_ID],
		},
	},
	{
		toolName: "spellkave_write_rows",
		label: "proof-interactable-lever-pulls-seed",
		params: {
			bundle: PROOF_BUNDLE_ID,
			kind: "object_state",
			rows: [
				{
					bundle_id: PROOF_BUNDLE_ID,
					entity_key: PROOF_LEVER_ENTITY_KEY,
					source_template_id: `${PROOF_BUNDLE_ID}/object-interaction`,
					state_id: PROOF_LEVER_PULLS_STATE_ID,
					value_int: 0,
					visibility: "Public",
				},
			],
		},
	},
	{
		toolName: "spellkave_write_rows",
		label: "proof-object-interaction-hero-grants",
		params: {
			bundle: PROOF_BUNDLE_ID,
			kind: "actor_capabilities",
			rows: [
				{
					actor_entity_key: PROOF_ENTITY_KEY,
					bundle_id: PROOF_BUNDLE_ID,
					capability_id: PROOF_FREE_OBJECT_INTERACTION_CAPABILITY_ID,
					source: `${PROOF_BUNDLE_ID}/object-interaction`,
				},
				{
					actor_entity_key: PROOF_ENTITY_KEY,
					bundle_id: PROOF_BUNDLE_ID,
					capability_id: PROOF_UTILIZE_CAPABILITY_ID,
					source: `${PROOF_BUNDLE_ID}/object-interaction`,
				},
			],
		},
	},
];
