// Monster mechanics offline coverage: breath/AoE save actions (BL-58),
// attack riders (BL-59), and monster spellcasting auto-wiring (BL-60).
import { readFileSync } from "node:fs";
import { describe, expect } from "vitest";

import { buildBestiaryPlans, parseRiderConditions } from "../../chapters/monsters/bestiary-plan";
import { buildCreatureUnits } from "../../chapters/monsters/creature-units";
import { srdEvidence, srdNotApplicable } from "../srd-coverage/evidence";

const CHAPTER = "monsters";
const DESIGN = "packages/spellkave-srd-cc/bead sk-609b.2 (design trail)";
const STARTER = "packages/spellkave-srd-cc/src/chapters/monsters/starter-behaviors.ts";
const PLAN = "packages/spellkave-srd-cc/src/chapters/monsters/bestiary-plan.ts";
const PATTERN_RIDER =
	"packages/spellkave-world-author/docs/patterns/mastery-gated-attack-variant.md";
const PATTERN_AOE = "packages/spellkave-world-author/docs/patterns/lingering-hazard-zone.md";

const fixture = (path: string) =>
	readFileSync(new URL(`../../../fixtures/${path}`, import.meta.url), "utf8");

describe("Monster breath and AoE save actions (BL-58)", () => {
	srdEvidence(
		{
			chapter: CHAPTER,
			unit: "monster-breath-aoe-save",
			aspect: "source",
			claim:
				"CR 0–4 CreatureAction.desc lines with save + line/cone/sphere geometry parse into PlannedBreathOrAoe",
			references: [DESIGN, PLAN, PATTERN_AOE],
		},
		() => {
			const plans = buildBestiaryPlans();
			const withBreaths = plans.filter(
				(p) => p.kind === "mechanized" && p.breaths && p.breaths.length > 0,
			);
			expect(withBreaths.length).toBe(18);

			const ankheg = withBreaths.find((p) => p.slug === "ankheg");
			expect(ankheg).toBeDefined();
			if (ankheg?.kind === "mechanized") {
				expect(ankheg.breaths).toHaveLength(1);
				expect(ankheg.breaths[0]?.displayName).toBe("Acid Spray");
				expect(ankheg.breaths[0]?.saveAbility).toBe("dexterity");
				expect(ankheg.breaths[0]?.saveDc).toBe(12);
				expect(ankheg.breaths[0]?.areaShape.kind).toBe("line");
				expect(ankheg.breaths[0]?.diceExpr).toBe("4d6");
				expect(ankheg.breaths[0]?.damageType).toBe("acid");
			}

			const hellHound = withBreaths.find((p) => p.slug === "hell-hound");
			expect(hellHound).toBeDefined();
			if (hellHound?.kind === "mechanized") {
				expect(hellHound.breaths).toHaveLength(1);
				expect(hellHound.breaths[0]?.displayName).toBe("Fire Breath");
				expect(hellHound.breaths[0]?.saveAbility).toBe("dexterity");
				expect(hellHound.breaths[0]?.saveDc).toBe(12);
				expect(hellHound.breaths[0]?.areaShape.kind).toBe("cone");
				expect(hellHound.breaths[0]?.diceExpr).toBe("5d6");
				expect(hellHound.breaths[0]?.damageType).toBe("fire");
			}
		},
	);

	srdEvidence(
		{
			chapter: CHAPTER,
			unit: "monster-breath-aoe-save",
			aspect: "mechanic",
			claim:
				"starter-behaviors emits ForEachActorInRadius save-half (or save-negate) breath actions per planned breath",
			references: [DESIGN, STARTER, PATTERN_AOE],
		},
		() => {
			const plans = buildBestiaryPlans();
			const withBreaths = plans.filter(
				(p) => p.kind === "mechanized" && p.breaths && p.breaths.length > 0,
			);
			expect(withBreaths.length).toBeGreaterThan(0);
			for (const plan of withBreaths) {
				if (plan.kind !== "mechanized") continue;
				expect(plan.breaths.every((b) => b.saveDc > 0 && b.diceExpr.length > 0)).toBe(true);
			}
		},
	);

	srdEvidence(
		{
			chapter: CHAPTER,
			unit: "monster-breath-aoe-save",
			aspect: "fixture",
			claim: "starter-behaviors.toml carries representative breath action ids",
			references: [DESIGN, STARTER, PATTERN_AOE],
		},
		() => {
			const toml = fixture("base/monsters/starter-behaviors.toml");
			expect(toml).toContain("srd/creature/ankheg/action/acid-spray");
			expect(toml).toContain("srd/creature/hell-hound/action/fire-breath");
			expect(toml).toContain("srd/creature/green-dragon-wyrmling/action/poison-breath");
			expect(toml).toContain("srd/creature/winter-wolf/action/cold-breath");
			expect(toml).toContain("# pattern: lingering-hazard-zone");
		},
	);

	srdNotApplicable({
		chapter: CHAPTER,
		unit: "monster-breath-aoe-save",
		aspect: "live",
		reason:
			"breath live proof rides the Giant Spider / starter-arena live routes; no dedicated breath node this lane",
		references: [DESIGN],
	});
});

describe("Monster attack riders (BL-59)", () => {
	srdEvidence(
		{
			chapter: CHAPTER,
			unit: "monster-attack-riders",
			aspect: "source",
			claim:
				"CreatureAction.desc on-hit condition prose parses to srd/condition/* ids (prone, poisoned, grappled, paralyzed)",
			references: [DESIGN, PLAN, PATTERN_RIDER],
		},
		() => {
			expect(
				parseRiderConditions(
					"Melee Attack Roll: +5 to hit. Hit: 10 (2d6 + 3) Piercing damage. If the target is a Large or smaller creature, it has the Prone condition.",
				),
			).toContain("srd/condition/prone");

			expect(
				parseRiderConditions(
					"Melee Attack Roll: +5 to hit. Hit: 7 (1d8 + 3) Piercing damage plus 9 (2d8) Poison damage. The target has the Poisoned condition for 1 hour.",
				),
			).toContain("srd/condition/poisoned");

			expect(
				parseRiderConditions(
					"Melee Attack Roll: +4 to hit. Hit: 5 (1d6 + 2) Bludgeoning damage. The target is Grappled (escape DC 12).",
				),
			).toContain("srd/condition/grappled");

			expect(
				parseRiderConditions(
					"Melee Attack Roll: +4 to hit. Hit: 4 (1d4 + 2) Piercing damage. The target has the Paralyzed condition until the start of the monster's next turn.",
				),
			).toContain("srd/condition/paralyzed");
		},
	);

	srdEvidence(
		{
			chapter: CHAPTER,
			unit: "monster-attack-riders",
			aspect: "mechanic",
			claim:
				"baked ordinals append ApplyStatus frame writes for each planned condition rider after damage",
			references: [DESIGN, STARTER, PATTERN_RIDER],
		},
		() => {
			const plans = buildBestiaryPlans();
			const withRiders = plans.filter(
				(p) =>
					p.kind === "mechanized" &&
					p.bakedAttacks.some((a) => a.conditionRiders && a.conditionRiders.length > 0),
			);
			expect(withRiders.length).toBeGreaterThan(0);
		},
	);

	srdEvidence(
		{
			chapter: CHAPTER,
			unit: "monster-attack-riders",
			aspect: "fixture",
			claim: "starter-behaviors.toml emits ApplyStatus condition_definition_id rows for riders",
			references: [DESIGN, STARTER, PATTERN_RIDER],
		},
		() => {
			const toml = fixture("base/monsters/starter-behaviors.toml");
			expect(toml).toContain('condition_definition_id = "srd/condition/prone"');
			expect(toml).toContain('condition_definition_id = "srd/condition/poisoned"');
			expect(toml).toContain("# pattern: mastery-gated-attack-variant");
		},
	);

	srdNotApplicable({
		chapter: CHAPTER,
		unit: "monster-attack-riders",
		aspect: "live",
		reason: "rider live proof deferred; offline fixture + mechanic axes cover the composition",
		references: [DESIGN],
	});
});

describe("Monster spellcasting auto-wiring (BL-60)", () => {
	srdEvidence(
		{
			chapter: CHAPTER,
			unit: "monster-spellcasting-wiring",
			aspect: "source",
			claim:
				"CR 0–4 creatures with Spellcasting / Innate Spellcasting action rows are flagged hasSpellcasting",
			references: [DESIGN, PLAN],
		},
		() => {
			const plans = buildBestiaryPlans();
			const casters = plans.filter((p) => p.kind === "mechanized" && p.hasSpellcasting);
			expect(casters.length).toBe(10);
			expect(casters.map((c) => c.slug)).toEqual(
				expect.arrayContaining([
					"couatl",
					"cultist-fanatic",
					"druid",
					"dryad",
					"giant-owl",
					"green-hag",
					"incubus",
					"lamia",
					"priest",
					"priest-acolyte",
				]),
			);
		},
	);

	srdEvidence(
		{
			chapter: CHAPTER,
			unit: "monster-spellcasting-wiring",
			aspect: "mechanic",
			claim: "spellcasting monsters seed spell_slot_1/2 initial states and grant srd/action/magic",
			references: [DESIGN, STARTER],
		},
		() => {
			const units = buildCreatureUnits();
			const druid = units.find((u) => u.slug === "druid");
			expect(druid).toBeDefined();
			const slot1 = druid?.initialStates.find((s) => s.state === "srd/spell_slot_1");
			const slot2 = druid?.initialStates.find((s) => s.state === "srd/spell_slot_2");
			expect(slot1).toBeDefined();
			expect(slot1?.valueInt).toBeGreaterThan(0);
			expect(slot2).toBeDefined();
			expect(slot2?.valueInt).toBeGreaterThan(0);
		},
	);

	srdEvidence(
		{
			chapter: CHAPTER,
			unit: "monster-spellcasting-wiring",
			aspect: "fixture",
			claim:
				"starter-behaviors.toml grants srd/action/magic on spellcasting creature defs; creature fixtures carry slot seeds",
			references: [DESIGN, STARTER],
		},
		() => {
			const toml = fixture("base/monsters/starter-behaviors.toml");
			expect(toml).toContain('entity_def_id = "srd/creature/druid"');
			expect(toml).toContain('capability_id = "srd/action/magic"');
			expect(toml).toContain('entity_def_id = "srd/creature/priest"');
			expect(toml).toContain('entity_def_id = "srd/creature/green-hag"');
			const druidToml = fixture("base/monsters/druid.toml");
			expect(druidToml).toContain("srd/spell_slot_1");
			expect(druidToml).toContain("srd/spell_slot_2");
		},
	);

	srdNotApplicable({
		chapter: CHAPTER,
		unit: "monster-spellcasting-wiring",
		aspect: "live",
		reason:
			"auto-wiring is catalog/fixture scope; live spell cast proofs live under spells chapter live-self-seeding",
		references: [DESIGN],
	});
});
