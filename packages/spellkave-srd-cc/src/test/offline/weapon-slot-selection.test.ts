import { describe, expect, it } from "vitest";
import { COMBAT_ARENA_COMBATANT_CALLS } from "../../chapters/playing-the-game/proof-scene/calls/combat-arena";
import {
	sneakAttackOfferPredicate,
	sneakAttackRangedOfferPredicate,
	sneakAttackRangePredicate,
	sneakAttackWeaponGateExpr,
} from "../../chapters/playing-the-game/sneak-attack-units";
import {
	attackAbilityScoreExpr,
	meleeDamageDeltaExpr,
	opportunityAttackRangePredicate,
	rangedDamageDeltaExpr,
	sneakAttackBonusExpr,
	weaponAttackRangePredicate,
} from "../../chapters/playing-the-game/weapon-attack-units";
import { masteryTagPredicate } from "../../chapters/playing-the-game/weapon-mastery-riders-units";

// sk-jay0.2.8 / ADR-0126: unrelated lower-ID armor must not select weapon facts.
// This pins generator selection, not live damage/XP or public acceptance.
describe("one authored weapon slot across attack consumers", () => {
	it("seeds the arena in the ruleset slot without redefining it", () => {
		const calls = COMBAT_ARENA_COMBATANT_CALLS;
		const serialized = JSON.stringify(calls);
		expect(serialized).toContain("srd/slot/main-hand");
		expect(calls.some((call) => call.label === "proof-arena-main-hand-slot")).toBe(false);
		for (const call of calls) {
			const rows = (call.params as { rows?: Array<{ slot_id?: string }> }).rows ?? [];
			for (const row of rows.filter((row) => row.slot_id !== undefined)) {
				expect(["srd/slot/main-hand", "srd/slot/chest"]).toContain(row.slot_id);
			}
		}
	});
	const subject = "actor.equipped_item('srd/slot/main-hand')";
	const expressions = {
		meleeGate: weaponAttackRangePredicate("melee"),
		rangedGate: weaponAttackRangePredicate("ranged"),
		opportunityReach: opportunityAttackRangePredicate(),
		finesse: attackAbilityScoreExpr("actor.effective('srd/str')", "actor.effective('srd/dex')"),
		meleeDamage: meleeDamageDeltaExpr(),
		rangedDamage: rangedDamageDeltaExpr(),
		sneakDamage: sneakAttackBonusExpr(),
		mastery: masteryTagPredicate("srd.weapon.mastery.sap"),
		sneakWeapon: sneakAttackWeaponGateExpr(),
		sneakRange: sneakAttackRangePredicate(),
		sneakMeleeOffer: sneakAttackOfferPredicate(),
		sneakRangedOffer: sneakAttackRangedOfferPredicate(),
	};
	for (const [consumer, expression] of Object.entries(expressions)) {
		it(`${consumer} reads the authored main-hand item`, () => {
			expect(expression).toContain(subject);
			expect(expression).not.toContain("actor.wielded_item");
		});
	}
});
