import { join } from "node:path";
import { loadBundleChainDetailed } from "@spellkave/world-author";
import { describe, expect, it } from "vitest";

import { armorWeightClass } from "../../chapters/equipment/armor-units";
import { samplePoisonUnits } from "../../chapters/gameplay-toolbox/sample-poisons";
import { catalogueEntriesFromManifest } from "../../docs/catalogue";
import { readArmor } from "../../open5e/armor";
import { readItems } from "../../open5e/item";
import { readWeapons } from "../../open5e/weapon";
import { readWeaponProperties, readWeaponPropertyAssignments } from "../../open5e/weapon-property";

const suffix = (pk: string) => pk.replace(/^srd-2024_/u, "");
const displayNumber = (value: string) =>
	value.includes(".") ? value.replace(/\.0+$/u, "") : value;

function equipmentCatalogue() {
	return catalogueEntriesFromManifest({
		entity_definitions: [
			...readWeapons().map((row) => ({ entity_def_id: `srd/weapon/${suffix(row.pk)}` })),
			...readArmor().map((row) => ({ entity_def_id: `srd/armor/${suffix(row.pk)}` })),
		],
	});
}

describe("equipment documentation facts", () => {
	it("joins cost and weight onto every weapon and armor by exact Item.json pk", () => {
		const catalogue = equipmentCatalogue();
		const entries = new Map(
			[...(catalogue.get("equipment") ?? [])].map((entry) => [entry.ref, entry] as const),
		);
		const items = new Map(readItems().map((row) => [row.pk, row] as const));
		const equipment = [...readWeapons(), ...readArmor()];
		expect(equipment).toHaveLength(51);
		for (const row of equipment) {
			const item = items.get(row.pk);
			expect(item, row.pk).toBeDefined();
			const kind = "damageDice" in row ? "weapon" : "armor";
			const facts = entries.get(`srd/${kind}/${suffix(row.pk)}`)?.facts ?? [];
			expect(facts, row.pk).toContainEqual({
				label: "Cost",
				value: `${displayNumber(item!.cost)} GP`,
			});
			expect(facts, row.pk).toContainEqual({
				label: "Weight",
				value: `${displayNumber(item!.weight)} lb.`,
			});
		}
	});

	it("renders every exact weapon property assignment, including all details and masteries", () => {
		const entries = new Map(
			[...(equipmentCatalogue().get("equipment") ?? [])].map(
				(entry) => [entry.ref, entry] as const,
			),
		);
		const properties = new Map(readWeaponProperties().map((row) => [row.pk, row] as const));
		const assignments = readWeaponPropertyAssignments();
		expect(assignments).toHaveLength(108);
		expect(assignments.filter((row) => row.detail !== null)).toHaveLength(24);
		let represented = 0;
		for (const assignment of assignments) {
			const property = properties.get(assignment.propertyPk)!;
			const expected = {
				label: property.type === "Mastery" ? "Mastery" : "Property",
				value:
					assignment.detail === null ? property.name : `${property.name} (${assignment.detail})`,
			};
			const facts = entries.get(`srd/weapon/${suffix(assignment.weaponPk)}`)?.facts ?? [];
			expect(facts, assignment.pk).toContainEqual(expected);
			represented += facts.filter(
				(fact) => fact.label === expected.label && fact.value === expected.value,
			).length;
		}
		expect(represented).toBe(108);
		expect(entries.get("srd/weapon/battleaxe")?.facts).toEqual([
			{ label: "Damage", value: "1d8 slashing" },
			{ label: "Range", value: "Melee" },
			{ label: "Cost", value: "10 GP" },
			{ label: "Weight", value: "4 lb." },
			{ label: "Mastery", value: "Topple" },
			{ label: "Property", value: "Versatile (1d10)" },
		]);
	});

	it("surfaces armor category, Dexterity caps, and Strength requirements", () => {
		const entries = new Map(
			[...(equipmentCatalogue().get("equipment") ?? [])].map(
				(entry) => [entry.ref, entry] as const,
			),
		);
		const capped = readArmor().filter((row) => row.acCapDexMod !== null);
		const strength = readArmor().filter((row) => row.strengthScoreRequired !== null);
		expect(capped.map((row) => row.pk)).toEqual([
			"srd-2024_breastplate",
			"srd-2024_chain-shirt",
			"srd-2024_half-plate-armor",
			"srd-2024_hide-armor",
			"srd-2024_scale-mail",
		]);
		expect(strength.map((row) => row.pk)).toEqual([
			"srd-2024_chain-mail",
			"srd-2024_plate-armor",
			"srd-2024_splint-armor",
		]);
		for (const armor of readArmor()) {
			const facts = entries.get(`srd/armor/${suffix(armor.pk)}`)?.facts ?? [];
			expect(facts).toContainEqual({ label: "Category", value: armorWeightClass(armor.pk) });
			if (armor.acCapDexMod !== null)
				expect(facts).toContainEqual({ label: "Dexterity Cap", value: `+${armor.acCapDexMod}` });
			if (armor.strengthScoreRequired !== null)
				expect(facts).toContainEqual({
					label: "Strength Required",
					value: String(armor.strengthScoreRequired),
				});
		}
	});

	it("keeps general Item.json catalogue facts unchanged", () => {
		const catalogue = catalogueEntriesFromManifest({
			entity_definitions: readItems().map((row) => ({
				entity_def_id: `srd/item/${suffix(row.pk)}`,
			})),
		});
		const entries = new Map(
			[...(catalogue.get("equipment") ?? [])].map((entry) => [entry.ref, entry] as const),
		);
		for (const item of readItems()) {
			expect(entries.get(`srd/item/${suffix(item.pk)}`)?.facts).toEqual([
				{ label: "Category", value: item.category },
				{ label: "Cost", value: item.cost },
				{ label: "Weight", value: item.weight },
			]);
		}
	});

	it("keeps facts unchanged for every compiled general-item fixture identity", () => {
		const manifest = loadBundleChainDetailed({
			rootManifestPath: join(import.meta.dirname, "../../../fixtures/manifest.toml"),
			resolveDependency: () => undefined,
		}).manifest;
		const catalogue = catalogueEntriesFromManifest(manifest as unknown as Record<string, unknown>);
		const samplePoisons = new Set(samplePoisonUnits().map((unit) => unit.entityId));
		const actual = (catalogue.get("equipment") ?? []).filter(
			(entry) =>
				entry.ref.startsWith("srd/item/") &&
				entry.ref !== "srd/item/gold-piece" &&
				!samplePoisons.has(entry.ref),
		);
		const source = new Map<string, ReturnType<typeof readItems>[number]>(
			readItems().map((item) => [`srd/item/${suffix(item.pk)}`, item]),
		);
		// 86 before the catalogue remainder (sk-jay0.3.19): +11 gear, +4 coins, +2 focuses, +21 mounts/vehicles, +5 food and drink.
		expect(actual).toHaveLength(129);
		for (const entry of actual) {
			const item = source.get(entry.ref);
			if (item === undefined) {
				expect(entry.facts, entry.ref).toBeUndefined();
				continue;
			}
			expect(entry.facts).toEqual([
				{ label: "Category", value: item.category },
				{ label: "Cost", value: item.cost },
				{ label: "Weight", value: item.weight },
			]);
		}
	});
});
