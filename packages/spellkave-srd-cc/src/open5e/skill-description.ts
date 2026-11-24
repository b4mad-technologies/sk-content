// Typed reader for `cache/open5e/SkillDescription.json` (18 records, pk join
// `srd-2024_<slug>`) — the open5e Django-fixture shape, read ONLY from the
// committed cache (never the fork directly; see `../sources.ts`). NOTE: this
// file carries no governing-ability field — that mapping is standard SRD 5e
// canon, authored separately in `../chapters/playing-the-game/skill-units.ts`.
import { readFileSync } from "node:fs";
import path from "node:path";

import { CACHE_OPEN5E_DIR } from "./paths";

interface RawSkillDescriptionRow {
	fields: {
		desc: string;
		describes: string;
		document: string;
	};
	model: string;
	pk: string;
}

/** One `SkillDescription.json` record, flattened out of open5e's `fields` wrapper. */
export interface SkillDescriptionRecord {
	/** open5e pk, e.g. `srd-2024_insight` — carried forward as TOML provenance. */
	pk: string;
	/** Example-use flavour text (e.g. "Discern a person's mood and intentions."). */
	desc: string;
	/** The skill slug this record describes (e.g. `insight`, `sleight-of-hand`). */
	describes: string;
	document: string;
}

function assertShape(row: unknown, index: number): asserts row is RawSkillDescriptionRow {
	const candidate = row as Partial<RawSkillDescriptionRow> | null;
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
			`skill-description: malformed record at index ${index} in SkillDescription.json — ` +
				`expected { fields: { desc, describes, document }, model, pk }, got ${JSON.stringify(row)}.`,
		);
	}
}

/** Read every `SkillDescription.json` record, sorted by `pk` for deterministic output. */
export function readSkillDescriptions(): SkillDescriptionRecord[] {
	const filePath = path.join(CACHE_OPEN5E_DIR, "SkillDescription.json");
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
