// pattern: tag-membership-menu
// Spells chapter, P1a's OWN `tag_value_definitions` catalog — every distinct
// value `spell-units.ts`'s `buildSpellTags` can emit across all 339 spells,
// deduplicated and derived mechanically from `readSpells()` (never a
// hand-typed enum): MF-VAL-300 ("ref-typed suffix resolution",
// `crates/spellkave-validate/src/tag_grammar.rs`) requires every tag whose
// longest-matching `tag_prefixes` entry targets `tag_value_definitions`
// (this bundle's bare `srd` catch-all does, `../../bundle-row.ts`) to
// resolve against an ACTUAL row — same requirement Equipment's
// `srd.item`/`srd.armor`/`srd.armor.heavy` and Feats' `srd.feat` already
// meet via `playing-the-game/tag-value-vocabulary.ts`'s central catalog
// (confirmed empirically: `pipeline.test.ts`'s zero-diagnostics gate and
// `fixtures-author-tool/tag-vocabulary.test.ts`'s resolution walk both
// reject an unresolved tag). Spells' OWN axes (school/level/casting-time/
// range/duration/components) are NEW vocabulary, so — same pattern
// Character Origins O2/O3 and Classes K1 use for their own new axes
// (`character-origins/index.ts`'s `buildSpeciesFragment`,
// `classes/index.ts`) — this chapter authors its OWN catalog rather than
// extending the central one; root axes plus one `srd.spell.list.<class>` row
// per distinct class on Spell.json (spellcasting substrate), NOT 339 — one row per
// distinct VALUE across the corpus, not per spell (same "closed-choice-
// catalog" register as `srd.creature_type`/`srd.alignment`, AGENTS.md's
// reference-tables maxim).
import { readSpells } from "../../open5e/spell";
import {
	DAMAGE_TYPE_TAG_PREFIX,
	damageTypeTag,
	SRD_DAMAGE_TYPES,
} from "../equipment/weapon-tag-values";
import { classSlugFromSpellClassPk, LEVEL_BAND_SLUGS, tagSlug } from "./spell-units";

/** Seed-only damage-type rows for isolated spell entity generation (BL-57 tags). Equipment owns the committed catalog — do NOT ship these from spells/tag-values.toml. */
export function buildSpellDamageTypeTagValueUnitsForSeed(): SpellTagValueUnit[] {
	return [
		{
			tag: DAMAGE_TYPE_TAG_PREFIX,
			prefix: "srd",
			description:
				"Identifies an entity definition tag as an SRD damage type (spell write-site routing, BL-57).",
			sourcePk: "",
		},
		...SRD_DAMAGE_TYPES.map((type) => ({
			tag: damageTypeTag(type),
			prefix: DAMAGE_TYPE_TAG_PREFIX,
			description: `Identifies a damaging spell as dealing ${type} damage — matches routeDamage ladder (BL-57).`,
			sourcePk: "",
		})),
	];
}

export interface SpellTagValueUnit {
	tag: string;
	prefix: string;
	description: string;
	sourcePk: string;
}

const PREFIX = "srd";

function titleCase(word: string): string {
	return `${word[0]?.toUpperCase() ?? ""}${word.slice(1)}`;
}

function uniqueSorted(values: readonly string[]): string[] {
	return [...new Set(values)].sort();
}

function unit(tag: string, description: string, prefix: string = PREFIX): SpellTagValueUnit {
	return { tag, prefix, description, sourcePk: "" };
}

/** Build the Spells chapter's own 64-row `tag_value_definitions` catalog — every axis value `spell-units.ts`'s `buildSpellTags` can emit, one row per distinct value (module header). */
export function buildSpellTagValueUnits(): SpellTagValueUnit[] {
	const spells = readSpells();
	const schools = uniqueSorted(spells.map((spell) => spell.school));
	const castingTimes = uniqueSorted(spells.map((spell) => spell.castingTime));
	const ranges = uniqueSorted(spells.map((spell) => spell.rangeText));
	const durations = uniqueSorted(spells.map((spell) => spell.duration));
	const classListSlugs = uniqueSorted(
		spells.flatMap((spell) => spell.classPks.map(classSlugFromSpellClassPk)),
	);

	return [
		unit("srd.spell", "Identifies an entity definition as an SRD spell."),
		...LEVEL_BAND_SLUGS.map((_band, level) =>
			unit(
				`srd.spell.level.${level}`,
				level === 0
					? "Identifies a spell entity as a cantrip (spell level 0)."
					: `Identifies a spell entity as a level ${level} spell.`,
			),
		),
		...schools.map((school) =>
			unit(
				`srd.spell.school.${tagSlug(school)}`,
				`Identifies a spell entity as belonging to the ${titleCase(school)} school of magic.`,
			),
		),
		...castingTimes.map((castingTime) =>
			unit(
				`srd.spell.casting_time.${tagSlug(castingTime)}`,
				`Identifies a spell entity with the cached SRD casting time '${castingTime}'.`,
			),
		),
		...ranges.map((rangeText) =>
			unit(
				`srd.spell.range.${tagSlug(rangeText)}`,
				`Identifies a spell entity with a range of ${rangeText}.`,
			),
		),
		...durations.map((duration) =>
			unit(
				`srd.spell.duration.${tagSlug(duration)}`,
				`Identifies a spell entity with a duration of ${duration}.`,
			),
		),
		unit(
			"srd.spell.concentration",
			"Identifies a spell entity that requires Concentration to maintain.",
		),
		unit("srd.spell.ritual", "Identifies a spell entity that can be cast as a Ritual."),
		unit(
			"srd.spell.component.v",
			"Identifies a spell entity that requires a Verbal (V) component.",
		),
		unit(
			"srd.spell.component.s",
			"Identifies a spell entity that requires a Somatic (S) component.",
		),
		unit(
			"srd.spell.component.m",
			"Identifies a spell entity that requires a Material (M) component.",
		),
		...classListSlugs.map((classSlug) =>
			unit(
				`srd.spell.list.${classSlug}`,
				`Identifies a spell entity on the ${titleCase(classSlug)} class spell list ` +
					"(cache/open5e/Spell.json fields.classes). docs/spellcasting-substrate.md.",
			),
		),
	];
}
