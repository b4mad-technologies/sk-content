import { HEADING_ALIAS_BY_SLUG } from "../chapters/classes/advancement-metadata-units";
import {
	classCoreTraitsMarkdownBlock,
	classFeatureColumnMarkdownBlock,
	classFeatureMarkdownBlock,
} from "../markdown/classes";
import { open5eRow } from "./open5e";
import type { ExtractedSrdText } from "./types";

const HEADING_LEVEL_BY_PK: Readonly<Record<string, number>> = {
	// classes.md:319 and :333 repeat the same heading; the compiler pk distinguishes the levels.
	"srd-2024_barbarian_improved-brutal-strike": 13,
	"srd-2024_barbarian_improved-brutal-strike-enhanced": 17,
};

const HEADING_NAME_BY_PK: Readonly<Record<string, string>> = {
	// classes.md:333 omits ClassFeature.json's editorial "(Enhanced)" suffix.
	"srd-2024_barbarian_improved-brutal-strike-enhanced": "Improved Brutal Strike",
	// classes.md:4848 corrects the cached Open5E name typo "Studdied".
	"srd-2024_fighter_studied-attacks": "Studied Attacks",
	// classes.md:5166 corrects the cached Open5E name typo "Unarmoed".
	"srd-2024_monk_unarmored-movement": "Unarmored Movement",
	// classes.md:8998 uses the full adjective absent from the cached Open5E display name.
	"srd-2024_warlock_magical-cunning": "Magical Cunning",
};

export function canonicalClassFeatureText(args: {
	sourcePk: string;
	parentPk: string;
	featureSlug: string;
	className: string;
	subclassName?: string;
}): ExtractedSrdText {
	const row = open5eRow("ClassFeature.json", args.sourcePk);
	if (row.fields.parent !== args.parentPk) {
		throw new Error(
			`canonical class feature: '${args.sourcePk}' belongs to '${String(row.fields.parent)}', not '${args.parentPk}'.`,
		);
	}
	const featureType = row.fields.feature_type;
	if (featureType === "CORE_TRAITS_TABLE") return classCoreTraitsMarkdownBlock(args.className);
	if (
		row.fields.desc === "[Column data]" ||
		featureType === "PROFICIENCY_BONUS" ||
		featureType === "CLASS_TABLE_DATA" ||
		featureType === "SPELL_SLOTS"
	) {
		const sourceName = String(row.fields.name);
		const columnName =
			featureType === "SPELL_SLOTS"
				? sourceName.replace(/(?:st|nd|rd|th)$/, "")
				: sourceName.replace(/ Known$| Uses$/, "");
		const displayName =
			featureType === "SPELL_SLOTS" ? `Spell Slots (${sourceName}-level)` : columnName;
		return classFeatureColumnMarkdownBlock(args.className, columnName, displayName);
	}
	if (featureType !== undefined && featureType !== "CLASS_FEATURE_OPTION_LIST") {
		throw new Error(
			`canonical class feature: unsupported feature_type '${String(featureType)}' for '${args.sourcePk}'.`,
		);
	}
	return classFeatureMarkdownBlock({
		className: args.className,
		...(args.subclassName ? { subclassName: args.subclassName } : {}),
		displayName:
			HEADING_NAME_BY_PK[args.sourcePk] ??
			HEADING_ALIAS_BY_SLUG[args.featureSlug] ??
			String(row.fields.name),
		...(HEADING_LEVEL_BY_PK[args.sourcePk] === undefined
			? {}
			: { level: HEADING_LEVEL_BY_PK[args.sourcePk] }),
	});
}
