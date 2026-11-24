// Typed reader for `cache/open5e/MagicItem.json` (CC-BY-4.0). Magic-items
// generators read the committed cache only; they never reach into the upstream
// fork. Grounding: issue #2125 / BL-16, sk-609b.13.
import { readFileSync } from "node:fs";
import path from "node:path";

import { CACHE_OPEN5E_DIR } from "./paths";

interface RawMagicItemRow {
	fields: {
		armor: string | null;
		armor_class: number;
		armor_detail: string;
		category: string;
		cost: string | number;
		damage_immunities: string[];
		damage_resistances: string[];
		damage_vulnerabilities: string[];
		desc: string;
		document: string;
		name: string;
		rarity: string;
		requires_attunement: boolean;
		size: string;
		weapon: string | null;
		weight: string | number;
	};
	model: string;
	pk: string;
}

export interface MagicItemRecord {
	pk: string;
	name: string;
	description: string;
	category: string;
	rarity: string;
	requiresAttunement: boolean;
	/** Open5e Weapon.json pk when this item is a magical weapon form, else null. */
	weaponPk: string | null;
	/** Open5e Armor.json pk when this item is a magical armor form, else null. */
	armorPk: string | null;
	cost: string;
	weight: string;
	size: string;
}

const EXPECTED_COUNT = 757;

function asString(value: string | number): string {
	return typeof value === "number" ? String(value) : value;
}

function assertShape(row: unknown, index: number): asserts row is RawMagicItemRow {
	const candidate = row as Partial<RawMagicItemRow> | null;
	if (
		candidate === null ||
		typeof candidate !== "object" ||
		typeof candidate.pk !== "string" ||
		typeof candidate.model !== "string" ||
		typeof candidate.fields !== "object" ||
		candidate.fields === null ||
		typeof candidate.fields.category !== "string" ||
		typeof candidate.fields.desc !== "string" ||
		typeof candidate.fields.name !== "string" ||
		typeof candidate.fields.rarity !== "string" ||
		typeof candidate.fields.requires_attunement !== "boolean" ||
		typeof candidate.fields.size !== "string" ||
		(candidate.fields.weapon !== null && typeof candidate.fields.weapon !== "string") ||
		(candidate.fields.armor !== null && typeof candidate.fields.armor !== "string") ||
		(typeof candidate.fields.cost !== "string" && typeof candidate.fields.cost !== "number") ||
		(typeof candidate.fields.weight !== "string" && typeof candidate.fields.weight !== "number")
	) {
		throw new Error(
			`magic-item: malformed record at index ${index} in MagicItem.json — expected the ` +
				`cached magic-item identity fields, got ${JSON.stringify(row)}.`,
		);
	}
}

export function readMagicItems(): MagicItemRecord[] {
	const filePath = path.join(CACHE_OPEN5E_DIR, "MagicItem.json");
	const raw = JSON.parse(readFileSync(filePath, "utf8")) as unknown[];
	const items = raw
		.map((row, index) => {
			assertShape(row, index);
			return {
				pk: row.pk,
				name: row.fields.name,
				description: row.fields.desc,
				category: row.fields.category,
				rarity: row.fields.rarity,
				requiresAttunement: row.fields.requires_attunement,
				weaponPk: row.fields.weapon,
				armorPk: row.fields.armor,
				cost: asString(row.fields.cost),
				weight: asString(row.fields.weight),
				size: row.fields.size,
			} satisfies MagicItemRecord;
		})
		.sort((a, b) => a.pk.localeCompare(b.pk));
	if (items.length !== EXPECTED_COUNT) {
		throw new Error(
			`magic-item: expected ${EXPECTED_COUNT} MagicItem.json records, got ${items.length} — ` +
				"cache drift against the BL-16 / sk-609b.13 contract.",
		);
	}
	return items;
}

export function magicItemByPk(pk: string): MagicItemRecord {
	const record = readMagicItems().find((item) => item.pk === pk);
	if (record === undefined) {
		throw new Error(`magic-item: no MagicItem.json record with pk '${pk}' in the cache.`);
	}
	return record;
}
