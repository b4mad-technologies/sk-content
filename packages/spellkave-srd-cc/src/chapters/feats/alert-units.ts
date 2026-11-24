// DOC-IMPL: derived-values#where-macros-are-illegal
// Alert (`feats.md:21-29`) — F1's "partial" tier (`ledger/feats.md`'s slice
// plan; `ledger/character-creation.md`'s 2026-07-31 ruling). Two benefits:
// "Initiative Proficiency" (PB added to the Initiative roll — mechanized
// HERE, as an unconsumed idiom, see below) and "Initiative Swap" (post-roll
// intervention — deferred entirely, description metadata only, no substrate
// seam this slice can legitimately reach).
//
// COMPOSITION-POINT FINDING (do NOT smuggle — operator brief's own escape
// hatch): the ONLY place this package authors a REAL `order_roll_source` row
// is `playing-the-game/proof-scene/calls/combat-arena.ts`'s
// `ARENA_SCHEDULER_ID` turn_scheduler row and `proof-scene/calls/
// initiative.ts`'s `initiative-idiom` scheduler — both owned by the Playing
// the Game chapter's OWN proof scene (grep confirms no chapter-authored
// non-proof-scene fragment builds a turn_scheduler row anywhere in this
// package). Editing either file from the Feats chapter to splice in
// feat-specific gating would smuggle F1-owned logic into another chapter's
// composed expression. Recorded here as a FINDING CANDIDATE for whoever next
// touches that ownership boundary — this module ships the capability-gated
// PB term as a ready-to-consume idiom (same "ships ready, not forced" posture
// `order-of-combat-units.ts`'s own `initiativeRollExpr` had before it was
// wired), never wired into any live row by this slice.
//
// `macro('srd/proficiency_bonus', ...)` inside a gate-shaped predicate (an
// `order_roll_source` int-expression, not a `ModifyResource` delta) is legal
// composition per this package's own findings #81/#82 (gate predicates may
// call `macro(...)`; `ModifyResource` deltas may not).

import { proficiencyBonusMacroCall } from "../playing-the-game/modifier-units";
import { initiativeRollExpr } from "../playing-the-game/order-of-combat-units";

export const BUNDLE_ID = "srd";

/** Alert's own gate capability — grants the feat's mechanized half (see this module's header). Same id as this feat's `srd/feat/alert` `entity_definitions` row: different manifest table (`capability_definitions` vs `entity_definitions`), independently keyed, no collision. */
export const ALERT_CAPABILITY_ID = `${BUNDLE_ID}/feat/alert`;

/**
 * `d20 + <Dexterity modifier> + cond(actor.has_capability('srd/feat/alert'), <PB macro call>, 0)`
 * — Alert's "Initiative Proficiency" benefit, composed on TOP of the already-
 * shipped `initiativeRollExpr` (never a second Initiative idiom). NOT
 * consumed by any authored row in this slice — see this module's own header
 * for why (composition-point finding).
 */
export function alertInitiativeRollExpr(dexScoreExpr: string, levelExpr: string): string {
	const base = initiativeRollExpr(dexScoreExpr);
	const pbTerm = `cond(actor.has_capability('${ALERT_CAPABILITY_ID}'), ${proficiencyBonusMacroCall(levelExpr)}, 0)`;
	return `${base} + ${pbTerm}`;
}
