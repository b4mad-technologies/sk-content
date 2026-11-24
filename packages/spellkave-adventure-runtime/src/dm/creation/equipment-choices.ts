/** Source-backed equipment menus. Physical identity and proficiency stay distinct. */
import type { AuthorTarget } from "@spellkave/tool-authoring";
import { startingEquipmentChoices } from "../data/starting-equipment.ts";
import { DIALOG_SLOT_COUNT } from "../dialog/ids.ts";
import type { CreationDraftState, CreationPick } from "./draft-state";
import {
	creationPresentationText,
	CREATION_PRESENTATION_VOCABULARY as vocabulary,
} from "./presentation-vocabulary";

export interface EquipmentChoiceOption {
	entityDefId: string;
	displayName: string;
	proficiencyCapabilityId?: string;
}

export interface EquipmentChoiceMenu {
	letter: string;
	sourceText: string;
	usesToolProficiency: boolean;
	options: readonly EquipmentChoiceOption[];
}

export function equipmentChoiceMenus(
	target: AuthorTarget,
	classSlug: string,
	letters: readonly string[],
): EquipmentChoiceMenu[] {
	const tags = target.lookup("entity_definition_tag", { bundle: "srd" });
	const definitions = target.lookup("entity_definitions", { bundle: "srd" });
	const capabilities = target.lookup("capability_definitions", { bundle: "srd" });
	const proficiencyLinks = target
		.lookup("metadata_attachments", { bundle: "srd" })
		.filter(
			(row) =>
				row.namespace === "srd.equipment_proficiency" && row.target_kind === "entity_definition",
		);
	return letters.flatMap((letter) =>
		startingEquipmentChoices(classSlug, letter).map((requirement) => {
			const allowedTags = [
				...(requirement.sourceText.includes("Musical Instrument")
					? ["srd.tool.category.instrument"]
					: []),
				...(requirement.sourceText.includes("Artisan's Tools")
					? ["srd.tool.category.artisan"]
					: []),
			];
			const ids = new Set(
				tags.filter((row) => allowedTags.includes(String(row.tag))).map((row) => row.entity_def_id),
			);
			const options = definitions
				.flatMap((row) => {
					if (
						!ids.has(row.entity_def_id) ||
						typeof row.entity_def_id !== "string" ||
						typeof row.display_name !== "string"
					)
						return [];
					const links = proficiencyLinks.filter((link) => link.target_ref === row.entity_def_id);
					let proficiencyCapabilityId: string | undefined;
					if (links.length > 1)
						throw new Error(`starting-equipment: ambiguous proficiency for ${row.entity_def_id}`);
					if (links.length === 1) {
						const payload: unknown =
							typeof links[0]?.payload_json === "string" ? JSON.parse(links[0].payload_json) : null;
						if (
							typeof payload !== "object" ||
							payload === null ||
							!("capabilityId" in payload) ||
							typeof payload.capabilityId !== "string" ||
							!capabilities.some((cap) => cap.capability_id === payload.capabilityId)
						) {
							throw new Error(
								`starting-equipment: invalid proficiency reference for ${row.entity_def_id}`,
							);
						}
						proficiencyCapabilityId = payload.capabilityId;
					}
					return [
						{
							entityDefId: row.entity_def_id,
							displayName: row.display_name,
							proficiencyCapabilityId,
						},
					];
				})
				.sort((a, b) => a.displayName.localeCompare(b.displayName, "en"));
			return { letter, ...requirement, options };
		}),
	);
}

export function openEquipmentChoice(
	state: CreationDraftState,
	menus: readonly EquipmentChoiceMenu[],
): EquipmentChoiceMenu | undefined {
	return menus.find(
		(menu) =>
			menu.letter === state.kitOption &&
			!menu.options.some(
				(option) =>
					option.entityDefId === state.equipmentPicks?.[menu.sourceText] &&
					(!menu.usesToolProficiency || option.proficiencyCapabilityId !== undefined),
			),
	);
}

/** The labels and Answer bindings share one page projection, including navigation. */
export function equipmentChoicePage(
	state: CreationDraftState,
	menu: EquipmentChoiceMenu,
): { labels: string[]; picks: CreationPick[]; page: number; pages: number } {
	const size = DIALOG_SLOT_COUNT - 1;
	const pages = Math.max(1, Math.ceil(menu.options.length / size));
	const page = Math.min(Math.max(0, state.equipmentPage ?? 0), pages - 1);
	const options = menu.options.slice(page * size, (page + 1) * size);
	const labels = options.map((option) => option.displayName);
	const picks: CreationPick[] = options.map((option) => ({
		kind: "equipment",
		requirement: menu.sourceText,
		entityDefId: option.entityDefId,
	}));
	if (pages > 1) {
		const next = (page + 1) % pages;
		labels.push(
			creationPresentationText(vocabulary.templates.equipment_more, { page: next + 1, pages }),
		);
		picks.push({ kind: "equipment-page", page: next });
	}
	return { labels, picks, page, pages };
}

/** Validate selected IDs before converting them to source-preserving item names. */
export function selectedEquipmentChoices(
	menus: readonly EquipmentChoiceMenu[],
	letter: string,
	picks: Readonly<Record<string, string>> = {},
) {
	const names: Record<string, string> = {};
	const proficiencyIds: string[] = [];
	for (const menu of menus.filter((candidate) => candidate.letter === letter)) {
		const option = menu.options.find(
			(candidate) => candidate.entityDefId === picks[menu.sourceText],
		);
		if (option === undefined)
			throw new Error(`starting-equipment: unresolved choice: ${menu.sourceText}`);
		names[menu.sourceText] = option.displayName;
		if (menu.usesToolProficiency) {
			if (option.proficiencyCapabilityId === undefined)
				throw new Error(`starting-equipment: missing proficiency for ${option.entityDefId}`);
			proficiencyIds.push(option.proficiencyCapabilityId);
		}
	}
	return { names, proficiencyIds };
}
