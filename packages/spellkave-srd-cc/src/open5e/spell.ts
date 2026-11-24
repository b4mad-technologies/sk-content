// Typed reader for `cache/open5e/Spell.json` (339 records, pk join
// `srd-2024_<slug>`) — the open5e Django-fixture shape, read ONLY from the
// committed cache (never the fork directly; see `../sources.ts`). First
// consumer: `../chapters/spells/spell-units.ts`'s P1a identity slice.
//
// IDENTITY-SLICE FIELD CUT (P1a, deliberate): this reader carries only the
// fields the Spells chapter's IDENTITY unit needs — level/school/casting
// time/range/components/duration/concentration/ritual (the tag axes) plus
// `name`/`desc`/`higher_level` (the generated description's prose) and `pk`/
// `document` (provenance). Mechanical fields that exist on the same JSON row
// (`attack_roll`, `damage_roll`, `damage_types`, `saving_throw_ability`,
// `target_count`, `target_type`, `shape_type`/`shape_size`, numeric
// `range`/`range_unit`) stay unread here — the raw `desc` prose already
// carries combat math verbatim. `classes` IS read: spellcasting-substrate
// tags each spell with `srd.spell.list.<class>` from this field
// (docs/spellcasting-substrate.md) — a named consumer, not speculative.
//
// `cache/open5e/SpellCastingOption.json` (671 rows: higher-level slot-scaling
// overrides) is a SEPARATE file this reader does not touch — it is
// behavior-shaped (per-slot-level damage/target/duration overrides), owned
// by a future P1b slice, not this identity reader.
import { readFileSync } from "node:fs";
import path from "node:path";

import { CACHE_OPEN5E_DIR } from "./paths";

interface RawSpellRow {
	fields: {
		casting_time: string;
		concentration: boolean;
		desc: string;
		document: string;
		duration: string;
		higher_level: string;
		level: number;
		material: boolean;
		material_specified: string | null;
		name: string;
		range_text: string;
		reaction_condition: string | null;
		ritual: boolean;
		school: string;
		somatic: boolean;
		verbal: boolean;
		/** Owning class pks, e.g. `["srd-2024_wizard"]`. */
		classes: string[];
	};
	model: string;
	pk: string;
}

/** One `Spell.json` record, flattened out of open5e's `fields` wrapper (module header: identity-slice field cut). */
export interface SpellRecord {
	/** open5e pk, e.g. `srd-2024_acid-arrow` — carried forward as TOML provenance. */
	pk: string;
	name: string;
	desc: string;
	document: string;
	/** `0` for a cantrip, `1`-`9` otherwise. */
	level: number;
	/** e.g. `evocation`, `conjuration` — one of the 8 SRD schools, lowercase as cached. */
	school: string;
	/** e.g. `action`, `bonus-action`, `reaction`, `1minute`, `10minutes`, `1hour` — raw cached slug, never re-labelled here. */
	castingTime: string;
	/** Populated only for the 4 `casting_time: "reaction"` spells; `null` otherwise. */
	reactionCondition: string | null;
	/** Human-formatted range, e.g. `60 feet`, `Self`, `Touch`, `Special`. */
	rangeText: string;
	ritual: boolean;
	verbal: boolean;
	somatic: boolean;
	material: boolean;
	/** The specific material component text (e.g. `powdered rhubarb leaf`) when `material`; `null` otherwise (no cost/consumption fields — module header). */
	materialSpecified: string | null;
	/** Human-formatted duration, e.g. `instantaneous`, `1 minute`, `until dispelled`. */
	duration: string;
	concentration: boolean;
	/** Non-empty only when the spell's effect scales with a higher slot level. */
	higherLevel: string;
	/** Class list membership as open5e CharacterClass pks (`srd-2024_<slug>`). */
	classPks: readonly string[];
}

function assertShape(row: unknown, index: number): asserts row is RawSpellRow {
	const candidate = row as Partial<RawSpellRow> | null;
	if (
		candidate === null ||
		typeof candidate !== "object" ||
		typeof candidate.pk !== "string" ||
		typeof candidate.model !== "string" ||
		typeof candidate.fields !== "object" ||
		candidate.fields === null ||
		typeof candidate.fields.casting_time !== "string" ||
		typeof candidate.fields.concentration !== "boolean" ||
		typeof candidate.fields.desc !== "string" ||
		typeof candidate.fields.document !== "string" ||
		typeof candidate.fields.duration !== "string" ||
		typeof candidate.fields.higher_level !== "string" ||
		typeof candidate.fields.level !== "number" ||
		typeof candidate.fields.material !== "boolean" ||
		(candidate.fields.material_specified !== null &&
			typeof candidate.fields.material_specified !== "string") ||
		typeof candidate.fields.name !== "string" ||
		typeof candidate.fields.range_text !== "string" ||
		(candidate.fields.reaction_condition !== null &&
			typeof candidate.fields.reaction_condition !== "string") ||
		typeof candidate.fields.ritual !== "boolean" ||
		typeof candidate.fields.school !== "string" ||
		typeof candidate.fields.somatic !== "boolean" ||
		typeof candidate.fields.verbal !== "boolean" ||
		!Array.isArray(candidate.fields.classes) ||
		!candidate.fields.classes.every((entry) => typeof entry === "string")
	) {
		throw new Error(
			`spell: malformed record at index ${index} in Spell.json — expected the cached spell ` +
				`identity fields (module header's field cut), got ${JSON.stringify(row)}.`,
		);
	}
}

/** Read every `Spell.json` record, sorted by `pk` for deterministic output. */
export function readSpells(): SpellRecord[] {
	const filePath = path.join(CACHE_OPEN5E_DIR, "Spell.json");
	const raw = JSON.parse(readFileSync(filePath, "utf8")) as unknown[];
	return raw
		.map((row, index) => {
			assertShape(row, index);
			return {
				pk: row.pk,
				name: row.fields.name,
				desc: row.fields.desc,
				document: row.fields.document,
				level: row.fields.level,
				school: row.fields.school,
				castingTime: row.fields.casting_time,
				reactionCondition: row.fields.reaction_condition,
				rangeText: row.fields.range_text,
				ritual: row.fields.ritual,
				verbal: row.fields.verbal,
				somatic: row.fields.somatic,
				material: row.fields.material,
				materialSpecified: row.fields.material_specified,
				duration: row.fields.duration,
				concentration: row.fields.concentration,
				higherLevel: row.fields.higher_level,
				classPks: row.fields.classes,
			};
		})
		.sort((a, b) => a.pk.localeCompare(b.pk));
}

/** Resolve one Spell.json record by pk, throwing loudly (never a silent undefined). */
export function spellByPk(pk: string): SpellRecord {
	const record = readSpells().find((spell) => spell.pk === pk);
	if (record === undefined) {
		throw new Error(`spell: no Spell.json record with pk '${pk}' in the cache.`);
	}
	return record;
}
