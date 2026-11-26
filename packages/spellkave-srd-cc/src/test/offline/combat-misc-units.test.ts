// Combat misc bundle offline proof: Unseen Attackers and Targets, Ranged
// Attacks, Melee Attacks, Mounted Combat, Underwater Combat — pinned against
// the cached SRD text, plus the one real composed idiom in this bundle
// (`mountedFallingOffSaveExpr`). Every unit's real deliverable is the
// reconciliation/#23-addendum verdict recorded in combat-misc-units.ts's own
// module header — this test grounds the verdict's quoted text.
import { describe, expect, it } from "vitest";
import {
	MELEE_REACH_METERS,
	MOUNTED_FALLING_OFF_DC,
	meleeAttacksSubSections,
	mountedCombatSubSections,
	mountedFallingOffSaveExpr,
	rangedAttacksSubSections,
	underwaterCombatSubSections,
	unseenAttackersText,
} from "../../chapters/playing-the-game/combat-misc-units";
import {
	d20TestExpr,
	guaranteedFailureDc,
	guaranteedSuccessDc,
} from "../../chapters/playing-the-game/d20-units";

describe("Unseen Attackers and Targets", () => {
	it("grants Disadvantage against an unseen target and Advantage when unseen yourself", () => {
		const text = unseenAttackersText();
		expect(text).toMatch(/you have Disadvantage on the roll/);
		expect(text).toMatch(/you have Advantage on attack rolls against it/);
	});
});

describe("Ranged Attacks", () => {
	it("parses Range and Ranged Attacks in Close Combat, in SRD order", () => {
		const sections = rangedAttacksSubSections();
		expect(sections.map((s) => s.heading)).toEqual(["Range", "Ranged Attacks in Close Combat"]);
	});

	it("Range: single-range hard cutoff, two-range normal/long split with Disadvantage between them", () => {
		const range = rangedAttacksSubSections().find((s) => s.heading === "Range");
		expect(range?.text).toMatch(/can.t attack a target beyond this range/);
		expect(range?.text).toMatch(/Disadvantage when your target is beyond normal range/);
		expect(range?.text).toMatch(/can.t attack a target beyond long range/);
	});

	it("Ranged Attacks in Close Combat: Disadvantage within 5 feet of a seeing, non-Incapacitated enemy", () => {
		const close = rangedAttacksSubSections().find(
			(s) => s.heading === "Ranged Attacks in Close Combat",
		);
		expect(close?.text).toMatch(/Disadvantage on the roll if you are within 5 feet/);
		expect(close?.text).toMatch(/Incapacitated/);
	});
});

describe("Melee Attacks", () => {
	it("parses Reach and Opportunity Attacks, in SRD order", () => {
		const sections = meleeAttacksSubSections();
		expect(sections.map((s) => s.heading)).toEqual(["Reach", "Opportunity Attacks"]);
	});

	it("Reach: 5-foot reach, matches the already-shipped MELEE_REACH_METERS constant", () => {
		const reach = meleeAttacksSubSections().find((s) => s.heading === "Reach");
		expect(reach?.text).toMatch(/5-foot reach/);
		// 5 ft in metres, same constant attack-melee.toml's own range_m authors.
		expect(MELEE_REACH_METERS).toBeCloseTo(1.524, 3);
	});

	it("Opportunity Attacks: a Reaction, triggered by leaving reach, countered by Disengage", () => {
		const oa = meleeAttacksSubSections().find((s) => s.heading === "Opportunity Attacks");
		expect(oa?.text).toMatch(/take a Reaction to make one melee attack/);
		expect(oa?.text).toMatch(/Disengage action/);
	});
});

describe("Mounted Combat", () => {
	it("parses Mounting and Dismounting, Controlling a Mount, Falling Off, in SRD order", () => {
		const sections = mountedCombatSubSections();
		expect(sections.map((s) => s.heading)).toEqual([
			"Mounting and Dismounting",
			"Controlling a Mount",
			"Falling Off",
		]);
	});

	it("Falling Off: DC 10 Dexterity saving throw, matches MOUNTED_FALLING_OFF_DC", () => {
		const fallingOff = mountedCombatSubSections().find((s) => s.heading === "Falling Off");
		expect(fallingOff?.text).toMatch(/DC 10 Dexterity saving throw/);
		expect(MOUNTED_FALLING_OFF_DC).toBe(10);
	});

	it("mountedFallingOffSaveExpr composes d20TestExpr at the DC-10 boundary (matches d20-units.ts's own boundary-DC helpers)", () => {
		const dexExpr = "actor.stat('srd/dex')";
		expect(mountedFallingOffSaveExpr(dexExpr)).toBe(d20TestExpr({ scoreExpr: dexExpr, dc: 10 }));
		// A modifier of +0 straddles DC 10 exactly at the midpoint of the
		// boundary-DC helpers' own domain — a sanity check that 10 sits
		// strictly between the guaranteed extremes for a middling creature.
		expect(guaranteedSuccessDc(0)).toBeLessThan(MOUNTED_FALLING_OFF_DC);
		expect(guaranteedFailureDc(0)).toBeGreaterThan(MOUNTED_FALLING_OFF_DC);
	});
});

describe("Underwater Combat", () => {
	it("parses Impeded Weapons and Fire Resistance, in SRD order", () => {
		const sections = underwaterCombatSubSections();
		expect(sections.map((s) => s.heading)).toEqual(["Impeded Weapons", "Fire Resistance"]);
	});

	it("Impeded Weapons: non-Piercing melee Disadvantage without a Swim Speed; ranged auto-miss/Disadvantage", () => {
		const impeded = underwaterCombatSubSections().find((s) => s.heading === "Impeded Weapons");
		expect(impeded?.text).toMatch(/lacks a Swim Speed has Disadvantage/);
		expect(impeded?.text).toMatch(/unless the weapon deals Piercing damage/);
		expect(impeded?.text).toMatch(/automatically misses a target beyond the weapon.s normal range/);
	});

	it("Fire Resistance: a cross-reference to Damage and Healing, not duplicated here", () => {
		const fire = underwaterCombatSubSections().find((s) => s.heading === "Fire Resistance");
		expect(fire?.text).toMatch(/Resistance to Fire damage/);
		expect(fire?.text).toMatch(/Damage and Healing/);
	});
});
