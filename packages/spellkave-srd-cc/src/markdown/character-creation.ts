// Targeted reader for `cache/markdown/character-creation.md` — extracts:
//   - the "Unaligned Creatures" callout (`:558-560`, immediately following
//     "The Nine Alignments", `:542-568`). Markdown-only:
//     `AlignmentDescription.json` backs the 9 named alignments themselves
//     (`../open5e/alignment-description.ts`) but carries no row for this
//     aside — same posture as `playing-the-game.ts`'s Skill Proficiencies /
//     Actions tables (a section with no open5e pk gets parsed straight from
//     the cached prose).
//   - the "Choose Languages" section's two HTML tables (§ Choose Languages,
//     `ledger/character-creation.md`'s C2 slice row): the Standard Languages
//     table (1d12 roll column + Language) and the Rare Languages table (a
//     two-column parallel list, no roll column). THE MARKDOWN IS
//     AUTHORITATIVE for the language SET and the Standard/Rare split —
//     `../open5e/language.ts` only contributes desc/pk/is_secret provenance
//     where a parsed name matches a record.
//   - the "Ability Scores" section's two further HTML tables (§ Ability
//     Scores > Generate Your Scores / Assign Ability Scores, C3 —
//     `ledger/character-creation.md`'s C3 slice row): the Ability Score
//     Point Costs table (Score/Cost, 2x4 visual columns, same "two pairs per
//     `<tr>`" shape `playing-the-game/modifier-units.ts`'s Proficiency Bonus
//     reader already established) and the Standard Array by Class table (one
//     row per class, 6 ability-score columns). Plus the plain-prose "Adjust
//     Ability Scores" (background +2/+1) procedure paragraph — markdown-only,
//     no HTML table, same callout-style extraction `readUnalignedCreatures
//     Callout` already uses. Every one of these is markdown-only: no open5e
//     JSON backs a generation-METHOD table (`AlignmentDescription.json`-style
//     precedent doesn't apply here — these are procedures, not creature/
//     alignment identity records).
//
// A small targeted anchor+regex read is enough for each of these fixed
// shapes; every reader below fails LOUDLY if its anchor or shape moves,
// rather than silently emitting stale/wrong data — same posture as
// `playing-the-game.ts`'s own readers. The table readers also carry the
// exact 1-indexed source line of each row's own `<tr>` — computed from the
// match offset, not hand-typed — so a citation always points at a real,
// current line rather than a number that can silently drift out from under
// a future re-sync.
import { readFileSync } from "node:fs";
import path from "node:path";

import { CACHE_MARKDOWN_DIR } from "./paths";

const CALLOUT_ANCHOR = "**Unaligned Creatures**";
// The callout's literal markdown shape: `> **Unaligned Creatures**\n>\n> <body>\n`
const CALLOUT_BODY_PATTERN = /^\n>\n> ([^\n]+)/;

/**
 * Parse the "Unaligned Creatures" blockquote body out of the cached chapter
 * markdown (`character-creation.md:558-560`). Throws with a precise reason if
 * the anchor or blockquote shape don't match what's expected — a fork
 * re-sync that reshapes this callout must fail the generator, not silently
 * emit stale/wrong data.
 */
export function readUnalignedCreaturesCallout(): string {
	const filePath = path.join(CACHE_MARKDOWN_DIR, "character-creation.md");
	const content = readFileSync(filePath, "utf8");

	const anchorIndex = content.indexOf(CALLOUT_ANCHOR);
	if (anchorIndex === -1) {
		throw new Error(
			`character-creation markdown reader: anchor '${CALLOUT_ANCHOR}' not found in ` +
				`${filePath} — the Unaligned Creatures callout may have been reworded upstream.`,
		);
	}

	const afterAnchor = content.slice(anchorIndex + CALLOUT_ANCHOR.length);
	const match = CALLOUT_BODY_PATTERN.exec(afterAnchor);
	if (match === null || match[1] === undefined) {
		throw new Error(
			"character-creation markdown reader: 'Unaligned Creatures' blockquote body not found " +
				`immediately after its anchor in ${filePath} — the callout's blockquote shape may have moved.`,
		);
	}
	return match[1].trim();
}

/** One row of the "Standard Languages" table (`1d12 | Language`). */
export interface StandardLanguageRow {
	/** The printed roll cell, e.g. `"—"` (Common, automatically known), `"1"`, or a range like `"3–4"`. */
	d12: string;
	/** Printed language name, e.g. "Common Sign Language". */
	name: string;
	/** 1-indexed source line of this row's `<tr>`, e.g. `character-creation.md:217`. */
	line: number;
}

/** One row of the "Rare Languages" table — a flattened two-column parallel list, one entry per language. */
export interface RareLanguageRow {
	/** Printed language name, asterisk footnote marker stripped (e.g. "Primordial", not "Primordial*"). */
	name: string;
	/** Whether the printed cell carried a trailing `*` (Primordial's dialects footnote, `:294`). */
	hasFootnoteMarker: boolean;
	/** 1-indexed source line of this row's `<tr>` (shared by both languages on that row). */
	line: number;
}

function lineOfOffset(content: string, offset: number): number {
	return content.slice(0, offset).split("\n").length;
}

function readCharacterCreationMarkdown(): { content: string; filePath: string } {
	const filePath = path.join(CACHE_MARKDOWN_DIR, "character-creation.md");
	return { content: readFileSync(filePath, "utf8"), filePath };
}

/**
 * Shared `<table>...</table>` block extractor: find `anchor` in `content`,
 * then the next `<table>` within 200 chars of it (the printed heading
 * immediately precedes its table in every section this file reads), and
 * return the block's text plus its start offset (for line-number citation).
 * Used by every HTML-table reader below — language, ability-score-generation
 * (point costs, standard array) — so a shape surprise in any of them fails
 * loudly at the SAME anchor/table-not-found error shape.
 */
function extractHtmlTableBlock(
	content: string,
	filePath: string,
	anchor: string,
	sectionLabel: string,
): { block: string; blockStart: number } {
	const anchorIndex = content.indexOf(anchor);
	if (anchorIndex === -1) {
		throw new Error(
			`character-creation markdown reader: anchor '${anchor}' not found in ${filePath} — ` +
				`the ${sectionLabel} section may have been reworded upstream.`,
		);
	}
	const tableStart = content.indexOf("<table>", anchorIndex);
	if (tableStart === -1 || tableStart - anchorIndex > 200) {
		throw new Error(
			`character-creation markdown reader: no '<table>' found shortly after the '${anchor}' ` +
				`anchor in ${filePath} — the ${sectionLabel} table may have moved.`,
		);
	}
	const tableEnd = content.indexOf("</table>", tableStart);
	if (tableEnd === -1) {
		throw new Error(
			`character-creation markdown reader: unterminated '<table>' at offset ${tableStart} ` +
				`(${sectionLabel}).`,
		);
	}
	return { block: content.slice(tableStart, tableEnd), blockStart: tableStart };
}

const STANDARD_LANGUAGES_ANCHOR = "**Standard Languages**";
const STANDARD_LANGUAGE_ROW_PATTERN = /<tr>\s*<td>([^<]*)<\/td>\s*<td>([^<]*)<\/td>\s*<\/tr>/g;
const EXPECTED_STANDARD_LANGUAGE_ROW_COUNT = 10;

/**
 * Parse the "Standard Languages" table (`character-creation.md` § Choose
 * Languages, `:206`): `1d12 | Language`, 10 rows — Common (roll cell `"—"`,
 * automatically known) plus 9 rollable entries covering 1d12.
 */
export function readStandardLanguagesTable(): StandardLanguageRow[] {
	const { content, filePath } = readCharacterCreationMarkdown();
	const { block, blockStart } = extractHtmlTableBlock(
		content,
		filePath,
		STANDARD_LANGUAGES_ANCHOR,
		"Standard Languages",
	);

	if (!/<th>\s*1d12\s*<\/th>\s*<th>\s*Language\s*<\/th>/.test(block)) {
		throw new Error(
			"character-creation markdown reader: Standard Languages table header is not the " +
				`expected '1d12 | Language' shape — got:\n${block.slice(0, 300)}`,
		);
	}

	const rows: StandardLanguageRow[] = [];
	for (const match of block.matchAll(STANDARD_LANGUAGE_ROW_PATTERN)) {
		const [, d12, name] = match;
		if (d12 === undefined || !name) {
			throw new Error(`character-creation markdown reader: malformed Standard row: ${match[0]}`);
		}
		rows.push({
			d12: d12.trim(),
			name: name.trim(),
			line: lineOfOffset(content, blockStart + (match.index ?? 0)),
		});
	}

	if (rows.length !== EXPECTED_STANDARD_LANGUAGE_ROW_COUNT) {
		throw new Error(
			`character-creation markdown reader: expected ${EXPECTED_STANDARD_LANGUAGE_ROW_COUNT} ` +
				`Standard Languages rows, parsed ${rows.length} — the table shape may have changed. ` +
				`Rows found: ${JSON.stringify(rows.map((r) => r.name))}`,
		);
	}
	return rows;
}

const RARE_LANGUAGES_ANCHOR = "**Rare Languages**";
const RARE_LANGUAGE_ROW_PATTERN = /<tr>\s*<td>([^<]*)<\/td>\s*<td>([^<]*)<\/td>\s*<\/tr>/g;
const EXPECTED_RARE_LANGUAGE_ROW_COUNT_RAW = 5;
const EXPECTED_RARE_LANGUAGE_COUNT = 9;

/**
 * Parse the "Rare Languages" table (`character-creation.md` § Choose
 * Languages, `:261`): a two-column PARALLEL list (no roll column, no
 * left/right semantic difference — confirmed against the actual cached
 * markup, whose `<thead>` repeats the literal header "Language" twice), 5
 * `<tr>` rows flattening to 9 languages (the last row's second cell is
 * empty — Infernal has no pair). Primordial's cell carries a trailing `*`
 * footnote marker (`:294`'s dialects note); stripped here, surfaced via
 * `hasFootnoteMarker`.
 */
export function readRareLanguagesTable(): RareLanguageRow[] {
	const { content, filePath } = readCharacterCreationMarkdown();
	const { block, blockStart } = extractHtmlTableBlock(
		content,
		filePath,
		RARE_LANGUAGES_ANCHOR,
		"Rare Languages",
	);

	if (!/<th>\s*Language\s*<\/th>\s*<th>\s*Language\s*<\/th>/.test(block)) {
		throw new Error(
			"character-creation markdown reader: Rare Languages table header is not the expected " +
				`'Language | Language' shape — got:\n${block.slice(0, 300)}`,
		);
	}

	const rawRows: Array<{ left: string; right: string; line: number }> = [];
	for (const match of block.matchAll(RARE_LANGUAGE_ROW_PATTERN)) {
		const [, left, right] = match;
		if (left === undefined || right === undefined) {
			throw new Error(`character-creation markdown reader: malformed Rare row: ${match[0]}`);
		}
		rawRows.push({
			left: left.trim(),
			right: right.trim(),
			line: lineOfOffset(content, blockStart + (match.index ?? 0)),
		});
	}

	if (rawRows.length !== EXPECTED_RARE_LANGUAGE_ROW_COUNT_RAW) {
		throw new Error(
			`character-creation markdown reader: expected ${EXPECTED_RARE_LANGUAGE_ROW_COUNT_RAW} ` +
				`Rare Languages <tr> rows, parsed ${rawRows.length} — the table shape may have changed.`,
		);
	}

	const rows: RareLanguageRow[] = [];
	for (const raw of rawRows) {
		for (const cell of [raw.left, raw.right]) {
			if (cell.length === 0) continue;
			const hasFootnoteMarker = cell.endsWith("*");
			rows.push({
				name: hasFootnoteMarker ? cell.slice(0, -1).trim() : cell,
				hasFootnoteMarker,
				line: raw.line,
			});
		}
	}

	if (rows.length !== EXPECTED_RARE_LANGUAGE_COUNT) {
		throw new Error(
			`character-creation markdown reader: expected ${EXPECTED_RARE_LANGUAGE_COUNT} Rare ` +
				`Languages (flattened), parsed ${rows.length} — the table shape may have changed. ` +
				`Rows found: ${JSON.stringify(rows.map((r) => r.name))}`,
		);
	}
	return rows;
}

/** One (score, cost) pair from the "Ability Score Point Costs" table. */
export interface AbilityScorePointCostRow {
	score: number;
	cost: number;
	/** 1-indexed source line of this pair's own `<tr>` (shared by both pairs printed on that row). */
	line: number;
}

const POINT_COSTS_ANCHOR = "**Ability Score Point Costs**";
// 2x4 visual columns (two Score/Cost pairs per `<tr>`) — same shape
// `playing-the-game/modifier-units.ts`'s `parseProficiencyBonusTable` already
// parses for the Proficiency Bonus table.
const POINT_COST_ROW_PATTERN =
	/<tr>\s*<td>(\d+)<\/td>\s*<td>(\d+)<\/td>\s*<td>(\d+)<\/td>\s*<td>(\d+)<\/td>\s*<\/tr>/g;
const EXPECTED_POINT_COST_ROW_COUNT_RAW = 4;
const EXPECTED_POINT_COST_COUNT = 8;

/**
 * Parse the "Ability Score Point Costs" table (`character-creation.md` §
 * Generate Your Scores, `:310`): 4 `<tr>` rows, each printing a LEFT
 * (score 8-11) and a RIGHT (score 12-15) Score/Cost pair — flattened to 8
 * pairs, left column first then right column, so the result reads in
 * ascending score order (8..15) rather than the printed row-interleaved
 * order.
 */
export function readAbilityScorePointCostsTable(): AbilityScorePointCostRow[] {
	const { content, filePath } = readCharacterCreationMarkdown();
	const { block, blockStart } = extractHtmlTableBlock(
		content,
		filePath,
		POINT_COSTS_ANCHOR,
		"Ability Score Point Costs",
	);

	if (
		!/<th>\s*Score\s*<\/th>\s*<th>\s*Cost\s*<\/th>\s*<th>\s*Score\s*<\/th>\s*<th>\s*Cost\s*<\/th>/.test(
			block,
		)
	) {
		throw new Error(
			"character-creation markdown reader: Ability Score Point Costs table header is not the " +
				`expected 'Score | Cost | Score | Cost' shape — got:\n${block.slice(0, 300)}`,
		);
	}

	const left: AbilityScorePointCostRow[] = [];
	const right: AbilityScorePointCostRow[] = [];
	for (const match of block.matchAll(POINT_COST_ROW_PATTERN)) {
		const [, leftScore, leftCost, rightScore, rightCost] = match;
		if (
			leftScore === undefined ||
			leftCost === undefined ||
			rightScore === undefined ||
			rightCost === undefined
		) {
			throw new Error(`character-creation markdown reader: malformed Point Costs row: ${match[0]}`);
		}
		const line = lineOfOffset(content, blockStart + (match.index ?? 0));
		left.push({ score: Number.parseInt(leftScore, 10), cost: Number.parseInt(leftCost, 10), line });
		right.push({
			score: Number.parseInt(rightScore, 10),
			cost: Number.parseInt(rightCost, 10),
			line,
		});
	}

	if (left.length !== EXPECTED_POINT_COST_ROW_COUNT_RAW) {
		throw new Error(
			`character-creation markdown reader: expected ${EXPECTED_POINT_COST_ROW_COUNT_RAW} ` +
				`Ability Score Point Costs <tr> rows, parsed ${left.length} — the table shape may have changed.`,
		);
	}

	const rows = [...left, ...right];
	if (rows.length !== EXPECTED_POINT_COST_COUNT) {
		throw new Error(
			`character-creation markdown reader: expected ${EXPECTED_POINT_COST_COUNT} Ability Score ` +
				`Point Costs pairs (flattened), parsed ${rows.length} — the table shape may have changed.`,
		);
	}
	return rows;
}

/** One class's row from the "Standard Array by Class" table. */
export interface StandardArrayByClassRow {
	className: string;
	str: number;
	dex: number;
	con: number;
	int: number;
	wis: number;
	cha: number;
	/** 1-indexed source line of this row's own `<tr>`. */
	line: number;
}

const STANDARD_ARRAY_ANCHOR = "**Standard Array by Class**";
const STANDARD_ARRAY_ROW_PATTERN =
	/<tr>\s*<td>([^<]+)<\/td>\s*<td>(\d+)<\/td>\s*<td>(\d+)<\/td>\s*<td>(\d+)<\/td>\s*<td>(\d+)<\/td>\s*<td>(\d+)<\/td>\s*<td>(\d+)<\/td>\s*<\/tr>/g;
const EXPECTED_STANDARD_ARRAY_ROW_COUNT = 12;

/**
 * Parse the "Standard Array by Class" table (`character-creation.md` §
 * Assign Ability Scores, `:355`): one row per class, Str/Dex/Con/Int/Wis/Cha
 * — the SRD's suggested placement of the Standard Array (15, 14, 13, 12, 10,
 * 8) for each of the 12 core classes. 12 rows, in the source's own printed
 * order (alphabetical by class name).
 */
export function readStandardArrayByClassTable(): StandardArrayByClassRow[] {
	const { content, filePath } = readCharacterCreationMarkdown();
	const { block, blockStart } = extractHtmlTableBlock(
		content,
		filePath,
		STANDARD_ARRAY_ANCHOR,
		"Standard Array by Class",
	);

	if (
		!/<th>\s*Class\s*<\/th>\s*<th>\s*Str\.\s*<\/th>\s*<th>\s*Dex\.\s*<\/th>\s*<th>\s*Con\.\s*<\/th>\s*<th>\s*Int\.\s*<\/th>\s*<th>\s*Wis\.\s*<\/th>\s*<th>\s*Cha\.\s*<\/th>/.test(
			block,
		)
	) {
		throw new Error(
			"character-creation markdown reader: Standard Array by Class table header is not the " +
				`expected 'Class | Str. | Dex. | Con. | Int. | Wis. | Cha.' shape — got:\n${block.slice(0, 300)}`,
		);
	}

	const rows: StandardArrayByClassRow[] = [];
	for (const match of block.matchAll(STANDARD_ARRAY_ROW_PATTERN)) {
		const [, className, str, dex, con, int, wis, cha] = match;
		if (
			className === undefined ||
			str === undefined ||
			dex === undefined ||
			con === undefined ||
			int === undefined ||
			wis === undefined ||
			cha === undefined
		) {
			throw new Error(
				`character-creation markdown reader: malformed Standard Array by Class row: ${match[0]}`,
			);
		}
		rows.push({
			className: className.trim(),
			str: Number.parseInt(str, 10),
			dex: Number.parseInt(dex, 10),
			con: Number.parseInt(con, 10),
			int: Number.parseInt(int, 10),
			wis: Number.parseInt(wis, 10),
			cha: Number.parseInt(cha, 10),
			line: lineOfOffset(content, blockStart + (match.index ?? 0)),
		});
	}

	if (rows.length !== EXPECTED_STANDARD_ARRAY_ROW_COUNT) {
		throw new Error(
			`character-creation markdown reader: expected ${EXPECTED_STANDARD_ARRAY_ROW_COUNT} ` +
				`Standard Array by Class rows, parsed ${rows.length} — the table shape may have changed. ` +
				`Rows found: ${JSON.stringify(rows.map((r) => r.className))}`,
		);
	}
	return rows;
}

/** One row of the "Character Advancement" table (Level / Experience Points / Proficiency Bonus). */
export interface CharacterAdvancementRow {
	level: number;
	xp: number;
	proficiencyBonus: number;
	/** 1-indexed source line of this row's own `<tr>`. */
	line: number;
}

const CHARACTER_ADVANCEMENT_ANCHOR = "**Character Advancement**";
const CHARACTER_ADVANCEMENT_ROW_PATTERN =
	/<tr>\s*<td>(\d+)<\/td>\s*<td>([\d,]+)<\/td>\s*<td>\+(\d+)<\/td>\s*<\/tr>/g;
const EXPECTED_CHARACTER_ADVANCEMENT_ROW_COUNT = 20;

/**
 * Parse the "Character Advancement" table (`character-creation.md` § Level
 * Advancement, `:657`): Level / Experience Points / Proficiency Bonus, 20
 * rows (level 1..20, XP 0..355,000, PB +2..+6) — the Level Advancement
 * mechanic's XP-threshold source of truth. This is the ONLY reader C4
 * (`ledger/character-creation.md`) needs from this table: PB is already live
 * (`srd/proficiency_bonus` macro, `playing-the-game/modifier-units.ts`), so
 * only `level`/`xp` are consumed here — `proficiencyBonus` is parsed anyway
 * for row-shape completeness and available for a future cross-check.
 */
export function readCharacterAdvancementTable(): CharacterAdvancementRow[] {
	const { content, filePath } = readCharacterCreationMarkdown();
	const { block, blockStart } = extractHtmlTableBlock(
		content,
		filePath,
		CHARACTER_ADVANCEMENT_ANCHOR,
		"Character Advancement",
	);

	if (
		!/<th>\s*Level\s*<\/th>\s*<th>\s*Experience Points\s*<\/th>\s*<th>\s*Proficiency Bonus\s*<\/th>/.test(
			block,
		)
	) {
		throw new Error(
			"character-creation markdown reader: Character Advancement table header is not the " +
				`expected 'Level | Experience Points | Proficiency Bonus' shape — got:\n${block.slice(0, 300)}`,
		);
	}

	const rows: CharacterAdvancementRow[] = [];
	for (const match of block.matchAll(CHARACTER_ADVANCEMENT_ROW_PATTERN)) {
		const [, level, xp, pb] = match;
		if (level === undefined || xp === undefined || pb === undefined) {
			throw new Error(
				`character-creation markdown reader: malformed Character Advancement row: ${match[0]}`,
			);
		}
		rows.push({
			level: Number.parseInt(level, 10),
			xp: Number.parseInt(xp.replace(/,/g, ""), 10),
			proficiencyBonus: Number.parseInt(pb, 10),
			line: lineOfOffset(content, blockStart + (match.index ?? 0)),
		});
	}

	if (rows.length !== EXPECTED_CHARACTER_ADVANCEMENT_ROW_COUNT) {
		throw new Error(
			`character-creation markdown reader: expected ${EXPECTED_CHARACTER_ADVANCEMENT_ROW_COUNT} ` +
				`Character Advancement rows, parsed ${rows.length} — the table shape may have changed. ` +
				`Rows found: ${JSON.stringify(rows.map((r) => r.level))}`,
		);
	}
	return rows;
}

/** One row of the "Fixed Hit Points by Class" table. */
export interface FixedHitPointsByClassRow {
	/** The printed class-group cell, split on `", "`/`" or "`, e.g. `["Fighter", "Paladin", "Ranger"]`. */
	classNames: string[];
	/** The flat per-level number ADDED TO the Constitution modifier — the modifier itself is not part of this row. */
	flatHpPerLevel: number;
	/** 1-indexed source line of this row's own `<tr>`. */
	line: number;
}

const FIXED_HIT_POINTS_ANCHOR = "**Fixed Hit Points by Class**";
const FIXED_HIT_POINTS_ROW_PATTERN =
	/<tr>\s*<td>([^<]+)<\/td>\s*<td>(\d+) \+ Con\. modifier<\/td>\s*<\/tr>/g;
const EXPECTED_FIXED_HIT_POINTS_ROW_COUNT = 4;

/**
 * Parse the "Fixed Hit Points by Class" table (`character-creation.md` §
 * Gaining a Level, `:779`): 4 rows, each a class group ("Fighter, Paladin, or
 * Ranger") plus the flat number added to the Constitution modifier on a
 * level-up. C4 (`ledger/character-creation.md`) reads ONLY the flat number
 * (via {@link fixedHitPointsPerLevelForClass}) — the Constitution-modifier
 * addition itself is a per-actor computation deliberately out of this
 * slice's scope (see `advancement-units.ts`'s own module header).
 */
export function readFixedHitPointsByClassTable(): FixedHitPointsByClassRow[] {
	const { content, filePath } = readCharacterCreationMarkdown();
	const { block, blockStart } = extractHtmlTableBlock(
		content,
		filePath,
		FIXED_HIT_POINTS_ANCHOR,
		"Fixed Hit Points by Class",
	);

	if (!/<th>\s*Class\s*<\/th>\s*<th>\s*Hit Points per Level\s*<\/th>/.test(block)) {
		throw new Error(
			"character-creation markdown reader: Fixed Hit Points by Class table header is not the " +
				`expected 'Class | Hit Points per Level' shape — got:\n${block.slice(0, 300)}`,
		);
	}

	const rows: FixedHitPointsByClassRow[] = [];
	for (const match of block.matchAll(FIXED_HIT_POINTS_ROW_PATTERN)) {
		const [, classCell, flatValue] = match;
		if (classCell === undefined || flatValue === undefined) {
			throw new Error(
				`character-creation markdown reader: malformed Fixed Hit Points row: ${match[0]}`,
			);
		}
		const classNames = classCell
			.trim()
			.replace(/,? or /g, ", ")
			.split(",")
			.map((name) => name.trim())
			.filter((name) => name.length > 0);
		rows.push({
			classNames,
			flatHpPerLevel: Number.parseInt(flatValue, 10),
			line: lineOfOffset(content, blockStart + (match.index ?? 0)),
		});
	}

	if (rows.length !== EXPECTED_FIXED_HIT_POINTS_ROW_COUNT) {
		throw new Error(
			`character-creation markdown reader: expected ${EXPECTED_FIXED_HIT_POINTS_ROW_COUNT} ` +
				`Fixed Hit Points by Class rows, parsed ${rows.length} — the table shape may have changed. ` +
				`Rows found: ${JSON.stringify(rows.map((r) => r.classNames))}`,
		);
	}
	return rows;
}

/**
 * Look up ONE class's flat Fixed Hit Points per Level number (excludes the
 * Constitution modifier term — see {@link FixedHitPointsByClassRow}). Throws
 * loudly if no row's class group contains `className`.
 */
export function fixedHitPointsPerLevelForClass(className: string): number {
	const rows = readFixedHitPointsByClassTable();
	const row = rows.find((candidate) => candidate.classNames.includes(className));
	if (row === undefined) {
		throw new Error(
			`character-creation markdown reader: no Fixed Hit Points by Class row named '${className}' — ` +
				`got groups: ${JSON.stringify(rows.map((r) => r.classNames))}.`,
		);
	}
	return row.flatHpPerLevel;
}

/** One row of the "Level 1 Hit Points by Class" table. */
export interface Level1HitPointsByClassRow {
	/** The printed class-group cell, split on `", "`/`" or "`, e.g. `["Fighter", "Paladin", "Ranger"]`. */
	classNames: string[];
	/** The flat level-1 number ADDED TO the Constitution modifier — the modifier itself is not part of this row. */
	flatLevel1Hp: number;
	/** 1-indexed source line of this row's own `<tr>`. */
	line: number;
}

const LEVEL1_HIT_POINTS_ANCHOR = "**Level 1 Hit Points by Class**";
const LEVEL1_HIT_POINTS_ROW_PATTERN =
	/<tr>\s*<td>([^<]+)<\/td>\s*<td>(\d+) \+ Con\. modifier<\/td>\s*<\/tr>/g;
const EXPECTED_LEVEL1_HIT_POINTS_ROW_COUNT = 4;

/**
 * Parse the "Level 1 Hit Points by Class" table (`character-creation.md` §
 * Fill In Numbers > Hit Points, `:596`): 4 rows, each a class group ("Fighter,
 * Paladin, or Ranger") plus the flat number added to the Constitution
 * modifier for a level-1 character's Hit Point maximum. DISTINCT from
 * {@link readFixedHitPointsByClassTable} — this is the level-1 BASELINE
 * (12/10/8/6 by group), that one is the PER-LEVEL-UP increment (7/6/5/4 by
 * group); same shape, different table, same row-extraction pattern reused
 * verbatim (`extractHtmlTableBlock` + a "Class | N + Con. modifier" regex).
 */
export function readLevel1HitPointsByClassTable(): Level1HitPointsByClassRow[] {
	const { content, filePath } = readCharacterCreationMarkdown();
	const { block, blockStart } = extractHtmlTableBlock(
		content,
		filePath,
		LEVEL1_HIT_POINTS_ANCHOR,
		"Level 1 Hit Points by Class",
	);

	if (!/<th>\s*Class\s*<\/th>\s*<th>\s*Hit Point Maximum\s*<\/th>/.test(block)) {
		throw new Error(
			"character-creation markdown reader: Level 1 Hit Points by Class table header is not the " +
				`expected 'Class | Hit Point Maximum' shape — got:\n${block.slice(0, 300)}`,
		);
	}

	const rows: Level1HitPointsByClassRow[] = [];
	for (const match of block.matchAll(LEVEL1_HIT_POINTS_ROW_PATTERN)) {
		const [, classCell, flatValue] = match;
		if (classCell === undefined || flatValue === undefined) {
			throw new Error(
				`character-creation markdown reader: malformed Level 1 Hit Points row: ${match[0]}`,
			);
		}
		const classNames = classCell
			.trim()
			.replace(/,? or /g, ", ")
			.split(",")
			.map((name) => name.trim())
			.filter((name) => name.length > 0);
		rows.push({
			classNames,
			flatLevel1Hp: Number.parseInt(flatValue, 10),
			line: lineOfOffset(content, blockStart + (match.index ?? 0)),
		});
	}

	if (rows.length !== EXPECTED_LEVEL1_HIT_POINTS_ROW_COUNT) {
		throw new Error(
			`character-creation markdown reader: expected ${EXPECTED_LEVEL1_HIT_POINTS_ROW_COUNT} ` +
				`Level 1 Hit Points by Class rows, parsed ${rows.length} — the table shape may have changed. ` +
				`Rows found: ${JSON.stringify(rows.map((r) => r.classNames))}`,
		);
	}
	return rows;
}

/**
 * Look up ONE class's flat Level 1 Hit Points baseline (excludes the
 * Constitution modifier term — see {@link Level1HitPointsByClassRow}). Throws
 * loudly if no row's class group contains `className`. Mirrors
 * {@link fixedHitPointsPerLevelForClass}'s lookup shape exactly.
 */
export function level1HitPointsBaseForClass(className: string): number {
	const rows = readLevel1HitPointsByClassTable();
	const row = rows.find((candidate) => candidate.classNames.includes(className));
	if (row === undefined) {
		throw new Error(
			`character-creation markdown reader: no Level 1 Hit Points by Class row named '${className}' — ` +
				`got groups: ${JSON.stringify(rows.map((r) => r.classNames))}.`,
		);
	}
	return row.flatLevel1Hp;
}

const ADJUST_ABILITY_SCORES_ANCHOR = "#### Adjust Ability Scores";
const ADJUST_ABILITY_SCORES_NEXT_HEADING = "#### Determine Ability Modifiers";

/**
 * Parse the "Adjust Ability Scores" background +2/+1 procedure paragraph
 * (`character-creation.md:481-485`) — plain prose, no HTML table, so this
 * reads the section body verbatim between its own heading and the next one
 * (same "anchor, then slice to the next known boundary" idiom
 * `readUnalignedCreaturesCallout` uses for its own blockquote body).
 */
export function readAdjustAbilityScoresProcedure(): string {
	const { content, filePath } = readCharacterCreationMarkdown();
	const start = content.indexOf(ADJUST_ABILITY_SCORES_ANCHOR);
	if (start === -1) {
		throw new Error(
			`character-creation markdown reader: anchor '${ADJUST_ABILITY_SCORES_ANCHOR}' not found in ` +
				`${filePath} — the Adjust Ability Scores section may have been reworded upstream.`,
		);
	}
	const end = content.indexOf(ADJUST_ABILITY_SCORES_NEXT_HEADING, start);
	if (end === -1) {
		throw new Error(
			"character-creation markdown reader: 'Determine Ability Modifiers' heading not found " +
				`after 'Adjust Ability Scores' in ${filePath} — the section boundary may have moved.`,
		);
	}
	const body = content
		.slice(start + ADJUST_ABILITY_SCORES_ANCHOR.length, end)
		.trim()
		.replace(/\n+/g, " ");
	if (body.length === 0) {
		throw new Error(
			"character-creation markdown reader: 'Adjust Ability Scores' section body is empty.",
		);
	}
	return body;
}
