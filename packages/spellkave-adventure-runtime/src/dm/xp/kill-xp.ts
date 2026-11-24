// pattern: kill-xp-grant
// pattern: computed-literal
/**
 * Publisher composition compatibility for literal kill-XP actions.
 * The current kill watch uses preauthored srd/dm/spend-xp-value followed by
 * srd/dm/award-xp with a quantity argument. It publishes no per-kill rows.
 * This retained builder instead emits a self-targeted action containing
 * numeric beneficiary/victim references and a caller-computed literal.
 * It remains available for explicitly publisher-authored scenes and rendering
 * tests; those tests do not establish the current host's dispatch path.
 */

import { SRD_BUNDLE_ID, XP_STATE_ID, XP_VALUE_ID } from "../../srd-ids.ts";
import {
	dmCapabilityDefinition,
	dmCapabilityGrant,
	dmHostActAction,
	type HostActConfig,
	personaSlug,
} from "../host-act/index.ts";
import { toEntityPrefixedRef } from "../lib/entity-ref.ts";
import type { VerbCall } from "../lib/index.ts";

/** Bundle-local id of the kill-XP action family (per-kill ids append `/<eventId>`). */
export const GRANT_KILL_XP_ACTION_LOCAL_ID = "dm/grant-kill-xp";

/** The killer's XP resource (srd). */
export const KILL_XP_STATE_ID = XP_STATE_ID;
/** The victim's one-shot XP-worth latch (srd). */
export const KILL_XP_VALUE_STATE_ID = `${SRD_BUNDLE_ID}/${XP_VALUE_ID}`;

/** Fully-qualified id of the kill-XP action family. */
export function grantKillXpActionFamilyId(cfg: Pick<HostActConfig, "bundle">): string {
	return `${cfg.bundle}/${GRANT_KILL_XP_ACTION_LOCAL_ID}`;
}

/** Fully-qualified capability id of the kill-XP may-do. */
export function grantKillXpCapabilityId(cfg: Pick<HostActConfig, "bundle">): string {
	return `${cfg.bundle}/dm/grant-kill-xp`;
}

/** Seed-time capability definition + grant. The compatibility ACTION is composed
 * for a caller-selected event (`renderGrantKillXp`) so its `delta_source` can carry
 * the victim's live `srd/xp_value` as a computed literal. */
export function grantKillXpCapability(cfg: HostActConfig): VerbCall[] {
	const capabilityId = grantKillXpCapabilityId(cfg);
	return [
		dmCapabilityDefinition({
			bundle: cfg.bundle,
			label: "define-grant-kill-xp-capability",
			capabilityId,
			description:
				"The DM's authority to award a killer the Experience Points a defeated creature " +
				`was worth, at the moment of the kill. May-do — unlike ${cfg.bundle}/dm/watch, which ` +
				"only widens what the holder SEES. A kill with no running NPC host pays nothing: " +
				`this grant is ${cfg.personaName}'s act, not a world-physics write.`,
			displayName: "DM: grant kill XP",
		}),
		dmCapabilityGrant(cfg, {
			capabilityId,
			label: `grant-kill-xp-to-${personaSlug(cfg.personaName)}`,
		}),
	];
}

export function grantKillXpActionLocalId(eventId: string): string {
	return `${GRANT_KILL_XP_ACTION_LOCAL_ID}/${eventId}`;
}

export function grantKillXpActionId(
	cfg: Pick<HostActConfig, "bundle">,
	actionLocalId: string,
): string {
	return `${cfg.bundle}/${actionLocalId}`;
}

/**
 * Publisher-composed self-action: grant `amount` XP to `killerEntityId` and
 * zero the victim's `srd/xp_value` latch (exactly-once, same idiom as
 * `srd/claim-victory`). `amount` is a TypeScript-computed literal — never
 * `target.stat('srd/xp_value')` inside the grant delta (BL-23).
 *
 * `actionLocalId` must be unique per kill: `r_manipulate` selects by
 * `action_id`, and a second kill would otherwise reuse a stale literal.
 *
 * Victim zero-out uses `target.stat(...)` because `ModifyResource` binds
 * `target.*` to `op.actor` (the victim literal) and `actor.*` to the
 * original manipulation Actor (the DM). `actor.stat('srd/xp_value')` would
 * read the DM, not the corpse.
 */
export function renderGrantKillXp(
	cfg: HostActConfig,
	args: {
		killerEntityId: string;
		victimEntityId: string;
		amount: number;
		actionLocalId: string;
	},
): VerbCall[] {
	const killerRef = toEntityPrefixedRef(args.killerEntityId);
	const victimRef = toEntityPrefixedRef(args.victimEntityId);
	return [
		cfg.bundleHeader(),
		...grantKillXpCapability(cfg),
		dmHostActAction(cfg, {
			actionLocalId: args.actionLocalId,
			requiredCapability: grantKillXpCapabilityId(cfg),
			// Self-eligible: the DM targets itself. `srd.creature` is on its
			// blueprint, so the niche resolves without a place attachment
			// (entity-provided).
			displayName: "Grant kill XP",
			description:
				`Award ${args.amount} XP to ${killerRef} for defeating ${victimRef}, ` +
				"and zero the victim's srd/xp_value latch. Computed-literal grant — the amount " +
				"was read outside the DSL from the victim's live srd/xp_value.",
			consequence: {
				description:
					"Grant the killer the victim's XP worth (computed literal) and zero the " +
					"victim's srd/xp_value in the same dispatch (exactly-once latch).",
				frame_writes: [
					{
						ModifyResource: {
							actor: killerRef,
							resource: KILL_XP_STATE_ID,
							delta_source: String(args.amount),
						},
					},
					{
						ModifyResource: {
							actor: victimRef,
							resource: KILL_XP_VALUE_STATE_ID,
							delta_source: `0 - target.stat('${KILL_XP_VALUE_STATE_ID}')`,
						},
					},
				],
			},
		}),
	];
}
