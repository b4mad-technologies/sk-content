/**
 * // pattern: proactive-level-up
 *
 * The advancement limbo (sk-0m4.19) — a single, deliberately disconnected
 * place_graph where Aldwin conducts the level-up wizard after the hero
 * accepts his proactive offer.
 *
 * WHY A SIBLING OF creation_limbo, NOT THE SAME NODE: creation_limbo already
 * holds the level-0 candidate and the DM-only door. Mixing a level-1+
 * ceremony into that station would couple two duties that the seat already
 * walks separately. RelocateEntity does not need an edge, so this graph
 * stays edgeless — no second DM door, no walk choreography.
 *
 * Return destination for v1 is the inn hearth (Aldwin's standing node),
 * never a captured origin. See `./advancement-teleport.ts`.
 */
import type { VerbCall } from "@spellkave/adventure-runtime/dm/lib";
import { BUNDLE, GRAPHS, nodeId } from "./lib/ids.ts";

export const ADVANCEMENT_LIMBO_NODE_ID = nodeId(GRAPHS.advancement_limbo, "station");

/** The advancement-limbo place_graph — one node, zero edges, no map/backdrop. */
export function advancementLimbo(): VerbCall[] {
	return [
		{
			toolName: "spellkave_author_place",
			label: "author-advancement-limbo",
			params: {
				bundle: BUNDLE,
				// "indoor", same reason as creation-limbo: no real-world position,
				// must stay out of the outdoor H3 composite.
				substrate: "indoor",
				description:
					"A single, isolated advancement-limbo scene: one place node, DELIBERATELY not " +
					"connected to this adventure's other geography. Aldwin relocates the accepting " +
					"hero here (and himself alongside) via RelocateEntity — no door, no walk.",
				nodes: [{ id: ADVANCEMENT_LIMBO_NODE_ID, name: "Advancement Limbo" }],
				edges: [],
			},
		},
	];
}
