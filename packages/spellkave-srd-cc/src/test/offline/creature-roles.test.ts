/**
 * L11 — combat-role tags on every creature + role-driven factory selects a
 * brain for ≥5 distinct bestiary creatures with zero per-creature brain code.
 */

import {
	COMBAT_ROLE_TAG_PREFIX,
	combatRoleTag,
	parseCombatRoleTag,
} from "@spellkave/adventure-runtime/npc-kinds";
import { describe, expect, it } from "vitest";
import {
	buildCreatureRoleTagValueUnits,
	combatRoleForCreature,
} from "../../chapters/monsters/creature-roles";
import { buildCreatureTagValueUnits } from "../../chapters/monsters/creature-tag-values";
import { buildCreatureUnits } from "../../chapters/monsters/creature-units";

const EXPECTED_STARTER_ROLES: Record<string, string> = {
	"goblin-warrior": "archer",
	wolf: "skirmisher",
	skeleton: "undead-tide",
	"giant-rat": "skirmisher",
	zombie: "undead-tide",
	bandit: "archer",
	"black-bear": "brute",
	"brown-bear": "brute",
	"giant-spider": "lurker",
};

describe("creature combat roles (L11)", () => {
	it("registers the srd.creature.role family + eight values (incl. healer)", () => {
		const units = buildCreatureRoleTagValueUnits();
		expect(units.map((u) => u.tag)).toContain(COMBAT_ROLE_TAG_PREFIX);
		const classRow = units.find((u) => u.tag === COMBAT_ROLE_TAG_PREFIX);
		expect(classRow?.tag).toBe(COMBAT_ROLE_TAG_PREFIX);
		for (const role of [
			"skirmisher",
			"archer",
			"brute",
			"leader",
			"lurker",
			"undead-tide",
			"caster-boss",
			"healer",
		]) {
			expect(units.map((u) => u.tag)).toContain(combatRoleTag(role as "archer"));
		}
		for (const row of units.filter((u) => u.tag !== COMBAT_ROLE_TAG_PREFIX)) {
			expect(row.prefix).toBe(COMBAT_ROLE_TAG_PREFIX);
			expect(row.tag.startsWith(`${COMBAT_ROLE_TAG_PREFIX}.`)).toBe(true);
		}
		expect(buildCreatureTagValueUnits().some((u) => u.tag === COMBAT_ROLE_TAG_PREFIX)).toBe(true);
	});

	it("stamps exactly one role tag on every creature unit", () => {
		const units = buildCreatureUnits();
		expect(units.length).toBeGreaterThan(100);
		for (const unit of units) {
			const role = parseCombatRoleTag(unit.tags);
			expect(role, unit.slug).not.toBeNull();
			expect(unit.tags.filter((t) => t.startsWith(`${COMBAT_ROLE_TAG_PREFIX}.`)).length).toBe(1);
		}
	});

	it("assigns storyline §6 roles to named stock (starters + spider)", () => {
		const units = buildCreatureUnits();
		for (const [slug, expected] of Object.entries(EXPECTED_STARTER_ROLES)) {
			const unit = units.find((u) => u.slug === slug);
			expect(unit, slug).toBeDefined();
			if (unit === undefined) continue;
			expect(parseCombatRoleTag(unit.tags)).toBe(expected);
			expect(combatRoleForCreature(slug, unit.record)).toBe(expected);
		}
	});
});
