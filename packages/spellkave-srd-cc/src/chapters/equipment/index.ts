// Chapter generator: "Equipment" (SRD 5.2.1) — E1 (Chain Mail, `ledger/
// designs/equipment-ac-target-fact.md`), E2 (the remaining 12 armors), E3
// (all 38 weapons). `ledger/equipment.md` carries the chapter work-plan
// checklist.
//
// PER-ENTITY FIXTURE LAYOUT (operator directive, 2026-08-06): armor and
// weapons each render ONE FILE PER ITEM under `base/equipment/armor/` /
// `base/equipment/weapons/` — `<slug>.toml` — never a collection file.
// Coverage/ledger unit granularity is UNCHANGED, only the rendered file
// layout is per-entity. Each item's own `entity_definitions` +
// `modifier_templates` + `modifier_template_tag` rows (armor) stay together
// in ONE scene (`driveUnitScene`) since they cross-reference each other
// WITHIN that one item — `modifier_template_tag` needs its own
// `modifier_template_id` to exist in the SAME workspace (MF-VAL-225-class).
// The `srd/ac` axis itself (`modifier_target_definitions`, owned by Playing
// the Game) resolves through the PUBLIC `target` augmentation path instead
// of being copied into every item's own fragment (finding #38 / issue
// #2092) — proven per-item empirically: splitting Chain Mail out of the
// former all-armor-in-one-scene shape into its own single-item scene still
// resolves `applies_to = "srd/ac"` via `target` alone, the SAME mechanism
// the former combined scene already relied on (`buildArmorFragment`'s own
// pre-split doc comment). Shared, non-per-entity infrastructure (the Chest/
// Off Hand equipment slots; the weapon Category/Range/Property/Mastery tag
// catalog) still ships as ITS OWN small descriptively-named file — it is not
// itself an "entity" a DM would browse.
import type { AuthorTarget } from "@spellkave/tool-authoring";
import {
	type ChapterReaderProseResult,
	type ReaderSubjectAttachment,
	renderReaderProseForDocuments,
} from "../../compendium-metadata";
import { readArmorFlavor, readToolFlavor } from "../../flavor/read";
import {
	armorTableText,
	markdownHeadingBlock,
	open5eStringField,
	srdTextAttachmentWriteCall,
	srdTextNamespaceWriteCall,
	weaponTableText,
	withSrdTextNamespace,
} from "../../text";
import type { ChapterUnitSummary } from "../chapter-types";
import { AC_RESOURCE_ID } from "../playing-the-game/armor-class-units";
import { driveUnitFragment, driveUnitScene, type VerbCall } from "../verb-runner";
import { buildAreaHazardsFragment } from "./area-hazards.ts";
import {
	armorAcModifier,
	CHEST_SLOT_LOCAL_ID,
	chainMailUnit,
	type GeneralArmorUnit,
	MAIN_HAND_SLOT_LOCAL_ID,
	OFF_HAND_SLOT_LOCAL_ID,
	remainingArmorUnits,
} from "./armor-units";
import { choiceToolProficiencyCalls, choiceToolTagCall, choiceToolUnits } from "./choice-tools.ts";
import { buildFocusGearFragments } from "./focus-gear.ts";
import { buildFoodDrinkFragments } from "./food-drink.ts";
import { buildItemFamilyFragment } from "./item-families.ts";
import {
	armorNumberInitialStates,
	costWeightInitialStates,
	itemMeasureResourceCalls,
} from "./item-measures";
import { buildMountVehicleFragments } from "./mounts-vehicles.ts";
import { buildServiceFragments } from "./services.ts";
import { equipmentSlotDefinitionRows } from "./slot-definition-rows";
import { buildStartingGearFragments } from "./starting-gear.ts";
import { buildThrownConsumablesFragment } from "./thrown-consumables.ts";
import {
	calligraphersSuppliesUnit,
	catalogueToolUnits,
	gamingSetDiceUnit,
	thievesToolsUnit,
} from "./tools-units";
import {
	type WeaponDamageSourceUnit,
	weaponAttackRangeSourceCall,
	weaponDamageMagnitudeExpr,
	weaponDamageSourceCall,
} from "./weapon-damage-source-units";
import {
	buildWeaponTagValueUnits,
	damageTypeTag,
	type WeaponTagValueUnit,
	weaponFinessePropertyTag,
} from "./weapon-tag-values";
import {
	buildWeaponDescription,
	buildWeaponUnits,
	type WeaponUnit,
	weaponAttackRangeFeet,
	weaponEntityTags,
} from "./weapon-units";

export const BUNDLE_ID = "srd";

const ITEM_MEASURE_SCENE_OPTIONS = { omitRowKinds: ["resource_definitions"] as const };
const CHAIN_MAIL_ENTITY_ID = `${BUNDLE_ID}/armor/chain-mail`;

const CHAIN_MAIL_ANCHOR = "equipment.md § Armor (Chain Mail row, Heavy Armor table)";
const WEAPON_TABLE_ANCHOR =
	"equipment.md § Weapons (Simple/Martial x Melee/Ranged subsections); WeaponProperty.json (Weapon " +
	"Properties + Weapon Mastery tables)";

export interface EquipmentOutput {
	/** relPath (under `fixtures/`) -> content — ONE FILE PER ARMOR/WEAPON (per-entity fixture layout, module header) plus the shared armor-slots/weapon-tag-values/tools files. */
	fragments: Record<string, string>;
	units: ChapterUnitSummary[];
}

interface ToolFragmentSpec {
	slug: string;
	label: string;
	entityId: string;
	displayName: string;
	description: string;
	sourcePk: string;
	choiceCategory?: "artisan" | "instrument";
}

/** One tool's own file (`base/equipment/tools/<slug>.toml`) — per-entity fixture layout (operator directive 2026-08-06), same posture as armor/weapons. */
async function buildToolFragment(
	spec: ToolFragmentSpec,
): Promise<{ path: string; toml: string; units: ChapterUnitSummary[] }> {
	const body = await driveUnitScene(
		"srd",
		[
			srdTextNamespaceWriteCall(),
			choiceToolTagCall(),
			...itemMeasureResourceCalls(),
			{
				toolName: "spellkave_define_entity_type",
				label: spec.label,
				params: {
					bundle: "srd",
					id: spec.entityId.slice("srd/".length),
					display_name: spec.displayName,
					description: readToolFlavor(spec.entityId.slice("srd/tool/".length)).body,
					tags: [
						"srd.item",
						"srd.tool",
						...(spec.choiceCategory === undefined
							? []
							: [`srd.tool.category.${spec.choiceCategory}`]),
					],
					initial_states: costWeightInitialStates(spec.sourcePk),
				},
			},
			srdTextAttachmentWriteCall({
				targetKind: "entity_definition",
				targetRef: spec.entityId,
				extracted: open5eStringField("Item.json", spec.sourcePk),
			}),
		],
		undefined,
		ITEM_MEASURE_SCENE_OPTIONS,
	);
	const header = [
		"# GENERATED by src/chapters/equipment/index.ts — DO NOT EDIT BY HAND.",
		"# Regenerate: pnpm --filter @spellkave/srd-cc run generate",
		"#",
		`# Equipment tool identity: ${spec.displayName}. Proficiency capabilities`,
		"# and rule behavior are separate from this physical identity.",
		`# Source: cache/open5e/Item.json pk='${spec.sourcePk}'.`,
		"",
		"",
	].join("\n");
	return {
		path: `base/equipment/tools/${spec.slug}.toml`,
		toml: header + body,
		units: [{ kind: "entity_definitions", id: spec.entityId, sourcePk: spec.sourcePk }],
	};
}

async function buildToolsFragments(): Promise<{
	fragments: Record<string, string>;
	units: ChapterUnitSummary[];
}> {
	const thievesTools = thievesToolsUnit();
	const calligraphersSupplies = calligraphersSuppliesUnit();
	const gamingSetDice = gamingSetDiceUnit();
	const results = await Promise.all([
		buildToolFragment({
			slug: "thieves-tools",
			label: "entity:thieves-tools",
			entityId: thievesTools.entityId,
			displayName: thievesTools.name,
			description: `${thievesTools.name} — a tool.`,
			sourcePk: thievesTools.sourcePk,
		}),
		// Calligrapher's Supplies + Gaming Set (Dice): net-new tool INSTANCES,
		// consumer = Character Origins O1 (`ledger/character-origins.md`) —
		// Acolyte/Sage's Tool Proficiency and Soldier's "Choose one kind of
		// Gaming Set" (concrete authorial pick: Dice). Authored here after the
		// SAME thieves-tools idiom (tool identity only; the proficiency
		// capability lives in playing-the-game/equipment-proficiencies).
		buildToolFragment({
			slug: "calligraphers-supplies",
			label: "entity:calligraphers-supplies",
			entityId: calligraphersSupplies.entityId,
			displayName: calligraphersSupplies.name,
			description: `${calligraphersSupplies.name} — a tool.`,
			sourcePk: calligraphersSupplies.sourcePk,
			choiceCategory: "artisan",
		}),
		buildToolFragment({
			slug: "gaming-set-dice",
			label: "entity:gaming-set-dice",
			entityId: gamingSetDice.entityId,
			displayName: gamingSetDice.name,
			description: `${gamingSetDice.name} — a tool.`,
			sourcePk: gamingSetDice.sourcePk,
		}),
		...catalogueToolUnits().map((unit) =>
			buildToolFragment({
				slug: unit.entityId.slice("srd/tool/".length),
				label: `entity:${unit.entityId}`,
				entityId: unit.entityId,
				displayName: unit.name,
				description: `${unit.name} — a tool.`,
				sourcePk: unit.sourcePk,
			}),
		),
		...choiceToolUnits()
			.filter((unit) => unit.entityId !== calligraphersSupplies.entityId)
			.map((unit) =>
				buildToolFragment({
					slug: unit.entityId.slice("srd/tool/".length),
					label: `entity:${unit.entityId}`,
					entityId: unit.entityId,
					displayName: unit.name,
					description: `${unit.name} — a tool.`,
					sourcePk: unit.pk,
					choiceCategory: unit.choiceCategory,
				}),
			),
	]);
	const fragments: Record<string, string> = {};
	const units: ChapterUnitSummary[] = [];
	for (const result of results) {
		fragments[result.path] = result.toml;
		units.push(...result.units);
	}
	const choiceTags = [
		...new Set(choiceToolUnits().map((unit) => `srd.tool.category.${unit.choiceCategory}`)),
	];
	fragments["base/equipment/tool-choice-tags.toml"] = await driveUnitScene(
		"srd",
		[choiceToolTagCall(), ...choiceToolProficiencyCalls()],
		undefined,
		{
			onlyTagValueDefinitionTags: choiceTags,
		},
	);
	units.push(
		...choiceTags.map((tag) => ({
			kind: "tag_value_definitions",
			id: tag,
			sourcePk: "equipment.md:622-749",
		})),
	);
	return { fragments, units };
}

/**
 * Player-facing armor facts derived from the cached Armor table. This prose
 * describes the source rules; implementation coverage belongs in chapter docs.
 */
function remainingArmorDescription(unit: GeneralArmorUnit): string {
	return readArmorFlavor(unit.slug).body;
}

/** Shared armor infrastructure: the Chest + Off Hand equipment slots, own file — not itself an "entity", every armor's own file references it only by predicate string. */
async function buildArmorSlotsFragment(): Promise<{
	path: string;
	toml: string;
	units: ChapterUnitSummary[];
}> {
	const body = await driveUnitFragment(BUNDLE_ID, {
		toolName: "spellkave_write_rows",
		label: "equipment-slot:chest+off-hand+main-hand",
		params: {
			bundle: BUNDLE_ID,
			kind: "equipment_slot_definitions",
			rows: equipmentSlotDefinitionRows(),
		},
	});
	const header = [
		"# GENERATED by src/chapters/equipment/index.ts — DO NOT EDIT BY HAND.",
		"# Regenerate: pnpm --filter @spellkave/srd-cc run generate",
		"#",
		"# Shared armor infrastructure (self-sufficiency, AGENTS.md + ledger/",
		"# archive/general-decisions.md's 2026-07-28 operator ruling): the Chest",
		"# and Off Hand equipment_slot_definitions rows plus the Main Hand weapon",
		'# slot, all srd-owned and never the "core"',
		"# bundle's own server-bootstrapped equivalents. Every armor entity",
		"# references one of these by slot_compatibility_predicate string, not a",
		"# validated foreign key — this file's own contents don't need to be",
		"# co-located with any single armor's own fragment.",
		"",
		"",
	].join("\n");
	return {
		path: "base/equipment/armor-slots.toml",
		toml: header + body,
		units: [
			{
				kind: "equipment_slot_definitions",
				id: `${BUNDLE_ID}/${CHEST_SLOT_LOCAL_ID}`,
				sourcePk: "",
			},
			{
				kind: "equipment_slot_definitions",
				id: `${BUNDLE_ID}/${OFF_HAND_SLOT_LOCAL_ID}`,
				sourcePk: "",
			},
			{
				kind: "equipment_slot_definitions",
				id: `${BUNDLE_ID}/${MAIN_HAND_SLOT_LOCAL_ID}`,
				sourcePk: "",
			},
		],
	};
}

/**
 * Chain Mail (E1) — its own file. Identity + always-active FlatSet AC
 * modifier, entity+modifier+modifier_tag in ONE scene (module header: they
 * cross-reference each other WITHIN this one item). The central Playing-the-
 * Game AC axis resolves through `target` alone (finding #38 / issue #2092),
 * proven per-item: this split-out single-item scene still resolves
 * `applies_to = "srd/ac"` without a local `modifier_target_definitions` row.
 */
async function buildChainMailFragment(
	target: AuthorTarget,
): Promise<{ path: string; toml: string; units: ChapterUnitSummary[] }> {
	const chainMail = chainMailUnit();
	const chainMailModifierId = `${BUNDLE_ID}/armor/chain-mail/ac_bonus`;
	const chestSlotId = `${BUNDLE_ID}/${CHEST_SLOT_LOCAL_ID}`;

	const calls: VerbCall[] = [
		...itemMeasureResourceCalls(),
		{
			toolName: "spellkave_define_entity_type",
			label: "entity:chain-mail",
			params: {
				bundle: BUNDLE_ID,
				id: "armor/chain-mail",
				display_name: chainMail.displayName,
				description: remainingArmorDescription({ ...chainMail, weightClass: "heavy" }),
				slot_compatibility_predicate: `slot_id == "${chestSlotId}"`,
				// Dotted, "srd."-namespaced (NOT the sister's own bare "core.item"/
				// "armor"/"armor.heavy" tags): this bundle's own declared tag
				// vocabulary (`bundle-row.ts`'s `tag_prefixes`, the bare `srd` entry)
				// only covers "srd."-prefixed tags — a flat or undeclared-prefix tag
				// would trip MF-VAL-297/298 (Warning), which `pipeline.test.ts`
				// asserts zero of for this bundle.
				tags: ["srd.item", "srd.armor", "srd.armor.heavy"],
				initial_states: [
					...costWeightInitialStates(chainMail.sourcePk),
					...armorNumberInitialStates(chainMail),
				],
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "modifier:chain-mail-ac",
			params: {
				bundle: BUNDLE_ID,
				kind: "modifier_templates",
				rows: [
					{
						modifier_template_id: chainMailModifierId,
						bundle_id: BUNDLE_ID,
						applies_to: AC_RESOURCE_ID,
						display_name: `${chainMail.displayName} AC ${chainMail.acBase}`,
						predicate_source: "",
						modifier_expression_source: `let ac = ${chainMail.acBase}; ac`,
						priority: 0,
						delta_kind: "FlatSet",
						description:
							`Static AC ${chainMail.acBase} (Armor.json ac_base, pk '${chainMail.sourcePk}') — ` +
							"FlatSet, not Plus: Chain Mail's AC does not compose with a base value, it REPLACES " +
							"it outright (ac_add_dexmod: false — no Dexterity term to add on top). Live-wired " +
							"to the wearer via entity_definition_equip_modifier (BL-19).",
					},
				],
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "modifier-tag:chain-mail-ac",
			params: {
				bundle: BUNDLE_ID,
				kind: "modifier_template_tag",
				rows: [
					{
						modifier_template_id: chainMailModifierId,
						tag: "srd.armor",
						bundle_id: BUNDLE_ID,
						source: "manifest",
					},
					{
						modifier_template_id: chainMailModifierId,
						tag: "srd.armor.heavy",
						bundle_id: BUNDLE_ID,
						source: "manifest",
					},
				],
			},
		},
		// pattern: equip-gated-modifier
		{
			toolName: "spellkave_write_rows",
			label: "equip-modifier:chain-mail-ac",
			params: {
				bundle: BUNDLE_ID,
				kind: "entity_definition_equip_modifier",
				rows: [
					{
						bundle_id: BUNDLE_ID,
						entity_def_id: CHAIN_MAIL_ENTITY_ID,
						modifier_template_id: chainMailModifierId,
					},
				],
			},
		},
	];

	calls.unshift(srdTextNamespaceWriteCall());
	calls.push(
		srdTextAttachmentWriteCall({
			targetKind: "entity_definition",
			targetRef: CHAIN_MAIL_ENTITY_ID,
			extracted: armorTableText(chainMail.sourcePk),
		}),
	);
	const body = await driveUnitScene(BUNDLE_ID, calls, target, ITEM_MEASURE_SCENE_OPTIONS);
	const header = [
		"# GENERATED by src/chapters/equipment/index.ts — DO NOT EDIT BY HAND.",
		"# Regenerate: pnpm --filter @spellkave/srd-cc run generate",
		"#",
		"# pattern: equip-gated-modifier",
		"#",
		"# Equipment slice E1 (design: ledger/designs/equipment-ac-target-fact.md):",
		"# Chain Mail identity plus its Armor.json-sourced static FlatSet 16 AC",
		"# modifier wired to the wearer via entity_definition_equip_modifier",
		"# (BL-19 / finding #37 resolved). The shared srd/ac resource and modifier",
		"# axis are owned by base/playing-the-game/armor-class.toml; Equipment only",
		"# consumes it through target augmentation (finding #38).",
		"",
		`# anchor: ${CHAIN_MAIL_ANCHOR}`,
		"",
		"",
	].join("\n");
	return {
		path: "base/equipment/armor/chain-mail.toml",
		toml: header + body,
		units: [
			{ kind: "entity_definitions", id: CHAIN_MAIL_ENTITY_ID, sourcePk: chainMail.sourcePk },
			{ kind: "modifier_templates", id: chainMailModifierId, sourcePk: chainMail.sourcePk },
			{
				kind: "entity_definition_equip_modifier",
				id: `${CHAIN_MAIL_ENTITY_ID} -> ${chainMailModifierId}`,
				sourcePk: chainMail.sourcePk,
			},
		],
	};
}

/**
 * One E2 armor (`ledger/equipment.md` "E2 Remaining Armor") — its own file,
 * entity+modifier+modifier_tag in ONE scene (same intra-item cross-reference
 * reasoning as Chain Mail's own fragment).
 */
async function buildRemainingArmorFragment(
	unit: GeneralArmorUnit,
	chestSlotId: string,
	offHandSlotId: string,
	target: AuthorTarget,
): Promise<{ path: string; toml: string; units: ChapterUnitSummary[] }> {
	const slotId = unit.weightClass === "shield" ? offHandSlotId : chestSlotId;
	const entityId = `${BUNDLE_ID}/armor/${unit.slug}`;
	const modifierId = `${entityId}/ac_bonus`;
	const acModifier = armorAcModifier(unit);
	const tags = ["srd.item", "srd.armor", `srd.armor.${unit.weightClass}`];
	const description = remainingArmorDescription(unit);
	const calls: VerbCall[] = [
		...itemMeasureResourceCalls(),
		{
			toolName: "spellkave_define_entity_type",
			label: `entity:armor/${unit.slug}`,
			params: {
				bundle: BUNDLE_ID,
				id: `armor/${unit.slug}`,
				display_name: unit.displayName,
				description,
				slot_compatibility_predicate: `slot_id == "${slotId}"`,
				tags,
				initial_states: [
					...costWeightInitialStates(unit.sourcePk),
					...armorNumberInitialStates(unit),
				],
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: `modifier:armor/${unit.slug}-ac`,
			params: {
				bundle: BUNDLE_ID,
				kind: "modifier_templates",
				rows: [
					{
						modifier_template_id: modifierId,
						bundle_id: BUNDLE_ID,
						applies_to: AC_RESOURCE_ID,
						display_name: `${unit.displayName} AC`,
						predicate_source: "",
						modifier_expression_source: acModifier.expression,
						priority: 0,
						delta_kind: acModifier.deltaKind,
						description,
					},
				],
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: `modifier-tag:armor/${unit.slug}-ac`,
			params: {
				bundle: BUNDLE_ID,
				kind: "modifier_template_tag",
				rows: tags
					.filter((tag) => tag !== "srd.item")
					.map((tag) => ({
						modifier_template_id: modifierId,
						tag,
						bundle_id: BUNDLE_ID,
						source: "manifest",
					})),
			},
		},
		// pattern: equip-gated-modifier
		{
			toolName: "spellkave_write_rows",
			label: `equip-modifier:armor/${unit.slug}-ac`,
			params: {
				bundle: BUNDLE_ID,
				kind: "entity_definition_equip_modifier",
				rows: [
					{
						bundle_id: BUNDLE_ID,
						entity_def_id: entityId,
						modifier_template_id: modifierId,
					},
				],
			},
		},
	];
	calls.unshift(srdTextNamespaceWriteCall());
	calls.push(
		srdTextAttachmentWriteCall({
			targetKind: "entity_definition",
			targetRef: entityId,
			extracted: armorTableText(unit.sourcePk),
		}),
	);
	const body = await driveUnitScene(BUNDLE_ID, calls, target, ITEM_MEASURE_SCENE_OPTIONS);
	const header = [
		"# GENERATED by src/chapters/equipment/index.ts — DO NOT EDIT BY HAND.",
		"# Regenerate: pnpm --filter @spellkave/srd-cc run generate",
		"#",
		"# pattern: equip-gated-modifier",
		"#",
		`# Equipment E2 (ledger/equipment.md 'E2 Remaining Armor'): ${unit.displayName}`,
		`# (${unit.weightClass} armor). AC formula per armor-units.ts's own`,
		"# armorAcModifier doc comment. Wired to wearer via entity_definition_equip_modifier",
		"# (BL-19 / finding #37 resolved).",
		"",
		"",
	].join("\n");
	return {
		path: `base/equipment/armor/${unit.slug}.toml`,
		toml: header + body,
		units: [
			{ kind: "entity_definitions", id: entityId, sourcePk: unit.sourcePk },
			{ kind: "modifier_templates", id: modifierId, sourcePk: unit.sourcePk },
			{
				kind: "entity_definition_equip_modifier",
				id: `${entityId} -> ${modifierId}`,
				sourcePk: unit.sourcePk,
			},
		],
	};
}

/** All 13 armor fragments (Chain Mail + the 12 E2 armors) plus the shared slots file — `ledger/equipment.md`'s full Armor axis. */
async function buildArmorFragments(
	target: AuthorTarget,
): Promise<{ fragments: Record<string, string>; units: ChapterUnitSummary[] }> {
	const chestSlotId = `${BUNDLE_ID}/${CHEST_SLOT_LOCAL_ID}`;
	const offHandSlotId = `${BUNDLE_ID}/${OFF_HAND_SLOT_LOCAL_ID}`;
	const remaining = remainingArmorUnits();

	const results = await Promise.all([
		buildArmorSlotsFragment(),
		buildChainMailFragment(target),
		...remaining.map((unit) =>
			buildRemainingArmorFragment(unit, chestSlotId, offHandSlotId, target),
		),
	]);

	const fragments: Record<string, string> = {};
	const units: ChapterUnitSummary[] = [];
	for (const result of results) {
		fragments[result.path] = result.toml;
		units.push(...result.units);
	}
	return { fragments, units };
}

function weaponTagRows(units: readonly WeaponTagValueUnit[]): Record<string, unknown>[] {
	return units.map(({ tag, prefix, description }) => ({
		tag,
		prefix,
		bundle_id: BUNDLE_ID,
		description,
	}));
}

function weaponTagWriteCall(units: readonly WeaponTagValueUnit[], label: string): VerbCall {
	return {
		toolName: "spellkave_write_rows",
		label,
		params: { bundle: BUNDLE_ID, kind: "tag_value_definitions", rows: weaponTagRows(units) },
	};
}

/**
 * E3's own `tag_value_definitions` catalog (`weapon-tag-values.ts`'s own
 * header: identity + Category + Range + Property/Mastery, 30 rows) — ships
 * ONCE via a dedicated `base/equipment/weapon-tag-values.toml` fragment,
 * mirrors `monsters/index.ts`'s own `buildTagValuesFragment` for Size/CR.
 */
async function buildWeaponTagValuesFragment(): Promise<{
	toml: string;
	units: ChapterUnitSummary[];
}> {
	const tagDefinitions = buildWeaponTagValueUnits();
	const toml = await driveUnitFragment(
		BUNDLE_ID,
		weaponTagWriteCall(tagDefinitions, "weapon-tag-vocabulary"),
		{ onlyTagValueDefinitionTags: tagDefinitions.map((definition) => definition.tag) },
	);
	const header = [
		"# GENERATED by src/chapters/equipment/index.ts (weapon-tag-values.ts) — DO NOT EDIT BY HAND.",
		"# Regenerate: pnpm --filter @spellkave/srd-cc run generate",
		"#",
		`# Equipment E3's OWN tag_value_definitions catalog: ${tagDefinitions.length} rows — srd.weapon`,
		"# (identity), srd.weapon.category.<simple|martial>, srd.weapon.range.<melee|",
		"# ranged>, and srd.weapon.property.<slug>/srd.weapon.mastery.<slug> (the",
		"# reference-tables-as-tag-metadata pattern, AGENTS.md — each row's own",
		"# description carries WeaponProperty.json's full desc text, source pk retained).",
		"# Source: cache/open5e/Weapon.json + WeaponProperty.json.",
		"",
		"",
	].join("\n");
	const units: ChapterUnitSummary[] = tagDefinitions.map((definition) => ({
		kind: "tag_value_definitions",
		id: definition.tag,
		sourcePk: definition.sourcePk,
	}));
	return { toml: header + toml, units };
}

/**
 * One complete E3 weapon aggregate (`ledger/equipment.md` "E3 Weapons") —
 * identity, tags, damage source, damage-type metadata, and normal-range
 * source in the weapon's own file. The shared tag-catalog seed precedes the
 * aggregate in the SAME throwaway workspace so every tag resolves
 * (MF-VAL-300), then is stripped from this fragment's output.
 */
async function buildWeaponFragment(
	unit: WeaponUnit,
	tagDefinitions: readonly WeaponTagValueUnit[],
): Promise<{ path: string; toml: string; units: ChapterUnitSummary[] }> {
	const sourceUnit = manufacturedWeaponDamageSourceUnit(unit);
	const strScoreExpr = `actor.effective('${BUNDLE_ID}/str')`;
	const dexScoreExpr = `actor.effective('${BUNDLE_ID}/dex')`;
	const body = await driveUnitScene(
		BUNDLE_ID,
		[
			srdTextNamespaceWriteCall(),
			weaponTagWriteCall(tagDefinitions, "weapon-tag-seed"),
			...itemMeasureResourceCalls(),
			{
				toolName: "spellkave_define_entity_type",
				label: `entity:weapon/${unit.slug}`,
				params: {
					bundle: BUNDLE_ID,
					id: `weapon/${unit.slug}`,
					display_name: unit.displayName,
					description: buildWeaponDescription(unit),
					slot_compatibility_predicate: `slot_id == "${BUNDLE_ID}/${MAIN_HAND_SLOT_LOCAL_ID}"`,
					tags: weaponEntityTags(unit),
					initial_states: costWeightInitialStates(unit.sourcePk),
				},
			},
			weaponDamageSourceCall(
				sourceUnit.entityDefId,
				weaponDamageMagnitudeExpr(sourceUnit, strScoreExpr, dexScoreExpr),
				`${sourceUnit.entityDefId}-damage-source`,
			),
			weaponDamageTypeTagCall(
				sourceUnit.entityDefId,
				sourceUnit.damageType,
				`${sourceUnit.entityDefId}-damage-type-tag`,
			),
			...(unit.rangeClass === "ranged"
				? [
						weaponAttackRangeSourceCall(
							sourceUnit.entityDefId,
							sourceUnit.rangeFeet,
							`${sourceUnit.entityDefId}-attack-range-source`,
						),
					]
				: []),
			srdTextAttachmentWriteCall({
				targetKind: "entity_definition",
				targetRef: unit.entityId,
				extracted: weaponTableText(unit.sourcePk),
			}),
		],
		// A weapon owns its source rows but `entity_definition_item_dsl_source`
		// has no natural key. Rendering against committed fixtures would retain
		// a stale source rather than replace it, so validate this self-sufficient
		// aggregate in its fresh seeded workspace.
		undefined,
		ITEM_MEASURE_SCENE_OPTIONS,
	);
	const header = [
		"# GENERATED by src/chapters/equipment/index.ts — DO NOT EDIT BY HAND.",
		"# Regenerate: pnpm --filter @spellkave/srd-cc run generate",
		"#",
		`# Equipment E3 (ledger/equipment.md 'E3 Weapons'): ${unit.displayName}`,
		`# (${unit.category} ${unit.rangeClass}). While wielded from srd/slot/main-hand,`,
		`# its srd.weapon.range.${unit.rangeClass} identity admits the matching shared`,
		"# Attack variant. Its source-backed damage, damage-type tag, and normal",
		"# range is co-located below only for ranged weapons; melee reach composes",
		"# the actor's effective srd/reach_mm and this weapon's Reach property.",
		unit.rangeClass === "ranged"
			? `# srd/attack_range_mm = ${sourceUnit.rangeFeet} ft × 304.8 mm/ft; Weapon.json.range normal range.`
			: "# This melee weapon has no srd/attack_range_mm source.",
		"# The shared srd.weapon.* tag catalog ships separately in weapon-tag-values.toml.",
		"",
		`# anchor: ${WEAPON_TABLE_ANCHOR}`,
		"",
		"",
	].join("\n");
	return {
		path: `base/equipment/weapons/${unit.slug}.toml`,
		toml: header + body,
		units: [
			{ kind: "entity_definitions", id: unit.entityId, sourcePk: unit.sourcePk },
			{ kind: "entity_definition_item_dsl_source", id: unit.entityId, sourcePk: unit.sourcePk },
			...(unit.rangeClass === "ranged"
				? [
						{
							kind: "entity_definition_item_dsl_source",
							id: `${unit.entityId}:range`,
							sourcePk: unit.sourcePk,
						},
					]
				: []),
			{ kind: "entity_definition_tag", id: unit.entityId, sourcePk: unit.sourcePk },
		],
	};
}

/** All 38 weapon fragments (`ledger/equipment.md`'s full Weapons axis). */
async function buildWeaponFragments(): Promise<{
	fragments: Record<string, string>;
	units: ChapterUnitSummary[];
}> {
	const tagDefinitions = buildWeaponTagValueUnits();
	const weapons = buildWeaponUnits();
	const results = await Promise.all(
		weapons.map((unit) => buildWeaponFragment(unit, tagDefinitions)),
	);
	const fragments: Record<string, string> = {};
	const units: ChapterUnitSummary[] = [];
	for (const result of results) {
		fragments[result.path] = result.toml;
		units.push(...result.units);
	}
	return { fragments, units };
}

/**
 * One manufactured weapon's source ingredients. Ability mode is cache-derived:
 * finesse property tag → finesse; ranged (non-finesse) → dex; melee
 * (non-finesse) → str. Natural weapons stay in
 * `monsters/natural-weapon-units.ts`.
 */
function manufacturedWeaponDamageSourceUnit(
	unit: WeaponUnit,
): WeaponDamageSourceUnit & { entityDefId: string; rangeFeet: number } {
	const finesseTag = weaponFinessePropertyTag();
	const hasFinesse = unit.properties.some((property) => property.tag === finesseTag);
	const abilityMode = hasFinesse ? "finesse" : unit.rangeClass === "ranged" ? "dex" : "str";
	return {
		entityDefId: unit.entityId,
		diceExpr: unit.damageDice,
		damageType: unit.damageType,
		abilityMode,
		rangeFeet: weaponAttackRangeFeet(unit),
	};
}

function weaponDamageTypeTagCall(entityDefId: string, damageType: string, label: string): VerbCall {
	return {
		toolName: "spellkave_write_rows",
		label,
		params: {
			bundle: BUNDLE_ID,
			kind: "entity_definition_tag",
			rows: [{ entity_def_id: entityDefId, bundle_id: BUNDLE_ID, tag: damageTypeTag(damageType) }],
		},
	};
}

async function buildItemMeasuresFragment(): Promise<{
	path: string;
	toml: string;
	units: ChapterUnitSummary[];
}> {
	const measureCalls = itemMeasureResourceCalls();
	const firstId = String(measureCalls[0]?.params.id ?? "cost_cp");
	const body = await driveUnitScene(
		BUNDLE_ID,
		withSrdTextNamespace([
			...measureCalls,
			srdTextAttachmentWriteCall({
				targetKind: "resource_definition",
				targetRef: `${BUNDLE_ID}/${firstId}`,
				extracted: markdownHeadingBlock("equipment.md", "Coins"),
			}),
		]),
	);
	const header = [
		"# GENERATED by src/chapters/equipment/index.ts (item-measures.ts) — DO NOT EDIT BY HAND.",
		"# Regenerate: pnpm --filter @spellkave/srd-cc run generate",
		"#",
		"# Item cost (copper), weight (tenths of a pound), and armor number resources.",
		"# Seeded onto weapons, armor, and tools as entity_definition_initial_state (sk-jay0.3.5.62).",
		"",
		"",
	].join("\n");
	return {
		path: "base/equipment/item-measures.toml",
		toml: header + body,
		units: itemMeasureResourceCalls().map((call) => ({
			kind: "resource_definitions" as const,
			id: `${BUNDLE_ID}/${String(call.params.id)}`,
			sourcePk: "",
		})),
	};
}

/** Behavior flag (AGENTS.md chapter-registry entry): E1 ships a real mechanic row (Chain Mail's FlatSet modifier), not identity-only content. */
export const HAS_BEHAVIOR = true;

export async function generateEquipment(target: AuthorTarget): Promise<EquipmentOutput> {
	const [
		armor,
		tools,
		weaponTagValues,
		weapons,
		startingGear,
		focusGear,
		mounts,
		food,
		itemMeasures,
		services,
		families,
		thrown,
		hazards,
	] = await Promise.all([
		buildArmorFragments(target),
		buildToolsFragments(),
		buildWeaponTagValuesFragment(),
		buildWeaponFragments(),
		buildStartingGearFragments(),
		buildFocusGearFragments(),
		buildMountVehicleFragments(),
		buildFoodDrinkFragments(),
		buildItemMeasuresFragment(),
		buildServiceFragments(target),
		buildItemFamilyFragment(target),
		buildThrownConsumablesFragment(target),
		buildAreaHazardsFragment(target),
	]);
	return {
		fragments: {
			...armor.fragments,
			...tools.fragments,
			"base/equipment/weapon-tag-values.toml": weaponTagValues.toml,
			[itemMeasures.path]: itemMeasures.toml,
			...weapons.fragments,
			...startingGear.fragments,
			...focusGear.fragments,
			...mounts.fragments,
			...food.fragments,
			...services.fragments,
			"base/equipment/item-families.toml": families.toml,
			[thrown.path]: thrown.toml,
			[hazards.path]: hazards.toml,
		},
		units: [
			...armor.units,
			...tools.units,
			...weaponTagValues.units,
			...itemMeasures.units,
			...weapons.units,
			...startingGear.units,
			...focusGear.units,
			...mounts.units,
			...food.units,
			...services.units,
			...families.units,
			...thrown.units,
			...hazards.units,
		],
	};
}

/**
 * This chapter's own reader-prose fragment(s) — `ChapterEntry.generateReaderProse`
 * (`../index.ts`). Thin wrapper: the shared per-document render logic lives
 * in `renderReaderProseForDocuments` (`compendium-metadata.ts`).
 */
export function generateEquipmentReaderProse(
	attachments: readonly ReaderSubjectAttachment[],
): Promise<ChapterReaderProseResult> {
	return renderReaderProseForDocuments(["equipment"], attachments);
}
