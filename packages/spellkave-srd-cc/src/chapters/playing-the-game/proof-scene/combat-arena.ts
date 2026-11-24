import { unarmoredBaseArmorClass } from "../armor-class-units";
import { COVER_HALF_LOCAL_ID, halfCoverBonus } from "../cover-units";
import { SPEED_WALK_INITIAL } from "../grid-units";
import { BUNDLE_ID } from "../index";
import { expectedProficiencyBonus } from "../modifier-units";
import { FACTION_MONSTERS_TAG, FACTION_PARTY_TAG } from "../tag-value-vocabulary";
import { PROOF_DEX_VALUE, PROOF_LEVEL_VALUE, PROOF_STR_VALUE } from "./identity";
import { PROOF_BUNDLE_ID, PROOF_GRAPH_ID } from "./shared";

// Combat-arena proof, Slice B (`ledger/designs/combat-arena-proof.md`): the
// full 1-hero-vs-3-monster tactical scene — a DEDICATED 10x10 combat_grid_
// blueprint, its own staging node (never the shared PROOF_PLACE_NODE_ID —
// same "dedicated entities per proof concern" rationale `identity.ts`'s own
// PROOF_ADVANTAGE_DUMMY_ENTITY_KEY header already establishes: a session
// opened against a shared node/hero could bleed turn-state/session-
// participant contamination into every OTHER proof concern in this file),
// three Goblin Warriors, and a dedicated arena hero (mirrors, does not reuse,
// the identity-proof hero — same isolation rationale). The third Goblin
// Warrior (Goblin C) is the Slice 2 "denser monster roster" addendum
// (`combat-arena-proof.md`'s "Denser monster roster" section) — same
// statblock as A/B, never a bumped number; grounding + runtime math are in
// that section's addendum.
//
// GROUNDING:
//   - Goblin Warrior stat block (`cache/markdown/monsters-A-Z.md:7327-7366`):
//     AC 15 (:7331), HP 10 (:7332), Speed 30 ft. (:7333), STR 8 (:7354-7357),
//     DEX 15 (:7358-7361). Every number cache-cited — never invented.
//   - The Arena Hero has NO SRD stat-block citation (a player character is
//     player-built, not tabulated in the SRD) — its str/dex REUSE the
//     already-established `proof-scene/identity.ts` seed values
//     (`PROOF_STR_VALUE`/`PROOF_DEX_VALUE`, the Fighter Standard Array's
//     15/14 as of C3 — see `identity.ts`'s own module header) rather than
//     inventing a new pair; its AC is DERIVED (`unarmoredBaseArmorClass`,
//     never a bare literal); its HP (20) and Speed (`SPEED_WALK_INITIAL`,
//     the sidebar's own 30-ft/6-cell baseline, `grid-units.ts`) are
//     scene-owned illustrative choices (this package ships no class HP
//     formula), documented honestly per the design-maxims doc's "a baked
//     literal remains correct only for task-shaped, scene-owned facts" rule.
//   - 10x10 grid, `topology = "8"` (chapter-true diagonals, operator decision,
//     playing-the-game.md:925), `cell_size_m = 1.524` m (one 5-ft square, the
//     SAME f32 literal `world-fixtures/srd/base/sessions.toml:15` uses),
//     two difficult-terrain edge overrides (`movement_cost_cells = 2`,
//     playing-the-game.md:925 "A square of Difficult Terrain costs 2
//     squares") — precedent `world-fixtures/srd/base/sessions.toml:12-21`.
//   - `srd/affordance/grid-step` (ADR-0134 D-5: this package's own Slice-A
//     Step gate plus the occupancy clause, `fragments/grid.ts`) is the
//     blueprint's edge affordance — bound via
//     `edge_affordance_bindings_json` names `srd/speed-walk` plus
//     `srd/long_running_move` (the long_running_move_session BINDING).
//
// STRIKEABLE-TARGET GATING — CORRECTED (Slice C live-proof, 2026-07-31; the
// paragraph this replaces under-verified the gate and was WRONG, same class
// of miss as the TRAVERSAL-EDGE correction below). `srd/niche/strikeable`'s
// `niche_definitions.predicate_source` (`target.stat('srd/ac') >= 1`) DOES
// feed `target_niches.rs`'s `append_authored_target_niches` correctly — but
// `r_manipulate`'s OWN act-path revalidation (`target.rs`'s `revalidate_
// spatial_target_preconditions`, called AFTER candidate selection, mirroring
// `r_move.rs`'s two-gate shape) ALSO requires a REAL `spatial_niche_
// attachment` row for the SAME niche at the target's resolved spatial
// location — live-reproduced as persistent `precondition_failed:
// attachment_presence` / `predicate_rejected` rejections against BOTH
// goblins (94 consecutive live attempts, zero admits) without one.
// `spatial/facts.rs`'s `niche_attachment_place_node_scope` names the fix
// directly: "a tactical-grid cell inherits the attachments authored at its
// grid instance's ANCHOR node" (ephemeral-instance inheritance) — so ONE
// node-scoped row at `ARENA_ANCHOR_NODE_ID` (`COMBAT_ARENA_STRIKEABLE_NICHE_
// ATTACHMENT_CALLS`, `calls/combat-arena.ts`) covers every session's
// freshly-materialised grid, no per-cell/per-session authoring needed.
// Seeding `srd/ac >= 1` on every combatant (real values: 15/15/12) remains
// necessary but is NOT sufficient alone. (The sister's `world-fixtures/
// phandelver/goblin-ambush.toml:504-517` attaches its OWN niche via
// `spatial_niche_attachments` for a DIFFERENT, bare/tag-shaped niche — this
// correction converges on the SAME mechanism for a different, predicate-
// bearing reason.)
//
// TRAVERSAL-EDGE GATING ON MINTED GRID NODES — CORRECTED (Slice C live-proof,
// 2026-07-31; the paragraph this replaces under-verified the gate and was
// WRONG). `r_move.rs` runs TWO INDEPENDENT checks, not one:
//   (1) `evaluate_edge_traversal_affordances` — per-edge, reads the
//       `place_edge_affordance` row `r_session_open.rs`'s `materialise_
//       tactical_grid` mints for every generated edge and evaluates `srd/
//       affordance/grid-step`'s predicate (`actor.has_capability('srd/capability/
//       walk') && target.has_niche('srd/niche/traversable-square') &&
//       occupants_at('to_node', 'srd/condition/dead') == 0`) against
//       facts that UNCONDITIONALLY inject the attached template's OWN
//       `niche_id` as a "target has this niche" fact — this half trivially
//       holds on every minted edge with NO `spatial_niche_attachments` row,
//       exactly as originally verified.
//   (2) `select_movement_affordance` + `validate_movement_target_
//       revalidation` — a SEPARATE, edge-INDEPENDENT selection over every
//       globally authored `affordance_template`, which for the winning
//       (template, niche_id) pair then requires a REAL `spatial_niche_
//       attachment` row for that niche — matched either by the edge's exact
//       `place_edge_id`, or, per its own fallback branch, ANY row carrying
//       `place_edge_id == 0` (a wildcard). Live-reproduced: a bare `r_move`
//       call against a freshly materialised arena grid rejected with
//       `precondition_failed: element=attachment_presence; missing spatial_
//       niche_attachment for niche 'srd/niche/traversable-square'`
//       (`evaluation_provenance` row `r_move:0:1`) — this second gate is real
//       and was missed by the original verification pass. `grid-units.ts`'s
//       own Slice-A module header anticipated exactly this ("a scene attaches
//       the niche via `spatial_niche_attachments` on its own grid edges") —
//       Slice B's (wrong) override is what this paragraph corrects.
// FIX: `COMBAT_ARENA_TRAVERSABLE_NICHE_ATTACHMENT_CALLS` (`calls/combat-
// arena.ts`) authors ONE wildcard `spatial_niche_attachments` row —
// `place_edge_id = 0` EXPLICITLY authored (the sentinel gate (2)'s fallback
// branch matches against; live-reproduced that OMITTING the field entirely
// is rejected at manifest-commit validation with MF-APPLY-020, "must declare
// place_node_id or place_edge_id" — `0` must be a real authored value, not a
// client-side default) — for `srd/niche/traversable-square`, covering every
// session's freshly-generated grid edges regardless of their (unknowable at
// authoring time) numeric ids — the same shape `checks.ts`'s own node-scoped
// attachments use, just edge-scoped instead of node-scoped.
// `actor.has_capability('srd/capability/walk')` IS real and load-bearing —
// every combatant below derives it from its `srd.creature` definition tag.
export const ARENA_ANCHOR_NODE_ID = `${PROOF_GRAPH_ID}/combat_arena_gate`;

export const ARENA_BLUEPRINT_LOCAL_ID = "combat-grid/arena";
export const ARENA_BLUEPRINT_ID = `${PROOF_BUNDLE_ID}/${ARENA_BLUEPRINT_LOCAL_ID}`;
export const ARENA_GRID_WIDTH = 10;
export const ARENA_GRID_HEIGHT = 10;
export const ARENA_GRID_TOPOLOGY = "8";
/** One 5-ft tactical square, the SAME f32 literal `world-fixtures/srd/base/sessions.toml:15` uses. */
export const ARENA_GRID_CELL_SIZE_M = 1.5240000486373901;
export const ARENA_DIFFICULT_TERRAIN_COST_CELLS = 2;
export const ARENA_DIFFICULT_TERRAIN_LABEL = "Difficult Terrain";
export const ARENA_DIFFICULT_TERRAIN_FROM_LOCAL = "c_4_4";
export const ARENA_DIFFICULT_TERRAIN_TO_LOCAL = "c_5_4";

export const ARENA_HERO_DEF_LOCAL_ID = "arena-hero";
export const ARENA_HERO_DEF_ID = `${PROOF_BUNDLE_ID}/${ARENA_HERO_DEF_LOCAL_ID}`;
export const ARENA_HERO_SPAWN_KEY_PREFIX = "arena-hero";
export const ARENA_HERO_ENTITY_KEY = `${PROOF_BUNDLE_ID}/${ARENA_HERO_SPAWN_KEY_PREFIX}_1`;
export const ARENA_WEAPON_DEF_LOCAL_ID = "arena-training-weapon";
export const ARENA_WEAPON_DEF_ID = `${PROOF_BUNDLE_ID}/${ARENA_WEAPON_DEF_LOCAL_ID}`;
/** Test-only dual-mode weapon die used by the existing combat-arena assertions. */
export const ARENA_WEAPON_DAMAGE_DICE = "1d6";
export const ARENA_HERO_STR = PROOF_STR_VALUE;
export const ARENA_HERO_DEX = PROOF_DEX_VALUE;
// Opportunity-attack bonus unit (Slice 2): `unarmedStrikeAttackExpr` (the
// SAME resolution predicate Opportunity Attack composes, `fragments/
// attacks.ts`) now reads the baked `srd/proficiency_bonus` stat — the same
// route as Melee/Ranged, so a monster reactor without `srd/level` can still
// resolve. The Hero still seeds level so `expectedProficiencyBonus` can
// derive the matching baked value (`PROOF_LEVEL_VALUE`, 5) rather than
// inventing a new one.
export const ARENA_HERO_LEVEL = PROOF_LEVEL_VALUE;
/** sk-84i.4: Level 5 -> "Up to 4"/"5–8" band, Proficiency Bonus +3 (`modifier-units.ts`'s `expectedProficiencyBonus`, the SRD table — never a bare literal). */
export const ARENA_HERO_PROFICIENCY_BONUS = expectedProficiencyBonus(ARENA_HERO_LEVEL);
export const ARENA_HERO_AC = unarmoredBaseArmorClass(ARENA_HERO_DEX);
/** Scene-owned illustrative HP (no class HP formula shipped here) — enough to survive several goblin hits. */
export const ARENA_HERO_HP = 20;
export const ARENA_HERO_SPEED_WALK = SPEED_WALK_INITIAL;

export const ARENA_GOBLIN_A_DEF_LOCAL_ID = "goblin-warrior-a";
export const ARENA_GOBLIN_A_DEF_ID = `${PROOF_BUNDLE_ID}/${ARENA_GOBLIN_A_DEF_LOCAL_ID}`;
export const ARENA_GOBLIN_A_SPAWN_KEY_PREFIX = "goblin-warrior-a";
export const ARENA_GOBLIN_A_ENTITY_KEY = `${PROOF_BUNDLE_ID}/${ARENA_GOBLIN_A_SPAWN_KEY_PREFIX}_1`;

export const ARENA_GOBLIN_B_DEF_LOCAL_ID = "goblin-warrior-b";
export const ARENA_GOBLIN_B_DEF_ID = `${PROOF_BUNDLE_ID}/${ARENA_GOBLIN_B_DEF_LOCAL_ID}`;
export const ARENA_GOBLIN_B_SPAWN_KEY_PREFIX = "goblin-warrior-b";
export const ARENA_GOBLIN_B_ENTITY_KEY = `${PROOF_BUNDLE_ID}/${ARENA_GOBLIN_B_SPAWN_KEY_PREFIX}_1`;

/**
 * Goblin C — Slice 2 "denser monster roster" addendum
 * (`ledger/designs/combat-arena-proof.md`), decided SECOND after decision
 * (d)'s causal-per-attempt fix. Same Goblin Warrior stat block as A/B
 * (`cache/markdown/monsters-A-Z.md:7327-7366`) — a denser roster means
 * SELECTING another cached statblock instance, never bumping a number.
 * Buys fight DURATION (the precondition for the deferred bonus units)
 * without changing per-hit math; runtime budget worked in the design doc's
 * own addendum.
 */
export const ARENA_GOBLIN_C_DEF_LOCAL_ID = "goblin-warrior-c";
export const ARENA_GOBLIN_C_DEF_ID = `${PROOF_BUNDLE_ID}/${ARENA_GOBLIN_C_DEF_LOCAL_ID}`;
export const ARENA_GOBLIN_C_SPAWN_KEY_PREFIX = "goblin-warrior-c";
export const ARENA_GOBLIN_C_ENTITY_KEY = `${PROOF_BUNDLE_ID}/${ARENA_GOBLIN_C_SPAWN_KEY_PREFIX}_1`;

/** cache/markdown/monsters-A-Z.md:7331. */
export const ARENA_GOBLIN_AC = 15;
/** cache/markdown/monsters-A-Z.md:7332 ("HP 10 (3d6)"). */
export const ARENA_GOBLIN_HP = 10;
/** cache/markdown/monsters-A-Z.md:7333 ("Speed 30 ft.") / 5 ft per cell = 6. */
export const ARENA_GOBLIN_SPEED_WALK = 6;
/** cache/markdown/monsters-A-Z.md:7354-7357. */
export const ARENA_GOBLIN_STR = 8;
/** cache/markdown/monsters-A-Z.md:7358-7361. */
export const ARENA_GOBLIN_DEX = 15;
/** cache/markdown/monsters-A-Z.md:7388, "CR 1/4 (XP 50; PB +2)" — sk-84i.4. */
export const ARENA_GOBLIN_PROFICIENCY_BONUS = 2;

// sk-ntz.3 (content-hygiene tag rename): the legacy colon-shaped
// `faction:party`/`faction:monsters` tags tripped MF-VAL-296/297/298
// (kv/colon-shaped + flat + undeclared-namespace) — renamed to the
// recommended dot-namespace under this package's own open `srd` prefix
// (`bundle-row.ts`'s bare `srd` tag_prefixes entry). Values registered in
// `tag-value-vocabulary.ts` (MF-VAL-306: every `srd.*` tag resolves against
// that ONE closed catalog). Every consumer of these two constants moves by
// import, not by literal — grep found none holding the old literal string.
export const ARENA_PARTY_FACTION_TAG = FACTION_PARTY_TAG;
export const ARENA_MONSTERS_FACTION_TAG = FACTION_MONSTERS_TAG;

/**
 * NPC-seat live proof (N3a, `ledger/designs/tool-ux-decision-log.md` T25/N3
 * entries) — a FOURTH, DEDICATED Goblin Warrior instance, isolated from the
 * scripted A/B/C narrative above via the SAME "dedicated entities per proof
 * concern" rationale Goblin C's own header note already establishes: the
 * live NPC-seat proof opens its OWN independent session (SAME
 * `ARENA_SESSION_DEF_ID`/blueprint, a NEW `session_id` — `r_session_open`
 * always mints one) against just `[Hero, this goblin]`, so the scripted
 * 8-step A/B/C fight's exact position/HP/turn-order assumptions are never
 * touched (`combat-arena/npc-seat.ts` runs AFTER that fight's own
 * termination test, never interleaved with it). Same Goblin Warrior stat
 * block as A/B/C — no new numbers, `ARENA_GOBLIN_AC`/`HP`/`STR`/`DEX`/
 * `SPEED_WALK` reused verbatim, no new license citation needed.
 */
export const ARENA_GOBLIN_SEAT_TARGET_DEF_LOCAL_ID = "goblin-warrior-seat-target";
export const ARENA_GOBLIN_SEAT_TARGET_DEF_ID = `${PROOF_BUNDLE_ID}/${ARENA_GOBLIN_SEAT_TARGET_DEF_LOCAL_ID}`;
export const ARENA_GOBLIN_SEAT_TARGET_SPAWN_KEY_PREFIX = "goblin-warrior-seat-target";
export const ARENA_GOBLIN_SEAT_TARGET_ENTITY_KEY = `${PROOF_BUNDLE_ID}/${ARENA_GOBLIN_SEAT_TARGET_SPAWN_KEY_PREFIX}_1`;

/**
 * Cover, Slice 2 "denser monster roster" bonus unit (`ledger/designs/
 * combat-arena-proof.md`): a TEST-ONLY, guaranteed-success "cover-grant"
 * action, dispatched by the Hero against a living goblin, landing the
 * SHIPPED base-bundle `srd/cover/half` condition — mirrors the identity-
 * proof's own `PROOF_COVER_GRANT_ACTION_ID` mechanism exactly (`proof-scene/
 * combat.ts`, `proof-scene/checks.ts`'s `coverGrantCheckSpec`), a legal
 * cross-bundle REFERENCE (MF-VAL-291 only forbids foreign-namespace
 * DEFINITIONS), not a proof-authored condition. Unlike that dummy-target
 * precedent, this one dispatches through `spellkave_define_action_verb`
 * directly (the arena's own established authoring style) with `resolution_
 * mode` left at its Deterministic default — no roll at all, so the grant
 * always lands once offered, matching "cover" being an environmental/DM
 * fact, never an attack roll of its own.
 */
// A DISTINCT local id from the identity-proof's own `PROOF_COVER_GRANT_
// ACTION_ID` (`proof-scene/combat.ts`, also `${PROOF_BUNDLE_ID}/cover-grant`)
// — action_definitions/capability_definitions ids are duplicate-id-scanned
// (MF-VAL-272) across this shared PROOF_BUNDLE_ID manifest, so reusing the
// bare "cover-grant" local id here would collide with that unrelated proof.
export const ARENA_COVER_GRANT_CAPABILITY_ID = `${PROOF_BUNDLE_ID}/combat-arena/cover-grant`;
export const ARENA_COVER_GRANT_ACTION_ID = `${PROOF_BUNDLE_ID}/combat-arena/cover-grant`;
export const ARENA_COVER_HALF_CONDITION_ID = `${BUNDLE_ID}/${COVER_HALF_LOCAL_ID}`;
/** playing-the-game.md § Combat > Cover: Half Cover's own +2 AC bonus, parsed not invented. */
export const ARENA_COVER_BONUS = halfCoverBonus();
export const ARENA_GOBLIN_COVERED_AC = ARENA_GOBLIN_AC + ARENA_COVER_BONUS;

/**
 * `ledger/designs/prone-free-action.md` Slice B item 4 (the arena proof):
 * TEST-ONLY, guaranteed-success "clear prone" self-action, mirroring the
 * cover-grant precedent immediately above — a `RemoveCondition` frame write
 * on `TargetActor` (self_only, so Actor == TargetActor) lets the harness end
 * the Hero's `srd/condition/prone` between narrative blocks. This is
 * DELIBERATELY not the SRD's own Stand Up (which costs half Speed — not
 * modelable, finding #27, `fragments/drop-prone.ts`'s own header note); it
 * is scene infrastructure only, same posture as the cover-grant action's own
 * "simulating a DM/environment declaration" framing, never presented as
 * player-facing SRD content.
 */
export const ARENA_CLEAR_PRONE_CAPABILITY_ID = `${PROOF_BUNDLE_ID}/combat-arena/clear-prone`;
export const ARENA_CLEAR_PRONE_ACTION_ID = `${PROOF_BUNDLE_ID}/combat-arena/clear-prone`;

export const ARENA_SCHEDULER_LOCAL_ID = "turn/combat-arena";
export const ARENA_SCHEDULER_ID = `${PROOF_BUNDLE_ID}/${ARENA_SCHEDULER_LOCAL_ID}`;
export const ARENA_SESSION_DEF_LOCAL_ID = "session/combat-arena";
export const ARENA_SESSION_DEF_ID = `${PROOF_BUNDLE_ID}/${ARENA_SESSION_DEF_LOCAL_ID}`;
/** playing-the-game.md:877, "a round of combat lasts about 6 seconds". */
export const ARENA_ROUND_DURATION_MS = 6_000;
