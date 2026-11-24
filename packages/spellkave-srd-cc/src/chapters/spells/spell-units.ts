// pattern: tag-membership-menu
// Spells chapter, slice P1a: IDENTITY ONLY for all 339 SRD spells
// (`../../open5e/spell.ts`'s `readSpells()`). No spell behavior/effect is
// authored in this slice — see that reader's own module header for the
// deliberate mechanical-field cut this rests on.
//
// ROW KIND (deliberate, matches this package's own `srd/feat/<slug>`
// convention, NOT the sister's `capability_definitions` "Cast <name>" shell,
// `world-fixtures/srd/base/spells.toml`): a spell ships here as an
// `entity_definitions` catalog entry — "this spell exists, with this
// identity" — the same posture Feats F1 takes for `srd/feat/<slug>` before
// any gate/mechanic is wired. This package reserves `capability_definitions`
// for a REAL gated mechanic with a live consumer (Feats' own Alert gate is
// the precedent); "cast this spell" has no consumer yet (a future P1b/P1c
// slice owns the casting capability + slot-consumption mechanic), so
// minting one now would be an unconsumed row with no grounding — deferred,
// not closed.
//
// TAGS (deliberate, matches Armor's flat, fully-dotted, NOT-catalogued
// style, `../equipment/armor-units.ts` / `../equipment/index.ts`'s own
// `tags: ["srd.item", "srd.armor", "srd.armor.heavy"]` precedent): every tag
// below falls under this bundle's bare `srd` catch-all `tag_prefixes` entry
// (`../../bundle-row.ts`) — no NEW `tag_value_definitions` catalog row is
// authored per value (no `srd.spell.school.*`/`srd.spell.level.*` "closed-
// choice-catalog" description rows), because these are membership tags on
// each spell's own entity row, not a separate described reference table
// (contrast `srd.creature_type`/`srd.alignment`, which back the reference-
// tables-as-tag-metadata maxim, AGENTS.md). Sister-grounded (AGENTS.md
// "question, never copy"): `world-fixtures/srd/base/spells-level-1.toml`
// tags each spell with `spell.level-1`/`spell.school.<school>`/
// `spell.concentration`/`spell.ritual`/`spell.component.<v|s|m>` — same
// semantic axes, translated into this bundle's fully-dotted `srd.spell.*`
// namespace (no `allow_flat_tags`, `../../bundle-row.ts`'s own header).
import { readSpellFlavor } from "../../flavor/read";
import { readSpells, type SpellRecord } from "../../open5e/spell";
import { type ExtractedSrdText, spellMarkdownBlock } from "../../text";
import { damageTypeTag } from "../equipment/weapon-tag-values";
import { spellBehaviorPlanBySlug } from "./spell-behavior-catalog";

export const BUNDLE_ID = "srd";

/** The 10 SRD spell-level bands, in book order — mirrors the sister's own per-level fixture split (`world-fixtures/srd/base/spells-cantrips.toml` / `spells-level-<N>.toml`), a practicality precedent (339 rows), not a byte-parity target. */
export const LEVEL_BAND_SLUGS = [
	"cantrips",
	"level-1",
	"level-2",
	"level-3",
	"level-4",
	"level-5",
	"level-6",
	"level-7",
	"level-8",
	"level-9",
] as const;
export type LevelBandSlug = (typeof LEVEL_BAND_SLUGS)[number];

const EXPECTED_SPELL_COUNT = 339;

function levelBandSlug(level: number): LevelBandSlug {
	const band = LEVEL_BAND_SLUGS[level];
	if (band === undefined) {
		throw new Error(`spell-units: spell level ${level} has no level-band slug (expected 0-9).`);
	}
	return band;
}

function slugFromSpellPk(pk: string): string {
	const prefix = "srd-2024_";
	if (!pk.startsWith(prefix)) {
		throw new Error(
			`spell-units: Spell.json pk '${pk}' does not carry the expected '${prefix}' prefix.`,
		);
	}
	return pk.slice(prefix.length);
}

/** Mechanical slug for a tag segment: lowercase, non-alphanumeric runs collapse to one `_`, no leading/trailing `_`. Applied to source text verbatim — never a hand-authored label — so casting-time/range/duration tag values are traceably derived, not invented. Exported: `spell-tag-values.ts`'s catalog builder applies the SAME function to the SAME source values, so the two stay mechanically in sync. */
export function tagSlug(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "");
}

/** Human labels for the 6 distinct `casting_time` values in `Spell.json` (module header: a closed, cache-verified set — `readSpells()` throws long before this map would need a 7th entry). Description prose only; tags use `tagSlug` on the raw value directly. */
const CASTING_TIME_LABELS: Record<string, string> = {
	action: "1 Action",
	"bonus-action": "1 Bonus Action",
	reaction: "1 Reaction",
	"1minute": "1 Minute",
	"10minutes": "10 Minutes",
	"1hour": "1 Hour",
};

function castingTimeLabel(record: SpellRecord): string {
	const label = CASTING_TIME_LABELS[record.castingTime];
	if (label === undefined) {
		throw new Error(
			`spell-units: spell '${record.pk}' has unrecognized casting_time '${record.castingTime}' ` +
				"— CASTING_TIME_LABELS is stale against cache/open5e/Spell.json.",
		);
	}
	return record.reactionCondition !== null && record.reactionCondition.length > 0
		? `${label}, which you take ${record.reactionCondition}`
		: label;
}

function componentsLabel(record: SpellRecord): string {
	const parts: string[] = [];
	if (record.verbal) parts.push("V");
	if (record.somatic) parts.push("S");
	if (record.material) {
		parts.push(
			record.materialSpecified !== null && record.materialSpecified.length > 0
				? `M (${record.materialSpecified})`
				: "M",
		);
	}
	return parts.length > 0 ? parts.join(", ") : "None";
}

function durationLabel(record: SpellRecord): string {
	return record.concentration ? `Concentration, up to ${record.duration}` : record.duration;
}

function levelSchoolLabel(record: SpellRecord): string {
	const schoolLabel = `${record.school[0]?.toUpperCase()}${record.school.slice(1)}`;
	const ritualSuffix = record.ritual ? " (Ritual)" : "";
	return record.level === 0
		? `${schoolLabel} Cantrip${ritualSuffix}`
		: `Level ${record.level} ${schoolLabel}${ritualSuffix}`;
}

/** One spell identity unit — the `entity_definitions` row plus the tags/description this module composes from it. */
export interface SpellUnit {
	/** `Spell.json` pk suffix, e.g. `acid-arrow`. */
	slug: string;
	/** `srd/spell/<slug>` — this spell's `entity_definitions` id, matching `srd/feat/<slug>`'s established scheme. */
	entityId: string;
	displayName: string;
	level: number;
	levelBand: LevelBandSlug;
	school: string;
	tags: string[];
	description: string;
	/** `Spell.json` pk. */
	sourcePk: string;
	/** Verbatim SRD prose for the `srd.text` attachment. */
	verbatim: ExtractedSrdText;
}

const CLASS_PK_PREFIX = "srd-2024_";

/** Strip `srd-2024_` from a Spell.json class pk → class slug for `srd.spell.list.<slug>`. */
export function classSlugFromSpellClassPk(classPk: string): string {
	if (!classPk.startsWith(CLASS_PK_PREFIX)) {
		throw new Error(
			`spell-units: Spell.json classes entry '${classPk}' lacks expected '${CLASS_PK_PREFIX}' prefix.`,
		);
	}
	return classPk.slice(CLASS_PK_PREFIX.length);
}

/** This spell's membership + closed-choice-axis tags (module header: flat, fully-dotted). Class list tags: docs/spellcasting-substrate.md. */
function buildSpellTags(record: SpellRecord): string[] {
	const tags = [
		"srd.spell",
		`srd.spell.level.${record.level}`,
		`srd.spell.school.${tagSlug(record.school)}`,
		`srd.spell.casting_time.${tagSlug(record.castingTime)}`,
		`srd.spell.range.${tagSlug(record.rangeText)}`,
		`srd.spell.duration.${tagSlug(record.duration)}`,
	];
	if (record.concentration) tags.push("srd.spell.concentration");
	if (record.ritual) tags.push("srd.spell.ritual");
	if (record.verbal) tags.push("srd.spell.component.v");
	if (record.somatic) tags.push("srd.spell.component.s");
	if (record.material) tags.push("srd.spell.component.m");
	for (const classPk of record.classPks) {
		tags.push(`srd.spell.list.${classSlugFromSpellClassPk(classPk)}`);
	}
	// BL-57: documentary damage-type tag on damaging behaviours (matches the
	// type inside routeDamage). Catalog is the single source for which spells
	// deal typed damage this lane.
	const plan = spellBehaviorPlanBySlug(slugFromSpellPk(record.pk));
	const dmg = plan?.damageType ?? plan?.zoneDamageType;
	if (dmg !== undefined) {
		tags.push(damageTypeTag(dmg));
	}
	return tags;
}

/** Full canonical SRD spell block for the `srd.text` attachment only. */
export function spellVerbatimText(record: SpellRecord): ExtractedSrdText {
	return spellMarkdownBlock(record.name);
}

/**
 * Short `entity_definitions` description: authored atmospheric flavor under
 * `authored/flavor/en/spells/<slug>.md`. Full rules live on the `srd.text`
 * attachment (`spellVerbatimText`).
 */
export function buildSpellDescription(_unit: SpellUnit, record: SpellRecord): string {
	return readSpellFlavor(slugFromSpellPk(record.pk)).body;
}

/** Build all 339 spell identity units, `Spell.json` pk order (deterministic — the reader's own sort). */
export function buildSpellUnits(): SpellUnit[] {
	const spells = readSpells();
	if (spells.length !== EXPECTED_SPELL_COUNT) {
		throw new Error(
			`spell-units: expected ${EXPECTED_SPELL_COUNT} Spell.json rows, found ${spells.length} — ` +
				"ledger/spells.md's identity-expectations may be stale.",
		);
	}
	return spells.map((record) => {
		const slug = slugFromSpellPk(record.pk);
		const partialUnit = {
			slug,
			entityId: `${BUNDLE_ID}/spell/${slug}`,
			displayName: record.name,
			level: record.level,
			levelBand: levelBandSlug(record.level),
			school: record.school,
			sourcePk: record.pk,
		};
		const tags = buildSpellTags(record);
		const verbatim = spellVerbatimText(record);
		const unit: SpellUnit = { ...partialUnit, tags, description: "", verbatim };
		unit.description = buildSpellDescription(unit, record);
		return unit;
	});
}

/** Group spell units by their level band, in `LEVEL_BAND_SLUGS` book order — the P1a fragment-file / verb-scene granularity (module header: mirrors the sister's own per-level split; this package's own `driveUnitScene` precedent for a large independent-row set, `character-origins/index.ts`'s 33-trait scene, scaled one level further). */
export function groupSpellUnitsByLevelBand(
	units: readonly SpellUnit[],
): ReadonlyMap<LevelBandSlug, SpellUnit[]> {
	const grouped = new Map<LevelBandSlug, SpellUnit[]>(LEVEL_BAND_SLUGS.map((band) => [band, []]));
	for (const unit of units) {
		grouped.get(unit.levelBand)?.push(unit);
	}
	return grouped;
}
