import type { CompendiumAuthorDoc } from "./types";

const GENERATOR_BY_CHAPTER: Record<string, string> = {
	spells: "src/chapters/spells/index.ts",
	monsters: "src/chapters/monsters/index.ts",
	"magic-items": "src/chapters/magic-items/index.ts",
	feats: "src/chapters/feats/index.ts",
	equipment: "src/chapters/equipment/index.ts",
	classes: "src/chapters/classes/index.ts",
	"character-origins": "src/chapters/character-origins/index.ts",
	"character-creation": "src/chapters/character-creation/index.ts",
	"playing-the-game": "src/chapters/playing-the-game/index.ts",
};

const DOCS_BY_KIND: Record<string, CompendiumAuthorDoc[]> = {
	spell: [
		{ id: "spell-authoring-best-practices", title: "Spell authoring" },
		{ id: "dsl-grammar", title: "DSL grammar" },
	],
	monster: [{ id: "getting-started-with-verbs", title: "Getting started with verbs" }],
	"magic-item": [{ id: "metadata-attachments", title: "Metadata attachments" }],
	feat: [{ id: "identity-tag-capability-grant", title: "Identity tag capability grant" }],
	class: [{ id: "advancement-choice", title: "Advancement choice" }],
	weapon: [{ id: "item-sourced-damage", title: "Item-sourced damage" }],
	armor: [{ id: "item-sourced-damage", title: "Item-sourced damage" }],
};

const DEFAULT_DOCS: CompendiumAuthorDoc[] = [
	{ id: "metadata-attachments", title: "Metadata attachments" },
	{ id: "getting-started-with-verbs", title: "Getting started with verbs" },
];

export function generatorForChapter(chapter: string): string {
	return GENERATOR_BY_CHAPTER[chapter] ?? `src/chapters/${chapter}/index.ts`;
}

export function docsForKind(kind: string): CompendiumAuthorDoc[] {
	return DOCS_BY_KIND[kind] ?? DEFAULT_DOCS;
}

const PATTERN_RE = /^# pattern: (\S+)/gm;

export function patternsFromToml(toml: string): string[] {
	const found = new Set<string>();
	PATTERN_RE.lastIndex = 0;
	for (const match of toml.matchAll(PATTERN_RE)) {
		const slug = match[1];
		if (slug !== undefined && slug !== "none") found.add(slug);
	}
	return [...found].sort();
}

/** A short excerpt of `toml` centered on the `[[...]]` block naming `needle`. */
export function tomlExcerpt(toml: string, needle: string, cap = 8000): string {
	if (toml.length === 0) return "";
	if (toml.length <= cap) return toml;
	const at = toml.indexOf(needle);
	const start = at <= 0 ? 0 : Math.max(0, toml.lastIndexOf("\n[[", at));
	const slice = toml.slice(start, start + cap);
	return slice.length < toml.length - start ? `${slice}\n# …` : slice;
}
