/**
 * // pattern: proactive-level-up
 *
 * sk-h6d (REDESIGN) — the DM-only door between the creation limbo and the
 * adventure: a single place_edge, gated so that only an actor holding
 * Aldwin's DM-seat capability may ever walk it.
 *
 * WHY A DOOR, NOT A SECOND DM (operator ruling 2026-08-13, rejecting #2182):
 * #2182 authored a SECOND, limbo-resident DM entity
 * (`elven_mini/adventure/npc/creation-dm_1`) purely so SOMETHING would be
 * co-located with the candidate — the creation dialogue is MANIPULATE-class
 * and needs actor/target co-location
 * (`server/src/world_interaction/layer2/r_manipulate/target.rs:198-220`),
 * and Aldwin (`dm-npc.ts`, resident at the inn) had no way to reach the
 * DELIBERATELY disconnected limbo (`creation-candidate.ts`'s own header).
 * The operator's objection: two DM bodies is a copy of one identity, and
 * copies drift. There is one DM in this world and it is Aldwin — so instead
 * of a second body, this file gives the limbo an EDGE, walkable only by
 * whoever already holds the DM's own standing authority.
 *
 * THE MECHANISM (verified against the code before authoring against it,
 * per the bead brief — `server/src/world_interaction/layer2/r_move.rs`'s own
 * module header): `r_move` commits only after the edge exists, the
 * endpoints match, substrate anchors hold, AND every attached
 * `place_edge_affordance` row's own DSL predicate passes
 * (`evaluate_edge_traversal_affordances`, r_move.rs:752) — an AND-chain over
 * whatever templates are attached to THIS edge's own `edge_key`, evaluated
 * BEFORE the generic movement-affordance scan and independently of it. That
 * makes an edge-specific, capability-gated template a genuine, load-bearing
 * legality gate, not merely a perception filter — confirmed by reading the
 * function, not assumed.
 *
 * THE KEY (PR #2183 review point, resolved): the door originally gated on
 * `frontier.apply_manifest` — Aldwin's own standing AUTHORING authority,
 * borrowed as a stand-in for "is the game master." Those are different
 * things (anyone who may write to the world is not necessarily the DM), and
 * `actor.has_capability(...)` inside a per-edge predicate is a **may-do**
 * gate: ADR-0007 D-3 forbids resolving a may-do via a hardcoded role match
 * (`actor_identity.role == "dm"`) — role/`elevation_class` (ADR-0007 D-2/D-4,
 * ADR-0084) govern read-visibility, not write authority, which stays
 * capability-row gated (`capability_gate_admits`,
 * `server/src/actor/mod.rs`). The fix is therefore a properly-named
 * capability, not a tier: `DM_SEAT_CAPABILITY_ID` (`dm-npc.ts`, see its own
 * doc comment for why it stays adventure-local rather than a new kernel-
 * genesis `frontier.*` id, and for the exact ADR-0007/ADR-0084 reading).
 * `dm-npc.ts` already grants it to Aldwin as his own standing DM-seat
 * capability (its `grant-speak-and-apply-manifest-authority-to-aldwin` call)
 * — this file REUSES that exact row rather than inventing a new privilege
 * mechanism, per the bead's own instruction.
 *
 * ENDPOINT CHOICE: `ALDWIN_PLACE_NODE_ID` (the inn's `common_room`, where
 * Aldwin already sits) <-> `CREATION_LIMBO_NODE_ID`. Not a new antechamber:
 * the hearth Aldwin already keeps his ledger beside is the threshold — no
 * extra node, no extra hop, and it keeps the edge count at exactly one. Both
 * endpoints are authored `substrate: "indoor"` (`creation-candidate.ts`'s
 * own header explains why the limbo itself is "indoor" — it has no
 * real-world position and must stay out of the outdoor H3 composite), so
 * this edge is forced `substrate_crossing: false` explicitly: the two
 * graphs are DIFFERENT `place_graph`s (`spellkave_link_places`' own auto
 * rule treats any cross-graph edge as a substrate crossing by default,
 * needing a real H3 `cell_anchor`), but the limbo has no real position to
 * anchor to, so a forced override — not a fabricated anchor — is the honest
 * choice here.
 *
 * WHAT THE TEMPLATE DOES AND DOES NOT DO: `DM_THRESHOLD_AFFORDANCE_ID`'s
 * `outcome_template_id` is deliberately `""` — `select_movement_affordance`
 * (r_move.rs:594, the GENERIC system-wide movement-affordance scan every
 * `r_move` call also runs, independent of the per-edge chain above) skips
 * any affordance whose `outcome_template_id` is empty, so this template
 * never leaks into ordinary movement selection anywhere else in the world;
 * it exists ONLY to be attached, by `edge_key`, to this one door. Aldwin
 * still needs the ordinary `srd/capability/walk`, derived from Aldwin's
 * `srd.creature` definition tag, for
 * `select_movement_affordance` to find a ready-made GENERIC candidate (the
 * srd bundle's own `srd/affordance/step`, already globally wildcard-attached
 * to every edge in the world via its own `spatial_niche_attachments` row,
 * `fragments/grid.ts`) — the actual RELOCATION always runs off that generic
 * selection, never off this edge-specific gate template (confirmed by
 * reading `r_move`'s own admission order: the per-edge chain gates
 * eligibility; the generic scan supplies the outcome). This edge's own
 * `place_edge_affordance` row carries no `movement_reach_resource` binding —
 * absent means unmetered (r_move.rs's own doc comment on
 * `MOVEMENT_REACH_RESOURCE_BINDING`) — a DM's own step through this
 * threshold is not rationed against mortal walking speed.
 *
 * WATCH EXTENT (so Aldwin can decide WHEN to walk without perceiving the
 * limbo in person first): `DM_WATCH_CAPABILITY_ID` already exists
 * (`dm-npc.ts`) as a read-only, observation-only extent grant, region-wide
 * (`GRAPHS.region`) — "widens what the DM sees, never what he may do."
 *
 * sk-dms.28 CORRECTION (2026-08-15): this file used to grant a SECOND
 * `actor_capabilities` row on that SAME `DM_WATCH_CAPABILITY_ID`, scoped to
 * `GRAPHS.creation_limbo`. That was wrong: `server/src/manifest/commit.rs`
 * (~L2005, ADR-0085 D-1) upserts `actor_capabilities` on the pair
 * `(entity_id, capability_id)` alone — a SECOND row on the SAME capability
 * id does not add a second extent, it silently REPLACES the first. Aldwin's
 * region-wide watch grant (`dm-npc.ts`, `GRAPHS.region`) was therefore gone
 * from the moment this file's grant applied, and his initiative watch never
 * saw a blow struck anywhere outside the limbo (sk-dms.28's root cause).
 *
 * THE FIX: this file mints its own, DISTINCT capability id,
 * `DM_WATCH_LIMBO_CAPABILITY_ID` (`elven_mini/dm/watch-limbo`), modelled on
 * `DM_WATCH_CAPABILITY_ID`'s own `capability_definitions` row in
 * `dm-npc.ts`, and grants IT scoped to `GRAPHS.creation_limbo`. Aldwin now
 * holds two independent watch capabilities — the ADR-0085 upsert key never
 * collides, and the region-wide grant stays untouched. This is what lets
 * Aldwin's own seat read the candidate's presence/state off his OWN
 * connection's ordinary subscribed snapshot (`@spellkave/sdk`'s
 * `readActorSnapshot`) before he ever leaves the inn — see
 * `@spellkave/adventure-runtime/dm/seat` (`create-dm-seat.ts`) for the walk rule this
 * unlocks. UNPROVEN WITHOUT A LIVE NODE: whether a `place_graph` extent
 * scoped to a graph with NO `parent_graph_id` (the limbo is its own root,
 * unlike the region/hamlet/inn lineage `DM_WATCH_CAPABILITY_ID`'s own grant
 * already covers) is honored identically by the live visibility computation
 * — the unit test cited above proves exact-graph-id matching in isolation,
 * but this exact shape (a second, disjoint root graph, now on its OWN watch
 * capability) was not exercised by any existing live-node run.
 */
import type { VerbCall } from "@spellkave/adventure-runtime/dm/lib";
import { CREATION_LIMBO_NODE_ID } from "./creation-candidate.ts";
import { ALDWIN_ENTITY_KEY, ALDWIN_PLACE_NODE_ID, DM_SEAT_CAPABILITY_ID } from "./dm-npc.ts";
import { BUNDLE, edgeKey, GRAPHS } from "./lib/ids.ts";

/** Bare, entity/edge-synthetic tag (no `niche_definitions` row needed —
 * mirrors `TRAVERSABLE_SQUARE_NICHE_ID`/`core/passable_portal`'s own
 * precedent: `r_move`'s traversal-gate evaluation injects
 * `target.has_niche(template.niche_id)` as a synthetic always-true fact for
 * whichever template is being evaluated, so this id only ever needs to be
 * internally consistent with itself, never separately attached anywhere). */
export const DM_THRESHOLD_NICHE_ID = `${BUNDLE}/niche/dm_threshold`;

export const DM_THRESHOLD_AFFORDANCE_LOCAL_ID = "affordance/dm_threshold";
export const DM_THRESHOLD_AFFORDANCE_ID = `${BUNDLE}/${DM_THRESHOLD_AFFORDANCE_LOCAL_ID}`;

export const EDGE_KEY_INN_TO_LIMBO = edgeKey(ALDWIN_PLACE_NODE_ID, CREATION_LIMBO_NODE_ID);
export const EDGE_KEY_LIMBO_TO_INN = edgeKey(CREATION_LIMBO_NODE_ID, ALDWIN_PLACE_NODE_ID);

/** sk-dms.28 fix — a DISTINCT capability id for the limbo's own watch
 * extent, modelled on `DM_WATCH_CAPABILITY_ID` (`dm-npc.ts`). Never reuse
 * that id for a second grant row: `server/src/manifest/commit.rs` (~L2005,
 * ADR-0085 D-1) upserts `actor_capabilities` on `(entity_id, capability_id)`
 * alone, so a second row on the SAME capability id silently replaces the
 * first instead of adding a second extent — see this module's own header,
 * "WATCH EXTENT", for the full incident. */
export const DM_WATCH_LIMBO_CAPABILITY_ID = `${BUNDLE}/dm/watch-limbo`;

/** The DM-only door: one bidirectional edge + its edge-specific gate
 * template + Aldwin's own two enabling grants (ordinary locomotion, and the
 * watch extent that lets his seat decide WHEN to use the door without
 * having to already be standing in the limbo to find out). */
export function dmThreshold(): VerbCall[] {
	return [
		{
			toolName: "spellkave_link_places",
			label: "link-aldwin-creation-limbo",
			params: {
				bundle: BUNDLE,
				from: ALDWIN_PLACE_NODE_ID,
				to: CREATION_LIMBO_NODE_ID,
				bidirectional: true,
				// Explicit override — see this module's own header on why the
				// tool's cross-graph auto-default (true) is wrong here.
				substrate_crossing: false,
				// Skip the tool's own default `core/affordance/traverse_open_
				// portal` attachment; this door authors its own gate below.
				portal: false,
				description:
					"A threshold only the world's DM may step through — the space between the hearth-ledger " +
					"and the place where new adventurers take shape.",
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "define-dm-threshold-affordance",
			params: {
				bundle: BUNDLE,
				kind: "affordance_templates",
				rows: [
					{
						template_id: DM_THRESHOLD_AFFORDANCE_ID,
						bundle_id: BUNDLE,
						niche_id: DM_THRESHOLD_NICHE_ID,
						capability_id: DM_SEAT_CAPABILITY_ID,
						display_name: "Cross the DM's threshold",
						predicate_bool: false,
						predicate_source: `actor.has_capability('${DM_SEAT_CAPABILITY_ID}') && target.has_niche('${DM_THRESHOLD_NICHE_ID}')`,
						// Deliberately empty — see this module's own header
						// ("WHAT THE TEMPLATE DOES AND DOES NOT DO").
						outcome_template_id: "",
						range_m: 0,
						accepts_global_storm: false,
					},
				],
			},
		},
		{
			toolName: "spellkave_bind_edge_affordance",
			label: "attach-dm-threshold-affordance",
			params: {
				from: ALDWIN_PLACE_NODE_ID,
				to: CREATION_LIMBO_NODE_ID,
				affordance_template_id: DM_THRESHOLD_AFFORDANCE_ID,
				bindings_json: "",
				bidirectional: true,
				// ADR-0101 D-B fix (movement-defaults-modes-terrain-cost
				// regression, sk-h6d level-0 story): this threshold is its OWN
				// mode, not the ordinary-walk mode — without this flag it shares
				// the implicit default mode_id "" with elven-mini's bundle-level
				// movement_defaults row (srd/affordance/step), so a DIFFERENT
				// template in the SAME mode AND-JOINS per D-B rather than
				// standing alone. That silently re-metered the DM's own step
				// (movement_reach_resource/long_running_move_session bindings
				// from the walk default), directly contradicting this module's
				// own header ("a DM's own step through this threshold is not
				// rationed against mortal walking speed") — Aldwin's crossing
				// was promoted to a long-running move that never completed
				// within his seat's single-shot dispatch, so he never reached
				// the creation station at all. `inherit_movement_default: false`
				// makes the edge own its FULL mode set from this one
				// unmetered row alone, restoring the original unmetered-DM-step
				// design.
				inherit_movement_default: false,
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "define-dm-watch-limbo-capability",
			params: {
				bundle: BUNDLE,
				kind: "capability_definitions",
				rows: [
					{
						actor_kind: "entity",
						bundle_id: BUNDLE,
						capability_id: DM_WATCH_LIMBO_CAPABILITY_ID,
						default_visibility: "Public",
						description:
							"The DM's watch over the creation limbo: carries the place_graph extent that broadens Aldwin's read scope to the limbo's own disjoint root graph, so his seat can decide when to walk the DM-only threshold without being co-located first. Read-only — it authorises no action and is never a gate_predicate's required_capability. Kept as its OWN capability id, distinct from the region-wide DM_WATCH_CAPABILITY_ID (dm-npc.ts): server/src/manifest/commit.rs's ADR-0085 upsert keys actor_capabilities on (entity_id, capability_id) alone, so a second grant row on the SAME id would silently replace the region-wide one instead of adding a second extent (sk-dms.28).",
						display_name: "DM: watch the creation limbo",
					},
				],
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "grant-limbo-watch-to-aldwin",
			params: {
				bundle: BUNDLE,
				kind: "actor_capabilities",
				rows: [
					// Ordinary locomotion derives from Aldwin's srd.creature tag.
					// This direct row is intentionally only the separate observation
					// extent that no broad creature identity can supply.
					// A DISTINCT capability id (sk-dms.28 fix) scoped to the limbo's
					// own graph — never a second row on Aldwin's EXISTING
					// `DM_WATCH_CAPABILITY_ID` (`dm-npc.ts`, region-wide), which the
					// ADR-0085 upsert key would silently replace. See this module's
					// own header, "WATCH EXTENT".
					{
						actor_entity_key: ALDWIN_ENTITY_KEY,
						bundle_id: BUNDLE,
						capability_id: DM_WATCH_LIMBO_CAPABILITY_ID,
						source: BUNDLE,
						source_args_hash: "",
						elevation_class: "",
						extent_kind_ref: "place_graph",
						extent_ref: GRAPHS.creation_limbo,
					},
				],
			},
		},
	];
}
