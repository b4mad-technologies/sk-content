// Equipment E3 (`ledger/equipment.md` "E3 Weapons"): identity for all 38
// `Weapon.json` records — fields read straight off the cache, category
// (Simple/Martial) from `Weapon.json`'s own `is_simple` boolean, and
// Melee/Ranged from a closed, cache-verified lookup grounded in
// `equipment.md`'s own 4 table subsections (`:129` Simple Melee, `:212`
// Simple Ranged, `:247` Martial Melee, `:394` Martial Ranged) — NOT derived
// from the `range`/`long_range` fields alone, which can't disambiguate a
// fundamentally-Melee weapon carrying the Thrown property (e.g. Javelin,
// `range: 30`) from a fundamentally-Ranged one (e.g. Dart, `range: 20`);
// both carry a positive `range`.
//
// Every weapon in this dataset carries exactly ONE Weapon Mastery property
// (cache-verified against the table above) plus zero or more plain Weapon
// Properties (`../../open5e/weapon-property.ts`'s own `type` split) — this
// module's own `buildWeaponUnits` throws if that "exactly one mastery"
// invariant doesn't hold for some record, rather than silently omitting it.
//
// Each weapon's range identity admits the matching shared Attack variant while
// wielded. Its damage magnitude and source-derived normal attack reach/range
// are authored as item DSL sources by `equipment/index.ts`.
import { readWeapons, type WeaponRecord } from "../../open5e/weapon";
import {
	readWeaponProperties,
	weaponPropertyAssignmentsByWeapon,
} from "../../open5e/weapon-property";
import { weaponPropertyTag } from "./weapon-tag-values";

export type WeaponCategory = "simple" | "martial";
export type WeaponRangeClass = "melee" | "ranged";

const WEAPON_PK_PREFIX = "srd-2024_";

function slugFromWeaponPk(pk: string): string {
	if (!pk.startsWith(WEAPON_PK_PREFIX)) {
		throw new Error(
			`weapon-units: Weapon.json pk '${pk}' does not carry the expected '${WEAPON_PK_PREFIX}' prefix.`,
		);
	}
	return pk.slice(WEAPON_PK_PREFIX.length);
}

/**
 * Closed, cache-verified lookup (mirrors `armor-units.ts`'s
 * `ARMOR_WEIGHT_CLASS_BY_PK` idiom) grounded in `equipment.md`'s own 4
 * table subsections — module header names why this can't be derived from
 * `range`/`long_range` alone.
 */
const WEAPON_RANGE_CLASS_BY_PK: Readonly<Record<string, WeaponRangeClass>> = {
	// Simple Melee Weapons (equipment.md:129-85)
	"srd-2024_club": "melee",
	"srd-2024_dagger": "melee",
	"srd-2024_greatclub": "melee",
	"srd-2024_handaxe": "melee",
	"srd-2024_javelin": "melee",
	"srd-2024_light-hammer": "melee",
	"srd-2024_mace": "melee",
	"srd-2024_quarterstaff": "melee",
	"srd-2024_sickle": "melee",
	"srd-2024_spear": "melee",
	// Simple Ranged Weapons (equipment.md:212-120)
	"srd-2024_dart": "ranged",
	"srd-2024_light-crossbow": "ranged",
	"srd-2024_shortbow": "ranged",
	"srd-2024_sling": "ranged",
	// Martial Melee Weapons (equipment.md:247-267)
	"srd-2024_battleaxe": "melee",
	"srd-2024_flail": "melee",
	"srd-2024_glaive": "melee",
	"srd-2024_greataxe": "melee",
	"srd-2024_greatsword": "melee",
	"srd-2024_halberd": "melee",
	"srd-2024_lance": "melee",
	"srd-2024_longsword": "melee",
	"srd-2024_maul": "melee",
	"srd-2024_morningstar": "melee",
	"srd-2024_pike": "melee",
	"srd-2024_rapier": "melee",
	"srd-2024_scimitar": "melee",
	"srd-2024_shortsword": "melee",
	"srd-2024_trident": "melee",
	"srd-2024_warhammer": "melee",
	"srd-2024_war-pick": "melee",
	"srd-2024_whip": "melee",
	// Martial Ranged Weapons (equipment.md:394-318)
	"srd-2024_blowgun": "ranged",
	"srd-2024_hand-crossbow": "ranged",
	"srd-2024_heavy-crossbow": "ranged",
	"srd-2024_longbow": "ranged",
	"srd-2024_musket": "ranged",
	"srd-2024_pistol": "ranged",
};

export function weaponRangeClass(pk: string): WeaponRangeClass {
	const rangeClass = WEAPON_RANGE_CLASS_BY_PK[pk];
	if (rangeClass === undefined) {
		throw new Error(
			`weapon-units: no Melee/Ranged classification recorded for Weapon.json pk '${pk}' — ` +
				"WEAPON_RANGE_CLASS_BY_PK is stale against a cache resync (equipment.md's 4 weapon table subsections).",
		);
	}
	return rangeClass;
}

/** One `WeaponPropertyAssignment.json` row, resolved to its own tag + display fields. */
export interface WeaponPropertyMembership {
	tag: string;
	name: string;
	/** e.g. Versatile's `"1d10"`, Ammunition's `"Range 25/100; Needle"` — `null` for most. */
	detail: string | null;
}

export interface WeaponUnit {
	/** `Weapon.json` pk suffix, e.g. `battleaxe` / `hand-crossbow`. */
	slug: string;
	/** `srd/weapon/<slug>` — this weapon's `entity_definitions` id. */
	entityId: string;
	displayName: string;
	damageDice: string;
	damageType: string;
	category: WeaponCategory;
	rangeClass: WeaponRangeClass;
	isImprovised: boolean;
	/** Normal range in feet; `0` for a Melee weapon with no Thrown property. */
	range: number;
	/** Long range in feet; `0` for a Melee weapon with no Thrown property, or a single-range weapon. */
	longRange: number;
	/** Every plain Weapon Property this weapon carries (`type: null` rows) — zero or more. */
	properties: WeaponPropertyMembership[];
	/** This weapon's own SINGLE Weapon Mastery property (module header — every SRD weapon carries exactly one). */
	mastery: WeaponPropertyMembership;
	sourcePk: string;
}

function categoryOf(record: WeaponRecord): WeaponCategory {
	return record.isSimple ? "simple" : "martial";
}

/** Build all 38 weapon units, `Weapon.json` pk order. Throws if the cache no longer carries exactly 38 records, or if any record's own property assignments don't resolve to exactly one Mastery property (module header's own invariant). */
export function buildWeaponUnits(): WeaponUnit[] {
	const weapons = readWeapons();
	if (weapons.length !== 38) {
		throw new Error(
			`weapon-units: expected 38 Weapon.json records, found ${weapons.length} — a cache resync may have changed the Weapon table.`,
		);
	}
	const propertiesByPk = new Map(
		readWeaponProperties().map((property) => [property.pk, property] as const),
	);

	return weapons.map((record) => {
		const assignments = weaponPropertyAssignmentsByWeapon(record.pk);
		const memberships: (WeaponPropertyMembership & { isMastery: boolean })[] = assignments.map(
			(assignment) => {
				const property = propertiesByPk.get(assignment.propertyPk);
				if (property === undefined) {
					throw new Error(
						`weapon-units: WeaponPropertyAssignment '${assignment.pk}' names unknown property pk ` +
							`'${assignment.propertyPk}'.`,
					);
				}
				return {
					tag: weaponPropertyTag(property.pk, property.type),
					name: property.name,
					detail: assignment.detail,
					isMastery: property.type === "Mastery",
				};
			},
		);
		const masteries = memberships.filter((membership) => membership.isMastery);
		if (masteries.length !== 1) {
			throw new Error(
				`weapon-units: expected exactly 1 Weapon Mastery property for '${record.pk}', found ` +
					`${masteries.length} — WeaponPropertyAssignment.json may have changed shape.`,
			);
		}
		const properties = memberships.filter((membership) => !membership.isMastery);
		const mastery = masteries[0];
		if (mastery === undefined) throw new Error("weapon-units: unreachable — length checked above.");

		return {
			slug: slugFromWeaponPk(record.pk),
			entityId: `srd/weapon/${slugFromWeaponPk(record.pk)}`,
			displayName: record.name,
			damageDice: record.damageDice,
			damageType: record.damageType,
			category: categoryOf(record),
			rangeClass: weaponRangeClass(record.pk),
			isImprovised: record.isImprovised,
			range: record.range,
			longRange: record.longRange,
			properties: properties.map(({ tag, name, detail }) => ({ tag, name, detail })),
			mastery: { tag: mastery.tag, name: mastery.name, detail: mastery.detail },
			sourcePk: record.pk,
		};
	});
}

/** Every entity tag one weapon unit carries: identity + category + range class + every property + its own mastery. */
export function weaponEntityTags(unit: WeaponUnit): string[] {
	return [
		"srd.item",
		"srd.weapon",
		`srd.weapon.category.${unit.category}`,
		`srd.weapon.range.${unit.rangeClass}`,
		...unit.properties.map((property) => property.tag),
		unit.mastery.tag,
	];
}

/**
 * Normal attack reach/range in feet. Ranged weapons carry their own sourced
 * `Weapon.json.range`; melee weapons use the SRD's 5-foot creature reach,
 * extended by 5 feet when the sourced Reach property is present
 * (`equipment.md` § Reach).
 */
export function weaponAttackRangeFeet(unit: WeaponUnit): number {
	if (unit.rangeClass === "ranged") {
		if (unit.range <= 0) {
			throw new Error(
				`weapon-units: ranged weapon '${unit.sourcePk}' has no positive normal range.`,
			);
		}
		return unit.range;
	}
	return unit.properties.some((property) => property.name === "Reach") ? 10 : 5;
}

/**
 * Website / item_detail identity: name and use class only. Damage dice,
 * properties, cost, and Weapon.json provenance stay on tags, item-measures,
 * attack sources, and srd.text — never in this description.
 */
export function buildWeaponDescription(unit: WeaponUnit): string {
	if (unit.isImprovised) {
		return `${unit.displayName} — an improvised stand-in when no proper weapon is at hand.`;
	}
	return `${unit.displayName} — a ${unit.category} ${unit.rangeClass} weapon.`;
}
