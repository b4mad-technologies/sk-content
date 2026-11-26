/**
 * DM Runtime Library core (ADR-0096, S2 — `dm-runtime-library-arc.md`) —
 * niche definitions + spatial placement.
 *
 * Two independently-composable builders, mirroring `src/author/dm/aldwin.ts`
 * and `src/author/kavemouth/dm-npc.ts`'s own definition/placement split
 * (`aldwin.ts`'s own module header: "definitions once, placement in the
 * adventure") — here BOTH halves are rendered AT RUNTIME by this SAME
 * library, into the DM's own bundle namespace (ADR-0096 D-1), instead of one
 * living in a build-time DM bundle and the other in a build-time adventure
 * bundle.
 *
 * A niche DEFINITION alone materialises nothing — `spellkave_define_niche`'s
 * own doc comment (mirrored on `aldwin.ts`'s `ALDWIN_NICHE_ID`/
 * `TRAINEE_PRESENT_NICHE_ID`): `r_manipulate`'s own dispatch-time
 * `attachment_presence` precondition still needs a `spatial_niche_
 * attachments` row, distinct from (and stricter than) affordance-cache
 * candidate discovery. `buildSpatialNicheAttachment` is that second,
 * independently-callable step.
 */
import { DEFINE_NICHE_TOOL, WRITE_ROWS_TOOL } from "@spellkave/tool-authoring";

import type { VerbCall } from "./scene-driver.ts";

export interface NicheDefinitionSpec {
	bundle: string;
	/** Local id stem, e.g. `"niche/aldwin"` — full id is `${bundle}/${localId}`. */
	localId: string;
	description: string;
	/** The niche's entity-carried (or target-carried) predicate — e.g.
	 * `target.has_niche('some-tag')` (mirrors `aldwin.ts`'s `ALDWIN_NICHE_ID`/
	 * `TRAINEE_PRESENT_NICHE_ID`). Authored DSL, passed in as data — this
	 * library never evaluates it (ADR-0096 D-3). */
	predicateSource: string;
}

export interface NicheDefinitionUnit {
	nicheId: string;
	call: VerbCall;
}

/** Author ONE `niche_definitions` row. Definition only — no spatial
 * attachment; see {@link buildSpatialNicheAttachment} for placement. */
export function buildNicheDefinition(spec: NicheDefinitionSpec): NicheDefinitionUnit {
	const nicheId = `${spec.bundle}/${spec.localId}`;
	return {
		nicheId,
		call: {
			toolName: DEFINE_NICHE_TOOL,
			label: `niche:${spec.localId}`,
			params: {
				bundle: spec.bundle,
				id: spec.localId,
				description: spec.description,
				predicate_source: spec.predicateSource,
			},
		},
	};
}

export interface SpatialNicheAttachmentSpec {
	bundle: string;
	/** An already-defined niche id, OR the `capability:<capability_id>`
	 * synthetic-niche convention (`aldwin.ts`'s own
	 * `attach-self-only-srd-actions-at-aldwin` call) — this builder does not
	 * distinguish the two; both render the SAME `spatial_niche_attachments`
	 * row shape. Speech niches are no longer attached this way (sk-0m4.4). */
	nicheId: string;
	placeNodeId: string;
	visibility?: string;
}

/** Attach ONE niche at ONE place node (`spatial_niche_attachments`) — the
 * SAME row shape `dm-npc.ts`'s own `attach-aldwin-niches`/`attach-self-only-
 * srd-actions-at-aldwin` calls author by hand, generalized into one call per
 * (niche, place) pair. Batch several by
 * calling this once per pair — `spellkave_write_rows` itself accepts many
 * rows per call, but one call per attachment keeps this builder's own
 * surface as narrow as {@link buildNicheDefinition}'s. */
export function buildSpatialNicheAttachment(spec: SpatialNicheAttachmentSpec): VerbCall {
	return {
		toolName: WRITE_ROWS_TOOL,
		label: `attach-niche:${spec.nicheId}@${spec.placeNodeId}`,
		params: {
			bundle: spec.bundle,
			kind: "spatial_niche_attachments",
			rows: [
				{
					bundle_id: spec.bundle,
					niche_id: spec.nicheId,
					place_node_id: spec.placeNodeId,
					visibility: spec.visibility ?? "Public",
					condition_bool: true,
					ecological_invariant: false,
				},
			],
		},
	};
}
