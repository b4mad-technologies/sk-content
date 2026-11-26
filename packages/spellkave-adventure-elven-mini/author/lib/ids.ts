/**
 * // pattern: none — constant bundle and graph identifiers for elven-mini
 *
 * Stable ids for the elven-mini adventure graphs (proof-bundle mini-world). */

/** The elven-mini ADVENTURE bundle — distinct from the identity proof scene
 * (`srd_proof`, `chapters/playing-the-game/proof-scene/shared.ts`) and the
 * spatial map-view proofs (also `srd_proof`), split apart 2026-08-08
 * (operator-approved reorg): three different artifact sets used to share one
 * `srd_playing_the_game_proof` bundle id. */
export const BUNDLE = "elven_mini";

/** Generic SRD walking-edge Step template (self-sufficient replacement for core traverse_open_portal). */
export const STEP_AFFORDANCE_ID = "srd/affordance/step";
/** Movement-reach resource named by Step / r_move bindings. */
export const SPEED_WALK_RESOURCE_ID = "srd/speed-walk";

/** ADR-0101 (task 6.2): the two alternative-mode edge templates
 * `region.ts`'s detour edges bind — see `grid-units.ts`'s own module header
 * for the full SRD-CC vocabulary grounding. */
export const SWIM_AFFORDANCE_ID = "srd/affordance/swim";
export const FLY_AFFORDANCE_ID = "srd/affordance/fly";

export const GRAPHS = {
	region: `${BUNDLE}/region`,
	hamlet: `${BUNDLE}/hamlet`,
	inn: `${BUNDLE}/inn`,
	tomb: `${BUNDLE}/tomb`,
	// sk-609b.8 — storyline §3 place-graphs (rung order).
	village: `${BUNDLE}/village`,
	river_crossing: `${BUNDLE}/river_crossing`,
	mill: `${BUNDLE}/mill`,
	well: `${BUNDLE}/well`,
	goblin_warren: `${BUNDLE}/goblin_warren`,
	forest_lodge: `${BUNDLE}/forest_lodge`,
	hobgoblin_camp: `${BUNDLE}/hobgoblin_camp`,
	swamp: `${BUNDLE}/swamp`,
	mine: `${BUNDLE}/mine`,
	shrine: `${BUNDLE}/shrine`,
	cursed_crypt: `${BUNDLE}/cursed_crypt`,
	deep_tomb: `${BUNDLE}/deep_tomb`,
	/** sk-s26: the creation-limbo — a single, DELIBERATELY disconnected place
	 * graph (no edges to region/hamlet/inn/tomb). Authored INTO this bundle
	 * (operator decision 2026-08-13: "a world holds several bodies; which one
	 * you steer is a connection-time choice, not a separate world" — a
	 * parallel bundle re-introduces the separation manifest-first removed),
	 * never linked here. See `candidate.ts`'s own header. */
	creation_limbo: `${BUNDLE}/creation_limbo`,
	/** sk-0m4.19: the advancement-limbo — a single, DELIBERATELY disconnected
	 * place graph. RelocateEntity carries the accepting hero (and Aldwin)
	 * here; no door, no walk. See `advancement-limbo.ts`. */
	advancement_limbo: `${BUNDLE}/advancement_limbo`,
	/** sk-jay0.1.76.9: the publisher's observation body lives here, alone, so no
	 * player-reachable scene ever lists it. One node, zero edges. See `operator.ts`. */
	operator_offstage: `${BUNDLE}/operator_offstage`,
} as const;

export type GraphKey = keyof typeof GRAPHS;

/** Playable storyline graphs (excludes limbos). Order = storyline §3. */
export const STORY_GRAPHS = [
	"region",
	"hamlet",
	"inn",
	"tomb",
	"village",
	"river_crossing",
	"mill",
	"well",
	"goblin_warren",
	"forest_lodge",
	"hobgoblin_camp",
	"swamp",
	"mine",
	"shrine",
	"cursed_crypt",
	"deep_tomb",
] as const satisfies readonly GraphKey[];

/**
 * place_graph_ids authored with empty `parent_graph_id` (roots of the place
 * tree plus deliberately disconnected limbos). The operator watcher's
 * place_graph extent grants cover exactly this set (sk-adr8.5) — add a new
 * root here when you author one, never hard-code the grant list elsewhere.
 *
 * Today: region (outdoor root), creation_limbo, advancement_limbo, operator_offstage.
 * Children (hamlet → region, inn/tomb → hamlet) are reached via region extent
 * child-walk in caller_scope, not as separate roots.
 */
export const ROOT_PLACE_GRAPHS = [
	GRAPHS.region,
	GRAPHS.creation_limbo,
	GRAPHS.advancement_limbo,
	GRAPHS.operator_offstage,
] as const satisfies readonly (typeof GRAPHS)[GraphKey][];

export function nodeId(graphId: string, local: string): string {
	return `${graphId}/${local}`;
}

/** Canonical verb edge key (author_place / link_places). */
export function edgeKey(fromNode: string, toNode: string): string {
	return `${fromNode}->${toNode}`;
}

/** Bidirectional edge pairs as [from,to] fully-qualified ids. */
export function biPairs(graphId: string, locals: Array<[string, string]>): Array<[string, string]> {
	const out: Array<[string, string]> = [];
	for (const [a, b] of locals) {
		const from = a.includes("/") ? a : nodeId(graphId, a);
		const to = b.includes("/") ? b : nodeId(graphId, b);
		out.push([from, to], [to, from]);
	}
	return out;
}
