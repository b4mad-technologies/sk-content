// Ability Checks (playing-the-game.md § D20 Tests > Ability Checks): the
// mechanic ITSELF is already the chapter's D20 core-procedure idiom
// (`d20-units.ts`'s `d20TestExpr`) applied with no proficiency term dropped —
// there is nothing new to compose here. This unit's own substance is the two
// REFERENCE tables the section introduces: the Ability Check Examples table
// (which ability governs which kind of check) and the Typical Difficulty
// Classes table (the DC ladder a GM/author picks from). Ledger row: "Ability
// Checks" (`ledger/playing-the-game.md`).
//
// SOURCE: `cache/open5e/Rule.json`, pk `srd-2024_d20-tests_ability-checks` —
// unlike the D20 core-procedure unit (whose step 3 the open5e RuleSet omits,
// see d20-units.ts), THIS record's desc carries both tables cleanly as plain
// markdown pipe tables (open5e's own conversion didn't drop them), so no
// markdown fallback is needed here.
//
// DATA VS CONSTANTS DECISION (ledger's own open question, corrected
// 2026-07-29): runtime mechanics still consume integer DCs, never a table row;
// the parsed constant table grounds generation and tests rather than inventing
// a 5e-specific behavior-bearing schema. For author/DM discovery, however,
// the complete ladder now also ships once as the presentation-only description
// of the shared `srd.difficulty_class` tag-value definition, attached to every
// generic-check DC resource — the same queryable metadata shape as
// `srd.ability_score`. No tier becomes a tag parameter, resource, dispatch
// value, or runtime rule. See `tag-value-vocabulary.ts`.
import { ruleByPk } from "../../open5e/rule";

export const ABILITY_CHECKS_RULE_PK = "srd-2024_d20-tests_ability-checks";

/** One row of the Ability Check Examples table (§ D20 Tests > Ability Checks). */
export interface AbilityCheckExample {
	ability: string;
	makeACheckTo: string;
}

/** One row of the Typical Difficulty Classes table (same section). */
export interface TypicalDifficultyClass {
	taskDifficulty: string;
	dc: number;
}

/** Parse a plain 2-column markdown pipe table's data rows (header + `---` separator dropped). */
function parsePipeTableRows(desc: string, headerPattern: RegExp): string[][] {
	const lines = desc.split("\n").map((line) => line.trim());
	const headerIndex = lines.findIndex((line) => headerPattern.test(line));
	if (headerIndex === -1) {
		throw new Error(
			`ability-checks-units: header matching ${headerPattern} not found in rule '${ABILITY_CHECKS_RULE_PK}'.`,
		);
	}
	const separatorLine = lines[headerIndex + 1];
	if (separatorLine === undefined || !/^\|-+\|-+\|$/.test(separatorLine)) {
		throw new Error(
			`ability-checks-units: no '|---|---|' separator immediately after header at line ${headerIndex}.`,
		);
	}
	const rows: string[][] = [];
	for (let index = headerIndex + 2; index < lines.length; index += 1) {
		const line = lines[index];
		if (line === undefined || !/^\|[^|]+\|[^|]+\|$/.test(line)) {
			break;
		}
		const cells = line
			.slice(1, -1)
			.split("|")
			.map((cell) => cell.trim());
		rows.push(cells);
	}
	if (rows.length === 0) {
		throw new Error(`ability-checks-units: no data rows parsed after header ${headerPattern}.`);
	}
	return rows;
}

/**
 * Parse the Ability Check Examples table (Ability | Make a Check To …).
 * Throws loudly on any shape surprise (AGENTS.md loud-fail parser posture).
 */
export function parseAbilityCheckExamples(desc: string): AbilityCheckExample[] {
	const rows = parsePipeTableRows(desc, /^\|Ability\|Make a Check To/);
	return rows.map(([ability, makeACheckTo]) => {
		if (ability === undefined || makeACheckTo === undefined) {
			throw new Error("ability-checks-units: Ability Check Examples row missing a cell.");
		}
		return { ability, makeACheckTo };
	});
}

/** The parsed Ability Check Examples table, read from the committed cache. */
export function abilityCheckExamples(): AbilityCheckExample[] {
	return parseAbilityCheckExamples(ruleByPk(ABILITY_CHECKS_RULE_PK).desc);
}

/**
 * Parse the Typical Difficulty Classes table (Task Difficulty | DC). Throws
 * loudly on any shape surprise or non-numeric DC cell.
 */
export function parseTypicalDifficultyClasses(desc: string): TypicalDifficultyClass[] {
	const rows = parsePipeTableRows(desc, /^\|Task Difficulty\|DC/);
	return rows.map(([taskDifficulty, dcCell]) => {
		if (taskDifficulty === undefined || dcCell === undefined) {
			throw new Error("ability-checks-units: Typical Difficulty Classes row missing a cell.");
		}
		if (!/^\d+$/.test(dcCell)) {
			throw new Error(
				`ability-checks-units: DC cell '${dcCell}' is not a plain non-negative integer.`,
			);
		}
		return { taskDifficulty, dc: Number.parseInt(dcCell, 10) };
	});
}

/** The parsed Typical Difficulty Classes ladder, read from the committed cache. */
export function typicalDifficultyClasses(): TypicalDifficultyClass[] {
	return parseTypicalDifficultyClasses(ruleByPk(ABILITY_CHECKS_RULE_PK).desc);
}
