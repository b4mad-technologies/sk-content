// Resource identity rows and tags read through the author-facing query tool.
import { describe, expect, it } from "vitest";

import { ASI_POINTS_RESOURCE_ID } from "../../../chapters/feats/asi-units";
import { BUNDLE_ID } from "../../../chapters/playing-the-game/index";
import { REACH_RESOURCE_ID } from "../../../chapters/playing-the-game/reach-units";
import { SPELL_SLOT_LEVELS, spellSlotResourceId } from "../../../chapters/spells/spell-slots";
import {
	ABILITY_RESOURCE_BOUNDS,
	ABILITY_TAG,
	AC_RESOURCE_BOUNDS,
	ACTION_SURGE_USES_RESOURCE_BOUNDS,
	expectedAbilityIdentities,
	expectedAcIdentity,
	expectedActionSurgeUsesIdentity,
	expectedCasterFeatureResourceIds,
	expectedGenericCheckDcIdentities,
	expectedGenericCheckDcMaxBound,
	expectedHeroicInspirationIdentity,
	expectedHitDieIdentity,
	expectedHpIdentity,
	expectedHpPerLevelIdentity,
	expectedLevelIdentity,
	expectedProficiencyBonusIdentity,
	expectedSecondWindUsesIdentity,
	expectedSizeIdentity,
	expectedSpeedClimbIdentity,
	expectedSpeedFlyIdentity,
	expectedSpeedSwimIdentity,
	expectedSpeedWalkIdentity,
	expectedTempHpIdentity,
	expectedXpIdentity,
	expectedXpValueIdentity,
	GENERIC_CHECK_DC_RESOURCE_BOUNDS,
	GENERIC_CHECK_DC_TAG,
	HEROIC_INSPIRATION_RESOURCE_BOUNDS,
	HIT_DIE_RESOURCE_BOUNDS,
	HP_PER_LEVEL_RESOURCE_BOUNDS,
	HP_RESOURCE_BOUNDS,
	LEVEL_RESOURCE_BOUNDS,
	PROFICIENCY_BONUS_RESOURCE_BOUNDS,
	SECOND_WIND_USES_RESOURCE_BOUNDS,
	SIZE_RESOURCE_BOUNDS,
	TEMP_HP_RESOURCE_BOUNDS,
	XP_RESOURCE_BOUNDS,
	XP_VALUE_RESOURCE_BOUNDS,
} from "../../shared/identity-expectations";
import {
	buildTools,
	type QueryDetailResult,
	type QueryListResult,
	query,
	splitTagCompositeId,
} from "./harness";

describe("fixtures/ resource identities read through spellkave_query", () => {
	it("kind=resource_definitions lists the identity resources, DC overrides, AC, and Heroic Inspiration", async () => {
		const tools = buildTools();
		const list = (await query(tools, {
			kind: "resource_definitions",
			bundle: BUNDLE_ID,
		})) as QueryListResult;
		expect(list.shape).toBe("list");
		const expected = [
			...expectedAbilityIdentities().map((a) => a.resourceDefinitionId),
			expectedLevelIdentity().resourceDefinitionId,
			// sk-84i.4: srd/proficiency_bonus — the baked-per-entity Proficiency
			// Bonus STAT (`modifier-units.ts`'s own `PROFICIENCY_BONUS_STATE_ID`
			// doc comment), shipped in the SAME fragment as srd/level.
			expectedProficiencyBonusIdentity().resourceDefinitionId,
			expectedHpIdentity().resourceDefinitionId,
			expectedTempHpIdentity().resourceDefinitionId,
			expectedHeroicInspirationIdentity().resourceDefinitionId,
			...expectedGenericCheckDcIdentities().map((d) => d.resourceDefinitionId),
			expectedAcIdentity().resourceDefinitionId,
			REACH_RESOURCE_ID,
			expectedSpeedWalkIdentity().resourceDefinitionId,
			// ADR-0101 task 6.1: srd/speed-swim + srd/speed-fly (fragments/grid.ts).
			expectedSpeedSwimIdentity().resourceDefinitionId,
			expectedSpeedClimbIdentity().resourceDefinitionId,
			expectedSpeedFlyIdentity().resourceDefinitionId,
			expectedXpIdentity().resourceDefinitionId,
			expectedHpPerLevelIdentity().resourceDefinitionId,
			// Level-up DM arc S1: srd/xp_value — an actor-carried XP-worth fact
			// (advancement-units.ts's own Building Block 5).
			expectedXpValueIdentity().resourceDefinitionId,
			// O2 (Character Origins Species): srd/size — authored by
			// character-origins/species-units.ts, not this playing-the-game
			// chapter, but scoped by bundle_id here too (species-units.ts's own
			// module header).
			expectedSizeIdentity().resourceDefinitionId,
			// K1 (Classes): srd/hit-die — authored by classes/classes-units.ts,
			// scoped by bundle_id here too (classes-units.ts's own module header).
			expectedHitDieIdentity().resourceDefinitionId,
			// K2 (Classes, Fighter vertical): srd/fighter/second-wind-uses —
			// authored by classes/fighter-units.ts (Second Wind mechanized LIVE).
			expectedSecondWindUsesIdentity().resourceDefinitionId,
			// K2 (Classes, Fighter vertical, D10 rework): srd/fighter/action-
			// surge-uses — Action Surge mechanized LIVE alongside Second Wind.
			expectedActionSurgeUsesIdentity().resourceDefinitionId,
			// Martial L1-4: Rage uses + Focus Points + Sneak Attack dice + Martial Arts die.
			"srd/barbarian/rage-uses",
			"srd/monk/focus-points",
			// L3 caster non-spellcasting features (docs/caster-features-l1-4.md).
			...expectedCasterFeatureResourceIds(),
			// Origins L4: ASI spend counter.
			ASI_POINTS_RESOURCE_ID,
			// L12e: Dragonborn breath weapon uses.
			"srd/dragonborn/breath-weapon-uses",
			// L12b2: Orc Relentless Endurance uses.
			"srd/orc/relentless-endurance-uses",
			"srd/monk/martial-arts-die-sides",
			"srd/rogue/sneak-attack-dice",
			// P1b (Spells): srd/spell_slot_1 + srd/spell_slot_2 — the shared
			// casting axis (spell-slots.ts) P1b's leveled spells gate/debit on.
			...SPELL_SLOT_LEVELS.map((level) => spellSlotResourceId(level)),
			// L12d: derived spell attack/DC casting modifier.
			"srd/spellcasting_mod",
			// sk-609b.13 curated magic-item charge pools.
			"srd/magic_item/wand-of-magic-missiles/charges",
			"srd/magic_item/wand-of-fireballs/charges",
			// sk-609b.18 death-save clock.
			"srd/death_save_successes",
			"srd/death_save_failures",
			"srd/death_save_last_roll",
			// Hit Point Dice (sk-jay0.1.55.60.3, fragments/rest.ts).
			"srd/hit-dice-spent",
			"srd/hit-die-heal",
			"srd/cost_cp",
			"srd/weight_lb10",
			"srd/armor_ac_base",
			"srd/armor_dex_cap",
			"srd/armor_str_required",
			"srd/armor_stealth_disadvantage",
		];
		expect(list.items.map((i) => i.id).sort()).toEqual([...expected].sort());
		for (const item of list.items) expect(item.bundle_id).toBe(BUNDLE_ID);
	});

	it("kind+id detail carries the full srd/ac identity row (Equipment slice E1)", async () => {
		const tools = buildTools();
		const ac = expectedAcIdentity();
		const detail = (await query(tools, {
			kind: "resource_definitions",
			id: ac.resourceDefinitionId,
			refs: "none",
		})) as QueryDetailResult;
		expect(detail.found, `expected ${ac.resourceDefinitionId} to be found`).toBe(true);
		const row = detail.row as Record<string, unknown>;
		expect(row.resource_definition_id).toBe(ac.resourceDefinitionId);
		expect(row.bundle_id).toBe(BUNDLE_ID);
		expect(Number(row.min_value)).toBe(AC_RESOURCE_BOUNDS.min);
		expect(Number(row.max_value)).toBe(AC_RESOURCE_BOUNDS.max);
		expect(Number(row.initial_value)).toBe(AC_RESOURCE_BOUNDS.initial);
		expect(row.recovery_rule).toBe(AC_RESOURCE_BOUNDS.recoveryRule);
	});

	it("kind+id detail carries the full srd/level identity row", async () => {
		const tools = buildTools();
		const level = expectedLevelIdentity();
		const detail = (await query(tools, {
			kind: "resource_definitions",
			id: level.resourceDefinitionId,
			refs: "none",
		})) as QueryDetailResult;
		expect(detail.found, `expected ${level.resourceDefinitionId} to be found`).toBe(true);
		const row = detail.row as Record<string, unknown>;
		expect(row.resource_definition_id).toBe(level.resourceDefinitionId);
		expect(row.bundle_id).toBe(BUNDLE_ID);
		expect(Number(row.min_value)).toBe(LEVEL_RESOURCE_BOUNDS.min);
		expect(Number(row.max_value)).toBe(LEVEL_RESOURCE_BOUNDS.max);
		expect(Number(row.initial_value)).toBe(LEVEL_RESOURCE_BOUNDS.initial);
		expect(row.recovery_rule).toBe(LEVEL_RESOURCE_BOUNDS.recoveryRule);
	});

	it("kind+id detail carries the full srd/hp identity row", async () => {
		const tools = buildTools();
		const hp = expectedHpIdentity();
		const detail = (await query(tools, {
			kind: "resource_definitions",
			id: hp.resourceDefinitionId,
			refs: "none",
		})) as QueryDetailResult;
		expect(detail.found, `expected ${hp.resourceDefinitionId} to be found`).toBe(true);
		const row = detail.row as Record<string, unknown>;
		expect(row.resource_definition_id).toBe(hp.resourceDefinitionId);
		expect(row.bundle_id).toBe(BUNDLE_ID);
		expect(Number(row.min_value)).toBe(HP_RESOURCE_BOUNDS.min);
		expect(Number(row.max_value)).toBe(HP_RESOURCE_BOUNDS.max);
		expect(Number(row.initial_value)).toBe(HP_RESOURCE_BOUNDS.initial);
		expect(row.recovery_rule).toBe(HP_RESOURCE_BOUNDS.recoveryRule);
	});

	it("kind+id detail carries the full srd/temp_hp identity row", async () => {
		const tools = buildTools();
		const tempHp = expectedTempHpIdentity();
		const detail = (await query(tools, {
			kind: "resource_definitions",
			id: tempHp.resourceDefinitionId,
			refs: "none",
		})) as QueryDetailResult;
		expect(detail.found, `expected ${tempHp.resourceDefinitionId} to be found`).toBe(true);
		const row = detail.row as Record<string, unknown>;
		expect(row.resource_definition_id).toBe(tempHp.resourceDefinitionId);
		expect(row.bundle_id).toBe(BUNDLE_ID);
		expect(Number(row.min_value)).toBe(TEMP_HP_RESOURCE_BOUNDS.min);
		expect(Number(row.max_value)).toBe(TEMP_HP_RESOURCE_BOUNDS.max);
		expect(Number(row.initial_value)).toBe(TEMP_HP_RESOURCE_BOUNDS.initial);
		expect(row.recovery_rule).toBe(TEMP_HP_RESOURCE_BOUNDS.recoveryRule);
	});

	it("kind+id detail carries the full srd/xp identity row (C4)", async () => {
		const tools = buildTools();
		const xp = expectedXpIdentity();
		const detail = (await query(tools, {
			kind: "resource_definitions",
			id: xp.resourceDefinitionId,
			refs: "none",
		})) as QueryDetailResult;
		expect(detail.found, `expected ${xp.resourceDefinitionId} to be found`).toBe(true);
		const row = detail.row as Record<string, unknown>;
		expect(row.resource_definition_id).toBe(xp.resourceDefinitionId);
		expect(row.bundle_id).toBe(BUNDLE_ID);
		expect(Number(row.min_value)).toBe(XP_RESOURCE_BOUNDS.min);
		expect(Number(row.max_value)).toBe(XP_RESOURCE_BOUNDS.max);
		expect(Number(row.initial_value)).toBe(XP_RESOURCE_BOUNDS.initial);
		expect(row.recovery_rule).toBe(XP_RESOURCE_BOUNDS.recoveryRule);
	});

	it("kind+id detail carries the full srd/hp_per_level identity row (C4)", async () => {
		const tools = buildTools();
		const hpPerLevel = expectedHpPerLevelIdentity();
		const detail = (await query(tools, {
			kind: "resource_definitions",
			id: hpPerLevel.resourceDefinitionId,
			refs: "none",
		})) as QueryDetailResult;
		expect(detail.found, `expected ${hpPerLevel.resourceDefinitionId} to be found`).toBe(true);
		const row = detail.row as Record<string, unknown>;
		expect(row.resource_definition_id).toBe(hpPerLevel.resourceDefinitionId);
		expect(row.bundle_id).toBe(BUNDLE_ID);
		expect(Number(row.min_value)).toBe(HP_PER_LEVEL_RESOURCE_BOUNDS.min);
		expect(Number(row.max_value)).toBe(HP_PER_LEVEL_RESOURCE_BOUNDS.max);
		expect(Number(row.initial_value)).toBe(HP_PER_LEVEL_RESOURCE_BOUNDS.initial);
		expect(row.recovery_rule).toBe(HP_PER_LEVEL_RESOURCE_BOUNDS.recoveryRule);
	});

	it("kind+id detail carries the full srd/xp_value identity row (level-up DM arc S1)", async () => {
		const tools = buildTools();
		const xpValue = expectedXpValueIdentity();
		const detail = (await query(tools, {
			kind: "resource_definitions",
			id: xpValue.resourceDefinitionId,
			refs: "none",
		})) as QueryDetailResult;
		expect(detail.found, `expected ${xpValue.resourceDefinitionId} to be found`).toBe(true);
		const row = detail.row as Record<string, unknown>;
		expect(row.resource_definition_id).toBe(xpValue.resourceDefinitionId);
		expect(row.bundle_id).toBe(BUNDLE_ID);
		expect(Number(row.min_value)).toBe(XP_VALUE_RESOURCE_BOUNDS.min);
		expect(Number(row.max_value)).toBe(XP_VALUE_RESOURCE_BOUNDS.max);
		expect(Number(row.initial_value)).toBe(XP_VALUE_RESOURCE_BOUNDS.initial);
		expect(row.recovery_rule).toBe(XP_VALUE_RESOURCE_BOUNDS.recoveryRule);
	});

	it("kind+id detail carries the full srd/size identity row (O2, Character Origins Species)", async () => {
		const tools = buildTools();
		const size = expectedSizeIdentity();
		const detail = (await query(tools, {
			kind: "resource_definitions",
			id: size.resourceDefinitionId,
			refs: "none",
		})) as QueryDetailResult;
		expect(detail.found, `expected ${size.resourceDefinitionId} to be found`).toBe(true);
		const row = detail.row as Record<string, unknown>;
		expect(row.resource_definition_id).toBe(size.resourceDefinitionId);
		expect(row.bundle_id).toBe(BUNDLE_ID);
		expect(Number(row.min_value)).toBe(SIZE_RESOURCE_BOUNDS.min);
		expect(Number(row.max_value)).toBe(SIZE_RESOURCE_BOUNDS.max);
		expect(Number(row.initial_value)).toBe(SIZE_RESOURCE_BOUNDS.initial);
		expect(row.recovery_rule).toBe(SIZE_RESOURCE_BOUNDS.recoveryRule);
	});

	it("kind+id detail carries the full srd/hit-die identity row (K1, Classes)", async () => {
		const tools = buildTools();
		const hitDie = expectedHitDieIdentity();
		const detail = (await query(tools, {
			kind: "resource_definitions",
			id: hitDie.resourceDefinitionId,
			refs: "none",
		})) as QueryDetailResult;
		expect(detail.found, `expected ${hitDie.resourceDefinitionId} to be found`).toBe(true);
		const row = detail.row as Record<string, unknown>;
		expect(row.resource_definition_id).toBe(hitDie.resourceDefinitionId);
		expect(row.bundle_id).toBe(BUNDLE_ID);
		expect(Number(row.min_value)).toBe(HIT_DIE_RESOURCE_BOUNDS.min);
		expect(Number(row.max_value)).toBe(HIT_DIE_RESOURCE_BOUNDS.max);
		expect(Number(row.initial_value)).toBe(HIT_DIE_RESOURCE_BOUNDS.initial);
		expect(row.recovery_rule).toBe(HIT_DIE_RESOURCE_BOUNDS.recoveryRule);
	});

	it("kind+id detail carries the full srd/fighter/second-wind-uses identity row (K2, Classes Fighter vertical)", async () => {
		const tools = buildTools();
		const secondWindUses = expectedSecondWindUsesIdentity();
		const detail = (await query(tools, {
			kind: "resource_definitions",
			id: secondWindUses.resourceDefinitionId,
			refs: "none",
		})) as QueryDetailResult;
		expect(detail.found, `expected ${secondWindUses.resourceDefinitionId} to be found`).toBe(true);
		const row = detail.row as Record<string, unknown>;
		expect(row.resource_definition_id).toBe(secondWindUses.resourceDefinitionId);
		expect(row.bundle_id).toBe(BUNDLE_ID);
		expect(Number(row.min_value)).toBe(SECOND_WIND_USES_RESOURCE_BOUNDS.min);
		expect(Number(row.max_value)).toBe(SECOND_WIND_USES_RESOURCE_BOUNDS.max);
		expect(Number(row.initial_value)).toBe(SECOND_WIND_USES_RESOURCE_BOUNDS.initial);
		expect(row.recovery_rule).toBe(SECOND_WIND_USES_RESOURCE_BOUNDS.recoveryRule);
	});

	it("kind+id detail carries the full srd/fighter/action-surge-uses identity row (K2, Classes Fighter vertical, D10 rework)", async () => {
		const tools = buildTools();
		const actionSurgeUses = expectedActionSurgeUsesIdentity();
		const detail = (await query(tools, {
			kind: "resource_definitions",
			id: actionSurgeUses.resourceDefinitionId,
			refs: "none",
		})) as QueryDetailResult;
		expect(detail.found, `expected ${actionSurgeUses.resourceDefinitionId} to be found`).toBe(true);
		const row = detail.row as Record<string, unknown>;
		expect(row.resource_definition_id).toBe(actionSurgeUses.resourceDefinitionId);
		expect(row.bundle_id).toBe(BUNDLE_ID);
		expect(Number(row.min_value)).toBe(ACTION_SURGE_USES_RESOURCE_BOUNDS.min);
		expect(Number(row.max_value)).toBe(ACTION_SURGE_USES_RESOURCE_BOUNDS.max);
		expect(Number(row.initial_value)).toBe(ACTION_SURGE_USES_RESOURCE_BOUNDS.initial);
		expect(row.recovery_rule).toBe(ACTION_SURGE_USES_RESOURCE_BOUNDS.recoveryRule);
	});

	// sk-content: needs the held SRD flavor texts (PROVENANCE.md).
	it.skip("kind+id detail carries the binary Heroic Inspiration identity row", async () => {
		const tools = buildTools();
		const inspiration = expectedHeroicInspirationIdentity();
		const detail = (await query(tools, {
			kind: "resource_definitions",
			id: inspiration.resourceDefinitionId,
			refs: "none",
		})) as QueryDetailResult;
		expect(detail.found, `expected ${inspiration.resourceDefinitionId} to be found`).toBe(true);
		const row = detail.row as Record<string, unknown>;
		expect(row.resource_definition_id).toBe(inspiration.resourceDefinitionId);
		expect(row.bundle_id).toBe(BUNDLE_ID);
		expect(Number(row.min_value)).toBe(HEROIC_INSPIRATION_RESOURCE_BOUNDS.min);
		expect(Number(row.max_value)).toBe(HEROIC_INSPIRATION_RESOURCE_BOUNDS.max);
		expect(Number(row.initial_value)).toBe(HEROIC_INSPIRATION_RESOURCE_BOUNDS.initial);
		expect(row.recovery_rule).toBe(HEROIC_INSPIRATION_RESOURCE_BOUNDS.recoveryRule);
		expect(String(row.description).trim().length).toBeGreaterThan(0);
		expect(String(row.description)).not.toContain("SRD:");
		// from packages/spellkave-srd-cc/src/test/live-preseeded/mechanics/identity.test.ts:403
		expect(String(row.description)).toContain("reroll a die");
	});

	it("kind+id detail carries the full srd/proficiency_bonus identity row", async () => {
		const tools = buildTools();
		const pb = expectedProficiencyBonusIdentity();
		const detail = (await query(tools, {
			kind: "resource_definitions",
			id: pb.resourceDefinitionId,
			refs: "none",
		})) as QueryDetailResult;
		expect(detail.found, `expected ${pb.resourceDefinitionId} to be found`).toBe(true);
		const row = detail.row as Record<string, unknown>;
		expect(row.bundle_id).toBe(BUNDLE_ID);
		// from packages/spellkave-srd-cc/src/test/live-preseeded/mechanics/identity.test.ts:354-366
		expect(Number(row.min_value)).toBe(PROFICIENCY_BONUS_RESOURCE_BOUNDS.min);
		expect(Number(row.max_value)).toBe(PROFICIENCY_BONUS_RESOURCE_BOUNDS.max);
		expect(Number(row.initial_value)).toBe(PROFICIENCY_BONUS_RESOURCE_BOUNDS.initial);
		expect(row.recovery_rule).toBe(PROFICIENCY_BONUS_RESOURCE_BOUNDS.recoveryRule);
	});

	it("kind+id detail carries the full DC override row for every generic-check DC resource", async () => {
		const tools = buildTools();
		const dcs = expectedGenericCheckDcIdentities();
		expect(dcs.length).toBeGreaterThan(0);
		for (const dc of dcs) {
			const detail = (await query(tools, {
				kind: "resource_definitions",
				id: dc.resourceDefinitionId,
				refs: "none",
			})) as QueryDetailResult;
			expect(detail.found, `expected ${dc.resourceDefinitionId} to be found`).toBe(true);
			const row = detail.row as Record<string, unknown>;
			expect(row.bundle_id).toBe(BUNDLE_ID);
			// from packages/spellkave-srd-cc/src/test/live-preseeded/mechanics/identity.test.ts:330-336
			expect(Number(row.min_value)).toBe(GENERIC_CHECK_DC_RESOURCE_BOUNDS.min);
			expect(Number(row.max_value)).toBe(expectedGenericCheckDcMaxBound());
			expect(Number(row.initial_value)).toBe(GENERIC_CHECK_DC_RESOURCE_BOUNDS.initial);
			expect(row.recovery_rule).toBe(GENERIC_CHECK_DC_RESOURCE_BOUNDS.recoveryRule);
			expect(String(row.description).trim().length).toBeGreaterThan(0);
		}
	});

	it("kind+id detail carries the full ability identity row for every ability", async () => {
		const tools = buildTools();
		for (const ability of expectedAbilityIdentities()) {
			const detail = (await query(tools, {
				kind: "resource_definitions",
				id: ability.resourceDefinitionId,
				refs: "none",
			})) as QueryDetailResult;
			expect(detail.found, `expected ${ability.resourceDefinitionId} to be found`).toBe(true);
			expect(detail.source).toBe("local");
			const row = detail.row as Record<string, unknown>;
			expect(row.resource_definition_id).toBe(ability.resourceDefinitionId);
			expect(row.bundle_id).toBe(BUNDLE_ID);
			expect(Number(row.min_value)).toBe(ABILITY_RESOURCE_BOUNDS.min);
			expect(Number(row.max_value)).toBe(ABILITY_RESOURCE_BOUNDS.max);
			expect(Number(row.initial_value)).toBe(ABILITY_RESOURCE_BOUNDS.initial);
			expect(row.recovery_rule).toBe(ABILITY_RESOURCE_BOUNDS.recoveryRule);
			expect(String(row.description).trim().length).toBeGreaterThan(0);
			expect(String(row.display_name).length).toBeGreaterThan(0);
		}
	});

	it("resource_definition_tag classifies every ability and generic-check DC resource", async () => {
		const tools = buildTools();
		const list = (await query(tools, {
			kind: "resource_definition_tag",
			bundle: BUNDLE_ID,
		})) as QueryListResult;
		expect(list.shape).toBe("list");

		const tagsByResource = new Map<string, Set<string>>();
		for (const item of list.items) {
			const { parentId, tag } = splitTagCompositeId(item.id);
			const set = tagsByResource.get(parentId) ?? new Set<string>();
			set.add(tag);
			tagsByResource.set(parentId, set);
		}
		const abilities = expectedAbilityIdentities();
		for (const ability of abilities) {
			expect(tagsByResource.get(ability.resourceDefinitionId)).toEqual(new Set([ABILITY_TAG]));
		}
		const genericCheckDcs = expectedGenericCheckDcIdentities();
		for (const dc of genericCheckDcs) {
			expect(tagsByResource.get(dc.resourceDefinitionId)).toEqual(new Set([GENERIC_CHECK_DC_TAG]));
		}
		// +2: curated magic-item charge pools tagged srd.magic_item.charges (sk-609b.13).
		expect(tagsByResource.size).toBe(abilities.length + genericCheckDcs.length + 2);
	});

	it("kind+id detail resolves ONE resource_definition_tag row by its '::'-joined composite id", async () => {
		const tools = buildTools();
		const ability = expectedAbilityIdentities()[0];
		if (ability === undefined) throw new Error("expected at least one ability identity");
		const detail = (await query(tools, {
			kind: "resource_definition_tag",
			id: `${ability.resourceDefinitionId}::${ABILITY_TAG}`,
			refs: "none",
		})) as QueryDetailResult;
		expect(detail.found).toBe(true);
		expect(detail.source).toBe("local");
		const row = detail.row as Record<string, unknown>;
		expect(row.resource_definition_id).toBe(ability.resourceDefinitionId);
		expect(row.tag).toBe(ABILITY_TAG);
		expect(row.bundle_id).toBe(BUNDLE_ID);
	});

	it("a made-up id under a real kind is reported not-found, not silently empty", async () => {
		const tools = buildTools();
		const detail = (await query(tools, {
			kind: "resource_definitions",
			id: `${BUNDLE_ID}/not-a-real-ability`,
			refs: "none",
		})) as QueryDetailResult;
		expect(detail.found).toBe(false);
	});
});
