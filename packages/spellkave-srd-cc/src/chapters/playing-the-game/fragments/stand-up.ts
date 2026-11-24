import type { AuthorTarget } from "@spellkave/tool-authoring";

import type { ChapterUnitSummary } from "../../chapter-types";
import { driveUnitScene, type VerbCall } from "../../verb-runner";
import { MOVEMENT_CHANNEL_ID } from "../action-economy-units";
import { BUNDLE_ID } from "../constants";
import { PRONE_CONDITION_ID } from "./conditions";

export const STAND_UP_ACTION_LOCAL_ID = "movement/stand-up";
export const STAND_UP_ACTION_ID = `${BUNDLE_ID}/${STAND_UP_ACTION_LOCAL_ID}`;
export const STAND_UP_CAPABILITY_ID = `${BUNDLE_ID}/action/stand-up`;
export const STAND_UP_NICHE_ID = `capability:${STAND_UP_CAPABILITY_ID}`;
/** Half of `STANDARD_ROUND_MS` (6000): SRD "half your Speed, rounded down" expressed as fiction time, not distance. */
export const STAND_UP_COST_MS = 3000;

/**
 * Standing up from Prone (`cache/markdown/rules-glossary.md:1183-1189`,
 * Prone [Condition] > Restricted Movement): "Your only movement options are
 * to crawl or to spend an amount of movement equal to half your Speed
 * (round down) to right yourself and thereby end the condition. If your
 * Speed is 0, you can't right yourself."
 *
 * sk-0m4.123 part 3 (the bead this fragment closes out). Parts 1+2 shipped
 * the cumulative per-turn movement budget (`srd/economy_channel/movement`,
 * `action-economy-units.ts`) this action debits. `STAND_UP_COST_MS` (3000)
 * is a FIXED half-pool spend, not a derived half-of-remaining-budget: the
 * SRD's "half your Speed" is half the actor's movement-conversion rate, and
 * the channel's own conversion formula (`movement-channel-budget.md`) is
 * built so that a full pool (`pool_ms_per_round`, 6000) buys exactly one
 * Speed's worth of movement — so half the pool buys exactly half Speed,
 * regardless of the actor's own effective Speed value. This is the SAME
 * "attach a fixed cost to a channel" shape `action-economy.md`'s own
 * "Attach a cost" section documents (`spends_channel` + a non-zero, non-full
 * `cost_time_ms`) — no new primitive, unlike Dash/Action Surge's
 * `ModifyChannel` grant shape, because Stand Up only ever SPENDS, never
 * grants.
 *
 * Gated on `actor.status('srd/condition/prone') == true` (the `HasStatus`
 * DSL predicate — same shape martial-features-units.ts's Rage/Bardic gates
 * already use) so the affordance only offers itself while Prone; removes
 * Prone via `RemoveCondition` with `source_match: "Any"` — Prone is applied
 * as a PRIMARY row by both producers in this bundle (`fragments/drop-
 * prone.ts`'s self-drop and the Topple weapon-mastery rider's inflicted
 * knockdown, `weapon-mastery-riders-units.ts`), never `implies`-cascaded, so
 * `RemoveCondition`'s own `primary_condition_matches` guard (`remove_
 * condition.rs`) can target either producer's row directly — the SAME
 * "target the primary row" shape Poisoned's own description documents
 * (`conditions-units.ts`). `source_match: "Any"` rather than `Exact`: the
 * standing creature doesn't care which write knocked it down, only that it
 * is no longer Prone.
 *
 * Landing this retires BOTH `expires_at_boundary` "Prone lapses at the
 * victim's own next turn start" simplifications (`fragments/drop-prone.ts`,
 * `weapon-mastery-riders-units.ts`) — Prone now ends the way the SRD says it
 * does, by spending movement, not by a turn-boundary timeout.
 */
export async function buildStandUpFragment(
	target?: AuthorTarget,
): Promise<{ toml: string; units: ChapterUnitSummary[] }> {
	const calls: VerbCall[] = [
		{
			toolName: "spellkave_write_rows",
			label: "niche:stand-up",
			params: {
				bundle: BUNDLE_ID,
				kind: "niche_definitions",
				rows: [
					{
						niche_id: STAND_UP_NICHE_ID,
						bundle_id: BUNDLE_ID,
						display_name: "Stand Up (self)",
						description:
							"actor-carried-verbs D1/D7 (sk-rd0): revives Stand Up as a universal self-verb " +
							"— see fragments/dodge.ts's own header for the full V1 dead-content finding this " +
							"applies identically to.",
						predicate_source: "",
						provider: "actor",
					},
				],
			},
		},
		{
			toolName: "spellkave_define_capability",
			label: "capability:stand-up",
			params: {
				bundle: BUNDLE_ID,
				id: "action/stand-up",
				display_name: "Stand Up",
				description:
					"Spend half your Speed's worth of movement to end your own Prone condition " +
					"(rules-glossary.md:1183-1189, Prone [Condition] > Restricted Movement).",
				actor_kind: "entity",
				tags: ["srd.action"],
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: "action:stand-up",
			params: {
				bundle: BUNDLE_ID,
				id: STAND_UP_ACTION_LOCAL_ID,
				required_capability: STAND_UP_CAPABILITY_ID,
				niche_id: STAND_UP_NICHE_ID,
				display_name: "Stand Up",
				description:
					"Standing up from Prone costs half your Speed's worth of movement " +
					"(rules-glossary.md:1183-1189). Offered only while Prone; fails closed if the " +
					"movement budget can't cover it (the same 'not enough remaining Speed' rule the " +
					"SRD names).",
				predicate_source: `actor.status('${PRONE_CONDITION_ID}') == true`,
				self_eligible: true,
				self_only: true,
				spends_channel: MOVEMENT_CHANNEL_ID,
				cost_time_ms: STAND_UP_COST_MS,
				consequence: {
					description: "Remove the Prone condition from the acting creature.",
					frame_writes: [
						{
							RemoveCondition: {
								target_kind: "entity",
								target_ref: "Actor",
								condition_definition_id: PRONE_CONDITION_ID,
								source_match: "Any",
							},
						},
					],
				},
			},
		},
	];
	const body = await driveUnitScene(BUNDLE_ID, calls, target);
	const units: ChapterUnitSummary[] = [
		{ kind: "niche_definitions", id: STAND_UP_NICHE_ID, sourcePk: "" },
		{ kind: "capability_definitions", id: STAND_UP_CAPABILITY_ID, sourcePk: "" },
		{
			kind: "action_definitions",
			id: STAND_UP_ACTION_ID,
			sourcePk: "cache/markdown/rules-glossary.md:1183-1189",
		},
		{ kind: "consequence_templates", id: `${STAND_UP_ACTION_ID}/success`, sourcePk: "" },
		{ kind: "outcome_templates", id: `${STAND_UP_ACTION_ID}/outcome`, sourcePk: "" },
		{ kind: "affordance_templates", id: `${STAND_UP_ACTION_ID}/affordance`, sourcePk: "" },
	];
	const header = [
		"# GENERATED by src/chapters/playing-the-game/fragments/stand-up.ts — DO NOT EDIT BY HAND.",
		"# Regenerate: pnpm --filter @spellkave/srd-cc run generate",
		"#",
		"# Standing up from Prone, cache/markdown/rules-glossary.md:1183-1189",
		"# (Prone [Condition] > Restricted Movement). sk-0m4.123 part 3: spends a FIXED half-pool",
		"# (3000 ms) of srd/economy_channel/movement — the same 'attach a cost'",
		"# shape action-economy.md documents, no ModifyChannel grant here (Stand",
		"# Up only spends). Offered only while Prone",
		"# (actor.status('srd/condition/prone') == true); removes Prone via",
		"# RemoveCondition (source_match = Any — either producer's primary row).",
		"# Retires the expires_at_boundary Prone simplification this bead's own",
		"# parts 1+2 left in place (fragments/drop-prone.ts,",
		"# weapon-mastery-riders-units.ts).",
		'# actor-carried-verbs D1/D7 (sk-rd0): niche/stand-up\'s provider="actor"',
		"# row revives this as a universal self-verb.",
		"",
		"",
	].join("\n");
	return { toml: header + body, units };
}
