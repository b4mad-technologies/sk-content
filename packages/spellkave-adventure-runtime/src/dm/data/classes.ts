// `src/dm/data/` — the DM Runtime Library's DATA layer (ADR-0096 "Runtime-
// Rendered DM Content from a Typed Component Library"; slice plan
// `ledger/designs/dm-runtime-library-arc.md`, this is S3). Typed, cache-cited
// access to the Character Creation chapter's per-class tables — the source of
// every LATE-BOUND LITERAL (ADR-0096 D-1) the S4 creation-dialogue brain will
// bake into a rendered row (a level-1 Fighter's HP, a point-buy cost, a
// standard-array placement). This file NEVER hand-types a table cell: every
// row is read fresh, at call time, through the SAME committed-cache readers
// the rest of this package already proved out — the package's own "Rules are
// cited, never remembered" invariant (`AGENTS.md`), applied to the DM arc.
//
// REUSE, NOT RE-PARSE (S3 build instruction): this module composes THREE
// already-shipped readers rather than re-deriving their data —
//   - `buildClassUnits()` (`../../chapters/classes/classes-units.ts`, K1):
//     slug, display name, primary-ability text, hit-die size, and the FIXED
//     per-level-up HP base (`hpPerLevel`, itself
//     `fixedHitPointsPerLevelForClass(displayName)` — the "Fixed Hit Points
//     by Class" table, `character-creation.md:779-804`), already
//     cross-checked against `CharacterClass.json` for all 12 classes.
//   - `standardArrayForClass()` (`../../chapters/character-creation/
//     creation-tables-units.ts`, C3): the Standard Array by Class
//     suggestion (`:355-479`), already parsed and used to seed the
//     playing-the-game proof hero.
//   - `level1HitPointsBaseForClass()` (`../../markdown/character-
//     creation.ts`): the ONE genuinely missing reader this slice adds — the
//     "Level 1 Hit Points by Class" table (`:596-623`), a DIFFERENT table
//     from the Fixed Hit Points one above (level-1 BASELINE, 12/10/8/6 by
//     group, vs. the PER-LEVEL-UP increment, 7/6/5/4 by group) — added
//     following that file's own established reader/test pattern verbatim
//     (same anchor+regex extraction, same class-group flattening).
//
// The Constitution-modifier ADDITION for both HP bases is deliberately NOT
// applied here (same scope boundary `advancement-units.ts`'s own module
// header already draws for `srd/hp_per_level`): a per-actor computation,
// composed by `derived.ts`'s `level1Hp`/`fixedHpPerLevel`.

import { SRD_CLASS_CATALOG } from "./srd-catalog.ts";

/** One ability score assignment across the six abilities (order-agnostic; each field named). */
export interface AbilityScoreSpread {
	str: number;
	dex: number;
	con: number;
	int: number;
	wis: number;
	cha: number;
}

/**
 * One class's Character-Creation-relevant data, assembled from the three
 * readers this module's own header names — never a fourth, independent parse
 * of `classes.md`/`character-creation.md`.
 */
export interface ClassCreationData {
	/** Exact authored entity definition (classes-units.ts entityId contract). */
	definitionRef: string;
	/** `CharacterClass.json` pk suffix, e.g. `"fighter"` — the DROP-IN sister slug (`classes-units.ts`'s own convention, reused verbatim). */
	slug: string;
	displayName: string;
	/** Raw Core Traits table text, e.g. `"Strength or Dexterity"` (Fighter) — NOT decomposed into ability codes (`classes-units.ts`'s own deferred-capability-authoring posture, reused here: this is discovery text, not a gate). */
	primaryAbilityText: string;
	/** Core Traits "Skill Proficiencies" cell — parse via `class-choices.ts`. */
	skillProficienciesText: string;
	/** Core Traits "Starting Equipment" cell — parse via `class-choices.ts`. */
	startingEquipmentText: string;
	/** 6/8/10/12 — the class's Hit Point Die size. */
	hitDieSize: number;
	/** The Level 1 Hit Points by Class table's flat number (`character-creation.md:596-623`) — WITHOUT the Constitution modifier term; see `derived.ts`'s `level1Hp`. */
	level1HpBase: number;
	/** The Fixed Hit Points by Class table's flat number (`character-creation.md:779-804`) — WITHOUT the Constitution modifier term; see `derived.ts`'s `fixedHpPerLevel`. Identical to `classes-units.ts`'s own `ClassUnit.hpPerLevel` (same reader, reused, not re-derived). */
	fixedHpPerLevelBase: number;
	/** The Standard Array (15, 14, 13, 12, 10, 8) placed per this class's own suggested row (`character-creation.md:355-479`). */
	standardArray: AbilityScoreSpread;
	/** The ability whose modifier this class's Unarmored Defense feature adds
	 * to base AC on top of Dexterity (Barbarian: `con`, Monk: `wis`), or
	 * `null` for every other class — see `srd-catalog.ts`'s own field doc for
	 * the cited anchors. */
	unarmoredDefenseExtraAbility: "str" | "dex" | "con" | "int" | "wis" | "cha" | null;
	/** `CharacterClass.json` pk, e.g. `"srd-2024_fighter"` — provenance, carried through from `buildClassUnits()`. */
	sourcePk: string;
}

const EXPECTED_CLASS_COUNT = 12;

/**
 * All 12 SRD classes' Character-Creation data, `buildClassUnits()`'s own pk
 * order (alphabetical, Barbarian..Wizard). Every field traces to a committed
 * `cache/` reader — see this module's own header. Read fresh each call (no
 * caching across calls), matching this package's own established idiom for
 * every other cache-derived table builder (`xpThresholdForLevel`,
 * `expectedAbilityModifier`, …) — the source is a static, committed file, so
 * repeat reads are deterministic and side-effect-free between them.
 */
export function classCreationData(): ClassCreationData[] {
	const units = SRD_CLASS_CATALOG;
	if (units.length !== EXPECTED_CLASS_COUNT) {
		throw new Error(
			`dm/data/classes: expected ${EXPECTED_CLASS_COUNT} classes from SRD_CLASS_CATALOG, got ` +
				`${units.length}.`,
		);
	}
	return units.map((unit) => ({
		slug: unit.slug,
		definitionRef: `srd/class/${unit.slug}`,
		displayName: unit.displayName,
		primaryAbilityText: unit.primaryAbilityText,
		skillProficienciesText: unit.skillProficienciesText,
		startingEquipmentText: unit.startingEquipmentText,
		hitDieSize: unit.hitDieSize,
		level1HpBase: unit.level1HpBase,
		fixedHpPerLevelBase: unit.fixedHpPerLevelBase,
		standardArray: {
			str: unit.standardArray.str,
			dex: unit.standardArray.dex,
			con: unit.standardArray.con,
			int: unit.standardArray.int,
			wis: unit.standardArray.wis,
			cha: unit.standardArray.cha,
		},
		unarmoredDefenseExtraAbility: unit.unarmoredDefenseExtraAbility,
		sourcePk: unit.sourcePk,
	}));
}

/** Look up one class by its `CharacterClass.json`-derived slug (e.g. `"fighter"`). Throws loudly if unknown. */
export function classCreationDataBySlug(slug: string): ClassCreationData {
	const data = classCreationData().find((candidate) => candidate.slug === slug);
	if (data === undefined) {
		throw new Error(
			`dm/data/classes: no class with slug '${slug}' — known slugs: ` +
				`${JSON.stringify(classCreationData().map((c) => c.slug))}.`,
		);
	}
	return data;
}

/**
 * The bare Standard Array (`character-creation.md:304`: "Use the following
 * six scores for your abilities: 15, 14, 13, 12, 10, 8") — DERIVED from the
 * already-parsed Standard Array by Class table (every one of its 12 rows is
 * the same six scores in a different arrangement) rather than adding a
 * SECOND reader for one prose sentence. Self-checks that all 12 rows really
 * do share the same multiset before returning — a fork re-sync that broke
 * this invariant would otherwise silently ship a wrong "the" standard array.
 */
function sortedSpread(spread: AbilityScoreSpread): number[] {
	return [spread.str, spread.dex, spread.con, spread.int, spread.wis, spread.cha].sort(
		(a, b) => b - a,
	);
}

export function standardArrayScores(): readonly number[] {
	const data = classCreationData();
	const first = data[0];
	if (first === undefined) {
		throw new Error("dm/data/classes: classCreationData() returned no rows.");
	}
	const expected = sortedSpread(first.standardArray);
	for (const row of data) {
		const actual = sortedSpread(row.standardArray);
		if (JSON.stringify(actual) !== JSON.stringify(expected)) {
			throw new Error(
				`dm/data/classes: '${row.displayName}'s Standard Array row (sorted: ${JSON.stringify(actual)}) ` +
					`does not match the canonical Standard Array (${JSON.stringify(expected)}) — the source table ` +
					"may no longer place a single fixed set of six scores.",
			);
		}
	}
	return expected;
}
