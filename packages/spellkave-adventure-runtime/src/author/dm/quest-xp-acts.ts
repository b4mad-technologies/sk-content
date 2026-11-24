/** Authored quest rewards: each recipient owns a durable award marker. */
import type { VerbCall } from "../../dm/lib/scene-driver.ts";
import { type AuthoredAct, authoredActCalls } from "./authored-act.ts";

export interface QuestRewardActs {
	bundle: string;
	quests: readonly { id: string }[];
	awardActionId(questId: string): string;
	settleActionId(questId: string): string;
	awardedStateId(questId: string): string;
	acceptedStateId(questId: string): string;
	rewardedStateId(questId: string): string;
}
export function questRewardActs(config: QuestRewardActs): AuthoredAct[] {
	const modify = (resource: string, delta_source: string) => ({
		ModifyResource: { actor: "TargetActor", resource, delta_source },
	});
	const acts: AuthoredAct[] = config.quests.flatMap(({ id }) => [
		{
			id: config.awardActionId(id),
			capability: "frontier.set_state",
			predicate: `target.stat('${config.awardedStateId(id)}') == 0`,
			writes: [
				modify("srd/xp", "actor.stat('core/dispatch_arg_quantity')"),
				modify(config.awardedStateId(id), "1"),
			],
		},
		{
			id: config.settleActionId(id),
			capability: "frontier.set_state",
			predicate: `target.stat('${config.acceptedStateId(id)}') == 1 && target.stat('${config.rewardedStateId(id)}') == 0`,
			writes: [modify(config.rewardedStateId(id), "1"), modify(config.acceptedStateId(id), "1")],
		},
	]);
	return acts;
}

export function questRewardActCalls(config: QuestRewardActs): VerbCall[] {
	return authoredActCalls(config.bundle, questRewardActs(config));
}
