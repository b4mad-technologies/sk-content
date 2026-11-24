// Typed reader for `cache/open5e/CharacterClass.json` (24 records: 12 base
// classes + 12 subclasses — `ledger/classes.md`'s "Sources" section). Same
// reader shape as `./species.ts` / `./background.ts`: flatten open5e's
// `fields` wrapper, fail loudly on a shape/count drift.
//
// PINNED DATA QUIRK (guard in every consumer, never silently "fix" —
// `ledger/classes.md`'s "Pinned data quirks" paragraph): subclass rows'
// OWN `hit_dice`/`caster_type` fields are INCONSISTENT — 10 of the 12
// subclasses carry `null`/`"NONE"`, but College of Lore carries `D8`/`FULL`
// and Path of the Berserker carries `D12`/`NONE` (coincidentally identical
// to their own parent's real values, verified against `readBaseCharacterClasses()`
// — Bard is D8/FULL, Barbarian is D12/NONE). A subclass's hit die/caster
// type must ALWAYS be read from its PARENT base-class row (via
// `subclassOf`), never from the subclass's own `hitDice`/`casterType`
// fields — `classes-units.ts`'s own module header names the consumer-side
// guard this reader alone cannot enforce (a subclass legitimately HAS these
// fields present in the raw JSON; only a caller reading them would be wrong).
import { readFileSync } from "node:fs";
import path from "node:path";

import { CACHE_OPEN5E_DIR } from "./paths";

interface RawCharacterClassRow {
	fields: {
		caster_type: string;
		desc?: string;
		document: string;
		hit_dice: string | null;
		name: string;
		primary_abilities: string[];
		saving_throws: string[];
		subclass_of: string | null;
	};
	model: string;
	pk: string;
}

/** One `CharacterClass.json` record, flattened out of open5e's `fields` wrapper. */
export interface CharacterClassRecord {
	/** open5e pk, e.g. `srd-2024_barbarian` / `srd-2024_path-of-the-berserker` — carried forward as provenance. */
	pk: string;
	name: string;
	/** `"D12"` etc for every BASE class; present-but-UNRELIABLE for some subclasses — see this module's own header. */
	hitDice: string | null;
	/** `NONE`/`FULL`/`HALF`/`PACT` for every BASE class; present-but-UNRELIABLE for some subclasses — see this module's own header. */
	casterType: string;
	/** Two lowercase 3-letter ability codes for a base class (e.g. `["con", "str"]`); empty for every subclass. */
	savingThrows: string[];
	/** Always empty in this cache — `primary_abilities` comes from markdown only (`ledger/classes.md`'s "Sources" note). */
	primaryAbilities: string[];
	/** `null` for a base class; the PARENT base class's pk for a subclass (e.g. `srd-2024_barbarian`). */
	subclassOf: string | null;
}

function assertShape(row: unknown, index: number): asserts row is RawCharacterClassRow {
	const candidate = row as Partial<RawCharacterClassRow> | null;
	if (
		candidate === null ||
		typeof candidate !== "object" ||
		typeof candidate.pk !== "string" ||
		typeof candidate.model !== "string" ||
		typeof candidate.fields !== "object" ||
		candidate.fields === null ||
		typeof candidate.fields.caster_type !== "string" ||
		typeof candidate.fields.document !== "string" ||
		(candidate.fields.hit_dice !== null && typeof candidate.fields.hit_dice !== "string") ||
		typeof candidate.fields.name !== "string" ||
		!Array.isArray(candidate.fields.primary_abilities) ||
		!Array.isArray(candidate.fields.saving_throws) ||
		(candidate.fields.subclass_of !== null && typeof candidate.fields.subclass_of !== "string")
	) {
		throw new Error(
			`character-class: malformed record at index ${index} in CharacterClass.json — expected ` +
				"{ fields: { caster_type, hit_dice, name, primary_abilities, saving_throws, subclass_of }, " +
				`model, pk }, got ${JSON.stringify(row)}.`,
		);
	}
}

const EXPECTED_TOTAL = 24;
const EXPECTED_BASE_COUNT = 12;
const EXPECTED_SUBCLASS_COUNT = 12;

/** Read every `CharacterClass.json` record (all 24 rows, base classes and subclasses alike), sorted by `pk` (already alphabetical). */
function readAllCharacterClasses(): CharacterClassRecord[] {
	const filePath = path.join(CACHE_OPEN5E_DIR, "CharacterClass.json");
	const raw = JSON.parse(readFileSync(filePath, "utf8")) as unknown[];
	const rows = raw.map((row, index) => {
		assertShape(row, index);
		return {
			pk: row.pk,
			name: row.fields.name,
			hitDice: row.fields.hit_dice,
			casterType: row.fields.caster_type,
			savingThrows: row.fields.saving_throws,
			primaryAbilities: row.fields.primary_abilities,
			subclassOf: row.fields.subclass_of,
		};
	});
	if (rows.length !== EXPECTED_TOTAL) {
		throw new Error(
			`character-class: expected ${EXPECTED_TOTAL} CharacterClass.json rows, found ` +
				`${rows.length} — ledger/classes.md's "Sources" section may be stale.`,
		);
	}
	return rows.sort((a, b) => a.pk.localeCompare(b.pk));
}

/** The 12 BASE classes (`subclassOf === null`) — pk order, already alphabetical (Barbarian..Wizard). */
export function readBaseCharacterClasses(): CharacterClassRecord[] {
	const rows = readAllCharacterClasses().filter((row) => row.subclassOf === null);
	if (rows.length !== EXPECTED_BASE_COUNT) {
		throw new Error(
			`character-class: expected ${EXPECTED_BASE_COUNT} base CharacterClass.json rows, found ` +
				`${rows.length}.`,
		);
	}
	return rows;
}

/** The 12 subclasses (`subclassOf !== null`) — pk order, already alphabetical. */
export function readSubclasses(): CharacterClassRecord[] {
	const rows = readAllCharacterClasses().filter((row) => row.subclassOf !== null);
	if (rows.length !== EXPECTED_SUBCLASS_COUNT) {
		throw new Error(
			`character-class: expected ${EXPECTED_SUBCLASS_COUNT} subclass CharacterClass.json rows, found ` +
				`${rows.length}.`,
		);
	}
	return rows;
}

/** Parse `"D12"` -> `12`. Throws loudly on any other shape — never silently coerced. */
export function hitDiceFaceValue(hitDice: string): number {
	const match = /^D(\d+)$/.exec(hitDice);
	if (match?.[1] === undefined) {
		throw new Error(`character-class: '${hitDice}' is not a 'D<n>' hit-die string.`);
	}
	return Number.parseInt(match[1], 10);
}
