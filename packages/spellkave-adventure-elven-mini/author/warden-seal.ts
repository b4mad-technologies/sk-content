/**
 * // pattern: quest-composition
 *
 * sk-0m4.21 — a sealed side door in the tomb so a level-1 story chapter
 * can deliberately attempt a barred edge and record the refusal.
 *
 * THE EDGE: hall <-> sealed_vault, a NEW empty node (`tomb.ts` /
 * `tomb-alignment.ts`). The bead offered two shapes: gate an existing
 * unused direction, or mint a vault. Hall→shrine looked unused by the
 * recorded walk, but the shrine holds the authored tomb chest
 * (`occupancy.ts`) and is a live-play room — a permanently-false gate
 * there would strand that content.
 *
 * WHY NOT "OPENS WHEN THE WARDEN DIES": the documented traversal DSL
 * cannot name a third body. `HasStatus` subjects are only
 * actor|target|location|session|world|binding (`dsl-grammar` HasStatus);
 * on an edge gate those resolve to the walker and the edge, never the
 * Crypt Warden standing in the crypt. Edge `bindings_json` is documented
 * only for `movement_reach_resource` (`running-an-authored-act`).
 * Condition hooks are Int expressions, not writers. `Inscribe` to
 * `ActorIncidentEdges` would write the actor's CURRENT cell's edges
 * (the crypt at fight-end), not this distant vault hop. A cheap
 * state-dependent predicate is therefore inexpressible; the honest
 * fallback is a permanent seal on a node with no other content
 * depending on reachability.
 *
 * THE PATTERN: identical to `dm-threshold.ts`'s edge-specific gate
 * template — empty `outcome_template_id` so `select_movement_affordance`
 * never picks it as generic movement; attached by `edge_key` so
 * `evaluate_edge_traversal_affordances` AND-chains it with the existing
 * `srd/affordance/step` already on these edges. The hero holds walk, not
 * the unseal capability, so the predicate is false for them — the
 * refusal shape `r_move` already emits today (raw reason +
 * `failure_detail` + "Nothing happens."; sk-0m4.18).
 *
 * NOBODY is granted `WARDEN_UNSEAL_CAPABILITY_ID`. The seal is a
 * standing closed door, not a key the Crypt Warden (or anyone else) is
 * scripted to use.
 */
import type { VerbCall } from "@spellkave/adventure-runtime/dm/lib";
import { BUNDLE, edgeKey, GRAPHS, nodeId } from "./lib/ids.ts";

export const HALL_NODE_ID = nodeId(GRAPHS.tomb, "hall");
export const SEALED_VAULT_NODE_ID = nodeId(GRAPHS.tomb, "sealed_vault");

/** Bare, entity/edge-synthetic tag — same shape as `DM_THRESHOLD_NICHE_ID`
 * (`dm-threshold.ts`): `r_move` injects `target.has_niche(template.niche_id)`
 * as a synthetic always-true fact for the template being evaluated. */
export const WARDEN_SEAL_NICHE_ID = `${BUNDLE}/niche/warden_seal`;

export const WARDEN_SEAL_AFFORDANCE_LOCAL_ID = "affordance/warden_seal";
export const WARDEN_SEAL_AFFORDANCE_ID = `${BUNDLE}/${WARDEN_SEAL_AFFORDANCE_LOCAL_ID}`;

export const WARDEN_UNSEAL_CAPABILITY_ID = `${BUNDLE}/warden/unseal`;

export const EDGE_KEY_HALL_TO_VAULT = edgeKey(HALL_NODE_ID, SEALED_VAULT_NODE_ID);
export const EDGE_KEY_VAULT_TO_HALL = edgeKey(SEALED_VAULT_NODE_ID, HALL_NODE_ID);

export function wardenSeal(): VerbCall[] {
	return [
		{
			toolName: "spellkave_define_capability",
			label: "define-warden-unseal-capability",
			params: {
				bundle: BUNDLE,
				id: "warden/unseal",
				actor_kind: "entity",
				display_name: "Warden's unseal",
				description:
					"The Crypt Warden's seal on the empty vault off the sarcophagus hall. No living actor in this adventure is granted it, so the hall-to-vault edge refuses every walker (sk-0m4.21).",
			},
		},
		{
			toolName: "spellkave_write_rows",
			label: "define-warden-seal-affordance",
			params: {
				bundle: BUNDLE,
				kind: "affordance_templates",
				rows: [
					{
						template_id: WARDEN_SEAL_AFFORDANCE_ID,
						bundle_id: BUNDLE,
						niche_id: WARDEN_SEAL_NICHE_ID,
						capability_id: WARDEN_UNSEAL_CAPABILITY_ID,
						display_name: "Pass the warden's seal",
						predicate_bool: false,
						predicate_source: `actor.has_capability('${WARDEN_UNSEAL_CAPABILITY_ID}') && target.has_niche('${WARDEN_SEAL_NICHE_ID}')`,
						// Deliberately empty — same as `DM_THRESHOLD_AFFORDANCE_ID`
						// (`dm-threshold.ts`): this template is an edge gate, never
						// a generic movement outcome.
						outcome_template_id: "",
						range_m: 0,
						accepts_global_storm: false,
					},
				],
			},
		},
		{
			toolName: "spellkave_bind_edge_affordance",
			label: "attach-warden-seal-affordance",
			params: {
				from: HALL_NODE_ID,
				to: SEALED_VAULT_NODE_ID,
				affordance_template_id: WARDEN_SEAL_AFFORDANCE_ID,
				bindings_json: "",
				bidirectional: true,
			},
		},
	];
}
