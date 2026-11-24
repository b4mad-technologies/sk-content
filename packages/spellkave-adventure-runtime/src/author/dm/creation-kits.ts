// pattern: blueprint-instance-override
// pattern: draft-then-confirm-wizard
/** Source-backed finite kit recipes; each consequence inserts the complete kit atomically. */
import type { AuthorTarget } from "@spellkave/tool-authoring";
import { equipmentChoiceMenus } from "../../dm/creation/equipment-choices.ts";
import { creationKitActionId, equipmentRecipe } from "../../dm/creation/equipment-plan.ts";
import { classCreationData, classKitChoice } from "../../dm/data/index.ts";
import { buildMarkerResource } from "../../dm/lib/resources.ts";
import type { VerbCall } from "../../dm/lib/scene-driver.ts";
import { type AuthoredAct, authoredActCalls } from "./authored-act.ts";

export const CREATION_KIT_GRANTED_STATE_ID = "dm/creation/kit-granted";
export const CREATION_KIT_GRANTED_VALUE = 1;

export function authoredCreationKits(target: AuthorTarget): AuthoredAct[] {
	const acts: AuthoredAct[] = [];
	const keys = new Set<string>();
	for (const cls of classCreationData())
		for (const option of classKitChoice(cls.slug).options) {
			let selections: Record<string, string>[] = [{}];
			for (const menu of equipmentChoiceMenus(target, cls.slug, [option.letter])) {
				const choices = menu.options.filter(
					(choice) => !menu.usesToolProficiency || choice.proficiencyCapabilityId !== undefined,
				);
				if (choices.length === 0)
					throw new Error(
						`creation kit: empty ${cls.slug} ${option.letter} choice ${menu.sourceText}`,
					);
				selections = selections.flatMap((prior) =>
					choices.map((choice) => ({ ...prior, [menu.sourceText]: choice.entityDefId })),
				);
			}
			for (const selection of selections) {
				const id = creationKitActionId(cls.slug, option.letter, selection);
				if (keys.has(id)) throw new Error(`creation kit: catalog key collision ${id}`);
				keys.add(id);
				const writes: Record<string, unknown>[] = [];
				for (const item of equipmentRecipe(cls.slug, option.letter, target, selection)) {
					writes.push({
						InsertItem: {
							item_def_id: item.definitionId,
							count: item.count,
							destination:
								item.parentIndex === undefined
									? { ActorInventory: { actor_ref: "TargetActor" } }
									: { ObjectContainer: { object_ref: `InsertedItem:${item.parentIndex}` } },
						},
					});
					if (item.slotId !== undefined)
						writes.push({
							EquipItem: {
								actor_ref: "TargetActor",
								slot_id: item.slotId,
								source: {
									ActorInventoryItem: { actor_ref: "TargetActor", item_def_id: item.definitionId },
								},
							},
						});
				}
				writes.push({
					ModifyResource: {
						actor: "TargetActor",
						resource: CREATION_KIT_GRANTED_STATE_ID,
						delta_source: `${CREATION_KIT_GRANTED_VALUE} - target.stat('${CREATION_KIT_GRANTED_STATE_ID}')`,
					},
				});
				acts.push({
					id,
					capability: "frontier.transfer",
					predicate: `target.stat('${CREATION_KIT_GRANTED_STATE_ID}') == 0`,
					writes,
				});
			}
		}
	return acts;
}

export function creationKitDefinitions(target: AuthorTarget): VerbCall[] {
	return [
		buildMarkerResource({
			bundle: "dm",
			localId: "creation/kit-granted",
			displayName: "Creation kit granted",
			description:
				"Durable completion of one atomic source-backed starting kit. Seeded at zero on creation blueprints; set only with the whole kit consequence.",
			minValue: 0,
			maxValue: CREATION_KIT_GRANTED_VALUE,
			initialValue: 0,
		}).call,
		...authoredActCalls("dm", authoredCreationKits(target)),
	];
}
