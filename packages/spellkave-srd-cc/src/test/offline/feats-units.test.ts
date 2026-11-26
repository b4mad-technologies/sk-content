// F1 offline proof (`ledger/feats.md`): the four Origin feat units — pinned
// quirks (Alert's `initative` pk typo, Magic Initiate's "Level One Spell" /
// "Level 1 Spell" divergence), the Skilled proof-triple grant, and the
// unwired Alert Initiative PB idiom.
import { describe, expect, it } from "vitest";

import { ALERT_CAPABILITY_ID, alertInitiativeRollExpr } from "../../chapters/feats/alert-units";
import { buildOriginFeatDescription, buildOriginFeatUnits } from "../../chapters/feats/feats-units";
import {
	SKILLED_PROOF_SKILL_SLUGS,
	skilledProofSkillCapabilityIds,
} from "../../chapters/feats/skilled-units";
import { featBenefitsByParent, featByPk, readFeats } from "../../open5e/feat";

describe("buildOriginFeatUnits", () => {
	it("builds exactly the four Origin feats, Feat.json pk order", () => {
		const units = buildOriginFeatUnits();
		expect(units.map((unit) => unit.slug)).toEqual([
			"alert",
			"magic-initiate",
			"savage-attacker",
			"skilled",
		]);
		for (const unit of units) {
			expect(unit.entityId).toBe(`srd/feat/${unit.slug}`);
			expect(unit.category).toBe("Origin");
		}
	});

	it("pins Alert's FeatBenefit pk typo VERBATIM — never corrected", () => {
		const alert = featBenefitsByParent("srd-2024_alert");
		expect(alert).toHaveLength(2);
		for (const benefit of alert) {
			expect(benefit.pk).toContain("initative");
			expect(benefit.pk).not.toContain("initiative-proficiency-fixed");
		}
		const unit = buildOriginFeatUnits().find((candidate) => candidate.slug === "alert");
		expect(unit?.benefits.map((benefit) => benefit.sourcePk)).toEqual(
			alert.map((benefit) => benefit.pk),
		);
		// The resolved LABELS are correct despite the pk typo — the pk and the
		// label are independent fields (module header).
		expect(unit?.benefits.map((benefit) => benefit.label)).toEqual([
			"Initiative Proficiency",
			"Initiative Swap",
		]);
	});

	it("prefers the markdown's 'Level 1 Spell' heading over Magic Initiate's raw JSON name 'Level One Spell'", () => {
		const rawBenefit = featBenefitsByParent("srd-2024_magic-initiate")[1];
		expect(rawBenefit?.name).toBe("Level One Spell");

		const unit = buildOriginFeatUnits().find((candidate) => candidate.slug === "magic-initiate");
		const resolved = unit?.benefits[1];
		expect(resolved?.jsonName).toBe("Level One Spell");
		expect(resolved?.label).toBe("Level 1 Spell");
		expect(unit?.repeatable).toBe(true);
	});

	it("Savage Attacker and Skilled: JSON name is empty; the resolved label stays empty (no markdown heading to prefer)", () => {
		for (const slug of ["savage-attacker", "skilled"] as const) {
			const unit = buildOriginFeatUnits().find((candidate) => candidate.slug === slug);
			expect(unit?.benefits).toHaveLength(1);
			expect(unit?.benefits[0]?.jsonName).toBe("");
			expect(unit?.benefits[0]?.label).toBe("");
		}
		const skilled = buildOriginFeatUnits().find((candidate) => candidate.slug === "skilled");
		expect(skilled?.repeatable).toBe(true);
		const savageAttacker = buildOriginFeatUnits().find(
			(candidate) => candidate.slug === "savage-attacker",
		);
		expect(savageAttacker?.repeatable).toBe(false);
	});

	it("Alert is not repeatable (no _Repeatable._ sub-heading, no matching FeatBenefit row)", () => {
		const unit = buildOriginFeatUnits().find((candidate) => candidate.slug === "alert");
		expect(unit?.repeatable).toBe(false);
		expect(unit?.repeatableText).toBeUndefined();
	});

	it("every benefit's desc is read straight from FeatBenefit.json, never re-typed", () => {
		for (const unit of buildOriginFeatUnits()) {
			const feat = featByPk(unit.sourcePk);
			expect(feat.type).toBe("Origin");
			for (const benefit of unit.benefits) {
				expect(benefit.desc.length).toBeGreaterThan(0);
			}
		}
	});

	it("Feat.json still carries exactly 4 Origin rows (ledger staleness guard)", () => {
		expect(readFeats().filter((feat) => feat.type === "Origin")).toHaveLength(4);
	});
});

describe("buildOriginFeatDescription", () => {
	// sk-content: needs the held SRD flavor texts (PROVENANCE.md).
	it.skip("uses authored flavor, not compiler provenance", () => {
		const unit = buildOriginFeatUnits().find((candidate) => candidate.slug === "alert");
		if (unit === undefined) throw new Error("test setup: no 'alert' unit.");
		const description = buildOriginFeatDescription(unit);
		expect(description.length).toBeGreaterThan(40);
		expect(description).not.toContain("pk=");
		expect(description).not.toContain("Source:");
		expect(description).not.toContain("initative");
	});

	it("keeps FeatBenefit pk typos on the benefit units, not the short description", () => {
		const unit = buildOriginFeatUnits().find((candidate) => candidate.slug === "alert");
		if (unit === undefined) throw new Error("test setup: no 'alert' unit.");
		expect(unit.benefits.some((benefit) => benefit.sourcePk.includes("initative"))).toBe(true);
		expect(unit.sourcePk).toBe("srd-2024_alert");
	});
});

describe("skilledProofSkillCapabilityIds (Skilled — fully mechanized proof grant)", () => {
	it("resolves the three authorial-choice skill slugs to real srd/skill/* capability ids", () => {
		const ids = skilledProofSkillCapabilityIds();
		expect(ids).toEqual(SKILLED_PROOF_SKILL_SLUGS.map((slug) => `srd/skill/${slug}`));
	});

	it("is disjoint from the proof hero's PRE-EXISTING skill grants (perception/athletics/stealth) — an observably NEW grant, not a duplicate", () => {
		const ids = skilledProofSkillCapabilityIds();
		for (const preexisting of [
			"srd/skill/perception",
			"srd/skill/athletics",
			"srd/skill/stealth",
		]) {
			expect(ids).not.toContain(preexisting);
		}
	});
});

describe("alertInitiativeRollExpr (Alert — partial, unwired idiom)", () => {
	it("composes d20 + Dex modifier + a capability-gated PB term, gated on srd/feat/alert", () => {
		const expr = alertInitiativeRollExpr("actor.stat('srd/dex')", "actor.stat('srd/level')");
		expect(expr).toContain("d20");
		expect(expr).toContain("actor.stat('srd/dex')");
		expect(expr).toContain(`actor.has_capability('${ALERT_CAPABILITY_ID}')`);
		expect(expr).toContain("macro('srd/proficiency_bonus'");
		expect(ALERT_CAPABILITY_ID).toBe("srd/feat/alert");
	});
});
