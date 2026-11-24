// Typed reader for `cache/open5e-core/Language.json` (18 records, `pk` a
// kebab-case slug e.g. `deep-speech`, `thieves-cant`) — the open5e-core
// Django-fixture shape (`api_v2.language`), read ONLY from the committed
// cache (never the fork directly; see `../sources.ts`'s `OPEN5E_CORE_DIR`
// doc comment for the license/consumer-gating rationale). Same reader shape
// as `creature-type-description.ts` (the sibling identity-list source this
// package already established), pointed at `CACHE_OPEN5E_CORE_DIR` instead
// of `CACHE_OPEN5E_DIR` — a DIFFERENT cache directory, deliberately not
// reused (see `paths.ts`).
//
// Character Creation's Languages unit (C2, `ledger/character-creation.md`)
// is the sole consumer: the markdown "Choose Languages" section
// (`src/markdown/character-creation.ts`) is AUTHORITATIVE for the language
// SET and the Standard/Rare split; this reader contributes `desc`/`pk`
// provenance (plus `isSecret`) where a language matches, per that ledger
// row's sourcing note.
import { readFileSync } from "node:fs";
import path from "node:path";

import { CACHE_OPEN5E_CORE_DIR } from "./paths";

interface RawLanguageRow {
	fields: {
		desc: string;
		document: string;
		is_exotic: boolean;
		is_secret: boolean;
		name: string;
		script_language: string | null;
	};
	model: string;
	pk: string;
}

/** One `Language.json` record, flattened out of open5e's `fields` wrapper. */
export interface LanguageRecord {
	/** open5e pk, e.g. `draconic` / `deep-speech` / `thieves-cant` — carried forward as provenance. */
	pk: string;
	/** Printed name, e.g. "Deep Speech" / "Thieves' Cant" — used to join against the markdown tables. */
	name: string;
	/** Flavour/mechanic text (e.g. Thieves' Cant's own desc names it "A secret mix of dialect..."). */
	desc: string;
	/** Whether this is one of the setting's less-common/planar languages (open5e's own classification). */
	isExotic: boolean;
	/**
	 * Whether open5e itself flags this as a secret language (Druidic,
	 * Thieves' Cant — the only two `true` rows in the 18). This is a REAL
	 * synced field, not an authorial guess; Druidic's secrecy is
	 * independently corroborated by `cache/markdown/classes.md:3517`
	 * ("You know Druidic, the secret language of Druids").
	 */
	isSecret: boolean;
	document: string;
}

function assertShape(row: unknown, index: number): asserts row is RawLanguageRow {
	const candidate = row as Partial<RawLanguageRow> | null;
	if (
		candidate === null ||
		typeof candidate !== "object" ||
		typeof candidate.pk !== "string" ||
		typeof candidate.model !== "string" ||
		typeof candidate.fields !== "object" ||
		candidate.fields === null ||
		typeof candidate.fields.desc !== "string" ||
		typeof candidate.fields.document !== "string" ||
		typeof candidate.fields.is_exotic !== "boolean" ||
		typeof candidate.fields.is_secret !== "boolean" ||
		typeof candidate.fields.name !== "string" ||
		(candidate.fields.script_language !== null &&
			typeof candidate.fields.script_language !== "string")
	) {
		throw new Error(
			`language: malformed record at index ${index} in Language.json — expected ` +
				"{ fields: { desc, document, is_exotic, is_secret, name, script_language }, model, pk }, " +
				`got ${JSON.stringify(row)}.`,
		);
	}
}

const EXPECTED_LANGUAGE_COUNT = 18;

/** Read every `Language.json` record, sorted by `pk` for deterministic output. */
export function readLanguages(): LanguageRecord[] {
	const filePath = path.join(CACHE_OPEN5E_CORE_DIR, "Language.json");
	const raw = JSON.parse(readFileSync(filePath, "utf8")) as unknown[];
	const records = raw
		.map((row, index) => {
			assertShape(row, index);
			return {
				pk: row.pk,
				name: row.fields.name,
				desc: row.fields.desc,
				isExotic: row.fields.is_exotic,
				isSecret: row.fields.is_secret,
				document: row.fields.document,
			};
		})
		.sort((a, b) => a.pk.localeCompare(b.pk));
	if (records.length !== EXPECTED_LANGUAGE_COUNT) {
		throw new Error(
			`language: expected ${EXPECTED_LANGUAGE_COUNT} Language.json records, got ${records.length} ` +
				"— ledger/character-creation.md's sourcing note may be stale.",
		);
	}
	return records;
}

/** Find one `Language.json` record by its printed `name` (case-sensitive, exact match), or `undefined` if absent (the markdown-only case, e.g. "Common Sign Language"). */
export function languageByName(name: string): LanguageRecord | undefined {
	return readLanguages().find((record) => record.name === name);
}
