// Ability Score Improvement (General Feat, `feats.md:61-67`) — lane L4.
// OpenSpec playable-fighter-l1-20 D-2 six-row decomposition + D-4 paired
// derived writes. Design: `bead sk-609b.5 (design trail)`.
//
// Prefer macros at use time for roll modifiers (`docs/derived-values.md`).
// Snapshot dependents that MUST pair-write: srd/ac (DEX) and srd/hp (CON).

import { readResourceFlavor } from "../../flavor/read";
import { markdownHeadingBlock, srdTextAttachmentWriteCall, withSrdTextNamespace } from "../../text";
import type { ChapterUnitSummary } from "../chapter-types";
import { ABILITY_CODES, type AbilityCode } from "../playing-the-game/ability-units";
import { driveUnitScene, type VerbCall } from "../verb-runner";

export const BUNDLE_ID = "srd";

export const ASI_FEAT_SLUG = "ability-score-improvement";
export const ASI_FEAT_ENTITY_ID = `${BUNDLE_ID}/feat/${ASI_FEAT_SLUG}`;
/** Gate capability for the six raise actions — same path string as the feat entity; different table. */
export const ASI_CAPABILITY_ID = ASI_FEAT_ENTITY_ID;
export const ASI_CAPABILITY_LOCAL_ID = `feat/${ASI_FEAT_SLUG}`;

export const ASI_POINTS_LOCAL_ID = "asi_points";
export const ASI_POINTS_RESOURCE_ID = `${BUNDLE_ID}/${ASI_POINTS_LOCAL_ID}`;
export const ASI_POINTS_MAX = 2;
export const ASI_POINTS_MIN = 0;
export const ASI_POINTS_INITIAL = 0;

export const ASI_SCORE_CAP = 20;

export const ASI_MARKDOWN_ANCHOR = "feats.md:61-67";

export const ASI_CHOICE_GROUP_SUFFIX = "4/asi-or-feat";

/** `srd/<class>/4/asi-or-feat` — L4 ASI-or-General-Feat menu id. */
export function asiOrFeatChoiceGroup(classSlug: string): string {
	return `${BUNDLE_ID}/${classSlug}/${ASI_CHOICE_GROUP_SUFFIX}`;
}

export interface AsiAbilityRaise {
	code: AbilityCode;
	/** `str` / `dex` / … resource local id. */
	abilityLocalId: string;
	resourceId: string;
	actionLocalId: string;
	actionId: string;
	displayName: string;
}

const ABILITY_DISPLAY: Record<AbilityCode, string> = {
	str: "Strength",
	dex: "Dexterity",
	con: "Constitution",
	int: "Intelligence",
	wis: "Wisdom",
	cha: "Charisma",
};

/** The six +1-to-score raise actions (D-2). */
export function asiAbilityRaises(): AsiAbilityRaise[] {
	return ABILITY_CODES.map((code) => {
		const abilityLocalId = code;
		return {
			code,
			abilityLocalId,
			resourceId: `${BUNDLE_ID}/${abilityLocalId}`,
			actionLocalId: `asi/raise-${code}`,
			actionId: `${BUNDLE_ID}/asi/raise-${code}`,
			displayName: `ASI: Raise ${ABILITY_DISPLAY[code]}`,
		};
	});
}

/**
 * DSL int: 1 when `scoreExpr` is odd, else 0.
 * Uses truncating division remainder: `score - (score/2)*2`.
 */
export function oddScoreDeltaExpr(scoreExpr: string): string {
	return `cond((${scoreExpr}) - ((${scoreExpr}) / 2) * 2 == 1, 1, 0)`;
}

/**
 * AC paired-write delta when raising DEX by +1: +1 iff the pre-raise score
 * is odd (modifier band crosses on the next even score).
 */
export function asiAcDeltaForDexRaise(dexScoreExpr: string): string {
	return oddScoreDeltaExpr(dexScoreExpr);
}

/**
 * HP paired-write delta when raising CON by +1: +level iff pre-raise CON is
 * odd (retroactive Con-mod HP per current level).
 */
export function asiHpDeltaForConRaise(conScoreExpr: string, levelExpr: string): string {
	return `cond((${conScoreExpr}) - ((${conScoreExpr}) / 2) * 2 == 1, ${levelExpr}, 0)`;
}

export function asiRaiseGatePredicate(abilityResourceId: string): string {
	return (
		`actor.stat('${ASI_POINTS_RESOURCE_ID}') >= 1 && ` +
		`actor.stat('${abilityResourceId}') < ${ASI_SCORE_CAP}`
	);
}

const ASI_NICHE_ID = `capability:${ASI_CAPABILITY_ID}`;

function raiseFrameWrites(raise: AsiAbilityRaise): Record<string, unknown>[] {
	const writes: Record<string, unknown>[] = [
		{
			ModifyResource: {
				actor: "Actor",
				resource: ASI_POINTS_RESOURCE_ID,
				delta_source: "-1",
			},
		},
		{
			ModifyResource: {
				actor: "Actor",
				resource: raise.resourceId,
				delta_source: "1",
			},
		},
	];
	if (raise.code === "dex") {
		writes.push({
			ModifyResource: {
				actor: "Actor",
				resource: `${BUNDLE_ID}/ac`,
				// Read DEX *before* the +1 write is visible in the same frame:
				// ModifyResource ordinals apply in order; ability is already +1
				// here, so invert: after +1, the *previous* score was odd iff
				// the *current* (post-raise) score is even.
				// post=even ⇒ pre=odd ⇒ AC+1. post - (post/2)*2 == 0 ⇒ even.
				delta_source: `cond(actor.stat('${raise.resourceId}') - (actor.stat('${raise.resourceId}') / 2) * 2 == 0, 1, 0)`,
			},
		});
	}
	if (raise.code === "con") {
		writes.push({
			ModifyResource: {
				actor: "Actor",
				resource: `${BUNDLE_ID}/hp`,
				// Same post-raise parity flip as DEX→AC.
				delta_source: `cond(actor.stat('${raise.resourceId}') - (actor.stat('${raise.resourceId}') / 2) * 2 == 0, actor.stat('${BUNDLE_ID}/level'), 0)`,
			},
		});
	}
	return writes;
}

/**
 * Build the ASI mechanic fragment: points resource, gate capability, niche,
 * six raise actions. The feat entity itself stays in ability-score-improvement.toml
 * (identity); this fragment is `asi-mechanics.toml`.
 */
export async function buildAsiMechanicsFragment(): Promise<{
	toml: string;
	units: ChapterUnitSummary[];
}> {
	const raises = asiAbilityRaises();
	const scene: VerbCall[] = [
		{
			toolName: "spellkave_write_rows",
			label: "niche:asi",
			params: {
				bundle: BUNDLE_ID,
				kind: "niche_definitions",
				rows: [
					{
						niche_id: ASI_NICHE_ID,
						bundle_id: BUNDLE_ID,
						display_name: "Ability Score Improvement (self)",
						description:
							"Actor-carried ASI raise menu — six +1-to-score actions gated on srd/asi_points.",
						predicate_source: "",
						provider: "actor",
					},
				],
			},
		},
		{
			toolName: "spellkave_define_resource",
			label: `resource:${ASI_POINTS_LOCAL_ID}`,
			params: {
				id: ASI_POINTS_LOCAL_ID,
				display_name: "ASI Points",
				min_value: ASI_POINTS_MIN,
				max_value: ASI_POINTS_MAX,
				initial_value: ASI_POINTS_INITIAL,
				recovery_rule: "persistent",
				description: readResourceFlavor("asi-points").body,
				tags: [],
			},
		},
		{
			toolName: "spellkave_define_capability",
			label: `capability:${ASI_CAPABILITY_LOCAL_ID}`,
			params: {
				bundle: BUNDLE_ID,
				id: ASI_CAPABILITY_LOCAL_ID,
				actor_kind: "entity",
				display_name: "Feat: Ability Score Improvement",
				description:
					`Gate capability for ASI's six +1-to-score actions (${ASI_MARKDOWN_ANCHOR}). ` +
					"Granted when the feat is chosen at L4 (or any later ASI grant).",
				tags: ["srd.feat", "srd.feat.general"],
			},
		},
		...raises.map(
			(raise): VerbCall => ({
				toolName: "spellkave_define_action_verb",
				label: `action:${raise.actionLocalId}`,
				params: {
					bundle: BUNDLE_ID,
					id: raise.actionLocalId,
					required_capability: ASI_CAPABILITY_ID,
					niche_id: ASI_NICHE_ID,
					display_name: raise.displayName,
					description:
						`Increase ${ABILITY_DISPLAY[raise.code]} by 1 (max ${ASI_SCORE_CAP}), spending 1 ASI point ` +
						`(${ASI_MARKDOWN_ANCHOR}). ` +
						(raise.code === "dex"
							? "Paired write: srd/ac +1 when the Dexterity modifier band increases."
							: raise.code === "con"
								? "Paired write: srd/hp +level when the Constitution modifier band increases."
								: "Roll modifiers read live macros — no paired snapshot write."),
					self_eligible: true,
					self_only: true,
					cost_time_ms: 0,
					predicate_source: asiRaiseGatePredicate(raise.resourceId),
					consequence: {
						description: `Spend 1 ASI point and raise ${ABILITY_DISPLAY[raise.code]} by 1.`,
						frame_writes: raiseFrameWrites(raise),
					},
				},
			}),
		),
	];

	const body = await driveUnitScene(
		BUNDLE_ID,
		withSrdTextNamespace([
			...scene,
			srdTextAttachmentWriteCall({
				targetKind: "resource_definition",
				targetRef: `${BUNDLE_ID}/${ASI_POINTS_LOCAL_ID}`,
				extracted: markdownHeadingBlock("feats.md", "Ability Score Improvement"),
			}),
		]),
	);
	// pattern: advancement-choice
	const header = [
		"# GENERATED by src/chapters/feats/asi-units.ts — DO NOT EDIT BY HAND.",
		"# Regenerate: pnpm --filter @spellkave/srd-cc run generate",
		"# pattern: advancement-choice",
		"#",
		"# Ability Score Improvement mechanics (lane L4): srd/asi_points + six raise actions.",
		`# Design: bead sk-609b.5 (design trail). Source: cache/markdown/${ASI_MARKDOWN_ANCHOR}.`,
		"",
		"",
	].join("\n");

	const units: ChapterUnitSummary[] = [
		{ kind: "niche_definitions", id: ASI_NICHE_ID, sourcePk: ASI_MARKDOWN_ANCHOR },
		{ kind: "resource_definitions", id: ASI_POINTS_RESOURCE_ID, sourcePk: ASI_MARKDOWN_ANCHOR },
		{ kind: "capability_definitions", id: ASI_CAPABILITY_ID, sourcePk: ASI_MARKDOWN_ANCHOR },
		...raises.map((raise) => ({
			kind: "action_definitions" as const,
			id: raise.actionId,
			sourcePk: ASI_MARKDOWN_ANCHOR,
		})),
	];

	return { toml: header + body, units };
}
