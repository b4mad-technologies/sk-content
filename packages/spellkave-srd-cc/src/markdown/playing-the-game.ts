// Targeted reader for `cache/markdown/playing-the-game.md` — extracts the
// "Skill Proficiencies" HTML table (§ Proficiency > Skill Proficiencies,
// anchored on the "**Skills**" run-in header immediately above it) instead of
// hardcoding the skill -> governing-ability mapping from memory: the mapping
// IS in the cached source, so it must come from there (source-grounding norm
// — see ledger/findings.md finding #2). A small targeted regex parser is
// enough for this one well-known table shape; cheerio/a full HTML parser
// would be overkill for ONE fixed 3-column table. Every assumption below is
// checked and fails LOUDLY if the cached markdown's table shape ever changes
// (a fork re-sync that reflows this section), rather than silently emitting
// wrong or partial data.
//
// Why the markdown table and not `open5e-api/data/v2/open5e/core/Skill.json`:
// that JSON file DOES carry the same skill -> governing-ability mapping as a
// structured `ability` FK column (18 records, Django model `api_v2.skill`) —
// so the mapping's existence upstream as JSON is not in question. It lives in
// the `open5e/core` publisher directory, which sits OUTSIDE this package's
// CC-BY-4.0 license boundary (`src/sources.ts`; that publisher's
// `Document.json` carries `license: null`) — the pipeline must never read it.
// Parsing the mapping out of this CC-BY chapter's own markdown table instead
// is therefore a LICENSING decision, not a workaround for an absent fact.
//
// Also extracts the "Actions" table (§ Actions, `readActionsTable` below) —
// markdown-only for a different reason: no open5e pk exists for this section
// at all (confirmed by directly listing OPEN5E_SRD_2024_DIR, finding
// ledger observation 3's STEP-2 follow-up), not a licensing exclusion.
import { readFileSync } from "node:fs";
import path from "node:path";

import { CACHE_MARKDOWN_DIR } from "./paths";

export interface ReaderPageSource {
	path: "packages/spellkave-srd-cc/cache/markdown/playing-the-game.md";
	anchor: string;
	license: "CC-BY-4.0";
}

/** A reader page whose body is verbatim cached SRD Markdown below its title. */
export interface PlayingTheGameReaderPage {
	id: "rhythm-of-play" | "the-six-abilities" | "d20-tests";
	title: "Rhythm of Play" | "The Six Abilities" | "D20 Tests";
	body: string;
	source: ReaderPageSource;
}

const READER_PAGE_SPECS = [
	{
		id: "rhythm-of-play",
		title: "Rhythm of Play",
		nextTitle: "The Six Abilities",
		anchor: "Playing the Game > Rhythm of Play",
	},
	{
		id: "the-six-abilities",
		title: "The Six Abilities",
		nextTitle: "D20 Tests",
		anchor: "Playing the Game > The Six Abilities",
	},
	{
		id: "d20-tests",
		title: "D20 Tests",
		nextTitle: "Proficiency",
		anchor: "Playing the Game > D20 Tests",
	},
] as const;

function exactHeadingOffset(content: string, title: string): number {
	const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const matches = [...content.matchAll(new RegExp(`^## ${escapedTitle}\\r?$`, "gm"))];
	if (matches.length !== 1 || matches[0]?.index === undefined) {
		const reason = matches.length === 0 ? "not found" : "ambiguous";
		throw new Error(`playing-the-game reader pages: heading '## ${title}' ${reason}.`);
	}
	return matches[0].index;
}

/**
 * Extract one exact level-two source section. This is exported for focused
 * source-shape tests; callers should use {@link readPlayingTheGameReaderPages}.
 */
export function extractPlayingTheGameReaderPageBody(
	content: string,
	title: string,
	nextTitle: string,
): string {
	const heading = `## ${title}`;
	const start = exactHeadingOffset(content, title);
	const bodyStart = start + heading.length;
	const end = exactHeadingOffset(content.slice(bodyStart), nextTitle) + bodyStart;
	if (end <= bodyStart) {
		throw new Error(`playing-the-game reader pages: '${heading}' has an empty body.`);
	}
	// Only strip the separator newlines introduced by removing the title.
	const body = content.slice(bodyStart, end).replace(/^\r?\n+|\r?\n+$/g, "");
	if (body.length === 0) {
		throw new Error(`playing-the-game reader pages: '${heading}' has an empty body.`);
	}
	return body;
}

/**
 * Return the first two reader-oriented SRD sections as source text, rather
 * than retyping prose into bundle metadata. The page title is deliberately
 * removed from `body`: the docs UI renders it as its own heading. Apart from
 * that boundary newline trim, the body (including tables and Markdown) is
 * byte-for-byte the committed CC-BY source slice.
 *
 * This fails loudly if a source sync changes either heading or their order.
 */
export function readPlayingTheGameReaderPages(): PlayingTheGameReaderPage[] {
	const filePath = path.join(CACHE_MARKDOWN_DIR, "playing-the-game.md");
	const content = readFileSync(filePath, "utf8");

	return READER_PAGE_SPECS.map((spec) => {
		let body: string;
		try {
			body = extractPlayingTheGameReaderPageBody(content, spec.title, spec.nextTitle);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			throw new Error(`${message} Source: ${filePath}`);
		}

		return {
			id: spec.id,
			title: spec.title,
			body,
			source: {
				path: "packages/spellkave-srd-cc/cache/markdown/playing-the-game.md",
				anchor: spec.anchor,
				license: "CC-BY-4.0",
			},
		};
	});
}

const SIX_ABILITY_RESOURCE_REFS = ["str", "dex", "con", "int", "wis", "cha"] as const;
const ABILITY_DESCRIPTIONS_ANCHOR = "**Ability Descriptions**";
const ABILITY_DESCRIPTION_ROW_PATTERN = /<tr>\s*<td>([^<]*)<\/td>\s*<td>([^<]*)<\/td>\s*<\/tr>/g;

export interface AbilityDescriptionTable {
	nameLabel: string;
	descriptionLabel: string;
	rows: Array<{ name: string; description: string }>;
	tableHtml: string;
}

/** Read the source's six-row Ability Descriptions table without retyping it. */
export function readAbilityDescriptionsTable(body: string): AbilityDescriptionTable {
	const anchor = body.indexOf(ABILITY_DESCRIPTIONS_ANCHOR);
	if (anchor === -1) {
		throw new Error("playing-the-game reader pages: Ability Descriptions heading is missing.");
	}
	const tableStart = body.indexOf("<table>", anchor);
	const tableEnd = body.indexOf("</table>", tableStart);
	if (tableStart === -1 || tableEnd === -1) {
		throw new Error("playing-the-game reader pages: Ability Descriptions table is missing.");
	}
	const tableHtml = body.slice(tableStart, tableEnd + "</table>".length);
	const header = /<th>\s*([^<]+?)\s*<\/th>\s*<th>\s*([^<]+?)\s*<\/th>/.exec(tableHtml);
	if (header?.[1] === undefined || header[2] === undefined) {
		throw new Error(
			"playing-the-game reader pages: Ability Descriptions table headers are malformed.",
		);
	}
	const rows = [...tableHtml.matchAll(ABILITY_DESCRIPTION_ROW_PATTERN)].map((match) => {
		const [, name, description] = match;
		if (name === undefined || description === undefined) {
			throw new Error(
				"playing-the-game reader pages: Ability Descriptions table row is malformed.",
			);
		}
		return { name: name.trim(), description: description.trim() };
	});
	if (rows.length !== SIX_ABILITY_RESOURCE_REFS.length) {
		throw new Error(
			`playing-the-game reader pages: expected ${SIX_ABILITY_RESOURCE_REFS.length} Ability Descriptions rows, found ${rows.length}.`,
		);
	}
	return {
		nameLabel: header[1].trim(),
		descriptionLabel: header[2].trim(),
		rows,
		tableHtml,
	};
}

/**
 * The first vertical reader slice embeds the six existing ability resources
 * at the source's Ability Descriptions table. The compact resource leaves are
 * the only authored replacement; restoring the source table yields the exact
 * cached source body.
 */
export function readSixAbilitiesReaderFragmentMetadata(): Pick<
	PlayingTheGameReaderPage,
	"body" | "source"
> {
	const page = readPlayingTheGameReaderPages().find(
		(candidate) => candidate.id === "the-six-abilities",
	);
	if (page === undefined) {
		throw new Error("playing-the-game reader pages: The Six Abilities page is missing.");
	}
	const table = readAbilityDescriptionsTable(page.body);
	const directives = SIX_ABILITY_RESOURCE_REFS.map(
		(ref) => `::resource{ref="srd/${ref}" view="compact"}`,
	).join("\n");
	const tableStart = page.body.indexOf(table.tableHtml);
	if (tableStart === -1) {
		throw new Error(
			"playing-the-game reader pages: Ability Descriptions table moved during parsing.",
		);
	}
	return {
		body: `${page.body.slice(0, tableStart)}${directives}${page.body.slice(tableStart + table.tableHtml.length)}`,
		source: page.source,
	};
}

/** The complete source D20 Tests section, including its nested subsections. */
export function readD20TestsReaderFragmentMetadata(): Pick<
	PlayingTheGameReaderPage,
	"body" | "source"
> {
	const page = readPlayingTheGameReaderPages().find((candidate) => candidate.id === "d20-tests");
	if (page === undefined) {
		throw new Error("playing-the-game reader pages: D20 Tests page is missing.");
	}
	return {
		body: `${page.body}\n\n::resource{ref="srd/heroic_inspiration" view="compact"}`,
		source: page.source,
	};
}

/** One row of the "Skill Proficiencies" table, as literally printed in the SRD prose. */
export interface SkillProficiencyRow {
	/** Full skill name as printed, e.g. "Sleight of Hand". */
	skillName: string;
	/** Full ability name as printed, e.g. "Dexterity". */
	abilityName: string;
	/** The table's third column — kept for completeness, not currently consumed. */
	exampleUses: string;
}

const SKILLS_ANCHOR = "**Skills**";
const ROW_PATTERN = /<tr>\s*<td>([^<]*)<\/td>\s*<td>([^<]*)<\/td>\s*<td>([^<]*)<\/td>\s*<\/tr>/g;
const EXPECTED_ROW_COUNT = 18;

/**
 * Parse the "Skill Proficiencies" HTML table out of the cached chapter
 * markdown: Skill | Ability | Example Uses, 18 rows (playing-the-game.md
 * § Proficiency > Skill Proficiencies). Throws with a precise reason if the
 * anchor, the table, its header, or its row count don't match what's
 * expected — a fork re-sync that reshapes this section must fail the
 * generator, not silently emit stale/wrong data.
 */
export function readSkillProficienciesTable(): SkillProficiencyRow[] {
	const filePath = path.join(CACHE_MARKDOWN_DIR, "playing-the-game.md");
	const content = readFileSync(filePath, "utf8");

	const anchorIndex = content.indexOf(SKILLS_ANCHOR);
	if (anchorIndex === -1) {
		throw new Error(
			`playing-the-game markdown reader: anchor '${SKILLS_ANCHOR}' not found in ` +
				`${filePath} — the Skill Proficiencies section may have been reworded upstream.`,
		);
	}

	const tableStart = content.indexOf("<table>", anchorIndex);
	if (tableStart === -1 || tableStart - anchorIndex > 500) {
		throw new Error(
			`playing-the-game markdown reader: no '<table>' found shortly after the ` +
				`'${SKILLS_ANCHOR}' anchor in ${filePath} — the Skill Proficiencies table may have moved.`,
		);
	}
	const tableEnd = content.indexOf("</table>", tableStart);
	if (tableEnd === -1) {
		throw new Error(
			`playing-the-game markdown reader: unterminated '<table>' at offset ${tableStart}.`,
		);
	}
	const tableBlock = content.slice(tableStart, tableEnd);

	if (
		!/<th>\s*Skill\s*<\/th>\s*<th>\s*Ability\s*<\/th>\s*<th>\s*Example Uses\s*<\/th>/.test(
			tableBlock,
		)
	) {
		throw new Error(
			"playing-the-game markdown reader: Skill Proficiencies table header is not the expected " +
				"'Skill | Ability | Example Uses' shape — got:\n" +
				`${tableBlock.slice(0, 300)}`,
		);
	}

	const rows: SkillProficiencyRow[] = [];
	for (const match of tableBlock.matchAll(ROW_PATTERN)) {
		const [, skillName, abilityName, exampleUses] = match;
		if (!skillName || !abilityName || exampleUses === undefined) {
			throw new Error(`playing-the-game markdown reader: malformed row match: ${match[0]}`);
		}
		rows.push({
			skillName: skillName.trim(),
			abilityName: abilityName.trim(),
			exampleUses: exampleUses.trim(),
		});
	}

	if (rows.length !== EXPECTED_ROW_COUNT) {
		throw new Error(
			`playing-the-game markdown reader: expected ${EXPECTED_ROW_COUNT} Skill Proficiencies rows, ` +
				`parsed ${rows.length} — the table shape may have changed. Rows found: ` +
				JSON.stringify(rows.map((r) => r.skillName)),
		);
	}
	return rows;
}

/**
 * One row of the "Actions" table (§ Actions), as literally printed in the
 * SRD prose: `Action | Summary`. Ledger observation 3 / finding STEP-2
 * source check (2026-07-27): NO `srd-2024_actions` RuleSet/Rule pk exists
 * anywhere in the CC-BY-4.0 open5e directory (confirmed by directly listing
 * `OPEN5E_SRD_2024_DIR` — all 30 files enumerated, none actions-shaped), so
 * this table is markdown-only, same posture as the Skill Proficiencies table
 * above.
 */
export interface ActionTableRow {
	/** The action's printed name, e.g. "Dash". */
	actionName: string;
	/** The table's one-line summary, e.g. "Make a Dexterity (Stealth) check." */
	summary: string;
}

const ACTIONS_ANCHOR = "**Actions**";
const ACTIONS_ROW_PATTERN = /<tr>\s*<td>([^<]*)<\/td>\s*<td>([^<]*)<\/td>\s*<\/tr>/g;
const EXPECTED_ACTIONS_ROW_COUNT = 12;

/**
 * Parse the "Actions" HTML table out of the cached chapter markdown: Action |
 * Summary, 12 rows (playing-the-game.md § Actions). Same loud-fail posture as
 * {@link readSkillProficienciesTable} — a fork re-sync that reshapes this
 * section must fail the generator, not silently emit stale/wrong data.
 */
export function readActionsTable(): ActionTableRow[] {
	const filePath = path.join(CACHE_MARKDOWN_DIR, "playing-the-game.md");
	const content = readFileSync(filePath, "utf8");

	const anchorIndex = content.indexOf(ACTIONS_ANCHOR);
	if (anchorIndex === -1) {
		throw new Error(
			`playing-the-game markdown reader: anchor '${ACTIONS_ANCHOR}' not found in ` +
				`${filePath} — the Actions section may have been reworded upstream.`,
		);
	}

	const tableStart = content.indexOf("<table>", anchorIndex);
	if (tableStart === -1 || tableStart - anchorIndex > 500) {
		throw new Error(
			`playing-the-game markdown reader: no '<table>' found shortly after the ` +
				`'${ACTIONS_ANCHOR}' anchor in ${filePath} — the Actions table may have moved.`,
		);
	}
	const tableEnd = content.indexOf("</table>", tableStart);
	if (tableEnd === -1) {
		throw new Error(
			`playing-the-game markdown reader: unterminated '<table>' at offset ${tableStart}.`,
		);
	}
	const tableBlock = content.slice(tableStart, tableEnd);

	if (!/<th>\s*Action\s*<\/th>\s*<th>\s*Summary\s*<\/th>/.test(tableBlock)) {
		throw new Error(
			"playing-the-game markdown reader: Actions table header is not the expected " +
				"'Action | Summary' shape — got:\n" +
				`${tableBlock.slice(0, 300)}`,
		);
	}

	const rows: ActionTableRow[] = [];
	for (const match of tableBlock.matchAll(ACTIONS_ROW_PATTERN)) {
		const [, actionName, summary] = match;
		if (!actionName || !summary) {
			throw new Error(`playing-the-game markdown reader: malformed Actions row match: ${match[0]}`);
		}
		rows.push({ actionName: actionName.trim(), summary: summary.trim() });
	}

	if (rows.length !== EXPECTED_ACTIONS_ROW_COUNT) {
		throw new Error(
			`playing-the-game markdown reader: expected ${EXPECTED_ACTIONS_ROW_COUNT} Actions rows, ` +
				`parsed ${rows.length} — the table shape may have changed. Rows found: ` +
				JSON.stringify(rows.map((r) => r.actionName)),
		);
	}
	return rows;
}
