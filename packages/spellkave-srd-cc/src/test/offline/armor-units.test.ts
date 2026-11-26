// Equipment slice E1 offline proof: Chain Mail's Armor.json-pinned fields
// (never hand-typed — read the cache directly here too, so this test would
// fail if the generator's OWN reader silently drifted from the raw record)
// and the unarmored base-AC formula's two branches (seeded Dexterity vs
// none). Ledger: `ledger/equipment.md`; design: `ledger/designs/
// equipment-ac-target-fact.md`.
import { readFileSync } from "node:fs";
import path from "node:path";

import { createLocalAuthorTarget } from "@spellkave/tool-node/authoring";
import { describe, expect, it } from "vitest";
import { generateEquipment } from "../../chapters/equipment";
import {
	armorAcModifier,
	CHAIN_MAIL_ARMOR_PK,
	chainMailUnit,
	remainingArmorUnits,
} from "../../chapters/equipment/armor-units";
import {
	AC_RESOURCE_INITIAL,
	AC_RESOURCE_MAX,
	AC_RESOURCE_MIN,
	unarmoredBaseArmorClass,
} from "../../chapters/playing-the-game/armor-class-units";
import { expectedAbilityModifier } from "../../chapters/playing-the-game/modifier-units";
import { readArmor } from "../../open5e/armor";
import { CACHE_OPEN5E_DIR } from "../../open5e/paths";
import { FIXTURES_DIR } from "../../pipeline";
import { findingEvidence } from "../srd-coverage/evidence";

/** The raw Armor.json record for Chain Mail, read independently of `armorByPk` — a cross-check, not a re-derivation through the SAME code path this test verifies. */
function rawChainMailFields(): Record<string, unknown> {
	const raw = JSON.parse(readFileSync(path.join(CACHE_OPEN5E_DIR, "Armor.json"), "utf8")) as {
		pk: string;
		fields: Record<string, unknown>;
	}[];
	const record = raw.find((row) => row.pk === CHAIN_MAIL_ARMOR_PK);
	if (record === undefined) {
		throw new Error(`test setup: no Armor.json record with pk '${CHAIN_MAIL_ARMOR_PK}'.`);
	}
	return record.fields;
}

describe("chainMailUnit", () => {
	findingEvidence(
		{
			id: "37",
			title: "Equipment AC modifiers link to item definitions via entity_definition_equip_modifier",
			expected:
				"Every armor fragment carries an entity_definition_equip_modifier linking the item to its AC modifier template.",
			observed:
				"Armor AC modifiers were previously emitted without entity_definition_equip_modifier rows.",
			impact: "Equipped armor modifiers failed to fold into srd/ac on the wearer.",
			references: ["ledger/archive/findings-details.md", "ledger/designs/equipment-wear-gating.md"],
		},
		async () => {
			const output = await generateEquipment(createLocalAuthorTarget(FIXTURES_DIR));
			const chainMailToml = output.fragments["base/equipment/armor/chain-mail.toml"];
			expect(chainMailToml).toContain("[[entity_definition_equip_modifier]]");
			expect(chainMailToml).toContain('entity_def_id = "srd/armor/chain-mail"');
			expect(chainMailToml).toContain('modifier_template_id = "srd/armor/chain-mail/ac_bonus"');
		},
		90_000,
	);

	findingEvidence(
		{
			id: "38",
			title: "Local author targets augment validation with modifier axes",
			expected:
				"A modifier may reference an axis owned by the local target without copying that axis into its workspace fragment.",
			observed:
				"The former target augmentation omitted modifier_target_definitions and falsely rejected the modifier with MF-VAL-225.",
			impact:
				"Cross-chapter modifiers required a duplicate validation-only axis row in every authoring workspace.",
			references: [
				"ledger/archive/findings-details.md",
				"spellkave monorepo issue 2092",
			],
		},
		async () => {
			const output = await generateEquipment(createLocalAuthorTarget(FIXTURES_DIR));
			const chainMailToml = output.fragments["base/equipment/armor/chain-mail.toml"];
			expect(chainMailToml).toContain('applies_to = "srd/ac"');
			expect(chainMailToml).not.toContain("[[modifier_target_definitions]]");
		},
		// Per-entity fixture layout (operator directive 2026-08-06): every armor
		// and weapon fragment validates through its OWN throwaway workspace. The
		// full-bundle author pass scales with fixture size: after item-owned weapon
		// sources expanded the bundle it takes ~32s locally and exceeded 45s on the
		// shared CI runner. The bound is a runaway guard, not a performance
		// assertion, so it keeps enough headroom for concurrent runner load.
		90_000,
	);

	it("pins every field against the raw Armor.json record (never hand-typed)", () => {
		const raw = rawChainMailFields();
		const unit = chainMailUnit();
		expect(unit.sourcePk).toBe(CHAIN_MAIL_ARMOR_PK);
		expect(unit.displayName).toBe(raw.name);
		expect(unit.acBase).toBe(raw.ac_base);
		expect(unit.acAddDexMod).toBe(raw.ac_add_dexmod);
		expect(unit.acCapDexMod).toBe(raw.ac_cap_dexmod);
		expect(unit.grantsStealthDisadvantage).toBe(raw.grants_stealth_disadvantage);
		expect(unit.strengthScoreRequired).toBe(raw.strength_score_required);
	});

	it("matches the SRD's own documented values (equipment.md's Heavy Armor table + § Armor Class prose)", () => {
		const unit = chainMailUnit();
		expect(unit.acBase).toBe(16);
		expect(unit.acAddDexMod).toBe(false);
		expect(unit.acCapDexMod).toBeNull();
		expect(unit.grantsStealthDisadvantage).toBe(true);
		expect(unit.strengthScoreRequired).toBe(13);
	});

	it("is static (ac_add_dexmod: false) — E1's scope contract depends on this; a flip would need re-derivation, not a silent pass", () => {
		expect(chainMailUnit().acAddDexMod).toBe(false);
	});
});

describe("unarmoredBaseArmorClass", () => {
	it("is flat 10 with no seeded Dexterity (design draft decision 1's 'else 10' branch)", () => {
		expect(unarmoredBaseArmorClass()).toBe(10);
		expect(unarmoredBaseArmorClass(undefined)).toBe(10);
	});

	it("adds the SRD ability-modifier table's Dexterity modifier when a score is given", () => {
		// Cross-checked against modifier-units.ts's own table lookup, not a
		// hand-typed modifier — this unit composes, never retypes.
		expect(unarmoredBaseArmorClass(14)).toBe(10 + expectedAbilityModifier(14));
		expect(unarmoredBaseArmorClass(8)).toBe(10 + expectedAbilityModifier(8));
		expect(unarmoredBaseArmorClass(20)).toBe(10 + expectedAbilityModifier(20));
	});

	it("matches the SRD's own worked example (10 unarmored, no Dexterity term)", () => {
		expect(unarmoredBaseArmorClass(10)).toBe(10); // score 10 -> modifier 0
	});
});

describe("srd/ac resource bounds", () => {
	it("declares a documented default matching the no-Dexterity unarmored baseline", () => {
		expect(AC_RESOURCE_INITIAL).toBe(unarmoredBaseArmorClass());
		expect(AC_RESOURCE_MIN).toBeLessThan(AC_RESOURCE_INITIAL);
		expect(AC_RESOURCE_MAX).toBeGreaterThan(AC_RESOURCE_INITIAL);
	});

	it("bounds Chain Mail's own static AC (16) inside the declared range", () => {
		const unit = chainMailUnit();
		expect(unit.acBase).toBeGreaterThanOrEqual(AC_RESOURCE_MIN);
		expect(unit.acBase).toBeLessThanOrEqual(AC_RESOURCE_MAX);
	});
});

describe("remainingArmorUnits (E2, ledger/equipment.md 'E2 Remaining Armor')", () => {
	it("builds exactly the 12 non-Chain-Mail Armor.json records, weight class assigned per equipment.md's own table subsections", () => {
		const units = remainingArmorUnits();
		expect(units).toHaveLength(12);
		expect(units.map((unit) => unit.sourcePk).sort()).toEqual(
			readArmor()
				.map((record) => record.pk)
				.filter((pk) => pk !== CHAIN_MAIL_ARMOR_PK)
				.sort(),
		);
		const bySlug = new Map(units.map((unit) => [unit.slug, unit]));
		expect(bySlug.get("padded-armor")?.weightClass).toBe("light");
		expect(bySlug.get("leather-armor")?.weightClass).toBe("light");
		expect(bySlug.get("studded-leather-armor")?.weightClass).toBe("light");
		expect(bySlug.get("hide-armor")?.weightClass).toBe("medium");
		expect(bySlug.get("chain-shirt")?.weightClass).toBe("medium");
		expect(bySlug.get("scale-mail")?.weightClass).toBe("medium");
		expect(bySlug.get("breastplate")?.weightClass).toBe("medium");
		expect(bySlug.get("half-plate-armor")?.weightClass).toBe("medium");
		expect(bySlug.get("ring-mail")?.weightClass).toBe("heavy");
		expect(bySlug.get("splint-armor")?.weightClass).toBe("heavy");
		expect(bySlug.get("plate-armor")?.weightClass).toBe("heavy");
		expect(bySlug.get("shield")?.weightClass).toBe("shield");
	});

	it("pins every field against the raw Armor.json record (never hand-typed)", () => {
		const raw = new Map(readArmor().map((record) => [record.pk, record]));
		for (const unit of remainingArmorUnits()) {
			const record = raw.get(unit.sourcePk);
			if (record === undefined)
				throw new Error(`test setup: no Armor.json record '${unit.sourcePk}'.`);
			expect(unit.displayName).toBe(record.name);
			expect(unit.acBase).toBe(record.acBase);
			expect(unit.acAddDexMod).toBe(record.acAddDexMod);
			expect(unit.acCapDexMod).toBe(record.acCapDexMod);
			expect(unit.grantsStealthDisadvantage).toBe(record.grantsStealthDisadvantage);
			expect(unit.strengthScoreRequired).toBe(record.strengthScoreRequired);
		}
	});
});

describe("armorAcModifier (E2 formula per weight class)", () => {
	it("Light: base plus the FULL Dexterity modifier, uncapped, FlatSet", () => {
		const paddedArmor = remainingArmorUnits().find((unit) => unit.slug === "padded-armor");
		if (paddedArmor === undefined) throw new Error("test setup: no 'padded-armor' unit.");
		const modifier = armorAcModifier(paddedArmor);
		expect(modifier.deltaKind).toBe("FlatSet");
		expect(modifier.expression).toContain(`let base = ${paddedArmor.acBase};`);
		expect(modifier.expression).toContain("macro('srd/dexterity_modifier')");
		expect(modifier.expression).not.toContain("min(");
	});

	it("Medium: base plus Dexterity modifier capped at ac_cap_dexmod (min()), FlatSet — issue #265 confirmed expressible", () => {
		const breastplate = remainingArmorUnits().find((unit) => unit.slug === "breastplate");
		if (breastplate === undefined) throw new Error("test setup: no 'breastplate' unit.");
		expect(breastplate.acCapDexMod).toBe(2);
		const modifier = armorAcModifier(breastplate);
		expect(modifier.deltaKind).toBe("FlatSet");
		expect(modifier.expression).toContain(`min(dex, ${breastplate.acCapDexMod})`);
	});

	it("Heavy: static, replaces outright, FlatSet — same posture as Chain Mail", () => {
		const plateArmor = remainingArmorUnits().find((unit) => unit.slug === "plate-armor");
		if (plateArmor === undefined) throw new Error("test setup: no 'plate-armor' unit.");
		const modifier = armorAcModifier(plateArmor);
		expect(modifier.deltaKind).toBe("FlatSet");
		expect(modifier.expression).not.toContain("dex");
		expect(modifier.expression).toContain(`${plateArmor.acBase}`);
	});

	it("Shield: adds on top of existing AC — Plus, never FlatSet, unlike every body-armor row", () => {
		const shield = remainingArmorUnits().find((unit) => unit.slug === "shield");
		if (shield === undefined) throw new Error("test setup: no 'shield' unit.");
		const modifier = armorAcModifier(shield);
		expect(modifier.deltaKind).toBe("Plus");
		expect(modifier.expression).toContain(`let bonus = ${shield.acBase};`);
	});
});
