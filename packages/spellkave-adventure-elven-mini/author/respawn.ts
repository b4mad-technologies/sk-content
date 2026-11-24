// pattern: actor-carried-verbs
/**
 * Owner decision D-1 (`ledger/designs/solo-beta-definition.md`, gate P-5,
 * bead sk-jay0.1.55.42): a hero that is down or dead is never left without an
 * action. It can give up the fight and wake at the inn the next morning, at
 * full health, with its quest state, its experience and its gear. The cost
 * is coin, never experience: the first rung holds 350 XP for a threshold of
 * 300, so an XP cost could make level 2 unreachable.
 *
 * SHAPE: the hero does this itself. No DM act and no host watch is involved,
 * so the same rows work on any host. One capability that every hero holds
 * through its `srd.party.heroes` tag (the `tag_capability_grant` idiom the
 * ruleset uses for the rests, pattern `identity-tag-capability-grant`), one
 * actor-provided niche, and two legacy self-only verbs with complementary gates:
 *
 * - `respawn/wake-at-inn` — the hero holds at least one gold piece and pays
 *   {@link RESPAWN_COIN_COST}.
 * - `respawn/wake-at-inn-penniless` — the hero holds none and pays nothing.
 *
 * The public `action/wake-at-inn` ID is also executable (sk-jay0.1.55.67).
 * Its resolution predicate selects the paid or penniless consequence from inventory;
 * the player does not need to infer a different action ID from a capability.
 * The two existing direct verbs remain available for client compatibility.
 *
 * Separate consequences, because `RemoveItem` proves possession before any write: one
 * verb that always took a coin would refuse a penniless hero and leave it on
 * the floor. The cost is a fixed count because the manifest has no read of
 * how many coins an actor holds; a real share of the purse needs that read
 * (bead filed from sk-jay0.1.55.60.3).
 *
 * No recovery verb spends an action-economy channel. Incapacitated zeroes the
 * channels, so a verb that spent one could never be taken by the body it is
 * for (the same reason `srd/death_save/roll` is free). The capability is the
 * adventure's own, so the capability list that Dead suppresses does not
 * name it: a dead hero keeps the verb.
 *
 * The conditions are cleared apply-then-remove, the idiom of `srd/dm/revive`
 * (`packages/spellkave-srd-cc/src/chapters/classes/dm-act-units.ts`): a
 * removal then always has a row to act on, whether the hero was dead, only
 * unconscious, or stable.
 */
import type { VerbCall } from "@spellkave/adventure-runtime/dm/lib";
import { ADVENTURE_HERO_WAKE_NODE_ID } from "./hero.ts";
import { BUNDLE } from "./lib/ids.ts";

export const RESPAWN_CAPABILITY_ID = `${BUNDLE}/action/wake-at-inn`;
export const RESPAWN_PUBLIC_ACTION_ID = RESPAWN_CAPABILITY_ID;
export const RESPAWN_NICHE_ID = `${BUNDLE}/niche/wake-at-inn`;
export const RESPAWN_ACTION_ID = `${BUNDLE}/respawn/wake-at-inn`;
export const RESPAWN_PENNILESS_ACTION_ID = `${BUNDLE}/respawn/wake-at-inn-penniless`;
/** Gold pieces a hero with coin pays to wake at the inn. */
export const RESPAWN_COIN_COST = 1;

const GOLD_PIECE = "srd/item/gold-piece";
/** Every hero body carries this from the candidate blueprint on (`creation-candidate.ts`). */
const HERO_TAG = "srd.party.heroes";
const DOWN =
	"actor.status('srd/condition/unconscious') == true || actor.status('srd/condition/dead') == true";
/** Cleared in this order: Dead and Unconscious first, then what they imply
 * (implied children have their own lifetime and are not removed with the parent). */
const CLEARED_CONDITIONS = [
	"srd/condition/dead",
	"srd/condition/unconscious",
	"srd/condition/stable",
	"srd/condition/incapacitated",
	"srd/condition/incapacitated/no-action",
	"srd/condition/incapacitated/no-bonus-action",
	"srd/condition/incapacitated/no-reaction",
];
const DEATH_SAVE_TALLIES = [
	"srd/death_save_failures",
	"srd/death_save_successes",
	"srd/death_save_last_roll",
];
const PLAYER_CHARACTER_TAG = "srd.player_character";
/** Full health as the long rest writes it: the hero's real maximum, not the
 * resource ceiling. Kept byte-equal to `srd/rest/long/complete/success`
 * ordinal 2 by `tests/offline/respawn-at-inn.test.ts`, which reads the SRD
 * fixture; the adventure does not import ruleset generators. */
export const FULL_HEALTH =
	"cond(actor.has_tag('srd.player_character'), max(0, macro('srd/hit_point_maximum') - actor.stat('srd/hp')), actor.resource_max('srd/hp') - actor.stat('srd/hp'))";

function wakeFrameWrites(payCoin: boolean): Record<string, unknown>[] {
	return [
		...(payCoin
			? [
					{
						RemoveItem: {
							source: { ActorInventoryItem: { actor_ref: "Actor", item_def_id: GOLD_PIECE } },
							count: RESPAWN_COIN_COST,
						},
					},
				]
			: []),
		...CLEARED_CONDITIONS.flatMap((condition_definition_id) => [
			{ ApplyStatus: { condition_definition_id, target_kind: "entity", target_ref: "Actor" } },
			{
				RemoveCondition: {
					condition_definition_id,
					source_match: "Any",
					target_kind: "entity",
					target_ref: "Actor",
				},
			},
		]),
		// pattern: rest-boundary-resource-refill
		// A newly downed hero may not have rolled a death save yet. Materialize
		// each counter before reading it, preserving an existing value until reset.
		...DEATH_SAVE_TALLIES.flatMap((resource) => [
			{ ModifyResource: { actor: "Actor", resource, delta_source: "0" } },
			{
				ModifyResource: { actor: "Actor", resource, delta_source: `0 - actor.stat('${resource}')` },
			},
		]),
		{ ModifyResource: { actor: "Actor", resource: "srd/hp", delta_source: FULL_HEALTH } },
		{
			RelocateEntity: {
				target_ref: "Actor",
				destination: { kind: "place_node", id: ADVENTURE_HERO_WAKE_NODE_ID },
			},
		},
	];
}

export function respawn(): VerbCall[] {
	const verb = (id: string, label: string, payCoin: boolean): VerbCall => ({
		toolName: "spellkave_define_action_verb",
		label,
		params: {
			bundle: BUNDLE,
			id,
			required_capability: RESPAWN_CAPABILITY_ID,
			niche_id: RESPAWN_NICHE_ID,
			display_name: payCoin
				? "Give up and wake at the inn"
				: "Give up and wake at the inn (no coin)",
			description: payCoin
				? `You stop fighting for your life. Someone carries you back, and you wake in the inn loft the next morning at full health. It costs you ${RESPAWN_COIN_COST} gold piece. You keep your experience, your quests and your gear.`
				: "You stop fighting for your life. Someone carries you back, and you wake in the inn loft the next morning at full health. You have no coin to pay with, so it costs you nothing. You keep your experience, your quests and your gear.",
			// `||` binds tighter than `&&` and boolean terms take no parentheses
			// (dsl-grammar.md): this reads as coin-gate && (unconscious || dead).
			// Player characters only: a companion carries the party tag too, and a
			// companion that woke at the inn by itself would leave its hero behind.
			predicate_source: `actor.has_tag('${PLAYER_CHARACTER_TAG}') && actor.has_item('${GOLD_PIECE}') == ${payCoin} && ${DOWN}`,
			self_eligible: true,
			self_only: true,
			cost_time_ms: 0,
			consequence: {
				description:
					"Clears Dead, Unconscious, Stable and Incapacitated, zeroes the death-save tallies, restores Hit Points to the hero's maximum and sets the hero down in the inn loft.",
				frame_writes: wakeFrameWrites(payCoin),
			},
		},
	});
	const publicVerb = verb("action/wake-at-inn", "respawn-public-wake-at-inn", true);
	publicVerb.params = {
		...publicVerb.params,
		description: `You stop fighting for your life. Someone carries you back, and you wake in the inn loft the next morning at full health. You pay ${RESPAWN_COIN_COST} gold piece if you have coin; otherwise it costs nothing. You keep your experience, your quests and your gear.`,
		predicate_source: `actor.has_tag('${PLAYER_CHARACTER_TAG}') && ${DOWN}`,
		// Stochastic is the schema's predicate-selected consequence mode; this
		// inventory predicate draws no dice. Both branches restore the hero.
		resolution_mode: "Stochastic",
		resolution_predicate_source: `actor.has_item('${GOLD_PIECE}')`,
		on_failure: `${RESPAWN_PENNILESS_ACTION_ID}/success`,
	};
	return [
		{
			toolName: "spellkave_define_capability",
			label: "respawn-capability",
			params: {
				bundle: BUNDLE,
				id: "action/wake-at-inn",
				actor_kind: "entity",
				display_name: "Wake at the inn",
				description:
					"A hero that is down or dead may give up the fight and wake at the inn the next morning.",
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "respawn-niche",
			params: {
				bundle: BUNDLE,
				kind: "niche_definitions",
				rows: [
					{
						niche_id: RESPAWN_NICHE_ID,
						bundle_id: BUNDLE,
						display_name: "Wake at the inn (self)",
						description: "actor-carried-verbs: self-only way back for a hero that is down or dead.",
						predicate_source: "",
						provider: "actor",
					},
				],
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "respawn-grant-to-heroes",
			params: {
				bundle: BUNDLE,
				kind: "tag_capability_grant",
				rows: [{ bundle_id: BUNDLE, tag: HERO_TAG, capability_id: RESPAWN_CAPABILITY_ID }],
			},
		},
		verb("respawn/wake-at-inn", "respawn-wake-at-inn", true),
		verb("respawn/wake-at-inn-penniless", "respawn-wake-at-inn-penniless", false),
		publicVerb,
	];
}
