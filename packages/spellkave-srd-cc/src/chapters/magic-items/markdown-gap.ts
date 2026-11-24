/** Identity-only magic items that open5e MagicItem.json does not list.
 * Rules text is the magic-items.md heading. No behaviour is authored here.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { readItemFlavor } from "../../flavor/read";
import { CACHE_MARKDOWN_DIR } from "../../markdown/paths.ts";
import {
	markdownHeadingBlock,
	srdTextAttachmentWriteCall,
	srdTextNamespaceWriteCall,
} from "../../text";
import type { ChapterUnitSummary } from "../chapter-types.ts";
import { driveUnitScene } from "../verb-runner.ts";
import { buildMagicItemTagValueUnits } from "./magic-item-tag-values";
import {
	BUNDLE_ID,
	type MagicItemCategory,
	type MagicItemRarity,
	type MagicItemUnit,
	tagSlug,
} from "./magic-item-units";

const MARKDOWN_HEADINGS = [
	"Bead of Nourishment",
	"Belt of Dwarvenkind",
	"Cloak of Invisibility",
	"Elixir of Health",
	"Energy Bow",
	"Gloves of Thievery",
	"Hat of Many Spells",
	"Potion of Invulnerability",
	"Potion of Longevity",
	"Potion of Vitality",
	"Quarterstaff of the Acrobat",
	"Ring of Telekinesis",
	"Rod of Resurrection",
	"Sending Stones",
	"Sentinel Shield",
	"Shield of the Cavalier",
	"Thunderous Greatclub",
	"Wand of Fear",
	"Ioun Stone",
	"Spell Scroll",
] as const;

const CATEGORY_FROM_LABEL: Record<string, MagicItemCategory | "scroll"> = {
	"wondrous item": "wondrous-item",
	potion: "potion",
	weapon: "weapon",
	ring: "ring",
	rod: "rod",
	armor: "armor",
	wand: "wand",
	scroll: "scroll",
};

const RARITY_FROM_LABEL: Record<string, MagicItemRarity | "varies"> = {
	common: "common",
	uncommon: "uncommon",
	rare: "rare",
	"very rare": "very-rare",
	legendary: "legendary",
	artifact: "artifact",
	"rarity varies": "varies",
	varies: "varies",
};

function markdown(): string {
	return readFileSync(path.join(CACHE_MARKDOWN_DIR, "magic-items.md"), "utf8");
}

function slugify(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

function typeLineAfter(heading: string): string {
	const lines = markdown().split(/\r?\n/);
	const index = lines.indexOf(`#### ${heading}`);
	if (index < 0) throw new Error(`markdown-gap: missing heading '${heading}'.`);
	for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
		const line = lines[cursor]?.trim();
		if (line) return line.replace(/^_|_$/g, "");
	}
	throw new Error(`markdown-gap: heading '${heading}' has no type line.`);
}

function parseTypeLine(line: string): {
	category: MagicItemCategory | "scroll";
	rarity: MagicItemRarity | "varies";
	requiresAttunement: boolean;
} {
	const [rawCategory, rawRarity] = line.split(",").map((part) => part.trim());
	if (rawCategory === undefined || rawRarity === undefined) {
		throw new Error(`markdown-gap: type line '${line}' is not 'Category, Rarity'.`);
	}
	const categoryLabel = rawCategory
		.replace(/\s*\([^)]*\)\s*/g, "")
		.trim()
		.toLowerCase();
	const category = CATEGORY_FROM_LABEL[categoryLabel];
	if (category === undefined) {
		throw new Error(`markdown-gap: unrecognized category '${rawCategory}'.`);
	}
	const rarityBody = rawRarity
		.replace(/\s*\([^)]*\)\s*/g, "")
		.trim()
		.toLowerCase();
	const rarity = RARITY_FROM_LABEL[rarityBody];
	if (rarity === undefined) {
		throw new Error(`markdown-gap: unrecognized rarity '${rawRarity}'.`);
	}
	return { category, rarity, requiresAttunement: /requires attunement/i.test(line) };
}

function tagsFor(
	category: MagicItemCategory | "scroll",
	rarity: MagicItemRarity | "varies",
	requiresAttunement: boolean,
): string[] {
	return [
		"srd.item",
		"srd.magic_item",
		`srd.magic_item.category.${tagSlug(category)}`,
		`srd.magic_item.rarity.${tagSlug(rarity)}`,
		requiresAttunement ? "srd.magic_item.attunement.required" : "srd.magic_item.attunement.none",
	];
}

function unit(args: {
	slug: string;
	displayName: string;
	category: MagicItemCategory | "scroll";
	rarity: MagicItemRarity | "varies";
	requiresAttunement: boolean;
	sourcePk: string;
	heading: string;
}): MarkdownGapUnit {
	return {
		slug: args.slug,
		entityId: `${BUNDLE_ID}/magic_item/${args.slug}`,
		displayName: args.displayName,
		category: args.category === "scroll" ? "wondrous-item" : args.category,
		rarity: args.rarity === "varies" ? "common" : args.rarity,
		requiresAttunement: args.requiresAttunement,
		plusBonus: null,
		hasCharges: false,
		chargeCount: null,
		weaponPk: null,
		armorPk: null,
		tags: tagsFor(args.category, args.rarity, args.requiresAttunement),
		description: readItemFlavor(args.slug).body,
		sourcePk: args.sourcePk,
		heading: args.heading,
		folder: args.category === "scroll" ? "scroll" : args.category,
	};
}

export interface MarkdownGapUnit extends MagicItemUnit {
	heading: string;
	folder: string;
}

function iounVariants(): MarkdownGapUnit[] {
	const section = markdownHeadingBlock("magic-items.md", "Ioun Stone").text;
	const found = [
		...section.matchAll(/_([A-Za-z][A-Za-z ]+?) \((Very Rare|Rare|Legendary)\)\.?_?/g),
	];
	if (found.length !== 14) {
		throw new Error(`markdown-gap: expected 14 Ioun Stone variants, found ${found.length}.`);
	}
	return found.map((match) => {
		const name = match[1];
		const rarityLabel = match[2];
		if (name === undefined || rarityLabel === undefined) {
			throw new Error("markdown-gap: Ioun Stone variant match was empty.");
		}
		const rarity = RARITY_FROM_LABEL[rarityLabel.toLowerCase()];
		if (rarity === undefined || rarity === "varies") {
			throw new Error(`markdown-gap: Ioun Stone rarity '${rarityLabel}' is not closed.`);
		}
		return unit({
			slug: `ioun-stone-${slugify(name)}`,
			displayName: `Ioun Stone (${name})`,
			category: "wondrous-item",
			rarity,
			requiresAttunement: true,
			sourcePk: "magic-items.md:Ioun Stone",
			heading: "Ioun Stone",
		});
	});
}

function giantTiers(): MarkdownGapUnit[] {
	const section = markdownHeadingBlock("magic-items.md", "Potion of Giant Strength").text;
	const found = [
		...section.matchAll(
			/<td>Potion of Giant Strength \(([^)]+)\)<\/td>\s*<td>\d+<\/td>\s*<td>([^<]+)<\/td>/g,
		),
	];
	if (found.length !== 5) {
		throw new Error(`markdown-gap: expected 5 giant-strength tiers, found ${found.length}.`);
	}
	return found.map((match) => {
		const kind = match[1];
		const rarityLabel = match[2]?.trim();
		if (kind === undefined || rarityLabel === undefined) {
			throw new Error("markdown-gap: giant-strength tier match was empty.");
		}
		const rarity = RARITY_FROM_LABEL[rarityLabel.toLowerCase()];
		if (rarity === undefined || rarity === "varies") {
			throw new Error(`markdown-gap: giant-strength rarity '${rarityLabel}' is not closed.`);
		}
		return unit({
			slug: `potion-of-giant-strength-${slugify(kind)}`,
			displayName: `Potion of Giant Strength (${kind})`,
			category: "potion",
			rarity,
			requiresAttunement: false,
			sourcePk: "magic-items.md:Potion of Giant Strength",
			heading: "Potion of Giant Strength",
		});
	});
}

/** Headings and table variants missing from MagicItem.json. */
export function markdownGapUnits(): MarkdownGapUnit[] {
	const headings = MARKDOWN_HEADINGS.map((heading) => {
		const parsed = parseTypeLine(typeLineAfter(heading));
		const sourcePk =
			heading === "Spell Scroll"
				? "srd-2024_spell-scroll"
				: heading === "Ioun Stone"
					? "srd-2024_ioun-stone"
					: `magic-items.md:${heading}`;
		return unit({
			slug: slugify(heading),
			displayName: heading,
			category: parsed.category,
			rarity: parsed.rarity,
			requiresAttunement: parsed.requiresAttunement,
			sourcePk,
			heading,
		});
	});
	return [...headings, ...iounVariants(), ...giantTiers()];
}

export const MARKDOWN_GAP_EXTRA_TAGS = [
	"srd.magic_item.category.scroll",
	"srd.magic_item.rarity.varies",
] as const;

export async function buildMarkdownGapFragments(): Promise<{
	fragments: Record<string, string>;
	units: ChapterUnitSummary[];
}> {
	const fragments: Record<string, string> = {};
	const units: ChapterUnitSummary[] = [];
	for (const row of markdownGapUnits()) {
		const extracted = markdownHeadingBlock("magic-items.md", row.heading);
		const calls = [
			srdTextNamespaceWriteCall(),
			{
				toolName: "spellkave_write_rows" as const,
				label: `markdown-gap-tags:${row.slug}`,
				params: {
					bundle: BUNDLE_ID,
					kind: "tag_value_definitions",
					rows: [
						{
							tag: "srd.item",
							prefix: "srd",
							bundle_id: BUNDLE_ID,
							description: "Identifies an entity definition as an item.",
						},
						...buildMagicItemTagValueUnits().map(({ tag, prefix, description }) => ({
							tag,
							prefix,
							bundle_id: BUNDLE_ID,
							description,
						})),
					],
				},
			},
			{
				toolName: "spellkave_define_entity_type" as const,
				label: `markdown-gap:${row.slug}`,
				params: {
					bundle: BUNDLE_ID,
					id: `magic_item/${row.slug}`,
					display_name: row.displayName,
					description: row.description,
					tags: row.tags,
					...(row.folder === "potion" ? { stackable: true } : {}),
				},
			},
			srdTextAttachmentWriteCall({
				targetKind: "entity_definition",
				targetRef: row.entityId,
				extracted: {
					...extracted,
					source: `${extracted.source}; ${row.sourcePk}`,
				},
			}),
		];
		const body = await driveUnitScene("srd", calls, undefined, {
			omitRowKinds: ["metadata_namespaces", "tag_value_definitions"],
		});
		fragments[`base/magic-items/${row.folder}/${row.slug}.toml`] =
			"# GENERATED by src/chapters/magic-items/markdown-gap.ts — DO NOT EDIT BY HAND.\n" +
			"# Regenerate: pnpm --filter @spellkave/srd-cc run generate\n" +
			`# Identity only. Source: cache/markdown/magic-items.md heading '${row.heading}'.\n` +
			`# Cited pk: ${row.sourcePk}\n\n` +
			body;
		units.push({ kind: "entity_definitions", id: row.entityId, sourcePk: row.sourcePk });
	}
	return { fragments, units };
}
