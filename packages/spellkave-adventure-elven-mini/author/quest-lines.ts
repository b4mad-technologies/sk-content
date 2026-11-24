// pattern: directed-speech-anchor
// pattern: quest-composition
/** Prompt presentation and actual speech share the authored TOML source.
 * Existing companion offers intentionally use their separate spoken variants.
 * The default lines are Aldwin's ledger voice over the runtime's pure builder. */
import {
	defaultQuestGiverLines,
	type QuestGiverLines,
} from "@spellkave/adventure-runtime/dm/dialog";
import { QUEST_PROMPT_LINES, QUEST_SPOKEN_LINES, QUESTS, type QuestDef } from "./quests";

/** Default lines from quest catalog fields, in Aldwin's ledger voice. */
export function defaultLinesForQuest(quest: QuestDef): QuestGiverLines {
	return defaultQuestGiverLines(quest, {
		ledgerKeeperName: "Aldwin",
		declineLine: "Very well. The valley will wait — for a while.",
	});
}

export function linesForQuest(quest: QuestDef): QuestGiverLines {
	return Object.hasOwn(QUEST_PROMPT_LINES, quest.id)
		? QUEST_PROMPT_LINES[quest.id as keyof typeof QUEST_PROMPT_LINES]
		: defaultLinesForQuest(quest);
}
export function spokenLinesForQuest(quest: QuestDef): QuestGiverLines {
	return Object.hasOwn(QUEST_SPOKEN_LINES, quest.id)
		? QUEST_SPOKEN_LINES[quest.id as keyof typeof QUEST_SPOKEN_LINES]
		: defaultLinesForQuest(quest);
}
export function allQuestSpeechLines(): ReadonlyArray<{ questId: string; lines: QuestGiverLines }> {
	return QUESTS.map((quest) => ({ questId: quest.id, lines: linesForQuest(quest) }));
}
