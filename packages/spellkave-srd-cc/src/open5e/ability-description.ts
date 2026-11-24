// Typed reader for `cache/open5e/AbilityDescription.json` (6 records, pk
// join `srd-2024_<code>`) — the open5e Django-fixture shape, read ONLY from
// the committed cache (never the fork directly; see `../sources.ts`).
import { readFileSync } from "node:fs";
import path from "node:path";

import { CACHE_OPEN5E_DIR } from "./paths";

interface RawAbilityDescriptionRow {
	fields: {
		desc: string;
		describes: string;
		document: string;
	};
	model: string;
	pk: string;
}

/** One `AbilityDescription.json` record, flattened out of open5e's `fields` wrapper. */
export interface AbilityDescriptionRecord {
	/** open5e pk, e.g. `srd-2024_str` — carried forward as TOML provenance. */
	pk: string;
	/** Short ability-score flavour text (e.g. "Physical might"). */
	desc: string;
	/** The three-letter ability code this record describes (`str`/`dex`/…). */
	describes: string;
	document: string;
}

function assertShape(row: unknown, index: number): asserts row is RawAbilityDescriptionRow {
	const candidate = row as Partial<RawAbilityDescriptionRow> | null;
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
			`ability-description: malformed record at index ${index} in AbilityDescription.json — ` +
				`expected { fields: { desc, describes, document }, model, pk }, got ${JSON.stringify(row)}.`,
		);
	}
}

/** Read every `AbilityDescription.json` record, sorted by `pk` for deterministic output. */
export function readAbilityDescriptions(): AbilityDescriptionRecord[] {
	const filePath = path.join(CACHE_OPEN5E_DIR, "AbilityDescription.json");
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
