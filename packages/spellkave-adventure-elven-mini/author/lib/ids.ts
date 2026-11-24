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

export const MAPS = {
	region: {
		id: "259",
		title: "Crossroads Encounter",
		file: "259 Crossroads Encounter-grid.jpg",
	},
	hamlet: {
		id: "306",
		title: "Fortified Hamlet",
		file: "306 Fortified Hamlet.jpg",
	},
	inn: {
		id: "267",
		title: "Mountain View Inn",
		file: "267 Mountain View Inn-notitle.jpg",
	},
	tomb: {
		id: "251",
		title: "Infested Tomb",
		file: "251 Infested Tomb-PC.jpg",
	},
	village: {
		id: "15",
		title: "Elven Village",
		file: "15 Elven Village.jpg",
	},
	river_crossing: {
		id: "34",
		title: "River crossing",
		file: "34 River crossing.jpg",
	},
	mill: {
		id: "131",
		title: "The Windmill Cult",
		file: "131 The Windmill Cult-DM.jpg",
	},
	well: {
		id: "211",
		title: "The Hidden Well",
		file: "211 The Hidden Well.jpg",
	},
	/** Secondary well depth sheet (map_layers may still point at primary). */
	well_depth: {
		id: "197",
		title: "The Darkness From the Well",
		file: "197 The Darkness From the Well-PC.jpg",
	},
	goblin_warren: {
		id: "319",
		title: "Goblin Lair",
		file: "319 Goblin Lair-PC.jpg",
	},
	goblin_chief: {
		id: "27",
		title: "Goblin chief hideout",
		file: "27 Goblin chief hideout.jpg",
	},
	forest_lodge: {
		id: "37",
		title: "Forest lodge",
		file: "37 Forest lodgeC.jpg",
	},
	hobgoblin_camp: {
		id: "17",
		title: "Hobgoblin camp",
		file: "17-Hobgoblin-camp-L.jpg",
	},
	swamp: {
		id: "257",
		title: "The Swamp and the Hag",
		file: "257 The Swamp and the Hag-PC.jpg",
	},
	mine: {
		id: "36",
		title: "Old dwarven mine",
		file: "36 Old dwarven minePC.jpg",
	},
	mine_deep: {
		id: "219",
		title: "Mine Incident",
		file: "219 Mine Incident-PC.jpg",
	},
	shrine: {
		id: "235",
		title: "Shrine of the Sun and Moon",
		file: "235 Shrine of the Sun and Moon-PC.jpg",
	},
	forest_heart: {
		id: "24",
		title: "Forest's heart",
		file: "24 Forest's heartC.jpg",
	},
	cursed_crypt: {
		id: "46",
		title: "Cursed Crypt",
		file: "46 Cursed CryptC.jpg",
	},
	deep_tomb: {
		id: "60",
		title: "Old crypt",
		file: "60 Old crypt-PC.jpg",
	},
} as const;

export const ATTRIBUTION = {
	creator: "Elven Tower Maps",
	license: "CC BY 4.0",
	licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
	postUrl: "https://www.patreon.com/elventower/posts/creative-commons-153067169",
	patreon: "https://www.patreon.com/elventower",
} as const;

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
