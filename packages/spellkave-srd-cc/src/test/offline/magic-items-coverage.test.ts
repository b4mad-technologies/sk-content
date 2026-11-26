// Magic Items chapter (sk-609b.13 / BL-16) executable coverage — real rows
// replacing the former all-todo placeholder.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
	decideBossLootDrop,
	Q4_FANATIC_LOOT_TABLE_ID,
	Q4_FANATIC_PROOF_LOOT_CODE,
} from "../../../../spellkave-adventure-kavemouth/author/loot-drop";
import {
	CONSUME_ACTION_ID,
	MUNDANE_POTION_IDENTITY,
	POTION_OF_GIANT_STRENGTH_CONDITION_ID,
	POTION_OF_GIANT_STRENGTH_CONSUME_EFFECT_ID,
	POTION_OF_GIANT_STRENGTH_ENTITY_ID,
	POTION_OF_HEALING_CONSUME_EFFECT_ID,
	POTION_OF_HEALING_ENTITY_ID,
	POTION_OF_HEALING_GREATER_CONSUME_EFFECT_ID,
	POTION_OF_HEALING_GREATER_HEAL_EXPR,
	POTION_OF_HEALING_HEAL_EXPR,
	POTION_OF_HEALING_SUPERIOR_CONSUME_EFFECT_ID,
	POTION_OF_HEALING_SUPERIOR_HEAL_EXPR,
	POTION_OF_HEALING_SUPREME_CONSUME_EFFECT_ID,
	POTION_OF_HEALING_SUPREME_HEAL_EXPR,
} from "../../chapters/magic-items/index";
import {
	LOOT_CODES,
	LOOT_TABLE_SPECS,
	lootTableId,
	resolveLootCode,
} from "../../chapters/magic-items/loot-tables";
import {
	EXPRESSIBLE_POTION_SLUGS,
	magicItemBehaviorCounts,
} from "../../chapters/magic-items/magic-item-behaviors";
import {
	buildMagicItemUnits,
	EXPECTED_MAGIC_ITEM_COUNT,
	MAGIC_ITEM_CATEGORIES,
	MAGIC_ITEM_RARITIES,
} from "../../chapters/magic-items/magic-item-units";
import { markdownGapUnits } from "../../chapters/magic-items/markdown-gap";
import { readMagicItems } from "../../open5e/magic-item";
import { srdEvidence, srdEvidenceHeld, srdNotApplicable } from "../srd-coverage/evidence";

function declaredBacklogContext(id: string): string {
	const source = readFileSync(fileURLToPath(new URL("./backlog.test.ts", import.meta.url)), "utf8");
	const marker = `id: "${id}"`;
	const start = source.indexOf(marker);
	if (start < 0) throw new Error(`missing backlog declaration ${id}`);
	const next = source.indexOf("backlogItemDeclared(", start + marker.length);
	return source.slice(start, next === -1 ? undefined : next);
}

const CHAPTER = "magic-items";
const DESIGN = "packages/spellkave-srd-cc/src/chapters/magic-items/magic-item-units.ts";
const BEHAVIOR = "packages/spellkave-srd-cc/src/chapters/magic-items/magic-item-behaviors.ts";
const LOOT = "packages/spellkave-srd-cc/src/chapters/magic-items/loot-tables.ts";
const MARKDOWN = "packages/spellkave-srd-cc/cache/markdown/magic-items.md";

const fixture = (path: string) =>
	readFileSync(new URL(`../../../fixtures/${path}`, import.meta.url), "utf8");

describe("Magic Items (identity) executable coverage", () => {
	const units = buildMagicItemUnits();
	const first = units[0];
	if (first === undefined) throw new Error("magic-items-coverage: no units");

	srdEvidence(
		{
			chapter: CHAPTER,
			unit: "magic-item-identities",
			aspect: "source",
			claim: `MagicItem.json yields exactly ${EXPECTED_MAGIC_ITEM_COUNT} CC-BY records with closed category/rarity axes`,
			references: [DESIGN, "packages/spellkave-srd-cc/cache/open5e/MagicItem.json", MARKDOWN],
		},
		() => {
			expect(readMagicItems()).toHaveLength(EXPECTED_MAGIC_ITEM_COUNT);
			expect(units).toHaveLength(EXPECTED_MAGIC_ITEM_COUNT);
			const cats = new Set(units.map((u) => u.category));
			const rars = new Set(units.map((u) => u.rarity));
			for (const c of MAGIC_ITEM_CATEGORIES) expect(cats.has(c)).toBe(true);
			for (const r of MAGIC_ITEM_RARITIES) expect(rars.has(r)).toBe(true);
			expect(units.filter((u) => u.requiresAttunement).length).toBeGreaterThan(0);
			expect(units.filter((u) => u.hasCharges).length).toBeGreaterThan(0);
		},
	);

	srdEvidence(
		{
			chapter: CHAPTER,
			unit: "magic-item-markdown-gap",
			aspect: "source",
			claim:
				"magic-items.md headings absent from MagicItem.json are compiled as identity rows, including Ioun Stone variants, Spell Scroll, and giant-strength tiers",
			references: [DESIGN, MARKDOWN],
		},
		() => {
			const gap = markdownGapUnits();
			expect(gap.length).toBe(39);
			expect(gap.map((row) => row.displayName)).toContain("Bead of Nourishment");
			expect(gap.map((row) => row.displayName)).toContain("Spell Scroll");
			expect(gap.filter((row) => row.slug.startsWith("ioun-stone-")).length).toBe(14);
			expect(gap.filter((row) => row.slug.startsWith("potion-of-giant-strength-")).length).toBe(5);
			expect(new Set(gap.map((row) => row.slug)).size).toBe(gap.length);
		},
	);

	srdEvidence(
		{
			chapter: CHAPTER,
			unit: "magic-item-identities",
			aspect: "mechanic",
			claim: "identity tags encode category, rarity, attunement, optional charges and +N bonus",
			references: [DESIGN],
		},
		() => {
			const plus1 = units.find((u) => u.slug === "longsword-plus-1");
			expect(plus1).toBeDefined();
			expect(plus1?.tags).toContain("srd.magic_item");
			expect(plus1?.tags).toContain("srd.magic_item.category.weapon");
			expect(plus1?.tags).toContain("srd.magic_item.rarity.uncommon");
			expect(plus1?.tags).toContain("srd.magic_item.bonus.plus_1");
			expect(plus1?.plusBonus).toBe(1);
			const attuned = units.find((u) => u.requiresAttunement);
			expect(attuned?.tags).toContain("srd.magic_item.attunement.required");
		},
	);

	srdEvidence(
		{
			chapter: CHAPTER,
			unit: "magic-item-identities",
			aspect: "fixture",
			claim: "per-entity fixtures carry entity_def_id and magic_item tags",
			references: [DESIGN],
		},
		() => {
			const rendered = fixture(`base/magic-items/${first.category}/${first.slug}.toml`);
			expect(rendered).toContain(`entity_def_id = "${first.entityId}"`);
			expect(rendered).toContain('tag = "srd.magic_item"');
			const plusSword = fixture("base/magic-items/weapon/longsword-plus-1.toml");
			expect(plusSword).toContain('entity_def_id = "srd/magic_item/longsword-plus-1"');
			expect(fixture("base/magic-items/tag-values.toml")).toContain('tag = "srd.magic_item"');
		},
	);

	srdNotApplicable({
		chapter: CHAPTER,
		unit: "magic-item-identities",
		aspect: "live",
		reason: "identity catalog has no single live act; live proof is the Q4 fanatic loot drop unit",
		references: [DESIGN, LOOT],
	});
});

describe("Magic Items (+N / charges behaviors) executable coverage", () => {
	const counts = magicItemBehaviorCounts();

	srdEvidence(
		{
			chapter: CHAPTER,
			unit: "magic-item-plus-and-charges",
			aspect: "source",
			claim: "cache yields +N armor/weapon rows and curated charge-pool candidates",
			references: [BEHAVIOR, DESIGN],
		},
		() => {
			expect(counts.plusArmor).toBeGreaterThan(0);
			expect(counts.plusWeapon).toBeGreaterThan(0);
			expect(counts.wandMagicMissiles).toBe(true);
			expect(counts.withChargePool).toBeGreaterThanOrEqual(1);
		},
	);

	srdEvidence(
		{
			chapter: CHAPTER,
			unit: "magic-item-plus-and-charges",
			aspect: "mechanic",
			claim: "+N armor authors AC modifier; +N weapon authors damage source; wand debits charges",
			references: [BEHAVIOR],
		},
		() => {
			const armor = fixture("base/magic-items/armor/chain-mail-plus-1.toml");
			expect(armor).toContain("modifier_templates");
			expect(armor).toMatch(/applies_to = "srd\/ac"/);
			const weapon = fixture("base/magic-items/weapon/longsword-plus-1.toml");
			expect(weapon).toContain("entity_definition_item_dsl_source");
			expect(weapon).toContain("srd/damage");
			const wand = fixture("base/magic-items/wand/wand-of-magic-missiles.toml");
			expect(wand).toContain("# pattern: resource-spend-with-option-menu");
			expect(wand).toContain("charges");
		},
	);

	srdEvidence(
		{
			chapter: CHAPTER,
			unit: "magic-item-plus-and-charges",
			aspect: "fixture",
			claim: "behavior co-located on per-entity files for chain-mail-plus-1 and longsword-plus-1",
			references: [BEHAVIOR],
		},
		() => {
			expect(fixture("base/magic-items/armor/chain-mail-plus-1.toml")).toContain(
				"srd/magic_item/chain-mail-plus-1/ac_bonus",
			);
			expect(fixture("base/magic-items/weapon/longsword-plus-1.toml")).toContain(
				'entity_def_id = "srd/magic_item/longsword-plus-1"',
			);
		},
	);

	srdNotApplicable({
		chapter: CHAPTER,
		unit: "magic-item-plus-and-charges",
		aspect: "live",
		reason:
			"wear/attunement gating is BL-19/finding #37 — modifiers are always-active identity like Equipment armor; live equip proof deferred",
		references: [BEHAVIOR, "packages/spellkave-srd-cc/src/test/offline/backlog.test.ts"],
	});
});

describe("Magic Items (loot tables) executable coverage", () => {
	srdEvidence(
		{
			chapter: CHAPTER,
			unit: "loot-tables",
			aspect: "source",
			claim: "loot table specs cover rarity bands, CR 0-4, Q3/Q10 rewards, Q4 boss",
			references: [LOOT, MARKDOWN],
		},
		() => {
			const ids = LOOT_TABLE_SPECS.map((s) => s.id);
			expect(ids).toContain("loot/rarity/common");
			expect(ids).toContain("loot/rarity/uncommon");
			expect(ids).toContain("loot/cr/band-0-4");
			expect(ids).toContain("loot/quest/q3-reward");
			expect(ids).toContain("loot/quest/q10-reward");
			expect(ids).toContain("loot/boss/q4-fanatic");
			expect(resolveLootCode(LOOT_CODES.longswordPlus1)).toBe("srd/magic_item/longsword-plus-1");
			expect(resolveLootCode(LOOT_CODES.potionHealing)).toBe("srd/item/potion-of-healing");
		},
	);

	srdEvidence(
		{
			chapter: CHAPTER,
			unit: "loot-tables",
			aspect: "mechanic",
			claim: "every entry is an int code; catalog resolves known codes",
			references: [LOOT],
		},
		() => {
			for (const spec of LOOT_TABLE_SPECS) {
				for (const entry of spec.entries) {
					expect(Number.isInteger(entry.code)).toBe(true);
					// resolve throws on unknown
					resolveLootCode(entry.code);
				}
			}
		},
	);

	srdEvidence(
		{
			chapter: CHAPTER,
			unit: "loot-tables",
			aspect: "fixture",
			claim: "loot-tables.toml ships int roll_tables with pattern ref",
			references: [LOOT],
		},
		() => {
			const toml = fixture("base/magic-items/loot-tables.toml");
			expect(toml).toContain("# pattern: loot-table-drop");
			expect(toml).toContain(`roll_table_id = "${lootTableId("loot/boss/q4-fanatic")}"`);
			expect(toml).toContain('result_kind = "int"');
			expect(fixture("base/magic-items/consumables-potion-of-healing.toml")).toContain(
				"srd/item/potion-of-healing",
			);
		},
	);

	srdEvidence(
		{
			chapter: CHAPTER,
			unit: "loot-tables",
			aspect: "live",
			claim:
				"Q4 fanatic drop is seeded on Sister Maelis for SQL read-back (live-self-seeding when node up)",
			references: [
				LOOT,
				"packages/spellkave-srd-cc/src/author/kavemouth/loot-drop.ts",
				"packages/spellkave-srd-cc/src/test/live-self-seeding/mechanics/q4-fanatic-loot.test.ts",
			],
		},
		() => {
			const decision = decideBossLootDrop({
				tableId: Q4_FANATIC_LOOT_TABLE_ID,
				forcedCode: Q4_FANATIC_PROOF_LOOT_CODE,
			});
			expect(decision).toMatchObject({
				kind: "grant",
				entityDefId: "srd/magic_item/longsword-plus-1",
			});
		},
	);
});

describe("Magic Items (Potion catalog & consumables) executable coverage", () => {
	it("srd/item potion identity blurbs have no dice, GP, or consume-action ids", () => {
		const leaked = [
			/\d+d\d+/,
			/ GP/,
			/Drink via/,
			/Source:/,
			/pk=/,
			/Hit Points/,
			/Strength score/,
		];
		for (const [id, blurb] of Object.entries(MUNDANE_POTION_IDENTITY)) {
			expect(blurb.length, id).toBeGreaterThan(40);
			for (const marker of leaked) {
				expect(blurb, `${id} leaked ${marker}`).not.toMatch(marker);
			}
		}
	});

	const DESIGN_POTION = "packages/spellkave-srd-cc/src/chapters/magic-items/index.ts";
	const PATTERN = "packages/spellkave-world-author/docs/patterns/consumable-inventory-consume.md";

	srdEvidence(
		{
			chapter: CHAPTER,
			unit: "potion-of-healing-consume",
			aspect: "source",
			claim: "Item.json Potion of Healing restores 2d4+2 as a Bonus Action consumable",
			references: [
				DESIGN_POTION,
				"packages/spellkave-srd-cc/cache/open5e/Item.json",
				"packages/spellkave-srd-cc/cache/markdown/equipment.md",
			],
		},
		() => {
			expect(POTION_OF_HEALING_HEAL_EXPR).toBe("2d4 + 2");
			expect(CONSUME_ACTION_ID).toBe("srd/consume");
			expect(POTION_OF_HEALING_CONSUME_EFFECT_ID).toBe(
				"srd/item/potion-of-healing/consume/success",
			);
		},
	);

	srdEvidence(
		{
			chapter: CHAPTER,
			unit: "potion-of-healing-consume",
			aspect: "mechanic",
			claim:
				"srd/consume is a targeted Bonus Action: RemoveItem one dose from the held potion + a graph-carried ModifyResource 2d4+2 HP",
			references: [DESIGN_POTION, PATTERN],
		},
		() => {
			const consume = fixture("base/playing-the-game/consume.toml");
			expect(consume).toContain(`action_id = "${CONSUME_ACTION_ID}"`);
			expect(consume).toContain("self_only = false");
			expect(consume).toContain("self_eligible = false");
			expect(consume).toContain('spends_channel = "srd/economy_channel/bonus"');
			expect(consume).toContain(
				"[consequence_frame_writes.frame_write.RemoveItem.source.TargetItem]",
			);
			expect(consume).toContain(
				"predicate_source = \"target.has_niche('srd.consumable') && target.has_niche('core/owned')\"",
			);

			const toml = fixture("base/magic-items/consumables-potion-of-healing.toml");
			expect(toml).not.toContain("[[action_definitions]]");
			expect(toml).not.toContain("ActorInventoryItem");
			expect(toml).toContain('manipulation_action_id = "srd/consume"');
			expect(toml).toContain(
				`predicate_source = "actor.has_capability('srd/action/consume') && target.has_niche('${POTION_OF_HEALING_ENTITY_ID}')"`,
			);
			expect(toml).toContain(
				"outcome_expression_source = \"invoke_outcome_graph('srd/item/potion-of-healing/consume/graph')\"",
			);
			expect(toml).toContain(`consequence_template_id = "${POTION_OF_HEALING_CONSUME_EFFECT_ID}"`);
			expect(toml).toContain(`let h = ${POTION_OF_HEALING_HEAL_EXPR};`);
			expect(toml).toContain("macro('srd/hit_point_maximum') - actor.stat('srd/hp')");
			expect(toml).toContain('resource = "srd/hp"');
			expect(toml).toContain(
				`on_consume_consequence_id = "${POTION_OF_HEALING_CONSUME_EFFECT_ID}"`,
			);
			expect(toml).toContain('tag = "srd.consumable"');
		},
	);

	srdEvidence(
		{
			chapter: CHAPTER,
			unit: "potion-of-healing-consume",
			aspect: "fixture",
			claim: "fixture carries pattern refs and the potion's srd/consume template",
			references: [DESIGN_POTION, PATTERN],
		},
		() => {
			const toml = fixture("base/magic-items/consumables-potion-of-healing.toml");
			expect(toml).toContain("# pattern: consumable-inventory-consume");
			expect(toml).toContain(`entity_def_id = "${POTION_OF_HEALING_ENTITY_ID}"`);
		},
	);

	// sk-content: reads a live test that stays in the monorepo.
	srdEvidenceHeld(
		{
			chapter: CHAPTER,
			unit: "potion-of-healing-consume",
			aspect: "live",
			claim: "live proof drinks the potion (q4-fanatic-loot.test.ts when SPELLKAVE_LOCAL_NODE=1)",
			references: [
				DESIGN_POTION,
				"packages/spellkave-srd-cc/src/test/live-self-seeding/mechanics/q4-fanatic-loot.test.ts",
			],
		},
		() => {
			// Live file dispatches the shared verb so Hesper/L14 and the gated test share one contract.
			const live = readFileSync(
				new URL("../live-self-seeding/mechanics/q4-fanatic-loot.test.ts", import.meta.url),
				"utf8",
			);
			expect(live).toContain("CONSUME_ACTION_ID");
		},
	);

	srdEvidence(
		{
			chapter: CHAPTER,
			unit: "potion-catalog-expressible",
			aspect: "source",
			claim:
				"all healing tiers (greater 4d4+4, superior 8d4+8, supreme 10d4+20), giant strength, resistance, speed, heroism, climbing, water breathing are expressible",
			references: [
				DESIGN_POTION,
				BEHAVIOR,
				"packages/spellkave-srd-cc/cache/open5e/MagicItem.json",
				"packages/spellkave-srd-cc/cache/open5e/Item.json",
			],
		},
		() => {
			expect(POTION_OF_HEALING_GREATER_HEAL_EXPR).toBe("4d4 + 4");
			expect(POTION_OF_HEALING_SUPERIOR_HEAL_EXPR).toBe("8d4 + 8");
			expect(POTION_OF_HEALING_SUPREME_HEAL_EXPR).toBe("10d4 + 20");
			expect(POTION_OF_GIANT_STRENGTH_ENTITY_ID).toBe("srd/item/potion-of-giant-strength");
			expect(EXPRESSIBLE_POTION_SLUGS.size).toBe(5);
			expect(EXPRESSIBLE_POTION_SLUGS.has("potion-of-climbing")).toBe(true);
			expect(EXPRESSIBLE_POTION_SLUGS.has("potion-of-heroism")).toBe(true);
			expect(EXPRESSIBLE_POTION_SLUGS.has("potion-of-resistance")).toBe(true);
			expect(EXPRESSIBLE_POTION_SLUGS.has("potion-of-speed")).toBe(true);
			expect(EXPRESSIBLE_POTION_SLUGS.has("potion-of-water-breathing")).toBe(true);
		},
	);

	srdEvidence(
		{
			chapter: CHAPTER,
			unit: "potion-catalog-expressible",
			aspect: "mechanic",
			claim:
				"expressible potions author srd/consume templates, condition status writes, temp HP, and FlatSet/Plus/Advantage modifiers",
			references: [DESIGN_POTION, BEHAVIOR, PATTERN],
		},
		() => {
			const consumablesToml = fixture("base/magic-items/consumables-potion-of-healing.toml");
			expect(consumablesToml).toContain(POTION_OF_HEALING_GREATER_CONSUME_EFFECT_ID);
			expect(consumablesToml).toContain(POTION_OF_HEALING_SUPERIOR_CONSUME_EFFECT_ID);
			expect(consumablesToml).toContain(POTION_OF_HEALING_SUPREME_CONSUME_EFFECT_ID);
			expect(consumablesToml).toContain(POTION_OF_GIANT_STRENGTH_CONSUME_EFFECT_ID);
			expect(consumablesToml).toContain(POTION_OF_GIANT_STRENGTH_CONDITION_ID);
			expect(consumablesToml).toContain('delta_kind = "FlatSet"');
			expect(consumablesToml).toContain("let str = 21; str");

			const resistanceToml = fixture("base/magic-items/potion/potion-of-resistance.toml");
			expect(resistanceToml).toContain("srd/magic_item/potion-of-resistance/consume/affordance");
			expect(resistanceToml).toContain("srd/condition/magic_item/potion-of-resistance");

			const speedToml = fixture("base/magic-items/potion/potion-of-speed.toml");
			expect(speedToml).toContain("srd/magic_item/potion-of-speed/consume/affordance");
			expect(speedToml).toContain("srd/condition/magic_item/potion-of-speed");
			expect(speedToml).toContain('delta_kind = "Plus"');
			expect(speedToml).toContain('delta_kind = "Advantage"');

			const heroismToml = fixture("base/magic-items/potion/potion-of-heroism.toml");
			expect(heroismToml).toContain("srd/magic_item/potion-of-heroism/consume/affordance");
			expect(heroismToml).toContain("srd/condition/magic_item/potion-of-heroism");
			expect(heroismToml).toContain("srd/temp_hp");

			const climbingToml = fixture("base/magic-items/potion/potion-of-climbing.toml");
			expect(climbingToml).toContain("srd/magic_item/potion-of-climbing/consume/affordance");

			const waterToml = fixture("base/magic-items/potion/potion-of-water-breathing.toml");
			expect(waterToml).toContain("srd/magic_item/potion-of-water-breathing/consume/affordance");
		},
	);

	srdEvidence(
		{
			chapter: CHAPTER,
			unit: "potion-catalog-expressible",
			aspect: "fixture",
			claim:
				"all 18 SRD potions in MagicItem.json are classified as expressible or recorded with explicit unmechanized reasons",
			references: [BEHAVIOR],
		},
		() => {
			const potions = buildMagicItemUnits().filter((u) => u.category === "potion");
			const potionDeclaration = declaredBacklogContext("BL-95");
			expect(potions).toHaveLength(18);
			for (const potion of potions) {
				const isExpressible = EXPRESSIBLE_POTION_SLUGS.has(potion.slug);
				const hasNaReason = potionDeclaration.includes(`${potion.slug}:`);
				expect(
					isExpressible || hasNaReason,
					`Potion '${potion.slug}' must be expressible or have an N/A reason`,
				).toBe(true);
				if (isExpressible) {
					const toml = fixture(`base/magic-items/potion/${potion.slug}.toml`);
					expect(toml).toContain(`# pattern: consumable-inventory-consume`);
					expect(toml).toContain(
						`template_id = "srd/magic_item/${potion.slug}/consume/affordance"`,
					);
					expect(toml).toContain('manipulation_action_id = "srd/consume"');
				}
			}
		},
	);

	srdNotApplicable({
		chapter: CHAPTER,
		unit: "potion-catalog-expressible",
		aspect: "live",
		reason:
			"live proof drinks Potion of Resistance and reads back condition from SQL (live-self-seeding)",
		references: [
			DESIGN_POTION,
			BEHAVIOR,
			"packages/spellkave-srd-cc/src/test/live-self-seeding/mechanics/potions-and-recharge.test.ts",
		],
	});
});
