/**
 * Deterministic name linkifier for compendium verbatim text.
 *
 * Rules (docs/compendium-export.md, this file):
 * - longest catalog name first
 * - word boundaries, case-sensitive as the catalog writes the name
 * - one link per name per line (the prepared-pattern regression test pins this)
 * - never inside an existing markdown/HTML link or tag
 * - never in a heading line
 * - never self-links
 * - skip names shorter than 4 characters except SHORT_EXACT_NAMES
 */

import { kindChapterForId, slugFromId } from "./catalog";

/** Three-letter SRD names that still link when capitalised exactly. */
export const SHORT_EXACT_NAMES = ["Aid", "Bane"] as const;

/** Catalog names we never auto-link (too common as English). Empty on purpose — length + exact-short covers the brief. */
export const LINKIFY_STOPLIST = new Set<string>([]);

export interface CatalogName {
	id: string;
	name: string;
	href: string;
}

interface PreparedCatalogName extends CatalogName {
	pattern: RegExp;
}

export function hrefFromCatalogId(id: string): string {
	const mapping = kindChapterForId(id);
	if (mapping === undefined) return "";
	return `/docs/srd/${mapping.chapter}/${slugFromId(id)}`;
}

export function hrefForCompendiumEntry(entry: {
	id: string;
	chapter: string;
	slug: string;
}): string {
	if (entry.id.startsWith("kavemouth")) {
		return `/docs/adventures/kavemouth/${entry.chapter}/${entry.slug}`;
	}
	return `/docs/srd/${entry.chapter}/${entry.slug}`;
}

export function catalogNamesForLinkify(
	entries: ReadonlyArray<{ id: string; name: string; chapter: string; slug: string }>,
): CatalogName[] {
	const names: CatalogName[] = [];
	for (const entry of entries) {
		const name = entry.name.trim();
		if (name.length === 0) continue;
		if (LINKIFY_STOPLIST.has(name)) continue;
		const shortOk = (SHORT_EXACT_NAMES as readonly string[]).includes(name);
		if (name.length < 4 && !shortOk) continue;
		names.push({
			id: entry.id,
			name,
			href: hrefForCompendiumEntry(entry),
		});
	}
	names.sort(
		(left, right) =>
			right.name.length - left.name.length ||
			left.name.localeCompare(right.name) ||
			left.id.localeCompare(right.id),
	);
	return names;
}

function stashProtect(source: string): { text: string; tokens: string[] } {
	const tokens: string[] = [];
	const stash = (match: string): string => {
		tokens.push(match);
		return `%%LK${tokens.length - 1}%%`;
	};
	let text = source.replace(/\[[^\]]+\]\([^)]+\)/g, stash);
	text = text.replace(/<[^>]+>/g, stash);
	return { text, tokens };
}

function restoreProtect(text: string, tokens: string[]): string {
	return text.replace(/%%LK(\d+)%%/g, (_, index: string) => tokens[Number(index)] ?? "");
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function linkifyLine(line: string, catalog: PreparedCatalogName[], selfId: string): string {
	if (/^#{1,6}\s/.test(line.trimStart())) return line;
	const { text: protectedText, tokens } = stashProtect(line);
	let working = protectedText;
	const linked = new Set<string>();
	for (const item of catalog) {
		if (item.id === selfId) continue;
		if (linked.has(item.name)) continue;
		const match = item.pattern.exec(working);
		if (match === null || match.index === undefined || match[1] === undefined) continue;
		const at = match.index + match[1].length;
		working = `${working.slice(0, at)}[${item.name}](${item.href})${working.slice(at + item.name.length)}`;
		linked.add(item.name);
	}
	return restoreProtect(working, tokens);
}

function linkifyParagraph(
	paragraph: string,
	catalog: PreparedCatalogName[],
	selfId: string,
): string {
	return paragraph
		.split("\n")
		.map((line) => linkifyLine(line, catalog, selfId))
		.join("\n");
}

/** Prepare one stable catalog for multiple entries. Non-global patterns carry no match state. */
export function createLinkifier(catalog: CatalogName[]) {
	const prepared = catalog.map((item) => ({
		...item,
		pattern: new RegExp(`(^|[^A-Za-z0-9])(${escapeRegExp(item.name)})(?![A-Za-z0-9])`),
	}));
	return (text: string, selfId: string): string => {
		if (text.length === 0 || prepared.length === 0) return text;
		const parts = text.split(/(\n{2,})/);
		return parts
			.map((part, index) => (index % 2 === 1 ? part : linkifyParagraph(part, prepared, selfId)))
			.join("");
	};
}

/** Link catalog names in verbatim markdown/plain text. Deterministic. */
export function linkifyVerbatim(text: string, catalog: CatalogName[], selfId: string): string {
	if (text.length === 0 || catalog.length === 0) return text;
	return createLinkifier(catalog)(text, selfId);
}
