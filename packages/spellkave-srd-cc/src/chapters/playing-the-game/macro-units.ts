import {
	ATTACK_ROLL_HITS_MACRO_BODY_SOURCE,
	ATTACK_ROLL_HITS_MACRO_ID,
	BASE_AC_MACRO_BODY_SOURCE,
	BASE_AC_MACRO_ID,
} from "./attack-roll-units";
import { BUNDLE_ID } from "./constants";
import { DC_OR_MACRO_BODY_SOURCE, DC_OR_MACRO_ID } from "./generic-check-units";
import {
	ABILITY_MODIFIER_MACRO_BODY_SOURCE,
	ABILITY_MODIFIER_MACRO_ID,
	ACTOR_ABILITY_MODIFIER_MACROS,
	abilityModifierBodyFor,
	PROFICIENCY_BONUS_MACRO_BODY_SOURCE,
	PROFICIENCY_BONUS_MACRO_ID,
} from "./modifier-units";
import { TAKES_TURN_MACRO_BODY_SOURCE, TAKES_TURN_MACRO_ID } from "./order-of-combat-units";
import { poolMaxMacroRows } from "./pool-max-units";

/** The package-wide DSL macro catalog, emitted once in macros.toml. */
export function dslMacroDefinitionRows(): Record<string, unknown>[] {
	return [
		{
			body_source:
				"cond(actor.has_tag('srd.class.wizard'), (actor.effective('srd/int') - 10) / 2 + cond((actor.effective('srd/int') - 10) - ((actor.effective('srd/int') - 10) / 2) * 2 < 0, -1, 0), cond(actor.has_tag('srd.class.cleric') || actor.has_tag('srd.class.druid') || actor.has_tag('srd.class.ranger'), (actor.effective('srd/wis') - 10) / 2 + cond((actor.effective('srd/wis') - 10) - ((actor.effective('srd/wis') - 10) / 2) * 2 < 0, -1, 0), cond(actor.has_tag('srd.class.bard') || actor.has_tag('srd.class.paladin') || actor.has_tag('srd.class.sorcerer') || actor.has_tag('srd.class.warlock'), (actor.effective('srd/cha') - 10) / 2 + cond((actor.effective('srd/cha') - 10) - ((actor.effective('srd/cha') - 10) / 2) * 2 < 0, -1, 0), actor.stat('srd/spellcasting_mod'))))",
			bundle_id: "srd",
			description:
				"The spellcasting ability modifier of a caster, from its class: Intelligence for Wizards, Wisdom for Clerics, Druids and Rangers, Charisma for Bards, Paladins, Sorcerers and Warlocks. Other casters use their own spellcasting state.",
			macro_id: "srd/spellcasting_modifier",
			parameters: [],
			return_type: "Int",
		},
		{
			body_source:
				"(2 * actor.stat('srd/hp_per_level') - 2) + (actor.stat('srd/level') - 1) * actor.stat('srd/hp_per_level') + (actor.effective('srd/con') - 10) / 2 + cond((actor.effective('srd/con') - 10) - ((actor.effective('srd/con') - 10) / 2) * 2 < 0, -1, 0)",
			bundle_id: "srd",
			description:
				"A character's Hit Point maximum: the class's first-level Hit Points plus its fixed Hit Points per level, plus the Constitution modifier.",
			macro_id: "srd/hit_point_maximum",
			parameters: [],
			return_type: "Int",
		},
		{
			body_source:
				"cond(actor.has_tag('srd.player_character'), cond(actor.has_tag('srd.class.barbarian') || actor.has_tag('srd.class.fighter') || actor.has_tag('srd.class.monk') || actor.has_tag('srd.class.rogue'), 0, cond(actor.has_tag('srd.class.warlock'), cond(actor.stat('srd/level') <= 1, 1, 2), cond(actor.has_tag('srd.class.paladin') || actor.has_tag('srd.class.ranger'), cond(actor.stat('srd/level') <= 1, 2, cond(actor.stat('srd/level') <= 2, 2, cond(actor.stat('srd/level') <= 3, 3, 3))), cond(actor.has_tag('srd.class.bard') || actor.has_tag('srd.class.cleric') || actor.has_tag('srd.class.druid') || actor.has_tag('srd.class.sorcerer') || actor.has_tag('srd.class.wizard'), cond(actor.stat('srd/level') <= 1, 2, cond(actor.stat('srd/level') <= 2, 3, cond(actor.stat('srd/level') <= 3, 4, 4))), actor.resource_max('srd/spell_slot_1'))))), cond(actor.has_tag('srd.class.warlock'), cond(actor.stat('srd/level') <= 1, 1, 2), cond(actor.has_tag('srd.class.paladin') || actor.has_tag('srd.class.ranger'), cond(actor.stat('srd/level') <= 1, 2, cond(actor.stat('srd/level') <= 2, 2, cond(actor.stat('srd/level') <= 3, 3, 3))), cond(actor.has_tag('srd.class.bard') || actor.has_tag('srd.class.cleric') || actor.has_tag('srd.class.druid') || actor.has_tag('srd.class.sorcerer') || actor.has_tag('srd.class.wizard'), cond(actor.stat('srd/level') <= 1, 2, cond(actor.stat('srd/level') <= 2, 3, cond(actor.stat('srd/level') <= 3, 4, 4))), actor.resource_max('srd/spell_slot_1')))))",
			bundle_id: "srd",
			description: "How many level 1 spell slots a character of this class and level has.",
			macro_id: "srd/spell_slot_1_max",
			parameters: [],
			return_type: "Int",
		},
		{
			body_source:
				"cond(actor.has_tag('srd.player_character'), cond(actor.has_tag('srd.class.barbarian') || actor.has_tag('srd.class.fighter') || actor.has_tag('srd.class.monk') || actor.has_tag('srd.class.rogue'), 0, cond(actor.has_tag('srd.class.warlock'), cond(actor.stat('srd/level') < 3, 0, cond(actor.stat('srd/level') <= 3, 2, 2)), cond(actor.has_tag('srd.class.bard') || actor.has_tag('srd.class.cleric') || actor.has_tag('srd.class.druid') || actor.has_tag('srd.class.sorcerer') || actor.has_tag('srd.class.wizard'), cond(actor.stat('srd/level') < 3, 0, cond(actor.stat('srd/level') <= 3, 2, 3)), actor.resource_max('srd/spell_slot_2')))), cond(actor.has_tag('srd.class.warlock'), cond(actor.stat('srd/level') < 3, 0, cond(actor.stat('srd/level') <= 3, 2, 2)), cond(actor.has_tag('srd.class.bard') || actor.has_tag('srd.class.cleric') || actor.has_tag('srd.class.druid') || actor.has_tag('srd.class.sorcerer') || actor.has_tag('srd.class.wizard'), cond(actor.stat('srd/level') < 3, 0, cond(actor.stat('srd/level') <= 3, 2, 3)), actor.resource_max('srd/spell_slot_2'))))",
			bundle_id: "srd",
			description: "How many level 2 spell slots a character of this class and level has.",
			macro_id: "srd/spell_slot_2_max",
			parameters: [],
			return_type: "Int",
		},
		{
			body_source:
				"(2 * target.stat('srd/hp_per_level') - 2) + (target.stat('srd/level') - 1) * target.stat('srd/hp_per_level') + (target.effective('srd/con') - 10) / 2 + cond((target.effective('srd/con') - 10) - ((target.effective('srd/con') - 10) / 2) * 2 < 0, -1, 0)",
			bundle_id: "srd",
			description:
				"The target character's Hit Point maximum: the class's first-level Hit Points plus its fixed Hit Points per level, plus the Constitution modifier.",
			macro_id: "srd/target_hit_point_maximum",
			parameters: [],
			return_type: "Int",
		},

		{
			macro_id: ABILITY_MODIFIER_MACRO_ID,
			bundle_id: BUNDLE_ID,
			return_type: "Int",
			parameters: [{ name: "score", value_type: "Int" }],
			body_source: ABILITY_MODIFIER_MACRO_BODY_SOURCE,
			description:
				'SRD: "Finally, determine your ability modifiers using the Ability Scores and Modifiers table." ' +
				"(cache/markdown/character-creation.md:487-489) Converts one ability score to its " +
				"table-defined modifier.",
		},
		...ACTOR_ABILITY_MODIFIER_MACROS.map((macro) => ({
			macro_id: macro.id,
			bundle_id: BUNDLE_ID,
			return_type: "Int",
			parameters: [],
			body_source: abilityModifierBodyFor(`actor.effective('${macro.abilityId}')`),
			description:
				`SRD ${macro.displayName} modifier, read from the actor's effective ${macro.displayName} score. ` +
				"This repeats the shared generated formula because manifest macro bodies cannot nest macro calls (MF-DSL-MACRO-IN-BODY).",
		})),
		{
			macro_id: PROFICIENCY_BONUS_MACRO_ID,
			bundle_id: BUNDLE_ID,
			return_type: "Int",
			parameters: [{ name: "level_or_cr", value_type: "Int" }],
			body_source: PROFICIENCY_BONUS_MACRO_BODY_SOURCE,
			description:
				'SRD: "If you have proficiency with something, you can add your Proficiency Bonus to any D20 Test you make using that thing." ' +
				"(cache/markdown/rules-glossary.md:1179-1181) Derives the bonus from character level " +
				"or monster Challenge Rating.",
		},
		{
			macro_id: DC_OR_MACRO_ID,
			bundle_id: BUNDLE_ID,
			return_type: "Int",
			parameters: [
				{ name: "override", value_type: "Int" },
				{ name: "fallback", value_type: "Int" },
			],
			body_source: DC_OR_MACRO_BODY_SOURCE,
			description:
				'SRD: "A Difficulty Class (DC) is the target number for an ability check or a saving throw." ' +
				"(cache/markdown/rules-glossary.md:736-738) Uses a positive authored override; " +
				"otherwise keeps the supplied fallback target number.",
		},
		{
			macro_id: BASE_AC_MACRO_ID,
			bundle_id: BUNDLE_ID,
			return_type: "Int",
			parameters: [{ name: "dex_modifier", value_type: "Int" }],
			body_source: BASE_AC_MACRO_BODY_SOURCE,
			description:
				'SRD: "Base AC = 10 + the creature\'s Dexterity modifier" (cache/markdown/playing-the-game.md:383). ' +
				"Calculates unarmored base Armor Class from a Dexterity modifier.",
		},
		{
			macro_id: ATTACK_ROLL_HITS_MACRO_ID,
			bundle_id: BUNDLE_ID,
			return_type: "Bool",
			parameters: [
				{ name: "attack_roll", value_type: "Int" },
				{ name: "total", value_type: "Int" },
				{ name: "ac", value_type: "Int" },
				// pattern: derived-value-mechanism — default 20; call sites pass 19 with Improved Critical.
				{ name: "crit_threshold", value_type: "Int" },
			],
			body_source: ATTACK_ROLL_HITS_MACRO_BODY_SOURCE,
			description:
				"SRD: \"If you roll a 20 on the d20 (called a 'natural 20') for an attack roll, the attack hits regardless of any modifiers or the target's AC.\" " +
				"\"If you roll a 1 on the d20 (a 'natural 1') for an attack roll, the attack misses regardless of any modifiers or the target's AC.\" " +
				"(cache/markdown/playing-the-game.md:389-393) Centralizes the attack-only " +
				"automatic hit/miss rule; ordinary attacks compare total against AC. " +
				"crit_threshold (default 20 at call sites without Improved Critical) is the auto-hit floor — " +
				"Champion Improved Critical passes 19 via actor.has_capability at the call site.",
		},
		{
			macro_id: TAKES_TURN_MACRO_ID,
			bundle_id: BUNDLE_ID,
			return_type: "Bool",
			parameters: [],
			body_source: TAKES_TURN_MACRO_BODY_SOURCE,
			description:
				'SRD: "A monster dies the instant it drops to 0 Hit Points" (cache/markdown/playing-the-game.md:1217) and ' +
				'"Whenever you start your turn with 0 Hit Points, you must make a Death Saving Throw" ' +
				"(cache/markdown/playing-the-game.md:1233). A combatant takes its turn unless it is Dead; " +
				"Unconscious, Stable and Incapacitated creatures keep theirs. Session turn_eligibility_pred " +
				"(ADR-0143); rule prose in order-of-combat-units.ts.",
		},
		...poolMaxMacroRows(),
	];
}
