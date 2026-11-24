// pattern: quest-composition
/** Quest offer shape and default giver lines the authoring compiler shares.
 * Re-homed from the retired TypeScript `QuestGiverEngine` (sk-jay0.1.55.60.8):
 * only the pure data and the default-line builder survive; the Rust NPC host
 * runs the quest-giver kind. */

/** The structural slice of an authored quest the engine talks about. */
export interface QuestOffer {
	id: string;
	acceptSlot: number;
	declineSlot: number;
	slotAcceptText: string;
	slotDeclineText: string;
	/**
	 * ADR-0142 D-1: this offer's `dm/dialog/prompt` id. Bound alongside the
	 * open count so the offer's `prompt_definition` can bind its audience and
	 * response set instead of a bare `dm/dialog/open >= 1` a stale answer
	 * could also satisfy.
	 */
	promptId: number;
}

/** Extra fields {@link defaultQuestGiverLines} reads from an offer. */
export interface QuestOfferText extends QuestOffer {
	name: string;
	giverName: string;
	objective: string;
}

/**
 * What the story supplies. Both members are REQUIRED: a silent default here
 * would be a value the story never uses, and the generic tests would then
 * pass on it (adversarial critique 6).
 */

export interface QuestGiverLines {
	greeting: string;
	/** Spoken after accept - objective send-off. */
	accept: string;
	/** Spoken after decline. */
	decline: string;
	/** Spoken when the terminal just completed. */
	complete?: string;
}

/**
 * Default lines from an offer's catalog fields. `ledgerKeeperName` (the name
 * the completion line points at: "<name> will see the ledger updated") and
 * `declineLine` are REQUIRED: both are story voice, and a neutral default
 * here would be a line the story never speaks.
 */
export function defaultQuestGiverLines(
	quest: QuestOfferText,
	opts: { ledgerKeeperName: string; declineLine: string },
): QuestGiverLines {
	return {
		greeting: `${quest.giverName} regards you. Work needs doing — ${quest.name}.`,
		accept: `${quest.objective} Return when it is done.`,
		decline: opts.declineLine,
		complete: `It is done. ${quest.name} is closed — ${opts.ledgerKeeperName} will see the ledger updated.`,
	};
}
