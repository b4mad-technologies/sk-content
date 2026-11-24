// DOC-IMPL: tags-and-ids#dont-mint-vocabulary-without-a-reader
// Chapter unit: "Generate Your Scores" / "Assign Ability Scores" / "Adjust
// Ability Scores" (`character-creation.md:296-534`) — slice C3 (`ledger/
// character-creation.md`'s C3 row + its "C3 direction" / "Point-cost/
// Standard-Array as DSL macros" addenda).
//
// SCOPE (per the addenda, binding): NO DSL macro, NO affordance, NO resource
// in this slice — "a DSL macro earns its place only with an in-world
// reader"; today's only reader of the Point Cost table is the TS builder
// (validating a seeded array at authoring time) and of the Standard Array
// table is this same generator (seeding the playing-the-game proof hero's
// scores, `proof-scene/identity.ts`). Both tables therefore ship as TS
// source (the parsed `markdown/character-creation.ts` readers) PLUS
// `srd.character_creation` tag metadata for author/DM discovery — the
// `reference-tables-as-tag-metadata` design's posture (`ledger/designs/
// reference-tables-as-tag-metadata.md`): description text generated from the
// parsed source, source pk retained, no per-rung fixture rows minted solely
// to reproduce a table cell.
//
// SHAPE DECISION (this slice, not previously catalogued): Point Cost and
// Standard Array are each rendered as ONE tag_value_definition embedding the
// COMPLETE table — not one row per score/class. Two reasons this differs
// from the alignment/language "closed choice catalogs" variant (one row per
// named choice): (1) neither table is queried by identity — nothing will
// ever carry `srd.character_creation.standard_array.fighter` the way an entity carries
// `srd.alignment.chaotic-neutral`, since a CLASS is not a tagged definition
// in this bundle; (2) both tables are genuinely LOOKUPS (score -> cost;
// class -> six scores), the same shape `srd.ability_score` (1-30 meaning
// bands) and `srd.difficulty_class` (six-label ladder) already use as a
// single embedded table. The background-adjustment procedure gets its own
// row for the same reason `srd.alignment`'s class row embeds the Unaligned
// Creatures callout: a related rule, not itself a table.
import {
	readAbilityScorePointCostsTable,
	readAdjustAbilityScoresProcedure,
	readStandardArrayByClassTable,
	type StandardArrayByClassRow,
} from "../../markdown/character-creation";
import type { ChapterUnitSummary } from "../chapter-types";
import { ABILITY_MODIFIERS_RULE_PK } from "../playing-the-game/modifier-units";
import type { TagValueDefinitionUnit } from "../playing-the-game/tag-value-vocabulary";
import { driveUnitFragment } from "../verb-runner";

const SRD_TAG_PREFIX = "srd";

/** The declared exact-vocabulary prefix for the creation-tables sub-tags (`srd.character_creation.<slug>`). */
export const CREATION_TABLES_TAG_PREFIX = "srd.character_creation";

/** The class-level tag shared by every creation-tables tag value — same umbrella-row idiom as `srd.alignment`/`srd.language`. */
export const CREATION_TABLES_CLASS_TAG = CREATION_TABLES_TAG_PREFIX;
export const CREATION_TABLES_POINT_COST_TAG = `${CREATION_TABLES_TAG_PREFIX}.point_cost`;
export const CREATION_TABLES_STANDARD_ARRAY_TAG = `${CREATION_TABLES_TAG_PREFIX}.standard_array`;
export const CREATION_TABLES_BACKGROUND_ADJUSTMENT_TAG = `${CREATION_TABLES_TAG_PREFIX}.background_adjustment`;

const GENERATE_SCORES_ANCHOR =
	"character-creation.md:296-308 (§ Ability Scores > Generate Your Scores)";
const POINT_COSTS_ANCHOR = "character-creation.md:310-347 (§ Ability Score Point Costs)";
const STANDARD_ARRAY_ANCHOR = "character-creation.md:355-479 (§ Standard Array by Class)";
const ADJUST_ANCHOR = "character-creation.md:481-485 (§ Adjust Ability Scores)";
const MODIFIERS_TABLE_ANCHOR = "character-creation.md:491-534 (§ Ability Scores and Modifiers)";

const EXPECTED_STANDARD_ARRAY_CLASS_COUNT = 12;

/**
 * Look up one class's Standard Array by Class row. Throws loudly if the
 * class name isn't found — used both to render the shared tag description
 * AND (the SAME parsed call, never a second literal) to seed the
 * playing-the-game proof hero's ability scores (`proof-scene/identity.ts`).
 */
export function standardArrayForClass(className: string): StandardArrayByClassRow {
	const rows = readStandardArrayByClassTable();
	const row = rows.find((candidate) => candidate.className === className);
	if (row === undefined) {
		throw new Error(
			`creation-tables-units: no Standard Array by Class row named '${className}' — got: ` +
				`${JSON.stringify(rows.map((r) => r.className))}.`,
		);
	}
	return row;
}

/** Render the class-level `srd.character_creation` tag description: the three generation-method overview. */
export function creationTablesClassTagDescription(): string {
	return "Ability-score generation methods — Standard Array, Random Generation, or Point Cost.";
}

/** Render the source-derived Ability Score Point Costs table into shared tag metadata. */
export function creationTablesPointCostTagDescription(): string {
	if (readAbilityScorePointCostsTable().length === 0) {
		throw new Error("creation-tables-units: Ability Score Point Costs table is empty.");
	}
	return "Ability Score Point Costs — the Point Cost generation table.";
}

/** Render the source-derived Standard Array by Class table into shared tag metadata. */
export function creationTablesStandardArrayTagDescription(): string {
	const rows = readStandardArrayByClassTable();
	if (rows.length !== EXPECTED_STANDARD_ARRAY_CLASS_COUNT) {
		throw new Error(
			`creation-tables-units: expected ${EXPECTED_STANDARD_ARRAY_CLASS_COUNT} Standard Array by Class ` +
				`rows, got ${rows.length}.`,
		);
	}
	return "Standard Array by Class — suggested ability-score placement per class.";
}

/** Render the source-derived background +2/+1 adjustment procedure into shared tag metadata. */
export function creationTablesBackgroundAdjustmentTagDescription(): string {
	if (readAdjustAbilityScoresProcedure().length === 0) {
		throw new Error("creation-tables-units: background adjustment procedure is empty.");
	}
	return "Background ability-score adjustment — apply the +2 and +1 from the chosen origin.";
}

/**
 * The class-level `srd.character_creation` row plus the three sub-tags (point cost,
 * standard array, background adjustment) — 4 rows total, the exact set
 * `creation-tables.toml` emits.
 */
export function buildCreationTablesTagValueUnits(): TagValueDefinitionUnit[] {
	return [
		{
			tag: CREATION_TABLES_CLASS_TAG,
			prefix: SRD_TAG_PREFIX,
			description: creationTablesClassTagDescription(),
			sourcePk: GENERATE_SCORES_ANCHOR,
		},
		{
			tag: CREATION_TABLES_POINT_COST_TAG,
			prefix: CREATION_TABLES_TAG_PREFIX,
			description: creationTablesPointCostTagDescription(),
			sourcePk: POINT_COSTS_ANCHOR,
		},
		{
			tag: CREATION_TABLES_STANDARD_ARRAY_TAG,
			prefix: CREATION_TABLES_TAG_PREFIX,
			description: creationTablesStandardArrayTagDescription(),
			sourcePk: STANDARD_ARRAY_ANCHOR,
		},
		{
			tag: CREATION_TABLES_BACKGROUND_ADJUSTMENT_TAG,
			prefix: CREATION_TABLES_TAG_PREFIX,
			description: creationTablesBackgroundAdjustmentTagDescription(),
			sourcePk: ADJUST_ANCHOR,
		},
	];
}

/**
 * The Ability Scores and Modifiers table (`:491-534`) is ALREADY live as the
 * `srd/ability_modifier` macro (`playing-the-game/modifier-units.ts`,
 * sourced from `Rule.json` pk {@link ABILITY_MODIFIERS_RULE_PK} — the SAME
 * score->modifier data this chapter's own HTML table prints). This slice
 * ships NO new row for it — only a provenance-only unit recording that the
 * chapter's own printed table is already mechanized, for the coverage
 * report's sake.
 */
export function creationTablesModifiersProvenanceUnit(): ChapterUnitSummary {
	return {
		kind: "provenance_only",
		id: "character-creation/ability-scores-and-modifiers",
		sourcePk: `${ABILITY_MODIFIERS_RULE_PK} (already live: srd/ability_modifier macro; see ${MODIFIERS_TABLE_ANCHOR})`,
	};
}

/**
 * Emit `base/character-creation/creation-tables.toml`: the 4 `srd.character_creation*` rows,
 * via the shared verb-runner path (AGENTS.md "one authoring engine"). Same
 * `onlyTagValueDefinitionTags` mechanism `alignment-units.ts` (C1) and
 * `language-units.ts` (C2) already established for a chapter authoring its
 * own NEW `tag_value_definitions` rows on top of the seeded vocabulary.
 */
export async function buildCreationTablesCatalogFragment(): Promise<{
	toml: string;
	units: ChapterUnitSummary[];
}> {
	const bundleId = "srd";
	const definitions = buildCreationTablesTagValueUnits();
	const fragment = await driveUnitFragment(
		bundleId,
		{
			toolName: "spellkave_write_rows",
			label: "character-creation-creation-tables-vocabulary",
			params: {
				bundle: bundleId,
				kind: "tag_value_definitions",
				rows: definitions.map(({ tag, prefix, description }) => ({
					tag,
					prefix,
					bundle_id: bundleId,
					description,
				})),
			},
		},
		{ onlyTagValueDefinitionTags: definitions.map((definition) => definition.tag) },
	);
	const header = [
		"# GENERATED by src/chapters/character-creation/creation-tables-units.ts — DO NOT EDIT BY HAND.",
		"# Regenerate: pnpm --filter @spellkave/srd-cc run generate",
		"#",
		"# The Character Creation chapter's Ability-Score Generation catalog (C3 —",
		"# ledger/character-creation.md): Ability Score Point Costs (:310), Standard",
		"# Array by Class (:355), and the background +2/+1 Adjust Ability Scores",
		"# procedure (:481), rendered as catalog-only tag metadata (reference-",
		"# tables-as-tag-metadata design, single-row-per-table shape — see this",
		"# file's own module header). The Ability Scores and Modifiers table (:491)",
		"# is deliberately NOT re-emitted here — already live as the srd/",
		"# ability_modifier macro (playing-the-game/modifier-units.ts).",
		"",
		"",
	].join("\n");
	return {
		toml: header + fragment,
		units: definitions.map((definition) => ({
			kind: "tag_value_definitions",
			id: definition.tag,
			sourcePk: definition.sourcePk,
		})),
	};
}
