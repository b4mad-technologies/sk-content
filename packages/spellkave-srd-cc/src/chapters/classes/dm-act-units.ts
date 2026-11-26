// pattern: identity-tag-capability-grant
// DOC-IMPL: scripted-dm-acts#values-descriptions-and-equipment
// pattern: blueprint-instance-override
// ADR-0155: finite authored selections, existing quantity facts and frame leaves.
import {
	type AuthoredAct,
	authoredActCalls,
} from "@spellkave/adventure-runtime/author/dm/authored-act";
import { equipmentDefinitions } from "@spellkave/adventure-runtime/author/dm/selected-equipment";
import { creationSheetStateIds } from "@spellkave/adventure-runtime/dm/creation/confirmation-plan";
import { SRD_CLASS_CATALOG } from "@spellkave/adventure-runtime/dm/data/srd-catalog";
import type { AuthorTarget } from "@spellkave/tool-authoring";
import { driveUnitScene } from "../verb-runner";
import { creationSheetInitializationActs } from "./creation-sheet-acts";
import { dmGrantCatalog } from "./dm-act-catalog";

const quantity = "actor.stat('core/dispatch_arg_quantity')";
const modify = (resource: string, delta_source: string) => ({
	ModifyResource: { actor: "TargetActor", resource, delta_source },
});
const tagWrite = (allowed_ids: string[], present = true) => ({
	SetEntityTag: { entity: "TargetActor", tag: { allowed_ids }, present },
});

export const dmSetStateIds = creationSheetStateIds;
export function srdDmActs(target: AuthorTarget): AuthoredAct[] {
	const catalogue = dmGrantCatalog(target);
	const acts: AuthoredAct[] = creationSheetInitializationActs(target);
	const add = (
		slug: string,
		capability: string,
		writes: Record<string, unknown>[],
		predicate?: string,
	) =>
		acts.push({
			id: `srd/dm/${slug}`,
			capability,
			writes,
			...(predicate === undefined ? {} : { predicate }),
		});
	for (const cls of SRD_CLASS_CATALOG)
		add(
			`advance/${cls.slug}`,
			"frontier.afflict",
			[
				tagWrite(
					catalogue.tags
						.filter((row) => row.tag.startsWith(`srd.advancement.${cls.slug}.`))
						.map((row) => row.tag),
				),
			],
			`target.has_tag('srd.class.${cls.slug}')`,
		);
	for (const [kind, ids] of Object.entries(catalogue.pickable))
		if (ids.length > 0)
			add(`train/${kind}`, "frontier.afflict", [
				tagWrite(ids.map((id) => `srd.feature.${id.replaceAll("/", ".")}`)),
			]);
	const tagDefinitions = target.lookup("tag_value_definitions", { bundle: "srd" });
	for (const kind of ["class", "species", "background"]) {
		const ids = tagDefinitions.flatMap((row) =>
			typeof row.tag === "string" && row.tag.startsWith(`srd.${kind}.`) ? [row.tag] : [],
		);
		add(`identify/${kind}`, "frontier.afflict", [tagWrite(ids)]);
		add(`retract/${kind}`, "frontier.afflict", [tagWrite(ids, false)]);
	}
	add("name", "frontier.set_state", [
		{ SetEntityText: { entity: "TargetActor", destination: "EntityName", max_chars: 64 } },
	]);
	for (const [kind, max_chars] of [
		["appearance", 280],
		["backstory", 512],
	] as const)
		add(`describe/${kind}`, "frontier.set_state", [
			{
				SetEntityText: {
					entity: "TargetActor",
					destination: { ObjectStateText: { state_id: `srd/${kind}` } },
					max_chars,
				},
			},
		]);
	for (const state of dmSetStateIds(target)) {
		const key = state.replaceAll("/", ".");
		add(`set/${key}`, "frontier.set_state", [
			modify(state, `${quantity} - target.stat('${state}')`),
		]);
		add(`clear/${key}`, "frontier.set_state", [modify(state, `-target.stat('${state}')`)]);
	}
	// The DM's revive is one way back. Owner decision D-1 (sk-jay0.1.55.42,
	// ledger/designs/solo-beta-definition.md) adds a second one the hero takes
	// itself, authored by the adventure (kavemouth author/respawn.ts).
	// Apply-then-remove keeps the act valid whether or not the condition is present.
	const clearCondition = (id: string): Record<string, unknown>[] => [
		{
			ApplyStatus: {
				condition_definition_id: id,
				target_kind: "entity",
				target_ref: "TargetActor",
			},
		},
		{
			RemoveCondition: {
				condition_definition_id: id,
				source_match: "Any",
				target_kind: "entity",
				target_ref: "TargetActor",
			},
		},
	];
	add("revive", "frontier.set_state", [
		...clearCondition("srd/condition/dead"),
		...clearCondition("srd/condition/unconscious"),
		modify("srd/hp", "1 - target.stat('srd/hp')"),
		modify("srd/death_save_failures", "0 - target.stat('srd/death_save_failures')"),
		modify("srd/death_save_successes", "0 - target.stat('srd/death_save_successes')"),
		modify("srd/death_save_last_roll", "0 - target.stat('srd/death_save_last_roll')"),
	]);
	add("award-xp", "frontier.set_state", [
		{
			ForEachActorInRadius: {
				center_ref: "TargetSpatialRef",
				predicate_source: "actor.has_tag('srd.party.heroes')",
				shape_id: "core/area/sphere",
				shape_params_json: '{"radius_m":60}',
				body: [
					{
						ModifyResource: {
							actor: "Actor",
							delta_source: "actor.stat('core/dispatch_arg_quantity')",
							resource: "srd/xp",
						},
					},
				],
			},
		},
	]);
	add(
		"spend-xp-value",
		"frontier.set_state",
		[modify("srd/xp_value", "-target.stat('srd/xp_value')")],
		"target.stat('srd/xp_value') > 0",
	);
	const itemIds = [...new Set(equipmentDefinitions(target).map((row) => row.entity_def_id))].sort();
	const insert = {
		InsertItem: {
			selection: { allowed_ids: itemIds },
			count: 1,
			destination: { ActorInventory: { actor_ref: "TargetActor" } },
		},
	};
	add("give", "frontier.transfer", [insert]);
	for (const row of target.lookup("equipment_slot_definitions", { bundle: "srd" })) {
		if (typeof row.slot_id !== "string") continue;
		add(`give-equipped/${row.slot_id}`, "frontier.transfer", [
			insert,
			{
				EquipItem: {
					actor_ref: "TargetActor",
					slot_id: row.slot_id,
					source: {
						ActorInventoryItem: { actor_ref: "TargetActor", selection: { allowed_ids: itemIds } },
					},
				},
			},
		]);
	}
	return acts;
}
export async function buildSrdDmActFragment(target: AuthorTarget): Promise<string> {
	return (
		"# GENERATED by src/chapters/classes/dm-act-units.ts — DO NOT EDIT.\n# pattern: identity-tag-capability-grant\n# pattern: blueprint-instance-override\n# pattern: derived-value-mechanism\n# pattern: draft-then-confirm-wizard\n" +
		(await driveUnitScene(
			"srd",
			[
				{
					toolName: "spellkave_write_rows",
					label: "hero-text-state-definitions",
					params: {
						bundle: "srd",
						kind: "object_state_definitions",
						rows: [
							{
								state_id: "srd/appearance",
								bundle_id: "srd",
								target_kind: "entity",
								display_name: "Appearance",
								default_visibility: "Public",
								description:
									"The hero's adopted appearance. Existing Text values are updated by the authored describe act.",
							},
							{
								state_id: "srd/backstory",
								bundle_id: "srd",
								target_kind: "entity",
								display_name: "Backstory",
								default_visibility: "Hidden",
								description:
									"The hero's adopted backstory, hidden until disclosed. Existing Text values are updated by the authored describe act.",
							},
						],
					},
				},
				...authoredActCalls("srd", srdDmActs(target)),
			],
			target,
		))
	);
}
