// pattern: identity-tag-capability-grant
// Classes chapter slice K1 (`ledger/classes.md`): the 12 base-class + 12
// subclass identities, plus the `srd/hit-die` resource and the `srd/
// hp_per_level` WRITER (the C4 interlock — `character-creation/
// advancement-units.ts` shipped the READER half only, this slice authors
// the real per-class values).
//
// SOURCES: `cache/open5e/CharacterClass.json` (24 rows: `hit_dice`/
// `caster_type`/`saving_throws` — the structured core, `../../open5e/
// character-class.ts`) + `cache/markdown/classes.md`'s Core Traits tables
// (primary ability, skill/weapon/armor-training TEXT — markdown-only,
// `primary_abilities` is EMPTY in the JSON, `../../markdown/classes.ts`) +
// `cache/markdown/character-creation.md:779-804`'s Fixed Hit Points by
// Class table (cross-chapter source, reused via `fixedHitPointsPerLevelForClass`
// — NEVER re-parsed, `../../markdown/character-creation.ts`).
//
// PINNED DATA QUIRK, GUARDED (never silently "fix" — `ledger/classes.md`'s
// own "Pinned data quirks" paragraph, `../../open5e/character-class.ts`'s
// own header): a subclass's `hit_dice`/`caster_type` fields are
// INCONSISTENT in the source data. `buildSubclassUnits()` below NEVER reads
// `SubclassRecord.hitDice`/`.casterType` at all — hit die is a BASE-CLASS-ONLY
// fact (subclasses never change their parent's hit die or HP progression, a
// real SRD rule, not just a data-quality workaround); the subclass record's
// own (unreliable) fields are simply never touched.
//
// HIT DIE REPRESENTATION (this slice's own decision): the sister
// (`world-fixtures/srd/base/classes.toml`) ships `srd/hit-die` as an
// `object_state_definitions` row; THIS package's own convention (matching
// every other per-actor stat, `ledger/equipment.md`'s E1 row: "matching
// this package's own convention for every other stat, NOT the sister's
// object_state_definitions") is `resource_definitions` — so `srd/hit-die`
// is authored here as a NEW resource, honestly bounded d6..d12 (the 4 real
// die sizes this SRD's 12 classes use), never a re-use of the sister's row
// kind. `entity_definition_initial_state`'s validator resolves against
// EITHER catalog since finding #10 (`ledger/findings.md`, resolved
// 2026-07-27), so this divergence from the sister costs nothing at the
// authoring layer.
//
// HP PER LEVEL (the C4 interlock): `srd/hp_per_level` is C4's OWN resource
// (`character-creation/advancement-units.ts`, NOT re-declared here — this
// module only WRITES a per-class `entity_definition_initial_state` seed
// against it, resolved through the cross-chapter `target` mechanism O2's
// `species-units.ts` already established for `srd/speed-walk`). Species
// composition (Dwarven Toughness's +1/level, `character-origins/
// trait-units.ts`'s `dwarvenToughnessHpPerLevelBonus()`) is explicitly NOT
// applied here — `hp_per_level` per CLASS is class-only; species
// composition happens at actor creation, a future creation-tables-flow concern.
//
// TAG PREFIX REGISTRATION (binding session finding, mirrors O2/O3's own
// header note): `srd.class` and `srd.subclass` are NEW DOTTED prefixes —
// MF-VAL-306 requires a `tag_value_definitions` row's own `prefix` field to
// match a bundle-declared `tag_prefixes` entry VERBATIM, so both need their
// own `src/bundle-row.ts` entry (`target_kind: "tag_value_definitions"`,
// `natural_key_field: "tag"`). Per-chapter authored vocabulary (not folded
// into `playing-the-game/tag-value-vocabulary.ts`'s central catalog) — same
// pattern O2/O3 established: this chapter's own fragment drives the rows
// through `driveUnitFragment`'s `onlyTagValueDefinitionTags`.
//
// SUBCLASS PARENT LINKAGE: the sister links a subclass to its parent via a
// FLAT `class.<parent-slug>` tag (`world-fixtures/srd/base/subclasses.toml`)
// — this package carries no flat tags (2026-07-27 operator decision, `src/
// bundle-row.ts`'s own header), so a subclass instead carries its parent's
// OWN `srd.class.<parent-slug>` tag value alongside its own `srd.subclass.
// <slug>` — the SAME "reuse the parent's own O-slice tag as the linkage"
// idiom `character-origins/trait-units.ts` established for trait->species
// linkage (`unit.speciesTag`).
//
// IDS: base-class ids are `srd/class/<slug>` — a DROP-IN match with the
// sister (`ledger/classes.md`'s "Sources" note: "drop-in ids vs sister").
// Subclass ids are `srd/subclass/<open5e-slug>` — the FULL open5e pk slug
// (e.g. `path-of-the-berserker`), NOT the sister's shortened forms
// (`berserker`, `lore`, ...): same "question, never copy the sister's
// divergent scheme" posture O2's own header used when 3 of its 9 species
// ids diverged from the sister (`species-units.ts`'s own header).
//
// CAPABILITY AUTHORING DEFERRED (binding build instruction, this slice):
// saving-throw/weapon/armor-training proficiencies are IDENTITY-TEXT ONLY
// this slice (folded into each class's own description, sourced from the
// Core Traits table) — NO `capability_definitions` row for any of them.
// Capability authoring (the roll-context-gated proficiency idiom K2's
// Second Wind precedent will need) is explicitly K2+ scope; see this
// chapter's own `index.ts` for the one explicit deferred coverage unit.

import { readClassFlavor, readSubclassFlavor } from "../../flavor/read";
import { fixedHitPointsPerLevelForClass } from "../../markdown/character-creation";
import {
	type CoreTraitsRow,
	classHeadingAnchor,
	readCoreTraitsTable,
	readSubclassSection,
} from "../../markdown/classes";
import {
	type CharacterClassRecord,
	hitDiceFaceValue,
	readBaseCharacterClasses,
	readSubclasses,
} from "../../open5e/character-class";
import { type AbilityCode, abilityCodeByDisplayName } from "../playing-the-game/ability-units";
import type { TagValueDefinitionUnit } from "../playing-the-game/tag-value-vocabulary";

export const BUNDLE_ID = "srd";

const EXPECTED_BASE_CLASS_COUNT = 12;
const EXPECTED_SUBCLASS_COUNT = 12;
const OPEN5E_PK_PREFIX = "srd-2024_";

/** The declared exact-vocabulary prefix for the 12 SRD classes (`srd.class.<slug>`) — this module's own header names the MF-VAL-306 registration this requires. */
export const CLASS_TAG_PREFIX = "srd.class";
/** The class-level tag every class entity carries alongside its own `srd.class.<slug>` value — same umbrella-row idiom as `srd.background`/`srd.species`/`srd.trait`. */
export const CLASS_CLASS_TAG = CLASS_TAG_PREFIX;

/** The declared exact-vocabulary prefix for the 12 SRD subclasses (`srd.subclass.<slug>`). */
export const SUBCLASS_TAG_PREFIX = "srd.subclass";
export const SUBCLASS_CLASS_TAG = SUBCLASS_TAG_PREFIX;

const SRD_TAG_PREFIX = "srd";
const CLASSES_ANCHOR =
	"classes.md (§ Classes — 12 classes, IDENTICAL section shape: Core Traits table -> Becoming a X -> " +
	"Class Features table -> per-feature sections -> optional Spell List -> ONE subclass)";

/** `srd/hit-die`'s own local + qualified resource id — this chapter's own axis (the sister's `object_state_definitions` row, re-represented as `resource_definitions` per this package's own convention, this module's own header). */
export const HIT_DIE_RESOURCE_LOCAL_ID = "hit-die";
export const HIT_DIE_RESOURCE_ID = `${BUNDLE_ID}/${HIT_DIE_RESOURCE_LOCAL_ID}`;
export const HIT_DIE_DISPLAY_NAME = "Hit Die (face)";
/** The 4 real die sizes this SRD's 12 classes use (d6/d8/d10/d12) — an honest bound, not a safety-bound ceiling. */
export const HIT_DIE_MIN = 6;
export const HIT_DIE_MAX = 12;
/** d8 — the commonest hit die across the 12 base classes (6 of 12: Bard/Cleric/Druid/Monk/Rogue/Warlock), same "commonest baseline" reasoning `srd/size`'s own `SIZE_INITIAL` uses. */
export const HIT_DIE_INITIAL = 8;
export const HIT_DIE_RECOVERY_RULE = "persistent";

function findRow(rows: readonly CoreTraitsRow[], label: string, className: string): string {
	const row = rows.find((candidate) => candidate.label === label);
	if (row === undefined) {
		throw new Error(`classes-units: no '${label}' row in ${className}'s Core Traits table.`);
	}
	return row.value;
}

function findOptionalRow(rows: readonly CoreTraitsRow[], label: string): string | undefined {
	return rows.find((candidate) => candidate.label === label)?.value;
}

/**
 * Parse a Core Traits "Saving Throw Proficiencies" row (e.g. "Strength and
 * Constitution") into two ability codes, IN THE MARKDOWN'S OWN WRITTEN ORDER
 * — the same "and"-joined two-name shape across all 12 classes. Each name is
 * resolved through `abilityCodeByDisplayName`, the ONE centralized
 * `ABILITY_CODES` vocabulary (`ability-units.ts`), so an unrecognized ability
 * name throws loudly instead of authoring an unvalidated code.
 */
function parseSavingThrowProficienciesText(
	text: string,
	className: string,
): readonly [AbilityCode, AbilityCode] {
	const parts = text.split(" and ").map((part) => part.trim());
	const [first, second] = parts;
	if (parts.length !== 2 || first === undefined || second === undefined) {
		throw new Error(
			`classes-units: '${className}'s Core Traits "Saving Throw Proficiencies" row ('${text}') did ` +
				`not parse as exactly two "X and Y" ability names.`,
		);
	}
	return [abilityCodeByDisplayName(first), abilityCodeByDisplayName(second)];
}

/**
 * PINNED DATA QUIRK, GUARDED (`ledger/classes.md`'s own "Pinned data
 * quirks" paragraph — never silently "fix"): `CharacterClass.json`'s
 * `saving_throws` field is WRONG, not merely differently ORDERED, for these
 * two classes versus their own Core Traits table row
 * (`cache/markdown/classes.md`): Fighter's JSON carries `["dex","str"]`
 * (markdown: "Strength and Constitution" — `dex` should be `con`); Monk's
 * JSON carries `["dex","wis"]` (markdown: "Strength and Dexterity" —
 * `wis` should be `str`). Every OTHER class' JSON/markdown ability SETS
 * agree — only the JSON's alphabetical ordering differs from the
 * markdown's own SRD-prose order (see `buildClassUnits`' order decision).
 * `ClassUnit.savingThrows` is ALWAYS the markdown-derived value, never
 * `record.savingThrows` — this allowlist exists only so the cross-check
 * below still throws loudly for any OTHER, not-yet-pinned divergence (a
 * future fork re-sync corrupting a different class' row) instead of
 * silently shipping wrong data.
 */
const KNOWN_SAVING_THROW_JSON_QUIRK_CLASSES: ReadonlySet<string> = new Set(["Fighter", "Monk"]);

export interface ClassUnit {
	/** `CharacterClass.json` pk suffix, e.g. `barbarian` — the DROP-IN sister slug (this module's own header). */
	slug: string;
	/** `srd/class/<slug>` — this class' `entity_definitions` id. */
	entityId: string;
	displayName: string;
	sourcePk: string;
	/** `classes.md:<line>` of this class' own `## <Class>` heading. */
	classAnchor: string;
	/** `classes.md:<start>-<end>` of this class' own Core Traits table. */
	coreTraitsAnchor: string;
	/** 6/8/10/12 — parsed from `CharacterClass.json`'s `hit_dice` (`"D12"` -> `12`), cross-checked against the markdown's own "Hit Point Die" row text. */
	hitDieSize: number;
	casterType: string;
	/**
	 * Two lowercase 3-letter ability codes, e.g. `["str", "con"]` —
	 * MARKDOWN-DERIVED (parsed from the Core Traits table's own "Saving Throw
	 * Proficiencies" row, IN THE MARKDOWN'S WRITTEN ORDER), never read
	 * directly off `CharacterClassRecord.savingThrows`. `buildClassUnits()`
	 * cross-checks the two sources as SETS and throws on divergence — see
	 * this module's header PINNED DATA QUIRK note (`CharacterClass.json`'s
	 * `saving_throws` is wrong, not just differently ordered, for Fighter and
	 * Monk).
	 */
	savingThrows: readonly [AbilityCode, AbilityCode];
	primaryAbilityText: string;
	skillProficienciesText: string;
	weaponProficienciesText: string;
	/** Present for exactly 4 of the 12 classes (Bard, Druid, Monk, Rogue). */
	toolProficienciesText: string | undefined;
	armorTrainingText: string;
	startingEquipmentText: string;
	/** The Fixed Hit Points by Class table's flat number for this class (`character-creation.md:779-804`) — via `fixedHitPointsPerLevelForClass`, never hand-typed (the C4 interlock). */
	hpPerLevel: number;
}

/** Build the 12 base-class units, `CharacterClass.json` pk order (already alphabetical, Barbarian..Wizard). */
export function buildClassUnits(): ClassUnit[] {
	const records = readBaseCharacterClasses();
	if (records.length !== EXPECTED_BASE_CLASS_COUNT) {
		throw new Error(
			`classes-units: expected ${EXPECTED_BASE_CLASS_COUNT} base CharacterClass.json rows, found ` +
				`${records.length} — ledger/classes.md's "Sources" section may be stale.`,
		);
	}
	return records.map((record) => {
		if (record.hitDice === null) {
			throw new Error(`classes-units: base class '${record.name}' carries a null hit_dice.`);
		}
		const slug = record.pk.slice(OPEN5E_PK_PREFIX.length);
		const core = readCoreTraitsTable(record.name);
		const hitPointDieText = findRow(core.rows, "Hit Point Die", record.name);
		const hitDieSize = hitDiceFaceValue(record.hitDice);
		if (!hitPointDieText.startsWith(`D${hitDieSize} `)) {
			throw new Error(
				`classes-units: '${record.name}'s CharacterClass.json hit_dice (${record.hitDice}) does not ` +
					`match its Core Traits table's Hit Point Die text ('${hitPointDieText}').`,
			);
		}

		// Saving-throw cross-check (this module's own header + the
		// KNOWN_SAVING_THROW_JSON_QUIRK_CLASSES pinned-quirk note above): the
		// Core Traits table's own "Saving Throw Proficiencies" row is
		// AUTHORITATIVE — `record.savingThrows` (CharacterClass.json) is used
		// only as a cross-check, never as the published value. A set-level
		// divergence throws UNLESS the class is a pinned, documented quirk;
		// conversely, a pinned class whose sets now agree also throws (the
		// allowlist has gone stale and must be updated).
		const savingThrowsText = findRow(core.rows, "Saving Throw Proficiencies", record.name);
		const savingThrows = parseSavingThrowProficienciesText(savingThrowsText, record.name);
		const markdownThrowSet = new Set<string>(savingThrows);
		const jsonThrowSet = new Set<string>(record.savingThrows);
		const throwSetsAgree =
			markdownThrowSet.size === jsonThrowSet.size &&
			[...markdownThrowSet].every((code) => jsonThrowSet.has(code));
		const isKnownThrowQuirk = KNOWN_SAVING_THROW_JSON_QUIRK_CLASSES.has(record.name);
		if (!throwSetsAgree && !isKnownThrowQuirk) {
			throw new Error(
				`classes-units: '${record.name}'s CharacterClass.json saving_throws ` +
					`(${JSON.stringify(record.savingThrows)}) does not match its Core Traits table's Saving ` +
					`Throw Proficiencies row ('${savingThrowsText}' -> [${savingThrows.join(", ")}]) and ` +
					`'${record.name}' is not in KNOWN_SAVING_THROW_JSON_QUIRK_CLASSES — a new upstream data ` +
					"quirk (pin it, cite the mismatch) or a parsing bug.",
			);
		}
		if (throwSetsAgree && isKnownThrowQuirk) {
			throw new Error(
				`classes-units: '${record.name}' is listed in KNOWN_SAVING_THROW_JSON_QUIRK_CLASSES but its ` +
					"CharacterClass.json saving_throws now agrees with the Core Traits table — the upstream " +
					"quirk may be fixed; remove it from the allowlist.",
			);
		}

		return {
			slug,
			entityId: `${BUNDLE_ID}/class/${slug}`,
			displayName: record.name,
			sourcePk: record.pk,
			classAnchor: classHeadingAnchor(record.name),
			coreTraitsAnchor: core.anchor,
			hitDieSize,
			casterType: record.casterType,
			savingThrows,
			primaryAbilityText: findRow(core.rows, "Primary Ability", record.name),
			skillProficienciesText: findRow(core.rows, "Skill Proficiencies", record.name),
			weaponProficienciesText: findRow(core.rows, "Weapon Proficiencies", record.name),
			toolProficienciesText: findOptionalRow(core.rows, "Tool Proficiencies"),
			armorTrainingText: findRow(core.rows, "Armor Training", record.name),
			startingEquipmentText: findRow(core.rows, "Starting Equipment", record.name),
			hpPerLevel: fixedHitPointsPerLevelForClass(record.name),
		};
	});
}

/**
 * Website card / in-play summary: authored flavor blurb from
 * `authored/flavor/en/classes/<slug>.md`. Core Traits stay in structured rows
 * and `srd.text` (sk-jay0.3.5.95 homes unchanged).
 *
 * No developer detail here — `entity_definitions.description` is player-reachable
 * in play (the SDK item_detail reader's fallback) and is the compendium's summary
 * text. Each dev concern has its own durable home:
 * - provenance (cache pk + markdown anchor) → the class' `srd.text` attachment
 *   payload `source`, which the compendium export parses into its structured
 *   source pointer;
 * - the seeded pools (srd/hit-die, srd/hp_per_level) → the entity's own
 *   `entity_definition_initial_state` rows, rendered in the technical section;
 * - the save/weapon/armor-training capability deferral → the coverage ledger's
 *   `classes/save-weapon-armor-training-capabilities` unit (deferred_with_owner).
 */
export function buildClassDescription(unit: ClassUnit): string {
	return readClassFlavor(unit.slug).body;
}

/** The 1 class row (`srd.class`) plus 12 per-class `srd.class.<slug>` rows — 13 total. */
export function buildClassTagValueUnits(): TagValueDefinitionUnit[] {
	const classRow: TagValueDefinitionUnit = {
		tag: CLASS_CLASS_TAG,
		prefix: SRD_TAG_PREFIX,
		description: `Identifies an entity definition as one of the 12 SRD classes (${CLASSES_ANCHOR}).`,
		sourcePk: CLASSES_ANCHOR,
	};
	const values = buildClassUnits().map((unit) => ({
		tag: `${CLASS_TAG_PREFIX}.${unit.slug}`,
		prefix: CLASS_TAG_PREFIX,
		description: `${unit.displayName} class. Primary ability: ${unit.primaryAbilityText}. Hit Point Die: d${unit.hitDieSize}.`,
		sourcePk: unit.sourcePk,
	}));
	return [classRow, ...values];
}

export interface SubclassUnit {
	/** Full open5e pk slug, e.g. `path-of-the-berserker` — deliberately NOT the sister's shortened form (this module's own header). */
	slug: string;
	/** `srd/subclass/<slug>` — this subclass' `entity_definitions` id. */
	entityId: string;
	displayName: string;
	sourcePk: string;
	/** The owning base class' own slug, e.g. `barbarian`. */
	parentSlug: string;
	parentDisplayName: string;
	/** The owning base class' own `srd.class.<slug>` tag — the parent-linkage idiom (this module's own header). */
	parentClassTag: string;
	/** `classes.md:<start>-<end>` of this subclass' own section (heading through its opening paragraph). */
	anchor: string;
	flavorText: string;
	summaryText: string;
}

function findParentRecord(
	baseRecords: readonly CharacterClassRecord[],
	subclassRecord: CharacterClassRecord,
): CharacterClassRecord {
	const parent = baseRecords.find((candidate) => candidate.pk === subclassRecord.subclassOf);
	if (parent === undefined) {
		throw new Error(
			`classes-units: subclass '${subclassRecord.pk}' names subclass_of='${subclassRecord.subclassOf}', ` +
				"no matching base CharacterClass.json row.",
		);
	}
	return parent;
}

/** Build the 12 subclass units, `CharacterClass.json` pk order (already alphabetical). Each SRD base class has exactly one subclass. */
export function buildSubclassUnits(): SubclassUnit[] {
	const baseRecords = readBaseCharacterClasses();
	const subclassRecords = readSubclasses();
	if (subclassRecords.length !== EXPECTED_SUBCLASS_COUNT) {
		throw new Error(
			`classes-units: expected ${EXPECTED_SUBCLASS_COUNT} subclass CharacterClass.json rows, found ` +
				`${subclassRecords.length} — ledger/classes.md's "Sources" section may be stale.`,
		);
	}
	return subclassRecords.map((record) => {
		const parent = findParentRecord(baseRecords, record);
		const parentSlug = parent.pk.slice(OPEN5E_PK_PREFIX.length);
		const section = readSubclassSection(parent.name);
		if (section.displayName !== record.name) {
			throw new Error(
				`classes-units: '${parent.name}'s subclass section heading names '${section.displayName}', ` +
					`CharacterClass.json's subclass row names '${record.name}' — drift between sources.`,
			);
		}
		const slug = record.pk.slice(OPEN5E_PK_PREFIX.length);
		return {
			slug,
			entityId: `${BUNDLE_ID}/subclass/${slug}`,
			displayName: record.name,
			sourcePk: record.pk,
			parentSlug,
			parentDisplayName: parent.name,
			parentClassTag: `${CLASS_TAG_PREFIX}.${parentSlug}`,
			anchor: section.anchor,
			flavorText: section.flavorText,
			summaryText: section.summaryText,
		};
	});
}

/**
 * Subclass website card: parent linkage, italic markdown flavor line, then the
 * SRD opening paragraph (sk-jay0.3.5.95).
 * Hit die/HP-per-level are DELIBERATELY NOT repeated here (the die-inheritance
 * quirk guard, this module's own header — a subclass never overrides its
 * parent's hit die; the guard stays in this header and the ledger, not in
 * player text). Per-level feature decomposition scope lives on the coverage
 * ledger; provenance on the `srd.text` attachment payload `source` — same homes
 * as `buildClassDescription` above.
 */
export function buildSubclassDescription(unit: SubclassUnit): string {
	return readSubclassFlavor(unit.slug).body;
}

/** The 1 class row (`srd.subclass`) plus 12 per-subclass `srd.subclass.<slug>` rows — 13 total. */
export function buildSubclassTagValueUnits(): TagValueDefinitionUnit[] {
	const classRow: TagValueDefinitionUnit = {
		tag: SUBCLASS_CLASS_TAG,
		prefix: SRD_TAG_PREFIX,
		description: `Identifies an entity definition as one of the 12 SRD subclasses (${CLASSES_ANCHOR}).`,
		sourcePk: CLASSES_ANCHOR,
	};
	const values = buildSubclassUnits().map((unit) => ({
		tag: `${SUBCLASS_TAG_PREFIX}.${unit.slug}`,
		prefix: SUBCLASS_TAG_PREFIX,
		description:
			`Identifies an entity definition as the SRD ${unit.displayName} subclass of the ` +
			`${unit.parentDisplayName} class.`,
		sourcePk: unit.sourcePk,
	}));
	return [classRow, ...values];
}
