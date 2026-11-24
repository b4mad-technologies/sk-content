/**
 * The loft chest holds two existing potions, taken through srd/pickup.
 * Its hinged lid has an authored open state and reversible operations.
 * The instance policy in containment-policies.ts uses this lid state for both
 * contents exposure and removal access. This does not implement a lock.
 * Pattern: container-with-loot. No operation creates or relocates an item.
 */
import type { VerbCall } from "@spellkave/adventure-runtime/dm/lib";
import { asEntityRef } from "@spellkave/sdk";
import { INNKEEPER_ENTITY_KEY } from "./lib/entity-keys.ts";
import { BUNDLE, GRAPHS, nodeId } from "./lib/ids.ts";

/** SRD-CC's own blueprint (`fixtures/base/equipment/gear/chest.toml`,
 * `srd.item.container`) — no local elven_mini entity_definition. A
 * cross-bundle entity_def reference is legal (MF-VAL-291; `elven_mini`
 * depends on `srd`, `occupancy.ts`'s own Mira/Commoner adoption precedent). */
const CHEST_DEF_ID = "srd/item/chest";
/** SRD magic-items chapter blueprint (`chapters/magic-items/loot-tables.ts`
 * LOOT_CODES.potionHealing resolves the same id). */
const POTION_OF_HEALING_DEF_ID = "srd/item/potion-of-healing";

export const LOFT_CHEST_KEY_PREFIX = "adventure/item/loft_chest";
export const LOFT_CHEST_KEY = asEntityRef(`${BUNDLE}/${LOFT_CHEST_KEY_PREFIX}_1`);

const LOFT_CHEST_POTION_KEY_PREFIX = "adventure/item/loft_chest_potion";
export const LOFT_CHEST_POTION_COUNT = 2;
/** `key_prefix` + `count` always restarts numbering at 1 for THIS prefix on
 * every call (`spellkave_place_entity`'s own doc note) — deterministic,
 * idempotent keys, not a runtime return value this static call list could
 * capture. */
export const LOFT_CHEST_POTION_KEYS = Array.from({ length: LOFT_CHEST_POTION_COUNT }, (_, i) =>
	asEntityRef(`${BUNDLE}/${LOFT_CHEST_POTION_KEY_PREFIX}_${i + 1}`),
);

export const LOFT_CHEST_OPEN_STATE = `${BUNDLE}/adventure/loft-chest/open`;
const LOFT_CHEST_TAG = `${BUNDLE}.loft_chest.hinged`;
export const LOFT_CHEST_NICHE = `${BUNDLE}/adventure/loft-chest/lid`;

/** Lid operations act on the targeted furniture through existing frame writes. */
export function loftChestLid(): VerbCall[] {
	return [
		{
			toolName: "spellkave_define_resource",
			label: "loft-chest-open-state",
			params: {
				bundle: BUNDLE,
				id: "adventure/loft-chest/open",
				display_name: "Lid open",
				description: "The chest lid is closed (0) or open (1).",
				min_value: 0,
				max_value: 1,
				initial_value: 0,
				recovery_rule: "persistent",
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "loft-chest-lid-niche",
			params: {
				bundle: BUNDLE,
				kind: "niche_definitions",
				rows: [
					{
						bundle_id: BUNDLE,
						niche_id: LOFT_CHEST_NICHE,
						display_name: "Hinged chest lid",
						description: "A grounded chest with a hinged lid.",
						provider: "entity",
						// Entity niche admission exposes tags as niche facts (fixture-correctness S1).
						predicate_source: `target.has_niche('${LOFT_CHEST_TAG}') && target.has_niche('core/grounded')`,
					},
				],
			},
		},
		...[
			{ verb: "open", label: "Open", value: 1, text: "The chest lid creaks open." },
			{ verb: "close", label: "Close", value: 0, text: "The chest lid settles shut." },
		].flatMap(({ verb, label, value, text }): VerbCall[] => [
			{
				toolName: "spellkave_define_trace_kind",
				label: `loft-chest-${verb}-trace`,
				params: {
					bundle: BUNDLE,
					id: `adventure/loft-chest/${verb}-sound`,
					location_kinds: "entity",
					description: text,
					schema_json: "{}",
				},
			},
			{
				toolName: "spellkave_define_action_verb",
				label: `loft-chest-${verb}`,
				params: {
					bundle: BUNDLE,
					id: `adventure/loft-chest/${verb}`,
					required_capability: "srd/action/pickup",
					niche_id: LOFT_CHEST_NICHE,
					display_name: label,
					description: `${label} the hinged chest lid.`,
					predicate_source: `target.stat('${LOFT_CHEST_OPEN_STATE}') == ${1 - value}`,
					spends_channel: "srd/economy_channel/object_interaction",
					cost_time_ms: 0,
					non_steering: true,
					consequence: {
						frame_writes: [
							{
								ModifyResource: {
									actor: "TargetActor",
									resource: LOFT_CHEST_OPEN_STATE,
									delta_source: `${value} - target.stat('${LOFT_CHEST_OPEN_STATE}')`,
								},
							},
							{
								Inscribe: {
									kind: `${BUNDLE}/adventure/loft-chest/${verb}-sound`,
									location_kind: "binding",
									location_ref: "TargetEntityRef",
									payload_json: "{}",
									expires_after_ticks: 2,
								},
							},
						],
					},
				},
			},
		]),
	];
}

export const LOFT_NODE_ID = nodeId(GRAPHS.inn, "loft");

/** Furniture placement + stocking. Must compose AFTER `occupancy()`, which
 * places `INNKEEPER_ENTITY_KEY` — this file's own `spellkave_stow_item`
 * calls need that actor already placed (`adventure.ts`'s own ordering). */
export function loftChestOccupancy(): VerbCall[] {
	return [
		...loftChestLid(),
		{
			toolName: "spellkave_place_entity",
			label: "place-loft-chest",
			params: {
				bundle: BUNDLE,
				kind: "item",
				entity_def: CHEST_DEF_ID,
				at: LOFT_NODE_ID,
				key_prefix: LOFT_CHEST_KEY_PREFIX,
				// Verbatim entities.name (sk-ntz.1) — the SRD display name, not the
				// derived "Srd Item Chest 1" title-cased default.
				name: "Chest",
				description: "A plain traveler's chest at the foot of the loft bed, with a hinged lid.",
				tags: [LOFT_CHEST_TAG],
				resources: [{ resource: LOFT_CHEST_OPEN_STATE, value: 0 }],
			},
		},
		{
			toolName: "spellkave_place_entity",
			label: "place-loft-chest-potions",
			params: {
				bundle: BUNDLE,
				kind: "item",
				entity_def: POTION_OF_HEALING_DEF_ID,
				at: LOFT_NODE_ID,
				count: LOFT_CHEST_POTION_COUNT,
				key_prefix: LOFT_CHEST_POTION_KEY_PREFIX,
				// name_prefix (sk-jay0.7.15.3) keeps the ordinal: "Potion of Healing 1/2".
				name_prefix: "Potion of Healing",
				description: "A corked vial of Potion of Healing, tucked in the loft chest.",
			},
		},
		...LOFT_CHEST_POTION_KEYS.map(
			(itemKey, i): VerbCall => ({
				toolName: "spellkave_stow_item",
				label: `stow-loft-chest-potion-${i + 1}`,
				params: {
					bundle: BUNDLE,
					actor_entity_key: INNKEEPER_ENTITY_KEY,
					item_entity_key: itemKey,
					container_entity_key: LOFT_CHEST_KEY,
				},
			}),
		),
	];
}
