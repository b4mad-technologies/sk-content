// Targeted reader for `cache/markdown/classes.md` — extracts, per class:
//   - the "Core `<Class>` Traits" table (`ledger/classes.md`'s "Sources"
//     note: IDENTICAL section shape across all 12 classes — Primary Ability,
//     Hit Point Die, Saving Throw Proficiencies, Skill Proficiencies, an
//     OPTIONAL Tool Proficiencies row (Bard/Druid/Monk/Rogue only), Armor
//     Training, Starting Equipment). MARKDOWN-ONLY deliberately: the
//     structurally-equivalent `ClassFeature.json` `CORE_TRAITS_TABLE` rows'
//     own `desc` field carries LINE-WRAP TEXT CORRUPTION (verified: "Na
//     ture"/"Ar rows"/"Ar mor"/"In sight"/"Ar cane" for Nature/Arrows/
//     Armor/Insight/Arcane on the Druid/Ranger/Wizard/Warlock rows) — this
//     module's own HTML-table read is the clean source, same
//     "question, never copy blindly" posture the rest of this package
//     applies to every cache file.
//   - the class's own subclass section ("`<Class>` Subclass: `<Name>`"): the
//     display name, the italic flavor line immediately following the
//     heading, and the first prose paragraph — identity-tier only (the
//     per-level feature `####` sections below it are K2+ scope, `ledger/
//     classes.md`'s slice plan).
//
// A small targeted anchor+regex read per class, failing LOUDLY if a class's
// anchor or table shape moves — same posture as `character-creation.ts`'s
// own readers (this module's local `lineOfOffset`/`extractHtmlTableBlock`
// helpers are deliberately a SEPARATE copy, not a shared import — every
// markdown reader in this package hand-rolls its own, `character-
// creation.ts`'s functions are file-local, not exported).
import { readFileSync } from "node:fs";
import path from "node:path";
import { normalizeWhitespace } from "../text/normalize";
import type { ExtractedSrdText } from "../text/types";
import { CACHE_MARKDOWN_DIR } from "./paths";

function lineOfOffset(content: string, offset: number): number {
	return content.slice(0, offset).split("\n").length;
}

function readClassesMarkdown(): { content: string; filePath: string } {
	const filePath = path.join(CACHE_MARKDOWN_DIR, "classes.md");
	return { content: readFileSync(filePath, "utf8"), filePath };
}

/** One label/value row of a Core Traits table, in printed order. */
export interface CoreTraitsRow {
	label: string;
	value: string;
}

/** The parsed Core Traits table for one class, plus its own citation anchor. */
export interface CoreTraitsTable {
	rows: CoreTraitsRow[];
	/** `classes.md:<start>-<end>`, the `<table>`..`</table>` block's own line range. */
	anchor: string;
}

const CORE_TRAITS_ROW_PATTERN = /<tr>\s*<td>([^<]+)<\/td>\s*<td>([^<]+)<\/td>\s*<\/tr>/g;
const EXPECTED_CORE_TRAITS_MIN_ROWS = 7;
const EXPECTED_CORE_TRAITS_MAX_ROWS = 8;

/**
 * Parse the "Core `<className>` Traits" table (e.g. `className = "Barbarian"`
 * -> anchor `**Core Barbarian Traits**`). 7 rows for most classes, 8 for the
 * 4 with a Tool Proficiencies row (Bard, Druid, Monk, Rogue) — no `<thead>`
 * (unlike `character-creation.ts`'s tables), so this reads every `<tr>` in
 * the `<tbody>` generically rather than asserting a fixed row count.
 */
export function readCoreTraitsTable(className: string): CoreTraitsTable {
	const { content, filePath } = readClassesMarkdown();
	const anchor = `**Core ${className} Traits**`;
	const anchorIndex = content.indexOf(anchor);
	if (anchorIndex === -1) {
		throw new Error(
			`classes markdown reader: anchor '${anchor}' not found in ${filePath} — the Core Traits ` +
				"table heading may have been reworded upstream.",
		);
	}
	const tableStart = content.indexOf("<table>", anchorIndex);
	if (tableStart === -1 || tableStart - anchorIndex > 200) {
		throw new Error(
			`classes markdown reader: no '<table>' found shortly after '${anchor}' in ${filePath} — ` +
				"the Core Traits table may have moved.",
		);
	}
	const tableEnd = content.indexOf("</table>", tableStart);
	if (tableEnd === -1) {
		throw new Error(`classes markdown reader: unterminated '<table>' for '${className}'.`);
	}
	const block = content.slice(tableStart, tableEnd + "</table>".length);
	const rows: CoreTraitsRow[] = [];
	for (const match of block.matchAll(CORE_TRAITS_ROW_PATTERN)) {
		const [, label, value] = match;
		if (label === undefined || value === undefined) {
			throw new Error(
				`classes markdown reader: malformed Core Traits row for '${className}': ${match[0]}`,
			);
		}
		rows.push({ label: label.trim(), value: value.trim() });
	}
	if (rows.length < EXPECTED_CORE_TRAITS_MIN_ROWS || rows.length > EXPECTED_CORE_TRAITS_MAX_ROWS) {
		throw new Error(
			`classes markdown reader: expected ${EXPECTED_CORE_TRAITS_MIN_ROWS}-` +
				`${EXPECTED_CORE_TRAITS_MAX_ROWS} Core Traits rows for '${className}', parsed ` +
				`${rows.length} — the table shape may have changed.`,
		);
	}
	const startLine = lineOfOffset(content, tableStart);
	const endLine = lineOfOffset(content, tableEnd);
	return { rows, anchor: `classes.md:${startLine}-${endLine}` };
}

/** `classes.md:<line>` of the class's own `## <className>` heading. */
export function classHeadingAnchor(className: string): string {
	const { content, filePath } = readClassesMarkdown();
	const heading = `## ${className}`;
	const index = content.indexOf(`\n${heading}\n`);
	if (index === -1) {
		throw new Error(
			`classes markdown reader: heading '${heading}' not found in ${filePath} — the class list may ` +
				"have been reworded upstream.",
		);
	}
	return `classes.md:${lineOfOffset(content, index + 1)}`;
}

/**
 * The class's own section span: from its `## <className>` heading through the
 * line immediately before the NEXT `## ` heading (or EOF for the last class).
 * K2 (Classes, Fighter vertical, `ledger/classes.md`): this bounds
 * {@link featureHeadingAnchor}/{@link featuresTableAnchor} to ONE class'
 * subtree — several feature names (e.g. "Extra Attack", "Ability Score
 * Improvement") repeat verbatim across multiple classes' own `#### Level N:`
 * headings, so an unbounded whole-file search would silently match the WRONG
 * class (whichever happens to appear first in the file). The class's own
 * subclass section (`### <Class> Subclass: <Name>` and its per-level `####`
 * feature headings) is deliberately INCLUDED — it sits inside this same span,
 * before the next `## ` class heading.
 */
function classSectionBounds(className: string): {
	content: string;
	filePath: string;
	start: number;
	end: number;
} {
	const { content, filePath } = readClassesMarkdown();
	const heading = `## ${className}`;
	const start = content.indexOf(`\n${heading}\n`);
	if (start === -1) {
		throw new Error(
			`classes markdown reader: heading '${heading}' not found in ${filePath} — the class list may ` +
				"have been reworded upstream.",
		);
	}
	const searchFrom = start + 1 + heading.length;
	const nextHeadingMatch = /\n## /.exec(content.slice(searchFrom));
	const end =
		nextHeadingMatch?.index === undefined ? content.length : searchFrom + nextHeadingMatch.index;
	return { content, filePath, start, end };
}

function featureScopeBounds(className: string, subclassName?: string) {
	const bounds = classSectionBounds(className);
	const firstSubclass = /\n### [^\n]+ Subclass: /.exec(
		bounds.content.slice(bounds.start, bounds.end),
	);
	if (subclassName === undefined) {
		return {
			...bounds,
			end: firstSubclass?.index === undefined ? bounds.end : bounds.start + firstSubclass.index,
		};
	}
	const heading = `### ${className} Subclass: ${subclassName}`;
	const start = bounds.content.indexOf(`\n${heading}\n`, bounds.start);
	if (start === -1 || start >= bounds.end) {
		throw new Error(`classes markdown reader: subclass heading '${heading}' was not found.`);
	}
	const afterHeading = start + 1 + heading.length;
	const nextParent = /\n#{2,3} /.exec(bounds.content.slice(afterHeading, bounds.end));
	return {
		...bounds,
		start,
		end: nextParent?.index === undefined ? bounds.end : afterHeading + nextParent.index,
	};
}

export function classFeatureMarkdownBlock(args: {
	className: string;
	subclassName?: string;
	displayName: string;
	level?: number;
}): ExtractedSrdText {
	const { content, filePath, start, end } = featureScopeBounds(args.className, args.subclassName);
	const level = args.level === undefined ? "\\d+" : String(args.level);
	const featurePattern = new RegExp(
		`\\n(####) Level (${level}): ${escapeRegExp(args.displayName)}\\n`,
		"g",
	);
	const sectionPattern = new RegExp(`\\n(###) ${escapeRegExp(args.displayName)}\\n`, "g");
	const section = content.slice(start, end);
	const matches = [...section.matchAll(featurePattern), ...section.matchAll(sectionPattern)];
	if (matches.length !== 1 || matches[0]?.index === undefined) {
		throw new Error(
			`classes markdown reader: expected exactly one scoped feature heading for '${args.displayName}' ` +
				`under '${args.subclassName ?? args.className}', found ${matches.length} in ${filePath}.`,
		);
	}
	const blockStart = start + matches[0].index + 1;
	const afterHeading = content.indexOf("\n", blockStart) + 1;
	const headingLevel = (matches[0][1] ?? "").length;
	const next = new RegExp(`\\n#{1,${headingLevel}} `).exec(content.slice(afterHeading, end));
	const blockEnd = next?.index === undefined ? end : afterHeading + next.index;
	return {
		text: normalizeWhitespace(content.slice(blockStart, blockEnd)),
		source: `cache/markdown/classes.md:${lineOfOffset(content, blockStart)}-${lineOfOffset(content, blockEnd)}`,
	};
}

function namedTableBlock(className: string, label: string): ExtractedSrdText {
	const { content, filePath, start, end } = classSectionBounds(className);
	const labelIndex = content.indexOf(label, start);
	if (labelIndex === -1 || labelIndex >= end) {
		throw new Error(
			`classes markdown reader: table label '${label}' was not found in ${filePath}.`,
		);
	}
	const tableStart = content.indexOf("<table>", labelIndex);
	const tableEnd = content.indexOf("</table>", tableStart);
	if (tableStart === -1 || tableEnd === -1 || tableEnd >= end) {
		throw new Error(`classes markdown reader: table '${label}' is missing or out of scope.`);
	}
	const blockEnd = tableEnd + "</table>".length;
	return {
		text: normalizeWhitespace(content.slice(labelIndex, blockEnd)),
		source: `cache/markdown/classes.md:${lineOfOffset(content, labelIndex)}-${lineOfOffset(content, blockEnd)}`,
	};
}

export function classCoreTraitsMarkdownBlock(className: string): ExtractedSrdText {
	return namedTableBlock(className, `**Core ${className} Traits**`);
}

export function classFeaturesMarkdownBlock(className: string): ExtractedSrdText {
	return namedTableBlock(className, `**${className} Features**`);
}

function tableCells(row: string, element: "th" | "td"): Array<{ text: string; span: number }> {
	const cells: Array<{ text: string; span: number }> = [];
	const pattern = new RegExp(`<${element}([^>]*)>([\\s\\S]*?)<\\/${element}>`, "g");
	for (const match of row.matchAll(pattern)) {
		const attributes = match[1] ?? "";
		const text = (match[2] ?? "")
			.replace(/<[^>]+>/g, " ")
			.replace(/\s+/g, " ")
			.trim();
		const span = Number(/colspan="(\d+)"/.exec(attributes)?.[1] ?? "1");
		cells.push({ text, span });
	}
	return cells;
}

function expandedCells(row: string, element: "th" | "td"): string[] {
	return tableCells(row, element).flatMap(({ text, span }) =>
		Array.from({ length: span }, () => text),
	);
}

export function classFeatureColumnMarkdownBlock(
	className: string,
	columnName: string,
	displayName = columnName,
): ExtractedSrdText {
	const full = classFeaturesMarkdownBlock(className);
	const rows = [...full.text.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((match) => match[1] ?? "");
	const headerRows = rows.filter((row) => row.includes("<th"));
	const dataRows = rows.filter((row) => row.includes("<td"));
	const width = Math.max(...dataRows.map((row) => expandedCells(row, "td").length));
	const headers = Array.from({ length: width }, (_, index) =>
		headerRows
			.map((row) => expandedCells(row, "th")[index] ?? "")
			.reverse()
			.find((value) => value.length > 0),
	);
	const matches = headers.flatMap((header, index) => (header === columnName ? [index] : []));
	if (matches.length !== 1 || matches[0] === undefined) {
		throw new Error(
			`classes markdown reader: expected one '${columnName}' column in ${className} Features, found ${matches.length}.`,
		);
	}
	const levelIndex = headers.indexOf("Level");
	if (levelIndex === -1) {
		throw new Error(`classes markdown reader: ${className} Features has no Level column.`);
	}
	const escapeCell = (value: string) => value.replace(/\|/g, "\\|");
	const lines = [
		`**${className} Features — ${displayName}**`,
		"",
		`| Level | ${escapeCell(displayName)} |`,
		"|---|---|",
		...dataRows.map((row) => {
			const cells = expandedCells(row, "td");
			return `| ${escapeCell(cells[levelIndex] ?? "")} | ${escapeCell(cells[matches[0] ?? 0] ?? "")} |`;
		}),
	];
	return { text: lines.join("\n"), source: full.source };
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * `classes.md:<line>` of one `#### Level <N>: <displayName>` feature heading,
 * bounded to `className`'s own section span (see {@link classSectionBounds}'s
 * own doc comment for why bounding matters). K2 (Classes, Fighter vertical):
 * every "real" (prose) `ClassFeature.json` row's own slug title-cases EXACTLY
 * to its markdown heading text (`fighter-units.ts`'s own header works this
 * out feature-by-feature) — including `studied-attacks` -> "Studied Attacks",
 * which deliberately BYPASSES `ClassFeature.json`'s own misspelled `name`
 * field ("Studdied Attacks", the ledger's pinned data quirk) by construction:
 * callers pass the CORRECT title-cased slug, never the JSON's own `name`.
 */
export function featureHeadingAnchor(className: string, displayName: string): string {
	const { content, filePath, start, end } = classSectionBounds(className);
	const section = content.slice(start, end);
	const pattern = new RegExp(`\\n#### Level \\d+: ${escapeRegExp(displayName)}\\n`);
	const match = pattern.exec(section);
	if (match?.index === undefined) {
		throw new Error(
			`classes markdown reader: no '#### Level N: ${displayName}' heading found within '${className}'s ` +
				`own section in ${filePath} — the feature heading may have been reworded or the slug-derived ` +
				"display name guess is wrong.",
		);
	}
	return `classes.md:${lineOfOffset(content, start + match.index + 1)}`;
}

/** {@link featureHeadingLevel}'s return shape: the SAME `#### Level N: <name>` heading match {@link featureHeadingAnchor} resolves, plus the level number that heading text states — `featureHeadingAnchor` itself discards the captured digit after using it only to locate the line. */
export interface FeatureHeadingLevel {
	/** The `N` in `#### Level N: <displayName>`, read directly off the heading text — never inferred or guessed. */
	level: number;
	/** `classes.md:<line>`, same shape as {@link featureHeadingAnchor}'s own return value. */
	anchor: string;
}

/**
 * `featureHeadingAnchor`'s own cousin (dm-generic-advancement-metadata M1,
 * `ledger/designs/dm-generic-advancement-metadata.md` §2): a class-feature's
 * OWN stated level, read from the SAME `#### Level N: <displayName>` heading
 * K2 already scans for Fighter — generalized here to any class, since the
 * `srd.advancement_grant` namespace needs "which level does this class
 * feature arrive at" as DATA, not just a citable line. Fails loudly (same
 * posture as `featureHeadingAnchor`) when `displayName` doesn't match a
 * heading verbatim within `className`'s own section — a caller iterating
 * every one of a class's own real (non-structural) `ClassFeature.json` rows
 * MUST tolerate this per-feature (catch and skip/report), never treat a
 * miss as "level unknown, assume 1": K3's own module header
 * (`chapters/classes/remaining-classes-units.ts`) already found that
 * title-cased slugs do NOT always reproduce a class's real heading text
 * verbatim (small words like "of" stay lowercase in the source, e.g. "Font
 * of Inspiration" vs. the naive title-case "Font Of Inspiration") — a miss
 * here is a genuine per-feature title-casing gap, not evidence the feature
 * lacks a level.
 */
export function featureHeadingLevel(className: string, displayName: string): FeatureHeadingLevel {
	const { content, filePath, start, end } = classSectionBounds(className);
	const section = content.slice(start, end);
	const pattern = new RegExp(`\\n#### Level (\\d+): ${escapeRegExp(displayName)}\\n`);
	const match = pattern.exec(section);
	if (match?.index === undefined || match[1] === undefined) {
		throw new Error(
			`classes markdown reader: no '#### Level N: ${displayName}' heading found within '${className}'s ` +
				`own section in ${filePath} — the feature heading may have been reworded or the slug-derived ` +
				"display name guess is wrong.",
		);
	}
	return {
		level: Number(match[1]),
		anchor: `classes.md:${lineOfOffset(content, start + match.index + 1)}`,
	};
}

/**
 * `classes.md:<start>-<end>` of the "`<className>` Features" table (Level /
 * Proficiency Bonus / Class Features / per-class columns) — the shared anchor
 * for `ClassFeature.json` rows whose `feature_type` is `PROFICIENCY_BONUS` or
 * `CLASS_TABLE_DATA` (column data, no own `####` heading — `fighter-units.ts`'s
 * own header). Same block-scan shape as {@link readCoreTraitsTable}.
 */
export function featuresTableAnchor(className: string): string {
	const { content, filePath, start, end } = classSectionBounds(className);
	const anchor = `**${className} Features**`;
	const anchorIndex = content.indexOf(anchor, start);
	if (anchorIndex === -1 || anchorIndex >= end) {
		throw new Error(
			`classes markdown reader: anchor '${anchor}' not found within '${className}'s own section in ` +
				`${filePath} — the Features table heading may have been reworded.`,
		);
	}
	const tableStart = content.indexOf("<table>", anchorIndex);
	if (tableStart === -1 || tableStart - anchorIndex > 200) {
		throw new Error(
			`classes markdown reader: no '<table>' found shortly after '${anchor}' in ${filePath} — the ` +
				"Features table may have moved.",
		);
	}
	const tableEnd = content.indexOf("</table>", tableStart);
	if (tableEnd === -1) {
		throw new Error(`classes markdown reader: unterminated '<table>' for '${className}' Features.`);
	}
	const startLine = lineOfOffset(content, tableStart);
	const endLine = lineOfOffset(content, tableEnd);
	return `classes.md:${startLine}-${endLine}`;
}

/** The parsed subclass section for one class: display name, flavor line, opening paragraph, own citation anchor. */
export interface SubclassSection {
	displayName: string;
	flavorText: string;
	summaryText: string;
	/** `classes.md:<start>-<end>`, from the section's own heading through the opening paragraph's last line. */
	anchor: string;
}

const NEXT_HEADING_PATTERN = /\n#+ /;

/**
 * Parse the "`<className>` Subclass: `<Name>`" section: the heading's own
 * subclass display name, the italic flavor line immediately following it
 * (`_..._`), and the first prose paragraph, bounded by the section's own
 * first heading of ANY level (the per-level `#### Level N: ...` feature
 * sections that follow are K2+ scope, not read here — `#+ ` deliberately
 * matches every heading depth, not just `##`/`###`, since a subclass's
 * opening paragraph is always followed by a `####` feature heading, never
 * another `##`/`###` section first).
 */
export function readSubclassSection(className: string): SubclassSection {
	const { content, filePath } = readClassesMarkdown();
	const headingPrefix = `### ${className} Subclass: `;
	const headingIndex = content.indexOf(`\n${headingPrefix}`);
	if (headingIndex === -1) {
		throw new Error(
			`classes markdown reader: no '${headingPrefix}' heading found in ${filePath} — the subclass ` +
				"section may have been reworded upstream.",
		);
	}
	const headingLineEnd = content.indexOf("\n", headingIndex + 1);
	if (headingLineEnd === -1) {
		throw new Error(`classes markdown reader: unterminated subclass heading for '${className}'.`);
	}
	const displayName = content.slice(headingIndex + 1 + headingPrefix.length, headingLineEnd).trim();

	const flavorMatch = /\n_([^_]+)_\n/.exec(content.slice(headingLineEnd));
	if (flavorMatch?.[1] === undefined || flavorMatch.index === undefined) {
		throw new Error(
			`classes markdown reader: no italic flavor line found after '${className}'s subclass heading.`,
		);
	}
	const flavorText = flavorMatch[1].trim();
	const afterFlavor = headingLineEnd + flavorMatch.index + flavorMatch[0].length;

	const nextHeadingMatch = NEXT_HEADING_PATTERN.exec(content.slice(afterFlavor));
	const summaryBlockEnd =
		nextHeadingMatch?.index === undefined ? content.length : afterFlavor + nextHeadingMatch.index;
	const summaryText = content.slice(afterFlavor, summaryBlockEnd).trim();
	if (summaryText.length === 0) {
		throw new Error(
			`classes markdown reader: empty subclass summary paragraph for '${className}'.`,
		);
	}

	const startLine = lineOfOffset(content, headingIndex + 1);
	const endLine = lineOfOffset(content, summaryBlockEnd);
	return { displayName, flavorText, summaryText, anchor: `classes.md:${startLine}-${endLine}` };
}
