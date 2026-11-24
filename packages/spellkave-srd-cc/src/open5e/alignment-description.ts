// Typed reader for `cache/open5e/AlignmentDescription.json` (9 records, pk
// join `srd-2024_<slug>`) — the open5e Django-fixture shape, read ONLY from
// the committed cache (never the fork directly; see `../sources.ts`).
// Same reader shape as `creature-type-description.ts` (the sibling
// identity-list source this package already established).
import { readFileSync } from "node:fs";
import path from "node:path";

import { CACHE_OPEN5E_DIR } from "./paths";

interface RawAlignmentDescriptionRow {
	fields: {
		desc: string;
		describes: string;
		document: string;
	};
	model: string;
	pk: string;
}

/** One `AlignmentDescription.json` record, flattened out of open5e's `fields` wrapper. */
export interface AlignmentDescriptionRecord {
	/** open5e pk, e.g. `srd-2024_lawful-good` — carried forward as provenance. */
	pk: string;
	/** Flavour text (e.g. "Lawful Good creatures endeavor to do the right thing..."). */
	desc: string;
	/** The kebab-case alignment slug this record describes (`lawful-good`/`chaotic-evil`/…). */
	describes: string;
	document: string;
}

function assertShape(row: unknown, index: number): asserts row is RawAlignmentDescriptionRow {
	const candidate = row as Partial<RawAlignmentDescriptionRow> | null;
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
			`alignment-description: malformed record at index ${index} in ` +
				`AlignmentDescription.json — expected { fields: { desc, describes, document }, ` +
				`model, pk }, got ${JSON.stringify(row)}.`,
		);
	}
}

/** Read every `AlignmentDescription.json` record, sorted by `pk` for deterministic output. */
export function readAlignmentDescriptions(): AlignmentDescriptionRecord[] {
	const filePath = path.join(CACHE_OPEN5E_DIR, "AlignmentDescription.json");
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
