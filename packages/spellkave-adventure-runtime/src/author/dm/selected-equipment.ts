/** Build-time equipment placement for authored NPC fixtures. Runtime kits use authored acts. */
import type { AuthorTarget } from "@spellkave/tool-authoring";
import {
	equipmentChoiceMenus,
	selectedEquipmentChoices,
} from "../../dm/creation/equipment-choices.ts";
import { equipmentDefinitions } from "../../dm/creation/selected-equipment.ts";
import {
	resolveEquipmentComponent,
	startingEquipmentSelection,
} from "../../dm/data/starting-equipment.ts";
import type { VerbCall } from "../../dm/lib/scene-driver.ts";

export { equipmentDefinitions } from "../../dm/creation/selected-equipment.ts";
/** Materialize selected definitions; no replacement kit and no baked armor bonus. */
export function renderSelectedEquipment(
	candidateKey: string,
	bundle: string,
	classSlug: string,
	letter: string,
	target: AuthorTarget,
	choices: Readonly<Record<string, string>> = {},
): VerbCall[] {
	const selected = selectedEquipmentChoices(
		equipmentChoiceMenus(target, classSlug, [letter]),
		letter,
		choices,
	);
	const selection = startingEquipmentSelection(classSlug, letter, selected.names);
	const definitions = equipmentDefinitions(target);
	const components: { name: string; quantity: number; parentKey?: string; ancestors?: string[] }[] =
		[
			...selection.items,
			...(selection.goldPieces > 0 ? [{ name: "Gold Piece", quantity: selection.goldPieces }] : []),
		];
	const calls: VerbCall[] = [];
	const contentsRows = target
		.lookup("metadata_attachments", { bundle: "srd" })
		.filter(
			(row) =>
				row.namespace === "srd.equipment_contents" && row.target_kind === "entity_definition",
		);
	const occupied = new Set<string>();
	for (const [index, component] of components.entries()) {
		const { definition, quantity } = resolveEquipmentComponent(component, definitions);
		if (component.ancestors?.includes(definition.entity_def_id)) {
			throw new Error(`starting-equipment: cyclic contents at ${definition.entity_def_id}.`);
		}
		const contentsRowsForItem = contentsRows.filter(
			(row) => row.target_ref === definition.entity_def_id,
		);
		if (contentsRowsForItem.length > 1)
			throw new Error(`starting-equipment: ambiguous contents for ${definition.entity_def_id}.`);
		const payload = contentsRowsForItem[0]?.payload_json;
		const contents: { name: string; quantity: number }[] = [];
		if (typeof payload === "string") {
			const parsed: unknown = JSON.parse(payload);
			if (
				typeof parsed !== "object" ||
				parsed === null ||
				!("items" in parsed) ||
				!Array.isArray(parsed.items)
			) {
				throw new Error(`starting-equipment: invalid contents for ${definition.entity_def_id}.`);
			}
			for (const item of parsed.items) {
				if (
					typeof item !== "object" ||
					item === null ||
					typeof item.name !== "string" ||
					!Number.isSafeInteger(item.quantity) ||
					item.quantity < 1
				) {
					throw new Error(
						`starting-equipment: invalid content item for ${definition.entity_def_id}.`,
					);
				}
				contents.push({ name: item.name, quantity: item.quantity });
			}
		}
		const row = definitions.find(
			(candidate) => candidate.entity_def_id === definition.entity_def_id,
		);
		const copies = row?.stackable === true ? 1 : quantity;
		for (let copy = 0; copy < copies; copy++) {
			const key = `${candidateKey}/item/starting/${index}/${copy}`;
			for (const item of contents)
				components.push({
					...item,
					parentKey: key,
					ancestors: [...(component.ancestors ?? []), definition.entity_def_id],
				});
			calls.push({
				toolName: "spellkave_write_rows",
				label: `creation-selected-equipment:${index}`,
				params: {
					bundle,
					kind: "entities",
					rows: [
						{
							bundle_id: bundle,
							entity_key: key,
							entity_def_id: definition.entity_def_id,
							name: definition.display_name,
							kind: "item",
							place_node_id: "",
							quantity: row?.stackable === true ? quantity : 1,
						},
					],
				},
			});
			calls.push({
				toolName: "spellkave_stow_item",
				label: `stow-creation-selected:${index}`,
				params: {
					bundle,
					actor_entity_key: candidateKey,
					item_entity_key: key,
					direction: "in",
					...(component.parentKey === undefined
						? {}
						: { container_entity_key: component.parentKey }),
				},
			});
			// Use the definition's declared single-slot compatibility, not class/armor tables.
			const predicate = row?.slot_compatibility_predicate;
			const slot =
				typeof predicate === "string"
					? /^slot_id\s*==\s*"([^"]+)"$/.exec(predicate)?.[1]
					: undefined;
			if (component.parentKey === undefined && slot !== undefined && !occupied.has(slot)) {
				occupied.add(slot);
				calls.push({
					toolName: "spellkave_equip_item",
					label: `equip-creation-selected:${index}`,
					params: { bundle, actor_entity_key: candidateKey, item_entity_key: key, slot_id: slot },
				});
			}
		}
	}
	return calls;
}
