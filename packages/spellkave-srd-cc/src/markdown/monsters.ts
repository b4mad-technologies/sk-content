// Targeted reader for `cache/markdown/monsters.md` — extracts the
// "Experience Points by Challenge Rating" table (§ Challenge Rating,
// `:209-324`): the CR→XP mapping every monster's own stat block cites
// inline (e.g. `monsters-A-Z.md:7388`'s "CR 1/4 (XP 50; PB +2)"). Same
// "small targeted anchor+regex read, fail loudly on shape drift" posture
// `character-creation.ts`/`classes.ts` already establish for this package's
// other markdown-only tables — this package has no `src/open5e/creature.ts`
// reader yet (no chapter consumes `Creature.json` today), so this file is
// deliberately markdown-only for now.
//
// JOIN HAZARD (playable-fighter-l1-20 prep pass finding): the printed CR
// column mixes plain integers ("0".."30") with SRD fraction notation
// ("1/8", "1/4", "1/2") — `cache/open5e/CharacterClass.json`'s sibling
// `Creature.json` carries CR as a zero-padded DECIMAL STRING instead
// ("0.125", "0.250", "0.500", "1.000", ...), and even duplicates "0" as BOTH
// "0" and "0.000" for different rows. A caller must never string-compare
// either representation against this table's own `crText` — `parseCrText`
// below normalizes the MARKDOWN's own fraction notation to a plain number
// (`crNumber`); a FUTURE Creature.json-based reader must normalize ITS OWN
// decimal-string CR the same way (`Number.parseFloat`) before calling
// `xpForChallengeRating`, which takes a number, never a string, precisely so
// two differently-spelled CRs that mean the same value never fail to match.
//
// CR 0's XP CELL IS NOT A SINGLE NUMBER: the table prints "0 or 10" (`:223`)
// — most CR 0 monsters are worth 0 XP, but at least one (Octopus,
// `cache/open5e/Creature.json`'s `srd-2024_octopus` row, the only creature
// of 331 with a non-null `experience_points_integer`, value 10) is an
// authored EXCEPTION. `xpForChallengeRating` returns the row's PARSED
// leading number (0, the documented default) for CR 0 — an authored
// per-monster override for the "or 10" exception is a future per-creature
// concern, not this table's job.
import { readFileSync } from "node:fs";
import path from "node:path";

import { CACHE_MARKDOWN_DIR } from "./paths";

/** One (CR, XP) pair from the "Experience Points by Challenge Rating" table. */
export interface ChallengeRatingXpRow {
	/** Normalized numeric CR — `"1/8"` -> `0.125`, `"1/4"` -> `0.25`, `"1/2"` -> `0.5`, else the plain integer. */
	crNumber: number;
	/** The printed CR cell verbatim, e.g. `"1/4"`, `"0"`, `"30"`. */
	crText: string;
	/** The row's XP, as the parsed LEADING integer (comma-stripped; `"0 or 10"` -> `0` — see this module's own header). */
	xp: number;
	/** The printed XP cell verbatim, e.g. `"11,500"`, `"0 or 10"`. */
	xpText: string;
	/** 1-indexed source line of this pair's own `<tr>` (shared by both pairs printed on that row). */
	line: number;
}

const EXPERIENCE_BY_CR_ANCHOR = "**Experience Points by Challenge Rating**";
// Two (CR, XP) pairs per `<tr>` (left: CR 0-13, right: CR 14-30) — the SAME
// "2x4 visual columns" shape `character-creation.ts`'s
// `readAbilityScorePointCostsTable` already parses for that chapter's own
// Ability Score Point Costs table. CR cells are a plain integer or an SRD
// fraction ("1/8"/"1/4"/"1/2"); XP cells are usually digits with comma
// separators but CR 0's is the two-word "0 or 10" — so the XP capture stays
// loose (`[^<]+`) rather than digit-only, unlike the CR capture.
const EXPERIENCE_BY_CR_ROW_PATTERN =
	/<tr>\s*<td>([^<]+)<\/td>\s*<td>([^<]+)<\/td>\s*<td>([^<]+)<\/td>\s*<td>([^<]+)<\/td>\s*<\/tr>/g;
const EXPECTED_ROW_COUNT_RAW = 17;
const EXPECTED_CR_COUNT = 34;

function lineOfOffset(content: string, offset: number): number {
	return content.slice(0, offset).split("\n").length;
}

function readMonstersMarkdown(): { content: string; filePath: string } {
	const filePath = path.join(CACHE_MARKDOWN_DIR, "monsters.md");
	return { content: readFileSync(filePath, "utf8"), filePath };
}

function extractHtmlTableBlock(
	content: string,
	filePath: string,
	anchor: string,
	sectionLabel: string,
): { block: string; blockStart: number } {
	const anchorIndex = content.indexOf(anchor);
	if (anchorIndex === -1) {
		throw new Error(
			`monsters markdown reader: anchor '${anchor}' not found in ${filePath} — the ` +
				`${sectionLabel} section may have been reworded upstream.`,
		);
	}
	const tableStart = content.indexOf("<table>", anchorIndex);
	if (tableStart === -1 || tableStart - anchorIndex > 200) {
		throw new Error(
			`monsters markdown reader: no '<table>' found shortly after the '${anchor}' anchor in ` +
				`${filePath} — the ${sectionLabel} table may have moved.`,
		);
	}
	const tableEnd = content.indexOf("</table>", tableStart);
	if (tableEnd === -1) {
		throw new Error(
			`monsters markdown reader: unterminated '<table>' at offset ${tableStart} (${sectionLabel}).`,
		);
	}
	return { block: content.slice(tableStart, tableEnd), blockStart: tableStart };
}

/** `"1/8"` -> `0.125`; `"1/4"` -> `0.25`; `"1/2"` -> `0.5`; `"0"`/`"30"`/... -> the plain integer. Throws on anything else. */
function parseCrText(text: string): number {
	const trimmed = text.trim();
	const fractionMatch = /^(\d+)\/(\d+)$/.exec(trimmed);
	if (fractionMatch !== null) {
		const [, numText, denomText] = fractionMatch;
		if (numText === undefined || denomText === undefined) {
			throw new Error(`monsters markdown reader: malformed CR fraction '${trimmed}'.`);
		}
		return Number.parseInt(numText, 10) / Number.parseInt(denomText, 10);
	}
	if (/^\d+$/.test(trimmed)) {
		return Number.parseInt(trimmed, 10);
	}
	throw new Error(
		`monsters markdown reader: CR cell '${trimmed}' is neither a plain integer nor an 'N/M' fraction.`,
	);
}

/** Parses the XP cell's LEADING integer (comma-stripped) — `"11,500"` -> `11500`; `"0 or 10"` -> `0` (this module's own header). */
function parseXpText(text: string): number {
	const trimmed = text.trim();
	const leadingNumber = /^([\d,]+)/.exec(trimmed);
	if (leadingNumber === null || leadingNumber[1] === undefined) {
		throw new Error(`monsters markdown reader: XP cell '${trimmed}' has no leading number.`);
	}
	return Number.parseInt(leadingNumber[1].replaceAll(",", ""), 10);
}

/**
 * Parse the "Experience Points by Challenge Rating" table
 * (`monsters.md:209-324`, § Challenge Rating > Experience Points): 17 `<tr>`
 * rows, each printing a LEFT (CR 0-13) and a RIGHT (CR 14-30) (CR, XP) pair
 * — flattened to 34 rows, left column first then right column, which reads
 * in ascending CR order (0, 1/8, 1/4, 1/2, 1..13, then 14..30) since both
 * printed columns are already ascending.
 */
export function readExperienceByChallengeRatingTable(): ChallengeRatingXpRow[] {
	const { content, filePath } = readMonstersMarkdown();
	const { block, blockStart } = extractHtmlTableBlock(
		content,
		filePath,
		EXPERIENCE_BY_CR_ANCHOR,
		"Experience Points by Challenge Rating",
	);

	if (
		!/<th>\s*CR\s*<\/th>\s*<th>\s*XP\s*<\/th>\s*<th>\s*CR\s*<\/th>\s*<th>\s*XP\s*<\/th>/.test(block)
	) {
		throw new Error(
			"monsters markdown reader: Experience Points by Challenge Rating table header is not the " +
				`expected 'CR | XP | CR | XP' shape — got:\n${block.slice(0, 300)}`,
		);
	}

	const left: ChallengeRatingXpRow[] = [];
	const right: ChallengeRatingXpRow[] = [];
	let rawRowCount = 0;
	for (const match of block.matchAll(EXPERIENCE_BY_CR_ROW_PATTERN)) {
		const [, leftCr, leftXp, rightCr, rightXp] = match;
		if (
			leftCr === undefined ||
			leftXp === undefined ||
			rightCr === undefined ||
			rightXp === undefined
		) {
			throw new Error(
				`monsters markdown reader: malformed Experience Points by Challenge Rating row: ${match[0]}`,
			);
		}
		rawRowCount += 1;
		const line = lineOfOffset(content, blockStart + (match.index ?? 0));
		left.push({
			crNumber: parseCrText(leftCr),
			crText: leftCr.trim(),
			xp: parseXpText(leftXp),
			xpText: leftXp.trim(),
			line,
		});
		right.push({
			crNumber: parseCrText(rightCr),
			crText: rightCr.trim(),
			xp: parseXpText(rightXp),
			xpText: rightXp.trim(),
			line,
		});
	}

	if (rawRowCount !== EXPECTED_ROW_COUNT_RAW) {
		throw new Error(
			`monsters markdown reader: expected ${EXPECTED_ROW_COUNT_RAW} Experience Points by Challenge ` +
				`Rating <tr> rows, parsed ${rawRowCount} — the table shape may have changed.`,
		);
	}

	const rows = [...left, ...right];
	if (rows.length !== EXPECTED_CR_COUNT) {
		throw new Error(
			`monsters markdown reader: expected ${EXPECTED_CR_COUNT} Experience Points by Challenge ` +
				`Rating pairs (flattened), parsed ${rows.length} — the table shape may have changed.`,
		);
	}
	return rows;
}

/**
 * Look up a monster's XP award for a given Challenge Rating, PROGRAMMATICALLY
 * against `readExperienceByChallengeRatingTable()` — never a hand-typed
 * second copy of the table (the `xpThresholdLadderSource`/`xpThresholdForLevel`
 * idiom `character-creation/advancement-units.ts` already established for
 * the sibling Character Advancement table). `cr` is a plain number (`0.25`
 * for CR 1/4, `1` for CR 1, ...) — this module's own header explains why a
 * caller must normalize EITHER source representation (markdown fraction or
 * `Creature.json`'s decimal string) to a number before calling this, never
 * comparing the two textual forms directly. Throws loudly on a CR with no
 * matching row (an authoring typo, e.g. a fraction denominator flipped) —
 * never a silent 0 XP.
 */
export function xpForChallengeRating(cr: number): number {
	const rows = readExperienceByChallengeRatingTable();
	const row = rows.find((candidate) => candidate.crNumber === cr);
	if (row === undefined) {
		throw new Error(
			`monsters markdown reader: no Experience Points by Challenge Rating row for CR ${cr} — ` +
				`valid CRs: ${rows.map((r) => r.crText).join(", ")}.`,
		);
	}
	return row.xp;
}
