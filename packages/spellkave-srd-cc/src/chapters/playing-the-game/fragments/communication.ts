import type { ChapterUnitSummary } from "../../chapter-types";
import { driveUnitScene, type VerbCall } from "../../verb-runner";
import { BUNDLE_ID } from "../constants";
import { CREATURE_NICHE_TAG } from "../creature-type-units";

/**
 * Baseline srd communicate vocabulary — Level-Up DM Arc S4a (D9,
 * `packages/spellkave-srd-cc/ledger/designs/level-up-dm-arc-plan.md` §5 "S4"
 * step 2, §4 "Communication"). srd-cc authors its OWN speech-act/outcome/
 * affordance/niche chain under `srd/`, mirroring the SAME self-sufficiency
 * move `fragments/sensing.ts` already made for the sensing verb class
 * (finding #49): never reference `core/*`/`phandelver/*` (package
 * self-sufficiency invariant, AGENTS.md), author an SRD-OWN equivalent
 * instead. UNLIKE sensing (a passive PERCEIVE-class chain with no
 * `action_definitions` row, auto-materialised by `subscribe_perceiver`),
 * communicate is MANIPULATION-dispatched — a real actor-initiated action a
 * capability gates, shaped identically to `core/assert`
 * (`world-fixtures/core/base/affordances.toml`) and this package's own
 * `srd/persuade` sister precedent (`world-fixtures/srd/base/persuasion.toml`,
 * `@spellkave/srd`'s `author-persuasion.ts`): a flavor-only "speak" baseline
 * with an EMPTY consequence (`core/assert/success` carries zero
 * `consequence_frame_writes` — MF-VAL-263's budget requirement is narrowed to
 * self-eligible REACTIONS only, so a plain other-directed action needs
 * neither `spends_channel` nor a `ModifyResource`).
 *
 * Every future dialogue speech act (the DM level-up/steady-advance,
 * level-up/daring-advance options authored in `src/author/dm/aldwin.ts`)
 * follows this SAME chain shape (its own `communication_speech_act_id`, its
 * own narrow niche) rather than reusing these rows verbatim — exactly how
 * `srd/persuade` does not reuse `core/assert`'s rows either, just its
 * pattern. This fragment's OWN reusable contribution is the chain SHAPE plus
 * one concrete, ungated, "any creature can be addressed" baseline instance
 * (mirrors `core/social_communication`'s breadth) that future flavor-only
 * dialogue can grant directly instead of re-deriving the shape from scratch.
 *
 * COMMUNICATION NAMESPACE GROUNDING (why the affordance stays entity-directed,
 * never falls back to the place sentinel): a communicate affordance surfaces
 * under the `communication.` interaction-descriptor namespace ONLY when its
 * `outcome_templates` row carries a non-empty `communication_speech_act_id`
 * (`server/src/world_interaction/affordance_materialiser/reconcile/
 * candidates.rs:915`'s `resolve_typed_descriptor`, constant defined at
 * `.../affordance_materialiser/mod.rs:814`,
 * `const COMMUNICATION_NAMESPACE: &str = "communication."`). The place
 * sentinel is admitted for a communicate niche ONLY when the niche is
 * actor-provided (`niche_is_actor_provided`, e.g. `fragments/speech.ts`'s
 * `srd/speak-aloud`, which has no addressee — ADR-0137, amending ADR-0033
 * §D-2); THIS chain's `srd/niche/communicable` niche is entity-provided (the
 * default `provider`, never set to `"actor"` here), so the sentinel stays
 * excluded for it and the affordance stays entity-directed
 * (`candidates.rs:57`) — so setting this field is the ONLY
 * lever, not a convention. `spellkave_define_action_verb` (the smart-default
 * verb this chain otherwise uses throughout) has NO param for this field —
 * only the heavier `spellkave_define_behavior` (spell/AoE-shaped, wrong fit
 * for a plain deterministic gate) does. Rather than reshape this simple
 * chain around a spell-behavior verb, this fragment follows `verb-runner.ts`'s
 * OWN established "finding #20" idiom (`bundleHeaderCalls`): author the full
 * chain via the fitting smart verb first, then a SECOND `spellkave_write_rows`
 * call UPSERTS the SAME `outcome_templates` row (natural-keyed on
 * `outcome_template_id`, replaces in place) re-stating exactly the fields
 * `spellkave_define_action_verb` itself would have written
 * (`bundle_id`/`display_name`/`outcome_bool`/`manipulation_action_id`) plus
 * the one new field — never a partial/guessed row.
 *
 * Niche breadth: `core/social_communication`'s own predicate reads an
 * actor-carried `core/grounded` boolean this package has no equivalent
 * fact for (and inventing one for this alone would be its own unfounded
 * addition); this chain reuses the ALREADY-proven, ALREADY-broad
 * `srd.creature` tag (`creature-type-units.ts`'s `CREATURE_NICHE_TAG`, the
 * same niche `srd/claim-victory` already targets) instead — "any creature"
 * is a faithful, already-grounded stand-in for "any grounded entity" here.
 */
const COMMUNICATION_NAMESPACE_ANCHOR =
	"server/src/world_interaction/affordance_materialiser/reconcile/candidates.rs:31-35,462-468; " +
	'mod.rs:802 (COMMUNICATION_NAMESPACE = "communication."); ADR-0033 §D-2';

export const BASELINE_COMMUNICATE_NICHE_ID = `${BUNDLE_ID}/niche/communicable`;
export const BASELINE_COMMUNICATE_CAPABILITY_ID = `${BUNDLE_ID}/action/communicate/assert`;
export const BASELINE_COMMUNICATE_ACTION_ID = `${BUNDLE_ID}/communicate/assert`;
export const BASELINE_COMMUNICATE_OUTCOME_ID = `${BASELINE_COMMUNICATE_ACTION_ID}/outcome`;
export const BASELINE_COMMUNICATE_AFFORDANCE_ID = `${BASELINE_COMMUNICATE_ACTION_ID}/affordance`;
/** The speech-act id itself — by this chain's own convention (mirrors both
 * `core/assert` and `srd/persuade`) it is simply the action's own id. */
export const BASELINE_COMMUNICATE_SPEECH_ACT_ID = BASELINE_COMMUNICATE_ACTION_ID;

/**
 * Re-state the outcome_templates row `spellkave_define_action_verb` itself
 * would have authored for a call shaped `{id, display_name, bundle}` with NO
 * `outcome_expression_source` — see this module's own header for why a
 * second call is needed at all (no verb accepts `communication_speech_act_id`
 * for a plain action-verb chain). Exported for reuse by every OTHER
 * entity-directed speech act this package authors (e.g. `fragments/speech.ts`'s
 * `srd/speak-to`/`srd/speak-to-room`) — the two-call idiom itself is the
 * reusable shape, never the rows.
 */
export function communicationSpeechActUpsertCall(args: {
	actionId: string;
	displayName: string;
	label: string;
}): VerbCall {
	const outcomeId = `${args.actionId}/outcome`;
	return {
		toolName: "spellkave_write_rows",
		label: args.label,
		params: {
			bundle: BUNDLE_ID,
			kind: "outcome_templates",
			rows: [
				{
					outcome_template_id: outcomeId,
					bundle_id: BUNDLE_ID,
					display_name: args.displayName,
					outcome_bool: true,
					manipulation_action_id: args.actionId,
					communication_speech_act_id: args.actionId,
				},
			],
		},
	};
}

export async function buildBaselineCommunicationFragment(): Promise<{
	toml: string;
	units: ChapterUnitSummary[];
}> {
	const displayName = "Assert";
	const calls: VerbCall[] = [
		// sk-0m4.4 / operator ruling 2026-08-17: speech anchors on FIGURES, not
		// rooms. `provider: "entity"` is the D2(c) axis — a candidate's own
		// srd.creature tag satisfies admission; r_manipulate skips
		// attachment_presence entirely (no spatial_niche_attachment, and no
		// half-built place-prohibition hook). Authored via write_rows because
		// spellkave_define_niche has no `provider` param (attacks.ts /
		// generic.ts precedent).
		{
			toolName: "spellkave_write_rows",
			label: "niche:communicable",
			params: {
				bundle: BUNDLE_ID,
				kind: "niche_definitions",
				rows: [
					{
						niche_id: BASELINE_COMMUNICATE_NICHE_ID,
						bundle_id: BUNDLE_ID,
						display_name: "Communicable (entity-provided)",
						description:
							"Any living-or-at-least-creature body that can be addressed by a communicate " +
							"speech act — the srd-own baseline communication TARGET niche. Entity-provided " +
							`(sk-0m4.4): a candidate's own ${CREATURE_NICHE_TAG} tag satisfies admission ` +
							"directly, no spatial_niche_attachment, no per-room opt-in. Place-level speech " +
							"prohibitions (underwater, silence) are a later separate mechanism — this row " +
							"is not a hook for them.",
						predicate_source: `target.has_niche('${CREATURE_NICHE_TAG}')`,
						provider: "entity",
					},
				],
			},
		},
		{
			toolName: "spellkave_define_capability",
			label: "capability:communicate-assert",
			params: {
				id: "action/communicate/assert",
				actor_kind: "entity",
				display_name: "Communicate",
				description:
					"Actor performs a deterministic, flavor-only speech act (no mechanical effect).",
				tags: ["srd.action"],
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: "action:communicate-assert",
			params: {
				id: "communicate/assert",
				required_capability: BASELINE_COMMUNICATE_CAPABILITY_ID,
				niche_id: BASELINE_COMMUNICATE_NICHE_ID,
				display_name: displayName,
				description:
					"Baseline srd communicate primitive (D9, level-up-dm-arc-plan.md §4/§5 S4): a deterministic " +
					'speech act directed at any creature (self-sufficiency chain, mirrors the "core" bundle\'s ' +
					"own Assert action). No mechanical consequence: purely a flavor line future dialogue content " +
					"can grant directly, or pattern-copy for its own distinct speech act (this package's own " +
					"srd/persuade-shaped dialogue options, e.g. the DM level-up/* actions, author THEIR OWN " +
					"communication_speech_act_id rather than reusing this one).",
				self_eligible: false,
				self_only: false,
				cost_time_ms: 100,
				// No `tags` here: a decorative "communication" classification tag has
				// no registered `tag_value_definitions` row and no consumer (MF-VAL-300)
				// — the CLAUDE.md "vocabulary copied without a known consumer is cargo
				// cult" rule. The structural signal (communication_speech_act_id below)
				// already carries the real, consumed meaning.
			},
		},
		communicationSpeechActUpsertCall({
			actionId: BASELINE_COMMUNICATE_ACTION_ID,
			displayName,
			label: "communication-speech-act:communicate-assert",
		}),
	];

	const body = await driveUnitScene(BUNDLE_ID, calls);

	const units: ChapterUnitSummary[] = [
		{ kind: "niche_definitions", id: BASELINE_COMMUNICATE_NICHE_ID, sourcePk: "" },
		{ kind: "capability_definitions", id: BASELINE_COMMUNICATE_CAPABILITY_ID, sourcePk: "" },
		{ kind: "action_definitions", id: BASELINE_COMMUNICATE_ACTION_ID, sourcePk: "" },
		{ kind: "outcome_templates", id: BASELINE_COMMUNICATE_OUTCOME_ID, sourcePk: "" },
		{ kind: "affordance_templates", id: BASELINE_COMMUNICATE_AFFORDANCE_ID, sourcePk: "" },
	];

	const header = [
		"# GENERATED by src/chapters/playing-the-game/fragments/communication.ts — DO NOT EDIT BY HAND.",
		"# Regenerate: pnpm --filter @spellkave/srd-cc run generate",
		"#",
		"# Level-Up DM Arc S4a (D9, ledger/designs/level-up-dm-arc-plan.md §4/§5",
		"# 'S4' step 2): baseline srd-own communicate vocabulary — speech-act id,",
		"# outcome (carrying communication_speech_act_id so candidate selection",
		"# stays entity-directed, never the place sentinel — ADR-0033 §D-2),",
		"# affordance, and niche (reusing srd.creature, this package's already-",
		"# broad creature tag; sk-0m4.4: provider=entity, no place attachment).",
		"# Self-sufficiency chain shape-mirrored from the",
		'# "core" bundle\'s own baseline Assert action and communication niche',
		"# (never referenced directly — package invariant). A reusable BASE",
		"# fragment: future dialogue content (e.g. the DM's own level-up/* speech",
		"# acts, src/author/dm/aldwin.ts) authors its OWN distinct",
		"# speech-act id/capability/niche following this SAME chain shape,",
		"# exactly like srd/persuade does not reuse this baseline's rows either.",
		"",
		`# anchor: ${COMMUNICATION_NAMESPACE_ANCHOR}`,
		"",
		"",
	].join("\n");
	return { toml: header + body, units };
}
