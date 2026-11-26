import { parse } from "smol-toml";
import { describe, expect, it } from "vitest";
import {
	buildStartingGearFragments,
	coinUnits,
	equipmentPackContents,
	gearHoldsItems,
	gearHoldsLiquidOnly,
	startingGearUnits,
} from "../../chapters/equipment/starting-gear.ts";
import { itemByPk } from "../../open5e/item.ts";

describe("starting kit source gear", () => {
	it("compiles the Dungeoneer pack contents from source with counted units", () => {
		const contents = equipmentPackContents(itemByPk("srd-2024_dungeoneers-pack").description);
		expect(contents).toHaveLength(9);
		expect(contents).toContainEqual({ name: "Oil", quantity: 2 });
		expect(contents).toContainEqual({ name: "Rations", quantity: 10 });
		expect(contents).toContainEqual({ name: "Torches", quantity: 10 });
		expect(contents).toContainEqual({ name: "Waterskin", quantity: 1 });
	});
	it("tags item containers from pack contents or a non-liquid capacity unit", () => {
		expect(gearHoldsItems(itemByPk("srd-2024_chest").description)).toBe(true);
		expect(gearHoldsItems(itemByPk("srd-2024_barrel").description)).toBe(true);
		expect(gearHoldsItems(itemByPk("srd-2024_bucket").description)).toBe(true);
		expect(gearHoldsItems(itemByPk("srd-2024_case-crossbow-bolt").description)).toBe(true);
		expect(gearHoldsItems(itemByPk("srd-2024_dungeoneers-pack").description)).toBe(true);
		expect(gearHoldsLiquidOnly(itemByPk("srd-2024_flask").description)).toBe(true);
		expect(gearHoldsItems(itemByPk("srd-2024_flask").description)).toBe(false);
		expect(gearHoldsItems(itemByPk("srd-2024_waterskin").description)).toBe(false);
		expect(gearHoldsItems(itemByPk("srd-2024_vial").description)).toBe(false);
		expect(gearHoldsItems(itemByPk("srd-2024_component-pouch").description)).toBe(false);
		expect(gearHoldsItems(itemByPk("srd-2024_paper").description)).toBe(false);
		expect(gearHoldsItems(itemByPk("srd-2024_tinderbox").description)).toBe(false);
	});

	it("retains source identity, descriptions and ammunition pack units", () => {
		const units = startingGearUnits();
		for (const unit of units) {
			const source = itemByPk(unit.pk);
			expect(unit.name).toBe(source.name);
			expect(unit.description).toBe(source.description);
		}
		expect(units.find((unit) => unit.pk === "srd-2024_arrows-20")?.unitsPerItem).toBe(20);
		expect(units.find((unit) => unit.pk === "srd-2024_rations")?.unitsPerItem).toBe(1);
	});

	it("renders admitted gear through the canonical authoring engine", async () => {
		const result = await buildStartingGearFragments();
		expect(Object.keys(result.fragments)).toHaveLength(
			startingGearUnits().length + 1 + coinUnits().length,
		);
		const namespaces = Object.values(result.fragments).flatMap(
			(toml) => parse(toml).metadata_namespaces ?? [],
		);
		expect(namespaces).toHaveLength(1);
		expect(namespaces[0]).toMatchObject({ namespace: "srd.equipment_contents" });
		expect(result.fragments["base/equipment/gear/gold-piece.toml"]).toContain("stackable = true");
		expect(result.fragments["base/equipment/gear/dungeoneers-pack.toml"]).toContain(
			"srd/item/dungeoneers-pack",
		);
		expect(result.units.map((unit) => unit.id)).toContain("srd/item/rations");
		expect(result.fragments["base/equipment/gear/dungeoneers-pack.toml"]).toContain(
			"srd.equipment_contents",
		);
	});
});
