// DOC-IMPL: character-creation#what-the-player-sees
/**
 * // pattern: draft-then-confirm-wizard
 *
 * Creation name parser (ADR-0096 D-7 parse-to-propose, same doctrine as
 * `parse-scores.ts`). Pure, world-blind: extracts `name=<free text>` from a
 * candidate utterance. The parse NEVER writes state — `engine.ts` speaks a
 * read-back and renders ONE adopt-name option; the player firing that
 * option is the only commit path.
 *
 * Grammar (English-only, keyword/menu, no LLM parsing):
 *  - Preferred `name=<text>` (`name=Renn the Roadwarden`).
 *  - Opportunistic `name: <text>`.
 *  - Case-insensitive key; word-boundary matched (never "filename=...").
 *  - LAST occurrence wins when the key is repeated.
 *  - Value is trimmed; empty / whitespace-only is rejected (`null`).
 *  - Values longer than {@link MAX_CREATION_NAME_LENGTH} are rejected.
 *  - Bare prose without the `name` key is `null` (not guessed).
 */
import { MAX_CREATION_NAME_LENGTH } from "./ids";
import { CREATION_PRESENTATION_VOCABULARY as vocabulary } from "./presentation-vocabulary";

const NAME_KEY = new RegExp(
	String.raw`\b(?:${vocabulary.text_field_aliases.name.join("|")})\s*[:=]\s*`,
	"gi",
);

function nameValue(text: string, requireKey: boolean): string | null {
	let lastIndex = -1;
	let prefixLength = 0;
	for (const match of text.matchAll(NAME_KEY)) {
		lastIndex = match.index ?? -1;
		prefixLength = match[0].length;
	}
	if (lastIndex < 0 && requireKey) return null;
	const rest = lastIndex < 0 ? text : text.slice(lastIndex + prefixLength);
	const value = (rest.split(/[\n;]/, 1)[0] ?? "").trim();
	if (value.length === 0 || value.length > MAX_CREATION_NAME_LENGTH) return null;
	return value;
}

export function parseCreationName(text: string): string | null {
	return nameValue(text, true);
}

/** Forms retain last-key-wins inside the value, independently of wire keys. */
export function validateCreationName(text: string): string | null {
	return nameValue(text, false);
}
