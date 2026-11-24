// F1 identity: the four Origin feats (`ledger/feats.md`'s slice plan; source
// ownership `feats.md`, never smuggled into the character-origins chapter —
// `ledger/character-creation.md`'s 2026-07-31 operator ruling). Combines
// `../../open5e/feat.ts` (Feat.json/FeatBenefit.json — the pk provenance and
// raw desc text) with `../../markdown/feats.ts` (the markdown's own `_Label._`
// headings — the ONLY trustworthy source for a benefit's display label, see
// that module's header for why `FeatBenefit.json`'s own `name` field can be
// empty or wrong).
//
// PINNED QUIRKS (never "fixed" — `ledger/feats.md`'s "Sources" note):
//   - Alert's two `FeatBenefit` rows both carry the upstream pk typo
//     "initative" (`srd-2024_alert_1_initative-proficiency` /
//     `srd-2024_alert_2_initative-proficiency` — note the SECOND one, for
//     "Initiative Swap", still says "-proficiency", a copy-paste artifact on
//     top of the misspelling). `sourcePk` below carries these verbatim.
//   - Magic Initiate's second `FeatBenefit` row has JSON `name: "Level One
//     Spell"`; the markdown heading is "Level 1 Spell" (`feats.md:39`).
//     `resolveBenefitLabel` below prefers the markdown label whenever one is
//     parsed, which covers this divergence AND the two solo-benefit rows
//     (Savage Attacker, Skilled) whose JSON `name` is empty.

import { readFeatFlavor } from "../../flavor/read";
import { originFeatSectionByName } from "../../markdown/feats";
import { featBenefitsByParent, readFeats } from "../../open5e/feat";

export const BUNDLE_ID = "srd";

/** One resolved benefit line for a feat's generated description. */
export interface OriginFeatBenefitUnit {
	/** Resolved label — markdown heading text when available, else the raw JSON `name` (may be `""`). */
	label: string;
	/** Raw `FeatBenefit.json` `name`, preserved unmodified alongside the resolved label (module header). */
	jsonName: string;
	desc: string;
	/** `FeatBenefit.json` pk — carried verbatim, INCLUDING Alert's pinned "initative" typo. */
	sourcePk: string;
}

export interface OriginFeatUnit {
	/** `Feat.json` pk suffix, e.g. `alert` / `magic-initiate`. */
	slug: string;
	/** `srd/feat/<slug>` — this feat's `entity_definitions` id. */
	entityId: string;
	displayName: string;
	/** Always `"Origin"` for this slice's four rows. */
	category: string;
	repeatable: boolean;
	/** The `_Repeatable._` sub-heading's own body text, when `repeatable`. */
	repeatableText: string | undefined;
	benefits: OriginFeatBenefitUnit[];
	/** `Feat.json` pk. */
	sourcePk: string;
	/** `cache/markdown/feats.md` line anchor (`ledger/feats.md`'s unit checklist). */
	markdownAnchor: string;
}

const EXPECTED_ORIGIN_FEAT_COUNT = 4;

/** `Feat.json` pk suffix -> `cache/markdown/feats.md` line anchor (`ledger/feats.md`'s unit checklist table). */
const ORIGIN_FEAT_MARKDOWN_ANCHORS: Record<string, string> = {
	alert: "feats.md:21-29",
	"magic-initiate": "feats.md:31-43",
	"savage-attacker": "feats.md:45-49",
	skilled: "feats.md:51-57",
};

function slugFromFeatPk(pk: string): string {
	const prefix = "srd-2024_";
	if (!pk.startsWith(prefix)) {
		throw new Error(
			`feats-units: Feat.json pk '${pk}' does not carry the expected '${prefix}' prefix.`,
		);
	}
	return pk.slice(prefix.length);
}

/**
 * Resolve one benefit's display label: the markdown's own `_Label._` heading
 * at the same ordinal position when one was parsed, else the raw JSON `name`
 * (module header — covers both the Magic Initiate divergence and the two
 * solo empty-name rows).
 */
function resolveBenefitLabel(markdownLabel: string | undefined, jsonName: string): string {
	return markdownLabel !== undefined && markdownLabel.length > 0 ? markdownLabel : jsonName;
}

/**
 * Build the four Origin Feat units, `Feat.json` pk order (alert,
 * magic-initiate, savage-attacker, skilled — already alphabetical, matching
 * `feats.md`'s own "alphabetized in each category" framing, `:5`).
 */
export function buildOriginFeatUnits(): OriginFeatUnit[] {
	const feats = readFeats().filter((feat) => feat.type === "Origin");
	if (feats.length !== EXPECTED_ORIGIN_FEAT_COUNT) {
		throw new Error(
			`feats-units: expected ${EXPECTED_ORIGIN_FEAT_COUNT} Origin Feat.json rows, found ${feats.length} — ledger/feats.md's "Sources" section may be stale.`,
		);
	}

	return feats.map((feat) => {
		const slug = slugFromFeatPk(feat.pk);
		const markdownAnchor = ORIGIN_FEAT_MARKDOWN_ANCHORS[slug];
		if (markdownAnchor === undefined) {
			throw new Error(`feats-units: no markdown anchor recorded for Origin feat slug '${slug}'.`);
		}
		const section = originFeatSectionByName(feat.name);
		// The "Repeatable" FeatBenefit row (Magic Initiate's 4th, Skilled's 2nd)
		// restates the same flag this reads from the markdown's own
		// `_Repeatable._` sub-heading — excluded from the mechanical benefit
		// list so it isn't double-counted as a benefit line.
		const benefitRows = featBenefitsByParent(feat.pk).filter((row) => row.name !== "Repeatable");
		const benefits: OriginFeatBenefitUnit[] = benefitRows.map((row, index) => ({
			label: resolveBenefitLabel(section.benefitLabels[index], row.name),
			jsonName: row.name,
			desc: row.desc,
			sourcePk: row.pk,
		}));
		return {
			slug,
			entityId: `${BUNDLE_ID}/feat/${slug}`,
			displayName: feat.name,
			category: feat.type,
			repeatable: section.repeatable,
			repeatableText: section.repeatableText,
			benefits,
			sourcePk: feat.pk,
			markdownAnchor,
		};
	});
}

/**
 * Compose the feat's GENERATED `entity_definitions` description: category,
 * every benefit ("Label: desc", or bare desc when the resolved label is
 * empty — Savage Attacker/Skilled's solo rows), the Repeatable note when
 * present, and full provenance (Feat.json pk, every FeatBenefit.json pk,
 * markdown anchor). Alert's description additionally flags the pinned pk
 * typo (module header) so it stays traceable in the GENERATED coverage
 * output, not just in this file's comments.
 */
export function buildOriginFeatDescription(unit: OriginFeatUnit): string {
	return readFeatFlavor(unit.slug).body;
}
