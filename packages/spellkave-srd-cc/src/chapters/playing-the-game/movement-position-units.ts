// Movement and Position (playing-the-game.md § Combat > Movement and
// Position): Speed use, Difficult Terrain, Breaking Up Your Move, Dropping
// Prone, Moving around Other Creatures. Ledger row: "Movement and Position"
// (`ledger/playing-the-game.md`). The Creature Size and Space table, bundled
// in the SAME open5e record, is its own unit — `creature-size-units.ts`.
//
// SOURCE: `cache/open5e/Rule.json`, pk `srd-2024_combat_movement-and-position`.
//
// RECONCILIATION VERDICTS (this unit's deliverable, grounded by reading the
// substrate directly, not assumed):
//
//   - "Difficult Terrain... every foot costs 1 extra foot" MATCHES —
//     structurally identical to "Playing on a Grid"'s own 2x-cost rule
//     (`playing-on-a-grid-units.ts`'s `GRID_DIFFICULT_TERRAIN_ENTRY_COST_
//     SQUARES`), same substrate mechanism (`movement_cost_cells` edge
//     override, the sister's own `sessions.toml` "Rough ground" worked
//     example) — genuinely the SAME rule, reached from two different
//     markdown sections (the grid variant-rule sidebar and this section's
//     own prose), not two separate things to reconcile twice.
//
//   - "Breaking Up Your Move... go 10 feet, take an action, and then go 20
//     feet" MATCHES structurally: `r_move` (movement) and an action's own
//     manipulate/communicate call are entirely SEPARATE reducer calls with
//     no turn-phase gate ordering one before the other — grepped
//     `server/src/world_interaction/layer2/r_move.rs` directly for any
//     "movement already used this turn" / "action already taken" ordering
//     gate: none exists. A caller is free to interleave `r_move` and action
//     calls in any order within a turn, matching the SRD's own permission.
//
//   - CONFIRMED, NEW GAP found while verifying the above (NOT assumed,
//     surfaced by reading `validate_authored_movement_reach`/
//     `resolve_actor_movement_reach_cells` in `r_move.rs` directly):
//     movement-reach validation checks EACH `r_move` CALL's OWN edge
//     distance against the actor's FULL Speed (`reach_from_cells` converts
//     the WHOLE `srd/speed-walk` stat, not a decremented remainder) — there
//     is NO cumulative "distance already moved this turn" tracker anywhere
//     in the substrate (grepped for `movement_used`/`move_budget`/
//     `movement_remaining`/`distance_used`/`movement_spent` across
//     `server/src` and `world-fixtures/**`: zero hits). Consequence: a
//     creature with Speed 30 ft could legally chain THREE separate 30-ft
//     `r_move` calls in the same turn (each individually within its own
//     full reach), moving 90 ft total — "you can move a distance up to your
//     Speed" (§ Your Turn) has no enforcing mechanism once movement is split
//     across multiple calls, only a single-call ceiling. Recorded as
//     finding #27 (`ledger/findings.md`) — substrate-touching
//     (a genuine per-turn accumulator, not this package's own authoring
//     surface), own issue + canon-warden gate wanted; NOT worked around
//     here (no fixture content exists in this chapter to demonstrate the
//     gap against, and this package authors no server/crates changes per
//     its own scope).
//
//   - "Dropping Prone... give yourself the Prone condition... without using
//     an action or any of your Speed... unless your Speed is 0" — the TARGET
//     condition is now SHIPPED (Slice 2 combat-arena bonus unit, `ledger/
//     designs/combat-arena-proof.md`): this package's OWN identity-only
//     `srd/condition/prone` (`conditions-units.ts`/`fragments/conditions
//     .ts`), superseding this module's earlier "the sister's core/condition/
//     prone already exists" citation — irrelevant now that this package is
//     self-sufficient (AGENTS.md) and never references `core/*` content.
//     The GRANT-IT-FOR-FREE affordance itself is CONFIRMED BLOCKED, not
//     merely unbuilt: `spellkave_define_action_verb`'s own manifest-level
//     validator (MF-VAL-263, `crates/spellkave-validate/src/refs.rs`'s
//     `validate_self_reaction_resource_refs`) requires EVERY `self_eligible`
//     action to either spend a real `economy_channel_definitions` pool or
//     carry a `ModifyResource` "budget" write in its `on_success`
//     consequence — there is no substrate shape for a genuinely FREE
//     (unmetered, no resource write at all) self-targeted action, which is
//     exactly what "without using an action or any of your Speed" requires.
//     Wiring `spends_channel` to any real channel would spend something the
//     rule explicitly says nothing is spent — a fabricated cost, not an
//     honest approximation. Recorded as finding #73 (confirmed
//     substrate gap, no workaround built); the condition ships standalone,
//     same "identity without a forced mechanic" posture the Actions identity
//     list and Incapacitated already established.
//
//   - "Moving around Other Creatures" (pass through an ally/Incapacitated/
//     Tiny/two-sizes-different creature; another creature's space is
//     Difficult Terrain to pass through otherwise; can't willingly END a
//     move on an occupied space, or fall Prone if you somehow do) — PARTIAL.
//     ADR-0134 D-3/D-5: occupancy is an AUTHORED read on the grid edge
//     template (`grid-units.ts`'s `gridStepAffordancePredicate`, the one a
//     combat_grid_blueprint binds — never the ambient movement default,
//     `occupants_at('to_node', 'srd/condition/dead') == 0`), not a kernel
//     veto — the sk-awlo.17 `DestinationOccupied` rejection is retired. A
//     living creature blocks its cell, a corpse is an object whose space can
//     be entered, and a refused hop is the ordinary traversal-predicate
//     refusal. That is the session-grid "can't willingly END a move on an
//     occupied space" slice (one `r_move` hop = one ended move), authored
//     STRICTER than the text: allies block too, because the kernel has no
//     "movement ends here" predicate point yet (ADR-0134 G-1). Ambient
//     place nodes still allow free co-location — confirmed by
//     `attack-melee.toml`'s own module comment ("a co-located bystander
//     (legal — a party member can walk onto a dying ally's cell)"). Still
//     unmechanized: ally/Incapacitated/Tiny/size-difference *pass-through*,
//     Difficult-Terrain-for-others, and fall-Prone-if-you-do (Creature Size
//     itself is still row-less per `creature-size-units.ts`).
//
// NO NEW MECHANICS beyond the reconciliation itself — per the operator
// brief's own framing for this unit. This module's only code is a loud-fail
// parser over the section's own prose, grounding the verdicts above.
import { ruleByPk } from "../../open5e/rule";

export const MOVEMENT_AND_POSITION_RULE_PK = "srd-2024_combat_movement-and-position";

/** One parsed H4 sub-section of § Movement and Position (heading -> body text, Creature Size excluded — its own unit). */
export interface MovementSubSection {
	heading: string;
	text: string;
}

const EXPECTED_HEADINGS = [
	"Difficult Terrain",
	"Breaking Up Your Move",
	"Dropping Prone",
	"Moving around Other Creatures",
] as const;

/**
 * Parse the four non-table H4 sub-sections out of the rule's own desc
 * (`## <Heading>` markdown headers; `## Creature Size`'s own table body is
 * NOT included here — see `creature-size-units.ts`). Throws loudly on any
 * shape surprise or missing heading.
 */
export function parseMovementSubSections(desc: string): MovementSubSection[] {
	return EXPECTED_HEADINGS.map((heading) => {
		const start = desc.indexOf(`## ${heading}`);
		if (start === -1) {
			throw new Error(
				`movement-position-units: '## ${heading}' heading not found in rule '${MOVEMENT_AND_POSITION_RULE_PK}'.`,
			);
		}
		const bodyStart = start + `## ${heading}`.length;
		const nextHeading = desc.indexOf("##", bodyStart);
		const body = (
			nextHeading === -1 ? desc.slice(bodyStart) : desc.slice(bodyStart, nextHeading)
		).trim();
		if (body.length === 0) {
			throw new Error(`movement-position-units: '## ${heading}' section has no body text.`);
		}
		return { heading, text: body };
	});
}

/** The parsed § Movement and Position sub-sections, read from the committed cache. */
export function movementSubSections(): MovementSubSection[] {
	return parseMovementSubSections(ruleByPk(MOVEMENT_AND_POSITION_RULE_PK).desc);
}
