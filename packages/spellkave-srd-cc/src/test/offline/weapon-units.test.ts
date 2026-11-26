// Equipment E3 offline proof (`ledger/equipment.md`): all 38 weapon units —
// fields pinned against the raw Weapon.json/WeaponPropertyAssignment.json
// records, category/range classification, and the "exactly one Mastery
// property per weapon" invariant.
import { describe, expect, it } from "vitest";
import { costWeightInitialStates } from "../../chapters/equipment/item-measures";
import {
	buildWeaponPropertyTagValueUnits,
	buildWeaponTagValueUnits,
	weaponPropertyTag,
} from "../../chapters/equipment/weapon-tag-values";
import {
	buildWeaponDescription,
	buildWeaponUnits,
	weaponEntityTags,
	weaponRangeClass,
} from "../../chapters/equipment/weapon-units";
import { readWeapons } from "../../open5e/weapon";
import {
	readWeaponProperties,
	weaponPropertyAssignmentsByWeapon,
} from "../../open5e/weapon-property";
import { sweep } from "./sweep";

describe("buildWeaponUnits", () => {
	it("builds exactly 38 weapon units, one per Weapon.json record", () => {
		const units = buildWeaponUnits();
		expect(units).toHaveLength(38);
		expect(units.map((unit) => unit.sourcePk).sort()).toEqual(
			readWeapons()
				.map((record) => record.pk)
				.sort(),
		);
	});

	it("pins damage/category fields against the raw Weapon.json record (never hand-typed)", () => {
		const raw = new Map(readWeapons().map((record) => [record.pk, record]));
		for (const unit of sweep(buildWeaponUnits())) {
			const record = raw.get(unit.sourcePk);
			if (record === undefined)
				throw new Error(`test setup: no Weapon.json record '${unit.sourcePk}'.`);
			expect(unit.displayName).toBe(record.name);
			expect(unit.damageDice).toBe(record.damageDice);
			expect(unit.damageType).toBe(record.damageType);
			expect(unit.category).toBe(record.isSimple ? "simple" : "martial");
			expect(unit.isImprovised).toBe(record.isImprovised);
			expect(unit.range).toBe(record.range);
			expect(unit.longRange).toBe(record.longRange);
		}
	});

	it("every unit carries exactly ONE Weapon Mastery property (module invariant, cache-verified)", () => {
		for (const unit of sweep(buildWeaponUnits())) {
			expect(unit.mastery.tag).toMatch(/^srd\.weapon\.mastery\./);
			expect(
				unit.properties.every((property) => property.tag.startsWith("srd.weapon.property.")),
			).toBe(true);
		}
	});

	it("Dagger: Simple Melee, Finesse+Light+Thrown properties, Nick mastery (equipment.md's own table row)", () => {
		const dagger = buildWeaponUnits().find((unit) => unit.slug === "dagger");
		if (dagger === undefined) throw new Error("test setup: no 'dagger' unit.");
		expect(dagger.category).toBe("simple");
		expect(dagger.rangeClass).toBe("melee");
		expect(dagger.properties.map((property) => property.tag).sort()).toEqual(
			[
				"srd.weapon.property.finesse",
				"srd.weapon.property.light",
				"srd.weapon.property.thrown",
			].sort(),
		);
		expect(dagger.mastery.tag).toBe("srd.weapon.mastery.nick");
	});

	it("joins Item.json cost/weight onto a weapon as copper and tenths of a pound", () => {
		expect(costWeightInitialStates("srd-2024_longsword")).toEqual([
			{ state: "srd/cost_cp", value_int: 1500 },
			{ state: "srd/weight_lb10", value_int: 30 },
		]);
	});

	it("Javelin (Simple Melee with Thrown) and Dart (Simple Ranged) are correctly disambiguated — range field alone can't tell them apart", () => {
		const units = buildWeaponUnits();
		const javelin = units.find((unit) => unit.slug === "javelin");
		const dart = units.find((unit) => unit.slug === "dart");
		if (javelin === undefined || dart === undefined)
			throw new Error("test setup: missing javelin/dart unit.");
		expect(javelin.range).toBeGreaterThan(0);
		expect(javelin.rangeClass).toBe("melee");
		expect(dart.range).toBeGreaterThan(0);
		expect(dart.rangeClass).toBe("ranged");
	});

	it("generated description is name and use class, not dice or table flatten", () => {
		for (const unit of buildWeaponUnits()) {
			const description = buildWeaponDescription(unit);
			expect(description).toContain(unit.displayName);
			expect(description).not.toContain(unit.damageDice);
			expect(description).not.toMatch(/\d+d\d+/);
			expect(description).not.toContain("Source:");
			expect(description).not.toContain("pk=");
		}
	});

	it("weaponEntityTags always includes srd.item, srd.weapon, category, and range tags", () => {
		for (const unit of sweep(buildWeaponUnits())) {
			const tags = weaponEntityTags(unit);
			expect(tags).toContain("srd.item");
			expect(tags).toContain("srd.weapon");
			expect(tags).toContain(`srd.weapon.category.${unit.category}`);
			expect(tags).toContain(`srd.weapon.range.${unit.rangeClass}`);
			expect(tags).toContain(unit.mastery.tag);
		}
	});

	it("Weapon.json still carries exactly 38 records (ledger staleness guard)", () => {
		expect(readWeapons()).toHaveLength(38);
	});
});

describe("weaponRangeClass", () => {
	it("throws for a pk this dataset's closed lookup doesn't cover", () => {
		expect(() => weaponRangeClass("srd-2024_not-a-real-weapon")).toThrow(
			/no Melee\/Ranged classification/,
		);
	});
});

describe("weaponPropertyAssignmentsByWeapon (open5e reader)", () => {
	it("Quarterstaff carries Versatile with its own detail string (1d8), never hand-copied", () => {
		const assignments = weaponPropertyAssignmentsByWeapon("srd-2024_quarterstaff");
		const versatile = assignments.find(
			(assignment) => assignment.propertyPk === "srd-2024_versatile-wp",
		);
		expect(versatile?.detail).toBe("1d8");
	});
});

describe("weaponPropertyTag / buildWeaponPropertyTagValueUnits", () => {
	it("resolves plain properties to srd.weapon.property.<slug> and Mastery properties to srd.weapon.mastery.<slug>", () => {
		expect(weaponPropertyTag("srd-2024_finesse-wp", null)).toBe("srd.weapon.property.finesse");
		expect(weaponPropertyTag("srd-2024_two-handed-wp", null)).toBe(
			"srd.weapon.property.two-handed",
		);
		expect(weaponPropertyTag("srd-2024_cleave-mastery", "Mastery")).toBe(
			"srd.weapon.mastery.cleave",
		);
		expect(weaponPropertyTag("srd-2024_nick-mastery", "Mastery")).toBe("srd.weapon.mastery.nick");
	});

	it("throws for an unrecognized WeaponProperty.json type", () => {
		expect(() => weaponPropertyTag("srd-2024_finesse-wp", "Bogus")).toThrow(/unrecognized type/);
	});

	it("every WeaponProperty.json record round-trips through weaponPropertyTag without throwing", () => {
		for (const property of readWeaponProperties()) {
			const tag = weaponPropertyTag(property.pk, property.type);
			expect(
				tag.startsWith(
					property.type === "Mastery" ? "srd.weapon.mastery." : "srd.weapon.property.",
				),
			).toBe(true);
		}
	});

	it("builds 2 class rows + 17 value rows (9 property + 8 mastery), each carrying the full sourced desc", () => {
		const units = buildWeaponPropertyTagValueUnits();
		expect(units).toHaveLength(19);
		const properties = readWeaponProperties();
		for (const property of properties) {
			const unit = units.find((candidate) => candidate.sourcePk === property.pk);
			expect(unit?.description).toContain(property.desc);
		}
	});
});

describe("buildWeaponTagValueUnits", () => {
	// Weapon-damage-source retirement (2026-08-13) added the Damage Type axis
	// (1 class + 13 SRD types, weapon-tag-values.ts's own header) on top of
	// the pre-existing identity + Category (3) + Range (3) + Property/Mastery
	// (19) = 26 rows.
	it("assembles identity + Category (3) + Range (3) + Property/Mastery (19) + Damage Type (14) = 40 rows", () => {
		expect(buildWeaponTagValueUnits()).toHaveLength(40);
	});
});
