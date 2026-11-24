// pattern: identity-tag-capability-grant
// Classes chapter — spellcasting substrate through character level 4
// (lane L1 / sk-609b.1). OWN generator unit deliberately separate from
// `advancement-metadata-units.ts` so the L2 level-ceiling lane never collides
// with slot/profile rows here.
//
// Design: `bead sk-609b.1 (design trail)` +
// `docs/spellcasting-substrate.md`. Every numeric cell is read from
// `ClassFeatureItem.json`; abilities and feature anchors from
// `cache/markdown/classes.md` (file:line in CASTER_PROFILES).
//
// Ships into `base/classes/spellcasting-substrate.toml`:
//   - metadata_namespaces: srd.spell_slot_grant, srd.spellcasting_profile
//   - metadata_attachments: absolute slot counts L1-4 + one profile per caster
//   - tag_capability_grant: srd.class.<caster> -> srd/action/magic

import type { SetMetadataUpdate } from "@spellkave/tool-authoring";
import { readClassFeatureItems, readClassFeaturesByParentPk } from "../../open5e/class-feature";
import type { ChapterUnitSummary } from "../chapter-types";
import { driveUnitScene, metadataCall, type VerbCall } from "../verb-runner";
import { buildClassUnits } from "./classes-units";

export const BUNDLE_ID = "srd";

/** Character levels this substrate authors (brief: through level 4). */
export const SPELLCASTING_LEVEL_CEILING = 4;

export const SPELL_SLOT_GRANT_NAMESPACE = "srd.spell_slot_grant";
export const SPELLCASTING_PROFILE_NAMESPACE = "srd.spellcasting_profile";

const CAST_ACTION_CAPABILITY_ID = `${BUNDLE_ID}/action/magic`;

const SPELL_SLOT_GRANT_DESCRIPTION =
	"class,level -> absolute unexpended-slot count for one srd/spell_slot_N resource. " +
	"target_kind = resource_definition, target_ref = srd/spell_slot_1|2, payload_json = " +
	'{"class","level","count","kind":"spell_slot"|"pact_magic","recovery"}. Absolute re-grant ' +
	"(not a delta). ADR-0073 D-1: inert until a DM/creation writer seeds the actor. " +
	"docs/spellcasting-substrate.md.";

const SPELLCASTING_PROFILE_DESCRIPTION =
	"class -> spellcasting ability, cantrips-known-by-level, prepared-spells-by-level, ritual flag. " +
	"target_kind = entity_definition, target_ref = srd/class-feature/<class>/spellcasting|pact-magic. " +
	"docs/spellcasting-substrate.md.";

export type SpellcastingAbility = "int" | "wis" | "cha";
export type SpellSlotKind = "spell_slot" | "pact_magic";
export type SpellSlotRecovery = "long_rest" | "short_or_long_rest";

export interface CasterProfile {
	classSlug: string;
	/** Markdown display name (matches CharacterClass / classes.md headings). */
	classDisplayName: string;
	ability: SpellcastingAbility;
	/** classes.md line of the Spellcasting Ability sentence. */
	abilityAnchor: string;
	/** Feature entity local path after class-feature/<class>/. */
	featureSlug: "spellcasting" | "pact-magic";
	featureAnchor: string;
	/** Wizard Ritual Adept only this slice (classes.md:10237). */
	ritualCasting: boolean;
	/** open5e parent pk, e.g. srd-2024_wizard. */
	classSourcePk: string;
}

/**
 * The eight caster classes. Ability + feature anchors pinned to
 * cache/markdown/classes.md (binding "rules are cited" invariant).
 */
export const CASTER_PROFILES: readonly CasterProfile[] = [
	{
		classSlug: "bard",
		classDisplayName: "Bard",
		ability: "cha",
		abilityAnchor: "classes.md:884",
		featureSlug: "spellcasting",
		featureAnchor: "classes.md:864",
		ritualCasting: false,
		classSourcePk: "srd-2024_bard",
	},
	{
		classSlug: "cleric",
		classDisplayName: "Cleric",
		ability: "wis",
		abilityAnchor: "classes.md:2201",
		featureSlug: "spellcasting",
		featureAnchor: "classes.md:2181",
		ritualCasting: false,
		classSourcePk: "srd-2024_cleric",
	},
	{
		classSlug: "druid",
		classDisplayName: "Druid",
		ability: "wis",
		abilityAnchor: "classes.md:3511",
		featureSlug: "spellcasting",
		featureAnchor: "classes.md:3491",
		ritualCasting: false,
		classSourcePk: "srd-2024_druid",
	},
	{
		classSlug: "paladin",
		classDisplayName: "Paladin",
		ability: "cha",
		abilityAnchor: "classes.md:5641",
		featureSlug: "spellcasting",
		featureAnchor: "classes.md:5627",
		ritualCasting: false,
		classSourcePk: "srd-2024_paladin",
	},
	{
		classSlug: "ranger",
		classDisplayName: "Ranger",
		ability: "wis",
		abilityAnchor: "classes.md:6410",
		featureSlug: "spellcasting",
		featureAnchor: "classes.md:6396",
		ritualCasting: false,
		classSourcePk: "srd-2024_ranger",
	},
	{
		classSlug: "sorcerer",
		classDisplayName: "Sorcerer",
		ability: "cha",
		abilityAnchor: "classes.md:7623",
		featureSlug: "spellcasting",
		featureAnchor: "classes.md:7605",
		ritualCasting: false,
		classSourcePk: "srd-2024_sorcerer",
	},
	{
		classSlug: "warlock",
		classDisplayName: "Warlock",
		ability: "cha",
		abilityAnchor: "classes.md:8994",
		featureSlug: "pact-magic",
		featureAnchor: "classes.md:8974",
		ritualCasting: false,
		classSourcePk: "srd-2024_warlock",
	},
	{
		classSlug: "wizard",
		classDisplayName: "Wizard",
		ability: "int",
		abilityAnchor: "classes.md:10233",
		featureSlug: "spellcasting",
		featureAnchor: "classes.md:10209",
		// Ritual Adept is a separate L1 feature (classes.md:10237-10239).
		ritualCasting: true,
		classSourcePk: "srd-2024_wizard",
	},
] as const;

export function spellcastingFeatureEntityId(profile: CasterProfile): string {
	return `${BUNDLE_ID}/class-feature/${profile.classSlug}/${profile.featureSlug}`;
}

export function spellSlotResourceId(slotLevel: 1 | 2): string {
	return `${BUNDLE_ID}/spell_slot_${slotLevel}`;
}

/** Parse a Features-table cell into a positive int, or undefined for em-dash / empty. */
export function parseTableCount(raw: string | null | undefined): number | undefined {
	if (raw === null || raw === undefined) return undefined;
	const trimmed = raw.trim();
	if (trimmed.length === 0 || trimmed === "—" || trimmed === "-" || trimmed === "–") {
		return undefined;
	}
	// Warlock Slot Level column uses "1st"/"2nd".
	const ordinal = /^(1|2|3|4|5)(?:st|nd|rd|th)$/i.exec(trimmed);
	if (ordinal?.[1] !== undefined) return Number(ordinal[1]);
	const n = Number(trimmed);
	if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
		throw new Error(`spellcasting-substrate: unparseable table cell '${raw}'.`);
	}
	if (n === 0) return undefined;
	return n;
}

function columnByLevel(featurePk: string): Map<number, string | null> {
	const map = new Map<number, string | null>();
	for (const item of readClassFeatureItems(featurePk)) {
		// Prefer the first row at a level (Weapon Mastery quirk elsewhere; slots are unique).
		if (!map.has(item.level)) map.set(item.level, item.columnValue);
	}
	return map;
}

function featurePkForSlug(classSourcePk: string, featureSlug: string): string {
	return `${classSourcePk}_${featureSlug}`;
}

function assertFeatureExists(classSourcePk: string, featureSlug: string): string {
	const pk = featurePkForSlug(classSourcePk, featureSlug);
	const found = readClassFeaturesByParentPk(classSourcePk).some((row) => row.pk === pk);
	if (!found) {
		throw new Error(
			`spellcasting-substrate: missing ClassFeature.json row '${pk}' under parent '${classSourcePk}'.`,
		);
	}
	return pk;
}

export interface LevelCountMap {
	readonly [level: number]: number | undefined;
}

function countsThroughCeiling(featurePk: string): LevelCountMap {
	const byLevel = columnByLevel(featurePk);
	const out: Record<number, number | undefined> = {};
	for (let level = 1; level <= SPELLCASTING_LEVEL_CEILING; level += 1) {
		out[level] = parseTableCount(byLevel.get(level) ?? null);
	}
	return out;
}

export interface SlotGrantRow {
	classSlug: string;
	level: number;
	slotLevel: 1 | 2;
	count: number;
	kind: SpellSlotKind;
	recovery: SpellSlotRecovery;
	/** ClassFeatureItem parent pk that supplied the count. */
	sourcePk: string;
}

/**
 * Absolute spell-slot grants for one caster at levels 1..4. Full casters read
 * SPELL_SLOTS columns; Warlock reads Spell-Slots + Slot-Level CLASS_TABLE_DATA.
 */
export function slotGrantsForProfile(profile: CasterProfile): SlotGrantRow[] {
	const grants: SlotGrantRow[] = [];
	if (profile.classSlug === "warlock") {
		const slotsPk = assertFeatureExists(profile.classSourcePk, "spell-slots");
		const levelPk = assertFeatureExists(profile.classSourcePk, "slot-level");
		const slotCounts = countsThroughCeiling(slotsPk);
		const slotLevels = countsThroughCeiling(levelPk);
		for (let level = 1; level <= SPELLCASTING_LEVEL_CEILING; level += 1) {
			const count = slotCounts[level];
			const slotLevelRaw = slotLevels[level];
			if (count === undefined || slotLevelRaw === undefined) continue;
			if (slotLevelRaw !== 1 && slotLevelRaw !== 2) {
				throw new Error(
					`spellcasting-substrate: warlock slot level ${slotLevelRaw} at character level ${level} ` +
						"is outside this lane's srd/spell_slot_1..2 surface.",
				);
			}
			grants.push({
				classSlug: profile.classSlug,
				level,
				slotLevel: slotLevelRaw,
				count,
				kind: "pact_magic",
				recovery: "short_or_long_rest",
				sourcePk: slotsPk,
			});
		}
		return grants;
	}

	for (const slotLevel of [1, 2] as const) {
		const ordinal = slotLevel === 1 ? "1st" : "2nd";
		const featureSlug = `slots-${ordinal}`;
		// Half-casters still have empty higher-slot feature rows in ClassFeature.json.
		const pk = featurePkForSlug(profile.classSourcePk, featureSlug);
		const exists = readClassFeaturesByParentPk(profile.classSourcePk).some((row) => row.pk === pk);
		if (!exists) continue;
		const counts = countsThroughCeiling(pk);
		for (let level = 1; level <= SPELLCASTING_LEVEL_CEILING; level += 1) {
			const count = counts[level];
			if (count === undefined) continue;
			grants.push({
				classSlug: profile.classSlug,
				level,
				slotLevel,
				count,
				kind: "spell_slot",
				recovery: "long_rest",
				sourcePk: pk,
			});
		}
	}
	return grants;
}

export function allSlotGrants(): SlotGrantRow[] {
	const rows = CASTER_PROFILES.flatMap((profile) => slotGrantsForProfile(profile));
	return [...rows].sort((a, b) => {
		if (a.classSlug !== b.classSlug) return a.classSlug.localeCompare(b.classSlug);
		if (a.level !== b.level) return a.level - b.level;
		return a.slotLevel - b.slotLevel;
	});
}

export interface SpellcastingProfilePayload {
	class: string;
	ability: SpellcastingAbility;
	feature: "spellcasting" | "pact_magic";
	ritual_casting: boolean;
	/** Omitted entirely when the class has no cantrips column (Paladin/Ranger). */
	cantrips_known_by_level?: Record<string, number>;
	prepared_spells_by_level: Record<string, number>;
}

function compactLevelMap(map: LevelCountMap): Record<string, number> | undefined {
	const out: Record<string, number> = {};
	for (let level = 1; level <= SPELLCASTING_LEVEL_CEILING; level += 1) {
		const value = map[level];
		if (value !== undefined) out[String(level)] = value;
	}
	return Object.keys(out).length > 0 ? out : undefined;
}

export function profilePayload(profile: CasterProfile): SpellcastingProfilePayload {
	const preparedPk = assertFeatureExists(profile.classSourcePk, "prepared-spells");
	const prepared = compactLevelMap(countsThroughCeiling(preparedPk));
	if (prepared === undefined) {
		throw new Error(
			`spellcasting-substrate: class '${profile.classSlug}' has no prepared-spells column values L1-4.`,
		);
	}
	const payload: SpellcastingProfilePayload = {
		class: profile.classSlug,
		ability: profile.ability,
		feature: profile.featureSlug === "pact-magic" ? "pact_magic" : "spellcasting",
		ritual_casting: profile.ritualCasting,
		prepared_spells_by_level: prepared,
	};
	// Paladin/Ranger have no base cantrips column (Blessed/Druidic Warrior is separate).
	const cantripsPk = featurePkForSlug(profile.classSourcePk, "cantrips");
	const hasCantrips = readClassFeaturesByParentPk(profile.classSourcePk).some(
		(row) => row.pk === cantripsPk,
	);
	if (hasCantrips) {
		const cantrips = compactLevelMap(countsThroughCeiling(cantripsPk));
		if (cantrips !== undefined) payload.cantrips_known_by_level = cantrips;
	}
	return payload;
}

function slotGrantUpdates(rows: readonly SlotGrantRow[]): SetMetadataUpdate[] {
	const byResource = new Map<string, Array<Record<string, unknown>>>();
	for (const row of rows) {
		const resourceId = spellSlotResourceId(row.slotLevel);
		const grants = byResource.get(resourceId) ?? [];
		grants.push({
			class: row.classSlug,
			level: row.level,
			count: row.count,
			kind: row.kind,
			recovery: row.recovery,
		});
		byResource.set(resourceId, grants);
	}
	return [...byResource.entries()].map(([targetRef, grants]) => ({
		target: { kind: "resource_definition", ref: targetRef },
		key: SPELL_SLOT_GRANT_NAMESPACE,
		value: { grants },
	}));
}

function profileUpdate(profile: CasterProfile): SetMetadataUpdate {
	return {
		target: { kind: "entity_definition", ref: spellcastingFeatureEntityId(profile) },
		key: SPELLCASTING_PROFILE_NAMESPACE,
		value: { ...profilePayload(profile) },
	};
}

function magicGrantRow(profile: CasterProfile): Record<string, unknown> {
	return {
		tag: `srd.class.${profile.classSlug}`,
		capability_id: CAST_ACTION_CAPABILITY_ID,
		bundle_id: BUNDLE_ID,
	};
}

/** Exact rows rendered into the substrate fragment — also used by offline tests. */
export function spellcastingSubstrateAuthoringInputs(): {
	metadataUpdates: SetMetadataUpdate[];
	tag_capability_grant: Record<string, unknown>[];
} {
	const slotUpdates = slotGrantUpdates(allSlotGrants());
	const profileUpdates = CASTER_PROFILES.map(profileUpdate);
	return {
		metadataUpdates: [
			{
				target: "namespace",
				key: SPELL_SLOT_GRANT_NAMESPACE,
				value: { audience: "public", description: SPELL_SLOT_GRANT_DESCRIPTION, on_demand: true },
			},
			{
				target: "namespace",
				key: SPELLCASTING_PROFILE_NAMESPACE,
				value: {
					audience: "public",
					description: SPELLCASTING_PROFILE_DESCRIPTION,
					on_demand: true,
				},
			},
			...slotUpdates,
			...profileUpdates,
		],
		tag_capability_grant: CASTER_PROFILES.map(magicGrantRow),
	};
}

/**
 * Sanity: every CASTER_PROFILES slug is a real base class in classes-units,
 * and non-casters are excluded.
 */
export function assertCasterRosterMatchesClasses(): void {
	const classSlugs = new Set(buildClassUnits().map((unit) => unit.slug));
	for (const profile of CASTER_PROFILES) {
		if (!classSlugs.has(profile.classSlug)) {
			throw new Error(
				`spellcasting-substrate: caster '${profile.classSlug}' missing from buildClassUnits().`,
			);
		}
	}
}

export async function buildSpellcastingSubstrateFragment(): Promise<{
	toml: string;
	units: ChapterUnitSummary[];
}> {
	assertCasterRosterMatchesClasses();
	const rows = spellcastingSubstrateAuthoringInputs();
	const slotGrants = allSlotGrants();
	// Seed-then-strip srd/action/magic so MF-VAL-254 accepts the grants in a
	// throwaway workspace (creature-identity.ts's own pattern). The real
	// capability ships from playing-the-game/fragments/actions.ts.
	const calls: VerbCall[] = [
		{
			toolName: "spellkave_define_capability",
			label: "seed-capability:action/magic",
			params: {
				bundle: BUNDLE_ID,
				id: "action/magic",
				actor_kind: "entity",
				display_name: "Cast a Spell (seed-then-strip)",
				description:
					"Throwaway seed for tag_capability_grant validation — never emitted " +
					"(omitRowKinds capability_definitions). Real row: playing-the-game actions.",
			},
		},
		metadataCall("spellcasting-substrate-metadata", BUNDLE_ID, rows.metadataUpdates),
		{
			toolName: "spellkave_write_rows",
			label: "spellcasting-class-magic-grants",
			params: {
				bundle: BUNDLE_ID,
				kind: "tag_capability_grant",
				rows: rows.tag_capability_grant,
			},
		},
	];
	const body = await driveUnitScene(BUNDLE_ID, calls, undefined, {
		omitRowKinds: ["capability_definitions", "capability_definition_tag"],
	});
	const citationLines = [
		...slotGrants.map(
			(g) =>
				`#   ${g.classSlug} L${g.level}: ${g.count} x ${spellSlotResourceId(g.slotLevel)} ` +
				`(${g.kind}, ${g.recovery}) — ${g.sourcePk}`,
		),
		...CASTER_PROFILES.map(
			(p) =>
				`#   profile ${p.classSlug}: ability=${p.ability} feature=${spellcastingFeatureEntityId(p)} ` +
				`— ${p.featureAnchor} / ${p.abilityAnchor}`,
		),
	];
	const header = [
		"# GENERATED by src/chapters/classes/spellcasting-substrate-units.ts — DO NOT EDIT BY HAND.",
		"# Regenerate: pnpm --filter @spellkave/srd-cc run generate",
		"#",
		"# Spellcasting substrate (docs/spellcasting-substrate.md): absolute slot grants L1-4,",
		"# per-class spellcasting profiles, and srd.class.<caster> -> srd/action/magic bridges.",
		"# Citations:",
		...citationLines,
		"",
		"",
	].join("\n");
	return {
		toml: header + body,
		units: [
			{ kind: "metadata_namespaces", id: SPELL_SLOT_GRANT_NAMESPACE, sourcePk: "" },
			{ kind: "metadata_namespaces", id: SPELLCASTING_PROFILE_NAMESPACE, sourcePk: "" },
			...slotGrants.map((g) => ({
				kind: "metadata_attachments",
				id: `${SPELL_SLOT_GRANT_NAMESPACE}:${g.classSlug}:L${g.level}:slot_${g.slotLevel}`,
				sourcePk: g.sourcePk,
			})),
			...CASTER_PROFILES.map((p) => ({
				kind: "metadata_attachments",
				id: `${SPELLCASTING_PROFILE_NAMESPACE}:${spellcastingFeatureEntityId(p)}`,
				sourcePk: p.featureAnchor,
			})),
			...CASTER_PROFILES.map((p) => ({
				kind: "tag_capability_grant",
				id: `srd.class.${p.classSlug}->${CAST_ACTION_CAPABILITY_ID}`,
				sourcePk: p.featureAnchor,
			})),
		],
	};
}
