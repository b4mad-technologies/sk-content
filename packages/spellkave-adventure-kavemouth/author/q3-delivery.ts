// pattern: milestone-gate-terminal-flags
/**
 * Q3 "Tamsin's Basket" can be finished (bead sk-jay0.3.4.11, found again by
 * the scripted player under sk-jay0.1.55.60.17). Its terminal is "the hero
 * holds the moonpetal AND the flag `q3_delivered` is set"
 * (`author/quests.toml`). The quest source bound that flag to a state from
 * the start, but no resource defined the state and nothing wrote it, so the
 * terminal stayed unknown whatever a player did.
 *
 * SHAPE, the one `tomb-key.ts` uses for Q9: one resource for the public
 * milestone, one capability every hero holds through its party tag, one
 * niche attached to the place where Old Tamsin stands (the village green,
 * where the moonpetal also grows), and one verb there. The verb is offered
 * to a hero that holds the moonpetal and sets the flag on the hero.
 *
 * The hero KEEPS the flower: the terminal the DM reads needs both the item
 * and the flag, and an inventory read by the DM alone is not a milestone
 * (the same reason Q9 records a public outcome). The first write is a zero
 * delta: it creates the flag on a hero made before this row existed, and the
 * gate therefore never reads the flag (a read of a state the actor never had
 * fails closed). Handing it over twice changes nothing; the flag stops at 1.
 */
import type { VerbCall } from "@spellkave/adventure-runtime/dm/lib";
import { BUNDLE, GRAPHS, nodeId } from "./lib/ids.ts";
import { questFlagState } from "./quests.ts";

export const Q3_DELIVERED_FLAG = "q3_delivered";
export const Q3_DELIVERED_RESOURCE = questFlagState(Q3_DELIVERED_FLAG);
export const Q3_DELIVERY_CAPABILITY_ID = `${BUNDLE}/quest/deliver-moonpetal`;
export const Q3_DELIVERY_NICHE_ID = `${BUNDLE}/niche/tamsins-basket`;
export const Q3_DELIVERY_ACTION_ID = `${BUNDLE}/quest/deliver-moonpetal`;
/** Old Tamsin's place (`storyline-npcs.ts`). */
export const Q3_DELIVERY_NODE = nodeId(GRAPHS.village, "green");

const MOONPETAL_DEFINITION = `${BUNDLE}/adventure/item/moonpetal`;
const HERO_TAG = "srd.party.heroes";

export function q3DeliveryDefinitions(): VerbCall[] {
	return [
		{
			toolName: "spellkave_define_resource",
			label: "q3-delivered-flag",
			params: {
				bundle: BUNDLE,
				id: `quest/flag/${Q3_DELIVERED_FLAG}`,
				display_name: "Moonpetal handed to Tamsin",
				description: "The hero has brought Old Tamsin the moonpetal she asked for.",
				min_value: 0,
				max_value: 1,
				initial_value: 0,
				recovery_rule: "persistent",
			},
		},
	];
}

export function q3DeliveryActions(): VerbCall[] {
	return [
		{
			toolName: "spellkave_define_capability",
			label: "q3-delivery-capability",
			params: {
				bundle: BUNDLE,
				id: "quest/deliver-moonpetal",
				actor_kind: "entity",
				display_name: "Hand over the moonpetal",
				description: "Bring Old Tamsin the moonpetal for her basket.",
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "q3-delivery-grant-to-heroes",
			params: {
				bundle: BUNDLE,
				kind: "tag_capability_grant",
				rows: [{ bundle_id: BUNDLE, tag: HERO_TAG, capability_id: Q3_DELIVERY_CAPABILITY_ID }],
			},
		},
		{
			toolName: "spellkave_define_niche",
			label: "q3-delivery-niche",
			params: {
				bundle: BUNDLE,
				id: "niche/tamsins-basket",
				display_name: "Old Tamsin's basket",
				description: "The empty basket Old Tamsin holds out on the village green.",
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "q3-delivery-place",
			params: {
				bundle: BUNDLE,
				kind: "spatial_niche_attachments",
				rows: [
					{ bundle_id: BUNDLE, place_node_id: Q3_DELIVERY_NODE, niche_id: Q3_DELIVERY_NICHE_ID },
				],
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: "q3-deliver-moonpetal",
			params: {
				bundle: BUNDLE,
				id: "quest/deliver-moonpetal",
				required_capability: Q3_DELIVERY_CAPABILITY_ID,
				niche_id: Q3_DELIVERY_NICHE_ID,
				display_name: "Hand the moonpetal to Old Tamsin",
				description:
					"You lay the moonpetal in Old Tamsin's basket. She takes what she needs for her brew and presses the bloom back into your hand.",
				predicate_source: `actor.has_item('${MOONPETAL_DEFINITION}')`,
				cost_time_ms: 0,
				range_m: 0,
				consequence: {
					description: "Records on the hero that the moonpetal reached Old Tamsin.",
					frame_writes: [
						{
							ModifyResource: {
								actor: "Actor",
								resource: Q3_DELIVERED_RESOURCE,
								delta_source: "0",
							},
						},
						{
							ModifyResource: {
								actor: "Actor",
								resource: Q3_DELIVERED_RESOURCE,
								delta_source: `1 - actor.stat('${Q3_DELIVERED_RESOURCE}')`,
							},
						},
					],
				},
			},
		},
	];
}
