// C5 (Step-5 derived numbers, `ledger/character-creation.md`'s C5 row)
// offline proof. Mirrors `advancement-units.test.ts`'s posture: proves the
// GENERATOR module's own building blocks (the expression builder, the
// TS-side arithmetic mirror, the provenance-unit shapes) — fixture row shape
// is proven by the fixtures-author-tool suite reading the committed fixture
// back.
import { describe, expect, it } from "vitest";

import {
	expectedPassivePerception,
	fillInNumbersProvenanceUnits,
	passivePerceptionExpr,
	passivePerceptionProvenanceUnit,
	perceptionSkillCapabilityId,
} from "../../chapters/character-creation/derived-units";
import {
	PROOF_LEVEL_VALUE,
	PROOF_SKILL_ID,
	PROOF_WIS_VALUE,
} from "../../chapters/playing-the-game/proof-scene/identity";

describe("perceptionSkillCapabilityId", () => {
	it("resolves to srd/skill/perception, matching the proof scene's own hero grant", () => {
		expect(perceptionSkillCapabilityId()).toBe("srd/skill/perception");
		expect(perceptionSkillCapabilityId()).toBe(PROOF_SKILL_ID);
	});
});

describe("passivePerceptionExpr", () => {
	it("composes 10 + <Wisdom modifier macro call> + cond(<subject>.has_capability(perception), <PB macro call>, 0), for the actor subject", () => {
		expect(passivePerceptionExpr("actor")).toBe(
			"10 + macro('srd/ability_modifier', actor.stat('srd/wis')) + " +
				"cond(actor.has_capability('srd/skill/perception'), " +
				"macro('srd/proficiency_bonus', actor.stat('srd/level')), 0)",
		);
	});

	it("composes the SAME shape for the target subject (the C5 consumer proof's own DC expression)", () => {
		expect(passivePerceptionExpr("target")).toBe(
			"10 + macro('srd/ability_modifier', target.stat('srd/wis')) + " +
				"cond(target.has_capability('srd/skill/perception'), " +
				"macro('srd/proficiency_bonus', target.stat('srd/level')), 0)",
		);
	});

	it("never mints a new DSL macro for the capability gate (equipment-proficiencies-units.ts precedent): exactly one proficiency-bonus macro call, no second has_capability term", () => {
		const expression = passivePerceptionExpr("target");
		expect(expression.match(/macro\('srd\/proficiency_bonus'/g)).toHaveLength(1);
		expect(expression.match(/macro\('srd\/ability_modifier'/g)).toHaveLength(1);
		expect(expression.match(/has_capability/g)).toHaveLength(1);
	});
});

describe("expectedPassivePerception (TS-side mirror, never a second hand-typed copy)", () => {
	it("matches the SRD's own worked example, verbatim (character-creation.md:592): WIS 15, proficient, low level (PB +2) -> 14", () => {
		// "if your character has a Wisdom of 15 and proficiency in the
		// Perception skill, you have a Passive Perception of 14
		// (10 + 2 for your Wisdom modifier + 2 for proficiency)."
		expect(expectedPassivePerception(15, 4, true)).toBe(14);
	});

	it("the SAME WIS 15 example, unproficient: 10 + 2 + 0 = 12", () => {
		expect(expectedPassivePerception(15, 4, false)).toBe(12);
	});

	it("matches the proof scene's own hero seeds (WIS 10, level 5, proficient): 10 + 0 + 3 = 13", () => {
		expect(PROOF_WIS_VALUE).toBe(10);
		expect(PROOF_LEVEL_VALUE).toBe(5);
		expect(expectedPassivePerception(PROOF_WIS_VALUE, PROOF_LEVEL_VALUE, true)).toBe(13);
	});
});

describe("passivePerceptionProvenanceUnit / fillInNumbersProvenanceUnits", () => {
	it("ships Passive Perception as a real idiom unit (no manifest row), cited to its exact formula line", () => {
		const unit = passivePerceptionProvenanceUnit();
		expect(unit.kind).toBe("idiom_only");
		expect(unit.id).toBe("character-creation/fill-in-numbers/passive-perception");
		expect(unit.sourcePk).toContain("character-creation.md:590");
	});

	it("points Initiative/Armor Class/Attacks at their already-shipped owning code, never re-emitting a row", () => {
		const units = fillInNumbersProvenanceUnits();
		const bySlug = Object.fromEntries(units.map((unit) => [unit.id, unit]));
		expect(units).toHaveLength(5);

		const initiative = bySlug["character-creation/fill-in-numbers/initiative"];
		expect(initiative?.kind).toBe("already_shipped_elsewhere");
		expect(initiative?.sourcePk).toContain("character-creation.md:629");
		expect(initiative?.sourcePk).toContain("order-of-combat-units.ts");

		const armorClass = bySlug["character-creation/fill-in-numbers/armor-class"];
		expect(armorClass?.kind).toBe("already_shipped_elsewhere");
		expect(armorClass?.sourcePk).toContain("character-creation.md:631");
		expect(armorClass?.sourcePk).toContain("fragments/armor-class.ts");

		const attacks = bySlug["character-creation/fill-in-numbers/attacks"];
		expect(attacks?.kind).toBe("already_shipped_elsewhere");
		expect(attacks?.sourcePk).toContain("character-creation.md:633-637");
		expect(attacks?.sourcePk).toContain("attack-roll-units.ts");
	});

	it("ships Spell save DC / spell attack bonus as deferred-with-owner (no spellcasting substrate yet)", () => {
		const units = fillInNumbersProvenanceUnits();
		const deferred = units.filter((unit) => unit.kind === "deferred_with_owner");
		expect(deferred).toHaveLength(2);
		for (const unit of deferred) {
			expect(unit.sourcePk).toContain("character-creation.md:640-643");
			expect(unit.sourcePk).toContain("classes/spells chapter");
		}
		expect(deferred.map((unit) => unit.id)).toEqual([
			"character-creation/fill-in-numbers/spell-save-dc",
			"character-creation/fill-in-numbers/spell-attack-bonus",
		]);
	});
});
