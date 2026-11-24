// pattern: tag-membership-menu
// Magic Items chapter, slice 1 (sk-609b.13 / BL-16): IDENTITY for every
// cache/open5e/MagicItem.json record. Tags carry category, rarity,
// attunement, and a charges marker when the SRD description mentions charges.
// Behaviors that are expressible today live in magic-item-behaviors.ts.
//
// ROW KIND: entity_definitions under `srd/magic_item/<slug>` — same
// "catalog identity before mechanic" posture as spells/feats. Finding #37
// (wear/attunement gating) still blocks live equip-only composition; +N
// modifiers are authored always-active the way Equipment armor already is.
import { readItemFlavor } from "../../flavor/read";
import { type MagicItemRecord, readMagicItems } from "../../open5e/magic-item";

export const BUNDLE_ID = "srd";

const PK_PREFIX = "srd-2024_";
export const EXPECTED_MAGIC_ITEM_COUNT = 757;

/** Closed category axis from MagicItem.json (cache-verified at build). */
export const MAGIC_ITEM_CATEGORIES = [
	"armor",
	"potion",
	"ring",
	"rod",
	"staff",
	"wand",
	"weapon",
	"wondrous-item",
] as const;
export type MagicItemCategory = (typeof MAGIC_ITEM_CATEGORIES)[number];

/** Closed rarity axis from MagicItem.json (cache-verified at build). */
export const MAGIC_ITEM_RARITIES = [
	"common",
	"uncommon",
	"rare",
	"very-rare",
	"legendary",
	"artifact",
] as const;
export type MagicItemRarity = (typeof MAGIC_ITEM_RARITIES)[number];

export function slugFromMagicItemPk(pk: string): string {
	if (!pk.startsWith(PK_PREFIX)) {
		throw new Error(
			`magic-item-units: MagicItem.json pk '${pk}' does not carry the expected '${PK_PREFIX}' prefix.`,
		);
	}
	return pk.slice(PK_PREFIX.length);
}

export function tagSlug(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "");
}

/** Parse a (+N) / trailing +N bonus from the item name, else null. */
export function plusBonusFromName(name: string): number | null {
	const match = /\(\+(\d)\)|\+(\d)$/.exec(name);
	if (match === null) return null;
	const n = Number(match[1] ?? match[2]);
	if (!Number.isInteger(n) || n < 1 || n > 3) {
		throw new Error(`magic-item-units: unexpected plus bonus in name '${name}'.`);
	}
	return n;
}

/** True when the SRD description documents a charge pool. */
export function descriptionMentionsCharges(description: string): boolean {
	return /\bcharges?\b/i.test(description);
}

/** Extract "This … has N charges" when present (first match). */
export function chargeCountFromDescription(description: string): number | null {
	const match = /\bhas\s+(\d+)\s+charges?\b/i.exec(description);
	if (match === null) return null;
	const n = Number(match[1]);
	return Number.isInteger(n) && n > 0 ? n : null;
}

export interface MagicItemUnit {
	slug: string;
	entityId: string;
	displayName: string;
	category: MagicItemCategory;
	rarity: MagicItemRarity;
	requiresAttunement: boolean;
	plusBonus: number | null;
	hasCharges: boolean;
	chargeCount: number | null;
	weaponPk: string | null;
	armorPk: string | null;
	tags: string[];
	description: string;
	sourcePk: string;
}

function assertCategory(value: string, pk: string): MagicItemCategory {
	if ((MAGIC_ITEM_CATEGORIES as readonly string[]).includes(value)) {
		return value as MagicItemCategory;
	}
	throw new Error(
		`magic-item-units: MagicItem.json pk '${pk}' has unrecognized category '${value}'.`,
	);
}

function assertRarity(value: string, pk: string): MagicItemRarity {
	if ((MAGIC_ITEM_RARITIES as readonly string[]).includes(value)) {
		return value as MagicItemRarity;
	}
	throw new Error(
		`magic-item-units: MagicItem.json pk '${pk}' has unrecognized rarity '${value}'.`,
	);
}

export function buildMagicItemTags(record: MagicItemRecord): string[] {
	const category = assertCategory(record.category, record.pk);
	const rarity = assertRarity(record.rarity, record.pk);
	const tags = [
		"srd.item",
		"srd.magic_item",
		`srd.magic_item.category.${tagSlug(category)}`,
		`srd.magic_item.rarity.${tagSlug(rarity)}`,
	];
	if (record.requiresAttunement) tags.push("srd.magic_item.attunement.required");
	else tags.push("srd.magic_item.attunement.none");
	if (descriptionMentionsCharges(record.description)) {
		tags.push("srd.magic_item.charges");
	}
	const plus = plusBonusFromName(record.name);
	if (plus !== null) tags.push(`srd.magic_item.bonus.plus_${plus}`);
	return tags;
}

/** Website-card prose from authored/flavor/en/items/<slug>.md. Rules stay on srd.text. */
function buildDescription(record: MagicItemRecord): string {
	return readItemFlavor(slugFromMagicItemPk(record.pk)).body;
}

export function buildMagicItemUnits(): MagicItemUnit[] {
	const units = readMagicItems().map((record) => {
		const slug = slugFromMagicItemPk(record.pk);
		const category = assertCategory(record.category, record.pk);
		const rarity = assertRarity(record.rarity, record.pk);
		const hasCharges = descriptionMentionsCharges(record.description);
		return {
			slug,
			entityId: `${BUNDLE_ID}/magic_item/${slug}`,
			displayName: record.name,
			category,
			rarity,
			requiresAttunement: record.requiresAttunement,
			plusBonus: plusBonusFromName(record.name),
			hasCharges,
			chargeCount: hasCharges ? chargeCountFromDescription(record.description) : null,
			weaponPk: record.weaponPk,
			armorPk: record.armorPk,
			tags: buildMagicItemTags(record),
			description: buildDescription(record),
			sourcePk: record.pk,
		} satisfies MagicItemUnit;
	});
	if (units.length !== EXPECTED_MAGIC_ITEM_COUNT) {
		throw new Error(
			`magic-item-units: expected ${EXPECTED_MAGIC_ITEM_COUNT} units, got ${units.length}.`,
		);
	}
	return units;
}

export function magicItemUnitBySlug(slug: string): MagicItemUnit {
	const unit = buildMagicItemUnits().find((row) => row.slug === slug);
	if (unit === undefined) {
		throw new Error(`magic-item-units: no unit for slug '${slug}'.`);
	}
	return unit;
}
