import { readFileSync } from "node:fs";

import { describe } from "vitest";

import { buildRemainingFeatUnits } from "../../chapters/feats/remaining-feats-units";
import { srdEvidence, srdNotApplicable, srdUnencoded } from "../srd-coverage/evidence";

const CHAPTER = "feats";
type Aspect = "source" | "mechanic" | "fixture" | "live";

const fixture = (path: string) =>
	readFileSync(new URL(`../../../fixtures/${path}`, import.meta.url), "utf8");

const UNITS = ["feat-framing", "alert", "magic-initiate", "savage-attacker", "skilled"] as const;
describe("Feats executable coverage", () => {
	for (const unit of UNITS)
		for (const aspect of ["source", "mechanic", "fixture", "live"] as const)
			srdUnencoded({
				chapter: CHAPTER,
				unit,
				aspect,
				claim: "Coverage is not yet declared.",
				references: ["ledger/archive/feats-details.md"],
			});

	// remaining-feats: promoted to real source/fixture evidence (2026-08-06
	// coverage promotion), re-declaring the SAME claims
	// `remaining-feats-units.test.ts` already proves in detail — no new
	// proving. mechanic/live stay n/a: every one of the 13 remaining feats
	// needs a substrate seam this package does not have yet (ability-score-
	// raise action, attack/damage-roll intervention, or a spellcasting
	// substrate — `remaining-feats-units.ts`'s own header names the per-feat
	// breakdown), same posture F1's own Savage Attacker/Magic Initiate units
	// already use.
	const REMAINING_UNIT = "remaining-feats";
	const declared = new Set<Aspect>();
	function evidence(aspect: Aspect, claim: string, assertion: () => void): void {
		declared.add(aspect);
		srdEvidence(
			{ chapter: CHAPTER, unit: REMAINING_UNIT, aspect, claim, references: ["ledger/feats.md"] },
			assertion,
		);
	}
	function notApplicable(aspect: Exclude<Aspect, "source">, reason: string): void {
		declared.add(aspect);
		srdNotApplicable({
			chapter: CHAPTER,
			unit: REMAINING_UNIT,
			aspect,
			reason,
			references: ["ledger/feats.md"],
		});
	}

	const DEFERRED_REASON =
		"12 of 13 remaining feats still need a substrate seam (roll intervention, spellcasting, or " +
		"Epic Boon score raise) — ASI is mechanized separately (asi-units.ts / origins-and-feats L4); " +
		"remaining-feats-units.ts names the per-feat breakdown for the rest.";

	evidence(
		"source",
		"the CC source produces exactly 13 remaining feats: 2 General, 4 Fighting Style, 7 Epic Boon",
		() => {
			const units = buildRemainingFeatUnits();
			if (units.length !== 13) throw new Error(`expected 13 units, got ${units.length}`);
			const byCategory = new Map<string, number>();
			for (const unit of units)
				byCategory.set(unit.category, (byCategory.get(unit.category) ?? 0) + 1);
			if (byCategory.get("General") !== 2) throw new Error("expected 2 General feats");
			if (byCategory.get("Fighting Style") !== 4)
				throw new Error("expected 4 Fighting Style feats");
			if (byCategory.get("Epic Boon") !== 7) throw new Error("expected 7 Epic Boon feats");
		},
	);
	evidence(
		"fixture",
		"the rendered Grappler fixture carries its entity + General category tag",
		() => {
			const rendered = fixture("base/feats/grappler.toml");
			if (!rendered.includes('entity_def_id = "srd/feat/grappler"')) {
				throw new Error("missing srd/feat/grappler entity_def_id");
			}
			if (!rendered.includes('tag = "srd.feat.general"'))
				throw new Error("missing srd.feat.general tag");
		},
	);
	// mechanic: ASI is proven under unit ability-score-improvement; the other
	// 12 remaining feats stay n/a on this aggregate unit.
	notApplicable("mechanic", DEFERRED_REASON);
	notApplicable("live", DEFERRED_REASON);

	for (const aspect of ["source", "mechanic", "fixture", "live"] as const) {
		if (declared.has(aspect)) continue;
		srdUnencoded({
			chapter: CHAPTER,
			unit: REMAINING_UNIT,
			aspect,
			claim: `migration needs executable ${aspect} evidence for ${REMAINING_UNIT}`,
			references: ["ledger/feats.md"],
		});
	}
});
