// pattern: quest-xp-grant
// pattern: computed-literal
// pattern: party-extent-grant
/**
 * Publisher composition compatibility for literal quest-XP actions.
 * The current quest watch dispatches finite per-recipient award and giver
 * settlement acts built by author/dm/quest-xp-acts.ts, without per-play rows.
 * This retained builder accepts an explicit recipient list and emits literal
 * writes for publisher-authored scenes. It does not enforce party membership
 * or co-location; those are caller policy.
 */

import { XP_STATE_ID } from "../../srd-ids.ts";
import {
	dmCapabilityDefinition,
	dmCapabilityGrant,
	dmHostActAction,
	type HostActConfig,
	personaSlug,
} from "../host-act/index.ts";
import { bareEntityId, toEntityPrefixedRef } from "../lib/entity-ref.ts";
import type { VerbCall } from "../lib/index.ts";

/** Bundle-local id of the quest-XP action family (grants append `/<questId>/<eventId>`). */
export const GRANT_QUEST_XP_ACTION_LOCAL_ID = "dm/grant-quest-xp";

/** The recipients' XP resource (srd). */
export const QUEST_XP_STATE_ID = XP_STATE_ID;

/**
 * Quest-xp config: the host-act config plus the adventure's per-quest
 * progress state ids. Required — the quest ids are story vocabulary, so the
 * runtime owns no default for them. Structural on purpose: the runtime never
 * imports a `QuestDef`.
 */
export interface QuestXpConfig extends HostActConfig {
	/** Resource id of the DM-held "this quest's reward was granted" latch. */
	readonly questRewardedState: (questId: string) => string;
	/** Resource id of the giver-held "this quest was accepted" marker. */
	readonly questAcceptedState: (questId: string) => string;
}

export function grantQuestXpCapabilityId(cfg: Pick<HostActConfig, "bundle">): string {
	return `${cfg.bundle}/dm/grant-quest-xp`;
}

export function grantQuestXpActionFamilyId(cfg: Pick<HostActConfig, "bundle">): string {
	return `${cfg.bundle}/${GRANT_QUEST_XP_ACTION_LOCAL_ID}`;
}

export function grantQuestXpCapability(cfg: HostActConfig): VerbCall[] {
	const capabilityId = grantQuestXpCapabilityId(cfg);
	return [
		dmCapabilityDefinition({
			bundle: cfg.bundle,
			label: "define-grant-quest-xp-capability",
			capabilityId,
			description:
				"The DM's authority to award quest-completion Experience Points as a computed " +
				"literal. May-do. Recipients are every party member (srd.party.heroes) co-located " +
				"at the terminal beat — host enumerates one ModifyResource per present member " +
				"(sk-609b.15 / party-extent-grant membership; kill XP still goes to the killer).",
			displayName: "DM: grant quest XP",
		}),
		dmCapabilityGrant(cfg, {
			capabilityId,
			label: `grant-quest-xp-to-${personaSlug(cfg.personaName)}`,
		}),
	];
}

export function grantQuestXpActionLocalId(questId: string, eventId: string): string {
	return `${GRANT_QUEST_XP_ACTION_LOCAL_ID}/${questId}/${eventId}`;
}

export function grantQuestXpActionId(
	cfg: Pick<HostActConfig, "bundle">,
	actionLocalId: string,
): string {
	return `${cfg.bundle}/${actionLocalId}`;
}

/**
 * Publisher-composed self-action: grant `amount` XP to each recipient.
 * `recipients` is a non-empty list of entity ids or `entity:<id>` refs
 * (hero + co-located companions), deduped by bare id in order.
 * `actionLocalId` must be unique per grant.
 *
 * The original single-hero `heroEntityId` fallback is dropped: callers pass
 * `recipients` (a one-element list for a solo hero).
 */
export function renderGrantQuestXp(
	cfg: QuestXpConfig,
	args: {
		/** Party members present at the terminal (entity ids or entity: refs). */
		recipients: readonly string[];
		amount: number;
		questId: string;
		actionLocalId: string;
		/** Seeded reward latch on the DM; enabled when the caller wants a persistent latch. */
		persistent?: boolean;
		giverEntityId?: string;
	},
): VerbCall[] {
	if (args.recipients.length === 0) {
		throw new Error("renderGrantQuestXp: recipients required");
	}
	// Dedupe bare ids while preserving order.
	const seen = new Set<string>();
	const recipientRefs: string[] = [];
	for (const r of args.recipients) {
		const bare = bareEntityId(r);
		if (bare === "" || seen.has(bare)) continue;
		seen.add(bare);
		recipientRefs.push(toEntityPrefixedRef(bare));
	}
	if (recipientRefs.length === 0) {
		throw new Error("renderGrantQuestXp: recipients contained no usable entity id");
	}
	const frame_writes = recipientRefs.map((actor) => ({
		ModifyResource: {
			actor,
			resource: QUEST_XP_STATE_ID,
			delta_source: String(args.amount),
		},
	}));
	if (args.persistent) {
		frame_writes.push({
			ModifyResource: {
				actor: "Actor",
				resource: cfg.questRewardedState(args.questId),
				delta_source: "1",
			},
		});
		if (args.giverEntityId)
			frame_writes.push({
				ModifyResource: {
					actor: toEntityPrefixedRef(args.giverEntityId),
					resource: cfg.questAcceptedState(args.questId),
					delta_source: "1",
				},
			});
	}
	const who =
		recipientRefs.length === 1 ? recipientRefs[0] : `${recipientRefs.length} party members present`;
	return [
		cfg.bundleHeader(),
		...grantQuestXpCapability(cfg),
		dmHostActAction(cfg, {
			actionLocalId: args.actionLocalId,
			requiredCapability: grantQuestXpCapabilityId(cfg),
			displayName: `Grant quest XP (${args.questId})`,
			description:
				`Award ${args.amount} XP to ${who} for completing ${args.questId}. ` +
				"Party-present grant (sk-609b.15); computed literal outside the DSL.",
			...(args.persistent
				? { predicateSource: `actor.stat('${cfg.questRewardedState(args.questId)}') == 0` }
				: {}),
			consequence: {
				description: `Grant ${args.amount} XP for ${args.questId} to every present party member.`,
				frame_writes,
			},
		}),
	];
}
