// DOC-IMPL: tags-and-ids#tags-fully-dotted-no-flat-tags
// Equipment E3 (`ledger/equipment.md` "E3 Weapons")'s OWN `tag_value_definitions`
// catalog — 4 closed-choice axes, all read straight off `Weapon.json`/
// `WeaponProperty.json`, never hand-typed (mirrors `monsters/creature-tag-
// values.ts`'s own Size/CR axes — same "cache-verified closed lookup, throws
// on drift" idiom):
//
//   - `srd.weapon.category.<simple|martial>` — `Weapon.json`'s own
//     `is_simple` boolean (`equipment.md`'s Simple/Martial Weapons split).
//   - `srd.weapon.range.<melee|ranged>` — `Weapon.json`'s own `range` field
//     (`0` for melee, a positive normal-range distance for ranged; every
//     record in this dataset is unambiguous).
//   - `srd.weapon.property.<slug>` — the 9 plain Weapon Properties
//     (`WeaponProperty.json`'s `type: null` rows: Ammunition, Finesse,
//     Heavy, Light, Loading, Reach, Thrown, Two-Handed, Versatile).
//   - `srd.weapon.mastery.<slug>` — the 8 Weapon Mastery properties
//     (`WeaponProperty.json`'s `type: "Mastery"` rows: Cleave, Graze, Nick,
//     Push, Sap, Slow, Topple, Vex).
//
// The "reference tables as tag metadata" design maxim (AGENTS.md,
// `ledger/designs/reference-tables-as-tag-metadata.md`) applies to the last
// two axes precisely: WeaponProperty.json IS a finite, normative SRD
// reference table (the Weapon Properties / Weapon Mastery tables), each row
// explains one semantic class unchanged across every weapon that carries it,
// and this slice authors a structured reader only for Finesse and Reach; no
// DSL predicate reads the other property/mastery values today. Each property's
// full `desc` rides its own tag's `description`, sourced pk retained, rather
// than inventing a per-property mechanic this slice doesn't need.
//
// All 4 axes register under this bundle's bare `"srd"` `tag_prefixes` entry
// (never a new dedicated `srd.weapon` entry) — the SAME posture
// `srd.armor.heavy` already proves safe for a 3-segment tag (`armor-
// units.ts`'s own module header); a dedicated axis-level prefix entry stays
// a later-chapter option, not a requirement (MF-VAL-306 only requires the
// row's own `prefix` field to match SOME declared entry, and bare `"srd"`
// always is one).
import { readWeapons } from "../../open5e/weapon";
import { readWeaponProperties } from "../../open5e/weapon-property";

export interface WeaponTagValueUnit {
	tag: string;
	prefix: string;
	description: string;
	sourcePk: string;
}

const SRD_TAG_PREFIX = "srd";

export const WEAPON_TAG = "srd.weapon";
export const WEAPON_CATEGORY_TAG_PREFIX = "srd.weapon.category";
export const WEAPON_RANGE_TAG_PREFIX = "srd.weapon.range";
export const WEAPON_PROPERTY_TAG_PREFIX = "srd.weapon.property";
export const WEAPON_MASTERY_TAG_PREFIX = "srd.weapon.mastery";
/**
 * `srd.damage_type.<type>` — the wielded item's damage type. The shared
 * attack write reads this tag and routes the target's
 * `damage_immune/resist/vulnerable:<type>` tags. The catalog covers the
 * full 13-type SRD table (rules-glossary.md Damage Types). Manufactured
 * weapons still only emit the 3 physical types `Weapon.json` deals
 * (cache-verified below).
 */
export const DAMAGE_TYPE_TAG_PREFIX = "srd.damage_type";

/** Full SRD damage-type table, glossary order. */
export const SRD_DAMAGE_TYPES = [
	"acid",
	"bludgeoning",
	"cold",
	"fire",
	"force",
	"lightning",
	"necrotic",
	"piercing",
	"poison",
	"psychic",
	"radiant",
	"slashing",
	"thunder",
] as const;
export type SrdDamageType = (typeof SRD_DAMAGE_TYPES)[number];

/** `WeaponProperty.json` pk -> its slug, stripping the pk's own type-suffix (`-wp` / `-mastery`) rather than re-slugifying the `name` field — pk-grounded, matches `Weapon.json`'s own `srd-2024_<slug>` convention. */
function slugFromPropertyPk(pk: string, type: string | null): string {
	const prefix = "srd-2024_";
	if (!pk.startsWith(prefix)) {
		throw new Error(
			`weapon-tag-values: WeaponProperty.json pk '${pk}' does not carry the expected '${prefix}' prefix.`,
		);
	}
	const suffix = type === "Mastery" ? "-mastery" : "-wp";
	const body = pk.slice(prefix.length);
	if (!body.endsWith(suffix)) {
		throw new Error(
			`weapon-tag-values: WeaponProperty.json pk '${pk}' (type '${String(type)}') does not carry the ` +
				`expected '${suffix}' suffix — a cache resync may have changed the pk shape.`,
		);
	}
	return body.slice(0, -suffix.length);
}

/** `srd.weapon.property.<slug>`/`srd.weapon.mastery.<slug>` for one `WeaponProperty.json` record — throws on an unrecognized `type` (only `null`/`"Mastery"` are grounded). */
export function weaponPropertyTag(pk: string, type: string | null): string {
	if (type !== null && type !== "Mastery") {
		throw new Error(
			`weapon-tag-values: WeaponProperty.json pk '${pk}' has unrecognized type '${type}'.`,
		);
	}
	const prefix = type === "Mastery" ? WEAPON_MASTERY_TAG_PREFIX : WEAPON_PROPERTY_TAG_PREFIX;
	return `${prefix}.${slugFromPropertyPk(pk, type)}`;
}

/**
 * `srd.weapon.property.finesse` — cache-verified (never hand-typed, same
 * discipline as every other tag in this module): looks up the ONE plain
 * (`type: null`) `WeaponProperty.json` row named "Finesse" and derives its
 * tag through the same `weaponPropertyTag` every other property/mastery
 * value uses. First consumer: `playing-the-game/weapon-attack-units.ts`'s
 * generic melee damage formula (probe sk-84i.1 — a finesse-tagged wielded
 * item uses the higher of Strength/Dexterity modifier, the SRD finesse
 * rule).
 */
export function weaponFinessePropertyTag(): string {
	const property = readWeaponProperties().find(
		(candidate) => candidate.type === null && candidate.name === "Finesse",
	);
	if (property === undefined) {
		throw new Error(
			"weapon-tag-values: no plain (non-Mastery) WeaponProperty.json row named 'Finesse' found — " +
				"a cache resync may have renamed/removed it.",
		);
	}
	return weaponPropertyTag(property.pk, property.type);
}

/** The cache-derived Reach property tag consumed by shared melee range. */
export function weaponReachPropertyTag(): string {
	const property = readWeaponProperties().find(
		(candidate) => candidate.name === "Reach" && candidate.type === null,
	);
	if (property === undefined) throw new Error("weapon-tag-values: missing plain Reach property.");
	return weaponPropertyTag(property.pk, property.type);
}

/** The 2 (class row + `.simple`/`.martial`) Category values, `Weapon.json`'s own `is_simple` boolean (`equipment.md`'s Simple/Martial Weapons split). */
export function buildWeaponCategoryTagValueUnits(): WeaponTagValueUnit[] {
	const classUnit: WeaponTagValueUnit = {
		tag: WEAPON_CATEGORY_TAG_PREFIX,
		prefix: SRD_TAG_PREFIX,
		description:
			"Identifies an entity definition tag as one of the SRD weapon categories (equipment.md's " +
			"Simple/Martial Weapons split).",
		sourcePk: "",
	};
	return [
		classUnit,
		{
			tag: `${WEAPON_CATEGORY_TAG_PREFIX}.simple`,
			prefix: WEAPON_CATEGORY_TAG_PREFIX,
			description:
				"Identifies a weapon entity definition as a Simple weapon (Weapon.json is_simple: true).",
			sourcePk: "",
		},
		{
			tag: `${WEAPON_CATEGORY_TAG_PREFIX}.martial`,
			prefix: WEAPON_CATEGORY_TAG_PREFIX,
			description:
				"Identifies a weapon entity definition as a Martial weapon (Weapon.json is_simple: false).",
			sourcePk: "",
		},
	];
}

/** The 2 (class row + `.melee`/`.ranged`) Range values, `Weapon.json`'s own `range` field (`0` melee, positive ranged). */
export function buildWeaponRangeTagValueUnits(): WeaponTagValueUnit[] {
	const classUnit: WeaponTagValueUnit = {
		tag: WEAPON_RANGE_TAG_PREFIX,
		prefix: SRD_TAG_PREFIX,
		description: "Identifies an entity definition tag as one of the SRD weapon range classes.",
		sourcePk: "",
	};
	return [
		classUnit,
		{
			tag: `${WEAPON_RANGE_TAG_PREFIX}.melee`,
			prefix: WEAPON_RANGE_TAG_PREFIX,
			description: "Identifies a weapon entity definition as Melee (Weapon.json range: 0).",
			sourcePk: "",
		},
		{
			tag: `${WEAPON_RANGE_TAG_PREFIX}.ranged`,
			prefix: WEAPON_RANGE_TAG_PREFIX,
			description: "Identifies a weapon entity definition as Ranged (Weapon.json range > 0).",
			sourcePk: "",
		},
	];
}

/** Every `WeaponProperty.json` row rendered as ONE tag value (module header — the reference-tables-as-tag-metadata pattern), split into the 9 plain-property and 8 mastery-property rows plus their own 2 class rows. */
export function buildWeaponPropertyTagValueUnits(): WeaponTagValueUnit[] {
	const properties = readWeaponProperties();
	const plainClassUnit: WeaponTagValueUnit = {
		tag: WEAPON_PROPERTY_TAG_PREFIX,
		prefix: SRD_TAG_PREFIX,
		description:
			"Identifies an entity definition tag as an SRD weapon property (equipment.md's Weapon Properties table).",
		sourcePk: "",
	};
	const masteryClassUnit: WeaponTagValueUnit = {
		tag: WEAPON_MASTERY_TAG_PREFIX,
		prefix: SRD_TAG_PREFIX,
		description:
			"Identifies an entity definition tag as an SRD Weapon Mastery property (equipment.md's Weapon Mastery table).",
		sourcePk: "",
	};
	const valueUnits = properties.map((property) => {
		const tag = weaponPropertyTag(property.pk, property.type);
		const prefix =
			property.type === "Mastery" ? WEAPON_MASTERY_TAG_PREFIX : WEAPON_PROPERTY_TAG_PREFIX;
		return {
			tag,
			prefix,
			description: `${property.name}. ${property.desc}`,
			sourcePk: property.pk,
		};
	});
	return [plainClassUnit, masteryClassUnit, ...valueUnits];
}

/** The 3 physical damage types every manufactured SRD weapon in this dataset deals — cache-verified below. */
const PHYSICAL_DAMAGE_TYPES = ["slashing", "piercing", "bludgeoning"] as const;
export type PhysicalDamageType = (typeof PHYSICAL_DAMAGE_TYPES)[number];

/** `srd.damage_type.<type>` for one weapon-like item — throws outside the 13-type SRD table. */
export function damageTypeTag(damageType: string): string {
	if (!(SRD_DAMAGE_TYPES as readonly string[]).includes(damageType)) {
		throw new Error(
			`weapon-tag-values: unrecognized damage type '${damageType}' — expected one of ` +
				`${SRD_DAMAGE_TYPES.join(", ")} (rules-glossary.md Damage Types).`,
		);
	}
	return `${DAMAGE_TYPE_TAG_PREFIX}.${damageType}`;
}

/** Staleness guard — throws unless `Weapon.json`'s own `damage_type` domain is still exactly the 3 physical types (module header). */
function assertExpectedDamageTypes(): void {
	const observed = new Set(readWeapons().map((weapon) => weapon.damageType));
	const expected = new Set<string>(PHYSICAL_DAMAGE_TYPES);
	const drifted =
		observed.size !== expected.size || [...observed].some((type) => !expected.has(type));
	if (drifted) {
		throw new Error(
			`weapon-tag-values: Weapon.json's own damage_type domain is {${[...observed].sort().join(", ")}}, ` +
				`expected exactly {${PHYSICAL_DAMAGE_TYPES.join(", ")}} — a cache resync may have added a new ` +
				"weapon damage type.",
		);
	}
}

/** The Damage Type axis: 1 class row + the 13 SRD types. */
export function buildDamageTypeTagValueUnits(): WeaponTagValueUnit[] {
	assertExpectedDamageTypes();
	const classUnit: WeaponTagValueUnit = {
		tag: DAMAGE_TYPE_TAG_PREFIX,
		prefix: SRD_TAG_PREFIX,
		description:
			"Identifies an entity definition tag as the SRD damage type a weapon-like item deals. " +
			"The shared attack write reads this tag and routes the target's defense tags.",
		sourcePk: "",
	};
	const valueUnits = SRD_DAMAGE_TYPES.map((type) => ({
		tag: damageTypeTag(type),
		prefix: DAMAGE_TYPE_TAG_PREFIX,
		description: `${type} — a damage type.`,
		sourcePk: "",
	}));
	return [classUnit, ...valueUnits];
}

/** The bare `srd.weapon` identity tag (mirrors `srd.item`/`srd.armor`'s own class-only rows — no `.<slug>` value axis of its own, only the 4 axes above compose under it). */
function buildWeaponIdentityTagValueUnit(): WeaponTagValueUnit {
	return {
		tag: WEAPON_TAG,
		prefix: SRD_TAG_PREFIX,
		description: "Identifies an entity definition as an SRD weapon.",
		sourcePk: "",
	};
}

/** Staleness guard — throws unless the cache still carries exactly 38 Weapon.json / 17 WeaponProperty.json records (E3's own scope contract). */
function assertExpectedWeaponCounts(): void {
	const weaponCount = readWeapons().length;
	if (weaponCount !== 38) {
		throw new Error(
			`weapon-tag-values: expected 38 Weapon.json records, found ${weaponCount} — a cache resync may have changed the Weapon table.`,
		);
	}
	const propertyCount = readWeaponProperties().length;
	if (propertyCount !== 17) {
		throw new Error(
			`weapon-tag-values: expected 17 WeaponProperty.json records, found ${propertyCount} — a cache resync may have changed the Weapon Properties/Mastery tables.`,
		);
	}
}

/** The full Equipment E3 catalog: identity + Category (3) + Range (3) + Property/Mastery (2 class + 17 value) + Damage Type (1 class + 13 SRD types). */
export function buildWeaponTagValueUnits(): WeaponTagValueUnit[] {
	assertExpectedWeaponCounts();
	return [
		buildWeaponIdentityTagValueUnit(),
		...buildWeaponCategoryTagValueUnits(),
		...buildWeaponRangeTagValueUnits(),
		...buildWeaponPropertyTagValueUnits(),
		...buildDamageTypeTagValueUnits(),
	];
}
