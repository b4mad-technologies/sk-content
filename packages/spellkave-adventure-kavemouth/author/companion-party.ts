// pattern: party-extent-grant
// pattern: companion-combat
// pattern: companion-follow
// pattern: quest-xp-grant
/**
 * Party companions (sk-609b.15) — shared keys, party-present quest XP, and
 * the companion level ladder.
 *
 * ## Levelling rule (ONE rule, documented)
 *
 * **Fixed ladder tied to the hero's level via Aldwin's level-up watch.**
 * When the hero's applied level advances (Aldwin's `dm/aldwin/level-up-applied`
 * latch / live `srd/level`), every joined companion's `srd/level` is set to
 * the same integer. Companions do not run their own XP/threshold ceremony;
 * they ride the hero's ladder. Quest XP still accrues on companions present
 * at terminals (so their sheet stays honest for kill-time math and future
 * watches) but never gates a separate companion level-up.
 *
 * ## Party-present quest XP (#113)
 *
 * Party membership is the same tag/`party` extent family as
 * [`party-extent-grant`](../../../spellkave-world-author/docs/patterns/party-extent-grant.md)
 * (`srd.party.heroes`). A single DSL multi-target ModifyResource still does
 * not exist; the grant enumerates co-located party members at the host layer
 * and emits one ModifyResource per recipient in one consequence — see
 * `quest-xp.ts` + the runtime `dm/watches` quest-XP watch.
 */

import type { VerbCall } from "@spellkave/adventure-runtime/dm/lib";
import { LEVEL_ID, SRD_BUNDLE_ID } from "@spellkave/adventure-runtime/srd-ids";
import { asEntityRef } from "@spellkave/sdk";
import { kavemouthBundleHeaderCall } from "./bundle-header.ts";
import { BUNDLE } from "./lib/ids.ts";
import { STORYLINE_NPC_KEYS } from "./quests.ts";

/** Authored entity key for Aldwin's L2 rogue companion seat. */
export const ROGUE_COMPANION_ENTITY_KEY = asEntityRef(`${BUNDLE}/adventure/npc/rogue_companion_1`);

/** Stable party keys that can join as companions (hero is resolved live). */
export const COMPANION_ENTITY_KEYS = {
	rogue: ROGUE_COMPANION_ENTITY_KEY,
	hesper: STORYLINE_NPC_KEYS.hesper,
	caddoc: STORYLINE_NPC_KEYS.caddoc,
} as const;

export type CompanionSlot = keyof typeof COMPANION_ENTITY_KEYS;

/**
 * Fixed ladder: companion level === hero level.
 * Documented rule for sk-609b.15 — do not invent a second XP track.
 */
export function companionLevelForHero(heroLevel: number): number {
	const n = Math.trunc(heroLevel);
	if (!Number.isFinite(n) || n < 1) return 1;
	return n;
}

/**
 * Write `srd/level` on every listed companion to match the hero ladder.
 * HP / class-feature grants stay on each companion's own creation / join
 * path; this recompute only keeps the level integer in lockstep.
 */
export function renderCompanionLevelSync(args: {
	companionEntityKeys: readonly string[];
	level: number;
}): VerbCall[] {
	const level = companionLevelForHero(args.level);
	if (args.companionEntityKeys.length === 0) return [];
	return [
		kavemouthBundleHeaderCall(),
		{
			toolName: "spellkave_write_rows",
			label: "companion-level-ladder-sync",
			params: {
				bundle: BUNDLE,
				kind: "object_state",
				rows: args.companionEntityKeys.map((entityKey) => ({
					bundle_id: BUNDLE,
					entity_key: entityKey,
					source_template_id: `${BUNDLE}/companion/level-ladder`,
					state_id: `${SRD_BUNDLE_ID}/${LEVEL_ID}`,
					value_int: level,
					visibility: "Public",
				})),
			},
		},
	];
}
