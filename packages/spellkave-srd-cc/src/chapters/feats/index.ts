// Chapter generator: "Feats" (SRD 5.2.1), F0 (scaffold) + F1 (the four
// Origin feats, tiered delivery) + F2 (the remaining 13 General/Fighting
// Style/Epic Boon feats, identity-only quick-win completion) — see
// `ledger/feats.md` for the full chapter work-plan checklist and
// `ledger/character-creation.md`'s 2026-07-31 operator ruling for F1's
// DECIDED scope.
//
// F2 (`remaining-feats-units.ts`): 13 more `entity_definitions` rows, tagged
// `srd.feat` + `srd.feat.<general|fighting_style|epic_boon>`, IDENTITY ONLY
// — every SRD benefit here needs a substrate seam this package does not yet
// have (ability-score-raise action, attack/damage-roll intervention, or a
// spellcasting substrate; see that module's own header for the per-feat
// breakdown). No new mechanic rows, same posture F1 already established for
// Savage Attacker/Magic Initiate.
//
// F0 (scaffold): the registry entry (`../index.ts` — book order: SRD 5.2.1's
// free-rules ToC runs …Character Creation, Character Origins, Classes,
// Feats, Equipment… ; Feats registers immediately AFTER Classes and BEFORE
// Equipment, see `../index.ts`'s own registry entry), the coverage
// renderer, and provenance-only units for the chapter's framing prose
// (`feats.md:7-17`, § Parts of a Feat).
//
// F1 (the four Origin feats — THIS slice's real content): 4
// `entity_definitions` rows (`srd/feat/<slug>`, `feats-units.ts`), tagged
// `srd.feat` + `srd.feat.origin`, descriptions generated from
// Feat.json/FeatBenefit.json + the markdown's own benefit labels (pinned
// quirks: Alert's `initative` pk typo, Magic Initiate's "Level One Spell" /
// "Level 1 Spell" divergence — both `feats-units.ts`'s own header). Mechanics
// tiered by substrate reach (operator ruling):
//   - Skilled — FULLY MECHANIZED: `skilled-units.ts`'s own header (identity +
//     grant SHAPE + a proof-hero grant of one concrete skill triple, marked
//     authorial choice).
//   - Alert — PARTIAL: `alert-units.ts`'s own header (identity + a new gate
//     capability + an unconsumed capability-gated Initiative PB idiom;
//     wiring deferred as a composition-point finding, Initiative Swap
//     deferred entirely).
//   - Savage Attacker / Magic Initiate — IDENTITY + DEFERRED-WITH-OWNER: no
//     reroll-intervention wiring this slice (anchor:
//     `ledger/designs/finding-58-post-roll-reroll-intervention.md` — don't
//     improvise, per the ruling) and no spellcasting substrate (owner: a
//     future classes/spells chapter), respectively.
//
// `ChapterUnitSummary.kind` sentinel reuse (character-creation/index.ts's
// own header first established this widening): `"provenance_only"` for
// pure-prose/later-slice pointers, `"idiom_only"` for a real TS builder with
// no manifest row (Alert's PB term; Skilled's documented grant shape),
// `"deferred_with_owner"` for an explicit no-mechanic-yet verdict (Savage
// Attacker, Magic Initiate, Alert's Initiative Swap half).

import {
	type ChapterReaderProseResult,
	type ReaderSubjectAttachment,
	renderReaderProseForDocuments,
} from "../../compendium-metadata";
import { driveDefineWithSrdText, markdownHeadingBlock } from "../../text";
import type { ChapterUnitSummary } from "../chapter-types";
import { driveUnitFragment, driveUnitScene, type VerbCall } from "../verb-runner";
import { ALERT_CAPABILITY_ID } from "./alert-units";
import { ASI_CAPABILITY_ID, ASI_POINTS_RESOURCE_ID, buildAsiMechanicsFragment } from "./asi-units";
import {
	buildOriginFeatDescription,
	buildOriginFeatUnits,
	type OriginFeatUnit,
} from "./feats-units";
import {
	buildRemainingFeatDescription,
	buildRemainingFeatUnits,
	type RemainingFeatUnit,
	remainingFeatCategoryTag,
} from "./remaining-feats-units";
import { SKILLED_PROOF_SKILL_SLUGS, skilledProofSkillCapabilityIds } from "./skilled-units";

export const BUNDLE_ID = "srd";

const PARTS_OF_A_FEAT_ANCHOR =
	'feats.md:7-17 (§ Parts of a Feat: Category/Prerequisite/Benefit/Repeatable — "the description of a ' +
	'feat contains the following parts")';
const LATER_SLICES_ANCHOR =
	"feats.md:59-183 (General :59, Fighting Style :83, Epic Boon :109 — 13 more feats; F2 ships their " +
	"identity, see remaining-feats-units.ts and this fragment's own mechanicVerdictUnits for the " +
	"per-feat deferred-mechanic verdicts)";

const ALERT_INITIATIVE_PROFICIENCY_ANCHOR = "feats.md:27 (Alert § Initiative Proficiency)";
const ALERT_INITIATIVE_SWAP_ANCHOR = "feats.md:29 (Alert § Initiative Swap)";
const SAVAGE_ATTACKER_ANCHOR = "feats.md:49 (Savage Attacker's damage-reroll benefit)";
const MAGIC_INITIATE_SPELLCASTING_ANCHOR =
	"feats.md:37-43 (Magic Initiate's three spellcasting benefits)";

export interface FeatsOutput {
	/** relPath (under `fixtures/base/feats/`) -> content — ONE FILE PER FEAT (per-entity fixture layout, operator directive 2026-08-06): `<slug>.toml`, e.g. `alert.toml` / `grappler.toml` / `boon-of-truesight.toml`. */
	fragments: Record<string, string>;
	units: ChapterUnitSummary[];
}

function featFileHeader(displayName: string, sourceNote: string): string {
	return [
		"# GENERATED by src/chapters/feats/index.ts — DO NOT EDIT BY HAND.",
		"# Regenerate: pnpm --filter @spellkave/srd-cc run generate",
		"#",
		`# Feats chapter: ${displayName}. ${sourceNote}`,
		"",
		"",
	].join("\n");
}

/** One Origin feat other than Alert (Magic Initiate / Savage Attacker / Skilled) — a single `entity_definitions` row, own file, no cross-references inside its own scene. */
async function buildOriginFeatFragment(
	unit: OriginFeatUnit,
): Promise<{ path: string; toml: string; units: ChapterUnitSummary[] }> {
	const body = await driveDefineWithSrdText(
		BUNDLE_ID,
		{
			toolName: "spellkave_define_entity_type",
			label: `entity:feat/${unit.slug}`,
			params: {
				bundle: BUNDLE_ID,
				id: `feat/${unit.slug}`,
				display_name: unit.displayName,
				description: buildOriginFeatDescription(unit),
				tags: ["srd.feat", "srd.feat.origin"],
			},
		},
		{
			targetRef: unit.entityId,
			// Feat.json abbreviates several entries to "You gain the following
			// benefits.". The canonical chapter block keeps every labelled
			// benefit and repeatability rule; the entity's short runtime
			// description above remains independently source-derived.
			extracted: markdownHeadingBlock("feats.md", unit.displayName),
		},
	);
	return {
		path: `base/feats/${unit.slug}.toml`,
		toml:
			featFileHeader(
				unit.displayName,
				"F1 (ledger/feats.md's Origin tier) — identity, cache/open5e/Feat.json + FeatBenefit.json " +
					"(quirks pinned in feats-units.ts's own header).",
			) + body,
		units: [{ kind: "entity_definitions", id: unit.entityId, sourcePk: unit.sourcePk }],
	};
}

/** Alert — its own `entity_definitions` row PLUS its own (unconsumed) gate capability, same file: both rows belong to the SAME feat concept and cross-reference nothing outside this scene. */
async function buildAlertFragment(
	unit: OriginFeatUnit,
): Promise<{ path: string; toml: string; units: ChapterUnitSummary[] }> {
	const capabilityCall: VerbCall = {
		toolName: "spellkave_define_capability",
		label: "capability:feat/alert",
		params: {
			bundle: BUNDLE_ID,
			id: "feat/alert",
			actor_kind: "entity",
			display_name: "Feat: Alert (Initiative Proficiency)",
			description:
				"Gate capability for Alert's 'Initiative Proficiency' benefit (PB added to the " +
				"Initiative roll). Composed by alert-units.ts's alertInitiativeRollExpr — NOT wired " +
				"into any live order_roll_source row this slice (composition-point finding, that " +
				"module's own header: the only real order_roll_source rows in this package are owned " +
				"by the Playing the Game chapter's proof scene). SRD: cache/markdown/feats.md:27.",
			tags: ["srd.feat", "srd.feat.origin"],
		},
	};
	const entityCall: VerbCall = {
		toolName: "spellkave_define_entity_type",
		label: `entity:feat/${unit.slug}`,
		params: {
			bundle: BUNDLE_ID,
			id: `feat/${unit.slug}`,
			display_name: unit.displayName,
			description: buildOriginFeatDescription(unit),
			tags: ["srd.feat", "srd.feat.origin"],
		},
	};
	const body = await driveDefineWithSrdText(BUNDLE_ID, entityCall, {
		targetRef: unit.entityId,
		// See buildOriginFeatFragment: `srd.text` is the complete canonical
		// reader block, while the gameplay description remains unchanged.
		extracted: markdownHeadingBlock("feats.md", unit.displayName),
		extraCalls: [capabilityCall],
	});
	return {
		path: `base/feats/${unit.slug}.toml`,
		toml:
			featFileHeader(
				unit.displayName,
				"F1 (ledger/feats.md's Origin tier) — identity PLUS its own unconsumed Initiative Proficiency " +
					"gate capability (alert-units.ts's own header; composition-point finding, not wired).",
			) + body,
		units: [
			{ kind: "entity_definitions", id: unit.entityId, sourcePk: unit.sourcePk },
			{ kind: "capability_definitions", id: ALERT_CAPABILITY_ID, sourcePk: unit.sourcePk },
		],
	};
}

/** One F2 remaining feat (General / Fighting Style / Epic Boon) — a single `entity_definitions` row, own file. */
async function buildRemainingFeatFragment(
	unit: RemainingFeatUnit,
): Promise<{ path: string; toml: string; units: ChapterUnitSummary[] }> {
	const body = await driveDefineWithSrdText(
		BUNDLE_ID,
		{
			toolName: "spellkave_define_entity_type",
			label: `entity:feat/${unit.slug}`,
			params: {
				bundle: BUNDLE_ID,
				id: `feat/${unit.slug}`,
				display_name: unit.displayName,
				description: buildRemainingFeatDescription(unit),
				tags: ["srd.feat", remainingFeatCategoryTag(unit.category)],
			},
		},
		{
			targetRef: unit.entityId,
			// The F2 entities are identity-only mechanically, but their public
			// reference text still carries the full SRD feat block.
			extracted: markdownHeadingBlock("feats.md", unit.displayName),
		},
	);
	return {
		path: `base/feats/${unit.slug}.toml`,
		toml:
			featFileHeader(
				unit.displayName,
				unit.slug === "ability-score-improvement"
					? `F2 (${unit.category} Feat) — MECHANIZED (${unit.deferredReason}).`
					: `F2 (${unit.category} Feat, ledger/feats.md's "remaining-feats" coverage unit) — identity only; ${unit.deferredReason}.`,
			) + body,
		units: [{ kind: "entity_definitions", id: unit.entityId, sourcePk: unit.sourcePk }],
	};
}

/**
 * F1's shipped identity PLUS F2's own remaining 13 feats (`ledger/feats.md`'s
 * "remaining-feats" coverage unit): ONE FILE PER FEAT (per-entity fixture
 * layout, operator directive 2026-08-06) — 17 files total under
 * `base/feats/`, `<slug>.toml`. Alert's own gate capability rides in the
 * SAME file as its owning feat entity (not a separate "entity" a DM would
 * browse independently). Coverage/ledger unit granularity is UNCHANGED —
 * only the rendered file layout is per-entity.
 */
async function buildFeatFragments(): Promise<{
	fragments: Record<string, string>;
	units: ChapterUnitSummary[];
}> {
	const feats = buildOriginFeatUnits();
	const remainingFeats = buildRemainingFeatUnits();

	const alertUnit = feats.find((unit) => unit.slug === "alert");
	if (alertUnit === undefined) {
		throw new Error(
			"feats/index: no 'alert' Origin feat unit — buildOriginFeatUnits() shape changed.",
		);
	}
	const otherOriginFeats = feats.filter((unit) => unit.slug !== "alert");

	const results = await Promise.all([
		buildAlertFragment(alertUnit),
		...otherOriginFeats.map((unit) => buildOriginFeatFragment(unit)),
		...remainingFeats.map((unit) => buildRemainingFeatFragment(unit)),
	]);

	const fragments: Record<string, string> = {};
	const units: ChapterUnitSummary[] = [];
	for (const result of results) {
		fragments[result.path] = result.toml;
		units.push(...result.units);
	}
	return { fragments, units };
}

/**
 * F0's provenance-only units: the "Parts of a Feat" framing prose and a
 * single pointer at F2's own 13 General/Fighting Style/Epic Boon feats
 * (shipped as identity, `provenanceOnlyUnits`' own id kept for continuity
 * even though the pointed-at feats are no longer "not yet planned").
 */
function provenanceOnlyUnits(): ChapterUnitSummary[] {
	return [
		{ kind: "provenance_only", id: "feats/parts-of-a-feat", sourcePk: PARTS_OF_A_FEAT_ANCHOR },
		{ kind: "provenance_only", id: "feats/later-slices", sourcePk: LATER_SLICES_ANCHOR },
	];
}

/**
 * F1's honest per-mechanic verdict units, one per feat's deferred/idiom-only
 * half — distinct from the shipped `entity_definitions`/`capability_
 * definitions` rows above (`feats.md` anchors cited per benefit, not per
 * feat, so a reader can tell exactly which SRD sentence is proven vs.
 * deferred).
 */
function mechanicVerdictUnits(): ChapterUnitSummary[] {
	const skillTriple = skilledProofSkillCapabilityIds().join(", ");
	return [
		{
			kind: "idiom_only",
			id: "feats/skilled/proof-grant-shape",
			sourcePk:
				'feats.md:55 ("proficiency in any combination of three skills or tools of your choice" — ' +
				"prose-only choice structure, not field-decomposed in FeatBenefit.json). Proof: the hero " +
				`(proof-scene/calls/identity.ts) is granted the AUTHORIAL-CHOICE triple [${skillTriple}] ` +
				`(slugs: ${SKILLED_PROOF_SKILL_SLUGS.join(", ")}) — real, already-consumed srd/skill/* ` +
				"capabilities (skill-proficiency-units.ts's skillCheckExpr), never a new mechanic.",
		},
		{
			kind: "idiom_only",
			id: "feats/alert/initiative-proficiency",
			sourcePk:
				`${ALERT_INITIATIVE_PROFICIENCY_ANCHOR} — alert-units.ts's alertInitiativeRollExpr, gated ` +
				"on this fragment's own srd/feat/alert capability. NOT wired into any live " +
				"order_roll_source row (composition-point finding: the only real rows are owned by " +
				"Playing the Game's proof scene, alert-units.ts's own header).",
		},
		{
			kind: "deferred_with_owner",
			id: "feats/alert/initiative-swap",
			sourcePk:
				`${ALERT_INITIATIVE_SWAP_ANCHOR} — deferred entirely, no design doc yet (a post-roll ` +
				"swap-two-participants' -initiative intervention; description metadata only).",
		},
		{
			kind: "deferred_with_owner",
			id: "feats/savage-attacker/reroll",
			sourcePk:
				`${SAVAGE_ATTACKER_ANCHOR} — owner: ledger/designs/finding-58-post-roll-reroll-` +
				"intervention.md (RESOLVED substrate, deliberately not wired here per the operator " +
				"ruling — don't improvise).",
		},
		{
			kind: "deferred_with_owner",
			id: "feats/magic-initiate/spellcasting",
			sourcePk: `${MAGIC_INITIATE_SPELLCASTING_ANCHOR} — owner: a future classes/spells chapter (no spellcasting substrate yet).`,
		},
		// F2: one deferred_with_owner unit per remaining feat EXCEPT ASI
		// (mechanized lane L4 — asi-units.ts). The concrete reason matches
		// remaining-feats-units.ts's DEFERRED_REASON_BY_SLUG.
		...buildRemainingFeatUnits()
			.filter((unit) => unit.slug !== "ability-score-improvement")
			.map((unit) => ({
				kind: "deferred_with_owner" as const,
				id: `feats/${unit.slug}/mechanic`,
				sourcePk: `${unit.markdownAnchor} — ${unit.deferredReason}`,
			})),
		{
			kind: "idiom_only",
			id: "feats/ability-score-improvement/mechanic",
			sourcePk:
				`feats.md:61-67 — lane L4: ${ASI_POINTS_RESOURCE_ID} + six raise actions gated on ` +
				`${ASI_CAPABILITY_ID} (asi-units.ts; bead sk-609b.5 (design trail)).`,
		},
	];
}

/** Behavior flag (AGENTS.md chapter-registry entry): F1 ships real mechanic rows (the Alert gate capability; Skilled's proof grant of already-mechanized skill capabilities), not identity-only content. */
export const HAS_BEHAVIOR = true;

export async function generateFeats(): Promise<FeatsOutput> {
	const identity = await buildFeatFragments();
	const asi = await buildAsiMechanicsFragment();
	return {
		fragments: {
			...identity.fragments,
			"base/feats/asi-mechanics.toml": asi.toml,
		},
		units: [...provenanceOnlyUnits(), ...identity.units, ...asi.units, ...mechanicVerdictUnits()],
	};
}

/**
 * This chapter's own reader-prose fragment(s) — `ChapterEntry.generateReaderProse`
 * (`../index.ts`). Thin wrapper: the shared per-document render logic lives
 * in `renderReaderProseForDocuments` (`compendium-metadata.ts`).
 */
export function generateFeatsReaderProse(
	attachments: readonly ReaderSubjectAttachment[],
): Promise<ChapterReaderProseResult> {
	return renderReaderProseForDocuments(["feats"], attachments);
}
