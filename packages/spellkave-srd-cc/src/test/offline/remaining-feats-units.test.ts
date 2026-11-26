// F2 offline proof (`ledger/feats.md`): the 13 remaining General/Fighting
// Style/Epic Boon feats — identity fields pinned against the raw Feat.json/
// FeatBenefit.json records, category tags, and the per-feat deferred-
// mechanic reason (never a blanket placeholder).
import { describe, expect, it } from "vitest";

import {
	buildRemainingFeatUnits,
	remainingFeatCategoryTag,
} from "../../chapters/feats/remaining-feats-units";
import { featBenefitsByParent, featByPk, readFeats } from "../../open5e/feat";

describe("buildRemainingFeatUnits", () => {
	it("builds exactly 13 feats: 2 General, 4 Fighting Style, 7 Epic Boon", () => {
		const units = buildRemainingFeatUnits();
		expect(units).toHaveLength(13);
		const byCategory = new Map<string, number>();
		for (const unit of units) {
			byCategory.set(unit.category, (byCategory.get(unit.category) ?? 0) + 1);
		}
		expect(byCategory.get("General")).toBe(2);
		expect(byCategory.get("Fighting Style")).toBe(4);
		expect(byCategory.get("Epic Boon")).toBe(7);
	});

	it("every unit's entityId/category/sourcePk are read straight off Feat.json, never re-typed", () => {
		for (const unit of buildRemainingFeatUnits()) {
			expect(unit.entityId).toBe(`srd/feat/${unit.slug}`);
			const feat = featByPk(unit.sourcePk);
			expect(feat.name).toBe(unit.displayName);
			expect(feat.type).toBe(unit.category);
			expect(["General", "Fighting Style", "Epic Boon"]).toContain(feat.type);
		}
	});

	it("every benefit's desc is read straight from FeatBenefit.json, never re-typed", () => {
		for (const unit of buildRemainingFeatUnits()) {
			const benefits = featBenefitsByParent(unit.sourcePk).filter(
				(row) => row.name !== "Repeatable",
			);
			expect(unit.benefits.map((benefit) => benefit.sourcePk)).toEqual(
				benefits.map((benefit) => benefit.pk),
			);
			for (const benefit of unit.benefits) {
				expect(benefit.desc.length).toBeGreaterThan(0);
			}
		}
	});

	it("Grappler's 4 labeled benefits resolve markdown labels, not raw (possibly empty) JSON names", () => {
		const grappler = buildRemainingFeatUnits().find((unit) => unit.slug === "grappler");
		if (grappler === undefined) throw new Error("test setup: no 'grappler' unit.");
		expect(grappler.benefits.map((benefit) => benefit.label)).toEqual([
			"Ability Score Increase",
			"Punch and Grab",
			"Attack Advantage",
			"Fast Wrestler",
		]);
	});

	it("Ability Score Improvement is repeatable; the 4 Fighting Styles are not", () => {
		const units = buildRemainingFeatUnits();
		const asi = units.find((unit) => unit.slug === "ability-score-improvement");
		expect(asi?.repeatable).toBe(true);
		expect(asi?.repeatableText).toBeDefined();
		for (const slug of ["archery", "defense", "great-weapon-fighting", "two-weapon-fighting"]) {
			const unit = units.find((candidate) => candidate.slug === slug);
			expect(unit?.repeatable, `expected '${slug}' to be non-repeatable`).toBe(false);
		}
	});

	it("every unit names a concrete, non-empty deferred-mechanic reason — never a blanket placeholder", () => {
		for (const unit of buildRemainingFeatUnits()) {
			expect(unit.deferredReason.length).toBeGreaterThan(20);
		}
	});

	it("Feat.json still carries exactly 13 General/Fighting Style/Epic Boon rows (ledger staleness guard)", () => {
		const remaining = readFeats().filter(
			(feat) =>
				feat.type === "General" || feat.type === "Fighting Style" || feat.type === "Epic Boon",
		);
		expect(remaining).toHaveLength(13);
	});
});

describe("remainingFeatCategoryTag", () => {
	it("maps each of the 3 categories to its own srd.feat.<slug> tag", () => {
		expect(remainingFeatCategoryTag("General")).toBe("srd.feat.general");
		expect(remainingFeatCategoryTag("Fighting Style")).toBe("srd.feat.fighting_style");
		expect(remainingFeatCategoryTag("Epic Boon")).toBe("srd.feat.epic_boon");
	});
});
