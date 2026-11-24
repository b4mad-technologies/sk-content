// DOC-IMPL: scenario-blueprints#blueprints-derive-universal-behavior-from-identity
// DOC-IMPL: character-creation#confirm-time-authored-acts
// DOC-IMPL: derived-values#what-feeds-it-pc-level-vs-monster-cr
/**
 * Placeable Standard-Array class bodies (`base/character-creation/pregen/`).
 *
 * `srd/class/fighter` is the class RULE (hit die, hp_per_level). This file
 * authors a separate BODY you can stand in a loft: Standard Array by Class,
 * level-1 HP/AC/PB, creature + player-character identity. Species and
 * background stay instance tags on the placed person — they are not baked
 * into a combinatorial pregen catalog.
 *
 * Confirm-time sheet copy (`pregenConfirmInstanceStates`) is **class-agnostic**:
 * PB from the level→PB table, fixed HP/level from the class table, baseline AC
 * from drafted DEX, walk speed from the chosen species, and L1 feature /
 * spell-slot resources discovered from advancement + spell_slot_grant metadata
 * (never a fighter-only branch).
 */

import { spellSlotGrantsForClassLevel } from "@spellkave/adventure-runtime/dm/data";
import type { AuthorTarget } from "@spellkave/tool-authoring";

import { fixedHitPointsPerLevelForClass } from "../../markdown/character-creation";
import type { ChapterUnitSummary } from "../chapter-types";
import { buildSpeciesUnits } from "../character-origins/species-units";
import { CASTER_PROFILES, slotGrantsForProfile } from "../classes/spellcasting-substrate-units";
import { AC_RESOURCE_ID } from "../playing-the-game/armor-class-units";
import { BUNDLE_ID } from "../playing-the-game/constants";
import { CREATURE_NICHE_TAG, PLAYER_CHARACTER_TAG } from "../playing-the-game/creature-type-units";
import { SPEED_WALK_RESOURCE_ID } from "../playing-the-game/fragments/grid";
import { SPEED_WALK_INITIAL } from "../playing-the-game/grid-units";
import { HP_ID } from "../playing-the-game/hp-units";
import { LEVEL_ID } from "../playing-the-game/level-units";
import {
	expectedAbilityModifier,
	expectedProficiencyBonus,
	PROFICIENCY_BONUS_STATE_ID,
} from "../playing-the-game/modifier-units";
import { REACH_RESOURCE_ID, STANDARD_REACH_MM } from "../playing-the-game/reach-units";
import { VOCAL_COMMUNICATION_TAG } from "../playing-the-game/vocal-communication-identity-units";
import { driveUnitScene, type VerbCall } from "../verb-runner";
import { HP_PER_LEVEL_ID, XP_ID } from "./advancement-units";
import { standardArrayForClass } from "./creation-tables-units";

export const PREGEN_FIGHTER_LOCAL_ID = "pregen/fighter";
export const PREGEN_FIGHTER_DEF_ID = `${BUNDLE_ID}/${PREGEN_FIGHTER_LOCAL_ID}`;

export const PREGEN_FIGHTER_LEVEL = 1;
export const PREGEN_FIGHTER_XP = 0;
export const PREGEN_FIGHTER_PROFICIENCY_BONUS = expectedProficiencyBonus(PREGEN_FIGHTER_LEVEL);
export const PREGEN_FIGHTER_ARRAY = standardArrayForClass("Fighter");
export const PREGEN_FIGHTER_STR = PREGEN_FIGHTER_ARRAY.str;
export const PREGEN_FIGHTER_DEX = PREGEN_FIGHTER_ARRAY.dex;
export const PREGEN_FIGHTER_CON = PREGEN_FIGHTER_ARRAY.con;
export const PREGEN_FIGHTER_INT = PREGEN_FIGHTER_ARRAY.int;
export const PREGEN_FIGHTER_WIS = PREGEN_FIGHTER_ARRAY.wis;
export const PREGEN_FIGHTER_CHA = PREGEN_FIGHTER_ARRAY.cha;
/** Fighter L1: max hit die (10) + Con mod. */
export const PREGEN_FIGHTER_HP = 10 + expectedAbilityModifier(PREGEN_FIGHTER_CON);
export const PREGEN_FIGHTER_HP_PER_LEVEL = fixedHitPointsPerLevelForClass("Fighter");
export const PREGEN_FIGHTER_AC = 10 + expectedAbilityModifier(PREGEN_FIGHTER_DEX);
export const PREGEN_FIGHTER_SPEED_WALK = SPEED_WALK_INITIAL;
/** @deprecated Sample Fighter skill only — confirm no longer falls back to this. */
export const PREGEN_FIGHTER_PERCEPTION_CAPABILITY_ID = `${BUNDLE_ID}/skill/perception`;

const STANDARD_ARRAY_ANCHOR = "character-creation.md:355-479 (§ Standard Array by Class)";
const FIXED_HP_ANCHOR = "character-creation.md:779-804 (§ Fixed Hit Points by Class)";
const CONFIRM_LEVEL = 1;
const ADVANCEMENT_GRANT_NAMESPACE = "srd.advancement_grant";
const STAT_RESOURCE_RE = /(?:actor|target)\.stat\('([^']+)'\)/g;

function fighterPregenCall(): VerbCall {
	return {
		toolName: "spellkave_define_entity_type",
		label: "define-pregen-fighter",
		params: {
			bundle: BUNDLE_ID,
			id: PREGEN_FIGHTER_LOCAL_ID,
			display_name: "Fighter (Standard Array)",
			description:
				"A ready-to-play fighter whose training is already in place, waiting only for a name and a first fight.",
			tags: [CREATURE_NICHE_TAG, PLAYER_CHARACTER_TAG, VOCAL_COMMUNICATION_TAG],
			initial_states: [
				{ state: REACH_RESOURCE_ID, value_int: STANDARD_REACH_MM },
				{ state: `${BUNDLE_ID}/str`, value_int: PREGEN_FIGHTER_STR },
				{ state: `${BUNDLE_ID}/dex`, value_int: PREGEN_FIGHTER_DEX },
				{ state: `${BUNDLE_ID}/con`, value_int: PREGEN_FIGHTER_CON },
				{ state: `${BUNDLE_ID}/int`, value_int: PREGEN_FIGHTER_INT },
				{ state: `${BUNDLE_ID}/wis`, value_int: PREGEN_FIGHTER_WIS },
				{ state: `${BUNDLE_ID}/cha`, value_int: PREGEN_FIGHTER_CHA },
				{ state: `${BUNDLE_ID}/${LEVEL_ID}`, value_int: PREGEN_FIGHTER_LEVEL },
				{ state: PROFICIENCY_BONUS_STATE_ID, value_int: PREGEN_FIGHTER_PROFICIENCY_BONUS },
				{ state: `${BUNDLE_ID}/${XP_ID}`, value_int: PREGEN_FIGHTER_XP },
				{ state: `${BUNDLE_ID}/${HP_ID}`, value_int: PREGEN_FIGHTER_HP },
				{ state: `${BUNDLE_ID}/${HP_PER_LEVEL_ID}`, value_int: PREGEN_FIGHTER_HP_PER_LEVEL },
				{ state: AC_RESOURCE_ID, value_int: PREGEN_FIGHTER_AC },
				{ state: SPEED_WALK_RESOURCE_ID, value_int: PREGEN_FIGHTER_SPEED_WALK },
			],
			// Perception is this sample Fighter's authored skill choice.
			// Soldier Athletics is an instance grant on the placed person.
			initial_capabilities: [{ capability: PREGEN_FIGHTER_PERCEPTION_CAPABILITY_ID }],
		},
	};
}

export interface PregenConfirmStateRow {
	state: string;
	value_int: number;
}

/** Optional confirm context — species speed, kit letter (armor AC later), and
 * an AuthorTarget for L1 grant / spell-slot resource discovery. */
export interface PregenConfirmOptions {
	speciesSlug?: string | null;
	/** Starting-kit letter. Physical kit is still the adventure pack; when a
	 * kit implies worn armor, AC will follow equipment-ac-target-fact. */
	kitOption?: string | null;
	target?: AuthorTarget;
	/** Character level for PB / resource seeds (confirm is always 1). */
	level?: number;
}

function classDisplayName(classSlug: string): string {
	if (classSlug.length === 0) return classSlug;
	return classSlug.charAt(0).toUpperCase() + classSlug.slice(1);
}

function asString(value: unknown): string | undefined {
	return typeof value === "string" ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
	return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function parsePayload(payloadJson: unknown): Record<string, unknown> | undefined {
	const raw = asString(payloadJson);
	if (raw === undefined) return undefined;
	try {
		const parsed: unknown = JSON.parse(raw);
		return typeof parsed === "object" && parsed !== null
			? (parsed as Record<string, unknown>)
			: undefined;
	} catch {
		return undefined;
	}
}

/** Species walk speed in grid cells (`srd/speed-walk` convention). Defaults to
 * the common 30 ft / 6 cell baseline when the slug is missing or unknown. */
export function speedWalkCellsForSpecies(speciesSlug?: string | null): number {
	if (speciesSlug === undefined || speciesSlug === null || speciesSlug === "") {
		return SPEED_WALK_INITIAL;
	}
	const unit = buildSpeciesUnits().find((candidate) => candidate.slug === speciesSlug);
	return unit?.speedCells ?? SPEED_WALK_INITIAL;
}

/**
 * Baseline unarmored AC (10 + DEX mod). Kit-implied armor is a follow-up once
 * class starting-item graphs land; today the adventure pack is always the
 * longsword + field kit, so confirm keeps the unarmored baseline for every class.
 */
export function baselineAcFromDex(dexScore: number): number {
	return 10 + expectedAbilityModifier(dexScore);
}

/** Seed value for one resource_definitions row at a character level. */
function resourceSeedValue(def: Record<string, unknown>, level: number): number | null {
	const initial = asNumber(def.initial_value) ?? 0;
	const description = asString(def.description) ?? "";
	// Lay On Hands / Font of Magic: definition initial is 0; prose names the seed.
	if (/seed\s*5\s*[×x*]\s*level/i.test(description) || /5\s*[×x]\s*level/i.test(description)) {
		if (initial === 0) return 5 * level;
	}
	if (/seed\s*=\s*level/i.test(description)) {
		return level;
	}
	// L2 Action Surge etc. keep initial 0 until charged — do not seed a dormant 0.
	if (initial <= 0) return null;
	return initial;
}

function featureSlugFromGrant(grantRef: string, classSlug: string): string | null {
	const prefix = `${BUNDLE_ID}/class-feature/${classSlug}/`;
	if (!grantRef.startsWith(prefix)) return null;
	return grantRef.slice(prefix.length);
}

function resourceMatchesFeature(resourceLocalId: string, featureSlug: string): boolean {
	if (resourceLocalId.includes(featureSlug)) return true;
	// monks-focus ↔ focus-points; second-wind ↔ second-wind-uses
	const featureCore = featureSlug.replace(/^monks-/, "").replace(/s$/, "");
	const resourceCore = resourceLocalId
		.replace(/-uses$/, "")
		.replace(/-dice$/, "")
		.replace(/-die-sides$/, "")
		.replace(/-points$/, "");
	return (
		resourceCore === featureSlug ||
		resourceCore === featureCore ||
		featureSlug.includes(resourceCore) ||
		resourceLocalId.includes(featureCore)
	);
}

function collectResourcesFromActions(
	target: AuthorTarget,
	grantIds: ReadonlySet<string>,
): Set<string> {
	const out = new Set<string>();
	const actionIds = new Set<string>();
	for (const row of target.lookup("action_definitions", { bundle: BUNDLE_ID })) {
		const req = asString(row.required_capability);
		if (req === undefined || !grantIds.has(req)) continue;
		const actionId = asString(row.action_id);
		if (actionId !== undefined) actionIds.add(actionId);
	}
	if (actionIds.size === 0) return out;

	const harvest = (text: string | undefined): void => {
		if (text === undefined) return;
		STAT_RESOURCE_RE.lastIndex = 0;
		let match: RegExpExecArray | null = STAT_RESOURCE_RE.exec(text);
		while (match !== null) {
			out.add(match[1]!);
			match = STAT_RESOURCE_RE.exec(text);
		}
	};

	for (const row of target.lookup("affordance_templates", { bundle: BUNDLE_ID })) {
		const cap = asString(row.capability_id);
		const templateId = asString(row.template_id) ?? "";
		const linked =
			(cap !== undefined && grantIds.has(cap)) ||
			[...actionIds].some((id) => templateId.startsWith(`${id}/`) || templateId.includes(id));
		if (!linked) continue;
		harvest(asString(row.predicate_source));
	}

	for (const row of target.lookup("consequence_frame_writes", { bundle: BUNDLE_ID })) {
		const templateId = asString(row.template_id) ?? "";
		if (![...actionIds].some((id) => templateId.startsWith(id))) continue;
		const resource = asString(row.resource);
		if (resource !== undefined) out.add(resource);
		harvest(asString(row.delta_source));
	}

	return out;
}

function advancementGrantRefs(target: AuthorTarget, classSlug: string, level: number): string[] {
	const out: string[] = [];
	for (const row of target.lookup("metadata_attachments", { bundle: BUNDLE_ID })) {
		if (asString(row.namespace) !== ADVANCEMENT_GRANT_NAMESPACE) continue;
		const payload = parsePayload(row.payload_json);
		if (payload === undefined) continue;
		if (payload.class !== classSlug || payload.level !== level) continue;
		const ref = asString(row.target_ref);
		if (ref !== undefined) out.push(ref);
	}
	return out;
}

function spellSlotSeedsFromTarget(
	target: AuthorTarget,
	classSlug: string,
	level: number,
): PregenConfirmStateRow[] {
	return spellSlotGrantsForClassLevel(target, classSlug, level).map((grant) => ({
		state: grant.resourceId,
		value_int: grant.count,
	}));
}

/** Pure fallback when no AuthorTarget is available (unit tests): caster profile tables. */
function spellSlotSeedsFromProfiles(classSlug: string, level: number): PregenConfirmStateRow[] {
	const profile = CASTER_PROFILES.find((row) => row.classSlug === classSlug);
	if (profile === undefined) return [];
	return slotGrantsForProfile(profile)
		.filter((grant) => grant.level === level)
		.map((grant) => ({
			state: `${BUNDLE_ID}/spell_slot_${grant.slotLevel}`,
			value_int: grant.count,
		}));
}

/**
 * L1 (or `level`) class feature + spell-slot resource seeds discovered from
 * grant metadata and resource_definitions — one generic loop, no class branches.
 */
export function classLevelResourceSeeds(
	classSlug: string,
	options: Pick<PregenConfirmOptions, "target" | "level"> = {},
): PregenConfirmStateRow[] {
	const level = options.level ?? CONFIRM_LEVEL;
	const target = options.target;
	const byState = new Map<string, number>();

	const slotRows =
		target === undefined
			? spellSlotSeedsFromProfiles(classSlug, level)
			: spellSlotSeedsFromTarget(target, classSlug, level);
	// Live AuthorTargets sometimes omit srd.spell_slot_grant rows even when the
	// fixtures carry them — fall back to the pure profile table so casters still
	// receive L1 slots at confirm.
	const resolvedSlots =
		slotRows.length > 0 ? slotRows : spellSlotSeedsFromProfiles(classSlug, level);
	for (const row of resolvedSlots) {
		byState.set(row.state, row.value_int);
	}
	if (target === undefined) {
		return [...byState.entries()].map(([state, value_int]) => ({ state, value_int }));
	}

	const grants = advancementGrantRefs(target, classSlug, level);
	const grantSet = new Set(grants);
	const resourceDefs = target.lookup("resource_definitions", { bundle: BUNDLE_ID });
	const defById = new Map<string, Record<string, unknown>>();
	for (const row of resourceDefs) {
		const id = asString(row.resource_definition_id);
		if (id !== undefined) defById.set(id, row);
	}

	const classPrefix = `${BUNDLE_ID}/${classSlug}/`;
	const candidateIds = new Set<string>();

	// Grant slug ↔ resource local id (second-wind → second-wind-uses, …).
	for (const grant of grants) {
		const featureSlug = featureSlugFromGrant(grant, classSlug);
		if (featureSlug === null) continue;
		for (const id of defById.keys()) {
			if (!id.startsWith(classPrefix)) continue;
			const local = id.slice(classPrefix.length);
			if (resourceMatchesFeature(local, featureSlug)) candidateIds.add(id);
		}
	}

	// Actions gated on L1 grants also name their spend pools.
	for (const id of collectResourcesFromActions(target, grantSet)) {
		candidateIds.add(id);
	}

	for (const id of candidateIds) {
		const def = defById.get(id);
		if (def === undefined) continue;
		const seed = resourceSeedValue(def, level);
		if (seed === null) continue;
		byState.set(id, seed);
	}

	return [...byState.entries()]
		.map(([state, value_int]) => ({ state, value_int }))
		.sort((a, b) => a.state.localeCompare(b.state));
}

/**
 * Confirm copies these onto the candidate instance. Scores/HP stay drafted
 * separately; this is PB, XP, hp/level, AC, speed, and every L1 class resource
 * the grants / spell_slot_grant rows name.
 */
export function pregenConfirmInstanceStates(
	classSlug: string,
	scores: { dex: number },
	options: PregenConfirmOptions = {},
): readonly PregenConfirmStateRow[] {
	const level = options.level ?? CONFIRM_LEVEL;
	void options.kitOption; // reserved: kit-implied armor AC (equipment-ac-target-fact)

	const universal: PregenConfirmStateRow[] = [
		{ state: PROFICIENCY_BONUS_STATE_ID, value_int: expectedProficiencyBonus(level) },
		{ state: `${BUNDLE_ID}/${XP_ID}`, value_int: 0 },
		{
			state: `${BUNDLE_ID}/${HP_PER_LEVEL_ID}`,
			value_int: fixedHitPointsPerLevelForClass(classDisplayName(classSlug)),
		},
		{ state: AC_RESOURCE_ID, value_int: baselineAcFromDex(scores.dex) },
		{
			state: SPEED_WALK_RESOURCE_ID,
			value_int: speedWalkCellsForSpecies(options.speciesSlug),
		},
	];

	const resources = classLevelResourceSeeds(classSlug, {
		target: options.target,
		level,
	});

	// Stable order: universal sheet facts first (fighter pin), then resources.
	return [...universal, ...resources];
}

/**
 * @deprecated Confirm grants drafted skills + background + L1 choices directly.
 * Kept as an empty list so older call sites fail closed instead of throwing.
 */
export function pregenConfirmInstanceCapabilities(_classSlug: string): readonly string[] {
	return [];
}

export async function buildPregenFragment(target?: AuthorTarget): Promise<{
	toml: string;
	units: ChapterUnitSummary[];
}> {
	const body = await driveUnitScene(BUNDLE_ID, [fighterPregenCall()], target);
	const header = [
		"# GENERATED by src/chapters/character-creation/pregen-units.ts — DO NOT EDIT BY HAND.",
		"# Regenerate: pnpm --filter @spellkave/srd-cc run generate",
		"#",
		"# Placeable Standard-Array Fighter body (srd/pregen/fighter).",
		"# Distinct from srd/class/fighter (the class RULE). Species/background",
		"# are instance tags on the placed person.",
		`# Source: ${STANDARD_ARRAY_ANCHOR}; ${FIXED_HP_ANCHOR}.`,
		"",
		"",
	].join("\n");
	return {
		toml: header + body,
		units: [
			{
				kind: "entity_definitions",
				id: PREGEN_FIGHTER_DEF_ID,
				sourcePk: STANDARD_ARRAY_ANCHOR,
			},
		],
	};
}
