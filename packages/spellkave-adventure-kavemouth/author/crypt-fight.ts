/**
 * // pattern: role-driven-brain
 *
 * N3b — the crypt-hall Goblin ("Crypt Warden") turn-based grid fight.
 *
 * Successor of the deleted `tomb-fight.ts` (retired by T24 when chapter 5
 * became sessionless — `ledger/designs/tool-ux-decision-log.md`'s T24 entry).
 * The authored call-initiative act uses the existing ephemeral
 * combat-grid apparatus, anchored this time at the tomb's own `crypt` node
 * (`tomb.ts`'s already-authored node, one hop below `hall` — never a new
 * node). Unlike the slime, this fight is a REAL round-based encounter: the
 * Warden gets its own turns via a `@spellkave/npc` seat driving PLAYER tools
 * (T22's whole aspiration — "a real NPC brain instead of a script").
 *
 * The Warden IS `srd/creature/goblin-warrior` (`chapters/monsters/
 * creature-units.ts`) — same numbers the combat-arena proof already cites
 * (`cache/markdown/monsters-A-Z.md:7327-7366`: AC 15, base HP 10, Speed
 * 30 ft. / 6 cells, STR 8, DEX 15, PB +2). Instance identity (name,
 * description, key) lives on the adventure side. The definition equips a
 * Shortbow; the Warden therefore fights through `srd/attack/ranged`, not a
 * hand-authored Scimitar. Catalog `srd/xp_value` is CR 1/4 = 50 (BL-55).
 * This adventure overrides the Warden's instance to 300 so a single
 * kill-time grant (sk-0m4.27) still crosses the level-2 threshold — the
 * SAME `place_actor.resources` idiom below also carries the `srd/hp`
 * override (see next paragraph), mirroring the Slime Scout's own.
 *
 * sk-tyhy (2026-08-23): `srd/hp` OVERRIDDEN to {@link WARDEN_HP} = 11
 * (borrowed from the SRD's own Hobgoblin Warrior stat block, `cache/
 * markdown/monsters-A-Z.md:9375-9382`, CR 1/2, HP 11 (2d8+2) — an SRD-real
 * number, not a hand-picked magic one) after apply-level-up's own fix
 * (`dm/level-up/render.ts`) started actually succeeding: the hero now
 * properly reaches Fighter L2 through this chapter and gains Action Surge
 * (`srd/fighter/action-surge-uses`, one additional action on your turn),
 * letting them Attack twice in one round instead of once. Against the base
 * 10 HP that meant the fight ended before the Warden ever got a turn
 * ("no initiative called, one-shot kill"), breaking [finding:98]'s own
 * premise (a self_hit WorldEvent proof needs the Warden to land at least
 * one confirmed strike, i.e. the fight surviving into a second round).
 *
 * Two things tried and reverted before landing on 11, both live-verified
 * in the frozen TypeScript story recording (the recorder is retired):
 * (1) FULLY SWAPPING to `srd/creature/goblin-boss` (own Multiattack, HP
 * 21) — the Warden's role-driven combat seat could not decide to act with
 * Multiattack available, stalling the fight in an infinite "Hold — let it
 * come to you" loop (the hero's own script waits for the Warden's FIRST
 * decided strike before attacking back) until the chapter's 150s deadline.
 * (2) `srd/hp` OVERRIDDEN to 21 on the proven-working Goblin Warrior shape
 * (no def swap) — this DID avoid the AI stall, but under this chapter's
 * pinned RNG seed the hero's own two Action-Surge hits (10 + 6 damage,
 * both landing round 1) leave a 21-HP Warden alive with 5 HP, and the
 * hero's OWN subsequent rolls go cold (two misses in a row) while the
 * Warden lands all four of its own attacks (4+4+8+1 = 17, exactly the
 * hero's full 17 HP) — the Warden wins outright instead of the intended
 * hero victory. Live-verified with `WARDEN_HP = 11`: hit #1 still deals 10
 * (11 - 10 = 1, survives), the Warden gets its own turn and lands one
 * counter-hit for 4 (hero: 17 -> 13, comfortably alive), then the hero's
 * round-2 swing finishes the remaining 1 HP — exactly one full Warden turn
 * (satisfying [finding:98]) before the fight ends on the hero's own
 * still-lucky early rolls, never reaching the round-3/4 misses that
 * flipped the 21-HP version. (The round-2 hit's own damage roll shifts
 * slightly between HP values — downstream RNG draws move with the target's
 * remaining state — but the *outcome*, one Warden turn then a hero kill,
 * is what this override is tuned for, not a specific damage number.)
 *
 * actor-carried-verbs D1/D7 (ruling bead sk-rd0): attack templates are
 * actor-provided now (`niche/attack-verb`, `fragments/attacks.ts`) — this
 * file no longer attaches `srd/niche/strikeable`/`srd.creature` at the crypt
 * node at all; both templates are offered wherever the Warden/hero stand.
 */

import type { VerbCall } from "@spellkave/adventure-runtime/dm/lib";
import {
	FACTION_MONSTERS_TAG,
	FACTION_PARTY_TAG,
	HP_ID,
	INCAPACITATED_CONDITION_ID,
	SRD_BUNDLE_ID,
	STANDARD_COMBAT_GRID_ID,
	XP_VALUE_ID,
} from "@spellkave/adventure-runtime/srd-ids";
import { asEntityRef } from "@spellkave/sdk";
import {
	initiativeRollExpr,
	TAKES_TURN_ELIGIBILITY_PRED,
} from "../../spellkave-srd-cc/src/chapters/playing-the-game/order-of-combat-units";
import { BUNDLE, GRAPHS, nodeId } from "./lib/ids.ts";

export const CRYPT_FIGHT_PLACE_NODE_ID = nodeId(GRAPHS.tomb, "crypt");

export const WARDEN_DEF_ID = `${SRD_BUNDLE_ID}/creature/goblin-warrior`;
export const WARDEN_KEY_PREFIX = "adventure/npc/crypt_warden";
export const WARDEN_ENTITY_KEY = asEntityRef(`${BUNDLE}/${WARDEN_KEY_PREFIX}_1`);
export const WARDEN_DISPLAY_NAME = "Crypt Warden";

const DEX_STATE_ID = `${SRD_BUNDLE_ID}/dex`;

// sk-ntz.3 (content-hygiene tag rename): renamed from the legacy
// colon-shaped `faction:party`/`faction:monsters` (MF-VAL-296/297/298) to
// the dot-namespace convention, mirroring `combat-arena.ts`'s own
// `ARENA_PARTY_FACTION_TAG`/`ARENA_MONSTERS_FACTION_TAG` rename. Values
// registered in `tag-value-vocabulary.ts`.
export const CRYPT_FIGHT_PARTY_FACTION_TAG = FACTION_PARTY_TAG;
export const CRYPT_FIGHT_MONSTERS_FACTION_TAG = FACTION_MONSTERS_TAG;

export const CRYPT_FIGHT_SCHEDULER_LOCAL_ID = "adventure/turn/crypt-fight";
export const CRYPT_FIGHT_SCHEDULER_ID = `${BUNDLE}/${CRYPT_FIGHT_SCHEDULER_LOCAL_ID}`;
export const CRYPT_FIGHT_SESSION_DEF_LOCAL_ID = "adventure/session/crypt-fight";
export const CRYPT_FIGHT_SESSION_DEF_ID = `${BUNDLE}/${CRYPT_FIGHT_SESSION_DEF_LOCAL_ID}`;
/** playing-the-game.md:877, "a round of combat lasts about 6 seconds" — fiction length only (ADR-0092: round_duration_ms no longer rotates the tick). */
export const CRYPT_FIGHT_ROUND_DURATION_MS = 6_000;
/** Instance override of the Goblin Warrior catalog `srd/xp_value` (50) so
 * Aldwin's kill-time grant still reaches the level-2 threshold (300). */
export const WARDEN_XP_VALUE = 300;
export const WARDEN_XP_VALUE_STATE_ID = `${SRD_BUNDLE_ID}/${XP_VALUE_ID}`;
/** Instance override of the Goblin Warrior catalog `srd/hp` (base 10) — see
 * this file's own header comment for the full sk-tyhy rebalance rationale
 * and why 11 (the SRD's own Hobgoblin Warrior HP, `cache/markdown/
 * monsters-A-Z.md:9375-9382`, CR 1/2, 2d8+2) was borrowed as an honest SRD
 * figure rather than a hand-picked magic number. */
export const WARDEN_HP = 11;
export const WARDEN_HP_STATE_ID = `${SRD_BUNDLE_ID}/${HP_ID}`;

export function cryptFight(): VerbCall[] {
	return [
		{
			toolName: "spellkave_place_actor",
			label: "place-crypt-warden",
			params: {
				bundle: BUNDLE,
				kind: "npc",
				entity_def: WARDEN_DEF_ID,
				at: CRYPT_FIGHT_PLACE_NODE_ID,
				key_prefix: WARDEN_KEY_PREFIX,
				name: WARDEN_DISPLAY_NAME,
				description: "A goblin sentinel standing watch over the crypt's lowest niches.",
				resources: [
					{ resource: WARDEN_XP_VALUE_STATE_ID, value: WARDEN_XP_VALUE },
					{ resource: WARDEN_HP_STATE_ID, value: WARDEN_HP },
				],
				// sk-9ll.7: the Warden's OWN faction tag, folded into the placement call
				// itself. The hero's own faction tag stays a separate spellkave_tag_entity
				// call below (`ADVENTURE_HERO_ENTITY_KEY` is placed in hero.ts, not here —
				// no local placement call to fold it into; sk-ntz.2 migrated that call
				// from a raw spellkave_write_rows(entity_tag)).
				tags: [CRYPT_FIGHT_MONSTERS_FACTION_TAG],
			},
		},
		// The Goblin Warrior definition equips a Shortbow at admission
		// (`entity_definition_initial_equipment`). No adventure-local Scimitar.
		// sk-dms.32: a hostile refusal is a fine answer, but silence is not.
		// The Warden's explicit vocal tag derives Speak. sk-0m4.4 retired the
		// place-side speech attachments: Speak is actor-/entity-provided now,
		// so the crypt needs no spatial_niche_attachment for either speech
		// niche.
		// actor-carried-verbs D1/D7 (ruling bead sk-rd0): the two attachments
		// that used to live here (`srd.creature` for Opportunity Attack/
		// Unarmed, `srd/niche/strikeable` for Melee Attack) are RETIRED — both
		// templates are actor-provided now (`niche/attack-verb`,
		// `fragments/attacks.ts`), offered wherever the Warden/hero stand, no
		// place attachment required. sk-ntz.2: `spellkave_tag_entity` below (not
		// a raw `spellkave_write_rows(entity_tag)`) — `ADVENTURE_HERO_ENTITY_KEY`
		// is placed in `hero.ts`, not here.
		{
			toolName: "spellkave_write_rows",
			label: "adventure-crypt-fight-scheduler",
			params: {
				bundle: BUNDLE,
				kind: "turn_scheduler",
				rows: [
					{
						active: false,
						bundle_id: BUNDLE,
						id: CRYPT_FIGHT_SCHEDULER_ID,
						order_roll_source: initiativeRollExpr(`actor.effective('${DEX_STATE_ID}')`),
						scheduler_kind: "rolled_order",
						description:
							"Kavemouth crypt-fight scheduler: the real d20 + Dex-modifier Initiative idiom (same shape as the combat-arena proof and the retired tomb-fight scheduler).",
					},
				],
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "adventure-crypt-fight-session",
			params: {
				bundle: BUNDLE,
				kind: "session_definitions",
				rows: [
					{
						auto_join_on_targeting: false,
						bundle_id: BUNDLE,
						combat_grid_blueprint_id: STANDARD_COMBAT_GRID_ID,
						// Vestigial when combat_grid_blueprint_id is set (r_session_open.rs
						// reads the blueprint's own edge template/bindings exclusively).
						grid_edge_affordance_bindings_json: "{}",
						grid_edge_affordance_template_id: "",
						initial_state: "",
						legal_moves_csv: "",
						on_terminate: "",
						participants_pred: "",
						round_duration_ms: CRYPT_FIGHT_ROUND_DURATION_MS,
						session_def_id: CRYPT_FIGHT_SESSION_DEF_ID,
						stakes_required: "",
						termination_pred: `participant_tag_group_count("srd.faction.") >= 2 && participant_tag_group_count("srd.faction.", "${INCAPACITATED_CONDITION_ID}") <= 1`,
						// sk-jay0.2.40.3 (ledger/designs/turn-eligibility-predicate.md §6):
						// the srd bundle's `srd/takes-turn` macro. The kernel skips a
						// participant carrying `srd/condition/dead` at every advance, so a
						// slain cultist in the mill fight (the initiative watch, adventure-runtime
						// dm/watches, opens this session) or a slain Warden gets no further turn. A downed
						// hero (Unconscious, not Dead) keeps its turn for death saves.
						turn_eligibility_pred: TAKES_TURN_ELIGIBILITY_PRED,
						turn_rule: "Sequential",
						turn_scheduler_id: CRYPT_FIGHT_SCHEDULER_ID,
						visibility_policy: "Public",
						winner_predicate: `participant_tag_group_count("srd.faction.", "${INCAPACITATED_CONDITION_ID}") == 1`,
					},
				],
			},
		},
	];
}
