import { ALIGNMENT_TAG_PREFIX } from "../../../character-creation/alignment-units";
import { LANGUAGE_TAG_PREFIX } from "../../../character-creation/language-units";
import { MAIN_HAND_SLOT_LOCAL_ID } from "../../../equipment/armor-units";
import {
	WEAPON_ATTACK_RANGE_SLOT_ID,
	WEAPON_DAMAGE_SLOT_ID,
} from "../../../equipment/weapon-damage-source-units";
import { WEAPON_RANGE_TAG_PREFIX, WEAPON_TAG } from "../../../equipment/weapon-tag-values";
import type { VerbCall } from "../../../verb-runner";
import { PRIMARY_CHANNEL_ID } from "../../action-economy-units";
import { AC_RESOURCE_ID } from "../../armor-class-units";
import { CREATURE_NICHE_TAG, MONSTER_TAG } from "../../creature-type-units";
import { INCAPACITATED_CONDITION_ID, PRONE_CONDITION_ID } from "../../fragments/conditions";
import { DROP_PRONE_CAPABILITY_ID } from "../../fragments/drop-prone";
import { GRID_STEP_AFFORDANCE_ID, SPEED_WALK_RESOURCE_ID } from "../../fragments/grid";
import { STEP_EDGE_BINDINGS_JSON, TRAVERSABLE_SQUARE_NICHE_ID } from "../../grid-units";
import { HP_ID } from "../../hp-units";
import { BUNDLE_ID } from "../../index";
import { PROFICIENCY_BONUS_STATE_ID } from "../../modifier-units";
import { initiativeRollExpr, TAKES_TURN_ELIGIBILITY_PRED } from "../../order-of-combat-units";
import { REACH_RESOURCE_ID, STANDARD_REACH_MM } from "../../reach-units";
import { RANGED_ATTACK_RANGE_METERS, STRIKEABLE_NICHE_LOCAL_ID } from "../../weapon-attack-units";
import {
	ARENA_ANCHOR_NODE_ID,
	ARENA_BLUEPRINT_ID,
	ARENA_CLEAR_PRONE_CAPABILITY_ID,
	ARENA_COVER_GRANT_CAPABILITY_ID,
	ARENA_COVER_HALF_CONDITION_ID,
	ARENA_DIFFICULT_TERRAIN_COST_CELLS,
	ARENA_DIFFICULT_TERRAIN_FROM_LOCAL,
	ARENA_DIFFICULT_TERRAIN_LABEL,
	ARENA_DIFFICULT_TERRAIN_TO_LOCAL,
	ARENA_GOBLIN_A_DEF_ID,
	ARENA_GOBLIN_A_DEF_LOCAL_ID,
	ARENA_GOBLIN_A_SPAWN_KEY_PREFIX,
	ARENA_GOBLIN_AC,
	ARENA_GOBLIN_B_DEF_ID,
	ARENA_GOBLIN_B_DEF_LOCAL_ID,
	ARENA_GOBLIN_B_SPAWN_KEY_PREFIX,
	ARENA_GOBLIN_C_DEF_ID,
	ARENA_GOBLIN_C_DEF_LOCAL_ID,
	ARENA_GOBLIN_C_SPAWN_KEY_PREFIX,
	ARENA_GOBLIN_DEX,
	ARENA_GOBLIN_HP,
	ARENA_GOBLIN_PROFICIENCY_BONUS,
	ARENA_GOBLIN_SEAT_TARGET_DEF_ID,
	ARENA_GOBLIN_SEAT_TARGET_DEF_LOCAL_ID,
	ARENA_GOBLIN_SEAT_TARGET_SPAWN_KEY_PREFIX,
	ARENA_GOBLIN_SPEED_WALK,
	ARENA_GOBLIN_STR,
	ARENA_GRID_CELL_SIZE_M,
	ARENA_GRID_HEIGHT,
	ARENA_GRID_TOPOLOGY,
	ARENA_GRID_WIDTH,
	ARENA_HERO_AC,
	ARENA_HERO_DEF_ID,
	ARENA_HERO_DEF_LOCAL_ID,
	ARENA_HERO_DEX,
	ARENA_HERO_HP,
	ARENA_HERO_LEVEL,
	ARENA_HERO_PROFICIENCY_BONUS,
	ARENA_HERO_SPAWN_KEY_PREFIX,
	ARENA_HERO_SPEED_WALK,
	ARENA_HERO_STR,
	ARENA_MONSTERS_FACTION_TAG,
	ARENA_PARTY_FACTION_TAG,
	ARENA_ROUND_DURATION_MS,
	ARENA_SCHEDULER_ID,
	ARENA_SESSION_DEF_ID,
	ARENA_WEAPON_DAMAGE_DICE,
	ARENA_WEAPON_DEF_ID,
	ARENA_WEAPON_DEF_LOCAL_ID,
} from "../combat-arena";
import { PROOF_BUNDLE_ID, PROOF_GRAPH_ID } from "../shared";

const HP_STATE_ID = `${BUNDLE_ID}/${HP_ID}`;
const AC_STATE_ID = AC_RESOURCE_ID;
const STR_STATE_ID = `${BUNDLE_ID}/str`;
const DEX_STATE_ID = `${BUNDLE_ID}/dex`;
const LEVEL_STATE_ID = `${BUNDLE_ID}/level`;
const SPEED_WALK_STATE_ID = SPEED_WALK_RESOURCE_ID;
/** sk-84i.4: every combatant below seeds this — see `combat-arena.ts`'s own `ARENA_HERO_PROFICIENCY_BONUS`/`ARENA_GOBLIN_PROFICIENCY_BONUS` header notes. */
const PROFICIENCY_BONUS_ID = PROFICIENCY_BONUS_STATE_ID;
const ARENA_MAIN_HAND_SLOT_ID = `${BUNDLE_ID}/${MAIN_HAND_SLOT_LOCAL_ID}`;

// C3 (Ability-Score Generation, `ledger/character-creation.md`'s "Standing
// pattern" addendum): the goblin warriors' alignment + languages are
// GROUNDED in `cache/open5e/Creature.json`'s `srd-2024_goblin-warrior` row
// (alignment: "chaotic neutral"; languages: ["common", "goblin"]) — never an
// authorial pick, unlike the hero's.
const GOBLIN_ALIGNMENT_TAG = `${ALIGNMENT_TAG_PREFIX}.chaotic-neutral`;
const GOBLIN_LANGUAGE_COMMON_TAG = `${LANGUAGE_TAG_PREFIX}.common`;
const GOBLIN_LANGUAGE_GOBLIN_TAG = `${LANGUAGE_TAG_PREFIX}.goblin`;
// sk-dms.39/sk-b3m: the Monster Death guard (weapon-attack-units.ts) now
// restricts itself to MONSTER_TAG-tagged actors. These goblins are the
// combatants melee.ts/opportunity-attack.ts/cover.ts/prone.ts/session-
// open.ts/npc-seat.ts already kill via srd/attack/melee and assert
// srd/condition/dead on live — untagged, that write would silently stop
// firing and regress every one of those live suites.
const GOBLIN_TAGS = [
	CREATURE_NICHE_TAG,
	GOBLIN_ALIGNMENT_TAG,
	GOBLIN_LANGUAGE_COMMON_TAG,
	GOBLIN_LANGUAGE_GOBLIN_TAG,
	MONSTER_TAG,
];

/**
 * The staging node combatants occupy before the session mints its own
 * tactical grid — dedicated (never the shared proof cell). Authored via
 * `spellkave_write_rows` directly (NOT a second `spellkave_author_place`
 * call): `spellkave_author_place`'s own doc comment says "the FIRST node
 * becomes the place_graph's anchor_node_id" — a SECOND call against the SAME
 * graph would silently overwrite the graph's already-established
 * `anchor_node_id`/`description` with this node's (live-reproduced while
 * building this scene: the diff showed `shared/spatial.toml`'s
 * `place_graphs.anchor_node_id` flip from the checks fragment's own cell to
 * this one). `calls/shared.ts`'s own "finding #50 workaround" comment sets
 * the SAME precedent — additional nodes into an existing graph go through
 * `write_rows`, never a repeat `author_place` call.
 */
export const COMBAT_ARENA_ANCHOR_CALLS: readonly VerbCall[] = [
	{
		toolName: "spellkave_write_rows",
		label: "proof-combat-arena-anchor",
		params: {
			bundle: PROOF_BUNDLE_ID,
			kind: "place_nodes",
			rows: [
				{
					node_id: ARENA_ANCHOR_NODE_ID,
					bundle_id: PROOF_BUNDLE_ID,
					place_graph_id: PROOF_GRAPH_ID,
					local_id: "combat_arena_gate",
					substrate_id: "outdoor",
					display_name: "Combat Arena Gate",
					pos_present: false,
				},
			],
		},
	},
];

/** The 10x10 combat_grid_blueprint: srd/affordance/grid-step edges (ADR-0134 D-5, occupancy-gated) + two difficult-terrain overrides. */
export const COMBAT_ARENA_GRID_CALLS: readonly VerbCall[] = [
	{
		toolName: "spellkave_write_rows",
		label: "proof-combat-arena-blueprint",
		params: {
			bundle: PROOF_BUNDLE_ID,
			kind: "combat_grid_blueprints",
			rows: [
				{
					blueprint_id: ARENA_BLUEPRINT_ID,
					bundle_id: PROOF_BUNDLE_ID,
					width: ARENA_GRID_WIDTH,
					height: ARENA_GRID_HEIGHT,
					topology: ARENA_GRID_TOPOLOGY,
					cell_size_m: ARENA_GRID_CELL_SIZE_M,
					edge_affordance_template_id: GRID_STEP_AFFORDANCE_ID,
					edge_affordance_bindings_json: STEP_EDGE_BINDINGS_JSON,
					edge_overrides_json: JSON.stringify([
						{
							from: ARENA_DIFFICULT_TERRAIN_FROM_LOCAL,
							to: ARENA_DIFFICULT_TERRAIN_TO_LOCAL,
							movement_cost_cells: ARENA_DIFFICULT_TERRAIN_COST_CELLS,
							label: ARENA_DIFFICULT_TERRAIN_LABEL,
						},
						{
							from: ARENA_DIFFICULT_TERRAIN_TO_LOCAL,
							to: ARENA_DIFFICULT_TERRAIN_FROM_LOCAL,
							movement_cost_cells: ARENA_DIFFICULT_TERRAIN_COST_CELLS,
							label: ARENA_DIFFICULT_TERRAIN_LABEL,
						},
					]),
				},
			],
		},
	},
];

/**
 * Live-proof correction (Slice C, 2026-07-31 — `combat-arena.ts`'s own module
 * header has the full grounding): `r_move.rs` runs TWO independent gates, not
 * one. `evaluate_edge_traversal_affordances` (the per-edge `place_edge_
 * affordance` predicate check) trivially passes with no attachment row, as
 * originally verified — but `select_movement_affordance` + `validate_
 * movement_target_revalidation` is a SEPARATE gate that requires a REAL
 * `spatial_niche_attachment` row for `srd/niche/traversable-square`, live-
 * reproduced as a hard rejection (`precondition_failed: attachment_presence`)
 * without one. Since the arena's grid edges are minted fresh per session
 * (`r_session_open.rs`'s `materialise_tactical_grid`), their numeric
 * `place_edge_id`s are unknowable at authoring time — so this is a single
 * WILDCARD row — `place_edge_id` EXPLICITLY `0` (the sentinel `validate_
 * movement_target_revalidation`'s own fallback branch matches against),
 * covering every session's grid rather than one row per edge. Live-reproduced
 * (MF-APPLY-020 "must declare place_node_id or place_edge_id") that OMITTING
 * the field entirely is rejected by manifest-commit validation — `0` must be
 * authored as a real value, not left to a client-side default.
 */
export const COMBAT_ARENA_TRAVERSABLE_NICHE_ATTACHMENT_CALLS: readonly VerbCall[] = [
	{
		toolName: "spellkave_write_rows",
		label: "proof-combat-arena-traversable-niche-attachment",
		params: {
			bundle: PROOF_BUNDLE_ID,
			kind: "spatial_niche_attachments",
			rows: [
				{
					bundle_id: PROOF_BUNDLE_ID,
					niche_id: TRAVERSABLE_SQUARE_NICHE_ID,
					place_edge_id: 0,
					visibility: "Public",
					condition_bool: true,
					ecological_invariant: false,
				},
			],
		},
	},
];

/**
 * Live-proof correction, second gap (Slice C, 2026-07-31): `r_manipulate`'s
 * OWN act-path revalidation (`target.rs`'s `revalidate_spatial_target_
 * preconditions`) ALSO requires a real `spatial_niche_attachment` for
 * `srd/niche/strikeable` at the target's spatial location — live-reproduced
 * as intermittent `precondition_failed: attachment_presence` /
 * `predicate_rejected` rejections against both goblins (94 consecutive
 * live attempts, zero admits). The design doc's "no attachment row needed"
 * claim for this niche covered ONLY `target_niches.rs`'s `append_authored_
 * target_niches` (a DIFFERENT, PERCEPTION-side mechanism) — this is a THIRD,
 * independent gate, same missed-verification class as the movement fix
 * above. Unlike that edge-scoped fix, `spatial/facts.rs`'s `niche_
 * attachment_place_node_scope` documents the RIGHT scope directly: "a
 * tactical-grid cell inherits the attachments authored at its grid
 * instance's ANCHOR node" (ephemeral-instance inheritance, not a `0`
 * sentinel) — so this is ONE node-scoped row at `ARENA_ANCHOR_NODE_ID`
 * (the arena's own grid anchor), inherited by every cell of every session's
 * freshly-materialised grid.
 */
export const COMBAT_ARENA_STRIKEABLE_NICHE_ATTACHMENT_CALLS: readonly VerbCall[] = [
	{
		toolName: "spellkave_write_rows",
		label: "proof-combat-arena-strikeable-niche-attachment",
		params: {
			bundle: PROOF_BUNDLE_ID,
			kind: "spatial_niche_attachments",
			rows: [
				{
					bundle_id: PROOF_BUNDLE_ID,
					niche_id: `${BUNDLE_ID}/${STRIKEABLE_NICHE_LOCAL_ID}`,
					place_node_id: ARENA_ANCHOR_NODE_ID,
					visibility: "Public",
					condition_bool: true,
					ecological_invariant: false,
				},
			],
		},
	},
];

/**
 * `ledger/designs/prone-free-action.md` Slice B item 4 (the arena proof),
 * root-caused live: a purely capability-gated niche (`capability:<id>`, no
 * `srd/niche/strikeable`-style spatial reuse) is NOT automatically offered
 * anywhere — it needs its OWN `spatial_niche_attachment` row, same as
 * `srd/action/dodge`'s niche is attached at the STATIC identity-proof's own
 * `scene/cell_a` (`proof-scene/combat.ts`, this package's OTHER scene) —
 * dodge.ts's own fragment carries no attachment either; each SCENE that
 * wants a self-capability action attaches it to its OWN nodes. Without this,
 * BOTH factual manipulation-context discovery AND a raw `r_manipulate`
 * dispatch reject the action outright (live-reproduced: a raw dispatch of
 * `srd/action/drop-prone` against the Hero's own body silently never wrote
 * `srd/condition/prone` — no exception, no provenance row — before this
 * attachment existed). Same `ARENA_ANCHOR_NODE_ID`-inheritance shape as the
 * strikeable niche immediately above. Covers BOTH self-capability actions
 * this arena authors: `srd/action/drop-prone` (chapter content) and
 * `combat-arena/clear-prone` (this file's own PROOF-SCENE-only action).
 */
export const COMBAT_ARENA_SELF_ACTION_NICHE_ATTACHMENT_CALLS: readonly VerbCall[] = [
	{
		toolName: "spellkave_write_rows",
		label: "proof-combat-arena-drop-prone-niche-attachment",
		params: {
			bundle: PROOF_BUNDLE_ID,
			kind: "spatial_niche_attachments",
			rows: [
				{
					bundle_id: PROOF_BUNDLE_ID,
					niche_id: `capability:${DROP_PRONE_CAPABILITY_ID}`,
					place_node_id: ARENA_ANCHOR_NODE_ID,
					visibility: "Public",
					condition_bool: true,
					ecological_invariant: false,
				},
			],
		},
	},
	{
		toolName: "spellkave_write_rows",
		label: "proof-combat-arena-clear-prone-niche-attachment",
		params: {
			bundle: PROOF_BUNDLE_ID,
			kind: "spatial_niche_attachments",
			rows: [
				{
					bundle_id: PROOF_BUNDLE_ID,
					niche_id: `capability:${ARENA_CLEAR_PRONE_CAPABILITY_ID}`,
					place_node_id: ARENA_ANCHOR_NODE_ID,
					visibility: "Public",
					condition_bool: true,
					ecological_invariant: false,
				},
			],
		},
	},
];

/** The hero + three Goblin Warriors, faction-tagged, positioned at the arena anchor. */
export const COMBAT_ARENA_COMBATANT_CALLS: readonly VerbCall[] = [
	{
		toolName: "spellkave_define_entity_type",
		label: "proof-arena-training-weapon-def",
		params: {
			bundle: PROOF_BUNDLE_ID,
			id: ARENA_WEAPON_DEF_LOCAL_ID,
			display_name: "Arena Training Weapon",
			description:
				"TEST-ONLY dual-mode weapon for the existing combat-arena proof. Its two range tags and " +
				"source facts exercise both weapon variants from one deterministic equipped item; product " +
				"SRD weapons each carry only their sourced melee or ranged mode.",
			slot_compatibility_predicate: `slot_id == "${ARENA_MAIN_HAND_SLOT_ID}"`,
			tags: [
				"srd.item",
				WEAPON_TAG,
				`${WEAPON_RANGE_TAG_PREFIX}.melee`,
				`${WEAPON_RANGE_TAG_PREFIX}.ranged`,
			],
		},
	},
	{
		toolName: "spellkave_write_rows",
		label: "proof-arena-training-weapon-sources",
		params: {
			bundle: PROOF_BUNDLE_ID,
			kind: "entity_definition_item_dsl_source",
			rows: [
				{
					entity_def_id: ARENA_WEAPON_DEF_ID,
					bundle_id: PROOF_BUNDLE_ID,
					slot: WEAPON_DAMAGE_SLOT_ID,
					source: `${ARENA_WEAPON_DAMAGE_DICE} + 2`,
				},
				{
					entity_def_id: ARENA_WEAPON_DEF_ID,
					bundle_id: PROOF_BUNDLE_ID,
					slot: WEAPON_ATTACK_RANGE_SLOT_ID,
					source: String(100 * 304.8),
				},
			],
		},
	},
	{
		toolName: "spellkave_define_entity_type",
		label: "proof-arena-hero-def",
		params: {
			bundle: PROOF_BUNDLE_ID,
			id: ARENA_HERO_DEF_LOCAL_ID,
			display_name: "Combat Arena Hero",
			description:
				"TEST-ONLY combat-arena proof (Slice B) hero — dedicated, not the shared identity-proof " +
				"hero (session/turn-state isolation, same rationale as identity.ts's own advantage-dummy " +
				"header note). str/dex reuse the already-established proof seed values (14/14); level " +
				"reuses the identity-proof's own PROOF_LEVEL_VALUE (5) so the baked Proficiency Bonus " +
				"(`ARENA_HERO_PROFICIENCY_BONUS`) stays table-derived, see combat-arena.ts's own " +
				"ARENA_HERO_LEVEL header note. Base AC is derived (unarmoredBaseArmorClass); equipped Chain Mail " +
				"applies its authored modifier. HP/Speed are scene-owned (combat-" +
				"arena.ts's own module header). Faction membership is an INSTANCE-level entity_tag (below), " +
				"not a definition tag — death-saves.toml:649-671 precedent.",
			tags: [CREATURE_NICHE_TAG],
			// Creature identity derives Walk and Attack. Drop Prone stays direct:
			// it is proof-specific behavior used only by this Hero.
			initial_capabilities: [{ capability: DROP_PRONE_CAPABILITY_ID }],
			initial_states: [
				{ state: REACH_RESOURCE_ID, value_int: STANDARD_REACH_MM },
				{ state: STR_STATE_ID, value_int: ARENA_HERO_STR },
				{ state: DEX_STATE_ID, value_int: ARENA_HERO_DEX },
				{ state: LEVEL_STATE_ID, value_int: ARENA_HERO_LEVEL },
				{ state: AC_STATE_ID, value_int: ARENA_HERO_AC },
				{ state: HP_STATE_ID, value_int: ARENA_HERO_HP },
				{ state: SPEED_WALK_STATE_ID, value_int: ARENA_HERO_SPEED_WALK },
				{ state: PROFICIENCY_BONUS_ID, value_int: ARENA_HERO_PROFICIENCY_BONUS },
			],
		},
	},
	{
		toolName: "spellkave_write_rows",
		label: "proof-arena-hero-initial-weapon",
		params: {
			bundle: PROOF_BUNDLE_ID,
			kind: "entity_definition_initial_equipment",
			rows: [
				{
					entity_def_id: ARENA_HERO_DEF_ID,
					equipped_entity_def_id: "srd/armor/chain-mail",
					slot_id: "srd/slot/chest",
					bundle_id: PROOF_BUNDLE_ID,
				},
				{
					entity_def_id: ARENA_HERO_DEF_ID,
					equipped_entity_def_id: ARENA_WEAPON_DEF_ID,
					slot_id: ARENA_MAIN_HAND_SLOT_ID,
					bundle_id: PROOF_BUNDLE_ID,
				},
			],
		},
	},
	{
		toolName: "spellkave_place_actor",
		label: "proof-arena-hero-placement",
		params: {
			bundle: PROOF_BUNDLE_ID,
			kind: "player",
			entity_def: ARENA_HERO_DEF_ID,
			at: ARENA_ANCHOR_NODE_ID,
			key_prefix: ARENA_HERO_SPAWN_KEY_PREFIX,
			description: "TEST-ONLY spawned instance for the combat-arena proof.",
			// sk-9ll.7: faction membership is an INSTANCE-level entity_tag (world-
			// fixtures/srd/base/death-saves.toml:649-671 precedent), folded into the
			// placement call itself instead of a shared COMBAT_ARENA_FACTION_TAG_CALLS
			// spellkave_write_rows batch.
			tags: [ARENA_PARTY_FACTION_TAG],
		},
	},
	{
		toolName: "spellkave_define_entity_type",
		label: "proof-arena-goblin-a-def",
		params: {
			bundle: PROOF_BUNDLE_ID,
			id: ARENA_GOBLIN_A_DEF_LOCAL_ID,
			display_name: "Goblin Warrior (Arena, A)",
			description:
				"TEST-ONLY combat-arena proof (Slice B) monster — Goblin Warrior stat block " +
				"(cache/markdown/monsters-A-Z.md:7327-7366): AC 15, HP 10, Speed 30 ft., STR 8, DEX 15. " +
				"C3: tagged with alignment + languages grounded in Creature.json's own " +
				"srd-2024_goblin-warrior row (chaotic neutral; Common, Goblin).",
			// C3 (`ledger/character-creation.md`'s "Standing pattern" addendum):
			// alignment + languages, grounded in Creature.json (see this file's
			// own GOBLIN_TAGS comment above), not authorial.
			tags: GOBLIN_TAGS,
			initial_states: [
				{ state: REACH_RESOURCE_ID, value_int: STANDARD_REACH_MM },
				{ state: STR_STATE_ID, value_int: ARENA_GOBLIN_STR },
				{ state: DEX_STATE_ID, value_int: ARENA_GOBLIN_DEX },
				{ state: AC_STATE_ID, value_int: ARENA_GOBLIN_AC },
				{ state: HP_STATE_ID, value_int: ARENA_GOBLIN_HP },
				{ state: SPEED_WALK_STATE_ID, value_int: ARENA_GOBLIN_SPEED_WALK },
				{ state: PROFICIENCY_BONUS_ID, value_int: ARENA_GOBLIN_PROFICIENCY_BONUS },
			],
		},
	},
	{
		toolName: "spellkave_place_actor",
		label: "proof-arena-goblin-a-placement",
		params: {
			bundle: PROOF_BUNDLE_ID,
			kind: "npc",
			entity_def: ARENA_GOBLIN_A_DEF_ID,
			at: ARENA_ANCHOR_NODE_ID,
			key_prefix: ARENA_GOBLIN_A_SPAWN_KEY_PREFIX,
			description: "TEST-ONLY spawned instance for the combat-arena proof (Goblin A).",
			tags: [ARENA_MONSTERS_FACTION_TAG],
		},
	},
	{
		toolName: "spellkave_define_entity_type",
		label: "proof-arena-goblin-b-def",
		params: {
			bundle: PROOF_BUNDLE_ID,
			id: ARENA_GOBLIN_B_DEF_LOCAL_ID,
			display_name: "Goblin Warrior (Arena, B)",
			description:
				"TEST-ONLY combat-arena proof (Slice B) monster — same Goblin Warrior stat block as " +
				"Arena Goblin A (cache/markdown/monsters-A-Z.md:7327-7366), a SEPARATE entity_def " +
				"(mirrors the initiative extension's own Alpha/Beta dedicated-pair convention) so the " +
				"live test can address each independently. C3: same grounded alignment + language " +
				"tags as Goblin A.",
			tags: GOBLIN_TAGS,
			initial_states: [
				{ state: REACH_RESOURCE_ID, value_int: STANDARD_REACH_MM },
				{ state: STR_STATE_ID, value_int: ARENA_GOBLIN_STR },
				{ state: DEX_STATE_ID, value_int: ARENA_GOBLIN_DEX },
				{ state: AC_STATE_ID, value_int: ARENA_GOBLIN_AC },
				{ state: HP_STATE_ID, value_int: ARENA_GOBLIN_HP },
				{ state: SPEED_WALK_STATE_ID, value_int: ARENA_GOBLIN_SPEED_WALK },
				{ state: PROFICIENCY_BONUS_ID, value_int: ARENA_GOBLIN_PROFICIENCY_BONUS },
			],
		},
	},
	{
		toolName: "spellkave_place_actor",
		label: "proof-arena-goblin-b-placement",
		params: {
			bundle: PROOF_BUNDLE_ID,
			kind: "npc",
			entity_def: ARENA_GOBLIN_B_DEF_ID,
			at: ARENA_ANCHOR_NODE_ID,
			key_prefix: ARENA_GOBLIN_B_SPAWN_KEY_PREFIX,
			description: "TEST-ONLY spawned instance for the combat-arena proof (Goblin B).",
			tags: [ARENA_MONSTERS_FACTION_TAG],
		},
	},
	{
		toolName: "spellkave_define_entity_type",
		label: "proof-arena-goblin-c-def",
		params: {
			bundle: PROOF_BUNDLE_ID,
			id: ARENA_GOBLIN_C_DEF_LOCAL_ID,
			display_name: "Goblin Warrior (Arena, C)",
			description:
				"TEST-ONLY combat-arena proof (Slice 2, denser monster roster) monster — same Goblin " +
				"Warrior stat block as Arena Goblin A/B (cache/markdown/monsters-A-Z.md:7327-7366), a " +
				"SEPARATE entity_def so the live test can address it independently.",
			// sk-dms.39/sk-b3m: unlike Goblin A/B/the seat target, this def never
			// carried GOBLIN_TAGS (no alignment/language tags authored for it) —
			// but `cover.ts`'s own live test still kills it via srd/attack/melee
			// and asserts srd/condition/dead, so it needs MONSTER_TAG on its own,
			// same reasoning as the GOBLIN_TAGS comment above.
			tags: [CREATURE_NICHE_TAG, MONSTER_TAG],
			initial_states: [
				{ state: REACH_RESOURCE_ID, value_int: STANDARD_REACH_MM },
				{ state: STR_STATE_ID, value_int: ARENA_GOBLIN_STR },
				{ state: DEX_STATE_ID, value_int: ARENA_GOBLIN_DEX },
				{ state: AC_STATE_ID, value_int: ARENA_GOBLIN_AC },
				{ state: HP_STATE_ID, value_int: ARENA_GOBLIN_HP },
				{ state: SPEED_WALK_STATE_ID, value_int: ARENA_GOBLIN_SPEED_WALK },
				{ state: PROFICIENCY_BONUS_ID, value_int: ARENA_GOBLIN_PROFICIENCY_BONUS },
			],
		},
	},
	{
		toolName: "spellkave_place_actor",
		label: "proof-arena-goblin-c-placement",
		params: {
			bundle: PROOF_BUNDLE_ID,
			kind: "npc",
			entity_def: ARENA_GOBLIN_C_DEF_ID,
			at: ARENA_ANCHOR_NODE_ID,
			key_prefix: ARENA_GOBLIN_C_SPAWN_KEY_PREFIX,
			description: "TEST-ONLY spawned instance for the combat-arena proof (Goblin C).",
			tags: [ARENA_MONSTERS_FACTION_TAG],
		},
	},
];

/**
 * NPC-seat live proof (N3a) — a FOURTH, DEDICATED Goblin Warrior instance,
 * isolated from the scripted A/B/C narrative above (`combat-arena.ts`'s own
 * module header has the full "why a dedicated entity" rationale). SAME
 * Goblin Warrior stat block as A/B/C (no new numbers), a SEPARATE
 * `entity_def` + INSTANCE-level faction tag so the live NPC-seat proof can
 * open its OWN independent session (`[Hero, this goblin]` only) without
 * ever touching the scripted fight's 4 combatants, their claim identities,
 * or the session it already opened.
 */
export const COMBAT_ARENA_SEAT_TARGET_CALLS: readonly VerbCall[] = [
	{
		toolName: "spellkave_define_entity_type",
		label: "proof-arena-goblin-seat-target-def",
		params: {
			bundle: PROOF_BUNDLE_ID,
			id: ARENA_GOBLIN_SEAT_TARGET_DEF_LOCAL_ID,
			display_name: "Goblin Warrior (Arena, NPC-seat target)",
			description:
				"TEST-ONLY combat-arena proof (N3a, NPC-seat live proof) monster — same Goblin Warrior " +
				"stat block as Arena Goblin A/B/C (cache/markdown/monsters-A-Z.md:7327-7366): AC 15, " +
				"HP 10, Speed 30 ft., STR 8, DEX 15. A DEDICATED, isolated instance (own entity_def, own " +
				"session) so this proof's NPC-seat-driven fight never shares state with the scripted " +
				"A/B/C narrative's claim identities, positions, or session.",
			tags: GOBLIN_TAGS,
			initial_states: [
				{ state: REACH_RESOURCE_ID, value_int: STANDARD_REACH_MM },
				{ state: STR_STATE_ID, value_int: ARENA_GOBLIN_STR },
				{ state: DEX_STATE_ID, value_int: ARENA_GOBLIN_DEX },
				{ state: AC_STATE_ID, value_int: ARENA_GOBLIN_AC },
				{ state: HP_STATE_ID, value_int: ARENA_GOBLIN_HP },
				{ state: SPEED_WALK_STATE_ID, value_int: ARENA_GOBLIN_SPEED_WALK },
				{ state: PROFICIENCY_BONUS_ID, value_int: ARENA_GOBLIN_PROFICIENCY_BONUS },
			],
		},
	},
	{
		toolName: "spellkave_write_rows",
		label: "proof-arena-goblin-seat-target-initial-weapon",
		params: {
			bundle: PROOF_BUNDLE_ID,
			kind: "entity_definition_initial_equipment",
			rows: [
				{
					// The NPC-seat proof waits for this Goblin Warrior to strike
					// before the Hero attacks. It therefore needs an honest wielded
					// item now that the retired phantom-melee fallback is gone.
					entity_def_id: ARENA_GOBLIN_SEAT_TARGET_DEF_ID,
					equipped_entity_def_id: ARENA_WEAPON_DEF_ID,
					slot_id: ARENA_MAIN_HAND_SLOT_ID,
					bundle_id: PROOF_BUNDLE_ID,
				},
			],
		},
	},
	{
		toolName: "spellkave_place_actor",
		label: "proof-arena-goblin-seat-target-placement",
		params: {
			bundle: PROOF_BUNDLE_ID,
			kind: "npc",
			entity_def: ARENA_GOBLIN_SEAT_TARGET_DEF_ID,
			at: ARENA_ANCHOR_NODE_ID,
			key_prefix: ARENA_GOBLIN_SEAT_TARGET_SPAWN_KEY_PREFIX,
			description: "TEST-ONLY spawned instance for the NPC-seat live proof (N3a).",
			// sk-9ll.7: folded from a separate spellkave_write_rows(entity_tag) call —
			// INSTANCE-level faction membership, folded into each combatant's own
			// placement call (world-fixtures/srd/base/death-saves.toml:649-671
			// precedent) — same pattern COMBAT_ARENA_COMBATANT_CALLS' hero/goblin-A/B/C
			// placements above use.
			tags: [ARENA_MONSTERS_FACTION_TAG],
		},
	},
];

// `COMBAT_ARENA_WALK_GRANT_CALLS` (the former per-instance `actor_
// capabilities` workaround for `srd/capability/walk`) is GONE. Every
// combatant carries `srd.creature`, so the shared identity bridge derives
// Walk and Attack without definition- or instance-level universal seeds.
// Instance-level `actor_capabilities` stays reserved for genuine runtime
// deltas, not identity-time grants.

/**
 * Cover, Slice 2 "denser monster roster" bonus unit (`combat-arena.ts`'s own
 * module header has the full grounding + mechanism note). A TEST-ONLY,
 * guaranteed-success (Deterministic — the schema default, no roll at all)
 * check-shaped action the Hero casts against a living goblin, landing the
 * SHIPPED base-bundle `srd/cover/half` condition via ApplyStatus. `niche_id`
 * REUSES `srd/niche/strikeable` — the SAME target class melee/ranged already
 * gate on, already attached at `ARENA_ANCHOR_NODE_ID` and inherited by every
 * session's freshly-materialised grid (`COMBAT_ARENA_STRIKEABLE_NICHE_
 * ATTACHMENT_CALLS`, above) — no NEW attachment needed. `range_m` reuses
 * `RANGED_ATTACK_RANGE_METERS` (~80 ft), comfortably covering this 10x10
 * grid's own max diagonal (~64 ft), so the Hero can cast it from wherever it
 * currently stands, no forced repositioning. `spends_channel: PRIMARY_
 * CHANNEL_ID` keeps it turn-gated like every other arena action (an
 * unmetered grant would let the Hero spam it mid-turn, muddying the fight's
 * turn-by-turn narrative).
 */
export const COMBAT_ARENA_COVER_GRANT_CALLS: readonly VerbCall[] = [
	{
		toolName: "spellkave_define_capability",
		label: "proof-combat-arena-cover-grant-capability",
		params: {
			bundle: PROOF_BUNDLE_ID,
			id: "combat-arena/cover-grant",
			display_name: "Grant Cover (combat-arena proof)",
			description:
				"TEST-ONLY combat-arena proof (Slice 2, denser monster roster) capability: lands the " +
				"shipped srd/cover/half condition on a living goblin, simulating a DM/environment " +
				"cover declaration mid-fight.",
			actor_kind: "entity",
			// No `tags` (unlike the base-bundle short-rest/heroic-inspiration
			// precedents this call otherwise mirrors): a proof-scene-authored
			// `capability_definition_tag` row has no review fragment routing yet
			// (`proof-scene-layout.ts`) — omitting it is the minimal-footprint
			// fix for TEST-ONLY content that gains nothing from the tag.
		},
	},
	{
		toolName: "spellkave_define_action_verb",
		label: "proof-combat-arena-cover-grant-action",
		params: {
			bundle: PROOF_BUNDLE_ID,
			id: "combat-arena/cover-grant",
			required_capability: ARENA_COVER_GRANT_CAPABILITY_ID,
			niche_id: `${BUNDLE_ID}/${STRIKEABLE_NICHE_LOCAL_ID}`,
			display_name: "Grant Cover",
			description:
				"TEST-ONLY combat-arena proof (Slice 2) action: lands the shipped srd/cover/half " +
				"condition on the target, guaranteed (Deterministic — no roll), simulating a DM/" +
				"environment cover declaration.",
			range_m: RANGED_ATTACK_RANGE_METERS,
			spends_channel: PRIMARY_CHANNEL_ID,
			cost_time_ms: 0,
			consequence: {
				description: "Apply the shipped srd/cover/half condition to the manipulation's target.",
				frame_writes: [
					{
						ApplyStatus: {
							target_kind: "entity",
							target_ref: "TargetActor",
							condition_definition_id: ARENA_COVER_HALF_CONDITION_ID,
						},
					},
				],
			},
		},
	},
	{
		toolName: "spellkave_write_rows",
		label: "proof-combat-arena-cover-grant-capability-grant",
		params: {
			bundle: PROOF_BUNDLE_ID,
			kind: "actor_capabilities",
			rows: [
				{
					actor_entity_key: `${PROOF_BUNDLE_ID}/${ARENA_HERO_SPAWN_KEY_PREFIX}_1`,
					bundle_id: PROOF_BUNDLE_ID,
					capability_id: ARENA_COVER_GRANT_CAPABILITY_ID,
					source: PROOF_BUNDLE_ID,
				},
			],
		},
	},
];

/**
 * `ledger/designs/prone-free-action.md` Slice B item 4 (the arena proof):
 * a TEST-ONLY, guaranteed-success "clear prone" self-action mirroring
 * `COMBAT_ARENA_COVER_GRANT_CALLS` immediately above — a `RemoveCondition`
 * frame write on `TargetActor` (self_only, so Actor == TargetActor) lets the
 * live proof end the Hero's `srd/condition/prone` between narrative blocks.
 * This is DELIBERATELY NOT the SRD's own Stand Up (half-Speed cost, not
 * modelable — finding #27, `fragments/drop-prone.ts`'s own header note); it
 * is scene infrastructure only, same "simulating a DM/environment
 * declaration" posture the cover-grant action already established.
 * `source_match: "Any"` mirrors this package's own bare-string convention
 * for data-less tagged-enum variants (e.g. `delta_kind: "Disadvantage"`,
 * `fragments/conditions.ts`) — `ConditionSourceMatch::Any` carries no data,
 * so it is authored the same way `TargetKind::Entity` is (`target_kind:
 * "entity"`), never a nested `{Any: {}}` tag object.
 */
export const COMBAT_ARENA_CLEAR_PRONE_CALLS: readonly VerbCall[] = [
	{
		toolName: "spellkave_define_capability",
		label: "proof-combat-arena-clear-prone-capability",
		params: {
			bundle: PROOF_BUNDLE_ID,
			id: "combat-arena/clear-prone",
			display_name: "Clear Prone (combat-arena proof)",
			description:
				"TEST-ONLY combat-arena proof (Slice B item 4) capability: removes the acting " +
				"creature's own srd/condition/prone, ending the causal-Disadvantage demonstration " +
				"between narrative blocks — NOT the SRD's Stand Up (half-Speed cost, not modelable, " +
				"finding #27).",
			actor_kind: "entity",
			// No `tags`, same minimal-footprint rationale as
			// `COMBAT_ARENA_COVER_GRANT_CALLS`'s own capability above.
		},
	},
	{
		toolName: "spellkave_write_rows",
		label: "proof-combat-arena-clear-prone-niche",
		params: {
			bundle: PROOF_BUNDLE_ID,
			kind: "niche_definitions",
			rows: [
				{
					niche_id: `capability:${ARENA_CLEAR_PRONE_CAPABILITY_ID}`,
					bundle_id: PROOF_BUNDLE_ID,
					display_name: "Clear Prone (proof, place-provided)",
					description:
						"WA-CAP-002 (sk-0m4.69): capability:* niches require an explicit provider. " +
						"This proof-only clear-prone verb stays place-attached at the arena anchor.",
					predicate_source: "",
					provider: "place",
				},
			],
		},
	},
	{
		toolName: "spellkave_define_action_verb",
		label: "proof-combat-arena-clear-prone-action",
		params: {
			bundle: PROOF_BUNDLE_ID,
			id: "combat-arena/clear-prone",
			required_capability: ARENA_CLEAR_PRONE_CAPABILITY_ID,
			niche_id: `capability:${ARENA_CLEAR_PRONE_CAPABILITY_ID}`,
			display_name: "Clear Prone",
			description:
				"TEST-ONLY combat-arena proof (Slice B item 4) action: removes srd/condition/prone " +
				"from the acting creature, guaranteed (Deterministic — no roll).",
			self_eligible: true,
			self_only: true,
			spends_channel: PRIMARY_CHANNEL_ID,
			cost_time_ms: 0,
			consequence: {
				description: "Remove srd/condition/prone from the acting creature.",
				frame_writes: [
					{
						RemoveCondition: {
							target_kind: "entity",
							target_ref: "TargetActor",
							condition_definition_id: PRONE_CONDITION_ID,
							source_match: "Any",
						},
					},
				],
			},
		},
	},
	{
		toolName: "spellkave_write_rows",
		label: "proof-combat-arena-clear-prone-capability-grant",
		params: {
			bundle: PROOF_BUNDLE_ID,
			kind: "actor_capabilities",
			rows: [
				{
					actor_entity_key: `${PROOF_BUNDLE_ID}/${ARENA_HERO_SPAWN_KEY_PREFIX}_1`,
					bundle_id: PROOF_BUNDLE_ID,
					capability_id: ARENA_CLEAR_PRONE_CAPABILITY_ID,
					source: PROOF_BUNDLE_ID,
				},
			],
		},
	},
];

/**
 * Scheduler + session: `order_roll_source` is the REAL d20 + Dex-modifier
 * idiom (`initiativeRollExpr`, `order-of-combat-units.ts`), matching the
 * `initiative-idiom` scheduler's own shape (`proof-scene/calls/
 * initiative.ts`). `termination_pred`/`winner_predicate` key on faction
 * counts excluding `srd/condition/incapacitated` — precedent `world-
 * fixtures/srd/base/sessions.toml:23-40`, srd-own condition id (`srd/dead`
 * cascades to `srd/condition/incapacitated` via `implies`,
 * `fragments/conditions.ts`) — expressible because Task 1's lethal wiring
 * (this slice, weapon-attack-units.ts's `monsterDeathFrameWrite`) actually
 * applies that condition on a killing blow.
 */
export const COMBAT_ARENA_SESSION_CALLS: readonly VerbCall[] = [
	{
		toolName: "spellkave_write_rows",
		label: "proof-combat-arena-scheduler",
		params: {
			bundle: PROOF_BUNDLE_ID,
			kind: "turn_scheduler",
			rows: [
				{
					active: false,
					bundle_id: PROOF_BUNDLE_ID,
					id: ARENA_SCHEDULER_ID,
					order_roll_source: initiativeRollExpr(`actor.effective('${DEX_STATE_ID}')`),
					scheduler_kind: "rolled_order",
					description:
						"TEST-ONLY combat-arena proof scheduler: the real d20 + Dex-modifier Initiative " +
						"idiom, rolled per-participant (finding #26).",
				},
			],
		},
	},
	{
		toolName: "spellkave_write_rows",
		label: "proof-combat-arena-session",
		params: {
			bundle: PROOF_BUNDLE_ID,
			kind: "session_definitions",
			rows: [
				{
					auto_join_on_targeting: false,
					bundle_id: PROOF_BUNDLE_ID,
					combat_grid_blueprint_id: ARENA_BLUEPRINT_ID,
					// Vestigial when combat_grid_blueprint_id is set — r_session_open.rs's
					// tactical_grid_policy() reads the BLUEPRINT's own edge template/bindings
					// exclusively in that case (verified directly, not assumed), so these two
					// fields are left empty rather than a confusing, unused second copy of the
					// blueprint's own values.
					grid_edge_affordance_bindings_json: "{}",
					grid_edge_affordance_template_id: "",
					initial_state: "",
					legal_moves_csv: "",
					on_terminate: "",
					participants_pred: "",
					round_duration_ms: ARENA_ROUND_DURATION_MS,
					session_def_id: ARENA_SESSION_DEF_ID,
					stakes_required: "",
					termination_pred: `participant_tag_group_count("srd.faction.") >= 2 && participant_tag_group_count("srd.faction.", "${INCAPACITATED_CONDITION_ID}") <= 1`,
					// sk-jay0.2.40.2 / ADR-0143: a Dead combatant (Monster Death) is
					// skipped; an Unconscious PC keeps its turn for death saves.
					turn_eligibility_pred: TAKES_TURN_ELIGIBILITY_PRED,
					turn_rule: "Sequential",
					turn_scheduler_id: ARENA_SCHEDULER_ID,
					visibility_policy: "Public",
					winner_predicate: `participant_tag_group_count("srd.faction.", "${INCAPACITATED_CONDITION_ID}") == 1`,
				},
			],
		},
	},
];

export const COMBAT_ARENA_CALLS: readonly VerbCall[] = [
	...COMBAT_ARENA_ANCHOR_CALLS,
	...COMBAT_ARENA_GRID_CALLS,
	...COMBAT_ARENA_TRAVERSABLE_NICHE_ATTACHMENT_CALLS,
	...COMBAT_ARENA_STRIKEABLE_NICHE_ATTACHMENT_CALLS,
	...COMBAT_ARENA_COMBATANT_CALLS,
	...COMBAT_ARENA_SEAT_TARGET_CALLS,
	...COMBAT_ARENA_COVER_GRANT_CALLS,
	...COMBAT_ARENA_CLEAR_PRONE_CALLS,
	...COMBAT_ARENA_SELF_ACTION_NICHE_ATTACHMENT_CALLS,
	...COMBAT_ARENA_SESSION_CALLS,
];
