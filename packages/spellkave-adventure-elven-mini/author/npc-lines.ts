/**
 * Story data of the ordinary NPC kinds: the spoken lines and menu labels that
 * `stage2-npc-kinds.ts` seals into the kind documents the Rust NPC host
 * reads. Data only, no imports. Key order is part of the sealed bytes; do not
 * reorder fields.
 *
 * // pattern: dialog-choice-slots
 * // pattern: directed-speech-anchor
 */

/** The Warden's stock refusal when addressed: hostile, not silent
 * (sk-dms.32), and never a title the world does not hold about the visitor
 * (sk-dms.40.6). */
export const DEFAULT_WARDEN_HOSTILE_LINE = "The dead keep their own counsel. Turn back.";

/** Mira's bar-talk slot numbers. */
export const MIRA_SLOT_WHATS_ON = 1;
export const MIRA_SLOT_ACCEPT = 2;
export const MIRA_SLOT_DECLINE = 3;

/** How many answers Mira opens when she asks. */
export const MIRA_BAR_ANSWER_COUNT = 3;

/** Mira's menu: slots, answer count and decision labels (ADR-0114 D-2: rule
 * per caller; every label is Mira's own). */
export const MIRA_MENU = {
	slots: { ask: MIRA_SLOT_WHATS_ON, accept: MIRA_SLOT_ACCEPT, decline: MIRA_SLOT_DECLINE },
	answerCount: MIRA_BAR_ANSWER_COUNT,
	rules: {
		greeting: { rule: "speak/greet-at-bar", summary: "Greet the hero at the bar." },
		hook: { rule: "speak/barrow-rumour", summary: "Tell the barrow rumour." },
		sendOff: { rule: "speak/send-off-to-crypt", summary: "Send the hero to the crypt." },
		stay: { rule: "speak/let-them-drink", summary: "Let them drink." },
		openAnswers: { rule: "manipulate/open-bar-answers", summary: "Open three bar answers." },
		closeAnswers: { rule: "manipulate/close-bar-answers", summary: "Close bar answers." },
		wait: { rule: "wait/nothing-new-at-bar", summary: "Nothing new at the bar — wait." },
		reactAbstain: {
			rule: "react/mira-abstains",
			summary: "Mira stays out of combat — no reaction is ever hers to give.",
		},
	},
};

export const MIRA_SPEECH_LINES = {
	greeting:
		"Morning. For the cellar rats, speak to Aldwin by the common-room hearth and accept his offer; report the cleared cellar to him. What can I get you? 1: What's going on? 2: I'll check the old barrow. 3: Just a drink.",
	barrowHook:
		"Old barrow north of the square. Nobody who went down came back chatty. Someone ought to look. 1: What's going on? 2: I'll check the old barrow. 3: Just a drink.",
	sendOff:
		"Then that's your road. North of the square, up Tomb Hill, into the crypt. Come back chatty.",
	stay: "Drink's on the board. The barrow can wait.",
};

export const MIRA_CONTINUATION_LINE =
	"For cellar work or credit, speak to Aldwin by the common-room hearth and accept his cellar offer. For more work, Captain Ysolde at the hamlet gate needs help on the road. Leave the inn, cross the square, and take the west path to the gate. She can tell you what needs doing.";
