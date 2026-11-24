/**
 * Parse class Core Traits skill-proficiency and starting-equipment rows into
 * structured choose-N menus for the creation wizard. Source text comes from
 * `classCreationData()` / `buildClassUnits()` (cache-cited `classes.md`), never
 * a hand list. See `bead sk-609b.7 (design trail)`.
 */
import { classCreationData, classCreationDataBySlug } from "./classes";
import { SRD_SKILL_CATALOG } from "./srd-catalog.ts";

const BUNDLE = "srd";

export interface ClassSkillChoice {
	/** How many distinct skills the player must pick. */
	chooseN: number;
	/** Display names in table order. */
	skillNames: readonly string[];
	/** Matching `srd/skill/<slug>` capability ids. */
	skillCapabilityIds: readonly string[];
	/** Raw Core Traits cell, for provenance. */
	sourceText: string;
}

export interface ClassKitOption {
	/** A / B / C … as written in the table. */
	letter: string;
	/** Verbatim option body (no leading letter). */
	description: string;
}

export interface ClassKitChoice {
	options: readonly ClassKitOption[];
	sourceText: string;
}

/** Same slugify as `background-units.ts` — display name → `srd/skill/<slug>`. */
function resolveSkillName(skillName: string): string {
	const slug = skillName
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	const known = SRD_SKILL_CATALOG.find((skill) => skill.slug === slug);
	if (known === undefined) {
		throw new Error(
			`class-choices: skill '${skillName}' (slug '${slug}') is not in the shipped catalog.`,
		);
	}
	return `${BUNDLE}/skill/${known.slug}`;
}

/**
 * Parse "Choose 2: A, B, C, or D" / "Choose any 3 skills …" into a choose-N
 * menu. Throws if the cell cannot be understood — better a loud generator
 * failure than a silent wrong N.
 */
export function parseSkillProficienciesText(text: string): ClassSkillChoice {
	const anyMatch = text.match(/^Choose any\s+(\d+)\s+skills\b/i);
	if (anyMatch !== null) {
		const chooseN = Number(anyMatch[1]);
		const units = SRD_SKILL_CATALOG;
		const names = units.map((s) => s.slug);
		return {
			chooseN,
			skillNames: names,
			skillCapabilityIds: units.map((s) => `${BUNDLE}/skill/${s.slug}`),
			sourceText: text,
		};
	}
	const chooseMatch = text.match(/^Choose\s+(\d+)\s*:\s*(.+)$/i);
	if (chooseMatch === null) {
		throw new Error(`class-choices: cannot parse skill proficiencies text: '${text}'`);
	}
	const chooseN = Number(chooseMatch[1]);
	const listPart = (chooseMatch[2] as string).replace(/\s+or\s+/gi, ", ");
	const names = listPart
		.split(",")
		.map((part) => part.trim())
		.filter((part) => part.length > 0);
	if (names.length < chooseN) {
		throw new Error(`class-choices: skill list shorter than chooseN=${chooseN} in '${text}'`);
	}
	return {
		chooseN,
		skillNames: names,
		skillCapabilityIds: names.map((n) => resolveSkillName(n)),
		sourceText: text,
	};
}

/** Skill choose-N menu for one class slug. */
export function classSkillChoice(classSlug: string): ClassSkillChoice {
	const data = classCreationDataBySlug(classSlug);
	return parseSkillProficienciesText(data.skillProficienciesText);
}

/**
 * Parse "Choose A or B: (A) …; or (B) …" / "Choose A, B, or C: (A) …; (B) …; or (C) …".
 */
export function parseStartingEquipmentText(text: string): ClassKitChoice {
	const options: ClassKitOption[] = [];
	const re = /\(([A-Z])\)\s*([^;]+?)(?=(?:;|\s*or\s*\([A-Z]\)|$))/g;
	let match: RegExpExecArray | null = re.exec(text);
	while (match !== null) {
		options.push({
			letter: match[1] as string,
			description: (match[2] as string).replace(/\s+or\s*$/i, "").trim(),
		});
		match = re.exec(text);
	}
	if (options.length === 0) {
		throw new Error(`class-choices: cannot parse starting equipment text: '${text}'`);
	}
	return { options, sourceText: text };
}

export function classKitChoice(classSlug: string): ClassKitChoice {
	const data = classCreationDataBySlug(classSlug);
	return parseStartingEquipmentText(data.startingEquipmentText);
}

/** Self-check: every class's skill + kit cells parse. */
export function assertAllClassChoicesParse(): void {
	for (const cls of classCreationData()) {
		classSkillChoice(cls.slug);
		classKitChoice(cls.slug);
	}
}
