import type { CompendiumStat } from "./types";

const TAG_STATS: ReadonlyArray<readonly [RegExp, string, string, (raw: string) => string]> = [
	[/^srd\.spell\.level\.(\d+)$/, "level", "Level", (raw) => raw],
	[/^srd\.spell\.school\.(.+)$/, "school", "School", title],
	[/^srd\.spell\.casting_time\.(.+)$/, "casting_time", "Casting time", title],
	[/^srd\.spell\.range\.(.+)$/, "range", "Range", unslug],
	[/^srd\.spell\.duration\.(.+)$/, "duration", "Duration", unslug],
	[/^srd\.magic_item\.rarity\.(.+)$/, "rarity", "Rarity", title],
	[/^srd\.magic_item\.category\.(.+)$/, "category", "Category", title],
	[/^srd\.creature_type\.(.+)$/, "creature_type", "Type", title],
	[/^srd\.size\.(.+)$/, "size", "Size", title],
	[/^srd\.cr\.(.+)$/, "challenge", "Challenge", (raw) => raw.replace("-", "/")],
	[/^srd\.feat\.(.+)$/, "feat_category", "Category", title],
	[/^srd\.weapon\.category\.(.+)$/, "category", "Category", title],
	[/^srd\.weapon\.range\.(.+)$/, "range_class", "Range class", title],
	[/^srd\.armor\.(.+)$/, "armor_class", "Armor class", title],
];

function title(raw: string): string {
	return raw
		.split("_")
		.filter(Boolean)
		.map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
		.join(" ");
}

function unslug(raw: string): string {
	return raw.replaceAll("_", " ");
}

export function statsFromTags(tags: readonly string[]): CompendiumStat[] {
	const stats: CompendiumStat[] = [];
	const seen = new Set<string>();
	for (const tag of tags) {
		for (const [pattern, key, label, format] of TAG_STATS) {
			const match = pattern.exec(tag);
			const captured = match?.[1];
			if (captured === undefined || seen.has(key)) continue;
			seen.add(key);
			stats.push({ key, label, value: format(captured) });
		}
	}
	return stats;
}
