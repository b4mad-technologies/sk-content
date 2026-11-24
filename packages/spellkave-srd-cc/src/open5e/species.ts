// Typed reader for `cache/open5e/Species.json` (9 records, `desc` always
// empty — identity/name only, same "identity list, desc empty" shape as
// `./background.ts`'s parent `Background.json`). Same reader shape as
// `./alignment-description.ts` / `./creature-type-description.ts` (this
// package's own single-table open5e reader precedent).
import { readFileSync } from "node:fs";
import path from "node:path";

import { CACHE_OPEN5E_DIR } from "./paths";

interface RawSpeciesRow {
	fields: {
		desc: string;
		document: string;
		name: string;
		subspecies_of: string | null;
	};
	model: string;
	pk: string;
}

/** One `Species.json` record, flattened out of open5e's `fields` wrapper. */
export interface SpeciesRecord {
	/** open5e pk, e.g. `srd-2024_dragonborn` — carried forward as provenance. */
	pk: string;
	desc: string;
	document: string;
	name: string;
	subspeciesOf: string | null;
}

function assertShape(row: unknown, index: number): asserts row is RawSpeciesRow {
	const candidate = row as Partial<RawSpeciesRow> | null;
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
		(candidate.fields.subspecies_of !== null && typeof candidate.fields.subspecies_of !== "string")
	) {
		throw new Error(
			`species: malformed record at index ${index} in Species.json — expected ` +
				"{ fields: { desc, document, name, subspecies_of }, model, pk }, " +
				`got ${JSON.stringify(row)}.`,
		);
	}
}

/** Read every `Species.json` record, sorted by `pk` for deterministic output (already alphabetical). */
export function readSpecies(): SpeciesRecord[] {
	const filePath = path.join(CACHE_OPEN5E_DIR, "Species.json");
	const raw = JSON.parse(readFileSync(filePath, "utf8")) as unknown[];
	return raw
		.map((row, index) => {
			assertShape(row, index);
			return {
				pk: row.pk,
				desc: row.fields.desc,
				document: row.fields.document,
				name: row.fields.name,
				subspeciesOf: row.fields.subspecies_of,
			};
		})
		.sort((a, b) => a.pk.localeCompare(b.pk));
}

// --- SpeciesTrait.json (O3, `ledger/character-origins.md`) -----------------
//
// 51 total records: 9 `type: "SIZE"` + 9 `type: "SPEED"` (O2-shipped, already
// folded into `species-units.ts`'s own `entity_definition_initial_state`
// seeds — EXCLUDED here to avoid double-shipping) + 33 `type: null` prose
// rows, the chapter's actual per-species trait catalog (O3's own scope:
// "All non-size/speed traits as entity_definitions"). Verified against the
// live cache (never trusted from a brief's own numbers, per this slice's
// build instructions): `cache/open5e/SpeciesTrait.json` genuinely has
// exactly 9+9+33=51 rows, `type` is the ONLY field distinguishing the three
// groups.

interface RawSpeciesTraitRow {
	fields: {
		desc: string;
		name: string;
		order: number;
		parent: string;
		type: string | null;
	};
	model: string;
	pk: string;
}

/** One `SpeciesTrait.json` record, flattened out of open5e's `fields` wrapper. */
export interface SpeciesTraitRecord {
	/** open5e pk, e.g. `srd-2024_dwarf_dwarven-toughness` — carried forward as provenance. */
	pk: string;
	desc: string;
	name: string;
	/** Position within the owning species' trait list (Size=1, Speed=2, then 3..N) — NOT reused as this module's own ordering; kept for provenance/debugging. */
	order: number;
	/** `Species.json` pk this trait belongs to, e.g. `srd-2024_dwarf`. */
	parent: string;
	/** `"SIZE"` / `"SPEED"` (O2-shipped) or `null` (the 33 prose trait rows this module reads). */
	type: string | null;
}

function assertSpeciesTraitShape(row: unknown, index: number): asserts row is RawSpeciesTraitRow {
	const candidate = row as Partial<RawSpeciesTraitRow> | null;
	if (
		candidate === null ||
		typeof candidate !== "object" ||
		typeof candidate.pk !== "string" ||
		typeof candidate.model !== "string" ||
		typeof candidate.fields !== "object" ||
		candidate.fields === null ||
		typeof candidate.fields.desc !== "string" ||
		typeof candidate.fields.name !== "string" ||
		typeof candidate.fields.order !== "number" ||
		typeof candidate.fields.parent !== "string" ||
		(candidate.fields.type !== null && typeof candidate.fields.type !== "string")
	) {
		throw new Error(
			`species: malformed record at index ${index} in SpeciesTrait.json — expected ` +
				"{ fields: { desc, name, order, parent, type }, model, pk }, " +
				`got ${JSON.stringify(row)}.`,
		);
	}
}

const EXPECTED_SPECIES_TRAIT_TOTAL = 51;
const EXPECTED_SIZE_OR_SPEED_COUNT = 18;
const EXPECTED_MECHANICAL_TRAIT_COUNT = 33;

/** Read every `SpeciesTrait.json` record (all 51 rows, every `type`), sorted by `(parent, order)` — the file's own natural per-species ordering. */
function readAllSpeciesTraits(): SpeciesTraitRecord[] {
	const filePath = path.join(CACHE_OPEN5E_DIR, "SpeciesTrait.json");
	const raw = JSON.parse(readFileSync(filePath, "utf8")) as unknown[];
	const rows = raw.map((row, index) => {
		assertSpeciesTraitShape(row, index);
		return {
			pk: row.pk,
			desc: row.fields.desc,
			name: row.fields.name,
			order: row.fields.order,
			parent: row.fields.parent,
			type: row.fields.type,
		};
	});
	if (rows.length !== EXPECTED_SPECIES_TRAIT_TOTAL) {
		throw new Error(
			`species: expected ${EXPECTED_SPECIES_TRAIT_TOTAL} SpeciesTrait.json rows, found ` +
				`${rows.length} — species.ts's own header may be stale.`,
		);
	}
	return rows.sort((a, b) => a.parent.localeCompare(b.parent) || a.order - b.order);
}

/**
 * The 33 mechanically-relevant trait rows (`type === null`) — Size/Speed
 * (`type: "SIZE"` / `"SPEED"`, 9 each, O2-shipped) EXCLUDED to avoid
 * double-shipping (`ledger/character-origins.md`'s O3 row: "51 - 18
 * size/speed = 33"). Sub-choice tables (Draconic Ancestors, Elven Lineages,
 * Fiendish Legacies, Gnomish Lineage, Giant Ancestry) ride VERBATIM inside
 * each row's own `desc` — open5e does not decompose them into separate
 * records, so this reader doesn't invent that decomposition either
 * (`trait-units.ts`'s own header: "question-never-copy" against the sister
 * bundle's Foundry-sourced per-sub-choice entities).
 */
export function readSpeciesTraits(): SpeciesTraitRecord[] {
	const rows = readAllSpeciesTraits().filter((row) => row.type === null);
	const sizeOrSpeedCount = readAllSpeciesTraits().length - rows.length;
	if (sizeOrSpeedCount !== EXPECTED_SIZE_OR_SPEED_COUNT) {
		throw new Error(
			`species: expected ${EXPECTED_SIZE_OR_SPEED_COUNT} SIZE/SPEED SpeciesTrait.json rows, found ` +
				`${sizeOrSpeedCount}.`,
		);
	}
	if (rows.length !== EXPECTED_MECHANICAL_TRAIT_COUNT) {
		throw new Error(
			`species: expected ${EXPECTED_MECHANICAL_TRAIT_COUNT} mechanically-relevant SpeciesTrait.json ` +
				`rows, found ${rows.length} — trait-units.ts's own header may be stale.`,
		);
	}
	return rows;
}
