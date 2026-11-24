/**
 * // pattern: proactive-level-up
 *
 * The induction ceremony authoring (sk-s26, REDESIGNED sk-h6d) — the authored
 * capability + affordance that carries a finished creation candidate out of
 * the limbo and into the adventure, held by the ONE DM entity (not a second,
 * limbo-resident copy: "a copy of one identity, and copies drift").
 *
 * Generic mechanism extracted from elven-mini's `author/induction.ts`: every
 * adventure-specific value (bundle, DM entity key, destination node, persona
 * name) is a REQUIRED parameter — no default exists that a story would never
 * use. Persisted ids derive from `bundle`, so a story passing its own bundle
 * gets byte-identical rows to the pre-extraction authoring.
 *
 * Canon constraint (ADR-0007 P-2/P-3): NO out-of-world DM privilege layer
 * exists. This is one ordinary `capability_definitions` row plus one ordinary
 * grant. Seat elevation (ADR-0103) is never expressed here.
 *
 * SHAPE: one capability_definitions row (granted to the DM) + one
 * `spellkave_define_action_verb` call authoring the affordance and its
 * outcome/consequence TOGETHER. GATE: blueprint-backed party identity and
 * absence of `dm/creation/drafting`, removed by the successful finish act.
 * The seat also requires all completeness receipts. `self_eligible: false` (the DM fires
 * it, never the candidate on themself), `non_steering: true`.
 *
 * CEREMONY CLOSE (sk-tyhy.5): the same success consequence also parks the
 * DM's dialog latch at idle (`dm/dialog/open` → 0) and the wizard phase at
 * confirmed (`dm/creation/phase` → 6) — the seat inducts on the next wait
 * cycle and never gets another AlignOpen/AlignPhase at the station, so
 * leftover open=2 would keep offering the creation menu. Idempotent if
 * Align* did land first (delta collapses to zero).
 */

import { CREATURE_NICHE_TAG } from "../../srd-ids";
import { DIALOG_OPEN_RESOURCE_ID } from "../dialog";
import { buildCapabilityGrant, setToExactValueDeltaSource, type VerbCall } from "../lib";
import { PARTY_FACTION_TAG } from "./completeness";
import { CREATION_PHASE_CONFIRMED, CREATION_PHASE_RESOURCE_ID } from "./ids";

/** The default action local id (the capability is `action/<this>`, never the
 * reverse — mirrors `offer-level-up`'s id derivation). */
export const DEFAULT_INDUCT_ACTION_LOCAL_ID = "dm/induct-candidate";

export interface InductionIds {
	actionLocalId: string;
	actionId: string;
	capabilityLocalId: string;
	capabilityId: string;
}

/** Derive the induction ids for a bundle. Pure; the persisted VALUES are
 * `${bundle}/dm/induct-candidate` and `${bundle}/action/dm/induct-candidate`
 * for the default local id. */
export function inductionIds(
	bundle: string,
	actionLocalId: string = DEFAULT_INDUCT_ACTION_LOCAL_ID,
): InductionIds {
	const capabilityLocalId = `action/${actionLocalId}`;
	return {
		actionLocalId,
		actionId: `${bundle}/${actionLocalId}`,
		capabilityLocalId,
		capabilityId: `${bundle}/${capabilityLocalId}`,
	};
}

export interface InductionParams {
	/** Authoring bundle id the capability, grant and action land in. */
	bundle: string;
	/** The DM entity holding the capability (fully-qualified entity key). */
	dmEntityKey: string;
	/** Where the inducted candidate is set down. */
	destinationNodeId: string;
	/** The DM's name as it appears in the persisted action description. Kept
	 * a parameter (not dropped) so rows stay byte-identical for stories whose
	 * description names the DM. */
	personaName: string;
	/** Slug used in the grant's verb label (`grant-induct-candidate-to-<slug>`);
	 * the label reaches failure telemetry, so it stays story-stable. */
	personaSlug: string;
	/** Override the action local id (default {@link DEFAULT_INDUCT_ACTION_LOCAL_ID}). */
	actionLocalId?: string;
}

export function induction(params: InductionParams): VerbCall[] {
	const { bundle, dmEntityKey, destinationNodeId, personaName, personaSlug } = params;
	const ids = inductionIds(bundle, params.actionLocalId);
	return [
		{
			toolName: "spellkave_write_rows",
			label: "define-induct-candidate-capability",
			params: {
				bundle,
				kind: "capability_definitions",
				rows: [
					{
						actor_kind: "entity",
						bundle_id: bundle,
						capability_id: ids.capabilityId,
						default_visibility: "Public",
						description:
							"The DM's own authority to carry a finished creation candidate out of the limbo " +
							"and into the adventure — an ordinary, authored capability, never a DM privilege " +
							"layer. Gated on the candidate having confirmed their creation.",
						display_name: "DM: induct a finished candidate",
					},
				],
			},
		},
		{
			...buildCapabilityGrant({
				bundle,
				actorEntityKey: dmEntityKey,
				capabilityId: ids.capabilityId,
				source: bundle,
			}),
			label: `grant-induct-candidate-to-${personaSlug}`,
		},
		{
			toolName: "spellkave_define_action_verb",
			label: "action:induct-candidate",
			params: {
				bundle,
				id: ids.actionLocalId,
				required_capability: ids.capabilityId,
				// Entity-provided bare tag (CREATURE_NICHE_TAG) — every creation
				// candidate carries it. No niche_definitions row needed for this
				// synthetic-tag shape.
				niche_id: CREATURE_NICHE_TAG,
				display_name: "Induct the finished candidate",
				description:
					`${personaName} carries a finished creation candidate out of the limbo and sets them down in ` +
					"the adventure. Gated on the candidate having confirmed their creation " +
					"(dm/creation/confirm). A cooperative, visible threshold beat — never a silent teleport.",
				predicate_source: `target.has_tag('${PARTY_FACTION_TAG}') && target.status('dm/creation/drafting') == false`,
				self_eligible: false,
				self_only: false,
				non_steering: true,
				cost_time_ms: 0,
				consequence: {
					frame_writes: [
						{
							RelocateEntity: {
								target_ref: "TargetActor",
								destination: { kind: "place_node", id: destinationNodeId },
							},
						},
						{
							ModifyResource: {
								actor: "Actor",
								resource: DIALOG_OPEN_RESOURCE_ID,
								delta_source: setToExactValueDeltaSource(DIALOG_OPEN_RESOURCE_ID, 0),
							},
						},
						{
							ModifyResource: {
								actor: "Actor",
								resource: CREATION_PHASE_RESOURCE_ID,
								delta_source: setToExactValueDeltaSource(
									CREATION_PHASE_RESOURCE_ID,
									CREATION_PHASE_CONFIRMED,
								),
							},
						},
					],
				},
			},
		},
	];
}
