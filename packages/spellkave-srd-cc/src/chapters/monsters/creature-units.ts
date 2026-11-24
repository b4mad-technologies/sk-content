// DOC-IMPL: derived-values#what-feeds-it-pc-level-vs-monster-cr
// pattern: multiattack-ordinals
// pattern: role-driven-brain
// Monsters chapter — creature IDENTITY (design doc §2/§3,
// `ledger/designs/monsters-chapter-design.md`): one `entity_definitions` row
// per creature (all 331), matching `armor-units.ts`/`spells/spell-units.ts`'s
// established "catalog entry, no invented row kind" posture — no behavior is
// authored here (starter attack behaviors live in `./starter-behaviors.ts`).
//
// NAMESPACE/SLUGS (§2): `BUNDLE_ID = "srd"` (existing convention). Creature
// entity id: `srd/creature/<slug>`, slug = `Creature.json` pk with the
// `srd-2024_` prefix stripped (already kebab-case — no re-slugify pass).
//
// TAGS (§3): `srd.alignment.<slug>` (reused from `character-creation/
// alignment-units.ts` — NOT re-authored; "Unaligned Creatures" carry no
// alignment tag at all, matching that module's own callout), `srd.
// creature_type.<slug>` (reused from `playing-the-game/creature-type-
// units.ts`), `srd.size.<slug>` (this chapter's own NEW axis, `./creature-
// tag-values.ts`), `srd.cr.<slug>` (ditto), the umbrella `srd.creature`
// niche tag (`CREATURE_NICHE_TAG`, reused — makes every monster a valid
// target for the 24 shipped generic-check verbs for free), and (sk-dms.39/
// sk-b3m) `srd.monster` (`MONSTER_TAG`, also reused from `playing-the-game/
// creature-type-units.ts`) — unconditional on every one of the 331 rows,
// since this catalog is SRD monsters only; consumed by the Monster Death
// combat guard (`playing-the-game/weapon-attack-units.ts`).
//
// NUMERIC IDENTITY (§3, `initial_states`): STR/DEX/CON/INT/WIS/CHA (reusing
// this bundle's own `srd/str`..`srd/cha` ability resources), `srd/ac`
// (flat), `srd/hp`, `srd/speed-walk` (a CELL COUNT — `walk` feet / 5,
// `fragments/grid.ts`'s own "feet -> cells happens once, at render time"
// convention). Zero of the 331 rows have a null `armor_class`/`hit_points`
// (cache-verified, design doc §3) — no fallback branch is needed.
//
// SENSES (§3): darkvision/blindsight/tremorsense/truesight/passive
// perception are DESCRIPTION TEXT ONLY this slice — no per-range sensing
// resource exists yet (`fragments/sensing.ts`'s baseline-sensing mechanism is
// a boolean "look" affordance, not a ranged stat); inventing one with no
// consumer would repeat the CR "don't invent uninvited" mistake this
// module's own CR posture avoids.
//
// PROFICIENCY BONUS + NATURAL-WEAPON GATING (sk-84i.4): every creature also
// seeds `srd/proficiency_bonus` (`../playing-the-game/modifier-units.ts`'s
// `PROFICIENCY_BONUS_STATE_ID`), derived from Challenge Rating —
// `proficiencyBonusForChallengeRating` below. `weapon-attack-units.ts`'s
// generic Melee/Ranged Attack archetype reads this stat unconditionally.
// That matches the SRD rule for a monster's own statted attacks; the equipped
// manufactured or natural weapon supplies attack identity and damage. Ranged
// items additionally supply range; melee reads the creature's effective
// reach. No extra per-creature proficiency tag is needed.
//
// XP WORTH (BL-55): every creature also seeds `srd/xp_value` from the
// Experience Points by Challenge Rating table (`markdown/monsters.ts`), the
// same CR source `proficiencyBonusForChallengeRating` already reads. CR 0
// defaults to 0 (not an XP source; claim-victory's `>= 1` gate stays closed).
// Octopus is the one authored exception: open5e's `experience_points_integer`
// = 10 (the table's printed "0 or 10").

import { readCreatureFlavor } from "../../flavor/read";
import { xpForChallengeRating } from "../../markdown/monsters";
import { type CreatureRecord, creatureActionsByParent, readCreatures } from "../../open5e/creature";
import { XP_VALUE_ID } from "../character-creation/advancement-units";
import { ALIGNMENT_TAG_PREFIX, buildAlignmentUnits } from "../character-creation/alignment-units";
import { buildLanguageUnits, languageTag } from "../character-creation/language-units";
import { AC_RESOURCE_ID } from "../playing-the-game/armor-class-units";
import {
	assertCreatureTypeSlug,
	CREATURE_NICHE_TAG,
	CREATURE_TYPE_TAG_PREFIX,
	MONSTER_TAG,
} from "../playing-the-game/creature-type-units";
import {
	SPEED_CLIMB_RESOURCE_ID,
	SPEED_FLY_RESOURCE_ID,
	SPEED_SWIM_RESOURCE_ID,
	SPEED_WALK_RESOURCE_ID,
} from "../playing-the-game/fragments/grid";
import { HP_ID } from "../playing-the-game/hp-units";
import {
	expectedProficiencyBonus,
	PROFICIENCY_BONUS_STATE_ID,
} from "../playing-the-game/modifier-units";
import { REACH_RESOURCE_ID, STANDARD_REACH_MM } from "../playing-the-game/reach-units";
import { VOCAL_COMMUNICATION_TAG } from "../playing-the-game/vocal-communication-identity-units";
import { creatureRoleTag } from "./creature-roles";
import {
	assertCreatureSizeSlug,
	CR_TAG_PREFIX,
	normalizeChallengeRating,
	SIZE_TAG_PREFIX,
} from "./creature-tag-values";

export const BUNDLE_ID = "srd";

const CREATURE_PK_PREFIX = "srd-2024_";

const EXPECTED_CREATURE_TOTAL = 331;

/** Feet -> cells, this bundle's own established conversion (`fragments/grid.ts`'s header: "30 ft / 5 = 6 cells", feet->cells happens once, at render time). */
const FEET_PER_CELL = 5;

function speedCells(feet: number | null): number | null {
	if (feet === null || feet <= 0) return null;
	return Math.trunc(feet / FEET_PER_CELL);
}

const STR_STATE_ID = `${BUNDLE_ID}/str`;
const DEX_STATE_ID = `${BUNDLE_ID}/dex`;
const CON_STATE_ID = `${BUNDLE_ID}/con`;
const INT_STATE_ID = `${BUNDLE_ID}/int`;
const WIS_STATE_ID = `${BUNDLE_ID}/wis`;
const CHA_STATE_ID = `${BUNDLE_ID}/cha`;
const HP_STATE_ID = `${BUNDLE_ID}/${HP_ID}`;
const XP_VALUE_STATE_ID = `${BUNDLE_ID}/${XP_VALUE_ID}`;

/** `srd/str`..`srd/cha`'s shared resource bounds (`playing-the-game/fragments/identity.ts`'s `buildAbilitiesFragment`: `min_value: 0, max_value: 30`). */
const ABILITY_SCORE_MIN = 0;
const ABILITY_SCORE_MAX = 30;

/**
 * Clamp a `Creature.json` ability score into the shared `srd/str`..`srd/cha`
 * resource bounds — a documented, honest exception, not a silent pass:
 * `srd-2024_octopus` carries `ability_score_charisma: -3` (cache-verified,
 * live-reproduced MF-VAL-269 "the runtime silently clamps it, so the seeded
 * value will not land"). This is treated as an open5e source-data anomaly
 * (real 5e stat blocks never carry a negative ability score) rather than a
 * reason to widen the shared bound for every OTHER creature/character in
 * this bundle — the resource's own [0,30] domain matches the SRD Ability
 * Scores table (`ability-units.ts`'s own `abilityScoreBands`, 1..30) and no
 * DSL predicate anywhere expects a negative score.
 */
function clampAbilityScore(value: number): number {
	return Math.max(ABILITY_SCORE_MIN, Math.min(ABILITY_SCORE_MAX, value));
}

const VALID_ALIGNMENT_SLUGS: ReadonlySet<string> = new Set(
	buildAlignmentUnits().map((unit) => unit.slug),
);

const LANGUAGE_TAG_BY_SLUG: ReadonlyMap<string, string> = new Map(
	buildLanguageUnits().map((unit) => [unit.slug, languageTag(unit)]),
);

/**
 * sk-84i.4 (probe sk-84i.1's measured to-hit deltas vs open5e: wolf −2,
 * zombie −2, bandit −3): SRD monsters are ALWAYS proficient with their own
 * statted attacks (playing-the-game.md § Proficiency), so every creature's
 * Proficiency Bonus is derived from Challenge Rating — via the SAME SRD
 * Proficiency Bonus table `../playing-the-game/modifier-units.ts`'s
 * `expectedProficiencyBonus` already parses from the cached chapter markdown
 * (never a second, independently-typed formula/table; that function's own
 * PROFICIENCY_BONUS_MACRO_BODY_SOURCE doc comment has the Level-or-CR
 * derivation's full grounding, including the "Up to 4 band includes CR 0"
 * detail). `Creature.json`'s `challenge_rating` field is a decimal STRING
 * (e.g. `"0.250"`, `"10.000"`, or the two un-padded `"0"` rows —
 * `creature-tag-values.ts`'s own module header) — `Number(...)` parses every
 * one of these cleanly (all are plain decimal literals), no separate
 * raw-string->number table needed here.
 */
function proficiencyBonusForChallengeRating(rawChallengeRating: string): number {
	return expectedProficiencyBonus(Number(rawChallengeRating));
}

/** CR table XP, unless open5e authored an explicit integer (Octopus = 10). */
export function xpValueForCreature(record: CreatureRecord): number {
	if (record.experiencePointsInteger !== null) return record.experiencePointsInteger;
	return xpForChallengeRating(Number(record.challengeRating));
}

/** `"chaotic neutral"` -> `"chaotic-neutral"` (space -> hyphen; `"neutral"` stays `"neutral"`). `"unaligned"` is returned unchanged — the caller checks for it explicitly (§ Unaligned Creatures, no tag). */
function alignmentSlug(raw: string): string {
	return raw.trim().toLowerCase().replace(/\s+/g, "-");
}

function slugFromCreaturePk(pk: string): string {
	if (!pk.startsWith(CREATURE_PK_PREFIX)) {
		throw new Error(
			`creature-units: Creature.json pk '${pk}' does not carry the expected '${CREATURE_PK_PREFIX}' prefix.`,
		);
	}
	return pk.slice(CREATURE_PK_PREFIX.length);
}

/** One creature identity unit — the `entity_definitions` row plus the tags/states/description this module composes from the sourced `CreatureRecord`. */
export interface CreatureUnit {
	/** `Creature.json` pk suffix, e.g. `goblin-warrior`. */
	slug: string;
	/** `srd/creature/<slug>` — this creature's `entity_definitions` id. */
	entityId: string;
	displayName: string;
	tags: string[];
	initialStates: { state: string; valueInt: number }[];
	description: string;
	/** `Creature.json` pk. */
	sourcePk: string;
	/** Carried forward for `starter-behaviors.ts`'s own to-hit/damage composition (never re-read from the cache twice). */
	record: CreatureRecord;
}

function buildTags(
	record: CreatureRecord,
	sizeSlug: string,
	crSlug: string,
	slug: string,
): string[] {
	// sk-dms.39/sk-b3m: EVERY row this module authors is an SRD Creature.json
	// monster — never a player character — so MONSTER_TAG is unconditional
	// here, unlike the per-row alignment/type/size/CR tags below. Consumed by
	// `weapon-attack-units.ts`'s Monster Death guard, which now restricts
	// itself to monster-tagged actors; `starter-behaviors.ts`'s 8 named
	// starters draw their entity_def from this SAME builder, so tagging here
	// (once, mechanically) keeps their already-shipped Monster Death write
	// firing rather than silently going monster-tag-less.
	const tags = [CREATURE_NICHE_TAG, MONSTER_TAG];
	if (creatureHasVocalCommunication(record)) {
		tags.push(VOCAL_COMMUNICATION_TAG);
	}
	const rawAlignmentSlug = alignmentSlug(record.alignment);
	if (rawAlignmentSlug !== "unaligned") {
		if (!VALID_ALIGNMENT_SLUGS.has(rawAlignmentSlug)) {
			throw new Error(
				`creature-units: creature '${record.pk}' has unrecognized alignment slug ` +
					`'${rawAlignmentSlug}' (raw '${record.alignment}') — not one of the 9 SRD alignments ` +
					`or 'unaligned'.`,
			);
		}
		tags.push(`${ALIGNMENT_TAG_PREFIX}.${rawAlignmentSlug}`);
	}
	assertCreatureTypeSlug(record.type);
	tags.push(`${CREATURE_TYPE_TAG_PREFIX}.${record.type}`);
	assertCreatureSizeSlug(sizeSlug);
	tags.push(`${SIZE_TAG_PREFIX}.${sizeSlug}`);
	tags.push(`${CR_TAG_PREFIX}.${crSlug}`);
	const seenLanguages = new Set<string>();
	for (const languageSlug of record.languages) {
		const tag = LANGUAGE_TAG_BY_SLUG.get(languageSlug);
		if (tag === undefined) {
			throw new Error(
				`creature-units: creature '${record.pk}' language '${languageSlug}' has no srd.language.* tag.`,
			);
		}
		if (seenLanguages.has(tag)) continue;
		seenLanguages.add(tag);
		tags.push(tag);
	}
	// L11: combat-role brain selection (`creature-roles.ts`, storyline §6).
	tags.push(creatureRoleTag(slug, record));
	return tags;
}

/**
 * Derive ordinary vocal ability from the cached SRD Languages line.
 *
 * Empty lines establish no communication modality. The source writes every
 * understands-only, unable-to-speak row as a line beginning with
 * “Understands …”, so those rows stay silent. Do not reject every line that
 * contains “can't speak”: Giant Eagle/Elk/Owl can speak Celestial while only
 * understanding other languages, and lycanthropes can speak Common outside
 * one animal form. Those mixed/form-limited rows have a usable vocal mode.
 */
export function creatureHasVocalCommunication(record: CreatureRecord): boolean {
	const languagesDescription = record.languagesDescription.trim();
	return languagesDescription.length > 0 && !/^understands\b/i.test(languagesDescription);
}

function sensesLine(record: CreatureRecord): string {
	const parts: string[] = [];
	if (record.darkvisionRange !== null) parts.push(`Darkvision ${record.darkvisionRange} ft.`);
	if (record.blindsightRange !== null) parts.push(`Blindsight ${record.blindsightRange} ft.`);
	if (record.tremorsenseRange !== null) parts.push(`Tremorsense ${record.tremorsenseRange} ft.`);
	if (record.truesightRange !== null) parts.push(`Truesight ${record.truesightRange} ft.`);
	parts.push(`Passive Perception ${record.passivePerception}`);
	return parts.join(", ");
}

/**
 * Website card / in-play summary: authored flavor blurb from
 * `authored/flavor/en/monsters/<slug>.md`. Stat-block numbers stay in
 * structured rows and `srd.text`.
 */
export function buildCreatureDescription(record: CreatureRecord, crSlug: string): string {
	void crSlug;
	return readCreatureFlavor(slugFromCreaturePk(record.pk)).body;
}

/** Compact stat-block summary retained for tests that still want the mechanical line. */
export function buildCreatureStatBlockDescription(record: CreatureRecord, crSlug: string): string {
	const speedCells = record.walk === null ? 0 : Math.trunc(record.walk / FEET_PER_CELL);
	return (
		`${record.name} — ${record.size[0]?.toUpperCase()}${record.size.slice(1)} ${record.type}, ` +
		`${alignmentSlug(record.alignment) === "unaligned" ? "unaligned" : record.alignment}. ` +
		`AC ${record.armorClass}, HP ${record.hitPoints}, Speed ${record.walk ?? 0} ft. (${speedCells} cells). ` +
		`STR ${record.strength}, DEX ${record.dexterity}, CON ${record.constitution}, ` +
		`INT ${record.intelligence}, WIS ${record.wisdom}, CHA ${record.charisma}. ` +
		`Challenge Rating ${crLabelFor(crSlug)} (Proficiency Bonus +` +
		`${proficiencyBonusForChallengeRating(record.challengeRating)}, sk-84i.4). ` +
		`Senses: ${sensesLine(record)}. ` +
		`IDENTITY content only (no behavior wired this slice except the 8 named starters — ` +
		`see ledger/designs/monsters-chapter-design.md). Source: cache/open5e/Creature.json pk='${record.pk}'.`
	);
}

function crLabelFor(slug: string): string {
	return slug.includes("-") ? slug.replace("-", "/") : slug;
}

/** Build one creature's identity unit, cache-pinned (never hand-typed). */
export function buildCreatureUnit(record: CreatureRecord): CreatureUnit {
	const slug = slugFromCreaturePk(record.pk);
	const crSlug = normalizeChallengeRating(record.challengeRating);
	const tags = buildTags(record, record.size, crSlug, slug);
	const initialStates = [
		{ state: REACH_RESOURCE_ID, valueInt: STANDARD_REACH_MM },
		{ state: STR_STATE_ID, valueInt: clampAbilityScore(record.strength) },
		{ state: DEX_STATE_ID, valueInt: clampAbilityScore(record.dexterity) },
		{ state: CON_STATE_ID, valueInt: clampAbilityScore(record.constitution) },
		{ state: INT_STATE_ID, valueInt: clampAbilityScore(record.intelligence) },
		{ state: WIS_STATE_ID, valueInt: clampAbilityScore(record.wisdom) },
		{ state: CHA_STATE_ID, valueInt: clampAbilityScore(record.charisma) },
		{ state: AC_RESOURCE_ID, valueInt: record.armorClass },
		{ state: HP_STATE_ID, valueInt: record.hitPoints },
		{
			state: SPEED_WALK_RESOURCE_ID,
			valueInt: record.walk === null ? 0 : Math.trunc(record.walk / FEET_PER_CELL),
		},
		{
			state: PROFICIENCY_BONUS_STATE_ID,
			valueInt: proficiencyBonusForChallengeRating(record.challengeRating),
		},
		{ state: XP_VALUE_STATE_ID, valueInt: xpValueForCreature(record) },
	];
	const fly = speedCells(record.fly);
	if (fly !== null) initialStates.push({ state: SPEED_FLY_RESOURCE_ID, valueInt: fly });
	const swim = speedCells(record.swim);
	if (swim !== null) initialStates.push({ state: SPEED_SWIM_RESOURCE_ID, valueInt: swim });
	const climb = speedCells(record.climb);
	if (climb !== null) initialStates.push({ state: SPEED_CLIMB_RESOURCE_ID, valueInt: climb });
	const actions = creatureActionsByParent(record.pk);
	const hasSpellcasting = actions.some(
		(a) => /^spellcasting$/i.test(a.name.trim()) || /innate spellcasting/i.test(a.name),
	);
	if (hasSpellcasting) {
		initialStates.push(
			{ state: `${BUNDLE_ID}/spell_slot_1`, valueInt: 4 },
			{ state: `${BUNDLE_ID}/spell_slot_2`, valueInt: 3 },
		);
	}
	return {
		slug,
		entityId: `${BUNDLE_ID}/creature/${slug}`,
		displayName: record.name,
		tags,
		initialStates,
		description: buildCreatureDescription(record, crSlug),
		sourcePk: record.pk,
		record,
	};
}

/** Build all 331 creature identity units, `Creature.json` pk order (deterministic — the reader's own sort). */
export function buildCreatureUnits(): CreatureUnit[] {
	const creatures = readCreatures();
	if (creatures.length !== EXPECTED_CREATURE_TOTAL) {
		throw new Error(
			`creature-units: expected ${EXPECTED_CREATURE_TOTAL} Creature.json rows, found ${creatures.length}.`,
		);
	}
	return creatures.map((record) => buildCreatureUnit(record));
}

/** Split `units` into fixed-size, deterministic (pk-order) chunks — the per-fragment/per-scene granularity `./index.ts` renders (mirrors `spells/index.ts`'s per-band batching, scaled to a flat chunk count since creatures have no book-mandated grouping axis). */
export function chunkCreatureUnits(
	units: readonly CreatureUnit[],
	chunkSize: number,
): CreatureUnit[][] {
	const chunks: CreatureUnit[][] = [];
	for (let index = 0; index < units.length; index += chunkSize) {
		chunks.push(units.slice(index, index + chunkSize));
	}
	return chunks;
}
