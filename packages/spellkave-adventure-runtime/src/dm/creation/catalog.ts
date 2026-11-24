/**
 * // pattern: draft-then-confirm-wizard
 * // pattern: advancement-choice
 * // pattern: tag-membership-menu
 *
 * Per-class creation menus derived from metadata (skills, L1 choices,
 * cantrips, prepared spells, kit). Built once per cycle from an
 * `AuthorTarget` + class slug — engine stays class-agnostic.
 */
import type { AuthorTarget } from "@spellkave/tool-authoring";
import {
	type AdvancementChoiceGroup,
	advancementChoicesForClassLevel,
	type ClassKitChoice,
	type ClassSkillChoice,
	cantripCapabilityId,
	cantripsKnownAtLevel,
	classKitChoice,
	classSkillChoice,
	preparedSpellCapabilityId,
	preparedSpellsAtLevel,
	spellcastingProfileForClass,
	spellSlugsOnClassListAtLevel,
} from "../data";
import { type EquipmentChoiceMenu, equipmentChoiceMenus } from "./equipment-choices.ts";

export interface CreationSpellOption {
	slug: string;
	capabilityId: string;
	definitionRef?: string;
	displayName: string;
}

export interface CreationClassCatalog {
	classSlug: string;
	skills: ClassSkillChoice;
	/** L1 advancement choose-N groups, stable order. */
	choiceGroups: readonly AdvancementChoiceGroup[];
	cantripsKnown: number;
	cantripOptions: readonly CreationSpellOption[];
	preparedCount: number;
	preparedOptions: readonly CreationSpellOption[];
	kit: ClassKitChoice;
	equipmentChoices?: readonly EquipmentChoiceMenu[];
}

function titleCaseSlug(slug: string): string {
	return slug
		.split("-")
		.map((part) => (part.length === 0 ? part : part[0]?.toUpperCase() + part.slice(1)))
		.join(" ");
}

export function buildCreationClassCatalog(
	target: AuthorTarget,
	classSlug: string,
): CreationClassCatalog {
	const skills = classSkillChoice(classSlug);
	const choiceGroups = advancementChoicesForClassLevel(target, classSlug, 1);
	const profile = spellcastingProfileForClass(classSlug);
	const rawCantripsKnown = profile === null ? 0 : cantripsKnownAtLevel(profile, 1);
	const rawPreparedCount = profile === null ? 0 : preparedSpellsAtLevel(profile, 1);
	const cantripOptions =
		rawCantripsKnown === 0
			? []
			: spellSlugsOnClassListAtLevel(target, classSlug, 0).map((slug) => ({
					slug,
					capabilityId: cantripCapabilityId(slug),
					definitionRef: `srd/spell/${slug}`,
					displayName: titleCaseSlug(slug),
				}));
	const preparedOptions =
		rawPreparedCount === 0
			? []
			: spellSlugsOnClassListAtLevel(target, classSlug, 1).map((slug) => ({
					slug,
					capabilityId: preparedSpellCapabilityId(slug),
					definitionRef: `srd/spell/${slug}`,
					displayName: titleCaseSlug(slug),
				}));
	// Never ask for more picks than the class list can fulfill (sk-0m4.109).
	// A live AuthorTarget missing `entity_definition_tag` looks like an empty
	// list — clamp to 0 so Ranger/Paladin skip instead of offering "2 more"
	// with no labels. Full fixtures keep the table count (Ranger L1 = 2).
	const cantripsKnown = Math.min(rawCantripsKnown, cantripOptions.length);
	const preparedCount = Math.min(rawPreparedCount, preparedOptions.length);
	return {
		classSlug,
		skills,
		choiceGroups,
		cantripsKnown,
		cantripOptions,
		preparedCount,
		preparedOptions,
		kit: classKitChoice(classSlug),
		equipmentChoices: equipmentChoiceMenus(
			target,
			classSlug,
			classKitChoice(classSlug).options.map((option) => option.letter),
		),
	};
}
