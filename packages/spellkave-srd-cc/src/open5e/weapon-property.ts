// Typed reader for `cache/open5e/WeaponProperty.json` (17 records: 9 plain
// weapon properties — Ammunition, Finesse, Heavy, Light, Loading, Reach,
// Thrown, Two-Handed, Versatile — plus 8 Weapon Mastery properties — Cleave,
// Graze, Nick, Push, Sap, Slow, Topple, Vex, distinguished by `fields.type ===
// "Mastery"`) and `cache/open5e/WeaponPropertyAssignment.json` (108 records,
// the weapon<->property join, `pk` = `<weapon-pk>_<property-slug>`) — the
// open5e Django-fixture shape, read ONLY from the committed cache (never the
// fork directly; see `../sources.ts`). First consumer:
// `../chapters/equipment/weapon-tag-values.ts`'s property/mastery axes (E3).
import { readFileSync } from "node:fs";
import path from "node:path";

import { CACHE_OPEN5E_DIR } from "./paths";

interface RawWeaponPropertyRow {
	fields: {
		desc: string;
		document: string;
		name: string;
		type: string | null;
	};
	model: string;
	pk: string;
}

/** One `WeaponProperty.json` record, flattened out of open5e's `fields` wrapper. */
export interface WeaponPropertyRecord {
	/** open5e pk, e.g. `srd-2024_finesse-wp` / `srd-2024_cleave-mastery`. */
	pk: string;
	name: string;
	desc: string;
	/** `"Mastery"` for the 8 Weapon Mastery properties, `null` for the 9 plain weapon properties. */
	type: string | null;
	document: string;
}

interface RawWeaponPropertyAssignmentRow {
	fields: {
		detail: string | null;
		document: string;
		property: string;
		weapon: string;
	};
	model: string;
	pk: string;
}

/** One `WeaponPropertyAssignment.json` record — one weapon<->property membership, optionally carrying a detail string (e.g. Versatile's two-handed damage die). */
export interface WeaponPropertyAssignmentRecord {
	pk: string;
	/** `WeaponProperty.json` pk this assignment names. */
	propertyPk: string;
	/** `Weapon.json` pk this assignment names. */
	weaponPk: string;
	/** e.g. Versatile's `"1d10"`, Ammunition's `"Range 25/100; Needle"` — `null` for most rows. */
	detail: string | null;
	document: string;
}

function assertPropertyShape(row: unknown, index: number): asserts row is RawWeaponPropertyRow {
	const candidate = row as Partial<RawWeaponPropertyRow> | null;
	if (
		candidate === null ||
		typeof candidate !== "object" ||
		typeof candidate.pk !== "string" ||
		typeof candidate.model !== "string" ||
		typeof candidate.fields !== "object" ||
		candidate.fields === null ||
		typeof candidate.fields.desc !== "string" ||
		typeof candidate.fields.document !== "string" ||
		typeof candidate.fields.name !== "string" ||
		!(candidate.fields.type === null || typeof candidate.fields.type === "string")
	) {
		throw new Error(
			`weapon-property: malformed record at index ${index} in WeaponProperty.json — expected ` +
				`{ fields: { desc, document, name, type }, model, pk }, got ${JSON.stringify(row)}.`,
		);
	}
}

/** Read every `WeaponProperty.json` record, sorted by `pk` for deterministic output. */
export function readWeaponProperties(): WeaponPropertyRecord[] {
	const filePath = path.join(CACHE_OPEN5E_DIR, "WeaponProperty.json");
	const raw = JSON.parse(readFileSync(filePath, "utf8")) as unknown[];
	return raw
		.map((row, index) => {
			assertPropertyShape(row, index);
			return {
				pk: row.pk,
				name: row.fields.name,
				desc: row.fields.desc,
				type: row.fields.type,
				document: row.fields.document,
			};
		})
		.sort((a, b) => a.pk.localeCompare(b.pk));
}

function assertAssignmentShape(
	row: unknown,
	index: number,
): asserts row is RawWeaponPropertyAssignmentRow {
	const candidate = row as Partial<RawWeaponPropertyAssignmentRow> | null;
	if (
		candidate === null ||
		typeof candidate !== "object" ||
		typeof candidate.pk !== "string" ||
		typeof candidate.model !== "string" ||
		typeof candidate.fields !== "object" ||
		candidate.fields === null ||
		typeof candidate.fields.document !== "string" ||
		typeof candidate.fields.property !== "string" ||
		typeof candidate.fields.weapon !== "string" ||
		!(candidate.fields.detail === null || typeof candidate.fields.detail === "string")
	) {
		throw new Error(
			`weapon-property: malformed record at index ${index} in WeaponPropertyAssignment.json — ` +
				`expected { fields: { detail, document, property, weapon }, model, pk }, got ${JSON.stringify(row)}.`,
		);
	}
}

/** Read every `WeaponPropertyAssignment.json` record, sorted by `pk` for deterministic output. */
export function readWeaponPropertyAssignments(): WeaponPropertyAssignmentRecord[] {
	const filePath = path.join(CACHE_OPEN5E_DIR, "WeaponPropertyAssignment.json");
	const raw = JSON.parse(readFileSync(filePath, "utf8")) as unknown[];
	return raw
		.map((row, index) => {
			assertAssignmentShape(row, index);
			return {
				pk: row.pk,
				propertyPk: row.fields.property,
				weaponPk: row.fields.weapon,
				detail: row.fields.detail,
				document: row.fields.document,
			};
		})
		.sort((a, b) => a.pk.localeCompare(b.pk));
}

/** Every `WeaponPropertyAssignment.json` row naming `weaponPk`, in the cache's own pk order. */
export function weaponPropertyAssignmentsByWeapon(
	weaponPk: string,
): WeaponPropertyAssignmentRecord[] {
	return readWeaponPropertyAssignments().filter((row) => row.weaponPk === weaponPk);
}
