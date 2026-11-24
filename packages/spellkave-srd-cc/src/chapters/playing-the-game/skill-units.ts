// Skills identity list (playing-the-game.md § Proficiency > Skill
// Proficiencies), sourced from `cache/open5e/SkillDescription.json` (18
// records, CC-BY-4.0) for identity fields, and from the cached chapter
// markdown's own "Skill Proficiencies" table for the governing-ability
// mapping (`../../markdown/playing-the-game.ts`) — NOT hardcoded from
// memory: the mapping IS in the cached sources (finding #2), so
// it must be read from there like everything else in this package. Ledger
// row: `ledger/playing-the-game.md` "Skills identity list".

import { readSkillProficienciesTable } from "../../markdown/playing-the-game";
import { readSkillDescriptions } from "../../open5e/skill-description";
import { type AbilityCode, abilityCodeByDisplayName } from "./ability-units";

const EXPECTED_SKILL_COUNT = 18;

/** `"Sleight of Hand"` -> `"sleight-of-hand"` — matches `SkillDescription.json`'s own `describes` slug convention. */
function slugifySkillName(name: string): string {
	const slug = name
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	if (slug.length === 0) {
		throw new Error(`skill-units: skill name '${name}' slugified to an empty string.`);
	}
	return slug;
}

/**
 * Skill slug -> governing ability, derived from the cached markdown's
 * "Skill Proficiencies" table (`readSkillProficienciesTable`) rather than
 * hardcoded — the table's `Ability` column (full name, e.g. "Dexterity") is
 * resolved to a code via `abilityCodeByDisplayName`, which throws loudly if
 * that name is ever not one of `ABILITY_CODES`' display names (finding
 * finding #2's lint, now validating a PARSED value instead of a hand-typed
 * one). Built once per module load; every skill slug maps to exactly one
 * ability — a duplicate slug (the table reflowing to repeat a row) throws.
 */
function buildGoverningAbilityBySlug(): Record<string, AbilityCode> {
	const table = readSkillProficienciesTable();
	const bySlug: Record<string, AbilityCode> = {};
	for (const row of table) {
		const slug = slugifySkillName(row.skillName);
		if (slug in bySlug) {
			throw new Error(
				`skill-units: duplicate skill slug '${slug}' in the parsed Skill Proficiencies table.`,
			);
		}
		bySlug[slug] = abilityCodeByDisplayName(row.abilityName);
	}
	return bySlug;
}

function titleCaseSlug(slug: string): string {
	return slug
		.split("-")
		.map((word) => {
			const [head, ...rest] = word;
			return head === undefined ? word : head.toUpperCase() + rest.join("");
		})
		.join(" ");
}

/** One skill identity unit, ready to render as a `capability_definitions` row. */
export interface SkillUnit {
	slug: string;
	displayName: string;
	description: string;
	governingAbility: AbilityCode;
	/** open5e pk this unit's `description` came from (TOML provenance). */
	sourcePk: string;
}

/** Build all 18 skill identity units, sorted by slug for deterministic output. */
export function buildSkillUnits(): SkillUnit[] {
	const records = readSkillDescriptions();
	if (records.length !== EXPECTED_SKILL_COUNT) {
		throw new Error(
			`skill-units: expected ${EXPECTED_SKILL_COUNT} SkillDescription records, got ${records.length}.`,
		);
	}

	// Finding #2 mitigation: `spellkave_define_capability`'s
	// `srd.ability.<code>` tag is an unvalidated free string — every governing
	// ability below is looked up through `abilityCodeByDisplayName`, which
	// throws loudly against the ONE centralized `ABILITY_CODES` vocabulary if
	// the markdown table's `Ability` column ever names something unrecognized,
	// so a fork typo fails HERE instead of silently authoring an ungrouped
	// skill.
	const governingAbilityBySlug = buildGoverningAbilityBySlug();

	// Cross-source consistency check (name normalization allowed): the
	// markdown table and SkillDescription.json are two INDEPENDENT cached
	// sources describing the same 18 skills. If a future fork re-sync adds,
	// drops, or renames a skill on either side, this must fail loudly rather
	// than silently pairing the wrong ability with a skill (or dropping one).
	const markdownSlugs = new Set(Object.keys(governingAbilityBySlug));
	const jsonSlugs = new Set(records.map((r) => r.describes));
	const onlyInMarkdown = [...markdownSlugs].filter((slug) => !jsonSlugs.has(slug));
	const onlyInJson = [...jsonSlugs].filter((slug) => !markdownSlugs.has(slug));
	if (onlyInMarkdown.length > 0 || onlyInJson.length > 0) {
		throw new Error(
			"skill-units: the markdown Skill Proficiencies table and SkillDescription.json disagree on " +
				`which skills exist. Only in markdown table: [${onlyInMarkdown.join(", ")}]. Only in ` +
				`SkillDescription.json: [${onlyInJson.join(", ")}].`,
		);
	}

	const units = records.map((record) => {
		const slug = record.describes;
		const governingAbility = governingAbilityBySlug[slug];
		if (governingAbility === undefined) {
			// Unreachable given the consistency check above — kept as a defensive
			// guard against a future refactor that removes that check.
			throw new Error(
				`skill-units: no governing ability resolved for skill '${slug}' (pk '${record.pk}').`,
			);
		}
		if (record.desc.trim().length === 0) {
			throw new Error(`skill-units: pk '${record.pk}' has an empty description.`);
		}
		return {
			slug,
			displayName: `Skill: ${titleCaseSlug(slug)}`,
			description: record.desc,
			governingAbility,
			sourcePk: record.pk,
		};
	});
	return units.sort((a, b) => a.slug.localeCompare(b.slug));
}
