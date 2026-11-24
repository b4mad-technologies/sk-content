/**
 * DM Runtime Library core (ADR-0096, S2 — `dm-runtime-library-arc.md`) —
 * marker/draft resource definitions.
 *
 * Generalizes `src/author/dm/aldwin.ts`'s own `spellkave_define_resource`
 * calls (`resource:aldwin/level-up-applied` — a persistent, exactly-once
 * ACTOR-carried latch; `resource:level-up/pending-hp-choice` — a persistent,
 * revisable TARGET-carried draft) into ONE typed builder.
 *
 * SRD BOUNDARY (ADR-0096 D-3): this builder defines DM-OWNED bookkeeping
 * resources ONLY — a marker latch or a draft-choice slot the DM's own
 * dialogue actions read/write (`dialogue.ts`'s `frameWrites`). It never
 * defines an SRD-tier resource (hit points, spell slots, a class resource
 * pool, …) — those are read/written by id (a plain string the caller
 * supplies), never defined here.
 */
import { DEFINE_RESOURCE_TOOL } from "@spellkave/tool-authoring";

import type { VerbCall } from "./scene-driver.ts";

export interface MarkerResourceSpec {
	bundle: string;
	/** Local id stem, e.g. `"level-up/pending-hp-choice"` — full id is
	 * `${bundle}/${localId}`. */
	localId: string;
	displayName: string;
	description: string;
	minValue: number;
	maxValue: number;
	initialValue: number;
	tags?: readonly string[];
}

export interface MarkerResourceUnit {
	resourceId: string;
	call: VerbCall;
}

/** Author ONE `resource_definitions` row with `recovery_rule: "persistent"`
 * — every marker/draft resource this arc's dialogue flows need persists
 * across rests by design (an exactly-once latch or a revisable draft is
 * never meant to reset on a long rest, unlike an SRD-tier per-rest pool). */
export function buildMarkerResource(spec: MarkerResourceSpec): MarkerResourceUnit {
	const resourceId = `${spec.bundle}/${spec.localId}`;
	return {
		resourceId,
		call: {
			toolName: DEFINE_RESOURCE_TOOL,
			label: `resource:${spec.localId}`,
			params: {
				bundle: spec.bundle,
				id: spec.localId,
				display_name: spec.displayName,
				min_value: spec.minValue,
				max_value: spec.maxValue,
				initial_value: spec.initialValue,
				recovery_rule: "persistent",
				description: spec.description,
				tags: spec.tags ?? [],
			},
		},
	};
}
