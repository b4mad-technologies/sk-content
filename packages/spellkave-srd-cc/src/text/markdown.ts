// DOC-IMPL: srd-text#markdown
// Heading/anchor extraction over committed `cache/markdown/*.md`.
import { readFileSync } from "node:fs";
import path from "node:path";
import { CACHE_MARKDOWN_DIR } from "../markdown/paths";
import { isSpellCatalogueEntry } from "../markdown/spell-catalogue";
import { normalizeWhitespace } from "./normalize";
import type { ExtractedSrdText } from "./types";

const fileCache = new Map<string, string>();

function readMarkdownFile(file: string): string {
	const cached = fileCache.get(file);
	if (cached !== undefined) return cached;
	const content = readFileSync(path.join(CACHE_MARKDOWN_DIR, file), "utf8");
	fileCache.set(file, content);
	return content;
}

function headingLevel(line: string): number | undefined {
	const match = /^(#{1,6})\s+\S/.exec(line);
	return match?.[1]?.length;
}

/**
 * Extract the section whose heading text equals `heading` (ATX, any level).
 * Unique match required — pass `file` that owns the heading when names collide.
 */
export function markdownHeadingBlock(file: string, heading: string): ExtractedSrdText {
	const content = readMarkdownFile(file);
	const lines = content.split(/\r?\n/);
	const matches: { index: number; level: number }[] = [];
	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index];
		if (line === undefined) continue;
		const match = /^(#{1,6})\s+(.+)$/.exec(line);
		if (match?.[2]?.trim() === heading && match[1] !== undefined) {
			matches.push({ index, level: match[1].length });
		}
	}
	if (matches.length === 0) {
		throw new Error(`srd-text: no heading '${heading}' in cache/markdown/${file}.`);
	}
	const deepest = Math.max(...matches.map((row) => row.level));
	const deep = matches.filter((row) => row.level === deepest);
	if (deep.length > 1) {
		throw new Error(
			`srd-text: heading '${heading}' is not unique in cache/markdown/${file} (${deep.length} level-${deepest} matches).`,
		);
	}
	const startIndex = deep[0]?.index;
	if (startIndex === undefined) {
		throw new Error(`srd-text: heading '${heading}' vanished in cache/markdown/${file}.`);
	}
	const startLine = lines[startIndex];
	if (startLine === undefined) {
		throw new Error(`srd-text: heading line missing for '${heading}' in cache/markdown/${file}.`);
	}
	const level = headingLevel(startLine);
	if (level === undefined) {
		throw new Error(`srd-text: '${heading}' is not an ATX heading in cache/markdown/${file}.`);
	}
	let endIndex = lines.length - 1;
	for (let index = startIndex + 1; index < lines.length; index += 1) {
		const line = lines[index];
		if (line === undefined) continue;
		const nextLevel = headingLevel(line);
		if (nextLevel !== undefined && nextLevel <= level) {
			endIndex = index - 1;
			break;
		}
	}
	while (endIndex > startIndex && (lines[endIndex] ?? "").trim() === "") endIndex -= 1;
	const block = lines.slice(startIndex, endIndex + 1).join("\n");
	const start = startIndex + 1;
	const end = endIndex + 1;
	return {
		text: normalizeWhitespace(block),
		source: `cache/markdown/${file}:${start}-${end}`,
	};
}

/**
 * Extract one spell's canonical H4 block. The SRD embeds H2 stat blocks with
 * their own H4 Traits/Actions headings in three spells, so a generic heading
 * boundary would truncate their authored prose. The shared catalogue-entry
 * predicate treats only a following level/cantrip-signature H4 as the next
 * spell boundary.
 */
export function spellMarkdownBlock(displayName: string): ExtractedSrdText {
	const file = "spells.md";
	const content = readMarkdownFile(file);
	const headings = [...content.matchAll(/^#### (.+)\r?$/gm)]
		.map((match) => ({
			title: match[1]?.trim(),
			index: match.index,
			length: match[0].length,
		}))
		.filter((match) => match.title === displayName);
	if (headings.length === 0) {
		throw new Error(`srd-text: no spell heading '${displayName}' in cache/markdown/${file}.`);
	}
	if (headings.length > 1) {
		throw new Error(
			`srd-text: spell heading '${displayName}' is not unique in cache/markdown/${file} (${headings.length} level-4 matches).`,
		);
	}
	const start = headings[0];
	if (start?.index === undefined) {
		throw new Error(`srd-text: spell heading '${displayName}' vanished in cache/markdown/${file}.`);
	}
	const startBody = start.index + start.length;
	const following = [...content.slice(startBody).matchAll(/^#### (.+)\r?$/gm)]
		.map((match) => ({ index: startBody + (match.index ?? 0), length: match[0].length }))
		.find((match) => isSpellCatalogueEntry(content, match.index + match.length));
	let end = following?.index ?? content.length;
	while (end > start.index && content[end - 1]?.trim() === "") end -= 1;
	const startLine = content.slice(0, start.index).split(/\r?\n/).length;
	const endLine = content.slice(0, end).split(/\r?\n/).length;
	return {
		text: normalizeWhitespace(content.slice(start.index, end)),
		source: `cache/markdown/${file}:${startLine}-${endLine}`,
	};
}

const CREATURE_MARKDOWN_FILES = ["monsters-A-Z.md", "animals.md", "magic-items.md"] as const;

/** Creature stat-block markdown: A–Z bestiary, animals appendix, then magic-item mounts. */
export function creatureMarkdownBlock(displayName: string): ExtractedSrdText {
	const errors: string[] = [];
	for (const file of CREATURE_MARKDOWN_FILES) {
		try {
			return markdownHeadingBlock(file, displayName);
		} catch (error) {
			errors.push(error instanceof Error ? error.message : String(error));
		}
	}
	throw new Error(
		`srd-text: no markdown heading '${displayName}' in ${CREATURE_MARKDOWN_FILES.join(", ")}: ${errors.join("; ")}`,
	);
}
