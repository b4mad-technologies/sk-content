import { PROOF_BUNDLE_ID } from "./shared";

// Initiative extension (finding #26, night/b9-initiative-facts
// substrate fix) — the live proof that `order_roll_source` now reads the
// rolling participant's own actor facts (`ledger/designs/
// finding-26-initiative-actor-facts.md`). TWO dedicated combatant entity_defs
// (NOT the hero/dummy pair above — isolation, same rationale as the
// Advantage extension's dedicated dummy), differing ONLY in their seeded
// `srd/dex` value, and TWO `[[session_definitions]]`/`[[turn_scheduler]]`
// pairs (no typed `spellkave_define_session` verb exists — authored via
// `spellkave_write_rows`, same as the affordance rows above):
//   - `initiative-deterministic`: `order_roll_source = "actor.stat('srd/dex')"`
//     — no dice at all. Fully deterministic in a single run: proves facts are
//     actually read AND are participant-specific (pre-fix, EVERY participant's
//     read would fail with `UnknownField` against the always-empty context —
//     success at all is the core proof). Canon-warden follow-up (2026-07-28):
//     Alpha (spawned FIRST, the lower entity_id) carries the LOW Dex, Beta
//     (spawned SECOND, the higher entity_id) the HIGH one — deliberately the
//     OPPOSITE of "the earlier-spawned participant wins" — so a shared/
//     unpopulated-facts regression (every participant reading the SAME empty
//     context, a tie broken by `rank_initiative`'s ascending-entity_id
//     tiebreak, COND-11) would rank ALPHA first, not Beta, and the "Beta
//     ranks ordinal 0" assertion below would FAIL. The original same-direction
//     seeding (high Dex on the lower entity_id) could not distinguish correct
//     per-participant reads from that exact regression — both produce the
//     same ordinal assignment.
//   - `initiative-idiom`: `order_roll_source = initiativeRollExpr("actor.stat('srd/dex')")`
//     — the REAL SRD-faithful `d20 + Dex-modifier` idiom this chapter ships
//     (`order-of-combat-units.ts`). Genuinely stochastic; `resolve_initiative`
//     records no draw provenance (finding #26 §d, deferred as finding #34),
//     so only success + a valid ordinal permutation is asserted here — not
//     exact order (the boundary-DC trick used elsewhere in this file cannot
//     guarantee a d20-roll outcome: the modifier gap needed, 19, exceeds the
//     SRD's max possible gap of 15).
// Neither scheduler is `active` (mirrors the sister's own `srd/turn/
// initiative` row) — each session_definition names its OWN scheduler by id,
// so `active` is irrelevant to which one a given session_open call uses.
// No `combat_grid_blueprint_id`/`turn_rule` — `default_grid_open_request`
// (`r_session_open.rs`) is a no-op on an empty blueprint id, so grid seating
// never engages; this proof only needs `session_participant.ordinal`.
export const PROOF_COMBATANT_ALPHA_DEF_LOCAL_ID = "combatant-alpha";
export const PROOF_COMBATANT_ALPHA_DEF_ID = `${PROOF_BUNDLE_ID}/${PROOF_COMBATANT_ALPHA_DEF_LOCAL_ID}`;
export const PROOF_COMBATANT_ALPHA_KEY_PREFIX = "combatant-alpha";
export const PROOF_COMBATANT_ALPHA_ENTITY_KEY = `${PROOF_BUNDLE_ID}/${PROOF_COMBATANT_ALPHA_KEY_PREFIX}_1`;
export const PROOF_COMBATANT_BETA_DEF_LOCAL_ID = "combatant-beta";
export const PROOF_COMBATANT_BETA_DEF_ID = `${PROOF_BUNDLE_ID}/${PROOF_COMBATANT_BETA_DEF_LOCAL_ID}`;
export const PROOF_COMBATANT_BETA_KEY_PREFIX = "combatant-beta";
export const PROOF_COMBATANT_BETA_ENTITY_KEY = `${PROOF_BUNDLE_ID}/${PROOF_COMBATANT_BETA_KEY_PREFIX}_1`;

/**
 * Alpha's seeded Dexterity score — LOW. Alpha is spawned FIRST (the lower
 * entity_id) — pairing LOW Dex with the lower entity_id (rather than high
 * Dex, the more "obvious" pairing) is deliberate: it makes the deterministic
 * session's assertion a genuine falsifying test, not a coincidentally-always-
 * true one. See this file's own Initiative-extension header note.
 */
export const PROOF_COMBATANT_ALPHA_DEX = 10;
/**
 * Beta's seeded Dexterity score — HIGH. Beta is spawned SECOND (the higher
 * entity_id), so it must win the deterministic session's ordinal-0 rank on
 * Dex alone — a regression that fell back to `rank_initiative`'s ascending-
 * entity_id tiebreak (e.g. a shared/unpopulated facts context) would instead
 * rank Alpha first, diverging from this assertion.
 */
export const PROOF_COMBATANT_BETA_DEX = 20;
export const PROOF_INITIATIVE_DETERMINISTIC_SCHEDULER_ID = `${PROOF_BUNDLE_ID}/turn/initiative-deterministic`;
export const PROOF_INITIATIVE_DETERMINISTIC_SESSION_DEF_ID = `${PROOF_BUNDLE_ID}/session/initiative-deterministic`;
export const PROOF_INITIATIVE_IDIOM_SCHEDULER_ID = `${PROOF_BUNDLE_ID}/turn/initiative-idiom`;
export const PROOF_INITIATIVE_IDIOM_SESSION_DEF_ID = `${PROOF_BUNDLE_ID}/session/initiative-idiom`;
export const PROOF_ACTION_ECONOMY_SCHEDULER_ID = `${PROOF_BUNDLE_ID}/turn/action-economy-round-robin`;
export const PROOF_ACTION_ECONOMY_SESSION_DEF_ID = `${PROOF_BUNDLE_ID}/session/action-economy`;
