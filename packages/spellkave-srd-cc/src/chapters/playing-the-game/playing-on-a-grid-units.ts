// Playing on a Grid (playing-the-game.md § Combat > The Order of Combat >
// Your Turn, sidebar): the square-grid variant-rule math (squares =
// Speed/5, entry costs, diagonal-corner rule, range counting). Ledger row:
// "Playing on a Grid" (`ledger/playing-the-game.md`).
//
// SOURCE: `cache/open5e/Rule.json`, pk `srd-2024_combat_playing-on-a-grid` —
// its OWN record (not folded into "The Order of Combat"'s desc, despite
// being visually nested inside "Your Turn" in the markdown — ledger
// observation 2's "sidebars get their own record" pattern, confirmed again
// here). Clean bold-run-in prose, no pipe table.
//
// RECONCILIATION VERDICT (this unit's actual deliverable, per the operator
// brief: "the substrate/sister ALREADY have grid standards ... your job is a
// RECONCILIATION verdict"), grounded by reading the substrate directly, not
// assumed:
//
//   - "Squares. Each square represents 5 feet." MATCHES
//     `world-fixtures/srd/base/sessions.toml`'s `combat_grid_blueprints`
//     row: `cell_size = 1.5240000486373901` (= ft(5) = 5 ft in metres,
//     `attack-melee.toml`'s own module header confirms the same constant for
//     melee reach). One cell IS one 5-ft square, exactly.
//
//   - "Speed. ... divide it by 5." MATCHES, but at a DIFFERENT authoring
//     TIME than the SRD's own per-use division: `server/src/world_interaction/
//     layer2/r_move.rs`'s own test comment (`reach_from_cells_maps_cell_count_
//     to_metric_units`, ADR-0053 D-6) confirms the stored `srd/speed-walk`
//     stat is a CELL COUNT authored feet→cells AT RENDER TIME (÷5 happens
//     once, when the monster/character sheet is authored) — "no 5e feet in
//     the substrate". So the DIVISION the SRD describes as a per-use
//     translation step is, on this substrate, baked into the stat's own
//     value at authoring time; the RUNTIME reads a cell count directly
//     (`resolve_actor_movement_reach_cells` → `reach_from_cells`). Same math,
//     different point in the pipeline where the ÷5 happens — a faithful
//     reconciliation, not a gap.
//
//   - "Entering a Square. ... 1 square [to enter] ... orthogonally or
//     diagonally adjacent. A square of Difficult Terrain costs 2 squares."
//     MATCHES on BOTH halves, confirmed by reading the mechanism directly:
//     (a) `r_move.rs`'s `authored_movement_distance_units` defaults an edge's
//     cost to `cell_size` (i.e. exactly 1 cell) when no `movement_cost_cells`
//     binding is authored — the SRD's own "costs 1 square" baseline; (b) the
//     `movement_cost_cells` edge-binding mechanism authors a DIFFERENT
//     per-edge cost, and the sister's OWN worked example
//     (`sessions.toml`'s `srd/combat-grid/default` blueprint,
//     `edge_overrides_json`) authors EXACTLY `movement_cost_cells:2` on a
//     `"Rough ground"`-labelled edge — the Difficult Terrain 2x-cost rule,
//     already live-demoed content, not a hypothetical. Diagonal adjacency
//     ("orthogonally or diagonally adjacent") is the `topology = "8"` arm of
//     `server/src/world_interaction/layer2/tactical_grid.rs`'s
//     `neighbor_offsets` (confirmed: `"4"` and `"8"` are the only two legal
//     topology values) — the sister's own default blueprint uses `"4"`
//     (orthogonal only), so diagonal movement is SUPPORTED by the mechanism
//     but not the sister's own default authoring choice; a different
//     blueprint could opt into `"8"` today with zero substrate change.
//
//   - "Corners. Diagonal movement can't cross the corner of a wall..." NO
//     MATCH — a CONFIRMED GAP, not assumed. `tactical_grid.rs`'s edge
//     generation is purely topological (which cells are adjacent under `"4"`/
//     `"8"`); there is no per-corner geometry check anywhere in the grid
//     materialiser or `r_move.rs`'s own edge-traversal validation that could
//     express "this diagonal step is blocked because a wall fills the
//     shared corner, even though the edge itself isn't `blocked`". The ONLY
//     lever that exists is authoring an individual edge as `blocked` (the
//     sister's own `"c_0_1"->"c_1_1"` `"Blocked brush"` override,
//     `sessions.toml`) — a per-EDGE decision an author makes case-by-case,
//     not a general GEOMETRIC rule the engine derives from wall placement.
//     Recorded honestly; no fixture content forced (no concrete diagonal-
//     wall-corner scene exists in this chapter's own scope to compose a
//     workaround against).
//
//   - "Ranges. ... count squares ... shortest route." MATCHES —
//     `attack-ranged.toml`'s own module header (`range_m` measures metric
//     node-pair distance) is exactly grid-square range-counting, generalized
//     to continuous metres instead of discrete squares; the sister's
//     `place_node_ids_within_range` (ADR-0053) is the "count from an adjacent
//     square, stop in the target's square" rule expressed as a distance
//     threshold rather than a square-walk, mathematically equivalent on a
//     square grid.
//
// NO NEW MECHANICS — per the operator brief's own instruction for this unit.
// This module's only code is a loud-fail parser over the sidebar's own
// prose, grounding the reconciliation verdict above in the actual cached
// text rather than paraphrase; the verdict itself lives in this comment (the
// generated coverage report links back here) and in the ledger row.
import { ruleByPk } from "../../open5e/rule";

export const PLAYING_ON_A_GRID_RULE_PK = "srd-2024_combat_playing-on-a-grid";

/** One parsed "**Label.** text" sub-rule of the § Playing on a Grid sidebar. */
export interface GridSubRule {
	label: string;
	text: string;
}

const EXPECTED_LABELS = ["Squares", "Speed", "Entering a Square", "Corners", "Ranges"] as const;

/**
 * Parse the five "**Label.** text" sub-rules out of the rule's own desc.
 * Throws loudly on any shape surprise or missing label.
 */
export function parseGridSubRules(desc: string): GridSubRule[] {
	const rules = EXPECTED_LABELS.map((label) => {
		const pattern = new RegExp(`\\*\\*${label}\\.\\*\\*\\s*([^\\n]+)`);
		const match = desc.match(pattern);
		if (match === null || match[1] === undefined || match[1].trim().length === 0) {
			throw new Error(
				`playing-on-a-grid-units: no '**${label}.** ...' sub-rule found in rule '${PLAYING_ON_A_GRID_RULE_PK}'.`,
			);
		}
		return { label, text: match[1].trim() };
	});
	return rules;
}

/** The parsed § Playing on a Grid sub-rules, read from the committed cache. */
export function gridSubRules(): GridSubRule[] {
	return parseGridSubRules(ruleByPk(PLAYING_ON_A_GRID_RULE_PK).desc);
}

/** Grid cell footprint in feet, pinned from the "Squares" sub-rule text — the constant the reconciliation verdict above is grounded on. */
export const GRID_SQUARE_FEET = 5;
/** Baseline (non-difficult-terrain) entry cost in squares, pinned from the "Entering a Square" sub-rule text. */
export const GRID_ENTRY_COST_SQUARES = 1;
/** Difficult Terrain entry cost in squares, pinned from the "Entering a Square" sub-rule text. */
export const GRID_DIFFICULT_TERRAIN_ENTRY_COST_SQUARES = 2;
