// Heroic Inspiration (playing-the-game.md § D20 Tests > Advantage/
// Disadvantage): a single, spendable permission to reroll one die. This
// module owns the resource identity only; the reactive post-roll choice and
// the rules that grant it remain separate mechanics.
//
// The resource is intentionally binary. The SRD says, "You can never have
// more than one instance of Heroic Inspiration," so 0 means the creature
// does not hold it and 1 means it does. `persistent` is metadata here: the
// resource does not reset for every creature unless a separate rule grants
// or removes it (for example, Human's Resourceful trait on a Long Rest).
import { readFileSync } from "node:fs";
import path from "node:path";

import { CACHE_MARKDOWN_DIR } from "../../markdown/paths";

export const HEROIC_INSPIRATION_ID = "heroic_inspiration";
export const HEROIC_INSPIRATION_DISPLAY_NAME = "Heroic Inspiration";
export const MIN_HEROIC_INSPIRATION = 0;
export const MAX_HEROIC_INSPIRATION = 1;
export const INITIAL_HEROIC_INSPIRATION = 0;
export const HEROIC_INSPIRATION_RECOVERY_RULE = "persistent";
export const HEROIC_INSPIRATION_SOURCE = "cache/markdown/playing-the-game.md:417-425";

const REROLL_SENTENCE =
	"If you have Heroic Inspiration, you can expend it to reroll any die immediately " +
	"after rolling it, and you must use the new roll.";
const ONLY_ONE_SENTENCE =
	"You can never have more than one instance of Heroic Inspiration. If something gives " +
	"you Heroic Inspiration and you already have it, you can give it to a player character " +
	"in your group who lacks it.";

/**
 * Keep this identity row grounded in the cached SRD sidebar. A source sync
 * that changes either load-bearing sentence must make the author revisit the
 * binary representation and its deferred mechanics explicitly.
 */
export function assertHeroicInspirationProvenanceSource(): void {
	const markdown = readFileSync(path.join(CACHE_MARKDOWN_DIR, "playing-the-game.md"), "utf8");
	if (!markdown.includes(REROLL_SENTENCE)) {
		throw new Error(
			"heroic-inspiration-units: expected reroll sentence not found in cached " +
				"playing-the-game.md — the Heroic Inspiration sidebar may have been reworded.",
		);
	}
	if (!markdown.includes(ONLY_ONE_SENTENCE)) {
		throw new Error(
			"heroic-inspiration-units: expected one-at-a-time sentence not found in cached " +
				"playing-the-game.md — the Heroic Inspiration sidebar may have been reworded.",
		);
	}
}

/** The exact source sidebar used for the public resource attachment. */
export function readHeroicInspirationProvenanceText(): string {
	const markdown = readFileSync(path.join(CACHE_MARKDOWN_DIR, "playing-the-game.md"), "utf8");
	const starts = [...markdown.matchAll(/^> \*\*Heroic Inspiration\*\*\r?$/gm)];
	const start = starts[0]?.index;
	if (starts.length !== 1 || start === undefined) {
		throw new Error(
			"heroic-inspiration-units: Heroic Inspiration sidebar is missing or ambiguous in cached playing-the-game.md.",
		);
	}
	const end = markdown.indexOf("\n## Proficiency", start);
	if (end === -1) {
		throw new Error(
			"heroic-inspiration-units: expected '## Proficiency' after the Heroic Inspiration sidebar.",
		);
	}
	return markdown.slice(start, end).replace(/^\r?\n+|\r?\n+$/g, "");
}
