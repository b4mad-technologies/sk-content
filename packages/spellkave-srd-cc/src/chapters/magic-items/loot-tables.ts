// SRD treasure / loot roll tables (sk-609b.13).
//
// DSL roll_table() is int-draw only (dsl-grammar.md §RollTable, MF-VAL-317).
// Each table returns a small integer code; the loot catalog maps codes to
// entity_def ids (magic items or equipment potions). Elven-mini quest
// terminals and boss kills draw via the loot-table-drop pattern.
//
// pattern: loot-table-drop
import type { ChapterUnitSummary } from "../chapter-types";
import { driveUnitFragment, type VerbCall } from "../verb-runner";
import { BUNDLE_ID } from "./magic-item-units";

/** Integer codes drawn from rarity / CR-band tables. */
export const LOOT_CODES = {
	/** Empty / coins-only (no magic item this draw). */
	none: 0,
	/** Potion of Healing (equipment Item.json — common consumable). */
	potionHealing: 10,
	/** Potion of Climbing (magic item, common). */
	potionClimbing: 11,
	/** Longsword (+1) uncommon magic weapon. */
	longswordPlus1: 20,
	/** Chain Mail (+1) uncommon magic armor. */
	chainMailPlus1: 21,
	/** Dagger (+1). */
	daggerPlus1: 22,
	/** Potion of Healing ×2 marker (Q3 table weight). */
	potionHealingPair: 30,
	/** Caddoc's blessing stand-in: Potion of Heroism (Q10). */
	potionHeroism: 40,
} as const;

export type LootCode = (typeof LOOT_CODES)[keyof typeof LOOT_CODES];

/** Maps a drawn int → fully-qualified entity_def_id (or null for none). */
export const LOOT_CODE_CATALOG: Readonly<Record<number, string | null>> = {
	[LOOT_CODES.none]: null,
	[LOOT_CODES.potionHealing]: "srd/item/potion-of-healing",
	[LOOT_CODES.potionClimbing]: "srd/magic_item/potion-of-climbing",
	[LOOT_CODES.longswordPlus1]: "srd/magic_item/longsword-plus-1",
	[LOOT_CODES.chainMailPlus1]: "srd/magic_item/chain-mail-plus-1",
	[LOOT_CODES.daggerPlus1]: "srd/magic_item/dagger-plus-1",
	[LOOT_CODES.potionHealingPair]: "srd/item/potion-of-healing",
	[LOOT_CODES.potionHeroism]: "srd/magic_item/potion-of-heroism",
};

export interface LootTableSpec {
	/** Local id stem → roll_table_id `srd/<id>`. */
	id: string;
	displayName: string;
	description: string;
	/** Weighted entries: result_ref is the integer code as string. */
	entries: readonly { code: number; weight: number }[];
}

/**
 * Rarity/CR-band tables from gameplay-toolbox / magic-items treasure guidance
 * (simplified weighted draws — int codes only).
 */
export const LOOT_TABLE_SPECS: readonly LootTableSpec[] = [
	{
		id: "loot/rarity/common",
		displayName: "Common magic-item draw",
		description:
			"Weighted common-tier treasure draw (magic-items.md rarity; gameplay-toolbox treasure). " +
			"Int codes resolve via LOOT_CODE_CATALOG.",
		entries: [
			{ code: LOOT_CODES.none, weight: 4 },
			{ code: LOOT_CODES.potionHealing, weight: 4 },
			{ code: LOOT_CODES.potionClimbing, weight: 2 },
		],
	},
	{
		id: "loot/rarity/uncommon",
		displayName: "Uncommon magic-item draw",
		description: "Weighted uncommon-tier treasure draw. Int codes via LOOT_CODE_CATALOG.",
		entries: [
			{ code: LOOT_CODES.none, weight: 3 },
			{ code: LOOT_CODES.potionHealing, weight: 2 },
			{ code: LOOT_CODES.longswordPlus1, weight: 2 },
			{ code: LOOT_CODES.daggerPlus1, weight: 2 },
			{ code: LOOT_CODES.chainMailPlus1, weight: 1 },
		],
	},
	{
		id: "loot/rarity/rare",
		displayName: "Rare magic-item draw",
		description: "Weighted rare-tier treasure draw. Int codes via LOOT_CODE_CATALOG.",
		entries: [
			{ code: LOOT_CODES.longswordPlus1, weight: 3 },
			{ code: LOOT_CODES.chainMailPlus1, weight: 2 },
			{ code: LOOT_CODES.potionHeroism, weight: 2 },
			{ code: LOOT_CODES.none, weight: 1 },
		],
	},
	{
		id: "loot/cr/band-0-4",
		displayName: "CR 0–4 individual treasure",
		description:
			"Low-CR encounter treasure band (gameplay-toolbox encounter building / treasure guidance). " +
			"Used for elven-mini rung I–II boss drops.",
		entries: [
			{ code: LOOT_CODES.none, weight: 5 },
			{ code: LOOT_CODES.potionHealing, weight: 3 },
			{ code: LOOT_CODES.daggerPlus1, weight: 1 },
			{ code: LOOT_CODES.longswordPlus1, weight: 1 },
		],
	},
	{
		id: "loot/quest/q3-reward",
		displayName: "Q3 Tamsin's Basket reward",
		description:
			"Quest terminal reward table for Q3 — storyline wants 2 healing potions; " +
			"draw lands potionHealingPair (host grants quantity 2).",
		entries: [
			{ code: LOOT_CODES.potionHealingPair, weight: 9 },
			{ code: LOOT_CODES.potionClimbing, weight: 1 },
		],
	},
	{
		id: "loot/quest/q10-reward",
		displayName: "Q10 Sun and Moon reward",
		description:
			"Quest terminal reward table for Q10 — Caddoc's blessing approximated as Potion of Heroism draw.",
		entries: [
			{ code: LOOT_CODES.potionHeroism, weight: 8 },
			{ code: LOOT_CODES.potionHealing, weight: 2 },
		],
	},
	{
		id: "loot/boss/q4-fanatic",
		displayName: "Q4 Sister Maelis boss drop",
		description:
			"Boss drop table for the Silent Mill fanatic (cultist-fanatic). " +
			"Live representative: kill Maelis, read the granted drop.",
		entries: [
			{ code: LOOT_CODES.longswordPlus1, weight: 5 },
			{ code: LOOT_CODES.daggerPlus1, weight: 3 },
			{ code: LOOT_CODES.potionHealing, weight: 2 },
		],
	},
];

export function lootTableId(specId: string): string {
	return `${BUNDLE_ID}/${specId}`;
}

export function resolveLootCode(code: number): string | null {
	if (!(code in LOOT_CODE_CATALOG)) {
		throw new Error(`loot-tables: unknown loot code ${code}`);
	}
	return LOOT_CODE_CATALOG[code] ?? null;
}

function defineTableCall(spec: LootTableSpec): VerbCall {
	return {
		toolName: "spellkave_define_roll_table",
		label: `loot-table:${spec.id}`,
		params: {
			bundle: BUNDLE_ID,
			id: spec.id,
			display_name: spec.displayName,
			result_kind: "int",
			description: spec.description,
			// No roll_table_tag until srd.loot_table is in the central vocabulary
			// seed for this isolated fragment (MF-VAL-300); identity is the table id.
			entries: spec.entries.map((entry) => ({
				result_ref: String(entry.code),
				weight: entry.weight,
			})),
		},
	};
}

export async function buildLootTablesFragment(): Promise<{
	toml: string;
	summaries: ChapterUnitSummary[];
}> {
	// One scene-worth of sequential defines into one fragment via multi-call scene
	// would need driveUnitScene; define_roll_table is self-contained — concatenate
	// per-table fragments.
	const parts: string[] = [];
	const summaries: ChapterUnitSummary[] = [];
	for (const spec of LOOT_TABLE_SPECS) {
		const body = await driveUnitFragment(BUNDLE_ID, defineTableCall(spec));
		parts.push(body);
		summaries.push({
			kind: "roll_tables",
			id: lootTableId(spec.id),
			sourcePk: "cache/markdown/magic-items.md#rarity+gameplay-toolbox",
		});
	}
	const header = [
		"# GENERATED by src/chapters/magic-items/loot-tables.ts — DO NOT EDIT BY HAND.",
		"# Regenerate: pnpm --filter @spellkave/srd-cc run generate",
		"#",
		"# pattern: loot-table-drop",
		"# SRD treasure int roll tables (dsl-grammar.md §RollTable). result_ref is",
		"# always an integer code; LOOT_CODE_CATALOG maps codes → entity_def ids.",
		"",
		"",
	].join("\n");
	return { toml: header + parts.join("\n"), summaries };
}
