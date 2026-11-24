/**
 * Author the unplaced Rogue blueprint and starter kit. Accepting the
 * invitation spawns a world-owned actor at the inn with an atomic spawn marker.
 * Shared creation composition supplies initial sheet rows at build time.
 * The host assigns a separate durable Service identity through Aldwin's
 * authored npc-host presence and activates the dynamic cast seat.
 * Durable level/HP markers resume receipt-ordered advancement after restart.
 */

import {
	type CompanionCreationConfig,
	companionHpAtLevel,
	companionScores,
	renderCompanionCreation,
	renderCompanionLevelBump,
} from "@spellkave/adventure-runtime/dm/creation/companion";
import type { AbilityScores } from "@spellkave/adventure-runtime/dm/creation/draft-state";
import type { VerbCall } from "@spellkave/adventure-runtime/dm/lib";
import { SRD_BUNDLE_ID } from "@spellkave/adventure-runtime/srd-ids";
import type { AuthorTarget } from "@spellkave/tool-authoring";
import { elvenMiniBundleHeaderCall } from "./bundle-header.ts";
import { ROGUE_COMPANION_ENTITY_KEY } from "./companion-party.ts";
import { elvenMiniCreationStarterKit } from "./creation-kit.ts";
import { BUNDLE, GRAPHS, nodeId } from "./lib/ids.ts";
import { QUESTS } from "./quests.ts";

/** Authored inn hearth for the waiting companion. */
export const ROGUE_DEFAULT_JOIN_NODE = nodeId(GRAPHS.inn, "common_room");

export const ROGUE_COMPANION_NAME = "Aldwin's Blade";
export const ROGUE_CLASS_SLUG = "rogue";
export const ROGUE_SPECIES_SLUG = "human";
export const ROGUE_BACKGROUND_SLUG = "criminal";

/** The elven-mini rogue companion config for the generic creation renderers. */
export const ELVEN_MINI_ROGUE: CompanionCreationConfig = {
	bundle: BUNDLE,
	entityKey: ROGUE_COMPANION_ENTITY_KEY,
	classSlug: ROGUE_CLASS_SLUG,
	speciesSlug: ROGUE_SPECIES_SLUG,
	backgroundSlug: ROGUE_BACKGROUND_SLUG,
	// Default rogue skills — stealth + investigation (L1 package).
	skillIds: [
		"srd/skill/stealth",
		"srd/skill/investigation",
		"srd/skill/sleight-of-hand",
		"srd/skill/perception",
	],
	name: ROGUE_COMPANION_NAME,
	entityDefId: `${SRD_BUNDLE_ID}/creature/scout`,
	description:
		"A quiet blade Aldwin trusts — joined the party at the hero's second rung " +
		"(skirmisher companion; SRD Rogue L2 sheet via creation completeness).",
	targetLevel: 2,
	kitDescriptions: {
		Longsword: "A longsword carried with the companion's starting equipment.",
		"Field Kit": "A worn traveler's pack.",
		Torch: "A pitch-soaked torch.",
		Rations: "One day's travel rations.",
	},
	starterKit: elvenMiniCreationStarterKit(),
	bundleHeaderCall: elvenMiniBundleHeaderCall,
};

/** Rogue standard-array scores (classCreationData). */
export function rogueCompanionScores(): AbilityScores {
	return companionScores(ROGUE_CLASS_SLUG);
}

/** Level-2 HP: L1 max + one fixed level-up die (average ladder). */
export function rogueCompanionHpAtLevel2(scores: AbilityScores = rogueCompanionScores()): number {
	return companionHpAtLevel(ROGUE_CLASS_SLUG, ELVEN_MINI_ROGUE.targetLevel, scores);
}

/**
 * Build-time composition rows for the Rogue's source-backed L1 sheet and kit.
 * authoredRogueCompanion folds these rows into an unplaced blueprint; the
 * accepted invitation spawns it through an authored act. Runtime DM code
 * does not apply these composition rows.
 */
export function renderCompanionRogueCreation(args: {
	placeNodeId: string;
	/** Optional AuthorTarget so completeness can filter capability grants. */
	target?: AuthorTarget;
	name?: string;
}): VerbCall[] {
	return renderCompanionCreation(ELVEN_MINI_ROGUE, args);
}

/**
 * Build-time compatibility helper for composing a source-backed L2 sheet.
 * Runtime companion advancement uses authored state acts.
 */
export function renderCompanionRogueLevelBump(args: { scores?: AbilityScores } = {}): VerbCall[] {
	return renderCompanionLevelBump(ELVEN_MINI_ROGUE, args);
}

export { ROGUE_COMPANION_ENTITY_KEY };

/** Unplaced, source-backed L1 blueprint; only invitation acceptance spawns it. */
export const ROGUE_COMPANION_DEF_ID = `${BUNDLE}/adventure/rogue-companion`;
export const ROGUE_JOIN_ACTION_ID = `${BUNDLE}/dm/join-rogue`;
export const ROGUE_HOST_BINDING_ID = `${BUNDLE}/aldwin-npc-host`;

export function authoredRogueCompanion(target?: AuthorTarget): VerbCall[] {
	if (!target) throw new Error("Rogue blueprint composition requires the source author target.");
	const base = target
		.lookup("entity_definitions")
		.find((row) => row.entity_def_id === ELVEN_MINI_ROGUE.entityDefId);
	if (!base) throw new Error("Rogue blueprint source definition is missing.");
	const composition = renderCompanionRogueCreation({
		placeNodeId: ROGUE_DEFAULT_JOIN_NODE,
		target,
	});
	const rowsFor = (kind: string) =>
		composition.flatMap((call) =>
			call.toolName === "spellkave_write_rows" && call.params.kind === kind
				? (call.params.rows as Record<string, unknown>[])
				: [],
		);
	const inherited = (kind: string): Record<string, unknown>[] =>
		target
			.lookup(kind)
			.filter((row) => row.entity_def_id === ELVEN_MINI_ROGUE.entityDefId)
			.map((row) => ({ ...row, bundle_id: BUNDLE, entity_def_id: ROGUE_COMPANION_DEF_ID }));
	const states = new Map(
		inherited("entity_definition_initial_state").map((row) => [String(row.state_id), row]),
	);
	for (const row of rowsFor("object_state")) {
		if (row.entity_key !== ROGUE_COMPANION_ENTITY_KEY) continue;
		states.set(String(row.state_id), {
			bundle_id: BUNDLE,
			entity_def_id: ROGUE_COMPANION_DEF_ID,
			state_id: row.state_id,
			value_int: row.value_int,
		});
	}
	for (const state_id of [
		"srd/xp",
		...QUESTS.map((quest) => `${BUNDLE}/quest/${quest.id}/xp-awarded`),
	])
		states.set(state_id, {
			bundle_id: BUNDLE,
			entity_def_id: ROGUE_COMPANION_DEF_ID,
			state_id,
			value_int: 0,
		});
	const capabilities = new Map(
		inherited("entity_definition_initial_capability").map((row) => [
			String(row.capability_id),
			row,
		]),
	);
	for (const row of rowsFor("actor_capabilities")) {
		capabilities.set(String(row.capability_id), {
			bundle_id: BUNDLE,
			entity_def_id: ROGUE_COMPANION_DEF_ID,
			capability_id: row.capability_id,
			extent_kind_ref: row.extent_kind_ref,
			extent_ref: row.extent_ref,
		});
	}
	const tags = new Set(
		target
			.lookup("entity_definition_tag")
			.filter((row) => row.entity_def_id === ELVEN_MINI_ROGUE.entityDefId)
			.map((row) => String(row.tag)),
	);
	for (const call of composition)
		if (
			call.toolName === "spellkave_tag_entity" &&
			call.params.entity_key === ROGUE_COMPANION_ENTITY_KEY
		)
			for (const tag of call.params.tags as string[]) tags.add(tag);
	const kit = elvenMiniCreationStarterKit();
	const fieldKit = `${BUNDLE}/item/rogue-field-kit`;
	const write = (kind: string, rows: readonly Record<string, unknown>[]): VerbCall => ({
		toolName: "spellkave_write_rows",
		label: `rogue-blueprint-${kind}`,
		params: { bundle: BUNDLE, kind, rows },
	});
	return [
		...kit.starterKitDefinitions(),
		{
			toolName: "spellkave_define_entity_type",
			label: "rogue-field-kit-blueprint",
			params: {
				bundle: BUNDLE,
				id: "item/rogue-field-kit",
				display_name: "Field Kit",
				description: ELVEN_MINI_ROGUE.kitDescriptions?.["Field Kit"],
				tags: ["srd.item.container", "srd.item.gear"],
				initial_containment: [
					{ contained_entity_def_id: kit.torchDefId, quantity: 1 },
					{ contained_entity_def_id: kit.rationsDefId, quantity: 3 },
				],
			},
		},
		write("entity_definitions", [
			{
				...base,
				bundle_id: BUNDLE,
				entity_def_id: ROGUE_COMPANION_DEF_ID,
				display_name: ROGUE_COMPANION_NAME,
				description: ELVEN_MINI_ROGUE.description,
			},
		]),
		write(
			"entity_definition_tag",
			[...tags].map((tag) => ({
				bundle_id: BUNDLE,
				entity_def_id: ROGUE_COMPANION_DEF_ID,
				tag,
				source: "manifest",
			})),
		),
		write("entity_definition_initial_state", [...states.values()]),
		write("entity_definition_initial_capability", [...capabilities.values()]),
		...[
			"entity_definition_initial_condition",
			"entity_definition_equip_modifier",
			"entity_definition_item_dsl_source",
		].flatMap((kind) => {
			const rows = inherited(kind);
			return rows.length ? [write(kind, rows)] : [];
		}),
		write("entity_definition_initial_containment", [
			{
				bundle_id: BUNDLE,
				entity_def_id: ROGUE_COMPANION_DEF_ID,
				contained_entity_def_id: fieldKit,
				quantity: 1,
			},
			// The original Scout placement seeded this before the authored longsword replaced its slot.
			...inherited("entity_definition_initial_equipment").map((row) => ({
				bundle_id: BUNDLE,
				entity_def_id: ROGUE_COMPANION_DEF_ID,
				contained_entity_def_id: row.equipped_entity_def_id,
				quantity: 1,
			})),
		]),
		write("entity_definition_initial_equipment", [
			{
				bundle_id: BUNDLE,
				entity_def_id: ROGUE_COMPANION_DEF_ID,
				equipped_entity_def_id: kit.heroWeaponDefId,
				slot_id: kit.heroWeaponSlotId,
			},
		]),
	];
}
