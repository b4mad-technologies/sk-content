// DOC-IMPL: character-creation#what-the-player-sees
/**
 * // pattern: draft-then-confirm-wizard
 *
 * Creation appearance / backstory parsers (ADR-0096 D-7 parse-to-propose,
 * same doctrine as `parse-name.ts`). Pure, world-blind: extracts
 * `appearance=<text>` or `backstory=<text>` from a candidate utterance. The
 * parse NEVER writes state — `engine.ts` speaks a read-back and renders ONE
 * adopt option; the player firing that option is the only commit path.
 *
 * Grammar (English-only, keyword/menu, no LLM parsing):
 *  - Preferred `appearance=<text>` / `backstory=<text>`.
 *  - Opportunistic `appearance: <text>` / `backstory: <text>`.
 *  - Case-insensitive key; word-boundary matched.
 *  - LAST occurrence of THAT key wins when the key is repeated.
 *  - Value is trimmed; empty / whitespace-only is rejected (`null`).
 *  - Values longer than the key's max length are rejected.
 *  - Bare prose without the key is `null` (not guessed).
 *  - Both keys may appear in one utterance; each parser is independent.
 */
import { ABILITY_KEYS, MAX_CREATION_APPEARANCE_LENGTH, MAX_CREATION_BACKSTORY_LENGTH } from "./ids";
import { CREATION_PRESENTATION_VOCABULARY as vocabulary } from "./presentation-vocabulary";

function parseKeyedText(
	text: string,
	key: string,
	maxLength: number,
	requireKey = true,
): string | null {
	const pattern = new RegExp(String.raw`\b(?:${key})\s*[:=]\s*`, "gi");
	let lastIndex = -1;
	let prefixLength = 0;
	for (const match of text.matchAll(pattern)) {
		lastIndex = match.index ?? -1;
		prefixLength = match[0].length;
	}
	if (lastIndex < 0 && requireKey) return null;
	return validateDescription(
		lastIndex < 0 ? text : text.slice(lastIndex + prefixLength),
		maxLength,
	);
}

function validateDescription(rest: string, maxLength: number): string | null {
	// Stop at the next known creation-contract key so both fields can share
	// one utterance (`appearance=… backstory=…`).
	const nextKey = rest.search(
		new RegExp(
			String.raw`\b(?:${[...Object.values(vocabulary.text_field_aliases).flat(), ...ABILITY_KEYS].join("|")})\s*[:=]`,
			"i",
		),
	);
	const raw = nextKey >= 0 ? rest.slice(0, nextKey) : rest;
	const value = raw.replace(/[;,\s]+$/u, "").trim();
	if (value.length === 0 || value.length > maxLength) return null;
	return value;
}

export function parseCreationAppearance(text: string): string | null {
	return parseKeyedText(
		text,
		vocabulary.text_field_aliases.appearance.join("|"),
		MAX_CREATION_APPEARANCE_LENGTH,
	);
}

export function validateCreationAppearance(text: string): string | null {
	return parseKeyedText(
		text,
		vocabulary.text_field_aliases.appearance.join("|"),
		MAX_CREATION_APPEARANCE_LENGTH,
		false,
	);
}

export function validateCreationBackstory(text: string): string | null {
	return parseKeyedText(
		text,
		vocabulary.text_field_aliases.backstory.join("|"),
		MAX_CREATION_BACKSTORY_LENGTH,
		false,
	);
}

export function parseCreationBackstory(text: string): string | null {
	return parseKeyedText(
		text,
		vocabulary.text_field_aliases.backstory.join("|"),
		MAX_CREATION_BACKSTORY_LENGTH,
	);
}

export function looksLikeAppearanceContract(text: string): boolean {
	return new RegExp(
		String.raw`\b(?:${vocabulary.text_field_aliases.appearance.join("|")})\s*[:=]`,
		"i",
	).test(text);
}

export function looksLikeBackstoryContract(text: string): boolean {
	return new RegExp(
		String.raw`\b(?:${vocabulary.text_field_aliases.backstory.join("|")})\s*[:=]`,
		"i",
	).test(text);
}
