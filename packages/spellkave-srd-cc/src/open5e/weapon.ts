// Typed reader for `cache/open5e/Weapon.json` (38 records, pk join
// `srd-2024_<slug>`) — the open5e Django-fixture shape, read ONLY from the
// committed cache (never the fork directly; see `../sources.ts`). First
// consumer: the Equipment chapter's complete weapon catalog. Damage,
// category, properties, and normal/long ranges are derived from these rows;
// generic attacks then read the equipped item's authored facts.
import { readFileSync } from "node:fs";
import path from "node:path";

import { CACHE_OPEN5E_DIR } from "./paths";

interface RawWeaponRow {
	fields: {
		damage_dice: string;
		damage_type: string;
		distance_unit: string | null;
		document: string;
		is_improvised: boolean;
		is_simple: boolean;
		long_range: number;
		name: string;
		range: number;
	};
	model: string;
	pk: string;
}

/** One `Weapon.json` record, flattened out of open5e's `fields` wrapper. */
export interface WeaponRecord {
	/** open5e pk, e.g. `srd-2024_mace` — carried forward as TOML provenance. */
	pk: string;
	name: string;
	damageDice: string;
	damageType: string;
	isSimple: boolean;
	isImprovised: boolean;
	/** Normal range in feet; `0` for a melee weapon (no ranged profile). */
	range: number;
	/** Long range in feet; `0` for a melee weapon or a single-range ranged weapon. */
	longRange: number;
	document: string;
}

function assertShape(row: unknown, index: number): asserts row is RawWeaponRow {
	const candidate = row as Partial<RawWeaponRow> | null;
	if (
		candidate === null ||
		typeof candidate !== "object" ||
		typeof candidate.pk !== "string" ||
		typeof candidate.model !== "string" ||
		typeof candidate.fields !== "object" ||
		candidate.fields === null ||
		typeof candidate.fields.damage_dice !== "string" ||
		typeof candidate.fields.damage_type !== "string" ||
		typeof candidate.fields.is_simple !== "boolean" ||
		typeof candidate.fields.is_improvised !== "boolean" ||
		typeof candidate.fields.range !== "number" ||
		typeof candidate.fields.long_range !== "number" ||
		typeof candidate.fields.name !== "string" ||
		typeof candidate.fields.document !== "string"
	) {
		throw new Error(
			`weapon: malformed record at index ${index} in Weapon.json — expected { fields: { damage_dice, ` +
				"damage_type, is_simple, is_improvised, range, long_range, name, document }, model, pk }, got " +
				`${JSON.stringify(row)}.`,
		);
	}
}

/** Read every `Weapon.json` record, sorted by `pk` for deterministic output. */
export function readWeapons(): WeaponRecord[] {
	const filePath = path.join(CACHE_OPEN5E_DIR, "Weapon.json");
	const raw = JSON.parse(readFileSync(filePath, "utf8")) as unknown[];
	return raw
		.map((row, index) => {
			assertShape(row, index);
			return {
				pk: row.pk,
				name: row.fields.name,
				damageDice: row.fields.damage_dice,
				damageType: row.fields.damage_type,
				isSimple: row.fields.is_simple,
				isImprovised: row.fields.is_improvised,
				range: row.fields.range,
				longRange: row.fields.long_range,
				document: row.fields.document,
			};
		})
		.sort((a, b) => a.pk.localeCompare(b.pk));
}

/** Resolve one Weapon.json record by pk, throwing loudly (never a silent undefined). */
export function weaponByPk(pk: string): WeaponRecord {
	const record = readWeapons().find((weapon) => weapon.pk === pk);
	if (record === undefined) {
		throw new Error(`weapon: no Weapon.json record with pk '${pk}' in the cache.`);
	}
	return record;
}
