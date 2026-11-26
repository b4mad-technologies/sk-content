// Bestiary CR 0–4 executable coverage (lane L7 / bestiary-cr0-4.md).
// Count invariant: every CR 0–4 creature is either mechanized (mechanic +
// fixture evidence) or an explicit n/a with reason. Live axis stays on the
// Giant Spider representative (live-self-seeding) plus starter-arena.
import { readFileSync } from "node:fs";

import { describe, expect } from "vitest";
import {
	buildBestiaryPlans,
	cr04CreatureCount,
	type MechanizedBestiaryPlan,
	type NaBestiaryPlan,
	STARTER_SLUGS,
} from "../../chapters/monsters/bestiary-plan";
import { buildStarterBehaviors } from "../../chapters/monsters/starter-behaviors";
import { srdEvidence, srdNotApplicable, srdUnencoded } from "../srd-coverage/evidence";

const CHAPTER = "monsters";
const DESIGN = "packages/spellkave-srd-cc/bead sk-609b.2 (design trail)";

const fixture = (path: string) =>
	readFileSync(new URL(`../../../fixtures/${path}`, import.meta.url), "utf8");

const plans = buildBestiaryPlans();
const starterResult = buildStarterBehaviors();

describe("Bestiary CR 0–4 count invariant", () => {
	srdEvidence(
		{
			chapter: CHAPTER,
			unit: "bestiary-cr0-4-count",
			aspect: "source",
			claim: "CR 0–4 creatures in cache == mechanized plans + n/a plans (no silent drops)",
			references: [DESIGN],
		},
		() => {
			expect(plans).toHaveLength(cr04CreatureCount());
			const mech = plans.filter((p) => p.kind === "mechanized");
			const na = plans.filter((p) => p.kind === "n/a");
			expect(mech.length + na.length).toBe(plans.length);
			expect(plans.length).toBe(218);
		},
	);

	srdEvidence(
		{
			chapter: CHAPTER,
			unit: "bestiary-cr0-4-count",
			aspect: "mechanic",
			claim: "every mechanized plan has a concrete route and attack payload",
			references: [DESIGN],
		},
		() => {
			for (const plan of plans) {
				if (plan.kind !== "mechanized") continue;
				const m = plan as MechanizedBestiaryPlan;
				if (m.route === "baked-ordinals") {
					expect(m.bakedAttacks.length).toBeGreaterThan(0);
				} else {
					expect(m.equippedAttack).not.toBeNull();
				}
			}
		},
	);

	srdEvidence(
		{
			chapter: CHAPTER,
			unit: "bestiary-cr0-4-count",
			aspect: "fixture",
			claim:
				"baked-ordinal action ids land in starter-behaviors.toml; archetype seeds land on creature files",
			references: [DESIGN],
		},
		() => {
			const baked = fixture("base/monsters/starter-behaviors.toml");
			for (const plan of plans) {
				if (plan.kind !== "mechanized") continue;
				const m = plan as MechanizedBestiaryPlan;
				if (m.route === "baked-ordinals") {
					expect(baked).toContain(`srd/creature/${m.slug}/action/`);
				} else if (m.route === "archetype-manufactured") {
					expect(fixture(`base/monsters/${m.slug}.toml`)).toContain(
						`equipped_entity_def_id = "${m.manufacturedWeaponEntityId}"`,
					);
				} else if (m.route === "archetype-natural") {
					expect(fixture(`base/monsters/${m.slug}.toml`)).toContain(
						`entity_def_id = "srd/natural-weapon/${m.naturalWeaponSlug}"`,
					);
				}
			}
		},
	);

	srdUnencoded({
		chapter: CHAPTER,
		unit: "bestiary-cr0-4-count",
		aspect: "live",
		claim:
			"aggregate live proof is the Giant Spider representative + starter-arena, not one act per creature",
		references: [DESIGN],
	});
});

describe("Bestiary CR 0–4 starter route stability", () => {
	srdEvidence(
		{
			chapter: CHAPTER,
			unit: "bestiary-cr0-4-starters",
			aspect: "mechanic",
			claim: "the original 8 starters keep their pre-L7 routes",
			references: [DESIGN],
		},
		() => {
			const bySlug = new Map(plans.map((p) => [p.slug, p]));
			const expectRoute = (slug: string, route: string) => {
				const plan = bySlug.get(slug);
				expect(plan?.kind).toBe("mechanized");
				if (plan?.kind === "mechanized") expect(plan.route).toBe(route);
			};
			expectRoute("goblin-warrior", "archetype-manufactured");
			expectRoute("skeleton", "archetype-manufactured");
			expectRoute("bandit", "archetype-manufactured");
			expectRoute("wolf", "archetype-natural");
			expectRoute("zombie", "archetype-natural");
			expectRoute("giant-rat", "archetype-natural");
			expectRoute("black-bear", "baked-ordinals");
			expectRoute("brown-bear", "baked-ordinals");
			expect(STARTER_SLUGS).toHaveLength(8);
			expect(starterResult.creatureSlugs).toContain("black-bear");
			expect(starterResult.creatureSlugs).toContain("brown-bear");
		},
	);
});

describe("Bestiary CR 0–4 per-creature mechanic/fixture axes", () => {
	const starterSet = new Set<string>(STARTER_SLUGS);
	// The original 8 starters keep their detailed evidence in creature-coverage.test.ts.
	for (const plan of plans) {
		if (starterSet.has(plan.slug)) continue;
		const unit = `monster-${plan.slug}-attack`;
		if (plan.kind === "n/a") {
			const na = plan as NaBestiaryPlan;
			srdEvidence(
				{
					chapter: CHAPTER,
					unit,
					aspect: "source",
					claim: `${plan.slug} is present in the CR 0–4 cache set`,
					references: [DESIGN],
				},
				() => {
					expect(plan.creaturePk).toMatch(/^srd-2024_/);
				},
			);
			for (const aspect of ["mechanic", "fixture", "live"] as const) {
				srdNotApplicable({
					chapter: CHAPTER,
					unit,
					aspect,
					reason: na.reason,
					references: [DESIGN],
				});
			}
			continue;
		}

		const m = plan as MechanizedBestiaryPlan;
		srdEvidence(
			{
				chapter: CHAPTER,
				unit,
				aspect: "source",
				claim: `${m.slug}'s CR 0–4 attack line resolves from CreatureAction/Attack or desc prose`,
				references: [DESIGN],
			},
			() => {
				if (m.route === "baked-ordinals") {
					expect(
						m.bakedAttacks.length > 0 || (m.breaths && m.breaths.length > 0) || m.hasSpellcasting,
					).toBe(true);
				} else {
					expect(m.equippedAttack?.sourcePk.length).toBeGreaterThan(0);
				}
			},
		);
		srdEvidence(
			{
				chapter: CHAPTER,
				unit,
				aspect: "mechanic",
				claim: `${m.slug} uses route ${m.route} (${m.shape})`,
				references: [DESIGN],
			},
			() => {
				expect(["archetype-manufactured", "archetype-natural", "baked-ordinals"]).toContain(
					m.route,
				);
			},
		);
		srdEvidence(
			{
				chapter: CHAPTER,
				unit,
				aspect: "fixture",
				claim: `${m.slug}'s rendered fixtures carry the mechanized attack surface`,
				references: [DESIGN],
			},
			() => {
				if (m.route === "baked-ordinals") {
					expect(fixture("base/monsters/starter-behaviors.toml")).toContain(
						`srd/creature/${m.slug}`,
					);
				} else if (m.route === "archetype-natural") {
					expect(fixture(`base/monsters/${m.slug}.toml`)).toContain("srd/natural-weapon/");
					expect(fixture(`base/monsters/${m.slug}.toml`)).toContain('slot = "srd/damage"');
				} else {
					expect(fixture(`base/monsters/${m.slug}.toml`)).toContain("equipped_entity_def_id");
				}
			},
		);
		if (m.slug === "giant-spider") {
			srdUnencoded({
				chapter: CHAPTER,
				unit,
				aspect: "live",
				claim:
					"live representative is src/test/live-self-seeding/monsters/giant-spider-arena.test.ts",
				references: [DESIGN],
			});
		} else {
			srdNotApplicable({
				chapter: CHAPTER,
				unit,
				aspect: "live",
				reason:
					"per-creature live proof is not required — one CR 1 representative (Giant Spider) plus starter-arena cover the routes",
				references: [DESIGN],
			});
		}
	}
});
