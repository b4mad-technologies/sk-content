// Typed reader for `cache/open5e/Feat.json` (17 rows: 4 Origin, 2 General, 4
// Fighting Style, 7 Epic Boon) and `cache/open5e/FeatBenefit.json` (35 rows,
// `type` null on ALL — untyped, per `ledger/feats.md`'s own inventory note).
// This slice (F1) reads ONLY the 4 Origin rows — the committed cache carries
// every category, but the Feats chapter is deliberately thin (`ledger/
// feats.md`'s slice plan).
//
// TWO PINNED QUIRKS, read verbatim and never "fixed" (`ledger/feats.md`'s
// "Sources" section):
//   - Alert's two `FeatBenefit` rows BOTH carry pk `srd-2024_alert_2_
//     initative-proficiency`/`srd-2024_alert_1_initative-proficiency` — the
//     upstream fork's own typo ("initative"), preserved verbatim in
//     `FeatBenefitRecord.pk`. Never corrected here.
//   - Magic Initiate's second benefit row has JSON `name: "Level One Spell"`,
//     while the cached markdown's own heading reads "Level 1 Spell"
//     (`cache/markdown/feats.md:39`). `../chapters/feats/feats-units.ts`
//     prefers the markdown-sourced label for the GENERATED description text;
//     this reader still surfaces the raw JSON name unmodified, for whoever
//     wants it.
import { readFileSync } from "node:fs";
import path from "node:path";

import { CACHE_OPEN5E_DIR } from "./paths";

interface RawFeatRow {
	fields: {
		desc: string;
		document: string;
		name: string;
		prerequisite: string;
		type: string;
	};
	model: string;
	pk: string;
}

export interface FeatRecord {
	pk: string;
	desc: string;
	document: string;
	name: string;
	prerequisite: string;
	/** `"Origin"` / `"General"` / `"Fighting Style"` / `"Epic Boon"`. */
	type: string;
}

interface RawFeatBenefitRow {
	fields: {
		desc: string;
		name: string;
		parent: string;
		type: string | null;
	};
	model: string;
	pk: string;
}

export interface FeatBenefitRecord {
	pk: string;
	desc: string;
	/** Raw JSON name — may be `""` (Savage Attacker/Skilled's solo benefit) or diverge from the markdown heading (Magic Initiate's "Level One Spell"). Never corrected. */
	name: string;
	/** The owning `Feat.json` pk, e.g. `srd-2024_alert`. */
	parent: string;
}

function assertFeatShape(row: unknown, index: number): asserts row is RawFeatRow {
	const candidate = row as Partial<RawFeatRow> | null;
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
		typeof candidate.fields.prerequisite !== "string" ||
		typeof candidate.fields.type !== "string"
	) {
		throw new Error(
			`feat: malformed record at index ${index} in Feat.json — expected the cached feat identity fields, got ${JSON.stringify(row)}.`,
		);
	}
}

function assertFeatBenefitShape(row: unknown, index: number): asserts row is RawFeatBenefitRow {
	const candidate = row as Partial<RawFeatBenefitRow> | null;
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
		(candidate.fields.type !== null && typeof candidate.fields.type !== "string")
	) {
		throw new Error(
			`feat: malformed record at index ${index} in FeatBenefit.json — expected the cached feat-benefit fields, got ${JSON.stringify(row)}.`,
		);
	}
}

/** Read every `Feat.json` record, sorted by `pk` for deterministic output. */
export function readFeats(): FeatRecord[] {
	const filePath = path.join(CACHE_OPEN5E_DIR, "Feat.json");
	const raw = JSON.parse(readFileSync(filePath, "utf8")) as unknown[];
	return raw
		.map((row, index) => {
			assertFeatShape(row, index);
			return {
				pk: row.pk,
				desc: row.fields.desc,
				document: row.fields.document,
				name: row.fields.name,
				prerequisite: row.fields.prerequisite,
				type: row.fields.type,
			};
		})
		.sort((a, b) => a.pk.localeCompare(b.pk));
}

export function featByPk(pk: string): FeatRecord {
	const record = readFeats().find((feat) => feat.pk === pk);
	if (record === undefined) {
		throw new Error(`feat: no Feat.json record with pk '${pk}' in the cache.`);
	}
	return record;
}

/** Read every `FeatBenefit.json` record, in the cache's own printed order (NOT re-sorted — the pk's embedded ordinal is the only ordering signal, see `featBenefitsByParent`). */
export function readFeatBenefits(): FeatBenefitRecord[] {
	const filePath = path.join(CACHE_OPEN5E_DIR, "FeatBenefit.json");
	const raw = JSON.parse(readFileSync(filePath, "utf8")) as unknown[];
	return raw.map((row, index) => {
		assertFeatBenefitShape(row, index);
		return {
			pk: row.pk,
			desc: row.fields.desc,
			name: row.fields.name,
			parent: row.fields.parent,
		};
	});
}

const BENEFIT_ORDINAL_PATTERN = /^(\d+)(?:_|$)/;

/**
 * `FeatBenefit.json` rows for one `Feat.json` pk, ordered by the ordinal
 * embedded in each row's own pk (`<parent>_<N>[_<slug>]` — e.g. `srd-2024_
 * magic-initiate_2`, or `srd-2024_alert_1_initative-proficiency`, the pinned
 * pk-typo row). Throws if any matching row's pk doesn't carry a parseable
 * ordinal (a genuine shape surprise, not a quirk to paper over).
 */
export function featBenefitsByParent(parentPk: string): FeatBenefitRecord[] {
	const rows = readFeatBenefits().filter((row) => row.parent === parentPk);
	return rows
		.map((row) => {
			const match = BENEFIT_ORDINAL_PATTERN.exec(row.pk.slice(parentPk.length + 1));
			if (match === null || match[1] === undefined) {
				throw new Error(
					`feat: FeatBenefit row '${row.pk}' (parent '${parentPk}') has no parseable '_<N>' ordinal.`,
				);
			}
			return { row, ordinal: Number.parseInt(match[1], 10) };
		})
		.sort((a, b) => a.ordinal - b.ordinal)
		.map(({ row }) => row);
}
