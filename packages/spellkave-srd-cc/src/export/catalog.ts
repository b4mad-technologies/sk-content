/** Catalog identities the completeness lint treats as compendium entries. */

export const REQUIRED_ENTITY_PREFIXES = [
	"srd/spell/",
	"srd/creature/",
	"srd/magic_item/",
	"srd/feat/",
	"srd/item/",
	"srd/weapon/",
	"srd/armor/",
	"srd/tool/",
	"srd/class/",
	"srd/subclass/",
	"srd/species/",
	"srd/background/",
	"srd/trait/",
	"srd/class-feature/",
] as const;

export const EXEMPT_ENTITY_IDS = new Set(["srd/item/gold-piece"]);

export const REQUIRED_RESOURCES = [
	"srd/str",
	"srd/dex",
	"srd/con",
	"srd/int",
	"srd/wis",
	"srd/cha",
];

export interface KindChapter {
	kind: string;
	chapter: string;
}

const KIND_BY_PREFIX: ReadonlyArray<readonly [string, KindChapter]> = [
	["srd/class-feature/", { kind: "class-feature", chapter: "classes" }],
	["srd/spell/", { kind: "spell", chapter: "spells" }],
	["srd/creature/", { kind: "monster", chapter: "monsters" }],
	["srd/magic_item/", { kind: "magic-item", chapter: "magic-items" }],
	["srd/feat/", { kind: "feat", chapter: "feats" }],
	["srd/class/", { kind: "class", chapter: "classes" }],
	["srd/subclass/", { kind: "subclass", chapter: "classes" }],
	["srd/species/", { kind: "species", chapter: "character-origins" }],
	["srd/background/", { kind: "background", chapter: "character-origins" }],
	["srd/trait/", { kind: "trait", chapter: "character-origins" }],
	["srd/weapon/", { kind: "weapon", chapter: "equipment" }],
	["srd/armor/", { kind: "armor", chapter: "equipment" }],
	["srd/tool/", { kind: "tool", chapter: "equipment" }],
	["srd/item/", { kind: "item", chapter: "equipment" }],
];

export function kindChapterForId(id: string): KindChapter | undefined {
	if (REQUIRED_RESOURCES.includes(id)) {
		return { kind: "ability", chapter: "playing-the-game" };
	}
	for (const [prefix, mapping] of KIND_BY_PREFIX) {
		if (id.startsWith(prefix)) return mapping;
	}
	return undefined;
}

export function isCatalogEntityId(id: string): boolean {
	if (EXEMPT_ENTITY_IDS.has(id)) return false;
	return REQUIRED_ENTITY_PREFIXES.some((prefix) => id.startsWith(prefix));
}

export function slugFromId(id: string): string {
	const slash = id.lastIndexOf("/");
	return slash === -1 ? id : id.slice(slash + 1);
}
