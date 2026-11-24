// F2 (Feats quick-win completion, `ledger/feats.md`'s "remaining-feats"
// coverage unit): the 13 feats F1 deliberately left unplanned — 2 General,
// 4 Fighting Style, 7 Epic Boon (`Feat.json`'s own `type` field; `feats.md`'s
// `:59-183` — General `:59`, Fighting Style `:83`, Epic Boon `:109`).
//
// IDENTITY ONLY (no mechanic rows), same posture as F1's own Savage
// Attacker/Magic Initiate tier: every SRD benefit here needs a substrate seam
// this package does not yet have —
//   - Ability Score Improvement / every "Ability Score Increase" Epic Boon
//     benefit: a real character-creation-time ability-score-raise action
//     (owner: a future advancement/character-creation slice, not this
//     quick-win pass).
//   - Grappler / the Fighting Styles / the remaining Epic Boon benefits:
//     attack-roll and damage-roll intervention hooks this package has not
//     built (Peerless Aim's reroll-on-miss is the SAME shape as F1's own
//     Savage Attacker gap — `ledger/designs/finding-58-post-roll-reroll-
//     intervention.md`).
// Each unit's own `deferredReason` names its concrete missing seam — never a
// blanket "not implemented yet".
//
// Reuses `../../markdown/feats.ts`'s generalized `featSectionByName` (F2's
// own widening of the former Origin-only reader) exactly as F1's
// `feats-units.ts` reuses `originFeatSectionByName` — same markdown-preferred-
// over-JSON-name resolution (`resolveBenefitLabel`, mirrored here rather than
// imported, since `feats-units.ts` stays an F1-scoped module).

import { readFeatFlavor } from "../../flavor/read";
import { featSectionByName } from "../../markdown/feats";
import { featBenefitsByParent, readFeats } from "../../open5e/feat";

export const BUNDLE_ID = "srd";

/** `Feat.json`'s own `type` values for the 3 categories this slice covers. */
export type RemainingFeatCategory = "General" | "Fighting Style" | "Epic Boon";

/** One resolved benefit line for a feat's generated description — same shape as F1's `OriginFeatBenefitUnit`. */
export interface RemainingFeatBenefitUnit {
	label: string;
	jsonName: string;
	desc: string;
	sourcePk: string;
}

export interface RemainingFeatUnit {
	/** `Feat.json` pk suffix, e.g. `grappler` / `boon-of-truesight`. */
	slug: string;
	/** `srd/feat/<slug>` — this feat's `entity_definitions` id. */
	entityId: string;
	displayName: string;
	category: RemainingFeatCategory;
	repeatable: boolean;
	repeatableText: string | undefined;
	benefits: RemainingFeatBenefitUnit[];
	/** `Feat.json` pk. */
	sourcePk: string;
	/** `cache/markdown/feats.md` line anchor (`ledger/feats.md`'s unit checklist). */
	markdownAnchor: string;
	/** Concrete missing substrate seam — module header names the two recurring families. */
	deferredReason: string;
}

const EXPECTED_REMAINING_FEAT_COUNT = 13;

const REMAINING_FEAT_MARKDOWN_ANCHORS: Record<string, string> = {
	"ability-score-improvement": "feats.md:61-67",
	grappler: "feats.md:69-81",
	archery: "feats.md:85-90",
	defense: "feats.md:91-96",
	"great-weapon-fighting": "feats.md:97-102",
	"two-weapon-fighting": "feats.md:103-107",
	"boon-of-combat-prowess": "feats.md:111-120",
	"boon-of-dimensional-travel": "feats.md:121-130",
	"boon-of-fate": "feats.md:131-140",
	"boon-of-irresistible-offense": "feats.md:141-152",
	"boon-of-spell-recall": "feats.md:153-162",
	"boon-of-the-night-spirit": "feats.md:163-174",
	"boon-of-truesight": "feats.md:175-183",
};

/** Non-ASI feats that still need a score-raise seam (Epic Boon +1 benefits). ASI itself is mechanized in asi-units.ts (lane L4). */
const ABILITY_SCORE_SEAM =
	"a character-creation-time or boon-time ability-score-raise action beyond the L4 ASI " +
	"six-row spend (asi-units.ts) — Epic Boon +1 benefits are not the same menu.";
const ASI_MECHANIZED =
	"lane L4 (asi-units.ts / bead sk-609b.5 (design trail)): srd/asi_points " +
	"spend counter + six +1-to-score actions with DEX→srd/ac and CON→srd/hp paired writes.";
const ROLL_INTERVENTION_SEAM =
	"an attack-roll/damage-roll intervention hook (same shape as F1's own Savage Attacker " +
	"gap — ledger/designs/finding-58-post-roll-reroll-intervention.md) — not built this slice.";
const CONDITION_OR_SENSE_SEAM =
	"a bespoke condition/sense mechanic this package has not authored for this benefit " +
	"(e.g. Truesight, teleportation, resistance-while-in-darkness) — identity only this slice.";

/** Per-slug deferred-mechanic reason — every non-repeatable-note benefit line names ONE concrete missing seam, never a blanket placeholder. */
const DEFERRED_REASON_BY_SLUG: Record<string, string> = {
	"ability-score-improvement": ASI_MECHANIZED,
	grappler: ROLL_INTERVENTION_SEAM,
	archery: ROLL_INTERVENTION_SEAM,
	defense:
		"the same AC-modifier axis Equipment E1/E2 already prove, but no armor-training " +
		"condition exists to gate a Fighting Style feat's own bonus on — deferred with that family.",
	"great-weapon-fighting": ROLL_INTERVENTION_SEAM,
	"two-weapon-fighting": ROLL_INTERVENTION_SEAM,
	"boon-of-combat-prowess": `${ABILITY_SCORE_SEAM} Peerless Aim additionally needs: ${ROLL_INTERVENTION_SEAM}`,
	"boon-of-dimensional-travel": `${ABILITY_SCORE_SEAM} Blink Steps additionally needs: ${CONDITION_OR_SENSE_SEAM}`,
	"boon-of-fate": `${ABILITY_SCORE_SEAM} Improve Fate additionally needs: ${ROLL_INTERVENTION_SEAM}`,
	"boon-of-irresistible-offense": `${ABILITY_SCORE_SEAM} Overcome Defenses/Overwhelming Strike additionally need: ${ROLL_INTERVENTION_SEAM}`,
	"boon-of-spell-recall": `${ABILITY_SCORE_SEAM} Free Casting additionally needs a spellcasting substrate (owner: a future spells/classes chapter, same posture as F1's own Magic Initiate).`,
	"boon-of-the-night-spirit": `${ABILITY_SCORE_SEAM} Merge with Shadows/Shadowy Form additionally need: ${CONDITION_OR_SENSE_SEAM}`,
	"boon-of-truesight": `${ABILITY_SCORE_SEAM} Truesight additionally needs: ${CONDITION_OR_SENSE_SEAM}`,
};

function slugFromFeatPk(pk: string): string {
	const prefix = "srd-2024_";
	if (!pk.startsWith(prefix)) {
		throw new Error(
			`remaining-feats-units: Feat.json pk '${pk}' does not carry the expected '${prefix}' prefix.`,
		);
	}
	return pk.slice(prefix.length);
}

function resolveBenefitLabel(markdownLabel: string | undefined, jsonName: string): string {
	return markdownLabel !== undefined && markdownLabel.length > 0 ? markdownLabel : jsonName;
}

function isRemainingFeatCategory(type: string): type is RemainingFeatCategory {
	return type === "General" || type === "Fighting Style" || type === "Epic Boon";
}

/**
 * Build the 13 remaining feat units — `Feat.json` pk order within each
 * category (General, Fighting Style, Epic Boon, matching `feats.md`'s own
 * "alphabetized in each category" framing, `:5`).
 */
export function buildRemainingFeatUnits(): RemainingFeatUnit[] {
	const feats = readFeats().filter((feat) => isRemainingFeatCategory(feat.type));
	if (feats.length !== EXPECTED_REMAINING_FEAT_COUNT) {
		throw new Error(
			`remaining-feats-units: expected ${EXPECTED_REMAINING_FEAT_COUNT} General/Fighting Style/Epic ` +
				`Boon Feat.json rows, found ${feats.length} — ledger/feats.md's "Sources" section may be stale.`,
		);
	}

	return feats.map((feat) => {
		if (!isRemainingFeatCategory(feat.type)) {
			throw new Error(`remaining-feats-units: unreachable — '${feat.type}' filtered above.`);
		}
		const slug = slugFromFeatPk(feat.pk);
		const markdownAnchor = REMAINING_FEAT_MARKDOWN_ANCHORS[slug];
		if (markdownAnchor === undefined) {
			throw new Error(
				`remaining-feats-units: no markdown anchor recorded for feat slug '${slug}'.`,
			);
		}
		const deferredReason = DEFERRED_REASON_BY_SLUG[slug];
		if (deferredReason === undefined) {
			throw new Error(
				`remaining-feats-units: no deferred-mechanic reason recorded for feat slug '${slug}'.`,
			);
		}
		const section = featSectionByName(feat.name);
		const benefitRows = featBenefitsByParent(feat.pk).filter((row) => row.name !== "Repeatable");
		const benefits: RemainingFeatBenefitUnit[] = benefitRows.map((row, index) => ({
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
			deferredReason,
		};
	});
}

/** `Feat.json`'s own category text -> this bundle's `srd.feat.<slug>` tag suffix (snake_case, matching `srd.tool_proficiency`/`srd.character_creation`'s own multi-word convention). */
export function remainingFeatCategoryTag(category: RemainingFeatCategory): string {
	switch (category) {
		case "General":
			return "srd.feat.general";
		case "Fighting Style":
			return "srd.feat.fighting_style";
		case "Epic Boon":
			return "srd.feat.epic_boon";
	}
}

/**
 * Compose the feat's GENERATED `entity_definitions` description: category,
 * every benefit, the Repeatable note when present, the concrete deferred-
 * mechanic reason (never silently dropped), and full provenance — same shape
 * as F1's `buildOriginFeatDescription`.
 */
export function buildRemainingFeatDescription(unit: RemainingFeatUnit): string {
	return readFeatFlavor(unit.slug).body;
}
