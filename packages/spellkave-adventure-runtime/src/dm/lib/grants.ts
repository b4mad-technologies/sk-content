/**
 * DM Runtime Library core (ADR-0096, S2 — `dm-runtime-library-arc.md`) —
 * `actor_capabilities` grant rows.
 *
 * Generalizes `src/author/elven-mini/dm-npc.ts`'s own per-capability grant
 * calls (`grant-level-up-options-to-hero`, `grant-offer-level-up-to-aldwin`,
 * `grant-speak-and-apply-manifest-authority-to-aldwin`, …) into ONE typed
 * builder a DM brain calls at dispatch time to grant one or more already-
 * defined capabilities to one actor.
 */
import { WRITE_ROWS_TOOL } from "@spellkave/tool-authoring";

import type { VerbCall } from "./scene-driver.ts";

export interface CapabilityGrant {
	actorEntityKey: string;
	capabilityId: string;
	/** `actor_capabilities.source` — the bundle that DEFINES `capabilityId`
	 * (`"dm"` for a capability THIS library rendered, `"srd"` for a baseline
	 * SRD one — mirrors `dm-npc.ts`'s own per-grant `source: DM_BUNDLE` /
	 * `source: SRD_BUNDLE_ID` split; never assumed to equal `bundle` below). */
	source: string;
}

export interface CapabilityGrantBatchSpec {
	/** The bundle every generated `actor_capabilities` row is stamped with
	 * (`bundle_id`) — the owning adventure for scripted per-play grants, independent of
	 * each grant's own `source`. */
	bundle: string;
	grants: readonly CapabilityGrant[];
}

/** Author one or more `actor_capabilities` grant rows in a single
 * `spellkave_write_rows` call (mirrors `dm-npc.ts`'s own multi-row grant
 * calls, e.g. `grant-level-up-options-to-hero`'s five-capability batch). Every
 * row fills the schema's optional elevation/extent columns with the SAME
 * empty-string defaults `dm-npc.ts` uses (no elevation, no scoped extent —
 * an ordinary, unconditional grant). */
export function buildCapabilityGrants(spec: CapabilityGrantBatchSpec): VerbCall {
	return {
		toolName: WRITE_ROWS_TOOL,
		label: "grant-capabilities",
		params: {
			bundle: spec.bundle,
			kind: "actor_capabilities",
			rows: spec.grants.map((grant) => ({
				actor_entity_key: grant.actorEntityKey,
				bundle_id: spec.bundle,
				capability_id: grant.capabilityId,
				source: grant.source,
				source_args_hash: "",
				elevation_class: "",
				extent_kind_ref: "",
				extent_ref: "",
			})),
		},
	};
}

/** Convenience single-grant form of {@link buildCapabilityGrants}. */
export function buildCapabilityGrant(spec: { bundle: string } & CapabilityGrant): VerbCall {
	return buildCapabilityGrants({
		bundle: spec.bundle,
		grants: [
			{ actorEntityKey: spec.actorEntityKey, capabilityId: spec.capabilityId, source: spec.source },
		],
	});
}
