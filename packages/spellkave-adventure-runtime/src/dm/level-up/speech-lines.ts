// pattern: proactive-level-up
/**
 * Level-up ceremony speech lines (generic). The giver's persona is NOT baked
 * in: a story passes its own complete {@link LevelUpSpeechLines}; the neutral
 * {@link DEFAULT_LEVEL_UP_SPEECH_LINES} exist for tests and for stories that
 * have nothing to say in their own voice.
 */

export interface LevelUpSpeechLines {
	/** Answers when advancement is live — HP-growth choices in rules terms. */
	explanation: string;
	/** Hero spoke and no earned or unapplied level was observed. */
	direction: string;
	/** Spoken once per level when the hero has earned the next level. */
	offer: string;
	/** Optional class colour from identity metadata (display name + primary ability). */
	classFlavour?: string;
	acknowledgement: string;
	/** Closing after apply latch advances — never a class feature name. */
	closing: string;
}

export const DEFAULT_LEVEL_UP_SPEECH_LINES: LevelUpSpeechLines = {
	explanation:
		"Two ways to grow, once you've earned it: 'Take the average Hit Points' for a steady, " +
		"predictable gain, or 'Roll for Hit Points' on your hit die if you'd rather trust the dice. Draft " +
		"either one with me, change your mind as often as you like, then confirm the level-up once " +
		"you've settled — or discard the drafted choice to start over. " +
		"When the wizard names a choice menu, pick from the numbered answers.",
	direction: "Nothing to record yet. Come back once you have earned a level.",
	offer: "You have the bearing of someone who has earned a level. Let us talk it through.",
	acknowledgement:
		"So it is done — you have grown stronger. Let me set your level-up down in the ledger " +
		"properly.",
	closing: "Your new training is recorded. Go well.",
};

/**
 * Build a one-line class flavour string from creation metadata — never a
 * hand-written per-class paragraph.
 */
export function classFlavourLine(displayName: string, primaryAbilityText: string): string {
	return `${displayName} — primary ${primaryAbilityText}.`;
}

/**
 * Offer line with optional class colour appended (seat supplies flavour from
 * the hero's live class tag metadata).
 */
export function levelUpOfferUtterance(lines: LevelUpSpeechLines): string {
	if (lines.classFlavour === undefined || lines.classFlavour.length === 0) {
		return lines.offer;
	}
	return `${lines.offer} ${lines.classFlavour}`;
}
