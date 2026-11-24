/** Physical starting-kit recipe, resolved from the same authored catalog as the wizard. */
import type { AuthorTarget } from "@spellkave/tool-authoring";
import {
	resolveEquipmentComponent,
	startingEquipmentSelection,
} from "../data/starting-equipment.ts";
import { equipmentChoiceMenus, selectedEquipmentChoices } from "./equipment-choices.ts";
import { equipmentDefinitions } from "./selected-equipment.ts";

export interface EquipmentRecipeItem {
	definitionId: string;
	count: number;
	parentIndex?: number;
	slotId?: string;
}

/** Stable catalog key; the generator rejects collisions between distinct recipes. */
export function creationKitActionId(
	classSlug: string,
	letter: string,
	choices: Readonly<Record<string, string>> = {},
): string {
	const source = JSON.stringify(
		Object.entries(choices).sort(([a], [b]) => a.localeCompare(b, "en")),
	);
	let hash = 2166136261;
	for (const byte of new TextEncoder().encode(source))
		hash = Math.imul(hash ^ byte, 16777619) >>> 0;
	return `dm/act/creation/kit/${classSlug}/${letter}/${hash.toString(16).padStart(8, "0")}`;
}

export function equipmentRecipe(
	classSlug: string,
	letter: string,
	target: AuthorTarget,
	choices: Readonly<Record<string, string>> = {},
): EquipmentRecipeItem[] {
	const selected = selectedEquipmentChoices(
		equipmentChoiceMenus(target, classSlug, [letter]),
		letter,
		choices,
	);
	const selection = startingEquipmentSelection(classSlug, letter, selected.names);
	const definitions = equipmentDefinitions(target);
	const contentsRows = target
		.lookup("metadata_attachments", { bundle: "srd" })
		.filter(
			(row) =>
				row.namespace === "srd.equipment_contents" && row.target_kind === "entity_definition",
		);
	const components: {
		name: string;
		quantity: number;
		parentIndex?: number;
		ancestors?: string[];
	}[] = [
		...selection.items,
		...(selection.goldPieces > 0 ? [{ name: "Gold Piece", quantity: selection.goldPieces }] : []),
	];
	const result: EquipmentRecipeItem[] = [];
	const occupied = new Set<string>();
	for (const component of components) {
		const { definition, quantity } = resolveEquipmentComponent(component, definitions);
		if (component.ancestors?.includes(definition.entity_def_id))
			throw new Error(`starting-equipment: cyclic contents at ${definition.entity_def_id}.`);
		const rows = contentsRows.filter((row) => row.target_ref === definition.entity_def_id);
		if (rows.length > 1)
			throw new Error(`starting-equipment: ambiguous contents for ${definition.entity_def_id}.`);
		const contents: { name: string; quantity: number }[] = [];
		if (typeof rows[0]?.payload_json === "string") {
			const payload: unknown = JSON.parse(rows[0].payload_json);
			if (
				payload === null ||
				typeof payload !== "object" ||
				!("items" in payload) ||
				!Array.isArray(payload.items)
			)
				throw new Error(`starting-equipment: invalid contents for ${definition.entity_def_id}.`);
			for (const item of payload.items) {
				if (
					item === null ||
					typeof item !== "object" ||
					typeof item.name !== "string" ||
					!Number.isSafeInteger(item.quantity) ||
					item.quantity < 1
				)
					throw new Error(
						`starting-equipment: invalid content item for ${definition.entity_def_id}.`,
					);
				contents.push({ name: item.name, quantity: item.quantity });
			}
		}
		const row = definitions.find((row) => row.entity_def_id === definition.entity_def_id);
		for (let copy = 0; copy < (row?.stackable === true ? 1 : quantity); copy++) {
			const index = result.length;
			const predicate = row?.slot_compatibility_predicate;
			const slot =
				typeof predicate === "string"
					? /^slot_id\s*==\s*"([^"]+)"$/.exec(predicate)?.[1]
					: undefined;
			const equip =
				component.parentIndex === undefined && slot !== undefined && !occupied.has(slot);
			if (equip) occupied.add(slot);
			result.push({
				definitionId: definition.entity_def_id,
				count: row?.stackable === true ? quantity : 1,
				...(component.parentIndex === undefined ? {} : { parentIndex: component.parentIndex }),
				...(equip ? { slotId: slot } : {}),
			});
			for (const child of contents)
				components.push({
					...child,
					parentIndex: index,
					ancestors: [...(component.ancestors ?? []), definition.entity_def_id],
				});
		}
	}
	return result;
}
