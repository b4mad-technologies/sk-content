/**
 * // pattern: proactive-level-up
 *
 * Advancement teleport (sk-0m4.19) - DM-owned siblings of `induct-candidate`
 * that carry a LEVEL-1+ hero INTO the advancement limbo and, after the wizard,
 * back to a fixed return place.
 *
 * induct-candidate is the WRONG DIRECTION: it only RelocateEntitys a
 * confirmed creation candidate OUT of creation_limbo. A level-1+ hero has
 * no CONFIRMED_RESOURCE_ID row (unseeded fact reads fail closed), so that
 * gate cannot be reused. These two actions are the sibling pair.
 *
 * BOTH bodies relocate. Spatial niche attachments are pinned to a place
 * node and do not follow the DM; the wizard's dialogue targets a DM-tagged
 * entity. Attaching niches at the limbo without moving him leaves no target;
 * moving him without attaching niches leaves the wizard dark. The smaller
 * alternative to a new DM door + walk choreography is therefore: two
 * RelocateEntity writes + a second niche-attachment apply.
 *
 * Return destination is FIXED for v1. There is no generic "return to origin"
 * primitive on RelocateEntity.
 *
 * Ids derive from the config's `bundle` (`${bundle}/dm/...`). DM seat
 * elevation is never read from this config (ADR-0103): the grant only names
 * the holder of the may-do capability.
 */

import { CREATURE_NICHE_TAG } from "../../srd-ids.ts";
import { personaSlug } from "../host-act/index.ts";
import { LEVEL_UP_OFFER_ACCEPTED_RESOURCE_ID } from "../level-up/ids.ts";
import { ALDWIN_PERSONA, type DmPersona } from "../level-up/persona.ts";
import { buildCapabilityGrants, type VerbCall } from "../lib/index.ts";

export const TELEPORT_INTO_LIMBO_ACTION_LOCAL_ID = "dm/teleport-into-advancement-limbo";
export const RETURN_FROM_LIMBO_ACTION_LOCAL_ID = "dm/return-from-advancement-limbo";

export interface AdvancementTeleportConfig {
	/** Adventure bundle id. Owns every rendered row. */
	readonly bundle: string;
	/** Manifest entity key of the DM seat that holds the may-do capabilities. */
	readonly dmEntityKey: string;
	/** The DM's name as it appears in authored descriptions. */
	readonly personaName: string;
	/** Place node of the advancement limbo (the wizard's stage). */
	readonly limboNodeId: string;
	/** Fixed v1 return place node. */
	readonly returnNodeId: string;
	/** How descriptions name the return place, e.g. `the inn hearth`. */
	readonly returnPlaceName: string;
	/** DM persona whose level-up-applied latch gates the return. Defaults to {@link ALDWIN_PERSONA}. */
	readonly persona?: DmPersona;
}

/** Fully-qualified ids derived from the bundle. */
export function advancementTeleportIds(cfg: Pick<AdvancementTeleportConfig, "bundle">): {
	teleportActionId: string;
	teleportCapabilityId: string;
	returnActionId: string;
	returnCapabilityId: string;
} {
	return {
		teleportActionId: `${cfg.bundle}/${TELEPORT_INTO_LIMBO_ACTION_LOCAL_ID}`,
		teleportCapabilityId: `${cfg.bundle}/action/${TELEPORT_INTO_LIMBO_ACTION_LOCAL_ID}`,
		returnActionId: `${cfg.bundle}/${RETURN_FROM_LIMBO_ACTION_LOCAL_ID}`,
		returnCapabilityId: `${cfg.bundle}/action/${RETURN_FROM_LIMBO_ACTION_LOCAL_ID}`,
	};
}

export function advancementTeleport(cfg: AdvancementTeleportConfig): VerbCall[] {
	const { bundle, personaName, returnPlaceName } = cfg;
	const ids = advancementTeleportIds(cfg);
	const appliedResourceId = (cfg.persona ?? ALDWIN_PERSONA).levelUpAppliedResourceId;
	return [
		{
			toolName: "spellkave_write_rows",
			label: "define-advancement-teleport-capabilities",
			params: {
				bundle,
				kind: "capability_definitions",
				rows: [
					{
						actor_kind: "entity",
						bundle_id: bundle,
						capability_id: ids.teleportCapabilityId,
						default_visibility: "Public",
						description:
							"The DM's authority to carry an accepting trainee into the advancement limbo. " +
							"Sibling of induct-candidate, opposite direction. Gated on the hero having " +
							`accepted ${personaName}'s level-up offer.`,
						display_name: "DM: teleport into advancement limbo",
					},
					{
						actor_kind: "entity",
						bundle_id: bundle,
						capability_id: ids.returnCapabilityId,
						default_visibility: "Public",
						description:
							"The DM's authority to return a trainee (and himself) from the advancement " +
							`limbo to ${returnPlaceName} once the level-up has been applied. Fixed destination ` +
							"for v1 — RelocateEntity has no captured-origin primitive.",
						display_name: "DM: return from advancement limbo",
					},
				],
			},
		},
		{
			...buildCapabilityGrants({
				bundle,
				grants: [
					{
						actorEntityKey: cfg.dmEntityKey,
						capabilityId: ids.teleportCapabilityId,
						source: bundle,
					},
					{
						actorEntityKey: cfg.dmEntityKey,
						capabilityId: ids.returnCapabilityId,
						source: bundle,
					},
				],
			}),
			label: `grant-advancement-teleport-to-${personaSlug(personaName)}`,
		},
		{
			toolName: "spellkave_define_action_verb",
			label: "action:teleport-into-advancement-limbo",
			params: {
				bundle,
				id: TELEPORT_INTO_LIMBO_ACTION_LOCAL_ID,
				required_capability: ids.teleportCapabilityId,
				niche_id: CREATURE_NICHE_TAG,
				display_name: "Carry the trainee into the advancement limbo",
				description:
					`${personaName} relocates the accepting hero — and himself alongside — into the advancement ` +
					"limbo so the existing draft-then-confirm wizard can run there. Gated on the hero " +
					"having accepted the offer. Cooperative, never a silent yank.",
				predicate_source: `target.stat('${LEVEL_UP_OFFER_ACCEPTED_RESOURCE_ID}') == 1`,
				self_eligible: false,
				self_only: false,
				non_steering: true,
				cost_time_ms: 0,
				consequence: {
					frame_writes: [
						{
							RelocateEntity: {
								target_ref: "TargetActor",
								destination: { kind: "place_node", id: cfg.limboNodeId },
							},
						},
						{
							RelocateEntity: {
								target_ref: "Actor",
								destination: { kind: "place_node", id: cfg.limboNodeId },
							},
						},
					],
				},
			},
		},
		{
			toolName: "spellkave_define_action_verb",
			label: "action:return-from-advancement-limbo",
			params: {
				bundle,
				id: RETURN_FROM_LIMBO_ACTION_LOCAL_ID,
				required_capability: ids.returnCapabilityId,
				niche_id: CREATURE_NICHE_TAG,
				display_name: `Return the trainee to ${returnPlaceName}`,
				description:
					`${personaName} returns the trainee and himself to ${returnPlaceName} after the level-up has ` +
					"been applied. Fixed destination for v1. Does NOT write dm/* resources — the " +
					"offer-accepted latch is cleared by dm/level-up/confirm (the bundle that owns it).",
				// L9: latch value = last applied hero level (not 0/1). Return once the
				// ceremony has latched at least the trainee's current level.
				predicate_source:
					`actor.stat('${appliedResourceId}') > 0` +
					` && actor.stat('${appliedResourceId}') >= target.stat('srd/level')`,
				self_eligible: false,
				self_only: false,
				non_steering: true,
				cost_time_ms: 0,
				consequence: {
					frame_writes: [
						{
							RelocateEntity: {
								target_ref: "TargetActor",
								destination: { kind: "place_node", id: cfg.returnNodeId },
							},
						},
						{
							RelocateEntity: {
								target_ref: "Actor",
								destination: { kind: "place_node", id: cfg.returnNodeId },
							},
						},
					],
				},
			},
		},
	];
}
