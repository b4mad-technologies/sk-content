/**
 * Runtime creation starter kit (sk-jay0.7.21 / ADR-0115 3b).
 * Leaf: no srd-cc chapter imports.
 */
import type { CreationStarterKit } from "@spellkave/adventure-runtime/author/dm/creation-composition";
import type { VerbCall } from "@spellkave/adventure-runtime/dm/lib";
import {
	ITEM_CONTAINER_TAG,
	ITEM_FOOD_TAG,
	ITEM_GEAR_TAG,
	ITEM_LIGHT_TAG,
	MAIN_HAND_SLOT_LOCAL_ID,
	SRD_BUNDLE_ID,
} from "@spellkave/adventure-runtime/srd-ids";
import { elvenMiniBundleHeaderCall } from "./bundle-header.ts";
import { BUNDLE } from "./lib/ids.ts";

export const ADVENTURE_FIELD_KIT_DEF_ID = `${BUNDLE}/item/field_kit`;
export const ADVENTURE_TORCH_DEF_ID = `${BUNDLE}/item/torch`;
export const ADVENTURE_RATIONS_DEF_ID = `${BUNDLE}/item/rations`;
export const ADVENTURE_HERO_WEAPON_DEF_ID = `${SRD_BUNDLE_ID}/weapon/longsword`;
export const ADVENTURE_HERO_WEAPON_SLOT_ID = `${SRD_BUNDLE_ID}/${MAIN_HAND_SLOT_LOCAL_ID}`;

export function starterKitDefinitions(): VerbCall[] {
	return [
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
	];
}

/** Injected into `@spellkave/adventure-runtime` completeness (ADR-0115 3b). */
export function elvenMiniCreationStarterKit(): CreationStarterKit {
	return {
		bundleId: BUNDLE,
		bundleHeaderCall: elvenMiniBundleHeaderCall,
		starterKitDefinitions,
		heroWeaponDefId: ADVENTURE_HERO_WEAPON_DEF_ID,
		heroWeaponSlotId: ADVENTURE_HERO_WEAPON_SLOT_ID,
		fieldKitDefId: ADVENTURE_FIELD_KIT_DEF_ID,
		torchDefId: ADVENTURE_TORCH_DEF_ID,
		rationsDefId: ADVENTURE_RATIONS_DEF_ID,
	};
}
