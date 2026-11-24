// pattern: tag-membership-menu
// Magic Items chapter tag_value_definitions catalog — every distinct value
// magic-item-units.ts's buildMagicItemTags can emit (MF-VAL-300).
import { MAGIC_ITEM_CATEGORIES, MAGIC_ITEM_RARITIES, tagSlug } from "./magic-item-units";

export interface MagicItemTagValueUnit {
	tag: string;
	prefix: string;
	description: string;
	sourcePk: string;
}

const PREFIX = "srd";

function unit(tag: string, description: string, prefix: string = PREFIX): MagicItemTagValueUnit {
	return { tag, prefix, description, sourcePk: "" };
}

export function buildMagicItemTagValueUnits(): MagicItemTagValueUnit[] {
	// Do NOT re-declare `srd.item` — playing-the-game/tag-value-vocabulary owns it
	// (MF-VAL-272 duplicate fatal at full-bundle seed).
	const rows: MagicItemTagValueUnit[] = [
		unit("srd.magic_item", "Identifies an entity definition as an SRD magic item."),
		unit(
			"srd.magic_item.attunement.required",
			"Identifies a magic item that requires attunement (magic-items.md § Attunement).",
		),
		unit(
			"srd.magic_item.attunement.none",
			"Identifies a magic item that does not require attunement.",
		),
		unit(
			"srd.magic_item.charges",
			"Identifies a magic item whose description documents a charge pool (magic-items.md § Charges).",
		),
		unit("srd.magic_item.bonus.plus_1", "Identifies a +1 magic weapon or armor."),
		unit("srd.magic_item.bonus.plus_2", "Identifies a +2 magic weapon or armor."),
		unit("srd.magic_item.bonus.plus_3", "Identifies a +3 magic weapon or armor."),
		unit(
			"srd.magic_item.category.scroll",
			"A label for a written spell that can be read once and is then gone.",
		),
		unit(
			"srd.magic_item.rarity.varies",
			"A label for a magical object whose printed rank depends on which version you hold.",
		),
	];
	for (const category of MAGIC_ITEM_CATEGORIES) {
		rows.push(
			unit(
				`srd.magic_item.category.${tagSlug(category)}`,
				`Identifies a magic item in the ${category.replace(/-/g, " ")} category ` +
					"(magic-items.md § Magic Item Categories).",
				"srd",
			),
		);
	}
	for (const rarity of MAGIC_ITEM_RARITIES) {
		rows.push(
			unit(
				`srd.magic_item.rarity.${tagSlug(rarity)}`,
				`Identifies a ${rarity.replace(/-/g, " ")} magic item ` +
					"(magic-items.md § Magic Item Rarity).",
				"srd",
			),
		);
	}
	return rows;
}
