// O1 offline proof (`ledger/character-origins.md`): the four Background
// units — ability triples, skill grants resolved against the real skill
// catalog, tool-proficiency resolution (existing Thieves' Tools vs. the two
// net-new capabilities), feat grants resolved against the real F1 feat
// catalog (including the Magic Initiate "(Cleric)"/"(Wizard)" qualifier
// parse), and full BackgroundBenefit.json provenance.
import { describe, expect, it } from "vitest";

import {
	buildBackgroundDescription,
	buildBackgroundUnits,
} from "../../chapters/character-origins/background-units";
import {
	CALLIGRAPHERS_SUPPLIES_PROFICIENCY_CAPABILITY_ID,
	GAMING_SET_DICE_PROFICIENCY_CAPABILITY_ID,
	THIEVES_TOOLS_PROFICIENCY_CAPABILITY_ID,
} from "../../chapters/playing-the-game/equipment-proficiencies-units";
import { backgroundBenefitsByParent, readBackgrounds } from "../../open5e/background";

describe("buildBackgroundUnits", () => {
	it("builds exactly the four Backgrounds, Background.json pk order", () => {
		const units = buildBackgroundUnits();
		expect(units.map((unit) => unit.slug)).toEqual(["acolyte", "criminal", "sage", "soldier"]);
		for (const unit of units) {
			expect(unit.entityId).toBe(`srd/background/${unit.slug}`);
			expect(unit.benefits).toHaveLength(5);
			expect(unit.benefits.map((benefit) => benefit.type)).toEqual([
				"ability_score",
				"skill_proficiency",
				"tool_proficiency",
				"equipment",
				"feat",
			]);
		}
	});

	it("resolves each background's ability-score triple to real ability codes", () => {
		const units = buildBackgroundUnits();
		const bySlug = new Map(units.map((unit) => [unit.slug, unit]));
		expect(bySlug.get("acolyte")?.abilityScoreCodes).toEqual(["int", "wis", "cha"]);
		expect(bySlug.get("criminal")?.abilityScoreCodes).toEqual(["dex", "con", "int"]);
		expect(bySlug.get("sage")?.abilityScoreCodes).toEqual(["con", "int", "wis"]);
		expect(bySlug.get("soldier")?.abilityScoreCodes).toEqual(["str", "dex", "con"]);
	});

	it("resolves each background's two skill grants to real srd/skill/<slug> capability ids, never hand-slugged", () => {
		const units = buildBackgroundUnits();
		const bySlug = new Map(units.map((unit) => [unit.slug, unit]));
		expect(bySlug.get("acolyte")?.skillCapabilityIds).toEqual([
			"srd/skill/insight",
			"srd/skill/religion",
		]);
		expect(bySlug.get("criminal")?.skillCapabilityIds).toEqual([
			"srd/skill/sleight-of-hand",
			"srd/skill/stealth",
		]);
		expect(bySlug.get("sage")?.skillCapabilityIds).toEqual([
			"srd/skill/arcana",
			"srd/skill/history",
		]);
		expect(bySlug.get("soldier")?.skillCapabilityIds).toEqual([
			"srd/skill/athletics",
			"srd/skill/intimidation",
		]);
	});

	it("resolves Tool Proficiency: Criminal to the EXISTING Thieves' Tools capability, Acolyte/Sage to the shared net-new Calligrapher's Supplies capability, Soldier to the net-new Gaming Set (Dice) pick, flagged as an open choice", () => {
		const units = buildBackgroundUnits();
		const bySlug = new Map(units.map((unit) => [unit.slug, unit]));

		const criminal = bySlug.get("criminal");
		expect(criminal?.toolProficiencyCapabilityId).toBe(THIEVES_TOOLS_PROFICIENCY_CAPABILITY_ID);
		expect(criminal?.toolProficiencyIsOpenChoice).toBe(false);

		for (const slug of ["acolyte", "sage"] as const) {
			const unit = bySlug.get(slug);
			expect(unit?.toolProficiencyCapabilityId).toBe(
				CALLIGRAPHERS_SUPPLIES_PROFICIENCY_CAPABILITY_ID,
			);
			expect(unit?.toolProficiencyIsOpenChoice).toBe(false);
		}

		const soldier = bySlug.get("soldier");
		expect(soldier?.toolProficiencyCapabilityId).toBe(GAMING_SET_DICE_PROFICIENCY_CAPABILITY_ID);
		expect(soldier?.toolProficiencyIsOpenChoice).toBe(true);
		expect(soldier?.toolProficiencyDesc).toBe("Choose one kind of Gaming Set");
	});

	it("resolves each background's Feat grant to the real F1 srd/feat/<slug> entity, parsing out Acolyte/Sage's (Cleric)/(Wizard) qualifier", () => {
		const units = buildBackgroundUnits();
		const bySlug = new Map(units.map((unit) => [unit.slug, unit]));

		const acolyte = bySlug.get("acolyte");
		expect(acolyte?.featName).toBe("Magic Initiate");
		expect(acolyte?.featQualifier).toBe("Cleric");
		expect(acolyte?.featEntityId).toBe("srd/feat/magic-initiate");

		const sage = bySlug.get("sage");
		expect(sage?.featName).toBe("Magic Initiate");
		expect(sage?.featQualifier).toBe("Wizard");
		expect(sage?.featEntityId).toBe("srd/feat/magic-initiate");

		const criminal = bySlug.get("criminal");
		expect(criminal?.featName).toBe("Alert");
		expect(criminal?.featQualifier).toBeUndefined();
		expect(criminal?.featEntityId).toBe("srd/feat/alert");

		const soldier = bySlug.get("soldier");
		expect(soldier?.featName).toBe("Savage Attacker");
		expect(soldier?.featQualifier).toBeUndefined();
		expect(soldier?.featEntityId).toBe("srd/feat/savage-attacker");
	});

	it("every benefit's desc is read straight from BackgroundBenefit.json, never re-typed", () => {
		for (const unit of buildBackgroundUnits()) {
			const rawBenefits = backgroundBenefitsByParent(unit.sourcePk);
			expect(unit.benefits.map((benefit) => benefit.desc)).toEqual(
				rawBenefits.map((row) => row.desc),
			);
			expect(unit.benefits.map((benefit) => benefit.sourcePk)).toEqual(
				rawBenefits.map((row) => row.pk),
			);
		}
	});

	it("Background.json still carries exactly 4 rows (ledger staleness guard)", () => {
		expect(readBackgrounds()).toHaveLength(4);
	});
});

describe("buildBackgroundDescription", () => {
	it("is the authored flavor blurb, not grants or compiler notes", () => {
		const DEV_MARKERS = ["Source: cache/", "pk='", "Ability Scores:", "srd/skill/", "srd/feat/"];
		for (const unit of buildBackgroundUnits()) {
			const description = buildBackgroundDescription(unit);
			expect(description.length).toBeGreaterThan(40);
			for (const marker of DEV_MARKERS) {
				expect(
					description,
					`${unit.slug}: '${marker}' does not belong on the website card`,
				).not.toContain(marker);
			}
		}
	});

	it("retains unit-level provenance and grant ids for attachments (not the website blurb)", () => {
		for (const unit of buildBackgroundUnits()) {
			expect(unit.sourcePk.length).toBeGreaterThan(0);
			expect(unit.markdownAnchor).toMatch(/^character-origins\.md:/);
			expect(unit.skillCapabilityIds[0]).toMatch(/^srd\/skill\//);
			expect(unit.featEntityId).toMatch(/^srd\/feat\//);
		}
	});

	it("flags Soldier's Gaming Set as an open choice on the unit, not the website blurb", () => {
		const soldier = buildBackgroundUnits().find((unit) => unit.slug === "soldier");
		if (soldier === undefined) throw new Error("test setup: no 'soldier' unit.");
		expect(soldier.toolProficiencyIsOpenChoice).toBe(true);
		expect(buildBackgroundDescription(soldier)).not.toContain("choice remains open");
	});
});
