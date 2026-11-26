// Equipment and cover rows read through the author-facing query tool.
import { describe, expect, it } from "vitest";

import { CHEST_SLOT_LOCAL_ID, remainingArmorUnits } from "../../../chapters/equipment/armor-units";
import {
	COVER_HALF_LOCAL_ID,
	COVER_HALF_MODIFIER_LOCAL_ID,
	COVER_THREE_QUARTERS_LOCAL_ID,
	COVER_THREE_QUARTERS_MODIFIER_LOCAL_ID,
	halfCoverBonus,
	threeQuartersCoverBonus,
} from "../../../chapters/playing-the-game/cover-units";
import {
	CHARMED_CONDITION_ID,
	DEAD_CONDITION_ID,
	FRIGHTENED_ABILITY_CHECK_DISADVANTAGE_CONDITION_ID,
	FRIGHTENED_ABILITY_CHECK_DISADVANTAGE_MODIFIER_ID,
	FRIGHTENED_ATTACK_DISADVANTAGE_MODIFIER_ID,
	FRIGHTENED_CONDITION_ID,
	GRAPPLED_ATTACK_DISADVANTAGE_MODIFIER_ID,
	GRAPPLED_CONDITION_ID,
	INCAPACITATED_CONDITION_ID,
	INCAPACITATED_NO_ACTION_CONDITION_ID,
	INCAPACITATED_NO_ACTION_MODIFIER_ID,
	INCAPACITATED_NO_BONUS_ACTION_CONDITION_ID,
	INCAPACITATED_NO_BONUS_ACTION_MODIFIER_ID,
	INCAPACITATED_NO_REACTION_CONDITION_ID,
	INCAPACITATED_NO_REACTION_MODIFIER_ID,
	POISONED_ABILITY_CHECK_DISADVANTAGE_CONDITION_ID,
	POISONED_ABILITY_CHECK_DISADVANTAGE_MODIFIER_ID,
	POISONED_ATTACK_DISADVANTAGE_MODIFIER_ID,
	POISONED_CONDITION_ID,
	PRONE_ATTACK_ROLL_DISADVANTAGE_MODIFIER_ID,
	PRONE_CONDITION_ID,
} from "../../../chapters/playing-the-game/fragments/conditions";
import {
	DODGE_ATTACK_DISADVANTAGE_MODIFIER_ID,
	DODGE_CONDITION_ID,
	DODGE_DEX_SAVE_ADVANTAGE_MODIFIER_ID,
	DODGE_DEX_SAVE_CONDITION_ID,
} from "../../../chapters/playing-the-game/fragments/dodge";
import {
	HELP_ADVANTAGE_MODIFIER_ID,
	HELP_CONDITION_ID,
} from "../../../chapters/playing-the-game/fragments/help";
import { BUNDLE_ID } from "../../../chapters/playing-the-game/index";
import {
	ABILITY_CHECK_RESOLUTION_SCOPE_ID,
	DEX_SAVE_RESOLUTION_SCOPE_ID,
} from "../../../chapters/playing-the-game/resolution-scope-units";
import { expectedAcIdentity } from "../../shared/identity-expectations";
import { buildTools, type QueryDetailResult, type QueryListResult, query } from "./harness";

describe("fixtures/ equipment and cover read through spellkave_query", () => {
	// ── Equipment slice E1 (ledger/designs/equipment-ac-target-fact.md) ──────

	it("kind+id detail carries the srd/ac modifier_target_definitions axis registration, shape Numeric", async () => {
		const tools = buildTools();
		const ac = expectedAcIdentity();
		const detail = (await query(tools, {
			kind: "modifier_target_definitions",
			id: ac.resourceDefinitionId,
			refs: "none",
		})) as QueryDetailResult;
		expect(detail.found, `expected ${ac.resourceDefinitionId} to be found`).toBe(true);
		const row = detail.row as Record<string, unknown>;
		expect(row.target_id).toBe(ac.resourceDefinitionId);
		expect(row.bundle_id).toBe(BUNDLE_ID);
		expect(row.shape).toBe("Numeric");
	});

	it("kind+id detail carries the Chain Mail entity_definitions row, slot-compatible with this bundle's OWN srd/slot/chest (self-sufficiency — never core/chest)", async () => {
		const tools = buildTools();
		const chainMailId = `${BUNDLE_ID}/armor/chain-mail`;
		const chestSlotId = `${BUNDLE_ID}/${CHEST_SLOT_LOCAL_ID}`;
		const detail = (await query(tools, {
			kind: "entity_definitions",
			id: chainMailId,
			refs: "none",
		})) as QueryDetailResult;
		expect(detail.found, `expected ${chainMailId} to be found`).toBe(true);
		const row = detail.row as Record<string, unknown>;
		expect(row.entity_def_id).toBe(chainMailId);
		expect(row.bundle_id).toBe(BUNDLE_ID);
		expect(row.slot_compatibility_predicate).toBe(`slot_id == "${chestSlotId}"`);
	});

	it("kind+id detail carries this bundle's OWN srd/slot/chest equipment_slot_definitions row (self-sufficiency — never core/chest)", async () => {
		const tools = buildTools();
		const chestSlotId = `${BUNDLE_ID}/${CHEST_SLOT_LOCAL_ID}`;
		const detail = (await query(tools, {
			kind: "equipment_slot_definitions",
			id: chestSlotId,
			refs: "none",
		})) as QueryDetailResult;
		expect(detail.found, `expected ${chestSlotId} to be found`).toBe(true);
		const row = detail.row as Record<string, unknown>;
		expect(row.slot_id).toBe(chestSlotId);
		expect(row.bundle_id).toBe(BUNDLE_ID);
	});

	it("kind=modifier_templates lists equipment, cover, Dodge, Help, and Prone modifiers", async () => {
		const tools = buildTools();
		const list = (await query(tools, {
			kind: "modifier_templates",
			bundle: BUNDLE_ID,
		})) as QueryListResult;
		expect(list.shape).toBe("list");
		const chainMailModifierId = `${BUNDLE_ID}/armor/chain-mail/ac_bonus`;
		const coverHalfModifierId = `${BUNDLE_ID}/${COVER_HALF_MODIFIER_LOCAL_ID}`;
		const coverThreeQuartersModifierId = `${BUNDLE_ID}/${COVER_THREE_QUARTERS_MODIFIER_LOCAL_ID}`;
		// E2 (`ledger/equipment.md`): the remaining 12 armors' own AC modifiers,
		// derived from `remainingArmorUnits()` (never hand-typed — same discipline
		// as `expectedAcIdentity()` elsewhere in this file).
		const remainingArmorModifierIds = remainingArmorUnits().map(
			(unit) => `${BUNDLE_ID}/armor/${unit.slug}/ac_bonus`,
		);
		// sk-609b.13: +N magic armor AC modifiers (magic_item/*/ac_bonus).
		const magicArmorModifierIds = list.items
			.map((i) => i.id)
			.filter((id) => id.includes("/magic_item/") && id.endsWith("/ac_bonus"));
		expect(list.items.map((i) => i.id).sort()).toEqual(
			[
				chainMailModifierId,
				...remainingArmorModifierIds,
				...magicArmorModifierIds,
				coverHalfModifierId,
				coverThreeQuartersModifierId,
				DODGE_ATTACK_DISADVANTAGE_MODIFIER_ID,
				DODGE_DEX_SAVE_ADVANTAGE_MODIFIER_ID,
				HELP_ADVANTAGE_MODIFIER_ID,
				// L12c Bardic Inspiration spent-boost + Mage Armor AC.
				"srd/condition/bardic-inspiration-spent-boost/ability-check",
				"srd/condition/mage-armor/ac",
				// sk-609b.16 K-C perception conditions (roll-bias capability gates).
				"srd/condition/in_darkness/disadvantage",
				"srd/condition/invisible/attack_advantage",
				"srd/condition/invisible/attack_disadvantage",
				// sk-609b.13 potion modifiers (heroism, speed, giant strength).
				"srd/condition/magic_item/potion-of-heroism/mod_attack_roll",
				"srd/condition/magic_item/potion-of-heroism/mod_dex_save",
				"srd/condition/magic_item/potion-of-speed/mod_ac",
				"srd/condition/magic_item/potion-of-speed/mod_dex_save",
				"srd/condition/potion-of-giant-strength/mod_str",
				// sk-dms.40.2: Incapacitated's three channel-zeroing sibling modifiers.
				INCAPACITATED_NO_ACTION_MODIFIER_ID,
				INCAPACITATED_NO_BONUS_ACTION_MODIFIER_ID,
				INCAPACITATED_NO_REACTION_MODIFIER_ID,
				// CONDITIONS PACKAGE (Poisoned, Frightened, Grappled, Prone) — Charmed
				// ships zero modifiers (identity-only, conditions-units.ts). Prone's
				// own modifier id is origin/main's Prone Slice B shape (merge
				// resolution kept THEIRS for Prone).
				POISONED_ATTACK_DISADVANTAGE_MODIFIER_ID,
				POISONED_ABILITY_CHECK_DISADVANTAGE_MODIFIER_ID,
				FRIGHTENED_ATTACK_DISADVANTAGE_MODIFIER_ID,
				FRIGHTENED_ABILITY_CHECK_DISADVANTAGE_MODIFIER_ID,
				GRAPPLED_ATTACK_DISADVANTAGE_MODIFIER_ID,
				PRONE_ATTACK_ROLL_DISADVANTAGE_MODIFIER_ID,
				// Martial L1-4 condition modifiers.
				"srd/condition/danger-sense/dex-save-advantage",
				"srd/condition/raging/attack-advantage",
				"srd/condition/reckless-attacked/attack-advantage-vs",
				"srd/condition/reckless-attacking/attack-advantage",
				"srd/condition/remarkable-athlete/ability-check-advantage",
				"srd/condition/steady-aim/attack-advantage",
				// L6+L12d spell modifiers (generated spell-behavior catalog).
				`${BUNDLE_ID}/condition/spell/asleep/no-action`,
				`${BUNDLE_ID}/condition/spell/baned/mod_attack_roll`,
				`${BUNDLE_ID}/condition/spell/baned/mod_dex_save`,
				`${BUNDLE_ID}/condition/spell/barkskin/ac_bonus`,
				`${BUNDLE_ID}/condition/spell/blessed/mod_attack_roll`,
				`${BUNDLE_ID}/condition/spell/blessed/mod_dex_save`,
				`${BUNDLE_ID}/condition/spell/commanded/no-action`,
				`${BUNDLE_ID}/condition/spell/enhanced-ability/mod_ability_check`,
				`${BUNDLE_ID}/condition/spell/enlargereduce/speed`,
				`${BUNDLE_ID}/condition/spell/ensnared/no-action`,
				`${BUNDLE_ID}/condition/spell/enthralled/no-action`,
				`${BUNDLE_ID}/condition/spell/expeditious-retreat/speed`,
				`${BUNDLE_ID}/condition/spell/guided/mod_ability_check`,
				`${BUNDLE_ID}/condition/spell/held-person/no-action`,
				`${BUNDLE_ID}/condition/spell/hideous-laughter/no-action`,
				`${BUNDLE_ID}/condition/spell/jump/speed`,
				`${BUNDLE_ID}/condition/spell/longstrider/speed`,
				`${BUNDLE_ID}/condition/spell/mage-armor/ac_bonus`,
				`${BUNDLE_ID}/condition/spell/magic-weapon/mod_attack_roll`,
				`${BUNDLE_ID}/condition/spell/pass-without-trace/mod_ability_check`,
				`${BUNDLE_ID}/condition/spell/protection-from-poison/mod_dex_save`,
				`${BUNDLE_ID}/condition/spell/resistance/mod_dex_save`,
				`${BUNDLE_ID}/condition/spell/shield-of-faith/ac_bonus`,
				`${BUNDLE_ID}/condition/spell/shield/ac_bonus`,
				`${BUNDLE_ID}/condition/spell/suggested/no-action`,
				`${BUNDLE_ID}/condition/spell/warding-bond/ac_bonus`,
				"srd/condition/unarmored-movement/speed-bonus",
				// L12a Weapon Mastery Sap/Slow/Vex.
				"srd/condition/mastery-sap/attack-disadvantage",
				"srd/condition/mastery-slow/speed-penalty",
				"srd/condition/mastery-vex/attack-advantage",
				"srd/condition/second-story-work/climb-speed",
				// sk-jay0.3.19.6 slice 2: Caltrops' Speed 0.
				"srd/condition/speed-zero/walk",
			].sort(),
		);

		const detail = (await query(tools, {
			kind: "modifier_templates",
			id: chainMailModifierId,
			refs: "none",
		})) as QueryDetailResult;
		expect(detail.found).toBe(true);
		const row = detail.row as Record<string, unknown>;
		expect(row.applies_to).toBe(expectedAcIdentity().resourceDefinitionId);
		expect(row.delta_kind).toBe("FlatSet");
		expect(row.predicate_source).toBe("");
		expect(Number(String(row.modifier_expression_source).match(/\d+/)?.[0])).toBe(16);
	});

	// ── Cover conditions (maxim-audit F1, ledger/designs/equipment-ac-target-fact.md) ──

	it("kind=condition_definitions lists Cover, Dodging, Help, Incapacitated, Dead, CONDITIONS PACKAGE, and L3 caster conditions", async () => {
		const tools = buildTools();
		const list = (await query(tools, {
			kind: "condition_definitions",
			bundle: BUNDLE_ID,
		})) as QueryListResult;
		expect(list.shape).toBe("list");
		const halfId = `${BUNDLE_ID}/${COVER_HALF_LOCAL_ID}`;
		const threeQuartersId = `${BUNDLE_ID}/${COVER_THREE_QUARTERS_LOCAL_ID}`;
		expect(list.items.map((i) => i.id).sort()).toEqual(
			[
				halfId,
				threeQuartersId,
				DODGE_CONDITION_ID,
				DODGE_DEX_SAVE_CONDITION_ID,
				HELP_CONDITION_ID,
				INCAPACITATED_CONDITION_ID,
				INCAPACITATED_NO_ACTION_CONDITION_ID,
				INCAPACITATED_NO_BONUS_ACTION_CONDITION_ID,
				INCAPACITATED_NO_REACTION_CONDITION_ID,
				DEAD_CONDITION_ID,
				// CONDITIONS PACKAGE: Poisoned + its internal ability-check-disadvantage
				// sub-condition, Charmed (identity-only), Frightened + its own internal
				// sub-condition, Grappled, Prone.
				POISONED_CONDITION_ID,
				POISONED_ABILITY_CHECK_DISADVANTAGE_CONDITION_ID,
				CHARMED_CONDITION_ID,
				FRIGHTENED_CONDITION_ID,
				FRIGHTENED_ABILITY_CHECK_DISADVANTAGE_CONDITION_ID,
				GRAPPLED_CONDITION_ID,
				PRONE_CONDITION_ID,
				// sk-609b.13 potion conditions.
				"srd/condition/magic_item/potion-of-climbing",
				"srd/condition/magic_item/potion-of-heroism",
				"srd/condition/magic_item/potion-of-resistance",
				"srd/condition/magic_item/potion-of-speed",
				"srd/condition/magic_item/potion-of-water-breathing",
				"srd/condition/potion-of-giant-strength",
				// Martial L1-4 conditions.
				"srd/condition/concentrating",
				"srd/condition/danger-sense",
				"srd/condition/deflect-expended",
				"srd/condition/deflect-ready",
				"srd/condition/frenzy-hit-used",
				"srd/condition/raging",
				"srd/condition/reckless-attacked",
				"srd/condition/reckless-attacking",
				"srd/condition/relentless-endurance-ready",
				"srd/condition/remarkable-athlete",
				"srd/condition/sneak-attack-expended",
				"srd/condition/steady-aim",
				// L3/L12c caster features (docs/caster-features-l1-4.md).
				"srd/condition/bardic-inspiration",
				"srd/condition/bardic-inspiration-spent-boost",
				"srd/condition/innate-sorcery",
				"srd/condition/mage-armor",
				// sk-609b.16 K-C perception conditions.
				"srd/condition/in_darkness",
				"srd/condition/invisible",
				"srd/condition/invisible/attack-advantage",
				// sk-609b.18 death saves.
				"srd/condition/stable",
				"srd/condition/unconscious",
				"srd/condition/metamagic-careful",
				// L6+L12d spell conditions (generated spell-behavior catalog).
				`${BUNDLE_ID}/condition/spell/alter-self`,
				`${BUNDLE_ID}/condition/spell/asleep`,
				`${BUNDLE_ID}/condition/spell/baned`,
				`${BUNDLE_ID}/condition/spell/barkskin`,
				`${BUNDLE_ID}/condition/spell/blessed`,
				`${BUNDLE_ID}/condition/spell/blinded`,
				`${BUNDLE_ID}/condition/spell/commanded`,
				`${BUNDLE_ID}/condition/spell/darkvision`,
				`${BUNDLE_ID}/condition/spell/divine-favor`,
				`${BUNDLE_ID}/condition/spell/enfeebled`,
				`${BUNDLE_ID}/condition/spell/enhanced-ability`,
				`${BUNDLE_ID}/condition/spell/enlargereduce`,
				`${BUNDLE_ID}/condition/spell/ensnared`,
				`${BUNDLE_ID}/condition/spell/enthralled`,
				`${BUNDLE_ID}/condition/spell/expeditious-retreat`,
				`${BUNDLE_ID}/condition/spell/faerie-fire`,
				`${BUNDLE_ID}/condition/spell/feather-fall`,
				`${BUNDLE_ID}/condition/spell/gentle-repose`,
				`${BUNDLE_ID}/condition/spell/guided`,
				`${BUNDLE_ID}/condition/spell/held-person`,
				`${BUNDLE_ID}/condition/spell/hexed`,
				`${BUNDLE_ID}/condition/spell/hideous-laughter`,
				`${BUNDLE_ID}/condition/spell/hunters-mark`,
				`${BUNDLE_ID}/condition/spell/jump`,
				`${BUNDLE_ID}/condition/spell/levitating`,
				`${BUNDLE_ID}/condition/spell/longstrider`,
				`${BUNDLE_ID}/condition/spell/mage-armor`,
				`${BUNDLE_ID}/condition/spell/magic-weapon`,
				`${BUNDLE_ID}/condition/spell/pass-without-trace`,
				`${BUNDLE_ID}/condition/spell/protection-from-evil-and-good`,
				`${BUNDLE_ID}/condition/spell/protection-from-poison`,
				`${BUNDLE_ID}/condition/spell/resistance`,
				`${BUNDLE_ID}/condition/spell/sanctuary`,
				`${BUNDLE_ID}/condition/spell/see-invisibility`,
				`${BUNDLE_ID}/condition/spell/shield`,
				`${BUNDLE_ID}/condition/spell/shield-of-faith`,
				`${BUNDLE_ID}/condition/spell/shillelagh`,
				`${BUNDLE_ID}/condition/spell/suggested`,
				`${BUNDLE_ID}/condition/spell/warding-bond`,
				"srd/condition/unarmored-movement",
				// L12a Weapon Mastery Sap/Slow.
				"srd/condition/mastery-sap",
				"srd/condition/mastery-slow",
				"srd/condition/mastery-vex",
				"srd/condition/addled",
				"srd/condition/blinded",
				"srd/condition/deafened",
				"srd/condition/exhaustion",
				"srd/condition/petrified",
				"srd/condition/restrained",
				"srd/condition/second-story-work",
				"srd/condition/stunned",
				// sk-jay0.3.19.6 slice 2: Caltrops' Speed 0 and the hazards' spared statuses.
				"srd/condition/speed-zero",
				"srd/condition/hazard/ball-bearings/present",
				"srd/condition/hazard/ball-bearings/struck",
				"srd/condition/hazard/caltrops/present",
				"srd/condition/hazard/caltrops/struck",
			].sort(),
		);
		for (const item of list.items) expect(item.bundle_id).toBe(BUNDLE_ID);
	});

	it("Dodge and Help route actor-side Advantage through distinct authored scopes", async () => {
		const tools = buildTools();
		for (const [modifierId, expectedScope] of [
			[DODGE_DEX_SAVE_ADVANTAGE_MODIFIER_ID, DEX_SAVE_RESOLUTION_SCOPE_ID],
			[HELP_ADVANTAGE_MODIFIER_ID, ABILITY_CHECK_RESOLUTION_SCOPE_ID],
		] as const) {
			const detail = (await query(tools, {
				kind: "modifier_templates",
				id: modifierId,
				refs: "none",
			})) as QueryDetailResult;
			expect(detail.found, `expected ${modifierId} to be found`).toBe(true);
			const row = detail.row as Record<string, unknown>;
			expect(row.applies_to).toBe(expectedScope);
			expect(row.delta_kind).toBe("Advantage");
		}
	});

	it("kind+id detail carries the full srd/cover/half condition + its OWN modifier_templates row (Plus, +2 on srd/ac)", async () => {
		const tools = buildTools();
		const halfId = `${BUNDLE_ID}/${COVER_HALF_LOCAL_ID}`;
		const halfModifierId = `${BUNDLE_ID}/${COVER_HALF_MODIFIER_LOCAL_ID}`;
		const detail = (await query(tools, {
			kind: "condition_definitions",
			id: halfId,
			refs: "none",
		})) as QueryDetailResult;
		expect(detail.found, `expected ${halfId} to be found`).toBe(true);
		const row = detail.row as Record<string, unknown>;
		expect(row.condition_definition_id).toBe(halfId);
		expect(row.bundle_id).toBe(BUNDLE_ID);
		expect(row.modifier_template_id).toBe(halfModifierId);
		expect(String(row.description).trim().length).toBeGreaterThan(0);

		const modifierDetail = (await query(tools, {
			kind: "modifier_templates",
			id: halfModifierId,
			refs: "none",
		})) as QueryDetailResult;
		expect(modifierDetail.found, `expected ${halfModifierId} to be found`).toBe(true);
		const modifierRow = modifierDetail.row as Record<string, unknown>;
		expect(modifierRow.applies_to).toBe(expectedAcIdentity().resourceDefinitionId);
		expect(modifierRow.delta_kind).toBe("Plus");
		expect(modifierRow.predicate_source).toBe("");
		expect(Number(String(modifierRow.modifier_expression_source).match(/\d+/)?.[0])).toBe(
			halfCoverBonus(),
		);
	});

	it("kind+id detail carries the full srd/cover/three-quarters condition + its OWN modifier_templates row (Plus, +5 on srd/ac)", async () => {
		const tools = buildTools();
		const threeQuartersId = `${BUNDLE_ID}/${COVER_THREE_QUARTERS_LOCAL_ID}`;
		const threeQuartersModifierId = `${BUNDLE_ID}/${COVER_THREE_QUARTERS_MODIFIER_LOCAL_ID}`;
		const detail = (await query(tools, {
			kind: "condition_definitions",
			id: threeQuartersId,
			refs: "none",
		})) as QueryDetailResult;
		expect(detail.found, `expected ${threeQuartersId} to be found`).toBe(true);
		const row = detail.row as Record<string, unknown>;
		expect(row.condition_definition_id).toBe(threeQuartersId);
		expect(row.bundle_id).toBe(BUNDLE_ID);
		expect(row.modifier_template_id).toBe(threeQuartersModifierId);
		expect(String(row.description).trim().length).toBeGreaterThan(0);

		const modifierDetail = (await query(tools, {
			kind: "modifier_templates",
			id: threeQuartersModifierId,
			refs: "none",
		})) as QueryDetailResult;
		expect(modifierDetail.found, `expected ${threeQuartersModifierId} to be found`).toBe(true);
		const modifierRow = modifierDetail.row as Record<string, unknown>;
		expect(modifierRow.applies_to).toBe(expectedAcIdentity().resourceDefinitionId);
		expect(modifierRow.delta_kind).toBe("Plus");
		expect(modifierRow.predicate_source).toBe("");
		expect(Number(String(modifierRow.modifier_expression_source).match(/\d+/)?.[0])).toBe(
			threeQuartersCoverBonus(),
		);
	});

	it("Half and Three-Quarters Cover each name a DIFFERENT modifier_templates row (at-most-one-modifier-per-condition, no shared/reused modifier)", async () => {
		const tools = buildTools();
		const halfDetail = (await query(tools, {
			kind: "condition_definitions",
			id: `${BUNDLE_ID}/${COVER_HALF_LOCAL_ID}`,
			refs: "none",
		})) as QueryDetailResult;
		const threeQuartersDetail = (await query(tools, {
			kind: "condition_definitions",
			id: `${BUNDLE_ID}/${COVER_THREE_QUARTERS_LOCAL_ID}`,
			refs: "none",
		})) as QueryDetailResult;
		const halfRow = halfDetail.row as Record<string, unknown>;
		const threeQuartersRow = threeQuartersDetail.row as Record<string, unknown>;
		expect(halfRow.modifier_template_id).not.toBe(threeQuartersRow.modifier_template_id);
	});
});
