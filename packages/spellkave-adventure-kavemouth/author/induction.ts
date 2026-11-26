/**
 * // pattern: proactive-level-up
 *
 * The induction ceremony (sk-s26, REDESIGNED sk-h6d) — the authored
 * capability + affordance that carries a finished creation candidate out of
 * the limbo and into the adventure, now held by ALDWIN, not a second DM
 * entity.
 *
 * HISTORY, why this changed twice: sk-s26's first cut granted the induction
 * capability to Aldwin directly — wrong, because `r_manipulate` target
 * eligibility requires actor/target co-location
 * (`server/src/world_interaction/layer2/r_manipulate/target.rs:198-220`),
 * and Aldwin (at `kavemouth/inn/common_room`) had no way to reach the
 * DELIBERATELY disconnected creation limbo. sk-s26's "officiant fix" then
 * authored a SECOND, limbo-resident DM entity to hold both the dialogue's
 * own co-location prerequisites and this induction capability — rejected by
 * the operator (bead sk-h6d): "a copy of one identity, and copies drift.
 * There is one DM in this world and it is Aldwin." `../dm-threshold.ts`
 * closes the ORIGINAL gap directly instead — a door only a DM can walk
 * (gated on the `kavemouth/dm/seat` capability
 * `DM_SEAT_CAPABILITY_ID`, not on `frontier.apply_manifest`, which is
 * authoring authority; see `../dm-threshold.ts`) — so Aldwin can now
 * genuinely reach the limbo, co-locate with the candidate, and this
 * capability returns to him, its original, correct holder.
 * `@spellkave/adventure-runtime/dm/seat` (configured by
 * `../npcs/aldwin/seat.ts`) owns the choreography of WHEN he walks there and
 * back.
 *
 * Canon constraint (ADR-0007 P-2/P-3): NO out-of-world DM privilege layer
 * exists in this system. This capability is one ordinary
 * `capability_definitions` row plus one ordinary grant — same shape as
 * every other row `dm-npc.ts` grants Aldwin — never a privileged escape
 * hatch.
 *
 * SHAPE: one capability_definitions row (granted to Aldwin) + one
 * `spellkave_define_action_verb` call authoring the affordance and its
 * outcome/consequence TOGETHER — action_definitions + outcome_templates +
 * affordance_templates + consequence_templates + consequence_frame_writes
 * in a single call (the authoring block shape corpus.ts:551-554 documents
 * for `RelocateEntity`). sk-0m4.4 retired the two speech
 * spatial_niche_attachments that used to live at the limbo node — Speak is
 * actor-/entity-provided now, so the dialogue no longer needs a per-room
 * opt-in.
 *
 * GATE + id-derivation shape both mirror `src/dm/level-up/render.ts`'s own
 * `offer-level-up` — the closest existing "a DM extends an offer to a
 * co-located creature" precedent in this world: a DM-owned, MANIPULATE-class
 * (DM -> target), target-gated affordance, `self_eligible: false` (Aldwin
 * fires it, never the candidate on themself), `non_steering: true` (a
 * cooperative effect the candidate wants, never a hostile one),
 * capability-local-id derived as `action/<action-local-id>` off the SAME
 * stem as the action's own id. Gate: post-`confirm` only
 * (blueprint-backed `srd.faction.party` membership AND absence of
 * `dm/creation/drafting`, removed by the successful finish act). The seat
 * requires all completeness act receipts before induction.
 *
 * CEREMONY CLOSE (sk-tyhy.5): the same success consequence also parks
 * Aldwin's own dialog latch at idle (`dm/dialog/open` → 0) and the wizard
 * phase at confirmed (`dm/creation/phase` → 6). The creation engine already
 * *wants* those values after SpeakClosing (`desiredOpen` / `desiredPhase`),
 * but the seat inducts on the next wait cycle and never gets another
 * AlignOpen/AlignPhase at the station — leftover open=2 kept offering the
 * creation menu beside him. Writing both on this consequence is the moment
 * the ceremony is over, independent of that race. Idempotent if Align* did
 * land first (the exact-value state update is unchanged).
 *
 * MECHANISM vs STORY: the rendering lives in
 * `@spellkave/adventure-runtime/dm/creation` (`induction.ts`); this file
 * passes kavemouth's bundle, Aldwin, the hero wake node and persona.
 */

import {
	induction as genericInduction,
	inductionIds,
} from "@spellkave/adventure-runtime/dm/creation";
import type { VerbCall } from "@spellkave/adventure-runtime/dm/lib";
import { ADVENTURE_HERO_WAKE_NODE_ID } from "./hero.ts";
import { ALDWIN_ENTITY_KEY } from "./lib/entity-keys.ts";
import { BUNDLE } from "./lib/ids.ts";

const IDS = inductionIds(BUNDLE);

/** The action's own local id (the capability is `action/<this>`, never the reverse). */
export const INDUCT_ACTION_LOCAL_ID = IDS.actionLocalId;
export const INDUCT_ACTION_ID = IDS.actionId;
export const INDUCT_CAPABILITY_LOCAL_ID = IDS.capabilityLocalId;
export const INDUCT_CAPABILITY_ID = IDS.capabilityId;

export function induction(): VerbCall[] {
	return genericInduction({
		bundle: BUNDLE,
		dmEntityKey: ALDWIN_ENTITY_KEY,
		destinationNodeId: ADVENTURE_HERO_WAKE_NODE_ID,
		personaName: "Aldwin",
		personaSlug: "aldwin",
	});
}
