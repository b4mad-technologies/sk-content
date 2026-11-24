// Typed reader for `cache/open5e/ClassFeature.json` (352 records) +
// `cache/open5e/ClassFeatureItem.json` (1811 records) — K2 (Classes, Fighter
// vertical, `ledger/classes.md`). Same flatten-and-fail-loudly reader shape
// as `./character-class.ts`.
//
// ClassFeature.json rows are keyed by `pk`, a dotted-slug chain
// (`srd-2024_<class>_<feature-slug>`, e.g. `srd-2024_fighter_second-wind`;
// Champion's own rows are `srd-2024_fighter_champion_<feature-slug>` — three
// segments, `fields.parent` is `srd-2024_champion`, NOT `srd-2024_fighter`).
// Most rows carry no `feature_type` (a real prose feature, `fields.desc` is
// the SRD text); four Fighter-scoped `feature_type` values exist in this
// cache: `CORE_TRAITS_TABLE` (1, already read by `classes-units.ts` via the
// markdown table, never this reader — the ledger's pinned line-wrap-
// corruption quirk), `PROFICIENCY_BONUS` (1) and `CLASS_TABLE_DATA` (2:
// Second Wind uses, Weapon Mastery count) both carry `desc: "[Column data]"`
// (the real numbers live in `ClassFeatureItem.json`, not here).
//
// ClassFeatureItem.json rows are the per-level recurrence/column markers:
// `fields.parent` names the OWNING `ClassFeature.json` pk, `fields.level` the
// Fighter level, `fields.column_value` a table-column string (e.g. `"3"` for
// Weapon Mastery count), `fields.detail` a parenthetical annotation (e.g.
// `"one use"`/`"two uses"` on Action Surge/Indomitable). PINNED DATA QUIRK
// (`ledger/classes.md`'s "Pinned data quirks" paragraph): the Weapon Mastery
// count feature (`srd-2024_fighter_weapon-mastery-count`) carries a DUPLICATE
// level-1 item (two rows, `level: 1`, both `column_value: "3"`) — this
// reader does NOT dedupe (every row is real cache content); a consumer that
// needs per-level uniqueness must tolerate/flag the duplicate itself (see
// `fighter-units.ts`'s own header for how the K2 slice handles it).
import { readFileSync } from "node:fs";
import path from "node:path";

import { CACHE_OPEN5E_DIR } from "./paths";

interface RawClassFeatureRow {
	fields: {
		desc: string;
		document: string;
		feature_type?: string;
		name: string;
		parent: string;
	};
	model: string;
	pk: string;
}

/** One `ClassFeature.json` record, flattened out of open5e's `fields` wrapper. */
export interface ClassFeatureRecord {
	/** open5e pk, e.g. `srd-2024_fighter_second-wind` / `srd-2024_fighter_champion_survivor`. */
	pk: string;
	/** Raw `name` field — CARRIES A KNOWN TYPO for one Fighter row ("Studdied Attacks"); never trust for display, this module's own header + `fighter-units.ts`'s guard. */
	name: string;
	desc: string;
	/** Owning class pk, e.g. `srd-2024_fighter` (Fighter's own rows) or `srd-2024_champion` (Champion subclass rows). */
	parent: string;
	/** `undefined` for a real prose feature; one of `CORE_TRAITS_TABLE`/`PROFICIENCY_BONUS`/`CLASS_TABLE_DATA`/`CLASS_FEATURE_OPTION_LIST` for a structural/table-data row. */
	featureType: string | undefined;
}

function assertClassFeatureShape(row: unknown, index: number): asserts row is RawClassFeatureRow {
	const candidate = row as Partial<RawClassFeatureRow> | null;
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
		typeof candidate.fields.parent !== "string" ||
		(candidate.fields.feature_type !== undefined &&
			typeof candidate.fields.feature_type !== "string")
	) {
		throw new Error(
			`class-feature: malformed ClassFeature.json record at index ${index} — expected ` +
				"{ fields: { desc, name, parent, feature_type? }, model, pk }, got " +
				`${JSON.stringify(row)}.`,
		);
	}
}

let cachedClassFeatures: readonly ClassFeatureRecord[] | undefined;

function readAllClassFeatures(): readonly ClassFeatureRecord[] {
	if (cachedClassFeatures !== undefined) return cachedClassFeatures;
	const filePath = path.join(CACHE_OPEN5E_DIR, "ClassFeature.json");
	const raw = JSON.parse(readFileSync(filePath, "utf8")) as unknown[];
	const rows = raw.map((row, index) => {
		assertClassFeatureShape(row, index);
		return {
			pk: row.pk,
			name: row.fields.name,
			desc: row.fields.desc,
			parent: row.fields.parent,
			featureType: row.fields.feature_type,
		};
	});
	cachedClassFeatures = rows;
	return rows;
}

/**
 * Every `ClassFeature.json` row whose own `pk` starts with `${pkPrefix}_` —
 * e.g. `readClassFeaturePkPrefix("srd-2024_fighter")` for Fighter's own 19
 * (excludes Champion, whose rows are `srd-2024_fighter_champion_*` — a
 * DIFFERENT, longer prefix, read separately via
 * `readClassFeaturePkPrefix("srd-2024_fighter_champion")`). pk order
 * (already the cache's own insertion order; NOT sorted — callers that need a
 * stable order sort explicitly).
 */
export function readClassFeaturesByPkPrefix(pkPrefix: string): ClassFeatureRecord[] {
	const prefix = `${pkPrefix}_`;
	return readAllClassFeatures()
		.filter((row) => row.pk.startsWith(prefix))
		.sort((a, b) => a.pk.localeCompare(b.pk));
}

/**
 * Every `ClassFeature.json` row whose own `fields.parent` EXACTLY equals
 * `parentPk` — the ROBUST alternative to `readClassFeaturesByPkPrefix` for
 * K3+ (`remaining-classes-units.ts`): a subclass's own `pk` PREFIX shape is
 * genuinely INCONSISTENT across the dataset (cache-verified) — most
 * subclasses repeat their parent class' name in their own feature pks
 * (`srd-2024_wizard_evoker_<slug>`), but College of Lore and Path of the
 * Berserker do NOT (`srd-2024_college-of-lore_<slug>`, no `bard_`/
 * `barbarian_` segment) — `fields.parent` (the subclass's own
 * `CharacterClass.json` pk, e.g. `srd-2024_evoker`) is the ONE reliable join
 * key regardless of pk shape. A base class's own `fields.parent` is simply
 * its own `CharacterClass.json` pk (e.g. `srd-2024_barbarian`) — this
 * function works identically for both base-class and subclass reads. pk
 * order (already the cache's own insertion order; NOT sorted).
 */
export function readClassFeaturesByParentPk(parentPk: string): ClassFeatureRecord[] {
	return readAllClassFeatures()
		.filter((row) => row.parent === parentPk)
		.sort((a, b) => a.pk.localeCompare(b.pk));
}

interface RawClassFeatureItemRow {
	fields: {
		column_value: string | null;
		detail: string | null;
		level: number;
		parent: string;
	};
	model: string;
	pk: string;
}

/** One `ClassFeatureItem.json` record: a per-level recurrence/column marker owned by one `ClassFeatureRecord`. */
export interface ClassFeatureItemRecord {
	pk: string;
	/** The OWNING `ClassFeature.json` pk (`fields.parent`). */
	parent: string;
	level: number;
	/** Table-column string for a `CLASS_TABLE_DATA`/`PROFICIENCY_BONUS` row (e.g. `"3"`), else `null`. */
	columnValue: string | null;
	/** Parenthetical annotation (e.g. `"one use"`), else `null`. */
	detail: string | null;
}

function assertClassFeatureItemShape(
	row: unknown,
	index: number,
): asserts row is RawClassFeatureItemRow {
	const candidate = row as Partial<RawClassFeatureItemRow> | null;
	if (
		candidate === null ||
		typeof candidate !== "object" ||
		typeof candidate.pk !== "string" ||
		typeof candidate.model !== "string" ||
		typeof candidate.fields !== "object" ||
		candidate.fields === null ||
		typeof candidate.fields.level !== "number" ||
		typeof candidate.fields.parent !== "string" ||
		(candidate.fields.column_value !== null && typeof candidate.fields.column_value !== "string") ||
		(candidate.fields.detail !== null && typeof candidate.fields.detail !== "string")
	) {
		throw new Error(
			`class-feature: malformed ClassFeatureItem.json record at index ${index} — expected ` +
				"{ fields: { column_value, detail, level, parent }, model, pk }, got " +
				`${JSON.stringify(row)}.`,
		);
	}
}

let cachedClassFeatureItems: readonly ClassFeatureItemRecord[] | undefined;

function readAllClassFeatureItems(): readonly ClassFeatureItemRecord[] {
	if (cachedClassFeatureItems !== undefined) return cachedClassFeatureItems;
	const filePath = path.join(CACHE_OPEN5E_DIR, "ClassFeatureItem.json");
	const raw = JSON.parse(readFileSync(filePath, "utf8")) as unknown[];
	const rows = raw.map((row, index) => {
		assertClassFeatureItemShape(row, index);
		return {
			pk: row.pk,
			parent: row.fields.parent,
			level: row.fields.level,
			columnValue: row.fields.column_value,
			detail: row.fields.detail,
		};
	});
	cachedClassFeatureItems = rows;
	return rows;
}

/**
 * Every `ClassFeatureItem.json` row owned by `featurePk`, level-ascending.
 * DOES NOT DEDUPE — see this module's own header for the Weapon Mastery
 * count DUPLICATE level-1 item (`ledger/classes.md`'s pinned data quirk).
 */
export function readClassFeatureItems(featurePk: string): ClassFeatureItemRecord[] {
	return readAllClassFeatureItems()
		.filter((row) => row.parent === featurePk)
		.sort((a, b) => a.level - b.level);
}
