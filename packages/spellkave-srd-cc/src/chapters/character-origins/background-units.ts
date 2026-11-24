// O1 (Character Origins Backgrounds, `ledger/character-origins.md`): the four
// SRD Backgrounds, decomposed from `Background.json` (identity only, `desc`
// always empty) + `BackgroundBenefit.json` (the STAR source — exactly 5 typed
// rows per background: ability_score / skill_proficiency / tool_proficiency /
// equipment / feat, descs VERBATIM to `cache/markdown/character-origins.md`'s
// own per-background stat blocks).
//
// DECIDED grant representation (operator, 2026-07-31, option (b)): a
// background NAMES the real capabilities/entities it grants on the unit
// (skill/tool capability ids, feat entity id, structured Origin Feat
// attachments) and on srd.text provenance — it does not itself apply them
// to any actor, and the website identity card is authored flavor, not a
// grant dump. The apply moment is a creation-tables-flow concern. Concretely:
//   - Skill Proficiencies reference the EXISTING 18 `srd/skill/<slug>`
//     capabilities (`skill-units.ts`) — names resolved to slugs by looking
//     up the real skill catalog, never hand-slugged (this file's own
//     `resolveSkillCapabilityId`).
//   - Tool Proficiency references either the EXISTING `srd/proficiency/tool/
//     thieves-tools` capability (Criminal) or one of the two NET-NEW
//     capabilities this slice ships alongside it
//     (`equipment-proficiencies-units.ts`): Calligrapher's Supplies
//     (Acolyte + Sage) and Gaming Set, Dice (Soldier's concrete authorial
//     pick for its open "Choose one kind of Gaming Set" — never the only
//     legal one).
//   - Feat references the REAL F1 feat entities (`srd/feat/<slug>`,
//     `feats-units.ts`) — Acolyte/Sage's "(Cleric)"/"(Wizard)" qualifier is
//     parsed out and carried on the unit (featQualifier), never folded into the
//     feat id itself (Magic Initiate is ONE feat entity, chosen twice).
//   - Ability Scores and Equipment are unit metadata only (the
//     ability triple + the SRD's own "Choose A/B" equipment text,
//     equipment cross-referencing the Equipment chapter by name) — no
//     mechanic backs either yet (`ledger/character-origins.md`'s slice plan).

import type { SetMetadataUpdate } from "@spellkave/tool-authoring";
import { readBackgroundFlavor } from "../../flavor/read";
import {
	type BackgroundBenefitRecord,
	backgroundBenefitsByParent,
	readBackgrounds,
} from "../../open5e/background";
import { buildOriginFeatUnits } from "../feats/feats-units";
import { type AbilityCode, abilityCodeByDisplayName } from "../playing-the-game/ability-units";
import {
	CALLIGRAPHERS_SUPPLIES_PROFICIENCY_CAPABILITY_ID,
	GAMING_SET_DICE_PROFICIENCY_CAPABILITY_ID,
	THIEVES_TOOLS_PROFICIENCY_CAPABILITY_ID,
} from "../playing-the-game/equipment-proficiencies-units";
import { buildSkillUnits } from "../playing-the-game/skill-units";

export const BUNDLE_ID = "srd";

/** ADR-0073 namespace: background → Origin Feat grant (lane L4). */
export const BACKGROUND_ORIGIN_FEAT_NAMESPACE = "srd.background_origin_feat";

const EXPECTED_BACKGROUND_COUNT = 4;

/** `Background.json` pk -> `cache/markdown/character-origins.md` line anchor (the header + 5-line stat block). */
const BACKGROUND_MARKDOWN_ANCHORS: Record<string, string> = {
	"srd-2024_acolyte": "character-origins.md:33-39",
	"srd-2024_criminal": "character-origins.md:41-47",
	"srd-2024_sage": "character-origins.md:49-55",
	"srd-2024_soldier": "character-origins.md:57-63",
};

/**
 * Closed lookup for the Tool Proficiency benefit's raw desc string ->
 * capability id + choice framing. Exactly the 3 raw values the 4 backgrounds'
 * `tool_proficiency` rows carry (`ledger/character-origins.md`'s O1 row):
 * Thieves' Tools (existing), Calligrapher's Supplies (net-new, shared by
 * Acolyte+Sage), and Soldier's open "Choose one kind of Gaming Set" (net-new,
 * concrete authorial pick: Dice).
 */
interface ToolProficiencyResolution {
	capabilityId: string;
	/** True for Soldier's own open "Choose one kind of ..." phrasing — stay on the unit; never silently treat Dice as the only legal Gaming Set. */
	isOpenChoice: boolean;
}

const TOOL_PROFICIENCY_BY_DESC: Record<string, ToolProficiencyResolution> = {
	"Thieves' Tools": { capabilityId: THIEVES_TOOLS_PROFICIENCY_CAPABILITY_ID, isOpenChoice: false },
	"Calligrapher's Supplies": {
		capabilityId: CALLIGRAPHERS_SUPPLIES_PROFICIENCY_CAPABILITY_ID,
		isOpenChoice: false,
	},
	"Choose one kind of Gaming Set": {
		capabilityId: GAMING_SET_DICE_PROFICIENCY_CAPABILITY_ID,
		isOpenChoice: true,
	},
};

function resolveToolProficiency(desc: string): ToolProficiencyResolution {
	const resolution = TOOL_PROFICIENCY_BY_DESC[desc];
	if (resolution === undefined) {
		throw new Error(
			`background-units: no resolution recorded for Tool Proficiency desc '${desc}' — ` +
				"ledger/character-origins.md's O1 row may be stale.",
		);
	}
	return resolution;
}

/** Split a `BackgroundBenefit` "Skill Proficiencies" desc ("X and Y") into its two skill display names. */
function splitSkillNames(desc: string): [string, string] {
	const parts = desc.split(" and ");
	if (parts.length !== 2 || parts[0] === undefined || parts[1] === undefined) {
		throw new Error(
			`background-units: expected 'X and Y' shape for Skill Proficiencies desc '${desc}'.`,
		);
	}
	return [parts[0], parts[1]];
}

/** Resolve a skill's display name (e.g. "Sleight of Hand") to its real `srd/skill/<slug>` capability id — verified against the shipped skill catalog, never hand-slugged. */
function resolveSkillCapabilityId(skillName: string): string {
	const slug = skillName
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	const known = buildSkillUnits().find((skill) => skill.slug === slug);
	if (known === undefined) {
		throw new Error(
			`background-units: '${skillName}' (slug '${slug}') is not one of the 18 shipped skills.`,
		);
	}
	return `${BUNDLE_ID}/skill/${known.slug}`;
}

/** Split a `BackgroundBenefit` "Ability Scores" desc ("X, Y, Z") into its three ability display names, resolved to codes via the ONE centralized `ABILITY_CODES` vocabulary. */
function resolveAbilityScoreCodes(desc: string): AbilityCode[] {
	const names = desc.split(", ");
	if (names.length !== 3) {
		throw new Error(`background-units: expected 3 comma-separated ability names in '${desc}'.`);
	}
	return names.map((name) => abilityCodeByDisplayName(name));
}

/** Parse a `BackgroundBenefit` "Feat" desc — either a bare feat name ("Alert") or one with a background-added qualifier ("Magic Initiate (Cleric)") — into the base feat name and optional qualifier. */
function parseFeatDesc(desc: string): { featName: string; qualifier: string | undefined } {
	const match = /^(.+?)(?:\s+\(([^)]+)\))?$/.exec(desc);
	if (match === null || match[1] === undefined) {
		throw new Error(`background-units: unparseable Feat desc '${desc}'.`);
	}
	return { featName: match[1], qualifier: match[2] };
}

/** Resolve a Feat desc's base name to the real F1 `srd/feat/<slug>` entity id — verified against the shipped feat catalog, never hand-slugged. */
function resolveFeatEntityId(featName: string): string {
	const known = buildOriginFeatUnits().find((feat) => feat.displayName === featName);
	if (known === undefined) {
		throw new Error(
			`background-units: '${featName}' is not one of the 4 shipped Origin feats — F1 must build ` +
				"before O1 (ledger/character-origins.md).",
		);
	}
	return known.entityId;
}

export interface BackgroundBenefitUnit {
	type: BackgroundBenefitRecord["type"];
	label: string;
	desc: string;
	sourcePk: string;
}

export interface BackgroundUnit {
	/** `Background.json` pk suffix, e.g. `acolyte` / `soldier`. */
	slug: string;
	/** `srd/background/<slug>` — this background's `entity_definitions` id (drop-in, sister-checked). */
	entityId: string;
	displayName: string;
	abilityScoreNames: string[];
	abilityScoreCodes: AbilityCode[];
	skillNames: [string, string];
	skillCapabilityIds: [string, string];
	toolProficiencyDesc: string;
	toolProficiencyCapabilityId: string;
	toolProficiencyIsOpenChoice: boolean;
	equipmentDesc: string;
	featName: string;
	featQualifier: string | undefined;
	featEntityId: string;
	benefits: BackgroundBenefitUnit[];
	/** `Background.json` pk. */
	sourcePk: string;
	markdownAnchor: string;
}

/**
 * Build the four Background units, `Background.json` pk order (acolyte,
 * criminal, sage, soldier — already alphabetical, matching `feats-units.ts`'s
 * own precedent for the sibling F1 chapter).
 */
export function buildBackgroundUnits(): BackgroundUnit[] {
	const backgrounds = readBackgrounds();
	if (backgrounds.length !== EXPECTED_BACKGROUND_COUNT) {
		throw new Error(
			`background-units: expected ${EXPECTED_BACKGROUND_COUNT} Background.json rows, found ` +
				`${backgrounds.length} — ledger/character-origins.md's "Sources" section may be stale.`,
		);
	}

	return backgrounds.map((background) => {
		const markdownAnchor = BACKGROUND_MARKDOWN_ANCHORS[background.pk];
		if (markdownAnchor === undefined) {
			throw new Error(`background-units: no markdown anchor recorded for '${background.pk}'.`);
		}
		const benefitRows = backgroundBenefitsByParent(background.pk);
		const bySlug = new Map(benefitRows.map((row) => [row.type, row]));
		const abilityScoreRow = bySlug.get("ability_score");
		const skillRow = bySlug.get("skill_proficiency");
		const toolRow = bySlug.get("tool_proficiency");
		const equipmentRow = bySlug.get("equipment");
		const featRow = bySlug.get("feat");
		if (
			abilityScoreRow === undefined ||
			skillRow === undefined ||
			toolRow === undefined ||
			equipmentRow === undefined ||
			featRow === undefined
		) {
			// Unreachable given backgroundBenefitsByParent's own size check —
			// defensive guard against a future refactor dropping it.
			throw new Error(`background-units: incomplete benefit set for '${background.pk}'.`);
		}

		const abilityScoreNames = abilityScoreRow.desc.split(", ");
		const abilityScoreCodes = resolveAbilityScoreCodes(abilityScoreRow.desc);
		const skillNames = splitSkillNames(skillRow.desc);
		const skillCapabilityIds: [string, string] = [
			resolveSkillCapabilityId(skillNames[0]),
			resolveSkillCapabilityId(skillNames[1]),
		];
		const toolResolution = resolveToolProficiency(toolRow.desc);
		const { featName, qualifier } = parseFeatDesc(featRow.desc);
		const featEntityId = resolveFeatEntityId(featName);

		const benefits: BackgroundBenefitUnit[] = [
			{
				type: "ability_score",
				label: abilityScoreRow.name,
				desc: abilityScoreRow.desc,
				sourcePk: abilityScoreRow.pk,
			},
			{
				type: "skill_proficiency",
				label: skillRow.name,
				desc: skillRow.desc,
				sourcePk: skillRow.pk,
			},
			{ type: "tool_proficiency", label: toolRow.name, desc: toolRow.desc, sourcePk: toolRow.pk },
			{
				type: "equipment",
				label: equipmentRow.name,
				desc: equipmentRow.desc,
				sourcePk: equipmentRow.pk,
			},
			{ type: "feat", label: featRow.name, desc: featRow.desc, sourcePk: featRow.pk },
		];

		return {
			slug: background.pk.slice("srd-2024_".length),
			entityId: `${BUNDLE_ID}/background/${background.pk.slice("srd-2024_".length)}`,
			displayName: background.name,
			abilityScoreNames,
			abilityScoreCodes,
			skillNames,
			skillCapabilityIds,
			toolProficiencyDesc: toolRow.desc,
			toolProficiencyCapabilityId: toolResolution.capabilityId,
			toolProficiencyIsOpenChoice: toolResolution.isOpenChoice,
			equipmentDesc: equipmentRow.desc,
			featName,
			featQualifier: qualifier,
			featEntityId,
			benefits,
			sourcePk: background.pk,
			markdownAnchor,
		};
	});
}

/**
 * Website identity card: authored Terra flavor under authored/flavor/en/backgrounds/.
 * Grant ids, ability/equipment text, and Background.json provenance stay on the
 * unit, Origin Feat attachments, and srd.text — never in this description.
 */
export function buildBackgroundDescription(unit: BackgroundUnit): string {
	return readBackgroundFlavor(unit.slug).body;
}

/** One `srd.background_origin_feat` attachment per background → Origin Feat entity. */
export function backgroundOriginFeatAttachmentUpdates(): SetMetadataUpdate[] {
	return buildBackgroundUnits().map((unit) => {
		const payload: Record<string, unknown> = {
			background: unit.slug,
			feat: unit.featEntityId,
		};
		if (unit.featQualifier !== undefined) {
			payload.qualifier = unit.featQualifier;
		}
		payload.ability_scores = unit.abilityScoreCodes;
		return {
			target: { kind: "entity_definition", ref: unit.entityId },
			key: BACKGROUND_ORIGIN_FEAT_NAMESPACE,
			value: payload,
		};
	});
}

export function backgroundOriginFeatNamespaceUpdate(): SetMetadataUpdate {
	return {
		target: "namespace",
		key: BACKGROUND_ORIGIN_FEAT_NAMESPACE,
		value: {
			audience: "public",
			description:
				"background slug -> Origin Feat entity id granted at character creation (L1). " +
				'payload_json = {"background": <slug>, "feat": <srd/feat/...>, "qualifier"?: string, ' +
				'"ability_scores": [<codes>]}. Dialogue owns the apply moment (lane L5); this row is ' +
				"the SRD fact. Design: bead sk-609b.5 (design trail).",
			on_demand: true,
		},
	};
}
