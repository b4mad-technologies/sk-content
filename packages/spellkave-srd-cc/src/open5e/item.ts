// Typed reader for `cache/open5e/Item.json` (CC-BY-4.0). Equipment generators
// read the committed cache only; they never reach into the upstream fork.
import { readFileSync } from "node:fs";
import path from "node:path";

import { CACHE_OPEN5E_DIR } from "./paths";

interface RawItemRow {
	fields: {
		category: string;
		cost: string;
		desc: string;
		name: string;
		weight: string;
	};
	model: string;
	pk: string;
}

export interface ItemRecord {
	pk: string;
	category: string;
	cost: string;
	description: string;
	name: string;
	weight: string;
}

function assertShape(row: unknown, index: number): asserts row is RawItemRow {
	const candidate = row as Partial<RawItemRow> | null;
	if (
		candidate === null ||
		typeof candidate !== "object" ||
		typeof candidate.pk !== "string" ||
		typeof candidate.model !== "string" ||
		typeof candidate.fields !== "object" ||
		candidate.fields === null ||
		typeof candidate.fields.category !== "string" ||
		typeof candidate.fields.cost !== "string" ||
		typeof candidate.fields.desc !== "string" ||
		typeof candidate.fields.name !== "string" ||
		typeof candidate.fields.weight !== "string"
	) {
		throw new Error(
			`item: malformed record at index ${index} in Item.json — expected the ` +
				`cached item identity fields, got ${JSON.stringify(row)}.`,
		);
	}
}

export function readItems(): ItemRecord[] {
	const filePath = path.join(CACHE_OPEN5E_DIR, "Item.json");
	const raw = JSON.parse(readFileSync(filePath, "utf8")) as unknown[];
	return raw
		.map((row, index) => {
			assertShape(row, index);
			return {
				pk: row.pk,
				category: row.fields.category,
				cost: row.fields.cost,
				description: row.fields.desc,
				name: row.fields.name,
				weight: row.fields.weight,
			};
		})
		.sort((a, b) => a.pk.localeCompare(b.pk));
}

export function itemByPk(pk: string): ItemRecord {
	const record = readItems().find((item) => item.pk === pk);
	if (record === undefined) {
		throw new Error(`item: no Item.json record with pk '${pk}' in the cache.`);
	}
	return record;
}
