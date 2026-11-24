// Typed reader for `cache/open5e/Background.json` (4 rows, `desc` always
// empty — identity/name only) and `cache/open5e/BackgroundBenefit.json` (20
// rows: exactly 5 typed rows per background — `ability_score` /
// `skill_proficiency` / `tool_proficiency` / `equipment` / `feat` — the STAR
// source for this chapter, `ledger/character-origins.md`'s "Sources"
// section: descs are VERBATIM to `cache/markdown/character-origins.md`'s own
// per-background stat blocks). Same reader shape as `./feat.ts` (this
// package's own precedent for a parent/child open5e pair).
import { readFileSync } from "node:fs";
import path from "node:path";

import { CACHE_OPEN5E_DIR } from "./paths";

interface RawBackgroundRow {
	fields: {
		desc: string;
		document: string;
		name: string;
	};
	model: string;
	pk: string;
}

export interface BackgroundRecord {
	pk: string;
	desc: string;
	document: string;
	name: string;
}

/** `BackgroundBenefit.json`'s own closed `type` vocabulary — one row of each per background, this chapter's "5 typed rows" invariant. */
export type BackgroundBenefitType =
	| "ability_score"
	| "skill_proficiency"
	| "tool_proficiency"
	| "equipment"
	| "feat";

interface RawBackgroundBenefitRow {
	fields: {
		desc: string;
		name: string;
		parent: string;
		type: string;
	};
	model: string;
	pk: string;
}

export interface BackgroundBenefitRecord {
	pk: string;
	desc: string;
	name: string;
	/** The owning `Background.json` pk, e.g. `srd-2024_acolyte`. */
	parent: string;
	type: BackgroundBenefitType;
}

const BACKGROUND_BENEFIT_TYPES: readonly BackgroundBenefitType[] = [
	"ability_score",
	"skill_proficiency",
	"tool_proficiency",
	"equipment",
	"feat",
];

function assertBackgroundShape(row: unknown, index: number): asserts row is RawBackgroundRow {
	const candidate = row as Partial<RawBackgroundRow> | null;
	if (
		candidate === null ||
		typeof candidate !== "object" ||
		typeof candidate.pk !== "string" ||
		typeof candidate.model !== "string" ||
		typeof candidate.fields !== "object" ||
		candidate.fields === null ||
		typeof candidate.fields.desc !== "string" ||
		typeof candidate.fields.document !== "string" ||
		typeof candidate.fields.name !== "string"
	) {
		throw new Error(
			`background: malformed record at index ${index} in Background.json — expected the ` +
				`cached background identity fields, got ${JSON.stringify(row)}.`,
		);
	}
}

function assertBackgroundBenefitShape(
	row: unknown,
	index: number,
): asserts row is RawBackgroundBenefitRow {
	const candidate = row as Partial<RawBackgroundBenefitRow> | null;
	if (
		candidate === null ||
		typeof candidate !== "object" ||
		typeof candidate.pk !== "string" ||
		typeof candidate.model !== "string" ||
		typeof candidate.fields !== "object" ||
		candidate.fields === null ||
		typeof candidate.fields.desc !== "string" ||
		typeof candidate.fields.name !== "string" ||
		typeof candidate.fields.parent !== "string" ||
		typeof candidate.fields.type !== "string" ||
		!BACKGROUND_BENEFIT_TYPES.includes(candidate.fields.type as BackgroundBenefitType)
	) {
		throw new Error(
			`background: malformed record at index ${index} in BackgroundBenefit.json — expected ` +
				`the cached background-benefit fields (type one of [${BACKGROUND_BENEFIT_TYPES.join(", ")}]), ` +
				`got ${JSON.stringify(row)}.`,
		);
	}
}

/** Read every `Background.json` record, sorted by `pk` for deterministic output. */
export function readBackgrounds(): BackgroundRecord[] {
	const filePath = path.join(CACHE_OPEN5E_DIR, "Background.json");
	const raw = JSON.parse(readFileSync(filePath, "utf8")) as unknown[];
	return raw
		.map((row, index) => {
			assertBackgroundShape(row, index);
			return {
				pk: row.pk,
				desc: row.fields.desc,
				document: row.fields.document,
				name: row.fields.name,
			};
		})
		.sort((a, b) => a.pk.localeCompare(b.pk));
}

export function backgroundByPk(pk: string): BackgroundRecord {
	const record = readBackgrounds().find((background) => background.pk === pk);
	if (record === undefined) {
		throw new Error(`background: no Background.json record with pk '${pk}' in the cache.`);
	}
	return record;
}

/** Read every `BackgroundBenefit.json` record, in the cache's own printed order (NOT re-sorted — see `backgroundBenefitsByParent` for the per-background ordering this chapter actually relies on). */
export function readBackgroundBenefits(): BackgroundBenefitRecord[] {
	const filePath = path.join(CACHE_OPEN5E_DIR, "BackgroundBenefit.json");
	const raw = JSON.parse(readFileSync(filePath, "utf8")) as unknown[];
	return raw.map((row, index) => {
		assertBackgroundBenefitShape(row, index);
		return {
			pk: row.pk,
			desc: row.fields.desc,
			name: row.fields.name,
			parent: row.fields.parent,
			type: row.fields.type as BackgroundBenefitType,
		};
	});
}

/**
 * The exactly-5 `BackgroundBenefit.json` rows for one `Background.json` pk,
 * ordered by `BACKGROUND_BENEFIT_TYPES` (ability_score, skill_proficiency,
 * tool_proficiency, equipment, feat) rather than file order — unlike
 * `FeatBenefit.json`, these pks carry no embedded ordinal
 * (`srd-2024_acolyte_ability-scores`, not `srd-2024_acolyte_1_...`), so the
 * TYPED field is the only stable ordering signal. Throws if a background is
 * missing any of the 5 types or carries a duplicate.
 */
export function backgroundBenefitsByParent(parentPk: string): BackgroundBenefitRecord[] {
	const rows = readBackgroundBenefits().filter((row) => row.parent === parentPk);
	const byType = new Map(rows.map((row) => [row.type, row]));
	if (
		byType.size !== BACKGROUND_BENEFIT_TYPES.length ||
		rows.length !== BACKGROUND_BENEFIT_TYPES.length
	) {
		throw new Error(
			`background: expected exactly the ${BACKGROUND_BENEFIT_TYPES.length} typed BackgroundBenefit ` +
				`rows [${BACKGROUND_BENEFIT_TYPES.join(", ")}] for parent '${parentPk}', found ` +
				`[${rows.map((row) => row.type).join(", ")}].`,
		);
	}
	return BACKGROUND_BENEFIT_TYPES.map((type) => {
		const row = byType.get(type);
		if (row === undefined) {
			// Unreachable given the size check above — defensive guard only.
			throw new Error(`background: no '${type}' BackgroundBenefit row for parent '${parentPk}'.`);
		}
		return row;
	});
}
