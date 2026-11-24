/**
 * // pattern: none — pool hazard trigger and damage definition
 *
 * cell-extent-overlap-inheritance (sk-pxl), authored-proof-content half
 * (`ledger/designs/sk-pxl-extent-overlap-inheritance.md`, "Authored proof
 * content"): a hazard niche bound to `tomb.ts`'s already-authored `pool`
 * node — the node that gets the explicit extent (`tomb.ts`'s
 * `POOL_EXTENT_SHAPE_ID`/`POOL_EXTENT_PARAMS_JSON`). Kept as its own file
 * rather than folded into `tomb.ts` (which stays pure topology, mirroring
 * `inn.ts`/`hamlet.ts`) — same split `dm-threshold.ts`/`induction.ts` use for
 * "a niche/edge riding an already-authored node," composed in last by
 * `adventure.ts`.
 *
 * `spellkave_define_niche` (existing verb, no new Rust, no new row kinds)
 * authors ONE `niche_definitions` row + its `spatial_niche_attachments`
 * satellite in one call — the same idiom
 * `chapters/playing-the-game/proof-scene/calls/object-interaction.ts`'s
 * `proof-interactable-lever-niche` call uses for a physical-feature niche
 * bound to a single node. `visibility: "Local"` is deliberate (not the
 * bundle's usual "Public"): it is the half of sk-pxl's widened rule the
 * server-side change proves — `inherited_local_attachment_visible_at_
 * place_nodes` must admit this Local facet on every western-edge grid cell
 * whose centre falls inside the pool's extent, not just at the pool node
 * itself.
 *
 * Explicit non-goal (proposal.md / design.md): no `on_entry_action_id`
 * damage wiring — that idiom needs an authored `action_definition` and an
 * admit-time target entity (`openspec/specs/spatial-world-model/spec.md`,
 * "Node-anchored niches can bind an action to successful entry"), deferred as
 * a content follow-up. This file authors presence + disclosure only.
 */
import type { VerbCall } from "@spellkave/adventure-runtime/dm/lib";
import { BUNDLE } from "./lib/ids.ts";
import { POOL_NODE_ID } from "./tomb.ts";

export const POOL_HAZARD_NICHE_LOCAL_ID = "niche/hazard_pool";
export const POOL_HAZARD_NICHE_ID = `${BUNDLE}/${POOL_HAZARD_NICHE_LOCAL_ID}`;

export function poolHazard(): VerbCall[] {
	return [
		{
			toolName: "spellkave_define_niche",
			label: "tomb-pool-hazard-niche",
			params: {
				bundle: BUNDLE,
				id: POOL_HAZARD_NICHE_LOCAL_ID,
				display_name: "Slime Pool Hazard",
				description:
					"The crypt's stagnant pool (tomb.ts's 'pool' node) — its surface ripples with something " +
					"unseen beneath. Marks the pool as a hazard for presence/disclosure only; no on-entry " +
					"damage is wired yet (sk-pxl proposal.md non-goal — a content follow-up).",
				attachments: [{ node: POOL_NODE_ID, visibility: "Local" }],
			},
		},
	];
}
