/**
 * // pattern: blueprint-instance-override
 *
 * Tomb combatants for the adventure playthrough — a Gray Ooze story
 * instance named Slime Scout.
 *
 * The scout IS `srd/creature/gray-ooze` (`chapters/monsters/creature-units.ts`).
 * Instance identity (name, description, key) lives on the adventure side;
 * the only number this scene overrides is HP. T24 (operator decision
 * 2026-08-05, `ledger/designs/tool-ux-decision-log.md`): sessionless combat
 * stays first-class — the scout dies on the FIRST successful hit. The
 * chapter dispatches `srd/attack/melee` (its dead-cascade is what actually
 * kills); its consequence's damage floor is `max(0, 1d6 + Strength modifier)`
 * (`fixtures/base/playing-the-game/attacks.toml`'s own
 * `srd/attack/melee/success` frame write) — with the adventure hero's
 * Fighter Strength 15 (+2 modifier, `hero.ts`'s `ADVENTURE_HERO_STR`), the
 * worst-case roll is `1 + 2 = 3`. HP = 3 guarantees ANY landed hit kills.
 * Admission-time `place_actor.resources` / `[[object_state]]` supersedes the
 * Gray Ooze definition seed of 22 (`entity_authoring.rs`).
 */

import type { VerbCall } from "@spellkave/adventure-runtime/dm/lib";
import { HP_ID, SRD_BUNDLE_ID } from "@spellkave/adventure-runtime/srd-ids";
import { BUNDLE, GRAPHS, nodeId } from "./lib/ids.ts";

export const SLIME_DEF_ID = `${SRD_BUNDLE_ID}/creature/gray-ooze`;
export const SLIME_KEY_PREFIX = "adventure/npc/slime_scout";
export const SLIME_ENTITY_KEY = `${BUNDLE}/${SLIME_KEY_PREFIX}_1`;
export const SLIME_DISPLAY_NAME = "Slime Scout";
export const SLIME_PLACE_NODE_ID = nodeId(GRAPHS.tomb, "hall");
/**
 * T24 (operator decision 2026-08-05, `ledger/designs/tool-ux-decision-log.md`):
 * sessionless combat stays first-class — the scout dies on the FIRST
 * successful hit. Grounded in the authored melee attack's minimum damage,
 * not guessed — see this file's module header.
 */
export const SLIME_HP = 3;

export const SLIME_HP_STATE_ID = `${SRD_BUNDLE_ID}/${HP_ID}`;

/** Verb calls: Gray Ooze placement in the tomb hall, HP overridden to 3. */
export function combatantOccupancy(): VerbCall[] {
	return [
		{
			toolName: "spellkave_place_actor",
			label: "place-slime-scout",
			params: {
				bundle: BUNDLE,
				kind: "npc",
				entity_def: SLIME_DEF_ID,
				at: SLIME_PLACE_NODE_ID,
				key_prefix: SLIME_KEY_PREFIX,
				name: SLIME_DISPLAY_NAME,
				description: "A glistening scout ooze blocking the sarcophagus hall.",
				resources: [{ resource: SLIME_HP_STATE_ID, value: SLIME_HP }],
			},
		},
		// actor-carried-verbs D1/D7 (ruling bead sk-rd0): the two attachments
		// that used to live here (`srd.creature` for Unarmed Strike/
		// Opportunity Attack, `srd/niche/strikeable` for Melee Attack) are
		// RETIRED — every attack template now moves onto ONE actor-provided
		// niche (`niche/attack-verb`, `fragments/attacks.ts`), offered
		// wherever the acting entity stands, no place attachment required.
		// T24 (sessionless combat, 2026-08-05): the hero's killing blow is
		// `srd/attack/melee` — its `success` consequence carries the HP<=0 ->
		// `srd/condition/dead` lethal cascade
		// (`fixtures/base/playing-the-game/attacks.toml`'s own
		// `srd/attack/melee/success` frame writes; `weapon-attack-units.ts`'s
		// `monsterDeathFrameWrite` doc comment has the full mechanism).
		// T4(c) / sk-jay0.1.8.34.18: `ui.affordance_group` membership on SRD
		// Attack-capability templates is owned by `@spellkave/srd-cc`
		// (`src/ui/affordance-groups.ts`). This adventure must not re-register
		// the namespace or duplicate SRD template attachments. An existing live
		// world that already applied elven_mini as namespace owner cannot switch
		// that owner by additive apply. Disposable local: just wipe then seed.
		// Hosted: canonical API world load / reset handshake — never just wipe.
	];
}
