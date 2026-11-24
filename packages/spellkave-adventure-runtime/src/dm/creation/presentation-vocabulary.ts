import type { DmDutyCreationPresentationVocabulary } from "@spellkave/world-author/npc-dm-documents";
/** Source-owned creation presentation and candidate text vocabulary.
 * The duty exporter captures this same object; it grants no action authority. */
export const CREATION_PRESENTATION_VOCABULARY = {
	menu_labels: {
		class: "class",
		background: "background",
		species: "species",
		skill: "skill",
		cantrip: "cantrip",
		prepared_spell: "prepared spell",
		starting_kit: "starting kit",
		name: "name",
		ability_scores: "ability scores",
		confirmation: "confirmation",
	},
	templates: {
		count_kind: "{kind} ({remaining} more)",
		kit_option: "{letter}: {description}",
		equipment_page: "{source_text} (page {page}/{pages})",
		equipment_more: "More equipment (page {page}/{pages})",
		adopt_name: 'Adopt the name "{name}"',
		adopt_array: "Adopt the recommended array",
		confirm: "Confirm character creation",
		remaining_one: " ({remaining} pick remaining.)",
		remaining_many: " ({remaining} picks remaining.)",
		answer_option: "Option {index}",
	},
	missing_phrases: {
		class: "a class",
		background: "a background",
		species: "a species",
		name: "a name",
		skills: "at least one class skill",
		kit: "a starting kit",
	},
	list: {
		empty: "nothing",
		pair_separator: " and ",
		separator: ", ",
		last_separator: ", and ",
	},
	spoken_confirm_aliases: ["confirm", "confirm character creation"],
	spoken_discard_aliases: ["discard", "discard the drafted character"],
	text_field_aliases: {
		name: ["name"],
		appearance: ["appearance"],
		backstory: ["backstory"],
	},
} as const satisfies DmDutyCreationPresentationVocabulary;

/** Literal named substitution, without recursion or executable formatting. */
export function creationPresentationText(
	template: string,
	values: Readonly<Record<string, string | number>>,
): string {
	return template.replace(/\{([a-z_]+)\}/g, (_match, key: string) => {
		const value = values[key];
		if (value === undefined) throw new Error(`Missing creation presentation argument: ${key}`);
		return String(value);
	});
}
