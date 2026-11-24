import { readFileSync } from "node:fs";
import path from "node:path";
import { CACHE_MARKDOWN_DIR } from "./paths";
import { isSpellCatalogueEntry } from "./spell-catalogue";

const REPO_CACHE_MARKDOWN_PREFIX = "packages/spellkave-srd-cc/cache/markdown/";

export interface SrdReaderPageSource {
	path: `packages/spellkave-srd-cc/cache/markdown/${string}.md`;
	anchor: string;
	license: "CC-BY-4.0";
}

export interface SrdReaderPage {
	id: string;
	title: string;
	body: string;
	source: SrdReaderPageSource;
	/** Exact source pointers emitted by the source parser for attachment joins. */
	attachment_sources: readonly string[];
}

export interface SrdMarkdownDocument {
	/** Stable compiler-owned key; never derived from an exported catalogue. */
	id: string;
	section: string;
	path: `packages/spellkave-srd-cc/cache/markdown/${string}.md`;
	title: string;
	/** Split the terminal H2 catalogue at its direct H4 entries. */
	tailCatalogue?: string;
}

/**
 * Every CC-BY Markdown source synced by this ruleset compiler. A source may
 * share a docs section with a companion source (for example Animals and
 * Monsters A–Z), but its page ids retain this key to avoid route collisions.
 */
export const SRD_MARKDOWN_DOCUMENTS: readonly SrdMarkdownDocument[] = [
	{
		id: "playing-the-game",
		section: "playing-the-game",
		path: "packages/spellkave-srd-cc/cache/markdown/playing-the-game.md",
		title: "Playing the Game",
	},
	{
		id: "character-creation",
		section: "character-creation",
		path: "packages/spellkave-srd-cc/cache/markdown/character-creation.md",
		title: "Character Creation",
	},
	{
		id: "character-origins",
		section: "character-origins",
		path: "packages/spellkave-srd-cc/cache/markdown/character-origins.md",
		title: "Character Origins",
	},
	{
		id: "classes",
		section: "classes",
		path: "packages/spellkave-srd-cc/cache/markdown/classes.md",
		title: "Classes",
	},
	{
		id: "feats",
		section: "feats",
		path: "packages/spellkave-srd-cc/cache/markdown/feats.md",
		title: "Feats",
	},
	{
		id: "equipment",
		section: "equipment",
		path: "packages/spellkave-srd-cc/cache/markdown/equipment.md",
		title: "Equipment",
	},
	{
		id: "spells",
		section: "spells",
		path: "packages/spellkave-srd-cc/cache/markdown/spells.md",
		title: "Spells",
		tailCatalogue: "Spell Descriptions",
	},
	{
		id: "magic-items",
		section: "magic-items",
		path: "packages/spellkave-srd-cc/cache/markdown/magic-items.md",
		title: "Magic Items",
		tailCatalogue: "Magic Items A–Z",
	},
	{
		id: "monsters",
		section: "monsters",
		path: "packages/spellkave-srd-cc/cache/markdown/monsters.md",
		title: "Monsters",
	},
	{
		id: "monsters-a-z",
		section: "monsters",
		path: "packages/spellkave-srd-cc/cache/markdown/monsters-A-Z.md",
		title: "Monsters A–Z",
	},
	{
		id: "animals",
		section: "monsters",
		path: "packages/spellkave-srd-cc/cache/markdown/animals.md",
		title: "Animals",
	},
	{
		id: "gameplay-toolbox",
		section: "gameplay-toolbox",
		path: "packages/spellkave-srd-cc/cache/markdown/gameplay-toolbox.md",
		title: "Gameplay Toolbox",
	},
	{
		id: "rules-glossary",
		section: "rules-glossary",
		path: "packages/spellkave-srd-cc/cache/markdown/rules-glossary.md",
		title: "Rules Glossary",
		tailCatalogue: "Rules Definitions",
	},
] as const;

function slug(value: string): string {
	const result = value
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	if (result.length === 0)
		throw new Error(`SRD docs reader: cannot make an id from ${JSON.stringify(value)}.`);
	return result;
}

function boundaryTrim(value: string): string {
	return value.replace(/^\r?\n+|\r?\n+$/g, "");
}

function attachmentSource(
	document: SrdMarkdownDocument,
	text: string,
	start: number,
	end: number,
): string {
	const content = text.slice(start, end);
	const leading = content.match(/^\r?\n+/u)?.[0].length ?? 0;
	const trailing = content.match(/\r?\n+$/u)?.[0].length ?? 0;
	const contentStart = start + leading;
	const contentEnd = end - trailing;
	const lineAt = (offset: number) => text.slice(0, offset).split("\n").length;
	const relativePath = document.path.slice(REPO_CACHE_MARKDOWN_PREFIX.length);
	return `cache/markdown/${relativePath}:${lineAt(contentStart)}-${lineAt(contentEnd)}`;
}

/**
 * The repository's `trailing-whitespace` pre-commit hook applies to generated
 * fixtures. In CommonMark, a backslash before a newline renders the same hard
 * line break as the cached source's two trailing spaces. Keep every other
 * byte—including table cells and prose—unchanged before metadata rendering.
 */
export function markdownForMetadata(value: string): string {
	return value.replace(/ {2}(?=\r?\n)/g, "\\\\");
}

function isTailCatalogueEntry(
	document: SrdMarkdownDocument,
	text: string,
	headingEnd: number,
): boolean {
	// Spell stat blocks also use H4 headings (for example "Actions"). A spell
	// entry is distinguished by its source-owned level line, so those statblock
	// headings stay inside the preceding spell page rather than becoming pages.
	return document.id !== "spells" || isSpellCatalogueEntry(text, headingEnd);
}

function sourceText(document: SrdMarkdownDocument): string {
	const text = readFileSync(
		path.join(CACHE_MARKDOWN_DIR, document.path.slice(REPO_CACHE_MARKDOWN_PREFIX.length)),
		"utf8",
	);
	const headings = [...text.matchAll(/^\uFEFF?# (.+)\r?$/gm)];
	if (headings.length !== 1 || headings[0]?.[1] !== document.title) {
		throw new Error(
			`SRD docs reader: ${document.path} must contain exactly '# ${document.title}'.`,
		);
	}
	return text;
}

/**
 * Reads one cached Markdown document into exact H2 pages. H1 is carried by
 * document/page titles; bodies only remove heading-boundary newlines and use
 * {@link markdownForMetadata} for source hard breaks. No other Markdown
 * content is normalized or rewritten.
 */
export function readSrdMarkdownDocumentPages(document: SrdMarkdownDocument): SrdReaderPage[] {
	const text = sourceText(document);
	const h1 = [...text.matchAll(/^\uFEFF?# (.+)\r?$/gm)];
	if (h1.length !== 1 || h1[0]?.[1] !== document.title || h1[0].index === undefined) {
		throw new Error(`SRD docs reader: ${document.path} must have one expected H1.`);
	}
	const headings = [...text.matchAll(/^## (.+)\r?$/gm)];
	if (headings.length === 0) throw new Error(`SRD docs reader: ${document.path} has no H2 pages.`);
	const ids = new Set<string>();
	const pages: SrdReaderPage[] = [];
	const firstH2 = headings[0]?.index;
	const h1End = (h1[0]?.index ?? 0) + (h1[0]?.[0].length ?? 0);
	const preamble = boundaryTrim(text.slice(h1End, firstH2));
	if (preamble.length > 0) {
		pages.push({
			id: `${document.id}-introduction`,
			title: `${document.title} Introduction`,
			body: preamble,
			attachment_sources: [attachmentSource(document, text, h1End, firstH2 ?? text.length)],
			source: {
				path: document.path,
				anchor: document.title,
				license: "CC-BY-4.0",
			},
		});
		ids.add(`${document.id}-introduction`);
	}
	for (const [index, match] of headings.entries()) {
		const title = match[1]?.trim();
		const start = (match.index ?? 0) + match[0].length;
		if (title === undefined || title.length === 0) {
			throw new Error(`SRD docs reader: ${document.path} has an empty H2 page at index ${index}.`);
		}
		if (title === document.tailCatalogue) {
			const childHeadings = [...text.slice(start).matchAll(/^#### (.+)\r?$/gm)]
				.map((child) => ({
					title: child[1]?.trim(),
					index: start + (child.index ?? 0),
					length: child[0].length,
				}))
				.filter((child) => isTailCatalogueEntry(document, text, child.index + child.length));
			if (childHeadings.length === 0) {
				throw new Error(`SRD docs reader: ${document.path} has no H4 entries below '${title}'.`);
			}
			const cataloguePreamble = boundaryTrim(text.slice(start, childHeadings[0]?.index));
			if (cataloguePreamble.length > 0) {
				const id = `${document.id}-${slug(title)}`;
				pages.push({
					id,
					title,
					body: markdownForMetadata(cataloguePreamble),
					attachment_sources: [
						attachmentSource(document, text, start, childHeadings[0]?.index ?? text.length),
					],
					source: {
						path: document.path,
						anchor: `${document.title} > ${title}`,
						license: "CC-BY-4.0",
					},
				});
				ids.add(id);
			}
			for (const [childIndex, child] of childHeadings.entries()) {
				if (child.title === undefined || child.title.length === 0) {
					throw new Error(`SRD docs reader: ${document.path} has an empty H4 catalogue entry.`);
				}
				const body = markdownForMetadata(
					boundaryTrim(
						text.slice(
							child.index + child.length,
							childHeadings[childIndex + 1]?.index ?? text.length,
						),
					),
				);
				if (body.length === 0) {
					throw new Error(
						`SRD docs reader: ${document.path} has empty catalogue entry '${child.title}'.`,
					);
				}
				const id = `${document.id}-${slug(title)}-${slug(child.title)}`;
				if (ids.has(id))
					throw new Error(`SRD docs reader: duplicate page id '${id}' in ${document.path}.`);
				ids.add(id);
				pages.push({
					id,
					title: child.title,
					body,
					attachment_sources: [
						attachmentSource(
							document,
							text,
							child.index + child.length,
							childHeadings[childIndex + 1]?.index ?? text.length,
						),
						attachmentSource(
							document,
							text,
							child.index,
							childHeadings[childIndex + 1]?.index ?? text.length,
						),
					],
					source: {
						path: document.path,
						anchor: `${document.title} > ${title} > ${child.title}`,
						license: "CC-BY-4.0",
					},
				});
			}
			break;
		}
		const end = headings[index + 1]?.index ?? text.length;
		const body = markdownForMetadata(boundaryTrim(text.slice(start, end)));
		if (body.length === 0) {
			throw new Error(`SRD docs reader: ${document.path} has an empty H2 page at index ${index}.`);
		}
		const id = `${document.id}-${slug(title)}`;
		if (ids.has(id))
			throw new Error(`SRD docs reader: duplicate page id '${id}' in ${document.path}.`);
		ids.add(id);
		pages.push({
			id,
			title,
			body,
			attachment_sources: [
				attachmentSource(document, text, start, end),
				attachmentSource(document, text, match.index ?? 0, end),
			],
			source: {
				path: document.path,
				anchor: `${document.title} > ${title}`,
				license: "CC-BY-4.0",
			},
		});
	}
	return pages;
}

export function readSrdReaderPagesForSection(section: string): SrdReaderPage[] {
	return SRD_MARKDOWN_DOCUMENTS.filter((document) => document.section === section).flatMap(
		readSrdMarkdownDocumentPages,
	);
}
