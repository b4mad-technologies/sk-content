// pattern: none — barrel export for magic-items chapter
// Chapter generator: "Magic Items" (SRD 5.2.1), sk-609b.13 / BL-16.
//
// Slice 1: identity for all 757 MagicItem.json records (per-entity files under
// base/magic-items/<category>/<slug>.toml).
// Slice 2: expressible behaviors (+N armor AC modifiers, +N weapon damage
// sources, curated charge pools + wand spend, loot int roll tables).
// Wear/attunement gating remains BL-19 / finding #37.
//
// Book order: Magic Items follows Monsters in this package's registry (SRD
// free-rules places Magic Items after the monster appendix material).
import type { AuthorTarget } from "@spellkave/tool-authoring";
import {
	type ChapterReaderProseResult,
	type ReaderSubjectAttachment,
	renderReaderProseForDocuments,
} from "../../compendium-metadata";
import { itemByPk } from "../../open5e/item";
import {
	markdownHeadingBlock,
	open5eStringField,
	srdTextAttachmentWriteCall,
	srdTextNamespaceWriteCall,
} from "../../text";
import { type ChapterSlice, type ChapterUnitSummary, inChapterSlice } from "../chapter-types";
import {
	CHEST_SLOT_LOCAL_ID,
	MAIN_HAND_SLOT_LOCAL_ID,
	OFF_HAND_SLOT_LOCAL_ID,
} from "../equipment/armor-units";
import { abilityModifierTargetRow } from "../playing-the-game/ability-units";
import {
	REMOVE_POLICY_INDEPENDENT_LIFETIME_LOCAL_ID,
	STACKING_SINGLE_LOCAL_ID,
} from "../playing-the-game/cover-units";
import {
	CONSUMABLE_TAG,
	consumeTemplateCalls,
	consumeTemplateIds,
	consumeVerbSeedCalls,
	stripConsumeVerbSeedRows,
} from "../playing-the-game/fragments/consume";
import { cappedHealingExpr } from "../playing-the-game/healing-units";
import { HP_ID } from "../playing-the-game/hp-units";
import {
	type BatchEntity,
	driveEntityBatch,
	driveUnitFragment,
	driveUnitScene,
	type VerbCall,
} from "../verb-runner";
import { buildLootTablesFragment } from "./loot-tables";
import { buildMagicItemBehaviorFragments, EXPRESSIBLE_POTION_SLUGS } from "./magic-item-behaviors";
import { buildMagicItemTagValueUnits } from "./magic-item-tag-values";
import { BUNDLE_ID, buildMagicItemUnits, type MagicItemUnit } from "./magic-item-units";
import { buildMarkdownGapFragments } from "./markdown-gap.ts";

/**
 * Potions are drunk through the ONE world verb `srd/consume`
 * (`playing-the-game/fragments/consume.ts`) with the held potion as target.
 * Each potion owns one `srd/consume` template and its effect consequence
 * `<item>/consume/success` (also its `on_consume_consequence_id`).
 */
export { CONSUME_ACTION_ID } from "../playing-the-game/fragments/consume";
export const POTION_OF_HEALING_ENTITY_ID = `${BUNDLE_ID}/item/potion-of-healing`;
export const POTION_OF_HEALING_CONSUME_EFFECT_ID = `${BUNDLE_ID}/item/potion-of-healing/consume/success`;
export const POTION_OF_HEALING_HEAL_EXPR = "2d4 + 2";

export const POTION_OF_HEALING_GREATER_ENTITY_ID = `${BUNDLE_ID}/item/potion-of-healing-greater`;
export const POTION_OF_HEALING_GREATER_CONSUME_EFFECT_ID = `${BUNDLE_ID}/item/potion-of-healing-greater/consume/success`;
export const POTION_OF_HEALING_GREATER_HEAL_EXPR = "4d4 + 4";

export const POTION_OF_HEALING_SUPERIOR_ENTITY_ID = `${BUNDLE_ID}/item/potion-of-healing-superior`;
export const POTION_OF_HEALING_SUPERIOR_CONSUME_EFFECT_ID = `${BUNDLE_ID}/item/potion-of-healing-superior/consume/success`;
export const POTION_OF_HEALING_SUPERIOR_HEAL_EXPR = "8d4 + 8";

export const POTION_OF_HEALING_SUPREME_ENTITY_ID = `${BUNDLE_ID}/item/potion-of-healing-supreme`;
export const POTION_OF_HEALING_SUPREME_CONSUME_EFFECT_ID = `${BUNDLE_ID}/item/potion-of-healing-supreme/consume/success`;
export const POTION_OF_HEALING_SUPREME_HEAL_EXPR = "10d4 + 20";

export const POTION_OF_GIANT_STRENGTH_ENTITY_ID = `${BUNDLE_ID}/item/potion-of-giant-strength`;
export const POTION_OF_GIANT_STRENGTH_CONSUME_EFFECT_ID = `${BUNDLE_ID}/item/potion-of-giant-strength/consume/success`;
export const POTION_OF_GIANT_STRENGTH_CONDITION_ID = `${BUNDLE_ID}/condition/potion-of-giant-strength`;

export interface MagicItemsOutput {
	fragments: Record<string, string>;
	units: ChapterUnitSummary[];
}

const TAG_VALUES_PATH = "base/magic-items/tag-values.toml";
const LOOT_TABLES_PATH = "base/magic-items/loot-tables.toml";
const CONSUMABLES_PATH = "base/magic-items/consumables-potion-of-healing.toml";
const RENDER_BATCH_SIZE = 40;

/**
 * Website / item_detail identity for srd/item potion rows (not srd/magic_item).
 * Heal dice, GP, and consume effects stay on the consume templates and structured
 * rows — never duplicate authored/flavor/en/items/ magic-item blurbs.
 */
export const MUNDANE_POTION_IDENTITY: Record<string, string> = {
	"item/potion-of-healing":
		"A stoppered vial of warm red liquid, carried for the moment a fight turns against you.",
	"item/potion-of-healing-greater":
		"A richer draught than the common red vial, packed for wounds that will not wait.",
	"item/potion-of-healing-superior":
		"A deep crimson dose kept for the worst hours, when lesser restoratives are not enough.",
	"item/potion-of-healing-supreme":
		"A rare, almost luminous cordial reserved for the edge of death.",
	"item/potion-of-giant-strength":
		"A dense, earthy draught that briefly lends the drinker the presence of something far larger.",
};

export function mundanePotionIdentity(id: string): string {
	const blurb = MUNDANE_POTION_IDENTITY[id];
	if (blurb === undefined) {
		throw new Error(`magic-items: no mundane potion identity for '${id}'`);
	}
	return blurb;
}

function tagValueWriteCall(): VerbCall {
	const tagDefinitions = buildMagicItemTagValueUnits();
	// srd.loot_table for loot tables + srd.item already listed.
	const lootTag = {
		tag: "srd.loot_table",
		prefix: "srd",
		description: "Identifies a roll_tables row as an SRD loot/treasure draw table.",
		sourcePk: "",
	};
	const rows = [...tagDefinitions, lootTag];
	return {
		toolName: "spellkave_write_rows",
		label: "magic-item-tag-vocabulary",
		params: {
			bundle: BUNDLE_ID,
			kind: "tag_value_definitions",
			rows: rows.map(({ tag, prefix, description }) => ({
				tag,
				prefix,
				bundle_id: BUNDLE_ID,
				description,
			})),
		},
	};
}

async function buildTagValuesFragment(): Promise<{
	toml: string;
	summaries: ChapterUnitSummary[];
}> {
	const tagDefinitions = [
		...buildMagicItemTagValueUnits(),
		{
			tag: "srd.loot_table",
			prefix: "srd",
			description: "Identifies a roll_tables row as an SRD loot/treasure draw table.",
			sourcePk: "",
		},
	];
	const toml = await driveUnitFragment(BUNDLE_ID, tagValueWriteCall(), {
		onlyTagValueDefinitionTags: tagDefinitions.map((d) => d.tag),
	});
	const header = [
		"# GENERATED by src/chapters/magic-items/index.ts (magic-item-tag-values.ts) — DO NOT EDIT BY HAND.",
		"# Regenerate: pnpm --filter @spellkave/srd-cc run generate",
		"#",
		`# Magic Items tag_value_definitions catalog: ${tagDefinitions.length} rows.`,
		"",
		"",
	].join("\n");
	return {
		toml: header + toml,
		summaries: tagDefinitions.map((definition) => ({
			kind: "tag_value_definitions",
			id: definition.tag,
			sourcePk: definition.sourcePk,
		})),
	};
}

function slotPredicateFor(unit: MagicItemUnit): string | undefined {
	if (unit.category === "weapon" && unit.plusBonus !== null && unit.weaponPk !== null) {
		return `slot_id == "${BUNDLE_ID}/${MAIN_HAND_SLOT_LOCAL_ID}"`;
	}
	if (unit.category === "armor" && unit.plusBonus !== null && unit.armorPk !== null) {
		const local = unit.armorPk.includes("shield") ? OFF_HAND_SLOT_LOCAL_ID : CHEST_SLOT_LOCAL_ID;
		return `slot_id == "${BUNDLE_ID}/${local}"`;
	}
	return undefined;
}

function magicItemEntityCall(unit: MagicItemUnit): VerbCall {
	const slot = slotPredicateFor(unit);
	const isPotion = unit.category === "potion";
	const hasConsume = EXPRESSIBLE_POTION_SLUGS.has(unit.slug);
	return {
		toolName: "spellkave_define_entity_type",
		label: `entity:magic_item/${unit.slug}`,
		params: {
			bundle: BUNDLE_ID,
			id: `magic_item/${unit.slug}`,
			display_name: unit.displayName,
			description: unit.description,
			tags: hasConsume ? [...unit.tags, CONSUMABLE_TAG] : unit.tags,
			...(slot !== undefined ? { slot_compatibility_predicate: slot } : {}),
			...(isPotion ? { stackable: true } : {}),
			...(hasConsume ? { on_consume_consequence_id: `${unit.entityId}/consume/success` } : {}),
		},
	};
}

/**
 * A unique exact heading in the canonical SRD chapter is stronger source
 * evidence than a same-named Open5e record: it retains tables and labelled
 * clauses, and catches mismatches such as Wand of Web / Wand of Fear. Variant
 * identities deliberately fall back to their typed record until their source
 * ownership is explicitly reconciled; no name-normalising guess belongs here.
 */
export function magicItemSrdText(
	unit: MagicItemUnit,
	markdownBlock: typeof markdownHeadingBlock = markdownHeadingBlock,
) {
	try {
		return markdownBlock("magic-items.md", unit.displayName);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		const absent = message.startsWith("srd-text: no heading ");
		if (absent) {
			return open5eStringField("MagicItem.json", unit.sourcePk);
		}
		throw error;
	}
}

function itemHeader(unit: MagicItemUnit, hasBehavior: boolean): string {
	return [
		"# GENERATED by src/chapters/magic-items/index.ts — DO NOT EDIT BY HAND.",
		"# Regenerate: pnpm --filter @spellkave/srd-cc run generate",
		"#",
		`# Magic item identity: ${unit.displayName} (${unit.rarity} ${unit.category}).`,
		`# Source: cache/open5e/MagicItem.json pk='${unit.sourcePk}'.`,
		hasBehavior
			? "# Behavior rows co-located below (sk-609b.13 slice 2)."
			: "# Identity only this file — see magic-item-behaviors.ts for expressible subset.",
		"",
		"",
	].join("\n");
}

/**
 * Potions catalog — Item.json consumables (healing tiers + giant strength) + one
 * `srd/consume` template each (target = the held potion).
 * // pattern: consumable-inventory-consume
 * // pattern: loot-table-drop
 */
export async function buildPotionOfHealingFragment(target?: AuthorTarget): Promise<{
	toml: string;
	summaries: ChapterUnitSummary[];
}> {
	const healingRecord = itemByPk("srd-2024_potion-of-healing");
	const healingTiersRecord = itemByPk("srd-2024_potions-of-healing");
	const giantStrengthRecord = itemByPk("srd-2024_potion-of-giant-strength");
	const hpResource = `${BUNDLE_ID}/${HP_ID}`;

	const healingTiers = [
		{
			id: "item/potion-of-healing",
			entityId: POTION_OF_HEALING_ENTITY_ID,
			effectId: POTION_OF_HEALING_CONSUME_EFFECT_ID,
			displayName: "Potion of Healing",
			rarity: "common",
			healExpr: POTION_OF_HEALING_HEAL_EXPR,
			sourcePk: healingRecord.pk,
		},
		{
			id: "item/potion-of-healing-greater",
			entityId: POTION_OF_HEALING_GREATER_ENTITY_ID,
			effectId: POTION_OF_HEALING_GREATER_CONSUME_EFFECT_ID,
			displayName: "Potion of Healing (greater)",
			rarity: "uncommon",
			healExpr: POTION_OF_HEALING_GREATER_HEAL_EXPR,
			sourcePk: healingTiersRecord.pk,
		},
		{
			id: "item/potion-of-healing-superior",
			entityId: POTION_OF_HEALING_SUPERIOR_ENTITY_ID,
			effectId: POTION_OF_HEALING_SUPERIOR_CONSUME_EFFECT_ID,
			displayName: "Potion of Healing (superior)",
			rarity: "rare",
			healExpr: POTION_OF_HEALING_SUPERIOR_HEAL_EXPR,
			sourcePk: healingTiersRecord.pk,
		},
		{
			id: "item/potion-of-healing-supreme",
			entityId: POTION_OF_HEALING_SUPREME_ENTITY_ID,
			effectId: POTION_OF_HEALING_SUPREME_CONSUME_EFFECT_ID,
			displayName: "Potion of Healing (supreme)",
			rarity: "very_rare",
			healExpr: POTION_OF_HEALING_SUPREME_HEAL_EXPR,
			sourcePk: healingTiersRecord.pk,
		},
	];

	const sceneCalls: VerbCall[] = [
		srdTextNamespaceWriteCall(),
		tagValueWriteCall(),
		...healingTiers.flatMap((tier) => [
			{
				toolName: "spellkave_define_entity_type" as const,
				label: `entity:${tier.id}`,
				params: {
					bundle: BUNDLE_ID,
					id: tier.id,
					display_name: tier.displayName,
					description: mundanePotionIdentity(tier.id),
					tags: [
						"srd.item",
						"srd.magic_item",
						"srd.magic_item.category.potion",
						`srd.magic_item.rarity.${tier.rarity}`,
						CONSUMABLE_TAG,
					],
					stackable: true,
					on_consume_consequence_id: tier.effectId,
				},
			},
			srdTextAttachmentWriteCall({
				targetKind: "entity_definition",
				targetRef: tier.entityId,
				extracted: open5eStringField("Item.json", tier.sourcePk),
			}),
			{
				toolName: "spellkave_define_consequence" as const,
				label: `consequence:${tier.id}/consume/success`,
				params: {
					bundle: BUNDLE_ID,
					id: `${tier.id}/consume/success`,
					description: `Heal the drinker ${tier.healExpr} HP (${tier.displayName}).`,
					frame_writes: [
						{
							ModifyResource: {
								actor: "Actor",
								resource: hpResource,
								delta_source: cappedHealingExpr(tier.healExpr, "actor"),
							},
						},
					],
				},
			},
			...consumeTemplateCalls({
				itemDefId: tier.entityId,
				displayName: `Drink ${tier.displayName}`,
				effectConsequenceId: tier.effectId,
			}),
		]),
		{
			toolName: "spellkave_write_rows",
			label: "modifier-target:str",
			params: {
				bundle: BUNDLE_ID,
				kind: "modifier_target_definitions",
				rows: [abilityModifierTargetRow("str")],
			},
		},
		{
			toolName: "spellkave_define_condition",
			label: "condition:potion-of-giant-strength",
			params: {
				bundle: BUNDLE_ID,
				id: "condition/potion-of-giant-strength",
				display_name: "Potion of Giant Strength",
				gate_predicate_source: "1 == 1",
				description:
					"Strength score changes to 21 (Hill Giant) for 1 hour (magic-items.md § Potion of Giant Strength).",
				remove_time_policy: `${BUNDLE_ID}/${REMOVE_POLICY_INDEPENDENT_LIFETIME_LOCAL_ID}`,
				stacking_rule: `${BUNDLE_ID}/${STACKING_SINGLE_LOCAL_ID}`,
				modifiers: [
					{
						id: "condition/potion-of-giant-strength/mod_str",
						display_name: "Potion of Giant Strength STR 21",
						applies_to: `${BUNDLE_ID}/str`,
						modifier_expression_source: "let str = 21; str",
						delta_kind: "FlatSet",
					},
				],
			},
		},
		{
			toolName: "spellkave_define_entity_type",
			label: "entity:item/potion-of-giant-strength",
			params: {
				bundle: BUNDLE_ID,
				id: "item/potion-of-giant-strength",
				display_name: "Potion of Giant Strength",
				description: mundanePotionIdentity("item/potion-of-giant-strength"),
				tags: [
					"srd.item",
					"srd.magic_item",
					"srd.magic_item.category.potion",
					"srd.magic_item.rarity.uncommon",
					CONSUMABLE_TAG,
				],
				stackable: true,
				on_consume_consequence_id: POTION_OF_GIANT_STRENGTH_CONSUME_EFFECT_ID,
			},
		},
		srdTextAttachmentWriteCall({
			targetKind: "entity_definition",
			targetRef: POTION_OF_GIANT_STRENGTH_ENTITY_ID,
			extracted: open5eStringField("Item.json", giantStrengthRecord.pk),
		}),
		{
			toolName: "spellkave_define_consequence",
			label: "consequence:potion-of-giant-strength/consume/success",
			params: {
				bundle: BUNDLE_ID,
				id: "item/potion-of-giant-strength/consume/success",
				description: "Apply the Potion of Giant Strength condition (Strength 21 for 1 hour).",
				frame_writes: [
					{
						ApplyStatus: {
							target_kind: "entity",
							target_ref: "Actor",
							condition_definition_id: POTION_OF_GIANT_STRENGTH_CONDITION_ID,
						},
					},
				],
			},
		},
		...consumeTemplateCalls({
			itemDefId: POTION_OF_GIANT_STRENGTH_ENTITY_ID,
			displayName: "Drink Potion of Giant Strength",
			effectConsequenceId: POTION_OF_GIANT_STRENGTH_CONSUME_EFFECT_ID,
		}),
	];

	// pattern: consumable-inventory-consume
	const body = stripConsumeVerbSeedRows(
		await driveUnitScene(BUNDLE_ID, [...consumeVerbSeedCalls(), ...sceneCalls], target, {
			onlyTagValueDefinitionTags: [],
			// The consume capability, niche, shared consequence and srd/consume
			// action ship from playing-the-game/fragments/consume.ts.
			omitRowKinds: ["capability_definitions"],
		}),
	);
	const header = [
		"# GENERATED by src/chapters/magic-items/index.ts — DO NOT EDIT BY HAND.",
		"# Regenerate: pnpm --filter @spellkave/srd-cc run generate",
		"#",
		"# Potions catalog — Item.json consumables (healing tiers + giant strength) + srd/consume templates.",
		"# pattern: consumable-inventory-consume",
		"# pattern: loot-table-drop",
		"",
		"",
	].join("\n");
	return {
		toml: header + body,
		summaries: [
			...healingTiers.flatMap((tier) => [
				{ kind: "entity_definitions" as const, id: tier.entityId, sourcePk: tier.sourcePk },
				{
					kind: "consequence_templates" as const,
					id: tier.effectId,
					sourcePk: tier.sourcePk,
				},
				{
					kind: "affordance_templates" as const,
					id: consumeTemplateIds(tier.entityId).affordanceTemplateId,
					sourcePk: tier.sourcePk,
				},
			]),
			{
				kind: "entity_definitions",
				id: POTION_OF_GIANT_STRENGTH_ENTITY_ID,
				sourcePk: giantStrengthRecord.pk,
			},
			{
				kind: "consequence_templates",
				id: POTION_OF_GIANT_STRENGTH_CONSUME_EFFECT_ID,
				sourcePk: giantStrengthRecord.pk,
			},
			{
				kind: "affordance_templates",
				id: consumeTemplateIds(POTION_OF_GIANT_STRENGTH_ENTITY_ID).affordanceTemplateId,
				sourcePk: giantStrengthRecord.pk,
			},
			{
				kind: "condition_definitions",
				id: POTION_OF_GIANT_STRENGTH_CONDITION_ID,
				sourcePk: giantStrengthRecord.pk,
			},
			{
				kind: "modifier_templates",
				id: `${POTION_OF_GIANT_STRENGTH_CONDITION_ID}/mod_str`,
				sourcePk: giantStrengthRecord.pk,
			},
		],
	};
}

export const HAS_BEHAVIOR = true;

/**
 * Sub-unit slicing (`pipeline-shards.ts`'s `magic-items/1of2` / `2of2`):
 * `buildMagicItemBehaviorFragments` — one `driveUnitScene` PER behavior-
 * bearing item — is ~93% of this chapter's wall time (measured: 163 s of
 * 175 s total, 160 of 757 items carry a behavior; `driveEntityBatch`'s own
 * per-item identity batch is a distant second at 56 s). Both scale with item
 * COUNT, so slicing `units` by the same index-modulo convention
 * `unitsForShard` uses (never a contiguous range, which would bunch every
 * "+N weapon/armor" behavior item into one slice, since `buildMagicItemUnits`
 * groups by category) roughly halves both. The three catalog-wide fragments
 * (`tag-values`, `loot-tables`, `consumables`/potion-of-healing) render ONLY
 * in the primary slice (`index === 1`, or the unsliced full render) — the
 * unrendered fragments come back from the committed tree the same way an
 * entirely-skipped chapter's fragments do (`renderAll`'s overlay).
 */
export async function generateMagicItems(
	target?: AuthorTarget,
	slice?: ChapterSlice,
): Promise<MagicItemsOutput> {
	const allUnits = buildMagicItemUnits();
	const units = allUnits.filter((_, i) => inChapterSlice(i, slice));
	const primary = slice === undefined || slice.index === 1;
	const batchEntities: BatchEntity[] = units.map((unit) => ({
		entityDefId: unit.entityId,
		call: magicItemEntityCall(unit),
		extraCalls: [
			srdTextAttachmentWriteCall({
				targetKind: "entity_definition",
				targetRef: unit.entityId,
				extracted: magicItemSrdText(unit),
			}),
		],
	}));

	const [tagValues, perItemToml, lootTables, potionHealing, markdownGap, behaviors] =
		await Promise.all([
			primary ? buildTagValuesFragment() : undefined,
			driveEntityBatch(BUNDLE_ID, batchEntities, RENDER_BATCH_SIZE, undefined, [
				tagValueWriteCall(),
				srdTextNamespaceWriteCall(),
			]),
			primary ? buildLootTablesFragment() : undefined,
			primary ? buildPotionOfHealingFragment(target) : undefined,
			primary ? buildMarkdownGapFragments() : undefined,
			buildMagicItemBehaviorFragments(target, slice),
		]);

	const fragments: Record<string, string> = {};
	const summaries: ChapterUnitSummary[] = [];
	if (tagValues !== undefined) {
		fragments[TAG_VALUES_PATH] = tagValues.toml;
		summaries.push(...tagValues.summaries);
	}
	if (lootTables !== undefined) {
		fragments[LOOT_TABLES_PATH] = lootTables.toml;
		summaries.push(...lootTables.summaries);
	}
	if (potionHealing !== undefined) {
		fragments[CONSUMABLES_PATH] = potionHealing.toml;
		summaries.push(...potionHealing.summaries);
	}
	if (markdownGap !== undefined) {
		Object.assign(fragments, markdownGap.fragments);
		summaries.push(...markdownGap.units);
	}

	for (const unit of units) {
		const body = perItemToml.get(unit.entityId);
		if (body === undefined) {
			throw new Error(
				`magic-items/index: driveEntityBatch produced no rows for '${unit.entityId}'.`,
			);
		}
		const behavior = behaviors.get(unit.slug);
		const combined = (behavior === undefined ? body : body + behavior.toml).replace(/\n+$/, "\n");
		fragments[`base/magic-items/${unit.category}/${unit.slug}.toml`] =
			itemHeader(unit, behavior !== undefined) + combined;
		summaries.push({ kind: "entity_definitions", id: unit.entityId, sourcePk: unit.sourcePk });
		if (behavior !== undefined) summaries.push(...behavior.summaries);
	}

	return { fragments, units: summaries };
}

/**
 * This chapter's own reader-prose fragment(s) — `ChapterEntry.generateReaderProse`
 * (`../index.ts`). Thin wrapper: the shared per-document render logic lives
 * in `renderReaderProseForDocuments` (`compendium-metadata.ts`).
 */
export function generateMagicItemsReaderProse(
	attachments: readonly ReaderSubjectAttachment[],
): Promise<ChapterReaderProseResult> {
	return renderReaderProseForDocuments(["magic-items"], attachments);
}
