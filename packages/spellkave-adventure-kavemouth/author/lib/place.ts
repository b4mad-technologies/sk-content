/**
 * // pattern: bundle-movement-default
 *
 * Shared place-graph helpers for kavemouth slices.
 * Companion tools only — no hand place/map rows.
 */
import type { VerbCall } from "@spellkave/adventure-runtime/dm/lib";
import { BUNDLE, biPairs, edgeKey, nodeId } from "./ids.ts";

export type PlaceNodeSpec = {
	local: string;
	name: string;
	x?: number;
	y?: number;
	elevation?: number;
	/**
	 * This node's OWN `place_nodes.description` column (T5 build-out follow-
	 * up, 2026-08-04) — wired through `spellkave_author_place`'s
	 * `nodes[].description` param (`PLACE_NODE_PARAMS`,
	 * packages/spellkave-tool-authoring/src/authoring-verbs.ts) into the
	 * SAME `add-place-node` patch op the rest of this spec already goes
	 * through; the Rust op itself (`crates/spellkave-authoring/src/patch/
	 * place_graph_ops.rs`) already accepted an optional `description` field
	 * — only the TS tool schema was missing it (previously recorded here as
	 * an "ASPIRATIONAL — never wired through" stop-clause finding,
	 * 2026-08-03; closed by wiring the param through rather than a
	 * `spellkave_write_rows` hand-reconstruction, keeping this on the one
	 * authoring engine). Read by movement-observation tools (e.g.
	 * `describeArrival`, `@spellkave/tool-authoring`) as a node's own
	 * arrival prose, preferred over the graph's own `description` — see
	 * `placeGraph`'s own `description` param for that graph-level fallback.
	 */
	description?: string;
	/** Decimal u64 H3 res10 string (outdoor). */
	cell_res10?: string;
	/**
	 * cell-extent-overlap-inheritance (sk-pxl) 2.1: an explicit per-node
	 * spatial extent, overriding the bundle's `default_extent_shape_id`
	 * (place-node-extent, sk-71u — `adventure.ts`'s `spellkave_define_bundle`
	 * call). Pair with `extent_params_json`; both wired through
	 * `spellkave_author_place`'s `nodes[]` (shared tool runtime authoring-verbs.ts).
	 */
	extent_shape_id?: string;
	/** The params_json paired with `extent_shape_id` (e.g. '{"radius_m": 2.5}'). */
	extent_params_json?: string;
};

export type PlaceFootprint = {
	shape: "cube" | "sphere";
	half_width_cells: number;
	half_height_cells: number;
};

/** Convert backdrop-cell measurements into the metre-native HALF-extents used
 * by the kernel. Keeping measurements in the layouts module makes visual
 * review possible without mixing pixels, cells, and metres. */
export function footprintFromCells(
	footprint: PlaceFootprint,
	metresPerCell: number,
	halfDepthMetres: number,
): Pick<PlaceNodeSpec, "extent_shape_id" | "extent_params_json"> {
	const x = Number((footprint.half_width_cells * metresPerCell).toFixed(3));
	const y = Number((footprint.half_height_cells * metresPerCell).toFixed(3));
	const scalar = Math.max(x, y);
	const prefix = footprint.shape === "cube" ? "extent" : "radius";
	return {
		extent_shape_id: `core/area/${footprint.shape}`,
		extent_params_json: JSON.stringify({
			[`${prefix}_m`]: scalar,
			[`${prefix}_x_m`]: x,
			[`${prefix}_y_m`]: y,
			[`${prefix}_z_m`]: halfDepthMetres,
		}),
	};
}

/** One graph slice: tool calls + its intra-graph edge keys. */
export type GraphSlice = {
	calls: VerbCall[];
	edgeKeys: string[];
};

function placeCall(
	label: string,
	opts: {
		graph: string;
		substrate: "outdoor" | "indoor";
		description: string;
		nodes: PlaceNodeSpec[];
		edgeLocals: Array<[string, string]>;
		parent_graph_id?: string;
		origin_cell_res10?: string;
		bearing?: number;
		metres_per_unit?: number;
		display_name?: string;
	},
): { call: VerbCall; edgeKeys: string[] } {
	const nodes = opts.nodes.map((n) => ({
		id: nodeId(opts.graph, n.local),
		name: n.name,
		...(n.x !== undefined ? { x: n.x } : {}),
		...(n.y !== undefined ? { y: n.y } : {}),
		...(n.elevation !== undefined ? { elevation: n.elevation } : {}),
		...(n.cell_res10 !== undefined ? { cell_res10: n.cell_res10 } : {}),
		...(n.description !== undefined ? { description: n.description } : {}),
		...(n.extent_shape_id !== undefined ? { extent_shape_id: n.extent_shape_id } : {}),
		...(n.extent_params_json !== undefined ? { extent_params_json: n.extent_params_json } : {}),
	}));
	const edges = biPairs(opts.graph, opts.edgeLocals);
	const edgeKeys = edges.map(([a, b]) => edgeKey(a, b));
	return {
		edgeKeys,
		call: {
			toolName: "spellkave_author_place",
			label,
			params: {
				bundle: BUNDLE,
				substrate: opts.substrate,
				description: opts.description,
				nodes,
				edges,
				...(opts.parent_graph_id !== undefined ? { parent_graph_id: opts.parent_graph_id } : {}),
				...(opts.origin_cell_res10 !== undefined
					? { origin_cell_res10: opts.origin_cell_res10 }
					: {}),
				...(opts.bearing !== undefined ? { bearing: opts.bearing } : {}),
				...(opts.metres_per_unit !== undefined ? { metres_per_unit: opts.metres_per_unit } : {}),
				...(opts.display_name !== undefined ? { display_name: opts.display_name } : {}),
			},
		},
	};
}

export function linkPortal(
	label: string,
	from: string,
	to: string,
	opts?: { substrate_crossing?: boolean; cell_anchor?: string },
): VerbCall {
	return {
		toolName: "spellkave_link_places",
		label,
		params: {
			bundle: BUNDLE,
			from,
			to,
			bidirectional: true,
			...(opts?.substrate_crossing !== undefined
				? { substrate_crossing: opts.substrate_crossing }
				: {}),
			...(opts?.cell_anchor !== undefined ? { cell_anchor: opts.cell_anchor } : {}),
			// ADR-0101 (task 6.2): NOT a special affordance — an ordinary
			// cross-graph portal inherits the bundle movement_default like any
			// other edge (spellkave_link_places' own doc comment on `portal`).
			portal: false,
		},
	};
}

/**
 * Author-only template/parent-graph provenance, kept OFF the player-visible
 * `place_graphs.description` (story v2a authoring-metadata-leak fix,
 * 2026-08-03). Lands as a `metadata_attachments` row via
 * `spellkave_annotate_place` — the SAME attachment mechanism
 * `spellkave_attach_map_layer` uses for its `provenance.source` namespace —
 * but under `annotate_place`'s own default `"place.note"` namespace
 * (audience `author`) rather than literally reusing `"provenance.source"`:
 * `backdrops.ts`'s `attach-map-*` calls already pass `provenance: false`
 * because core has that exact namespace name reserved globally at
 * manifest-apply drain time (MF-APPLY-020 on re-registration) — re-using it
 * here would hit the same collision this bundle already worked around once.
 */
export function graphProvenance(
	label: string,
	graphId: string,
	provenance: { template: string; composition: string },
): VerbCall {
	return {
		toolName: "spellkave_annotate_place",
		label: `${label}-provenance`,
		params: {
			bundle: BUNDLE,
			target_kind: "place_graph",
			target_ref: graphId,
			payload: { template: provenance.template, composition: provenance.composition },
		},
	};
}

/**
 * author_place + Step affordances for one graph, plus optional author-only
 * template/provenance metadata (see `graphProvenance` above) kept off the
 * player-visible `description`.
 */
export function placeGraph(
	label: string,
	opts: Parameters<typeof placeCall>[1] & {
		provenance?: { template: string; composition: string };
	},
): GraphSlice {
	const { call, edgeKeys } = placeCall(label, opts);
	// ADR-0101 (task 6.2): no per-edge srd/affordance/step row here anymore —
	// `adventure.ts` authors ONE bundle-scoped [[movement_defaults]] row
	// (spellkave_set_movement_default, bundle `kavemouth`) that every
	// graph's edges inherit for free (place_edges.inherit_movement_default
	// defaults to true). Gate rows (locked doors, seals, thresholds) stay
	// EXPLICIT, authored by their own file (warden-seal.ts, dm-threshold.ts)
	// via spellkave_bind_edge_affordance directly — those AND-join the
	// injected bundle default in mode "", unaffected by this change.
	const calls = [call];
	if (opts.provenance !== undefined) {
		calls.push(graphProvenance(label, opts.graph, opts.provenance));
	}
	return { edgeKeys, calls };
}
