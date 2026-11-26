/**
 * // pattern: draft-then-confirm-wizard
 *
 * Level-1 pregen hero for the kavemouth adventure playthrough.
 * Starts asleep in the inn loft with a small field kit.
 *
 * The body IS `srd/pregen/fighter`. Species (Human) and background (Soldier)
 * are instance tags on this person; Soldier Athletics is an instance grant.
 * Numbers live on the catalog blueprint — this file only places and names.
 */

import type { CreationStarterKit } from "@spellkave/adventure-runtime/author/dm/creation-composition";
import type { VerbCall } from "@spellkave/adventure-runtime/dm/lib";
import {
	BACKGROUND_TAG_PREFIX,
	CLASS_TAG_PREFIX,
	ITEM_CONTAINER_TAG,
	ITEM_FOOD_TAG,
	ITEM_GEAR_TAG,
	ITEM_LIGHT_TAG,
	LEVEL_STATE_ID,
	MAIN_HAND_SLOT_LOCAL_ID,
	SPECIES_TAG_PREFIX,
	SRD_BUNDLE_ID,
	XP_STATE_ID,
} from "@spellkave/adventure-runtime/srd-ids";
import {
	PREGEN_FIGHTER_AC,
	PREGEN_FIGHTER_CHA,
	PREGEN_FIGHTER_CON,
	PREGEN_FIGHTER_DEF_ID,
	PREGEN_FIGHTER_DEX,
	PREGEN_FIGHTER_HP,
	PREGEN_FIGHTER_HP_PER_LEVEL,
	PREGEN_FIGHTER_INT,
	PREGEN_FIGHTER_LEVEL,
	PREGEN_FIGHTER_PROFICIENCY_BONUS,
	PREGEN_FIGHTER_STR,
	PREGEN_FIGHTER_WIS,
	PREGEN_FIGHTER_XP,
} from "../../spellkave-srd-cc/src/chapters/character-creation/pregen-units";
import { kavemouthBundleHeaderCall } from "./bundle-header.ts";
import { BUNDLE, GRAPHS, nodeId } from "./lib/ids.ts";

export const ADVENTURE_HERO_DEF_ID = PREGEN_FIGHTER_DEF_ID;
export const ADVENTURE_HERO_KEY_PREFIX = "adventure/hero";
export const ADVENTURE_HERO_ENTITY_KEY = `${BUNDLE}/${ADVENTURE_HERO_KEY_PREFIX}_1`;
export const ADVENTURE_HERO_DISPLAY_NAME = "Renn the Roadwarden";
export const ADVENTURE_HERO_WAKE_NODE_ID = nodeId(GRAPHS.inn, "loft");

/** Re-exports of the catalog pregen — live tests read these numbers. */
export const ADVENTURE_HERO_LEVEL = PREGEN_FIGHTER_LEVEL;
export const ADVENTURE_HERO_XP = PREGEN_FIGHTER_XP;
export const ADVENTURE_HERO_PROFICIENCY_BONUS = PREGEN_FIGHTER_PROFICIENCY_BONUS;
export const ADVENTURE_HERO_STR = PREGEN_FIGHTER_STR;
export const ADVENTURE_HERO_DEX = PREGEN_FIGHTER_DEX;
export const ADVENTURE_HERO_CON = PREGEN_FIGHTER_CON;
export const ADVENTURE_HERO_INT = PREGEN_FIGHTER_INT;
export const ADVENTURE_HERO_WIS = PREGEN_FIGHTER_WIS;
export const ADVENTURE_HERO_CHA = PREGEN_FIGHTER_CHA;
export const ADVENTURE_HERO_HP = PREGEN_FIGHTER_HP;
export const ADVENTURE_HERO_HP_PER_LEVEL = PREGEN_FIGHTER_HP_PER_LEVEL;
export const ADVENTURE_HERO_AC = PREGEN_FIGHTER_AC;

export const ADVENTURE_STR_STATE_ID = `${SRD_BUNDLE_ID}/str`;
export const ADVENTURE_WIS_STATE_ID = `${SRD_BUNDLE_ID}/wis`;
export const ADVENTURE_LEVEL_STATE_ID = LEVEL_STATE_ID;
export const ADVENTURE_XP_STATE_ID = XP_STATE_ID;
export const ADVENTURE_HP_STATE_ID = `${SRD_BUNDLE_ID}/hp`;

export const ADVENTURE_FIELD_KIT_DEF_ID = `${BUNDLE}/item/field_kit`;
export const ADVENTURE_FIELD_KIT_ENTITY_KEY = `${BUNDLE}/adventure/item/field_kit_1`;
export const ADVENTURE_TORCH_DEF_ID = `${BUNDLE}/item/torch`;
export const ADVENTURE_TORCH_ENTITY_KEY = `${BUNDLE}/adventure/item/torch_1`;
export const ADVENTURE_RATIONS_DEF_ID = `${BUNDLE}/item/rations`;
export const ADVENTURE_RATIONS_ENTITY_KEY = `${BUNDLE}/adventure/item/rations_1`;
export const ADVENTURE_HERO_WEAPON_DEF_ID = `${SRD_BUNDLE_ID}/weapon/longsword`;
export const ADVENTURE_HERO_WEAPON_ENTITY_KEY = `${BUNDLE}/adventure/item/longsword_1`;
export const ADVENTURE_HERO_WEAPON_SLOT_ID = `${SRD_BUNDLE_ID}/${MAIN_HAND_SLOT_LOCAL_ID}`;

const FIGHTER_TAG = `${CLASS_TAG_PREFIX}.fighter`;
const HUMAN_TAG = `${SPECIES_TAG_PREFIX}.human`;
const SOLDIER_TAG = `${BACKGROUND_TAG_PREFIX}.soldier`;

/** Item types the created hero's confirm-time kit instantiates. Not a body. */
export function starterKitDefinitions(): VerbCall[] {
	return heroOccupancy().filter((call) => call.toolName === "spellkave_define_entity_type");
}

/** Injected into `@spellkave/adventure-runtime` completeness (ADR-0115 3b). */
export function kavemouthCreationStarterKit(): CreationStarterKit {
	return {
		bundleId: BUNDLE,
		bundleHeaderCall: kavemouthBundleHeaderCall,
		starterKitDefinitions,
		heroWeaponDefId: ADVENTURE_HERO_WEAPON_DEF_ID,
		heroWeaponSlotId: ADVENTURE_HERO_WEAPON_SLOT_ID,
		fieldKitDefId: ADVENTURE_FIELD_KIT_DEF_ID,
		torchDefId: ADVENTURE_TORCH_DEF_ID,
		rationsDefId: ADVENTURE_RATIONS_DEF_ID,
	};
}

/** Golden reference body (sk-0m4.44): NOT seeded. Written to reference/renn.toml. */
export function heroOccupancy(at: string = ADVENTURE_HERO_WAKE_NODE_ID): VerbCall[] {
	return [
		{
			toolName: "spellkave_place_actor",
			label: "place-adventure-hero",
			params: {
				bundle: BUNDLE,
				kind: "player",
				entity_def: ADVENTURE_HERO_DEF_ID,
				at,
				key_prefix: ADVENTURE_HERO_KEY_PREFIX,
				name: ADVENTURE_HERO_DISPLAY_NAME,
				description: "A fighter waking in the Lamp and Ladle loft.",
				// sk-9ll.7: origin INSTANCE entity_tag rows, folded into the placement
				// call itself instead of a separate spellkave_write_rows(entity_tag) call.
				// sk-ntz.3 (content hygiene): dropped the bare flat `"creature"` INSTANCE
				// tag that used to sit here — it tripped MF-VAL-297/298 (flat +
				// undeclared-namespace) and was fully redundant: `ADVENTURE_HERO_DEF_ID`
				// (== `PREGEN_FIGHTER_DEF_ID`, `pregen-units.ts`) already carries
				// `CREATURE_NICHE_TAG` ("srd.creature") as an `entity_definition_tag`
				// row, and `target_niches.rs`'s `derive_entity_target_niches` unions
				// definition-tag AND instance-tag niches (BL-56/#2227) — so this hero
				// already satisfied `target.has_niche('srd.creature')` with NO instance
				// tag at all. `dm/level-up/ids.ts`'s `TRAINEE_PRESENT_NICHE_ID` predicate
				// (the flat tag's only consumer) now reads `CREATURE_NICHE_TAG` directly.
				tags: [FIGHTER_TAG, HUMAN_TAG, SOLDIER_TAG],
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "grant-adventure-hero-soldier-athletics",
			params: {
				bundle: BUNDLE,
				kind: "actor_capabilities",
				rows: [
					{
						actor_entity_key: ADVENTURE_HERO_ENTITY_KEY,
						bundle_id: BUNDLE,
						capability_id: `${SRD_BUNDLE_ID}/skill/athletics`,
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
			toolName: "spellkave_define_entity_type",
			label: "define-field-kit",
			params: {
				bundle: BUNDLE,
				id: "item/field_kit",
				display_name: "Field Kit",
				description: "A worn traveler's pack.",
				tags: [ITEM_CONTAINER_TAG, ITEM_GEAR_TAG],
			},
		},
		{
			toolName: "spellkave_define_entity_type",
			label: "define-torch",
			params: {
				bundle: BUNDLE,
				id: "item/torch",
				display_name: "Torch",
				description: "A pitch-soaked torch.",
				tags: [ITEM_GEAR_TAG, ITEM_LIGHT_TAG],
			},
		},
		{
			toolName: "spellkave_define_entity_type",
			label: "define-rations",
			params: {
				bundle: BUNDLE,
				id: "item/rations",
				display_name: "Rations",
				description: "One day's travel rations.",
				tags: [ITEM_GEAR_TAG, ITEM_FOOD_TAG],
				stackable: true,
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "adventure-starter-pack-entities",
			params: {
				bundle: BUNDLE,
				kind: "entities",
				rows: [
					{
						bundle_id: BUNDLE,
						entity_key: ADVENTURE_FIELD_KIT_ENTITY_KEY,
						entity_def_id: ADVENTURE_FIELD_KIT_DEF_ID,
						name: "Field Kit",
						kind: "item",
						place_node_id: "",
						quantity: 1,
					},
					{
						bundle_id: BUNDLE,
						entity_key: ADVENTURE_TORCH_ENTITY_KEY,
						entity_def_id: ADVENTURE_TORCH_DEF_ID,
						name: "Torch",
						kind: "item",
						place_node_id: "",
						quantity: 1,
					},
					{
						bundle_id: BUNDLE,
						entity_key: ADVENTURE_RATIONS_ENTITY_KEY,
						entity_def_id: ADVENTURE_RATIONS_DEF_ID,
						name: "Rations",
						kind: "item",
						place_node_id: "",
						quantity: 3,
					},
					{
						bundle_id: BUNDLE,
						entity_key: ADVENTURE_HERO_WEAPON_ENTITY_KEY,
						entity_def_id: ADVENTURE_HERO_WEAPON_DEF_ID,
						name: "Longsword",
						kind: "item",
						place_node_id: "",
						quantity: 1,
					},
				],
			},
		},
		{
			toolName: "spellkave_stow_item",
			label: "stow-field-kit-on-hero",
			params: {
				bundle: BUNDLE,
				actor_entity_key: ADVENTURE_HERO_ENTITY_KEY,
				item_entity_key: ADVENTURE_FIELD_KIT_ENTITY_KEY,
				direction: "in",
			},
		},
		{
			toolName: "spellkave_stow_item",
			label: "stow-torch-in-field-kit",
			params: {
				bundle: BUNDLE,
				actor_entity_key: ADVENTURE_HERO_ENTITY_KEY,
				item_entity_key: ADVENTURE_TORCH_ENTITY_KEY,
				container_entity_key: ADVENTURE_FIELD_KIT_ENTITY_KEY,
				direction: "in",
			},
		},
		{
			toolName: "spellkave_stow_item",
			label: "stow-rations-in-field-kit",
			params: {
				bundle: BUNDLE,
				actor_entity_key: ADVENTURE_HERO_ENTITY_KEY,
				item_entity_key: ADVENTURE_RATIONS_ENTITY_KEY,
				container_entity_key: ADVENTURE_FIELD_KIT_ENTITY_KEY,
				direction: "in",
			},
		},
		{
			toolName: "spellkave_stow_item",
			label: "stow-longsword-on-hero",
			params: {
				bundle: BUNDLE,
				actor_entity_key: ADVENTURE_HERO_ENTITY_KEY,
				item_entity_key: ADVENTURE_HERO_WEAPON_ENTITY_KEY,
				direction: "in",
			},
		},
		{
			toolName: "spellkave_equip_item",
			label: "equip-adventure-hero-longsword",
			params: {
				bundle: BUNDLE,
				actor_entity_key: ADVENTURE_HERO_ENTITY_KEY,
				item_entity_key: ADVENTURE_HERO_WEAPON_ENTITY_KEY,
				slot_id: ADVENTURE_HERO_WEAPON_SLOT_ID,
			},
		},
	];
}
