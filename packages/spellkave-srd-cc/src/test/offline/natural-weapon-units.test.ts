import { describe, expect, it } from "vitest";
import type { PlannedAttack } from "../../chapters/monsters/bestiary-plan";
import { naturalWeaponFromPlan } from "../../chapters/monsters/natural-weapon-units";

function attack(overrides: Partial<PlannedAttack> = {}): PlannedAttack {
	return {
		attackSlug: "bite",
		displayName: "Bite",
		toHitMod: 4,
		diceExpr: "1d6",
		damageBonus: 2,
		flatDamage: null,
		damageType: "piercing",
		melee: true,
		rangeFeet: null,
		sourcePk: "srd-2024_wolf_bite_bite-attack",
		droppedExtraDamage: false,
		hasRider: false,
		conditionRiders: [],
		...overrides,
	};
}

describe("naturalWeaponFromPlan identity", () => {
	it("is a short line without dice, ability mode, or source pk", () => {
		const unit = naturalWeaponFromPlan("wolf", "Wolf", "wolf-bite", attack(), "str");
		expect(unit.description).toBe("Wolf Bite — a natural melee weapon.");
		expect(unit.description).not.toContain(unit.diceExpr);
		expect(unit.description).not.toMatch(/\d+d\d+/);
		expect(unit.description).not.toContain("Source:");
		expect(unit.description).not.toContain(unit.entityId.replace("srd/natural-weapon/", ""));
		expect(unit.description).not.toContain("srd-2024_");
	});

	it("names ranged natural weapons as ranged", () => {
		const unit = naturalWeaponFromPlan(
			"sprite",
			"Sprite",
			"sprite-shortbow",
			attack({ melee: false, displayName: "Shortbow", rangeFeet: 40 }),
			"dex",
		);
		expect(unit.description).toBe("Sprite Shortbow — a natural ranged weapon.");
	});
});
