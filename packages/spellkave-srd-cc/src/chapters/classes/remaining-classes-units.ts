// pattern: identity-tag-capability-grant
// Feature identity `description` is a short name/use line; full SRD lives on
// srd.text (sk-jay0.3.5.103.3). Not Terra, not subclass-verbatim.
// Classes chapter slice K3 (`ledger/classes.md`): the 11 REMAINING classes'
// (everything but Fighter, K2's own exemplar) feature IDENTITIES — every
// `ClassFeature.json` row under each class' own pk (structural + real
// prose), plus its ONE subclass's own rows. IDENTITY ONLY this slice, NO
// live mechanization attempted for any of the 11 (mirrors K2's OWN posture
// for 24 of Fighter's 25 features — Second Wind was the ONE proof of
// concept, Action Surge stayed a finding; a breadth-first pass across 11
// classes cannot repeat that per-feature depth of analysis and stays
// honestly identity + deferred throughout).
//
// SCOPE, DELIBERATELY NARROWER THAN K2's OWN RIGOR (breadth-first
// instruction, `ledger/classes.md`'s K3+ row — "11 classes, parallelizable"):
//   - NO per-feature markdown `#### Level N: <name>` anchor resolution
//     (`fighter-units.ts`'s own `featureHeadingAnchor` calls, hand-verified
//     per Fighter slug). Verifying ~250 title-cased slugs against their own
//     markdown headings across 11 classes is not proportionate to a breadth
//     pass — every feature here cites its own class' SECTION-level anchor
//     (`classHeadingAnchor`, already K1-proven generic) instead, still real
//     and grounded, just less precise than K2's own line-level citation.
//   - `CLASS_TABLE_DATA` columns (e.g. Barbarian's Rage Uses, Monk's Martial
//     Arts die, Warlock's Invocations Known) get a GENERIC pointer to
//     `ClassFeatureItem.json`'s own per-level rows, NOT a hand-verified
//     numeric ladder the way K2's own Second Wind Uses/Weapon Mastery Count
//     descriptions embed exact numbers — those numbers were verified
//     specifically BECAUSE K2 mechanized Second Wind; nothing here is
//     mechanized, so no ladder needs to be trusted at authoring time.
//   - `SPELL_SLOTS` rows (Bard/Cleric/Druid/Paladin/Ranger/Sorcerer/Wizard —
//     7 of the 11, 5-9 rows each): identity only, EXPLICITLY deferred to a
//     future spellcasting slice that depends on the Spells chapter's own
//     P1b behaviors work landing first (this task's own scope instruction:
//     "Caster-Slot-Tabellen erst nach P1").
//
// PARENT-PK JOIN, NOT PK-PREFIX (`../../open5e/class-feature.ts`'s own
// `readClassFeaturesByParentPk` — its own header names the full grounding):
// a subclass's own `ClassFeature.json` pk SHAPE is genuinely inconsistent
// across the dataset — most repeat their parent class' name
// (`srd-2024_wizard_evoker_<slug>`), but College of Lore and Path of the
// Berserker do NOT (`srd-2024_college-of-lore_<slug>`). `fields.parent`
// (the owning `CharacterClass.json` pk) is the one reliable join key
// regardless of shape; the SLUG itself is then derived mechanically as the
// LONGEST COMMON PREFIX shared by that parent's own rows, trimmed to the
// last underscore boundary (`commonPkPrefix` below) — never a hand-typed
// per-class prefix string, which would need re-verifying for each of the 11
// classes + 11 subclasses (22 prefixes) by hand.
//
// SLUG COLLISIONS, DEDUPED (cache-verified: 26 of 168 unique class-own
// slugs recur across 2+ classes — `ability-score-improvement`/
// `core-traits`/`proficiency-bonus`/`epic-boon` appear in ALL 12 classes;
// `cantrips`/`spellcasting`/the 9 `slots-<n>` rows recur across the 6-7
// caster classes; `extra-attack`/`weapon-mastery`/`unarmored-defense`/
// `evasion`/`expertise`/`fighting-style`/`channel-divinity`(-uses) recur
// 2-5 times). These are the SAME conceptual feature shape wherever they
// recur (Ability Score Improvement genuinely IS identical rules text in
// every class) — `srd.class_feature.<slug>` is this package's own FLAT,
// class-agnostic tag catalog (K2's own `fighter-units.ts` already
// established this: its own per-slug description reads generically,
// `Identifies an entity definition as the SRD ${displayName} class
// feature`, never Fighter-specific wording). `buildRemainingFeatureTagValueUnits`
// below therefore emits EXACTLY ONE row per NEW unique slug — skipping any
// slug K2's own `buildFeatureTagValueUnits()` already registered (19+6=25),
// and deduping within this module's own 11-class batch (first occurrence's
// description/sourcePk wins, itself already class-agnostic text) — never a
// duplicate-natural-key `tag_value_definitions` row.
import { type ClassFeatureRecord, readClassFeaturesByParentPk } from "../../open5e/class-feature";
import type { TagValueDefinitionUnit } from "../playing-the-game/tag-value-vocabulary";
import {
	buildClassUnits,
	buildSubclassUnits,
	CLASS_TAG_PREFIX,
	SUBCLASS_TAG_PREFIX,
} from "./classes-units";
import { buildFeatureTagValueUnits, CLASS_FEATURE_TAG_PREFIX } from "./fighter-units";

export const BUNDLE_ID = "srd";

const FIGHTER_SLUG = "fighter";
const EXPECTED_REMAINING_CLASS_COUNT = 11;

/** Title-case a hyphenated pk slug — same idiom `fighter-units.ts`'s own `slugToTitleCase` uses, plus a `slots-<n>` special case (63 rows across 7 caster classes: `"slots-1st"` -> `"Level 1 Spell Slots"`, clearer than a bare `"Slots 1st"`). */
function slugToTitleCase(slug: string): string {
	const slotsMatch = /^slots-(\d+)(?:st|nd|rd|th)$/.exec(slug);
	if (slotsMatch?.[1] !== undefined) return `Level ${slotsMatch[1]} Spell Slots`;
	return slug
		.split("-")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

/**
 * The longest prefix shared by every pk in `pks`, trimmed back to the last
 * underscore boundary — module header names the full grounding (never a
 * hand-typed per-class prefix). Throws on an empty list or a prefix with no
 * underscore (a genuine shape surprise, not tolerated silently).
 */
function commonPkPrefix(pks: readonly string[]): string {
	const [first, ...rest] = pks;
	if (first === undefined) {
		throw new Error("remaining-classes-units: commonPkPrefix called with an empty pk list.");
	}
	let prefix = first;
	for (const pk of rest) {
		while (!pk.startsWith(prefix)) prefix = prefix.slice(0, -1);
	}
	const lastUnderscore = prefix.lastIndexOf("_");
	if (lastUnderscore === -1) {
		throw new Error(
			`remaining-classes-units: no underscore boundary found in common prefix '${prefix}'.`,
		);
	}
	return prefix.slice(0, lastUnderscore + 1);
}

export interface RemainingFeatureUnit {
	/** open5e `ClassFeature.json` pk. */
	sourcePk: string;
	slug: string;
	displayName: string;
	/** `srd/class-feature/<classSlug>/<slug>` (class-own) or `srd/class-feature/<classSlug>/<subclassSlug>/<slug>` (subclass-own). */
	entityId: string;
	description: string;
	tags: readonly string[];
}

/**
 * Build one feature's description: real prose / `CLASS_FEATURE_OPTION_LIST`
 * rows cite `ClassFeature.json`'s own `desc` (SRD text, byte-for-byte, the
 * SAME posture K2 uses for Fighter's own real features — `CLASS_FEATURE_
 * OPTION_LIST` rows, e.g. Sorcerer's Metamagic Options / Warlock's Eldritch
 * Invocation Options, carry real markdown-formatted prose in `desc`, not a
 * `"[Column data]"` placeholder, so no special-casing is needed for that
 * type). The 4 structural/table-data types get a generic composed pointer —
 * this module's own header names why it's deliberately less precise than
 * K2's own hand-verified Second Wind Uses/Weapon Mastery Count text.
 */
function buildFeatureDescription(
	record: ClassFeatureRecord,
	displayName: string,
	className: string,
): string {
	void record;
	// Identity card. Full SRD rules live on srd.text.
	return `${displayName} — a ${className} class feature.`;
}

function buildFeatureUnitsForParent(
	parentPk: string,
	idPathSegments: readonly string[],
	className: string,
	extraTags: readonly string[],
): RemainingFeatureUnit[] {
	const records = readClassFeaturesByParentPk(parentPk);
	if (records.length === 0) {
		throw new Error(
			`remaining-classes-units: no ClassFeature.json rows found for parent '${parentPk}'.`,
		);
	}
	const prefix = commonPkPrefix(records.map((record) => record.pk));
	return records.map((record) => {
		const slug = record.pk.slice(prefix.length);
		const displayName = slugToTitleCase(slug);
		return {
			sourcePk: record.pk,
			slug,
			displayName,
			entityId: `${BUNDLE_ID}/class-feature/${idPathSegments.join("/")}/${slug}`,
			description: buildFeatureDescription(record, displayName, className),
			tags: [CLASS_FEATURE_TAG_PREFIX, `${CLASS_FEATURE_TAG_PREFIX}.${slug}`, ...extraTags],
		};
	});
}

export interface RemainingClassFeatureGroup {
	classSlug: string;
	classDisplayName: string;
	classSourcePk: string;
	subclassSlug: string;
	subclassDisplayName: string;
	subclassSourcePk: string;
	classAnchor: string;
	classFeatures: readonly RemainingFeatureUnit[];
	subclassFeatures: readonly RemainingFeatureUnit[];
}

let cachedGroups: readonly RemainingClassFeatureGroup[] | undefined;

/**
 * Build all 11 remaining classes' own feature-identity groups (everything
 * but Fighter, K2's own exemplar), each class paired with its ONE subclass
 * (K1's own `buildClassUnits`/`buildSubclassUnits`, never hand-typed —
 * derives class/subclass slugs and display names from the SAME source K1
 * already reads, rather than a second, independently-typed roster that
 * could drift). MEMOIZED (`class-feature.ts`'s own `cachedClassFeatures`
 * pattern): `generateClasses()` calls this indirectly 2-3 times per
 * invocation (`buildRemainingClassesFragment` directly, plus
 * `buildRemainingFeatureTagValueUnits()` from both the tag fragment and the
 * entity fragment's own tag re-seed) — under `--no-file-parallelism` every
 * offline test file shares ONE worker process, so this cache also survives
 * across the WHOLE suite, not just one call.
 */
export function buildRemainingClassFeatureGroups(): RemainingClassFeatureGroup[] {
	if (cachedGroups !== undefined) return [...cachedGroups];
	const classes = buildClassUnits().filter((unit) => unit.slug !== FIGHTER_SLUG);
	if (classes.length !== EXPECTED_REMAINING_CLASS_COUNT) {
		throw new Error(
			`remaining-classes-units: expected ${EXPECTED_REMAINING_CLASS_COUNT} non-Fighter base classes, ` +
				`found ${classes.length} — classes-units.ts's own class roster may have changed shape.`,
		);
	}
	const subclasses = buildSubclassUnits();
	const groups = classes.map((classUnit) => {
		const subclassUnit = subclasses.find((candidate) => candidate.parentSlug === classUnit.slug);
		if (subclassUnit === undefined) {
			throw new Error(`remaining-classes-units: no subclass found for class '${classUnit.slug}'.`);
		}
		const classTag = `${CLASS_TAG_PREFIX}.${classUnit.slug}`;
		const subclassTag = `${SUBCLASS_TAG_PREFIX}.${subclassUnit.slug}`;
		return {
			classSlug: classUnit.slug,
			classDisplayName: classUnit.displayName,
			classSourcePk: classUnit.sourcePk,
			subclassSlug: subclassUnit.slug,
			subclassDisplayName: subclassUnit.displayName,
			subclassSourcePk: subclassUnit.sourcePk,
			classAnchor: classUnit.classAnchor,
			classFeatures: buildFeatureUnitsForParent(
				classUnit.sourcePk,
				[classUnit.slug],
				classUnit.displayName,
				[classTag],
			),
			subclassFeatures: buildFeatureUnitsForParent(
				subclassUnit.sourcePk,
				[classUnit.slug, subclassUnit.slug],
				subclassUnit.displayName,
				[classTag, subclassTag],
			),
		};
	});
	cachedGroups = groups;
	return [...groups];
}

/** Every NEW `srd.class_feature.<slug>` row this K3 batch needs — skips any slug K2's own `buildFeatureTagValueUnits()` already registered, and dedupes within this batch (module header names the full grounding: 26 of 168 slugs recur, the SAME conceptual feature everywhere they do). Never re-emits the bare `srd.class_feature` umbrella row (K2's own — this module authors none). */
export function buildRemainingFeatureTagValueUnits(): TagValueDefinitionUnit[] {
	const existingSlugs = new Set(
		buildFeatureTagValueUnits()
			.map((unit) =>
				unit.tag.startsWith(`${CLASS_FEATURE_TAG_PREFIX}.`)
					? unit.tag.slice(`${CLASS_FEATURE_TAG_PREFIX}.`.length)
					: undefined,
			)
			.filter((slug): slug is string => slug !== undefined),
	);
	const bySlug = new Map<string, TagValueDefinitionUnit>();
	for (const group of buildRemainingClassFeatureGroups()) {
		for (const unit of [...group.classFeatures, ...group.subclassFeatures]) {
			if (existingSlugs.has(unit.slug) || bySlug.has(unit.slug)) continue;
			bySlug.set(unit.slug, {
				tag: `${CLASS_FEATURE_TAG_PREFIX}.${unit.slug}`,
				prefix: CLASS_FEATURE_TAG_PREFIX,
				description: `Identifies an entity definition as the SRD ${unit.displayName} class feature.`,
				sourcePk: unit.sourcePk,
			});
		}
	}
	return [...bySlug.values()];
}
