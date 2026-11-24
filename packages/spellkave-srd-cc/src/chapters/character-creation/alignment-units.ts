// Chapter unit: "The Nine Alignments" (`character-creation.md:542-568`) —
// slice C1 (`ledger/character-creation.md`'s C1 row). The
// `reference-tables-as-tag-metadata` design's "Closed choice catalogs"
// variant (`ledger/designs/reference-tables-as-tag-metadata.md` §"Closed
// choice catalogs", the Travel Pace precedent): 9 catalog-only
// `tag_value_definitions`, one per alignment, sourced verbatim from
// `AlignmentDescription.json` — SRD 5.2 alignment carries no mechanic today
// (no structured runtime consumer: no predicate, no macro, no server read
// anywhere reads an actor's alignment), so this ships as vocabulary, not as
// a resource/capability/predicate.
//
// SCOPE NOTE: applying these tags to actual entity_definitions (the proof
// hero/NPCs) is deliberately NOT part of this slice — moved to a later
// slice (C3) to keep parallel build-out slices file-disjoint. This module
// ships the catalog only.

import { readUnalignedCreaturesCallout } from "../../markdown/character-creation";
import { readAlignmentDescriptions } from "../../open5e/alignment-description";
import type { TagValueDefinitionUnit } from "../playing-the-game/tag-value-vocabulary";

const SRD_TAG_PREFIX = "srd";

/** The declared exact-vocabulary prefix for the 9 SRD alignments (`srd.alignment.<slug>`). */
export const ALIGNMENT_TAG_PREFIX = "srd.alignment";

/**
 * The class-level tag every one of the 9 per-alignment tag values shares as
 * its own `tag` string — same umbrella-row idiom as `srd.ability_score` /
 * `srd.difficulty_class` (`playing-the-game/tag-value-vocabulary.ts`): one
 * tag_value_definition explaining the WHOLE semantic class, distinct from
 * (and never itself applied as) one of the 9 per-alignment values.
 */
export const ALIGNMENT_CLASS_TAG = ALIGNMENT_TAG_PREFIX;

const EXPECTED_ALIGNMENT_COUNT = 9;

const ALIGNMENTS_ANCHOR = "character-creation.md:542-568 (§ The Nine Alignments)";
const UNALIGNED_CALLOUT_ANCHOR = "character-creation.md:558-560 (§ Unaligned Creatures)";

/** One `AlignmentDescription.json` record, shaped into the tag VALUE this bundle emits. */
export interface AlignmentUnit {
	/** Kebab-case slug (`lawful-good`, `chaotic-evil`, …) — the tag VALUE suffix under {@link ALIGNMENT_TAG_PREFIX}. */
	slug: string;
	description: string;
	/** open5e pk, e.g. `srd-2024_lawful-good` — carried forward as provenance. */
	pk: string;
}

/**
 * The 9 SRD alignments (`cache/open5e/AlignmentDescription.json`), sorted by
 * slug for deterministic output. Ships as VALIDATED VOCABULARY ONLY — no
 * other manifest row of its own (same "no mechanic without a consumer" rule
 * `creature-type-units.ts` applies): a future mechanical consumer (alignment-
 * gated spells/effects, detect-alignment style checks) would render these as
 * rows itself, when it exists.
 */
export function buildAlignmentUnits(): AlignmentUnit[] {
	const records = readAlignmentDescriptions();
	if (records.length !== EXPECTED_ALIGNMENT_COUNT) {
		throw new Error(
			`alignment-units: expected ${EXPECTED_ALIGNMENT_COUNT} AlignmentDescription.json records, ` +
				`got ${records.length}.`,
		);
	}
	return records
		.map((record) => ({
			slug: record.describes,
			description: record.desc,
			pk: record.pk,
		}))
		.sort((a, b) => a.slug.localeCompare(b.slug));
}

/**
 * Render the class-level `srd.alignment` tag description: the source's own
 * two-axis framing (morality x order) plus the Unaligned Creatures callout —
 * a fact about the WHOLE class (some creatures carry none of the 9 values),
 * not about any single alignment, so it belongs on the class row rather than
 * duplicated into all 9 per-value descriptions.
 */
export function alignmentClassTagDescription(): string {
	const callout = readUnalignedCreaturesCallout();
	return (
		"Identifies a tag value definition as one of the SRD Nine Alignments. Alignment combines two " +
		"factors: one identifies morality (good, evil, or neutral), and the other describes attitudes " +
		`toward order (lawful, chaotic, or neutral) (${ALIGNMENTS_ANCHOR}). Unaligned Creatures: ` +
		`${callout} (${UNALIGNED_CALLOUT_ANCHOR})`
	);
}

/**
 * The 9 per-alignment `tag_value_definitions` PLUS the one class-level
 * `srd.alignment` row (10 rows total) — the exact set `alignment.toml` emits.
 */
export function buildAlignmentTagValueUnits(): TagValueDefinitionUnit[] {
	const values: TagValueDefinitionUnit[] = buildAlignmentUnits().map((unit) => ({
		tag: `${ALIGNMENT_TAG_PREFIX}.${unit.slug}`,
		prefix: ALIGNMENT_TAG_PREFIX,
		description: unit.description,
		sourcePk: unit.pk,
	}));
	const classUnit: TagValueDefinitionUnit = {
		tag: ALIGNMENT_CLASS_TAG,
		prefix: SRD_TAG_PREFIX,
		description: alignmentClassTagDescription(),
		sourcePk: ALIGNMENTS_ANCHOR,
	};
	return [classUnit, ...values];
}
