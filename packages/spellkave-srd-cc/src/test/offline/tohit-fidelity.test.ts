// sk-84i.4 (parent sk-84i; probe sk-84i.1 measured to-hit deltas vs open5e:
// wolf −2, zombie −2, bandit −3). Unit-level fidelity: the SEEDED creature
// stats (`monsters/creature-units.ts`'s `buildCreatureUnit`) plus the SRD
// formula terms (`playing-the-game/modifier-units.ts`'s
// `expectedAbilityModifier`/`expectedProficiencyBonus`, the SAME table
// lookups the shipped archetype's `PROFICIENCY_BONUS_STATE_ID` stat is baked
// from) reproduce open5e's own cached `to_hit_mod` for each creature's real
// attack — a test that fails if either the CR->Proficiency-Bonus derivation
// or an ability-score seed regresses.
//
// WOLF / ZOMBIE vs. BANDIT — TWO DIFFERENT ABILITY SHAPES:
//   - Wolf's Bite and Zombie's Slam are NOT finesse weapons (natural
//     attacks) — Strength is the only legal ability, and (cache-verified
//     below) Strength's modifier already meets-or-exceeds Dexterity's for
//     both, so the shared melee archetype selects Strength for them.
//   - Bandit's Scimitar IS a finesse weapon (real SRD property) with
//     DEX 12 (+1) > STR 11 (+0) — open5e's own `to_hit_mod` reflects the
//     finesse-selected ability. This case proves the FORMULA COMPONENTS
//     themselves (ability-mod
//     table + CR->Proficiency-Bonus table) reproduce the real number when
//     the SRD-correct ability (Dexterity) is supplied directly — the
//     fidelity claim this bead is actually responsible for.
import { describe, expect, it } from "vitest";

import { buildCreatureUnit } from "../../chapters/monsters/creature-units";
import {
	expectedAbilityModifier,
	PROFICIENCY_BONUS_STATE_ID,
} from "../../chapters/playing-the-game/modifier-units";
import {
	creatureActionAttackByParent,
	creatureActionsByParent,
	creatureByPk,
} from "../../open5e/creature";

interface FidelityCase {
	creaturePk: string;
	actionPk: string;
	abilityStateId: "srd/str" | "srd/dex";
}

const CASES: readonly FidelityCase[] = [
	{ creaturePk: "srd-2024_wolf", actionPk: "srd-2024_wolf_bite", abilityStateId: "srd/str" },
	{ creaturePk: "srd-2024_zombie", actionPk: "srd-2024_zombie_slam", abilityStateId: "srd/str" },
	{
		creaturePk: "srd-2024_bandit",
		actionPk: "srd-2024_bandit_scimitar",
		abilityStateId: "srd/dex",
	},
];

function stateValue(unit: ReturnType<typeof buildCreatureUnit>, stateId: string): number {
	const found = unit.initialStates.find((state) => state.state === stateId);
	if (found === undefined) {
		throw new Error(
			`tohit-fidelity: creature unit '${unit.entityId}' has no seeded state '${stateId}'.`,
		);
	}
	return found.valueInt;
}

describe("to-hit fidelity: seeded stats + SRD formula terms == open5e's real to_hit_mod (sk-84i.4)", () => {
	for (const { creaturePk, actionPk, abilityStateId } of CASES) {
		it(`${creaturePk}'s ${actionPk}: ability modifier + Proficiency Bonus == open5e to_hit_mod`, () => {
			const record = creatureByPk(creaturePk);
			const unit = buildCreatureUnit(record);

			const action = creatureActionsByParent(creaturePk).find(
				(candidate) => candidate.pk === actionPk,
			);
			expect(action).toBeDefined();
			const attack = creatureActionAttackByParent(action?.pk ?? "");
			expect(attack).toBeDefined();
			expect(attack?.toHitMod).not.toBeNull();

			const abilityScore = stateValue(unit, abilityStateId);
			const proficiencyBonus = stateValue(unit, PROFICIENCY_BONUS_STATE_ID);
			const computedToHit = expectedAbilityModifier(abilityScore) + proficiencyBonus;

			expect(computedToHit).toBe(attack?.toHitMod);
		});
	}

	it("wolf and zombie: Strength's modifier already meets-or-exceeds Dexterity's — the shipped Strength-only archetype wiring stays fidelity-correct for both (no finesse gap)", () => {
		for (const creaturePk of ["srd-2024_wolf", "srd-2024_zombie"]) {
			const record = creatureByPk(creaturePk);
			expect(expectedAbilityModifier(record.strength)).toBeGreaterThanOrEqual(
				expectedAbilityModifier(record.dexterity),
			);
		}
	});

	it("bandit: Dexterity's modifier exceeds Strength's, proving why a Finesse identity is mechanically relevant", () => {
		const record = creatureByPk("srd-2024_bandit");
		expect(expectedAbilityModifier(record.dexterity)).toBeGreaterThan(
			expectedAbilityModifier(record.strength),
		);
	});
});
