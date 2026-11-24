// DOC-IMPL: srd-text#table-rows
// Render a source table row as text when the SRD entry has no prose `desc`.
import { open5eRow, open5eRows, open5eSourcePointer, open5eStringField } from "./open5e";
import type { ExtractedSrdText } from "./types";

function cell(value: unknown): string {
	if (value === null || value === undefined) return "";
	return String(value);
}

/** Weapon.json has no `desc`; emit the mechanical table row. */
export function weaponTableText(pk: string): ExtractedSrdText {
	const row = open5eRow("Weapon.json", pk);
	const fields = row.fields;
	const parts = [
		cell(fields.name),
		fields.is_simple === true ? "Simple" : "Martial",
		`${cell(fields.damage_dice)} ${cell(fields.damage_type)}`,
	];
	if (Number(fields.range) > 0) {
		parts.push(
			Number(fields.long_range) > 0
				? `range ${cell(fields.range)}/${cell(fields.long_range)} ft.`
				: `range ${cell(fields.range)} ft.`,
		);
	}
	return {
		text: parts.filter((part) => part.length > 0).join(" — "),
		source: open5eSourcePointer("Weapon.json", pk),
	};
}

/** Armor.json has no long prose; emit the armor table row. */
export function armorTableText(pk: string): ExtractedSrdText {
	const row = open5eRow("Armor.json", pk);
	const fields = row.fields;
	const ac = fields.ac_base;
	const parts = [cell(fields.name), ac !== undefined ? `AC ${cell(ac)}` : ""].filter(
		(part) => part.length > 0,
	);
	if (fields.grants_stealth_disadvantage === true) parts.push("Stealth disadvantage");
	return {
		text: parts.join(" — "),
		source: open5eSourcePointer("Armor.json", pk),
	};
}

/** ClassFeatureItem.json ladder when ClassFeature.desc is a placeholder. */
/** ClassFeature.json desc, or the item ladder when desc is a placeholder. */
export function classFeatureVerbatim(pk: string): ExtractedSrdText {
	const desc = open5eStringField("ClassFeature.json", pk);
	if (desc.text.length === 0 || desc.text === "[Column data]") {
		return classFeatureItemTableText(pk);
	}
	return desc;
}

export function classFeatureItemTableText(parentPk: string): ExtractedSrdText {
	const items = open5eRows("ClassFeatureItem.json").filter((row) => row.fields.parent === parentPk);
	if (items.length === 0) {
		return {
			text: "[Column data]",
			source: open5eSourcePointer("ClassFeature.json", parentPk),
		};
	}
	const lines = items
		.slice()
		.sort((a, b) => Number(a.fields.level ?? 0) - Number(b.fields.level ?? 0))
		.map((row) => {
			const level = cell(row.fields.level);
			const value = cell(row.fields.column_value);
			const detail = cell(row.fields.detail);
			return detail.length > 0 ? `L${level}: ${value} (${detail})` : `L${level}: ${value}`;
		});
	return {
		text: lines.join("\n"),
		source: open5eSourcePointer("ClassFeature.json", parentPk),
	};
}
