// DOC-IMPL: derived-values#the-decision-rule
// Equipment Proficiencies mechanic (playing-the-game.md § Proficiency >
// Equipment Proficiencies; equipment.md § Tool Proficiency): Tool proficiency
// adds the Proficiency Bonus to a tool check. If the same check also uses the
// relevant skill, the bonus is still added only once and the SRD grants
// Advantage.
//
// This is a TypeScript composition helper, not a new DSL macro. The existing
// `srd/proficiency_bonus` macro already owns the reusable level/CR calculation;
// the only new part is the boolean OR over two capability identities. A macro
// cannot accept capability ids as values on this authoring surface, so a
// second macro would not be reusable or DSL-conformant here.
import { itemByPk } from "../../open5e/item";
import { abilityCodeByDisplayName } from "./ability-units";
import { type D20TestOptions, d20TestExpr } from "./d20-units";
import { buildSkillUnits } from "./skill-units";

export const THIEVES_TOOLS_PROFICIENCY_CAPABILITY_ID = "srd/proficiency/tool/thieves-tools";
export const LOCK_PICKING_CHECK_CAPABILITY_ID = "srd/check/lock-picking";
export const LOCK_ITEM_PK = "srd-2024_lock";
export const LOCK_TARGET_NICHE_TAG = "srd.lock";

// Net-new proficiency capabilities (2026-07-31, `ledger/character-origins.md`'s
// O1 slice) — consumer: Character Origins' Backgrounds (Acolyte/Sage's Tool
// Proficiency; Soldier's "Choose one kind of Gaming Set"). Same idiom as
// `THIEVES_TOOLS_PROFICIENCY_CAPABILITY_ID` above: identity-only capability,
// no check verb (unlike Thieves' Tools, no SRD text ties either tool to a
// scripted DC-based check), granted to no actor in the base bundle.
export const CALLIGRAPHERS_SUPPLIES_PROFICIENCY_CAPABILITY_ID =
	"srd/proficiency/tool/calligraphers-supplies";
export const GAMING_SET_DICE_PROFICIENCY_CAPABILITY_ID = "srd/proficiency/tool/gaming-set-dice";

export interface LockPickingRuleUnit {
	sourcePk: string;
	dc: number;
	abilityCode: string;
	skillCapabilityId: string;
	targetNicheTag: string;
}

function slugifyRuleName(name: string): string {
	const slug = name
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	if (slug.length === 0) {
		throw new Error(`equipment-proficiencies-units: rule name '${name}' slugified empty.`);
	}
	return slug;
}

/** Parse the Lock item's sourced `DC N Ability (Skill)` check instead of hand-typing it. */
export function lockPickingRuleUnit(): LockPickingRuleUnit {
	const lock = itemByPk(LOCK_ITEM_PK);
	if (lock.name !== "Lock" || lock.category !== "adventuring-gear") {
		throw new Error(
			`equipment-proficiencies-units: '${LOCK_ITEM_PK}' must be the Lock adventuring-gear row.`,
		);
	}
	const match = lock.description.match(/successful DC (\d+) ([A-Za-z]+) \(([^)]+)\) check/);
	if (match === null) {
		throw new Error(
			`equipment-proficiencies-units: '${LOCK_ITEM_PK}' has no parseable ` +
				"`DC N Ability (Skill)` lock-picking check.",
		);
	}
	const [, dcCell, abilityName, skillName] = match;
	if (dcCell === undefined || abilityName === undefined || skillName === undefined) {
		throw new Error("equipment-proficiencies-units: incomplete lock-picking check match.");
	}
	const abilityCode = abilityCodeByDisplayName(abilityName);
	const skillSlug = slugifyRuleName(skillName);
	if (!buildSkillUnits().some((skill) => skill.slug === skillSlug)) {
		throw new Error(`equipment-proficiencies-units: Lock references unknown skill '${skillName}'.`);
	}
	return {
		sourcePk: lock.pk,
		dc: Number.parseInt(dcCell, 10),
		abilityCode,
		skillCapabilityId: `srd/skill/${skillSlug}`,
		targetNicheTag: LOCK_TARGET_NICHE_TAG,
	};
}

export interface ToolCheckOptions {
	scoreExpr: string;
	toolCapabilityId: string;
	relevantSkillCapabilityId: string;
	proficiencyLevelExpr: string;
	dc: number;
}

/**
 * Compose one tool check: the tool OR the relevant skill gates one shared
 * Proficiency Bonus term. It deliberately leaves Advantage out: the current
 * condition/modifier surface cannot scope that benefit to exactly this check.
 */
export function toolCheckExpr(options: ToolCheckOptions): string {
	const proficiencyGate =
		`actor.has_capability('${options.toolCapabilityId}') || ` +
		`actor.has_capability('${options.relevantSkillCapabilityId}')`;
	const proficiencyBonusTerm = `cond(${proficiencyGate}, macro('srd/proficiency_bonus', ${options.proficiencyLevelExpr}), 0)`;
	const d20Options: D20TestOptions = {
		scoreExpr: options.scoreExpr,
		proficiencyLevelExpr: options.proficiencyLevelExpr,
		proficiencyBonusTerm,
		dc: options.dc,
	};
	return d20TestExpr(d20Options);
}
