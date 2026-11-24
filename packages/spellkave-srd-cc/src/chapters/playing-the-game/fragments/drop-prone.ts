import type { AuthorTarget } from "@spellkave/tool-authoring";

import type { ChapterUnitSummary } from "../../chapter-types";
import { driveUnitScene, type VerbCall } from "../../verb-runner";
import { BUNDLE_ID } from "../constants";
import { PRONE_CONDITION_ID } from "./conditions";
import { SPEED_WALK_RESOURCE_ID } from "./grid";

export const DROP_PRONE_ACTION_ID = `${BUNDLE_ID}/movement/drop-prone`;
export const DROP_PRONE_CAPABILITY_ID = `${BUNDLE_ID}/action/drop-prone`;
export const DROP_PRONE_NICHE_ID = `capability:${DROP_PRONE_CAPABILITY_ID}`;

/**
 * Dropping Prone (`cache/markdown/playing-the-game.md:957-959`, Slice B of
 * `ledger/designs/prone-free-action.md`): "On your turn, you can give
 * yourself the Prone condition ... without using an action or any of your
 * Speed, but you can't do so if your Speed is 0."
 *
 * Genuinely FREE — no `spends_channel`, no `ModifyResource` budget write —
 * now expressible because `MF-VAL-263` was rescoped (PR #2079, finding
 * finding #73's own addendum) to actions carrying reaction wiring
 * (`reaction_eligibility`/`reaction_trigger`); this action carries neither,
 * so the validator's self-triggered-reaction-loop protection (ADR-0050) does
 * not apply to it, and no budget write is required.
 *
 * Authored through `spellkave_define_action_verb` (the composite-fold verb),
 * NOT `spellkave_define_behavior` — the composer tool's own CLIENT-side
 * pre-check still errors on `target: 'self'` without a `cost` (finding #76's
 * own follow-up note), a tool-side gap orthogonal to the now-fixed validator.
 *
 * `predicate_source` gates on `actor.stat('srd/speed-walk') > 0` (the "can't
 * do so if your Speed is 0" clause) — an entity-shaped fact read from world
 * state, per the design maxims doc's "parameters live in the world, not in
 * the call" rule, never a baked-true gate.
 *
 * Stand-up counterpart (Restricted Movement's other half — spend half Speed,
 * rounded down, to end the condition) now ships as `srd/movement/stand-up`
 * (`fragments/stand-up.ts`, sk-0m4.123 part 3). Applied Prone therefore no
 * longer carries `expires_at_boundary` — it is REAL now: Prone persists
 * until Stand Up spends the movement budget to end it (or another cure
 * removes it), the way the SRD says it does. This retires the deliberate
 * "lapses at the prone creature's own next turn start" simplification
 * (operator ruling 2026-08-30, sk-0m4.120.50) that stood in for it while the
 * movement-budget primitive (`srd/economy_channel/movement`) did not exist
 * yet.
 *
 * Correction (Slice B item 4, live-proof investigation): `spellkave_write_
 * rows` authors MANIFEST rows only — it cannot delete a RUNTIME `target_
 * condition` row a prior action's `ApplyStatus` already wrote, so it was
 * never actually available as the arena's clear-Prone mechanism (the
 * original plan named here was wrong). `RemoveCondition` is a genuine
 * `FrameWriteOp` arm exactly like `ApplyStatus` above — reached the SAME
 * way, through a real action's consequence, same as `srd/movement/stand-up`
 * now does for real SRD content. The arena proof's own `combat-arena/clear-
 * prone` (`proof-scene/calls/combat-arena.ts`'s `COMBAT_ARENA_CLEAR_PRONE_
 * CALLS`) predates Stand Up and remains a PROOF-SCENE-only convenience for
 * arena setup, not this chapter's Stand Up.
 */
export async function buildDropProneFragment(
	target?: AuthorTarget,
): Promise<{ toml: string; units: ChapterUnitSummary[] }> {
	const calls: VerbCall[] = [
		// actor-carried-verbs D1/D7 amendment (ruling bead sk-rd0, V1): Drop
		// Prone's `capability:*` synthetic niche had no niche_definitions row —
		// same dead-content shape `fragments/dodge.ts`'s own header documents.
		// `provider: "actor"` revives it as a universal self-verb.
		{
			toolName: "spellkave_write_rows",
			label: "niche:drop-prone",
			params: {
				bundle: BUNDLE_ID,
				kind: "niche_definitions",
				rows: [
					{
						niche_id: DROP_PRONE_NICHE_ID,
						bundle_id: BUNDLE_ID,
						display_name: "Drop Prone (self)",
						description:
							"actor-carried-verbs D1/D7 (sk-rd0): revives Drop Prone as a universal " +
							"self-verb — see fragments/dodge.ts's own header for the full V1 dead-content " +
							"finding this applies identically to.",
						predicate_source: "",
						provider: "actor",
					},
				],
			},
		},
		{
			toolName: "spellkave_define_capability",
			label: "capability:drop-prone",
			params: {
				bundle: BUNDLE_ID,
				id: "action/drop-prone",
				display_name: "Drop Prone",
				description:
					"On your turn, give yourself the Prone condition without using an action or any " +
					"of your Speed (playing-the-game.md:957-959).",
				actor_kind: "entity",
				tags: ["srd.action"],
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: "action:drop-prone",
			params: {
				bundle: BUNDLE_ID,
				id: "movement/drop-prone",
				required_capability: DROP_PRONE_CAPABILITY_ID,
				niche_id: DROP_PRONE_NICHE_ID,
				display_name: "Drop Prone",
				description:
					"Give yourself the Prone condition — free, no action or Speed cost, unless your " +
					"Speed is already 0 (playing-the-game.md:957-959).",
				predicate_source: `actor.stat('${SPEED_WALK_RESOURCE_ID}') > 0`,
				self_eligible: true,
				self_only: true,
				cost_time_ms: 0,
				consequence: {
					description: "Apply the Prone condition to the acting creature.",
					frame_writes: [
						{
							// Real Restricted Movement (sk-0m4.123 part 3): Prone
							// persists until `srd/movement/stand-up`
							// (`fragments/stand-up.ts`) spends half the movement
							// budget to end it, or another cure removes it — no
							// `expires_at_boundary` timeout. Retires the
							// "lapses at the prone creature's own next turn
							// start" simplification (operator ruling
							// 2026-08-30, sk-0m4.120.50) that stood in for this
							// while the movement-budget channel did not exist.
							ApplyStatus: {
								target_kind: "entity",
								target_ref: "Actor",
								condition_definition_id: PRONE_CONDITION_ID,
							},
						},
					],
				},
			},
		},
	];
	const body = await driveUnitScene(BUNDLE_ID, calls, target);
	const units: ChapterUnitSummary[] = [
		{ kind: "niche_definitions", id: DROP_PRONE_NICHE_ID, sourcePk: "" },
		{ kind: "capability_definitions", id: DROP_PRONE_CAPABILITY_ID, sourcePk: "" },
		{ kind: "action_definitions", id: DROP_PRONE_ACTION_ID, sourcePk: "" },
		{ kind: "consequence_templates", id: `${DROP_PRONE_ACTION_ID}/success`, sourcePk: "" },
		{ kind: "outcome_templates", id: `${DROP_PRONE_ACTION_ID}/outcome`, sourcePk: "" },
		{ kind: "affordance_templates", id: `${DROP_PRONE_ACTION_ID}/affordance`, sourcePk: "" },
	];
	// pattern: condition-grant-and-suppression
	const header = [
		"# GENERATED by src/chapters/playing-the-game/fragments/drop-prone.ts — DO NOT EDIT BY HAND.",
		"# Regenerate: pnpm --filter @spellkave/srd-cc run generate",
		"# pattern: condition-grant-and-suppression",
		"#",
		"# Dropping Prone, cache/markdown/playing-the-game.md:957-959. Genuinely",
		"# FREE (no spends_channel, no cost_time_ms) self-only action gated on",
		"# actor.stat('srd/speed-walk') > 0 (\"can't do so if your Speed is 0\"),",
		"# applying srd/condition/prone to the acting creature. MF-VAL-263 no",
		"# longer blocks this shape (PR #2079, finding #73 addendum).",
		"# actor-carried-verbs D1/D7 (sk-rd0): niche/drop-prone's",
		'# provider="actor" row revives this as a universal self-verb (V1: dead',
		"# content before this change).",
		"",
		"",
	].join("\n");
	return { toml: header + body, units };
}
