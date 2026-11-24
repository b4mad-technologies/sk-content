// Chapter generator: "Character Creation" (SRD 5.2.1). See
// `ledger/character-creation.md` for the full chapter plan.
//
// C0 (scaffold): the registry entry (book order: after Playing the Game,
// before Equipment), and provenance-only units for
// the chapter's pure-prose sections.
// C1 (Alignment): the 9 `srd.alignment.*` catalog tags plus the class-level
// `srd.alignment` row — identity/vocabulary content, not a mechanic.
// C2 (Languages) + C3 (Ability-Score Generation): likewise catalog-only.
// C4 (Level Advancement): the chapter's FIRST real mechanic — `srd/xp` +
// `srd/hp_per_level` resources, the `srd/xp_threshold` DSL macro, and ONE
// `srd/advancement/level-up` action (`advancement-units.ts`'s own module
// header carries the full design record, grounded in `ledger/designs/
// character-advancement.md`). Flips `HAS_BEHAVIOR` to `true`.
// C5 (Step-5 derived numbers, THIS slice's addition): the Passive Perception
// formula (`derived-units.ts`'s `passivePerceptionExpr`, genuinely missing
// before this slice — see that module's own header) plus provenance-only
// units for the already-shipped Initiative/Armor Class/Attack-bonus
// formulas and deferred-with-owner units for Spell save DC / spell attack
// bonus (owner: a future classes/spells chapter).
//
// `ChapterUnitSummary` shape note: its `kind` field is documented as "a
// manifest row kind, e.g. `resource_definitions`" — every OTHER chapter's
// units describe a row this generator actually wrote. C0's units write none.
// Rather than inventing a parallel summary shape, this generator reuses
// `ChapterUnitSummary` with a sentinel, non-manifest `kind` value
// (`"provenance_only"`) — the field's own doc comment already widened it
// from a two-literal union to a bare row-kind STRING for exactly this kind of
// forward compatibility (Equipment chapter's header explains that widening).
// This chapter's plan (`ledger/character-creation.md`) explicitly asks for a
// `units` list here, so the sentinel-kind shape is used deliberately, not by
// accident; downstream code must never assume `kind === "provenance_only"`
// rows exist as manifest rows anywhere. C1's units use the REAL
// `"tag_value_definitions"` kind, since those units DO write a manifest row.
import type { AuthorTarget } from "@spellkave/tool-authoring";
import {
	type ChapterReaderProseResult,
	type ReaderSubjectAttachment,
	renderReaderProseForDocuments,
} from "../../compendium-metadata";
import { readRules } from "../../open5e/rule";
import type { ChapterUnitSummary } from "../chapter-types";
import { driveUnitFragment } from "../verb-runner";
import { buildAdvancementFragment } from "./advancement-units";
import { buildAlignmentTagValueUnits } from "./alignment-units";
import { buildCatalogueRowFragment } from "./catalogue-rows";
import {
	buildCreationTablesCatalogFragment,
	creationTablesModifiersProvenanceUnit,
} from "./creation-tables-units";
import { fillInNumbersProvenanceUnits, passivePerceptionProvenanceUnit } from "./derived-units";
import { buildLanguageCatalogFragment } from "./language-units";
import { buildPregenFragment } from "./pregen-units";
import { buildTrinketFragment } from "./trinkets";

export const BUNDLE_ID = "srd";

/**
 * C4 (Level Advancement) ships this chapter's first mechanic/runtime-consumed
 * rows — see this file's own header.
 */
export const HAS_BEHAVIOR = true;

const RULESET_CREATE_YOUR_CHARACTER = "srd-2024_create-your-character";
const EXPECTED_RULESET_ROW_COUNT = 7;

const CHOOSE_SHEET_ANCHOR = "character-creation.md:3 (§ Choose a Character Sheet)";
const IMAGINE_PAST_ANCHOR = "character-creation.md:189 (§ Imagine Your Past and Present)";
const TIERS_OF_PLAY_ANCHOR =
	'character-creation.md:812 (§ Tiers of Play — chapter\'s own text: "no rules associated")';

export interface CharacterCreationOutput {
	alignmentToml: string;
	units: ChapterUnitSummary[];
	/** C2's `base/character-creation/languages.toml` fragment — see `language-units.ts`. */
	languagesToml: string;
	/** C3's `base/character-creation/creation-tables.toml` fragment — see `creation-tables-units.ts`. */
	creationTablesToml: string;
	/** C4's `base/character-creation/advancement.toml` fragment — see `advancement-units.ts`. */
	advancementToml: string;
	/** Placeable Standard-Array class bodies — see `pregen-units.ts`. */
	pregenToml: string;
	trinketsToml: string;
	catalogueRowsToml: string;
}

/**
 * The "Create Your Character: 5-step overview" prose-procedure unit
 * (`character-creation.md:7`) is backed by the 7 `Rule.json` rows of the
 * `srd-2024_create-your-character` ruleset — read from the committed cache,
 * never hand-typed (AGENTS.md "rules are cited, never remembered"). One
 * `ChapterUnitSummary` per row, `sourcePk` citing the exact pk; `readRules()`
 * preserves the source file's own row order (Step 1..5, Gaining a Level,
 * Starting at Higher Levels), so no re-sort is needed for a stable, narrative
 * ordering.
 */
function fiveStepOverviewUnits(): ChapterUnitSummary[] {
	const rows = readRules().filter((rule) => rule.ruleset === RULESET_CREATE_YOUR_CHARACTER);
	if (rows.length !== EXPECTED_RULESET_ROW_COUNT) {
		throw new Error(
			`character-creation: expected ${EXPECTED_RULESET_ROW_COUNT} Rule.json rows for ruleset ` +
				`'${RULESET_CREATE_YOUR_CHARACTER}', found ${rows.length} — ` +
				'ledger/character-creation.md\'s "Sources" section may be stale.',
		);
	}
	return rows.map((rule) => ({
		kind: "provenance_only",
		id: `character-creation/create-your-character/${rule.pk}`,
		sourcePk: rule.pk,
	}));
}

/**
 * C1's alignment catalog: the 9 per-alignment `srd.alignment.<slug>` tag
 * values plus the class-level `srd.alignment` row (`alignment-units.ts`),
 * driven through the ONE authoring engine like every other fragment in this
 * package (AGENTS.md "one authoring engine"). `onlyTagValueDefinitionTags`
 * keeps ONLY this call's own 10 rows: every per-unit workspace is seeded
 * with the FULL currently-declared vocabulary first (`verb-runner.ts`'s
 * `tagValueVocabularySeedCall`), so a plain `retainTagValueDefinitions: true`
 * (the option `fragments/tag-vocabulary.ts` uses for playing-the-game's OWN
 * vocabulary fragment, where the "new" rows ARE the full seeded set and the
 * UPSERT replaces in place with no growth) would leak that whole seeded
 * vocabulary into THIS fragment too, since these rows are genuinely NEW
 * additions on top of the seed, not a replacement of it — the first chapter
 * other than playing-the-game to author its own `tag_value_definitions`
 * rows. Confirmed empirically: a first `run generate` without this option
 * duplicated all 31 playing-the-game tag rows into `alignment.toml`.
 */
async function buildAlignmentFragment(): Promise<{ toml: string; units: ChapterUnitSummary[] }> {
	const definitions = buildAlignmentTagValueUnits();
	const fragment = await driveUnitFragment(
		BUNDLE_ID,
		{
			toolName: "spellkave_write_rows",
			label: "alignment-tag-vocabulary",
			params: {
				bundle: BUNDLE_ID,
				kind: "tag_value_definitions",
				rows: definitions.map(({ tag, prefix, description }) => ({
					tag,
					prefix,
					bundle_id: BUNDLE_ID,
					description,
				})),
			},
		},
		{ onlyTagValueDefinitionTags: definitions.map((definition) => definition.tag) },
	);
	const header = [
		"# GENERATED by src/chapters/character-creation/alignment-units.ts — DO NOT EDIT BY HAND.",
		"# Regenerate: pnpm --filter @spellkave/srd-cc run generate",
		"#",
		"# The Nine Alignments (character-creation.md:542-568) plus the Unaligned",
		"# Creatures callout (:558-560), rendered as catalog-only tag metadata —",
		"# reference-tables-as-tag-metadata design's 'Closed choice catalogs'",
		"# variant (ledger/designs/reference-tables-as-tag-metadata.md): SRD 5.2",
		"# alignment carries no mechanic, so this ships as vocabulary, not a",
		"# resource/capability/predicate. Descriptions are generated verbatim from",
		"# cache/open5e/AlignmentDescription.json; the class-level srd.alignment",
		"# row's description embeds the Unaligned Creatures callout, sourced from",
		"# cache/markdown/character-creation.md.",
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

/**
 * C0's provenance-only units (`ledger/character-creation.md`'s C0 row):
 * the chapter's pure-prose sections (Choose a Sheet, Imagine Your Past,
 * Tiers of Play — the source's own "no rules associated" callout) plus the
 * 5-step overview's 7 Rule.json-backed rows — plus the chapter's shipped
 * `tag_value_definitions` catalogs: C1's alignment fragment
 * (`alignmentToml`, `alignment-units.ts`), C2's Choose Languages fragment
 * (`languagesToml`, `language-units.ts`), and C3's Ability-Score Generation
 * fragment (`creationTablesToml`, `creation-tables-units.ts`) plus its Ability Scores and
 * Modifiers provenance-only unit (already-live `srd/ability_modifier` macro);
 * and C4's Level Advancement fragment (`advancementToml`,
 * `advancement-units.ts`) — the chapter's first mechanic slice. `target`
 * threads the already-committed `fixtures/` bundle through to C4's fragment
 * builder, which references playing-the-game's `srd/level`/`srd/hp` rows.
 */
export async function generateCharacterCreation(
	target?: AuthorTarget,
): Promise<CharacterCreationOutput> {
	const alignment = await buildAlignmentFragment();
	const units: ChapterUnitSummary[] = [
		{
			kind: "provenance_only",
			id: "character-creation/choose-a-character-sheet",
			sourcePk: CHOOSE_SHEET_ANCHOR,
		},
		...fiveStepOverviewUnits(),
		{
			kind: "provenance_only",
			id: "character-creation/imagine-your-past-and-present",
			sourcePk: IMAGINE_PAST_ANCHOR,
		},
		...alignment.units,
		{
			kind: "provenance_only",
			id: "character-creation/tiers-of-play",
			sourcePk: TIERS_OF_PLAY_ANCHOR,
		},
	];
	const languages = await buildLanguageCatalogFragment();
	const creationTables = await buildCreationTablesCatalogFragment();
	const advancement = await buildAdvancementFragment(target);
	const pregen = await buildPregenFragment(target);
	const trinkets = await buildTrinketFragment(target);
	const catalogueRows = await buildCatalogueRowFragment(target);
	return {
		alignmentToml: alignment.toml,
		units: [
			...units,
			...languages.units,
			...creationTables.units,
			creationTablesModifiersProvenanceUnit(),
			...advancement.units,
			// C5 (Step-5 derived numbers): the shipped Passive Perception idiom
			// plus provenance/deferred-with-owner units for the rest of "Fill In
			// Numbers" — see derived-units.ts's own module header.
			passivePerceptionProvenanceUnit(),
			...fillInNumbersProvenanceUnits(),
			...pregen.units,
			...trinkets.units,
			...catalogueRows.units,
		],
		languagesToml: languages.toml,
		creationTablesToml: creationTables.toml,
		advancementToml: advancement.toml,
		pregenToml: pregen.toml,
		trinketsToml: trinkets.toml,
		catalogueRowsToml: catalogueRows.toml,
	};
}

/**
 * This chapter's own reader-prose fragment(s) — `ChapterEntry.generateReaderProse`
 * (`../index.ts`). Thin wrapper: the shared per-document render logic lives
 * in `renderReaderProseForDocuments` (`compendium-metadata.ts`).
 */
export function generateCharacterCreationReaderProse(
	attachments: readonly ReaderSubjectAttachment[],
): Promise<ChapterReaderProseResult> {
	return renderReaderProseForDocuments(["character-creation"], attachments);
}
