// Character Origins slice O2 (`ledger/character-origins.md`): the 9 SRD
// species identities plus Size/Speed. Ledger row: "O2 — Species identity +
// Size/Speed".
//
// SOURCES: `cache/open5e/Species.json` (9 rows, `desc` always empty —
// identity/name only, same shape as `Background.json`) +
// `cache/markdown/character-origins.md:97-374` (§ Character Species: 9
// per-species stat blocks, each opening with 3 bold-label lines — Creature
// Type / Size / Speed — never a clean pipe table, so this module carries a
// CLOSED per-species lookup, `SPECIES_MARKDOWN_FACTS`, the same idiom
// `background-units.ts`'s own `BACKGROUND_MARKDOWN_ANCHORS`/
// `TOOL_PROFICIENCY_BY_DESC` closed lookups already established for
// markdown-sourced facts that aren't machine-parseable tables).
//
// SIZE REPRESENTATION, DECIDED (operator ruling, 2026-07-31, `ledger/
// character-origins.md`'s O2 row): species ship BOTH ways —
//   (a) `srd.creature_size.<category>` TAG metadata, one of the 6 categories
//       `creature-size-units.ts` already parses (Tiny..Gargantuan) from the
//       SAME open5e Rule record `playing-the-game.md`'s Creature Size and
//       Space sidebar sources — reused here via its own exported
//       `creatureSizeTable()`, never re-parsed (this slice is that table's
//       FIRST real emitter: the table has shipped nothing since the day it
//       was authored, `creature-size-units.ts`'s own module header, "row-less
//       reference table").
//   (b) a real `srd/size` int-rank `resource_definitions` row (Tiny=1 ..
//       Gargantuan=6), seeded per species via `entity_definition_initial_state`
//       — KNOWINGLY CONSUMER-LESS today (the combat grid has no multi-cell
//       creature-footprint mechanic, `creature-size-units.ts`'s own header),
//       future consumers: size-aware grid occupancy, Goliath's Large Form
//       trait (O3, deferred), carrying-capacity rules. Marked as such in this
//       resource's own description.
// Choice-size species (Human, Tiefling — the SRD's own "chosen when you
// select this species" Medium-or-Small text) carry BOTH size tags; their
// `srd/size` seed defaults to the Medium rank (the SRD's own first-listed
// option). The website identity card is authored flavor, not a size note.
//
// TAG PREFIX REGISTRATION (binding session finding, mirrors C1 alignment /
// C2 language): `srd.species` and `srd.creature_size` are NEW DOTTED
// prefixes (not the bare `srd` catch-all `srd.background`/`srd.feat` use) —
// MF-VAL-306 requires a `tag_value_definitions` row's own `prefix` field to
// match a bundle-declared `tag_prefixes` entry VERBATIM, so both need their
// own `src/bundle-row.ts` entry (`target_kind: "tag_value_definitions"`,
// `natural_key_field: "tag"`), exactly the `srd.creature_type`/`srd.alignment`/
// `srd.language` precedent. Per-chapter authored vocabulary (not folded into
// `playing-the-game/tag-value-vocabulary.ts`'s central catalog) — same
// pattern as `character-creation/alignment-units.ts` /
// `language-units.ts`: this chapter's own `buildSpeciesFragment` drives the
// rows through `driveUnitFragment`'s `onlyTagValueDefinitionTags`.

import { readSpeciesFlavor } from "../../flavor/read";
import { readSpecies } from "../../open5e/species";
import {
	creatureSizeTable,
	MOVEMENT_AND_POSITION_RULE_PK,
} from "../playing-the-game/creature-size-units";
import type { TagValueDefinitionUnit } from "../playing-the-game/tag-value-vocabulary";

export const BUNDLE_ID = "srd";

const EXPECTED_SPECIES_COUNT = 9;

/** The declared exact-vocabulary prefix for the 9 SRD species (`srd.species.<slug>`) — see this module's own header for the MF-VAL-306 registration this requires. */
export const SPECIES_TAG_PREFIX = "srd.species";
/** The class-level tag every species entity carries alongside its own `srd.species.<slug>` value — same umbrella-row idiom as `srd.background`/`srd.feat`. */
export const SPECIES_CLASS_TAG = SPECIES_TAG_PREFIX;

/** The declared exact-vocabulary prefix for the 6 SRD creature-size categories (`srd.creature_size.<category>`) — no separate class row, same posture as `srd.creature_type` (`creature-type-units.ts`): a real future mechanical consumer renders its own class-level row, if it ever needs one. */
export const CREATURE_SIZE_TAG_PREFIX = "srd.creature_size";

const SRD_TAG_PREFIX = "srd";

const SPECIES_ANCHOR = "character-origins.md:65-95 (§ Character Species / Parts of a Species)";

/** `srd/size`'s own local + qualified resource id (this chapter's own numeric axis — not `playing-the-game`'s, per this slice's explicit build ownership, `ledger/character-origins.md`'s O2 row). */
export const SIZE_RESOURCE_LOCAL_ID = "size";
export const SIZE_RESOURCE_ID = `${BUNDLE_ID}/${SIZE_RESOURCE_LOCAL_ID}`;
export const SIZE_DISPLAY_NAME = "Size Category";
/** Tiny=1 .. Gargantuan=6 (`creature-size-units.ts`'s own 6-row parsed table, in source order). */
export const SIZE_MIN = 1;
export const SIZE_MAX = 6;
/** Medium (rank 3) — the commonest category across the 9 species (7 of 9; only Gnome/Halfling are Small) — same "commonest baseline" reasoning `grid-units.ts` used for `srd/speed-walk`'s own bundle-wide `initial_value`. Honestly >= `SIZE_MIN` (finding: a 0 initial_value would be out of bounds for a 1..6 rank axis). */
export const SIZE_INITIAL = 3;
export const SIZE_RECOVERY_RULE = "persistent";

/** One `CreatureSizeRow.size` -> 1-based rank, Tiny=1 .. Gargantuan=6, derived from `creatureSizeTable()`'s own source order (never a hand-typed literal map). */
export function creatureSizeRankByCategory(): Record<string, number> {
	const rows = creatureSizeTable();
	const ranks: Record<string, number> = {};
	rows.forEach((row, index) => {
		ranks[row.size] = index + 1;
	});
	return ranks;
}

/** Lowercase tag-value slug for a `CreatureSizeRow.size` category, e.g. "Medium" -> "medium". */
export function creatureSizeSlug(category: string): string {
	return category.toLowerCase();
}

/** The 6 `srd.creature_size.<category>` catalog rows — Tiny..Gargantuan, sourced from `creature-size-units.ts`'s own parsed table (same open5e Rule record for every row, `MOVEMENT_AND_POSITION_RULE_PK`). */
export function buildCreatureSizeTagValueUnits(): TagValueDefinitionUnit[] {
	return creatureSizeTable().map((row) => ({
		tag: `${CREATURE_SIZE_TAG_PREFIX}.${creatureSizeSlug(row.size)}`,
		prefix: CREATURE_SIZE_TAG_PREFIX,
		description: `${row.size} — a creature size category.`,
		sourcePk: MOVEMENT_AND_POSITION_RULE_PK,
	}));
}

/** Per-species facts NOT reachable from a clean markdown table (this module's own header) — a closed lookup, same idiom as `background-units.ts`'s `BACKGROUND_MARKDOWN_ANCHORS`. */
interface SpeciesMarkdownFacts {
	/** header line through the Speed line, e.g. "character-origins.md:97-101". */
	anchor: string;
	/** One category for a fixed-size species; two (Medium first) for a choice-size species. */
	sizeCategories: readonly string[];
	/** Verbatim parenthetical height text from the Size line. */
	heightText: string;
	speedFeet: number;
}

const SPECIES_MARKDOWN_FACTS: Record<string, SpeciesMarkdownFacts> = {
	"srd-2024_dragonborn": {
		anchor: "character-origins.md:97-101",
		sizeCategories: ["Medium"],
		heightText: "about 5–7 feet tall",
		speedFeet: 30,
	},
	"srd-2024_dwarf": {
		anchor: "character-origins.md:162-166",
		sizeCategories: ["Medium"],
		heightText: "about 4–5 feet tall",
		speedFeet: 30,
	},
	"srd-2024_elf": {
		anchor: "character-origins.md:180-184",
		sizeCategories: ["Medium"],
		heightText: "about 5–6 feet tall",
		speedFeet: 30,
	},
	"srd-2024_gnome": {
		anchor: "character-origins.md:235-239",
		sizeCategories: ["Small"],
		heightText: "about 3–4 feet tall",
		speedFeet: 30,
	},
	"srd-2024_goliath": {
		anchor: "character-origins.md:253-257",
		sizeCategories: ["Medium"],
		heightText: "about 7–8 feet tall",
		speedFeet: 35,
	},
	"srd-2024_halfling": {
		anchor: "character-origins.md:279-283",
		sizeCategories: ["Small"],
		heightText: "about 2–3 feet tall",
		speedFeet: 30,
	},
	"srd-2024_human": {
		anchor: "character-origins.md:295-299",
		sizeCategories: ["Medium", "Small"],
		heightText:
			"about 4–7 feet tall (Medium) or about 2–4 feet tall (Small), chosen when you select this species",
		speedFeet: 30,
	},
	"srd-2024_orc": {
		anchor: "character-origins.md:309-313",
		sizeCategories: ["Medium"],
		heightText: "about 6–7 feet tall",
		speedFeet: 30,
	},
	"srd-2024_tiefling": {
		anchor: "character-origins.md:325-329",
		sizeCategories: ["Medium", "Small"],
		heightText:
			"about 4–7 feet tall (Medium) or about 3–4 feet tall (Small), chosen when you select this species",
		speedFeet: 30,
	},
};

/** Every species in `character-origins.md` is Humanoid (`:81`, "playable non-Humanoid species appear in other books") — unit/srd.text metadata only, never a tag (task scope: creature type is not vocabulary, this slice). */
export const SPECIES_CREATURE_TYPE_TEXT =
	'Creature Type: Humanoid (character-origins.md:79-81, every species in "Character Origins" is Humanoid).';

export interface SpeciesUnit {
	/** `Species.json` pk suffix, e.g. `dragonborn` / `human`. */
	slug: string;
	/** `srd/species/<slug>` — this species' `entity_definitions` id. Sister-checked: `world-fixtures/srd/base/species.toml` ships this EXACT id for 6 of the 9 (dragonborn/dwarf/goliath/halfling/human/orc); the other 3 (elf/gnome/tiefling) ship ONLY lineage-crossed ids there (`elf-drow`/`elf-high`/`elf-wood`, `gnome-forest`/`gnome-rock`, `tiefling-abyssal`/`tiefling-chthonic`/`tiefling-infernal`) — this slice's bare per-species id is genuinely NEW for those 3 (no collision, O3 owns lineage decomposition). */
	entityId: string;
	displayName: string;
	sourcePk: string;
	markdownAnchor: string;
	/** One category for a fixed-size species; two (Medium first) for a choice-size species (Human, Tiefling). */
	sizeCategories: readonly string[];
	isSizeChoice: boolean;
	/** The `srd/size` rank seeded on the entity_definition — the Medium rank for a choice-size species (the SRD's own first-listed option). */
	defaultSizeRank: number;
	heightText: string;
	speedFeet: number;
	/** `speedFeet / GRID_SQUARE_FEET` — the SAME cell-count convention `srd/speed-walk` is authored in (`grid-units.ts`'s own module header). */
	speedCells: number;
}

const GRID_SQUARE_FEET = 5;

/** Build the 9 Species units, `Species.json` pk order (already alphabetical, same precedent as `background-units.ts`/`feats-units.ts`). */
export function buildSpeciesUnits(): SpeciesUnit[] {
	const species = readSpecies();
	if (species.length !== EXPECTED_SPECIES_COUNT) {
		throw new Error(
			`species-units: expected ${EXPECTED_SPECIES_COUNT} Species.json rows, found ` +
				`${species.length} — ledger/character-origins.md's "Sources" section may be stale.`,
		);
	}
	const ranks = creatureSizeRankByCategory();
	return species.map((record) => {
		const facts = SPECIES_MARKDOWN_FACTS[record.pk];
		if (facts === undefined) {
			throw new Error(`species-units: no markdown facts recorded for '${record.pk}'.`);
		}
		const slug = record.pk.slice("srd-2024_".length);
		const defaultCategory = facts.sizeCategories[0];
		if (defaultCategory === undefined) {
			throw new Error(`species-units: '${record.pk}' has no size categories recorded.`);
		}
		const defaultSizeRank = ranks[defaultCategory];
		if (defaultSizeRank === undefined) {
			throw new Error(
				`species-units: '${defaultCategory}' is not one of the 6 sourced creature-size categories.`,
			);
		}
		return {
			slug,
			entityId: `${BUNDLE_ID}/species/${slug}`,
			displayName: record.name,
			sourcePk: record.pk,
			markdownAnchor: facts.anchor,
			sizeCategories: facts.sizeCategories,
			isSizeChoice: facts.sizeCategories.length > 1,
			defaultSizeRank,
			heightText: facts.heightText,
			speedFeet: facts.speedFeet,
			speedCells: facts.speedFeet / GRID_SQUARE_FEET,
		};
	});
}

/**
 * Website identity card: authored Terra flavor under authored/flavor/en/species/.
 * Creature type, size/speed seeds, and Species.json provenance stay on the unit,
 * size tags, srd/size initial_state, and srd.text — never in this description.
 */
export function buildSpeciesDescription(unit: SpeciesUnit): string {
	return readSpeciesFlavor(unit.slug).body;
}

/** The 1 class row (`srd.species`) plus 9 per-species `srd.species.<slug>` rows — 10 total, the exact set this chapter's own species fragment emits. */
export function buildSpeciesTagValueUnits(): TagValueDefinitionUnit[] {
	const values: TagValueDefinitionUnit[] = buildSpeciesUnits().map((unit) => ({
		tag: `${SPECIES_TAG_PREFIX}.${unit.slug}`,
		prefix: SPECIES_TAG_PREFIX,
		description: `${unit.displayName} species. Size: ${unit.sizeCategories.join(" or ")}. Speed: ${unit.speedFeet} feet.`,
		sourcePk: unit.sourcePk,
	}));
	const classUnit: TagValueDefinitionUnit = {
		tag: SPECIES_CLASS_TAG,
		prefix: SRD_TAG_PREFIX,
		description: `Identifies an entity definition as one of the 9 SRD species (${SPECIES_ANCHOR}).`,
		sourcePk: SPECIES_ANCHOR,
	};
	return [classUnit, ...values];
}
