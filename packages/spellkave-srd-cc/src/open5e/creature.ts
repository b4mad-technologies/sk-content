// Typed readers for the Monsters chapter's five-file open5e join
// (`cache/open5e/{Creature,CreatureAction,CreatureActionAttack,CreatureTrait,
// CreatureTypeDescription}.json`) — the open5e Django-fixture shape, read
// ONLY from the committed cache (never the fork directly; see
// `../sources.ts`'s license boundary). `CreatureTypeDescription.json` is
// ALREADY read by `./creature-type-description.ts` (consumed by
// `../chapters/playing-the-game/creature-type-units.ts`) — this module does
// NOT re-read it; callers reuse that existing reader + its exported tag
// prefixes (design doc, `ledger/designs/monsters-chapter-design.md` §1).
//
// FOUR joins, verified against the live cache (not assumed):
//   - `Creature.json` (331) — primary, pk already kebab-case
//     (`srd-2024_goblin-warrior`).
//   - `CreatureAction.json` (989) — `fields.parent` = Creature pk. Splits
//     807 ACTION / 76 BONUS_ACTION / 24 REACTION / 82 LEGENDARY_ACTION.
//   - `CreatureActionAttack.json` (390) — `fields.parent` = CreatureAction
//     pk. Max 1 attack row per action; the join is 1:0/1:1 (an action with
//     no structured attack row — e.g. every `Multiattack` action, and one
//     known SOURCE-DATA GAP, `srd-2024_giant-rat_bite`, see
//     `../chapters/monsters/starter-behaviors.ts`'s own header — is a
//     legitimate zero, never an error here).
//   - `CreatureTrait.json` (326) — `fields.parent` = Creature pk.
//
// DAMAGE-TYPE FIELD QUIRK (found reading the live cache, not documented
// upstream): `CreatureActionAttack.fields.damage_type` is `null` for the
// vast majority of rows (350 of 390) — the REAL damage type instead lands in
// `fields.extra_damage_type` for those rows (e.g. Aboleth's Tentacle attack:
// `damage_type: null, extra_damage_type: "bludgeoning"`), with
// `extra_damage_die_count`/`extra_damage_bonus` themselves null (no genuine
// second damage component). The 40 rows that DO carry a non-null
// `damage_type` (e.g. Brass Dragon Wyrmling's Rend) carry a null
// `extra_damage_type` instead — the two fields are never both populated in
// the cache as of this sync. This reader stays a faithful pass-through
// (never assumes/normalizes this at read time — a caller-visible, typed
// mirror only); `CreatureActionAttackRecord.damageType`/`extraDamageType`
// are BOTH exposed so a consumer can coalesce (`damageType ?? extraDamageType`)
// explicitly, with its own loud guard if it needs the coalesced value —
// `../chapters/monsters/starter-behaviors.ts` is the first (and, this slice,
// only) consumer.
import { readFileSync } from "node:fs";
import path from "node:path";

import { CACHE_OPEN5E_DIR } from "./paths";

// ─────────────────────────────────────────────────────────────────────────
// Creature.json (331)

interface RawCreatureRow {
	fields: {
		ability_score_charisma: number;
		ability_score_constitution: number;
		ability_score_dexterity: number;
		ability_score_intelligence: number;
		ability_score_strength: number;
		ability_score_wisdom: number;
		alignment: string;
		armor_class: number;
		blindsight_range: number | null;
		challenge_rating: string;
		experience_points_integer: number | null;
		darkvision_range: number | null;
		hit_points: number;
		name: string;
		languages: string[];
		languages_desc: string;
		passive_perception: number;
		size: string;
		tremorsense_range: number | null;
		truesight_range: number | null;
		type: string;
		walk: number | null;
		climb: number | null;
		fly: number | null;
		swim: number | null;
	};
	model: string;
	pk: string;
}

/** One `Creature.json` record, flattened out of open5e's `fields` wrapper. */
export interface CreatureRecord {
	/** open5e pk, e.g. `srd-2024_goblin-warrior` — carried forward as provenance. */
	pk: string;
	name: string;
	/** Parsed language identifiers supplied by open5e; competence data, not by itself proof of speech. */
	languages: string[];
	/** Source-facing Languages line used to distinguish vocal, understands-only, and silent creatures. */
	languagesDescription: string;
	strength: number;
	dexterity: number;
	constitution: number;
	intelligence: number;
	wisdom: number;
	charisma: number;
	/** Free-text SRD alignment, e.g. `"chaotic neutral"` or `"unaligned"` (§ Unaligned Creatures — no tag). */
	alignment: string;
	armorClass: number;
	hitPoints: number;
	/** Raw SRD Challenge Rating string, e.g. `"0.250"`, `"10.000"`, or (2 rows) the un-padded `"0"`. */
	challengeRating: string;
	/**
	 * Authored XP exception from open5e. Null for 330 of 331 rows — those
	 * take the markdown CR→XP table. The one non-null is Octopus = 10
	 * (CR 0's printed "0 or 10" exception, `markdown/monsters.ts`).
	 */
	experiencePointsInteger: number | null;
	/** Lowercase SRD size category (`small`/`medium`/`large`/`huge`/`gargantuan` — no `tiny` row exists in this dataset, cache-verified). */
	size: string;
	/** Lowercase SRD creature type (`beast`/`humanoid`/`undead`/…) — validated against `creature-type-units.ts`'s 14 sourced types by the caller, not here. */
	type: string;
	/** Walking speed in feet, or `null` (no creature in this dataset has a null/zero walk, cache-verified). */
	walk: number | null;
	/** Climbing/flying/swimming speed in feet, or `null` when the stat block has none. */
	climb: number | null;
	fly: number | null;
	swim: number | null;
	darkvisionRange: number | null;
	blindsightRange: number | null;
	tremorsenseRange: number | null;
	truesightRange: number | null;
	passivePerception: number;
}

function assertCreatureShape(row: unknown, index: number): asserts row is RawCreatureRow {
	const candidate = row as Partial<RawCreatureRow> | null;
	const f = candidate?.fields;
	if (
		candidate === null ||
		typeof candidate !== "object" ||
		typeof candidate.pk !== "string" ||
		typeof candidate.model !== "string" ||
		typeof f !== "object" ||
		f === null ||
		typeof f.name !== "string" ||
		!Array.isArray(f.languages) ||
		!f.languages.every((language) => typeof language === "string") ||
		typeof f.languages_desc !== "string" ||
		typeof f.ability_score_strength !== "number" ||
		typeof f.ability_score_dexterity !== "number" ||
		typeof f.ability_score_constitution !== "number" ||
		typeof f.ability_score_intelligence !== "number" ||
		typeof f.ability_score_wisdom !== "number" ||
		typeof f.ability_score_charisma !== "number" ||
		typeof f.alignment !== "string" ||
		typeof f.armor_class !== "number" ||
		typeof f.hit_points !== "number" ||
		typeof f.challenge_rating !== "string" ||
		typeof f.size !== "string" ||
		typeof f.type !== "string" ||
		(f.walk !== null && typeof f.walk !== "number") ||
		(f.climb !== null && typeof f.climb !== "number") ||
		(f.fly !== null && typeof f.fly !== "number") ||
		(f.swim !== null && typeof f.swim !== "number") ||
		typeof f.passive_perception !== "number"
	) {
		throw new Error(
			`creature: malformed record at index ${index} in Creature.json — got ${JSON.stringify(row)}.`,
		);
	}
}

const EXPECTED_CREATURE_TOTAL = 331;

/** Read every `Creature.json` record, sorted by `pk` for deterministic output. */
export function readCreatures(): CreatureRecord[] {
	const filePath = path.join(CACHE_OPEN5E_DIR, "Creature.json");
	const raw = JSON.parse(readFileSync(filePath, "utf8")) as unknown[];
	const records = raw
		.map((row, index) => {
			assertCreatureShape(row, index);
			return {
				pk: row.pk,
				name: row.fields.name,
				languages: row.fields.languages,
				languagesDescription: row.fields.languages_desc,
				strength: row.fields.ability_score_strength,
				dexterity: row.fields.ability_score_dexterity,
				constitution: row.fields.ability_score_constitution,
				intelligence: row.fields.ability_score_intelligence,
				wisdom: row.fields.ability_score_wisdom,
				charisma: row.fields.ability_score_charisma,
				alignment: row.fields.alignment,
				armorClass: row.fields.armor_class,
				hitPoints: row.fields.hit_points,
				challengeRating: row.fields.challenge_rating,
				experiencePointsInteger:
					typeof row.fields.experience_points_integer === "number"
						? row.fields.experience_points_integer
						: null,
				size: row.fields.size,
				type: row.fields.type,
				walk: row.fields.walk,
				climb: row.fields.climb,
				fly: row.fields.fly,
				swim: row.fields.swim,
				darkvisionRange: row.fields.darkvision_range,
				blindsightRange: row.fields.blindsight_range,
				tremorsenseRange: row.fields.tremorsense_range,
				truesightRange: row.fields.truesight_range,
				passivePerception: row.fields.passive_perception,
			};
		})
		.sort((a, b) => a.pk.localeCompare(b.pk));
	if (records.length !== EXPECTED_CREATURE_TOTAL) {
		throw new Error(
			`creature: expected ${EXPECTED_CREATURE_TOTAL} Creature.json records, got ${records.length} — ` +
				"a cache resync changed shape; re-derive the monsters chapter's own count guards.",
		);
	}
	return records;
}

/** Resolve one `Creature.json` record by pk, throwing loudly (never a silent undefined). */
export function creatureByPk(pk: string): CreatureRecord {
	const record = readCreatures().find((creature) => creature.pk === pk);
	if (record === undefined) {
		throw new Error(`creature: no Creature.json record with pk '${pk}' in the cache.`);
	}
	return record;
}

// ─────────────────────────────────────────────────────────────────────────
// CreatureAction.json (989)

export type CreatureActionType = "ACTION" | "BONUS_ACTION" | "REACTION" | "LEGENDARY_ACTION";

interface RawCreatureActionRow {
	fields: {
		action_type: string;
		desc: string;
		name: string;
		parent: string;
	};
	model: string;
	pk: string;
}

/** One `CreatureAction.json` record, flattened out of open5e's `fields` wrapper. */
export interface CreatureActionRecord {
	pk: string;
	name: string;
	desc: string;
	actionType: CreatureActionType;
	/** `Creature.json` pk this action belongs to. */
	parent: string;
}

const CREATURE_ACTION_TYPES: readonly CreatureActionType[] = [
	"ACTION",
	"BONUS_ACTION",
	"REACTION",
	"LEGENDARY_ACTION",
];

function assertCreatureActionShape(
	row: unknown,
	index: number,
): asserts row is RawCreatureActionRow {
	const candidate = row as Partial<RawCreatureActionRow> | null;
	const f = candidate?.fields;
	if (
		candidate === null ||
		typeof candidate !== "object" ||
		typeof candidate.pk !== "string" ||
		typeof candidate.model !== "string" ||
		typeof f !== "object" ||
		f === null ||
		typeof f.action_type !== "string" ||
		!(CREATURE_ACTION_TYPES as readonly string[]).includes(f.action_type) ||
		typeof f.desc !== "string" ||
		typeof f.name !== "string" ||
		typeof f.parent !== "string"
	) {
		throw new Error(
			`creature: malformed record at index ${index} in CreatureAction.json — got ${JSON.stringify(row)}.`,
		);
	}
}

const EXPECTED_CREATURE_ACTION_TOTAL = 989;

/** Read every `CreatureAction.json` record, sorted by `(parent, pk)` for deterministic output. */
export function readCreatureActions(): CreatureActionRecord[] {
	const filePath = path.join(CACHE_OPEN5E_DIR, "CreatureAction.json");
	const raw = JSON.parse(readFileSync(filePath, "utf8")) as unknown[];
	const records = raw
		.map((row, index) => {
			assertCreatureActionShape(row, index);
			return {
				pk: row.pk,
				name: row.fields.name,
				desc: row.fields.desc,
				actionType: row.fields.action_type as CreatureActionType,
				parent: row.fields.parent,
			};
		})
		.sort((a, b) => a.parent.localeCompare(b.parent) || a.pk.localeCompare(b.pk));
	if (records.length !== EXPECTED_CREATURE_ACTION_TOTAL) {
		throw new Error(
			`creature: expected ${EXPECTED_CREATURE_ACTION_TOTAL} CreatureAction.json records, got ` +
				`${records.length} — a cache resync changed shape; re-derive the monsters chapter's own count guards.`,
		);
	}
	return records;
}

/** Every `CreatureAction.json` row belonging to one creature, in file order. */
export function creatureActionsByParent(creaturePk: string): CreatureActionRecord[] {
	return readCreatureActions().filter((action) => action.parent === creaturePk);
}

// ─────────────────────────────────────────────────────────────────────────
// CreatureActionAttack.json (390)

interface RawCreatureActionAttackRow {
	fields: {
		attack_type: string;
		damage_bonus: number | null;
		damage_die_count: number | null;
		damage_die_type: string | null;
		damage_type: string | null;
		extra_damage_bonus: number | null;
		extra_damage_die_count: number | null;
		extra_damage_die_type: string | null;
		extra_damage_type: string | null;
		long_range: number | null;
		name: string;
		parent: string;
		range: number | null;
		reach: number | null;
		to_hit_mod: number | null;
	};
	model: string;
	pk: string;
}

/** One `CreatureActionAttack.json` record, flattened out of open5e's `fields` wrapper. See this module's own header for the `damage_type`/`extra_damage_type` quirk. */
export interface CreatureActionAttackRecord {
	pk: string;
	name: string;
	attackType: string;
	toHitMod: number | null;
	damageDieCount: number | null;
	damageDieType: string | null;
	damageBonus: number | null;
	/** See module header — often `null` even for a real weapon attack; coalesce with `extraDamageType` at the call site. */
	damageType: string | null;
	extraDamageDieCount: number | null;
	extraDamageDieType: string | null;
	extraDamageBonus: number | null;
	extraDamageType: string | null;
	reach: number | null;
	range: number | null;
	longRange: number | null;
	/** `CreatureAction.json` pk this attack row belongs to. */
	parent: string;
}

function assertCreatureActionAttackShape(
	row: unknown,
	index: number,
): asserts row is RawCreatureActionAttackRow {
	const candidate = row as Partial<RawCreatureActionAttackRow> | null;
	const f = candidate?.fields;
	if (
		candidate === null ||
		typeof candidate !== "object" ||
		typeof candidate.pk !== "string" ||
		typeof candidate.model !== "string" ||
		typeof f !== "object" ||
		f === null ||
		typeof f.attack_type !== "string" ||
		typeof f.name !== "string" ||
		typeof f.parent !== "string"
	) {
		throw new Error(
			`creature: malformed record at index ${index} in CreatureActionAttack.json — got ${JSON.stringify(row)}.`,
		);
	}
}

const EXPECTED_CREATURE_ACTION_ATTACK_TOTAL = 390;

/** Read every `CreatureActionAttack.json` record, sorted by `(parent, pk)` for deterministic output. */
export function readCreatureActionAttacks(): CreatureActionAttackRecord[] {
	const filePath = path.join(CACHE_OPEN5E_DIR, "CreatureActionAttack.json");
	const raw = JSON.parse(readFileSync(filePath, "utf8")) as unknown[];
	const records = raw
		.map((row, index) => {
			assertCreatureActionAttackShape(row, index);
			return {
				pk: row.pk,
				name: row.fields.name,
				attackType: row.fields.attack_type,
				toHitMod: row.fields.to_hit_mod,
				damageDieCount: row.fields.damage_die_count,
				damageDieType: row.fields.damage_die_type,
				damageBonus: row.fields.damage_bonus,
				damageType: row.fields.damage_type,
				extraDamageDieCount: row.fields.extra_damage_die_count,
				extraDamageDieType: row.fields.extra_damage_die_type,
				extraDamageBonus: row.fields.extra_damage_bonus,
				extraDamageType: row.fields.extra_damage_type,
				reach: row.fields.reach,
				range: row.fields.range,
				longRange: row.fields.long_range,
				parent: row.fields.parent,
			};
		})
		.sort((a, b) => a.parent.localeCompare(b.parent) || a.pk.localeCompare(b.pk));
	if (records.length !== EXPECTED_CREATURE_ACTION_ATTACK_TOTAL) {
		throw new Error(
			`creature: expected ${EXPECTED_CREATURE_ACTION_ATTACK_TOTAL} CreatureActionAttack.json records, ` +
				`got ${records.length} — a cache resync changed shape; re-derive the monsters chapter's own count guards.`,
		);
	}
	return records;
}

/** The (at most one — cache-verified, no action has two) `CreatureActionAttack.json` row for one action, or `undefined` for a legitimate 1:0 join (e.g. every Multiattack action, and the known `srd-2024_giant-rat_bite` source-data gap — see `../chapters/monsters/starter-behaviors.ts`). */
export function creatureActionAttackByParent(
	actionPk: string,
): CreatureActionAttackRecord | undefined {
	return readCreatureActionAttacks().find((attack) => attack.parent === actionPk);
}

// ─────────────────────────────────────────────────────────────────────────
// CreatureTrait.json (326)

interface RawCreatureTraitRow {
	fields: {
		desc: string;
		name: string;
		parent: string;
	};
	model: string;
	pk: string;
}

/** One `CreatureTrait.json` record, flattened out of open5e's `fields` wrapper (Pack Tactics, Amphibious, Undead Fortitude, … — no attack shape). */
export interface CreatureTraitRecord {
	pk: string;
	name: string;
	desc: string;
	/** `Creature.json` pk this trait belongs to. */
	parent: string;
}

function assertCreatureTraitShape(row: unknown, index: number): asserts row is RawCreatureTraitRow {
	const candidate = row as Partial<RawCreatureTraitRow> | null;
	const f = candidate?.fields;
	if (
		candidate === null ||
		typeof candidate !== "object" ||
		typeof candidate.pk !== "string" ||
		typeof candidate.model !== "string" ||
		typeof f !== "object" ||
		f === null ||
		typeof f.desc !== "string" ||
		typeof f.name !== "string" ||
		typeof f.parent !== "string"
	) {
		throw new Error(
			`creature: malformed record at index ${index} in CreatureTrait.json — got ${JSON.stringify(row)}.`,
		);
	}
}

const EXPECTED_CREATURE_TRAIT_TOTAL = 326;

/** Read every `CreatureTrait.json` record, sorted by `(parent, pk)` for deterministic output. */
export function readCreatureTraits(): CreatureTraitRecord[] {
	const filePath = path.join(CACHE_OPEN5E_DIR, "CreatureTrait.json");
	const raw = JSON.parse(readFileSync(filePath, "utf8")) as unknown[];
	const records = raw
		.map((row, index) => {
			assertCreatureTraitShape(row, index);
			return {
				pk: row.pk,
				name: row.fields.name,
				desc: row.fields.desc,
				parent: row.fields.parent,
			};
		})
		.sort((a, b) => a.parent.localeCompare(b.parent) || a.pk.localeCompare(b.pk));
	if (records.length !== EXPECTED_CREATURE_TRAIT_TOTAL) {
		throw new Error(
			`creature: expected ${EXPECTED_CREATURE_TRAIT_TOTAL} CreatureTrait.json records, got ` +
				`${records.length} — a cache resync changed shape; re-derive the monsters chapter's own count guards.`,
		);
	}
	return records;
}

/** Every `CreatureTrait.json` row belonging to one creature, in file order. */
export function creatureTraitsByParent(creaturePk: string): CreatureTraitRecord[] {
	return readCreatureTraits().filter((trait) => trait.parent === creaturePk);
}
