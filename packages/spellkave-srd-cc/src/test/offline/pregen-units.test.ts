import { CREATION_CLASS_ALLOWLIST } from "@spellkave/adventure-runtime/dm/creation";
import {
	abilityModifier,
	classCreationDataBySlug,
	level1Hp,
} from "@spellkave/adventure-runtime/dm/data";
import { createLocalAuthorTarget } from "@spellkave/tool-node/authoring";
import { describe, expect, it } from "vitest";
import { standardArrayForClass } from "../../chapters/character-creation/creation-tables-units";
import {
	baselineAcFromDex,
	classLevelResourceSeeds,
	PREGEN_FIGHTER_AC,
	PREGEN_FIGHTER_CON,
	PREGEN_FIGHTER_DEF_ID,
	PREGEN_FIGHTER_DEX,
	PREGEN_FIGHTER_HP,
	PREGEN_FIGHTER_HP_PER_LEVEL,
	PREGEN_FIGHTER_PROFICIENCY_BONUS,
	PREGEN_FIGHTER_STR,
	pregenConfirmInstanceCapabilities,
	pregenConfirmInstanceStates,
	speedWalkCellsForSpecies,
} from "../../chapters/character-creation/pregen-units";
import { SECOND_WIND_USES_INITIAL } from "../../chapters/classes/fighter-units";
import { expectedAbilityModifier } from "../../chapters/playing-the-game/modifier-units";
import { fixedHitPointsPerLevelForClass } from "../../markdown/character-creation";
import { FIXTURES_DIR } from "../../pipeline";

const TARGET = createLocalAuthorTarget(FIXTURES_DIR);

/** Frozen fighter confirm sheet (L5c pin) — must stay byte-identical. */
const FIGHTER_CONFIRM_BASELINE = pregenConfirmInstanceStates(
	"fighter",
	{ dex: PREGEN_FIGHTER_DEX },
	{ speciesSlug: "human", target: TARGET, level: 1 },
);

describe("srd/pregen/fighter", () => {
	it("uses the Fighter Standard Array and derived L1 numbers", () => {
		const fighter = standardArrayForClass("Fighter");
		expect(PREGEN_FIGHTER_DEF_ID).toBe("srd/pregen/fighter");
		expect(PREGEN_FIGHTER_STR).toBe(fighter.str);
		expect(PREGEN_FIGHTER_DEX).toBe(fighter.dex);
		expect(PREGEN_FIGHTER_CON).toBe(fighter.con);
		expect(PREGEN_FIGHTER_HP).toBe(10 + expectedAbilityModifier(fighter.con));
		expect(PREGEN_FIGHTER_AC).toBe(10 + expectedAbilityModifier(fighter.dex));
		expect(PREGEN_FIGHTER_HP_PER_LEVEL).toBe(fixedHitPointsPerLevelForClass("Fighter"));
	});

	it("confirm-time fighter sheet stays byte-identical (PB/XP/AC/Second Wind)", () => {
		const states = pregenConfirmInstanceStates(
			"fighter",
			{ dex: PREGEN_FIGHTER_DEX },
			{ speciesSlug: "human", target: TARGET },
		);
		expect(states).toEqual(FIGHTER_CONFIRM_BASELINE);
		expect(states.map((row) => row.state)).toEqual(
			expect.arrayContaining([
				"srd/proficiency_bonus",
				"srd/xp",
				"srd/hp_per_level",
				"srd/ac",
				"srd/speed-walk",
				"srd/fighter/second-wind-uses",
			]),
		);
		expect(states.find((row) => row.state === "srd/proficiency_bonus")?.value_int).toBe(
			PREGEN_FIGHTER_PROFICIENCY_BONUS,
		);
		expect(states.find((row) => row.state === "srd/ac")?.value_int).toBe(PREGEN_FIGHTER_AC);
		expect(states.find((row) => row.state === "srd/fighter/second-wind-uses")?.value_int).toBe(
			SECOND_WIND_USES_INITIAL,
		);
		expect(states.find((row) => row.state === "srd/speed-walk")?.value_int).toBe(
			speedWalkCellsForSpecies("human"),
		);
		// No fighter-only perception fallback on confirm.
		expect(pregenConfirmInstanceCapabilities("fighter")).toEqual([]);
	});
});

describe("pregenConfirmInstanceStates — all 12 classes", () => {
	const scores = { dex: 14, con: 14, str: 12, int: 10, wis: 10, cha: 10 };

	for (const classSlug of CREATION_CLASS_ALLOWLIST) {
		it(`confirm sheet for ${classSlug} does not throw and carries L1 sheet facts`, () => {
			const states = pregenConfirmInstanceStates(classSlug, scores, {
				speciesSlug: "human",
				target: TARGET,
				level: 1,
			});
			expect(states.find((row) => row.state === "srd/proficiency_bonus")?.value_int).toBe(2);
			expect(states.find((row) => row.state === "srd/xp")?.value_int).toBe(0);
			expect(states.find((row) => row.state === "srd/hp_per_level")?.value_int).toBe(
				fixedHitPointsPerLevelForClass(classCreationDataBySlug(classSlug).displayName),
			);
			expect(states.find((row) => row.state === "srd/ac")?.value_int).toBe(baselineAcFromDex(14));
			expect(states.find((row) => row.state === "srd/speed-walk")?.value_int).toBe(
				speedWalkCellsForSpecies("human"),
			);
			// level1Hp is written by completeness separately; resources must be finite.
			expect(level1Hp(classSlug, abilityModifier(scores.con))).toBeGreaterThan(0);
			const resources = classLevelResourceSeeds(classSlug, { target: TARGET, level: 1 });
			for (const row of resources) {
				expect(row.value_int, row.state).toBeGreaterThanOrEqual(0);
				expect(states.map((s) => s.state)).toContain(row.state);
			}
		});
	}

	it("goliath speed is 7 cells (35 ft)", () => {
		expect(speedWalkCellsForSpecies("goliath")).toBe(7);
		const states = pregenConfirmInstanceStates("fighter", scores, {
			speciesSlug: "goliath",
			target: TARGET,
		});
		expect(states.find((row) => row.state === "srd/speed-walk")?.value_int).toBe(7);
	});
});
