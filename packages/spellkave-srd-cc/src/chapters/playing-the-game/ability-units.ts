// The Six Abilities identity list (playing-the-game.md § The Six Abilities),
// sourced from `cache/open5e/AbilityDescription.json` (6 records, CC-BY-4.0).
// Also owns the adjacent Ability Scores meaning table, sourced from
// `cache/open5e/Rule.json` pk `srd-2024_the-six-abilities_ability-scores`.
// The meaning bands are a parsed reference table rather than fixture rows:
// no runtime predicate or read surface consumes qualitative labels such as
// "weak capability". Ledger rows: `ledger/playing-the-game.md` "Ability
// Descriptions" and "Ability Scores (1–30 meaning bands)".
import { readAbilityDescriptions } from "../../open5e/ability-description";
import { ruleByPk } from "../../open5e/rule";

export const ABILITY_SCORES_RULE_PK = "srd-2024_the-six-abilities_ability-scores";

/** One inclusive range from the SRD Ability Scores table. */
export interface AbilityScoreBand {
	minScore: number;
	maxScore: number;
	meaning: string;
}

/**
 * Parse the Ability Scores table from its open5e rule description.
 * Throws loudly if the table shape, a range, or the 1–30 coverage changes.
 */
export function parseAbilityScoreBands(desc: string): AbilityScoreBand[] {
	const lines = desc.split("\n").map((line) => line.trim());
	const headerIndex = lines.indexOf("|Score|Meaning|");
	if (headerIndex === -1) {
		throw new Error(
			`ability-units: '|Score|Meaning|' header not found in rule '${ABILITY_SCORES_RULE_PK}'.`,
		);
	}
	if (lines[headerIndex + 1] !== "|---|---|") {
		throw new Error("ability-units: Ability Scores table header has no '|---|---|' separator.");
	}

	const bands: AbilityScoreBand[] = [];
	for (let index = headerIndex + 2; index < lines.length; index += 1) {
		const line = lines[index];
		const rowMatch = line?.match(/^\|(\d+)(?:–(\d+))?\|\s*(.+?)\s*\|$/);
		if (rowMatch === null || rowMatch === undefined) {
			break;
		}
		const [, minCell, maxCell, meaning] = rowMatch;
		if (minCell === undefined || meaning === undefined) {
			throw new Error(`ability-units: malformed Ability Scores row '${line}'.`);
		}
		const minScore = Number.parseInt(minCell, 10);
		const maxScore = Number.parseInt(maxCell ?? minCell, 10);
		if (minScore > maxScore) {
			throw new Error(`ability-units: descending Ability Scores range '${minCell}–${maxCell}'.`);
		}
		bands.push({ minScore, maxScore, meaning });
	}

	if (bands.length === 0) {
		throw new Error("ability-units: Ability Scores table has no data rows.");
	}
	let expectedMin = 1;
	for (const band of bands) {
		if (band.minScore !== expectedMin) {
			throw new Error(
				`ability-units: Ability Scores bands must be contiguous from 1; expected ${expectedMin}, got ${band.minScore}.`,
			);
		}
		expectedMin = band.maxScore + 1;
	}
	if (expectedMin !== 31) {
		throw new Error(
			`ability-units: Ability Scores bands must cover through 30, got through ${expectedMin - 1}.`,
		);
	}
	return bands;
}

/** The parsed 1–30 Ability Scores meaning bands, read from the committed cache. */
export function abilityScoreBands(): AbilityScoreBand[] {
	return parseAbilityScoreBands(ruleByPk(ABILITY_SCORES_RULE_PK).desc);
}

/**
 * The ONE centralized ability-code vocabulary (finding #2
 * mitigation, `ledger/findings.md`): `spellkave_define_capability`'s `tags`
 * has no first-class "governing ability" field — it's a free-string tag
 * (`srd.ability.wis`), unvalidated against the ability resource ids by the
 * validator. `skill-units.ts` lints every skill's governing ability against
 * THIS set before it ever reaches an authored tag.
 */
export const ABILITY_CODES = ["str", "dex", "con", "int", "wis", "cha"] as const;
export type AbilityCode = (typeof ABILITY_CODES)[number];

function isAbilityCode(value: string): value is AbilityCode {
	return (ABILITY_CODES as readonly string[]).includes(value);
}

// Standard ability-score display names — not sourced from the JSON (which
// carries only flavour `desc`, not a display name), same labels
// `world-fixtures/srd/base/resources.toml`'s ability-score rows use.
export const ABILITY_DISPLAY_NAMES: Record<AbilityCode, string> = {
	str: "Strength",
	dex: "Dexterity",
	con: "Constitution",
	int: "Intelligence",
	wis: "Wisdom",
	cha: "Charisma",
};

/**
 * The inverse of {@link ABILITY_DISPLAY_NAMES} — full ability name (as
 * printed in SRD prose, e.g. "Dexterity") -> code. `skill-units.ts` uses this
 * to translate the markdown-parsed "Skill Proficiencies" table's `Ability`
 * column into an `AbilityCode`, so the ONE centralized vocabulary
 * (`ABILITY_CODES`) stays the single source of truth on both sides.
 */
const ABILITY_CODE_BY_DISPLAY_NAME: Record<string, AbilityCode> = Object.fromEntries(
	ABILITY_CODES.map((code) => [ABILITY_DISPLAY_NAMES[code], code]),
);

/** Resolve a full ability name (e.g. "Dexterity") to its code, throwing loudly on an unknown name. */
export function abilityCodeByDisplayName(name: string): AbilityCode {
	const code = ABILITY_CODE_BY_DISPLAY_NAME[name];
	if (code === undefined) {
		throw new Error(
			`ability-units: unknown ability display name '${name}' — not one of ` +
				`[${Object.values(ABILITY_DISPLAY_NAMES).join(", ")}].`,
		);
	}
	return code;
}

/** One ability identity unit, ready to render as a `resource_definitions` row. */
export interface AbilityUnit {
	code: AbilityCode;
	displayName: string;
	description: string;
	/** open5e pk this unit's `description` came from (TOML provenance). */
	sourcePk: string;
}

/** Build all 6 ability identity units, sorted by code for deterministic output. */
export function buildAbilityUnits(): AbilityUnit[] {
	const records = readAbilityDescriptions();
	if (records.length !== ABILITY_CODES.length) {
		throw new Error(
			`ability-units: expected ${ABILITY_CODES.length} AbilityDescription records, got ${records.length}.`,
		);
	}
	const units = records.map((record) => {
		if (!isAbilityCode(record.describes)) {
			throw new Error(
				`ability-units: pk '${record.pk}' describes unknown ability code '${record.describes}' — ` +
					`not in ABILITY_CODES [${ABILITY_CODES.join(", ")}].`,
			);
		}
		if (record.desc.trim().length === 0) {
			throw new Error(`ability-units: pk '${record.pk}' has an empty description.`);
		}
		return {
			code: record.describes,
			displayName: ABILITY_DISPLAY_NAMES[record.describes],
			description: record.desc,
			sourcePk: record.pk,
		};
	});
	return units.sort((a, b) => a.code.localeCompare(b.code));
}

export function abilityModifierTargetRow(code: AbilityCode): Record<string, unknown> {
	return {
		target_id: `srd/${code}`,
		shape: "Numeric",
		display_name: `${ABILITY_DISPLAY_NAMES[code]} score modifier target`,
		bundle_id: "srd",
	};
}
