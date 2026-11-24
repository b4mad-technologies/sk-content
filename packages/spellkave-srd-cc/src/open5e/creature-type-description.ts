// Typed reader for `cache/open5e/CreatureTypeDescription.json` (14 records,
// pk join `srd-2024_<slug>`) — the open5e Django-fixture shape, read ONLY
// from the committed cache (never the fork directly; see `../sources.ts`).
// Same reader shape as `ability-description.ts` (the sibling identity-list
// source this chapter already established).
import { readFileSync } from "node:fs";
import path from "node:path";

import { CACHE_OPEN5E_DIR } from "./paths";

interface RawCreatureTypeDescriptionRow {
	fields: {
		desc: string;
		describes: string;
		document: string;
	};
	model: string;
	pk: string;
}

/** One `CreatureTypeDescription.json` record, flattened out of open5e's `fields` wrapper. */
export interface CreatureTypeDescriptionRecord {
	/** open5e pk, e.g. `srd-2024_humanoid` — carried forward as provenance. */
	pk: string;
	/** Flavour text (e.g. "Beasts are non-Humanoid natural creatures..."). */
	desc: string;
	/** The lowercase creature-type slug this record describes (`humanoid`/`construct`/…). */
	describes: string;
	document: string;
}

function assertShape(row: unknown, index: number): asserts row is RawCreatureTypeDescriptionRow {
	const candidate = row as Partial<RawCreatureTypeDescriptionRow> | null;
	if (
		candidate === null ||
		typeof candidate !== "object" ||
		typeof candidate.pk !== "string" ||
		typeof candidate.model !== "string" ||
		typeof candidate.fields !== "object" ||
		candidate.fields === null ||
		typeof candidate.fields.desc !== "string" ||
		typeof candidate.fields.describes !== "string" ||
		typeof candidate.fields.document !== "string"
	) {
		throw new Error(
			`creature-type-description: malformed record at index ${index} in ` +
				`CreatureTypeDescription.json — expected { fields: { desc, describes, document }, ` +
				`model, pk }, got ${JSON.stringify(row)}.`,
		);
	}
}

/** Read every `CreatureTypeDescription.json` record, sorted by `pk` for deterministic output. */
export function readCreatureTypeDescriptions(): CreatureTypeDescriptionRecord[] {
	const filePath = path.join(CACHE_OPEN5E_DIR, "CreatureTypeDescription.json");
	const raw = JSON.parse(readFileSync(filePath, "utf8")) as unknown[];
	return raw
		.map((row, index) => {
			assertShape(row, index);
			return {
				pk: row.pk,
				desc: row.fields.desc,
				describes: row.fields.describes,
				document: row.fields.document,
			};
		})
		.sort((a, b) => a.pk.localeCompare(b.pk));
}
