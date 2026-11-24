/**
 * // pattern: quest-composition
 * // pattern: milestone-gate-terminal-flags
 *
 * Elven-mini quest compatibility loader over compiled author/quests.toml.
 * Present-tense contract: docs/elven-mini-quests.md.
 * No world rows here; terminals evaluate offline/live against a view.
 */
import { asEntityRef } from "@spellkave/sdk";
import { BUNDLE } from "./lib/ids.ts";
import { COMPILED_QUEST_SOURCE } from "./quests.generated.ts";

export type QuestRung = "I" | "II" | "III" | "finale";

export type TerminalKind =
	| "flag"
	| "all_dead"
	| "any_dead_or_flag"
	| "escort_alive_at"
	| "has_item"
	| "all_dead_and_alive"
	| "all_dead_and_flag";

export interface QuestTerminalSpec {
	kind: TerminalKind;
	/** Adventure entity keys that must be dead (all_dead / all_dead_and_*). */
	deadKeys?: readonly string[];
	/** Any one of these dead satisfies any_dead_or_flag (with optional flag). */
	anyDeadKeys?: readonly string[];
	/** Flag name that also satisfies any_dead_or_flag / completes has_item deliver. */
	flag?: string;
	/** Escort subject key. */
	escortKey?: string;
	/** Escort destination node id. */
	atNodeId?: string;
	/** Item entity key the hero must hold. */
	itemKey?: string;
	/** Ally that must remain alive. */
	aliveKey?: string;
}

export interface QuestDef {
	id: string;
	name: string;
	rung: QuestRung;
	/** Giver adventure entity key (or aldwin/mira existing keys). */
	giverKey: string;
	giverName: string;
	/** Accept slot index (1-based dialog choice). */
	acceptSlot: number;
	declineSlot: number;
	slotAcceptText: string;
	slotDeclineText: string;
	/**
	 * ADR-0142 D-1: this quest's `dm/dialog/prompt` id — unique 1..16 (the
	 * `dm` bundle's generic `dm/dialog/prompt/set/<id>` range), bound to a
	 * `prompt_definition` in `author/quest-prompts.ts`. Every giver reuses
	 * the same generic `dm/dialog/choice/1`/`2` accept/decline slots (the
	 * ABA/reused-slot problem ADR-0142 fixes), so the id — not the slot — is
	 * this offer's identity.
	 */
	promptId: number;
	objective: string;
	terminal: QuestTerminalSpec;
	/** Base quest XP granted to the hero at terminal. */
	rewardXp: number;
	/** Extra XP when flag (e.g. q7_truce) is set. */
	bonusXp?: number;
	bonusFlag?: string;
	/** Creature slugs × counts used for rung kill-XP offline sums. */
	killXpCreatures: readonly { slug: string; count: number }[];
}

export const Q1_CELLAR_RAT_KEYS = [
	asEntityRef(`${BUNDLE}/adventure/encounter/cellar_rat_1`),
] as const;

export const Q1_CELLAR_SWARM_KEY = asEntityRef(`${BUNDLE}/adventure/encounter/cellar_swarm_1`);

export const MOONPETAL_KEY = `${BUNDLE}/adventure/item/moonpetal_1`;
export const CULT_RELIC_KEY = `${BUNDLE}/adventure/item/cult_relic_1`;
export const TOMB_KEY_ITEM_KEY = `${BUNDLE}/adventure/item/tomb_key_1`;

export const STORYLINE_NPC_KEYS = {
	ysolde: asEntityRef(`${BUNDLE}/adventure/npc/ysolde_1`),
	tamsin: asEntityRef(`${BUNDLE}/adventure/npc/tamsin_1`),
	caddoc: asEntityRef(`${BUNDLE}/adventure/npc/caddoc_1`),
	jory: asEntityRef(`${BUNDLE}/adventure/npc/jory_1`),
	hesper: asEntityRef(`${BUNDLE}/adventure/npc/hesper_1`),
	vessk: asEntityRef(`${BUNDLE}/adventure/npc/vessk_1`),
} as const;

/** Encounter keys referenced by terminals (maps-lane). */
export const ENCOUNTER_KEYS = {
	sisterMaelis: `${BUNDLE}/adventure/encounter/sister_maelis_1`,
	ghorza: `${BUNDLE}/adventure/encounter/warcaptain_ghorza_1`,
	lodgeSpider1: `${BUNDLE}/adventure/encounter/lodge_spider_1`,
	lodgeSpider2: `${BUNDLE}/adventure/encounter/lodge_spider_2`,
	lodgeOwlbear: `${BUNDLE}/adventure/encounter/lodge_owlbear_1`,
	grubnash: `${BUNDLE}/adventure/encounter/grubnash_1`,
	warrenMinions: Array.from(
		{ length: 6 },
		(_, i) => `${BUNDLE}/adventure/encounter/warren_minion_${i + 1}`,
	),
	warrenWarriors: [
		`${BUNDLE}/adventure/encounter/warren_warrior_1`,
		`${BUNDLE}/adventure/encounter/warren_warrior_2`,
	],
	motherUlda: `${BUNDLE}/adventure/encounter/mother_ulda_1`,
	swampFrogs: [
		`${BUNDLE}/adventure/encounter/swamp_frog_1`,
		`${BUNDLE}/adventure/encounter/swamp_frog_2`,
	],
	swampWisp: `${BUNDLE}/adventure/encounter/swamp_wisp_1`,
	shrineShadows: [
		`${BUNDLE}/adventure/encounter/shrine_shadow_1`,
		`${BUNDLE}/adventure/encounter/shrine_shadow_2`,
		`${BUNDLE}/adventure/encounter/shrine_shadow_3`,
	],
	shrineSpecter: `${BUNDLE}/adventure/encounter/shrine_specter_1`,
	wellWererats: [
		`${BUNDLE}/adventure/encounter/well_wererat_1`,
		`${BUNDLE}/adventure/encounter/well_wererat_2`,
	],
	wellRats: [
		`${BUNDLE}/adventure/encounter/well_rat_1`,
		`${BUNDLE}/adventure/encounter/well_rat_2`,
		`${BUNDLE}/adventure/encounter/well_rat_3`,
		`${BUNDLE}/adventure/encounter/well_rat_4`,
	],
	wellOoze: `${BUNDLE}/adventure/encounter/well_ooze_1`,
	paleSteward: `${BUNDLE}/adventure/encounter/pale_steward_1`,
} as const;

/** Static compatibility surface; author/quests.toml is the authored source. */
export const QUESTS: readonly QuestDef[] = COMPILED_QUEST_SOURCE.quests;
export const QUEST_PROMPT_LINES = COMPILED_QUEST_SOURCE.promptLinesByQuest;
export const QUEST_SPOKEN_LINES = COMPILED_QUEST_SOURCE.spokenLinesByQuest;
export const QUEST_BINDINGS = COMPILED_QUEST_SOURCE.bindingsByQuest;

/** Preserve the legacy fallback for callers outside the authored quest catalog. */
export function questFlagState(flag: string): string {
	const states: Readonly<Record<string, string>> =
		COMPILED_QUEST_SOURCE.runtimeBindings.flag_state_ids;
	return states[flag] ?? `${BUNDLE}/quest/flag/${flag}`;
}

export function questBindings(id: string) {
	if (!Object.hasOwn(QUEST_BINDINGS, id)) throw new Error(`unknown quest ${id}`);
	return QUEST_BINDINGS[id as keyof typeof QUEST_BINDINGS];
}

export function questById(id: string): QuestDef {
	const q = QUESTS.find((row) => row.id === id);
	if (q === undefined) throw new Error(`unknown quest ${id}`);
	return q;
}

export function questsForRung(rung: QuestRung): readonly QuestDef[] {
	return QUESTS.filter((q) => q.rung === rung);
}
