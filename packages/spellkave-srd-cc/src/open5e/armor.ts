// Typed reader for `cache/open5e/Armor.json` (13 records, pk join
// `srd-2024_<slug>`) — the open5e Django-fixture shape, read ONLY from the
// committed cache (never the fork directly; see `../sources.ts`). First
// consumer: `../chapters/equipment/armor-units.ts`'s Chain Mail unit (E1,
// `ledger/designs/equipment-ac-target-fact.md`) — the generator reads
// `ac_base`/`ac_add_dexmod`/etc. straight off these fields, never a
// hand-typed AC value (AGENTS.md "Rules are cited, never remembered").
import { readFileSync } from "node:fs";
import path from "node:path";

import { CACHE_OPEN5E_DIR } from "./paths";

interface RawArmorRow {
	fields: {
		ac_add_dexmod: boolean;
		ac_base: number;
		ac_cap_dexmod: number | null;
		document: string;
		grants_stealth_disadvantage: boolean;
		name: string;
		strength_score_required: number | null;
	};
	model: string;
	pk: string;
}

/** One `Armor.json` record, flattened out of open5e's `fields` wrapper. */
export interface ArmorRecord {
	/** open5e pk, e.g. `srd-2024_chain-mail` — carried forward as TOML provenance. */
	pk: string;
	name: string;
	acBase: number;
	acAddDexMod: boolean;
	acCapDexMod: number | null;
	grantsStealthDisadvantage: boolean;
	strengthScoreRequired: number | null;
	document: string;
}

function assertShape(row: unknown, index: number): asserts row is RawArmorRow {
	const candidate = row as Partial<RawArmorRow> | null;
	if (
		candidate === null ||
		typeof candidate !== "object" ||
		typeof candidate.pk !== "string" ||
		typeof candidate.model !== "string" ||
		typeof candidate.fields !== "object" ||
		candidate.fields === null ||
		typeof candidate.fields.ac_base !== "number" ||
		typeof candidate.fields.ac_add_dexmod !== "boolean" ||
		typeof candidate.fields.grants_stealth_disadvantage !== "boolean" ||
		typeof candidate.fields.name !== "string" ||
		typeof candidate.fields.document !== "string" ||
		!(
			candidate.fields.ac_cap_dexmod === null || typeof candidate.fields.ac_cap_dexmod === "number"
		) ||
		!(
			candidate.fields.strength_score_required === null ||
			typeof candidate.fields.strength_score_required === "number"
		)
	) {
		throw new Error(
			`armor: malformed record at index ${index} in Armor.json — expected { fields: { ac_base, ` +
				"ac_add_dexmod, ac_cap_dexmod, grants_stealth_disadvantage, strength_score_required, name, " +
				`document }, model, pk }, got ${JSON.stringify(row)}.`,
		);
	}
}

/** Read every `Armor.json` record, sorted by `pk` for deterministic output. */
export function readArmor(): ArmorRecord[] {
	const filePath = path.join(CACHE_OPEN5E_DIR, "Armor.json");
	const raw = JSON.parse(readFileSync(filePath, "utf8")) as unknown[];
	return raw
		.map((row, index) => {
			assertShape(row, index);
			return {
				pk: row.pk,
				name: row.fields.name,
				acBase: row.fields.ac_base,
				acAddDexMod: row.fields.ac_add_dexmod,
				acCapDexMod: row.fields.ac_cap_dexmod,
				grantsStealthDisadvantage: row.fields.grants_stealth_disadvantage,
				strengthScoreRequired: row.fields.strength_score_required,
				document: row.fields.document,
			};
		})
		.sort((a, b) => a.pk.localeCompare(b.pk));
}

/** Resolve one Armor.json record by pk, throwing loudly (never a silent undefined). */
export function armorByPk(pk: string): ArmorRecord {
	const record = readArmor().find((armor) => armor.pk === pk);
	if (record === undefined) {
		throw new Error(`armor: no Armor.json record with pk '${pk}' in the cache.`);
	}
	return record;
}
