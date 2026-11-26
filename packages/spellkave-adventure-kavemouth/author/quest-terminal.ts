/**
 * // pattern: quest-composition
 * // pattern: quest-xp-grant
 * // pattern: milestone-gate-terminal-flags
 *
 * Quest terminal evaluation — pure functions over a view.
 * Offline tests fake the view; live watches project a snapshot into it.
 */
import { QUESTS, type QuestDef, type QuestTerminalSpec, questById } from "./quests";

/** Snapshot a watch or offline test can fill. */
export interface QuestTerminalView {
	/** Adventure entity keys known dead. */
	deadKeys: ReadonlySet<string>;
	/** Adventure entity keys still alive (optional; absence ⇒ not dead). */
	aliveKeys?: ReadonlySet<string>;
	/** entityKey → place_node_id */
	locations: ReadonlyMap<string, string>;
	/** Item entity keys held by the hero (or party — hero-only today). */
	heroItemKeys: ReadonlySet<string>;
	/** Named beat flags (parley truce, altar relit, delivered, …). */
	flags: Readonly<Record<string, boolean>>;
	/** Quest ids the hero has accepted. */
	accepted: ReadonlySet<string>;
	/** Quest ids already rewarded (exactly-once latch). */
	granted?: ReadonlySet<string>;
}

export function evaluateTerminalSpec(spec: QuestTerminalSpec, view: QuestTerminalView): boolean {
	const dead = (key: string) => view.deadKeys.has(key);
	const alive = (key: string) => {
		if (view.aliveKeys !== undefined) return view.aliveKeys.has(key);
		return !view.deadKeys.has(key);
	};
	const flag = (name: string | undefined) => name !== undefined && view.flags[name] === true;

	switch (spec.kind) {
		case "flag":
			return flag(spec.flag);
		case "all_dead":
			return (spec.deadKeys ?? []).every(dead);
		case "any_dead_or_flag": {
			const anyDead = (spec.anyDeadKeys ?? []).some(dead);
			return anyDead || flag(spec.flag);
		}
		case "escort_alive_at": {
			const key = spec.escortKey;
			const node = spec.atNodeId;
			if (key === undefined || node === undefined) return false;
			return alive(key) && view.locations.get(key) === node;
		}
		case "has_item": {
			const item = spec.itemKey;
			if (item === undefined) return false;
			if (!view.heroItemKeys.has(item)) return false;
			// Optional deliver flag (Q3): when present must also be true.
			if (spec.flag !== undefined) return flag(spec.flag);
			return true;
		}
		case "all_dead_and_alive": {
			const ally = spec.aliveKey;
			if (ally === undefined) return false;
			return (spec.deadKeys ?? []).every(dead) && alive(ally);
		}
		case "all_dead_and_flag":
			return (spec.deadKeys ?? []).every(dead) && flag(spec.flag);
		default:
			return false;
	}
}

export function evaluateQuestTerminal(questId: string, view: QuestTerminalView): boolean {
	return evaluateTerminalSpec(questById(questId).terminal, view);
}

export type QuestRewardDecision =
	| { kind: "grant"; questId: string; amount: number; reason: string }
	| { kind: "skip"; reason: string };

/**
 * Decide quest XP. Requires accept + terminal + not yet granted.
 * Amount = base + bonus when bonusFlag is set.
 */
export function decideQuestXpGrant(questId: string, view: QuestTerminalView): QuestRewardDecision {
	const quest = questById(questId);
	if (view.granted?.has(questId)) {
		return { kind: "skip", reason: "already granted" };
	}
	if (!view.accepted.has(questId)) {
		return { kind: "skip", reason: "quest not accepted" };
	}
	if (!evaluateQuestTerminal(questId, view)) {
		return { kind: "skip", reason: "terminal not satisfied" };
	}
	let amount = quest.rewardXp;
	let reason = `${quest.id} base ${quest.rewardXp}`;
	if (
		quest.bonusXp !== undefined &&
		quest.bonusFlag !== undefined &&
		view.flags[quest.bonusFlag] === true
	) {
		amount += quest.bonusXp;
		reason += ` + bonus ${quest.bonusXp} (${quest.bonusFlag})`;
	}
	return { kind: "grant", questId, amount, reason };
}

/** Parley open while leader alive and at least one minion alive. */
export function parleyOpen(args: {
	leaderKey: string;
	minionKeys: readonly string[];
	view: QuestTerminalView;
}): boolean {
	const leaderAlive =
		args.view.aliveKeys !== undefined
			? args.view.aliveKeys.has(args.leaderKey)
			: !args.view.deadKeys.has(args.leaderKey);
	if (!leaderAlive) return false;
	const minionsAlive = args.minionKeys.filter((k) =>
		args.view.aliveKeys !== undefined ? args.view.aliveKeys.has(k) : !args.view.deadKeys.has(k),
	).length;
	return minionsAlive >= 1;
}

export function allQuestIds(): readonly string[] {
	return QUESTS.map((q) => q.id);
}

export function catalogQuest(questId: string): QuestDef {
	return questById(questId);
}
