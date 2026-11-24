import type { AuthorTarget } from "@spellkave/tool-authoring";
import { dsl } from "@spellkave/world-author";

import type { ChapterUnitSummary } from "../../chapter-types";
import { driveUnitScene, type VerbCall } from "../../verb-runner";
import { OBJECT_INTERACTION_CHANNEL_ID } from "../action-economy-units";
import { BUNDLE_ID } from "../constants";

export const PICKUP_ACTION_ID = `${BUNDLE_ID}/pickup`;
export const PICKUP_CAPABILITY_ID = `${BUNDLE_ID}/action/pickup`;
export const PICKUP_NICHE_ID = `${BUNDLE_ID}/item`;
/**
 * Every SRD item carries this tag: weapons, armor, tools, magic items,
 * consumables, and every adventuring-gear row from `equipment/starting-gear.ts`
 * and `equipment/focus-gear.ts` (gold pieces and containers included —
 * sk-jay0.3.20: in 5e a backpack, sack or chest is equipment like any other,
 * bounded later by carrying capacity, not by a tag). A grounded chest is
 * therefore a pickup target, and its loose contents stay separately pickable
 * through the `core/contained` branch below. Proof: the promoted live delta
 * `fixtures/live-deltas/loft-torch-srd-item.toml` and its `.expected.toml`
 * spec (`live-delta-subset` gate).
 */
const ITEM_TAG = "srd.item";
/**
 * Kernel-derived target-home facts, NOT `core` bundle content — the
 * `packages/spellkave-srd-cc/CLAUDE.md` self-sufficiency exception
 * (operator decision 2026-09-23) names these two literals explicitly:
 * `server/src/world_interaction/target_niches.rs`.
 */
const CORE_GROUNDED_STATE = "core/grounded";
const CORE_CONTAINED_STATE = "core/contained";

/**
 * Pick up an item — SRD 5.2.1 "Interacting with Objects" /
 * "Time-Limited Object Interactions" (`cache/markdown/playing-the-game.md:
 * 769-780`): moving an object from the ground (or a container) into your
 * hand or a container you are holding is exactly the kind of object
 * interaction that free interaction covers; the source names one free
 * interaction per turn, occurring during movement or an action, with any
 * additional interaction costing the Utilize action. This package encodes
 * that one-per-turn budget as `srd/economy_channel/object_interaction`
 * (`action-economy-units.ts`) — the SAME channel the object-interaction
 * proof scene (`proof-scene/object-interaction.ts`) already spends for its
 * "free interaction" verb, `cost_time_ms: 0` meaning "one full pool".
 *
 * sk-jay0.1.23.36.22.4 (canon-warden slice 1+2): widened from the mechanics
 * `core/pickup` shape (`packages/spellkave-mechanics/fixtures/core/base/
 * affordances.toml:326-340,891-895`, `actor.has_capability("core/pickup")
 * && target.has_niche("core.item") && target.state("core/grounded") ==
 * true`) to ALSO admit an item loose inside a grounded, non-body container
 * (a potion in a chest on the floor) — the kernel's own `core/contained`
 * target-home fact, re-derived and re-checked by `r_manipulate` at dispatch
 * (`server/src/world_interaction/layer2/r_manipulate/selection/item_facts.rs`'s
 * `classify_contained_item_home`), which already refuses a slotted/machine-
 * port occupant, another body's own carriage, and nested containment inside
 * an ungrounded container — this predicate does not need to re-encode any
 * of those refusals itself.
 *
 * Capability grant: `srd.creature` (`fragments/creature-identity.ts`) —
 * canon-warden 2026-09-23: no narrower "can handle objects" identity tag
 * exists in this bundle's vocabulary today (checked against
 * `docs/capabilities-and-identity.md`'s full ownership split); flagged as
 * over-wide (a rat or ooze statblock also receives it) via a `findingGap`
 * beside `character-identity-units.test.ts`'s own creature-grant assertions
 * rather than minting a new tag ahead of a concrete narrower need.
 */
export async function buildPickupFragment(
	target?: AuthorTarget,
): Promise<{ toml: string; units: ChapterUnitSummary[] }> {
	const calls: VerbCall[] = [
		{
			toolName: "spellkave_define_capability",
			label: "capability:pickup",
			params: {
				bundle: BUNDLE_ID,
				id: "action/pickup",
				display_name: "Pick Up",
				description:
					"Move a loose item on the ground, or loose inside a grounded container, into your " +
					"own carriage — one of your turn's free object interactions " +
					"(playing-the-game.md:769-780).",
				actor_kind: "entity",
				tags: ["srd.action"],
			},
		},
		// A REAL niche_definitions row, not a bare tag — a bare
		// `entity_definition_tag` string as `niche_id` (the "works too"
		// shortcut `spellkave_define_action_verb`'s own doc names) has no
		// `niche_definitions` row for `r_manipulate`'s `attachment_presence`
		// precondition to resolve `provider` from, so it silently falls back
		// to the `place` default and demands a `spatial_niche_attachment`
		// row this target-carried niche was never meant to need — and a
		// CONTAINED item has none (it is nowhere near a fixed "attach this
		// niche at this node" trigger; its `resolve_item_spatial_ref`
		// address resolves to its GROUNDING node purely for reachability,
		// same as any other target at that node).
		//
		// `provider = "entity"` (ADR-0018 D-1) is the correct fit: "a
		// candidate entity's own authored tags/state satisfy the niche
		// predicate", exactly what a pickup target's own home/tags already
		// establish, no place attachment consulted at all. It needed a
		// kernel-side widening first (sk-jay0.1.23.36.22.4, canon-warden
		// follow-up): `entity_satisfies_thing_provided_niche`
		// (`server/src/world_interaction/layer2/r_manipulate/target.rs`)
		// used to accept only `TargetRef::Entity`, hardcoding
		// `TargetHome::Grounded`, and returned `false` unconditionally for
		// `TargetRef::Item` — the wire form every contained target actually
		// carries — rejecting every contained-item dispatch with
		// "no spatial_niche_attachment for niche 'srd/item' at
		// 'place_node:...'" (the `place` default) even after switching the
		// niche's own `provider`. It now reuses `collect_item_definition_
		// facts` for `TargetRef::Item` — the SAME home classification
		// (`classify_contained_item_home`) and niche derivation
		// `r_manipulate`'s own predicate evaluation already computes for
		// this target, so this admission check agrees with disclosure and
		// predicate evaluation rather than deriving a third, possibly
		// diverging home. `spellkave_define_niche` has no `provider` param;
		// raw `write_rows` mirrors `fragments/dash.ts`'s/`drop-prone.ts`'s
		// own `provider: "actor"` niche rows (a DIFFERENT provider, for
		// THEIR self-only targets) for the same reason: no tool shortcut
		// exists for a non-default provider.
		{
			toolName: "spellkave_write_rows",
			label: "niche:item",
			params: {
				bundle: BUNDLE_ID,
				kind: "niche_definitions",
				rows: [
					{
						niche_id: PICKUP_NICHE_ID,
						bundle_id: BUNDLE_ID,
						display_name: "SRD Item",
						description: "Entity tagged as an SRD item and currently grounded or contained.",
						// Same `a && b || c` shape as the affordance's own
						// predicate below, parsing as `a && (b || c)` — no
						// grouping parens possible in this DSL; see that
						// predicate's own comment for the full precedence
						// citation and the offline Rust test pinning it.
						predicate_source: dsl`target.has_niche('${ITEM_TAG}') && target.has_tag('srd.item.container') == false && target.has_niche('${CORE_GROUNDED_STATE}') || target.has_niche('${CORE_CONTAINED_STATE}')`,
						provider: "entity",
					},
				],
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: "action:pickup",
			params: {
				bundle: BUNDLE_ID,
				id: "pickup",
				required_capability: PICKUP_CAPABILITY_ID,
				niche_id: PICKUP_NICHE_ID,
				display_name: "Pick Up",
				description:
					"Pick up an item that is on the ground, or loose inside a grounded container " +
					"(playing-the-game.md:769-780) — spends one of your turn's free object interactions.",
				// PRECEDENCE (canon-warden follow-up, sk-jay0.1.23.36.22.4): no
				// grouping parens are possible here — `crates/spellkave-dsl`'s
				// grammar has NO parenthesized-boolean-expression rule at all
				// (`parse_bool_term` never checks for `LParen` as a grouping
				// fallback; every `LParen` in the parser sits inside a specific
				// method-call argument list — verified by hand, `(a || b)`
				// fails to parse with "expected `)`"). The ACTUAL grammar:
				// `parse_and` splits top-level operands on `&&`; each resulting
				// operand is independently `parse_or`'d (its own `||` chain).
				// So `a && b && c || d` parses as `a && b && (c || d)` — the
				// capability check `a` guards BOTH the grounded disjunct `c`
				// AND the contained disjunct `d`, exactly the shape this niche
				// row's own predicate above already relies on. This is pinned
				// by an executable, offline (no live node) Rust unit test —
				// `pickup_predicate_capability_check_guards_both_the_grounded_
				// and_contained_disjunct`
				// (`server/src/world_interaction/kernel/dsl/adapters.rs`) —
				// against THIS EXACT predicate string: an actor with no
				// `srd/action/pickup` capability targeting a genuinely
				// contained item must NOT admit; the same target facts WITH
				// the capability must admit. Keep that test's copy of the
				// source string in sync with this one.
				//
				// `has_niche(...)`, NOT `state(...) == true`, for the two home
				// facts: `Op::ReadBool` (what `state()` compiles to) errors
				// `UnknownField` when the field is absent rather than reading
				// false (`crates/spellkave-dsl/src/eval.rs`), and exactly ONE
				// home fact is ever populated per target
				// (`target_home_bool_fact`, one `bool_field` per dispatch) — a
				// grounded target never carries `core/contained` and vice
				// versa, so `state('core/grounded') == true || state('core/
				// contained') == true` throws on whichever field is absent
				// before `Op::Or` ever reaches its second operand (measured
				// live, sk-jay0.1.23.36.22.4: every contained-item dispatch
				// rejected with `predicate_rejected` until this fix). Both
				// home facts are ALSO unconditionally present in the target's
				// niche id list (`derive_entity_target_niches_from_parts`
				// pushes `target_home_state_id(home)` there for every target,
				// disclosure and dispatch alike), and `Op::HasNiche` is a
				// plain membership check with no missing-key error path.
				predicate_source: dsl`actor.has_capability('${PICKUP_CAPABILITY_ID}') && target.has_niche('${ITEM_TAG}') && target.has_tag('srd.item.container') == false && target.has_niche('${CORE_GROUNDED_STATE}') || target.has_niche('${CORE_CONTAINED_STATE}')`,
				self_eligible: false,
				self_only: false,
				spends_channel: OBJECT_INTERACTION_CHANNEL_ID,
				cost_time_ms: 0,
				consequence: {
					description: "Move the target item into the acting creature's own carriage.",
					frame_writes: [
						{
							PickupTargetItem: {
								actor_ref: "Actor",
							},
						},
					],
				},
			},
		},
	];
	const body = await driveUnitScene(BUNDLE_ID, calls, target);
	const units: ChapterUnitSummary[] = [
		{ kind: "capability_definitions", id: PICKUP_CAPABILITY_ID, sourcePk: "" },
		{ kind: "niche_definitions", id: PICKUP_NICHE_ID, sourcePk: "" },
		{
			kind: "action_definitions",
			id: PICKUP_ACTION_ID,
			sourcePk: "cache/markdown/playing-the-game.md:769-780",
		},
		{ kind: "consequence_templates", id: `${PICKUP_ACTION_ID}/success`, sourcePk: "" },
		{ kind: "outcome_templates", id: `${PICKUP_ACTION_ID}/outcome`, sourcePk: "" },
		{ kind: "affordance_templates", id: `${PICKUP_ACTION_ID}/affordance`, sourcePk: "" },
	];
	const header = [
		"# GENERATED by src/chapters/playing-the-game/fragments/pickup.ts — DO NOT EDIT BY HAND.",
		"# Regenerate: pnpm --filter @spellkave/srd-cc run generate",
		"#",
		"# Pick Up, cache/markdown/playing-the-game.md:769-780 (Interacting with",
		"# Objects / Time-Limited Object Interactions). Spends one free object",
		"# interaction (srd/economy_channel/object_interaction, cost_time_ms=0 =",
		"# one full pool). Admits a target on the ground OR loose inside a",
		"# grounded non-body container (sk-jay0.1.23.36.22.4 slice 1+2 kernel",
		"# widening) — core/grounded || core/contained, both kernel-derived",
		"# target-home facts (CLAUDE.md self-sufficiency exception).",
		"",
		"",
	].join("\n");
	return { toml: header + body, units };
}
