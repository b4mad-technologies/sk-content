/**
 * // pattern: draft-then-confirm-wizard
 *
 * DM Runtime Library — CREATION dialogue (ADR-0096 D-7 — parse-to-propose,
 * operator 2026-08-09; Creation-Dialogue-v3 mini-DSL, operator ruling
 * 2026-08-10, `ledger/designs/dm-advancement-choice-arc.md` § "UX
 * principle"). A deterministic, PURE, world-blind parser: extracts
 * `{ability: value}` pairs from a candidate's free-text utterance
 * (`speech_heard.text`), routed here by `engine.ts` ONLY for text that
 * {@link looksLikeScoreContract} accepts — the `key=value` / `key: value`
 * / `key N` contract. Menu-handle prose ("Elf.", "I choose Ranger") is
 * not a scores contract and must never reach this parser. The candidate
 * reaches this parser by firing `STATE_SCORES_ACTION_ID` (`ids.ts`) — the
 * dm-bundle-owned communicate affordance whose OWN `description` documents
 * this file's exact grammar, so an LLM player reads the contract before
 * speaking it (never the generic, contract-free `srd/speak-to`).
 *
 * D-7, verbatim: "the parse's only outputs are (a) the DM speaking its
 * understanding back aloud ... and (b) rendering a single adoption option
 * carrying the parsed values as late-bound literals ... The parse NEVER
 * writes state." This module produces NEITHER of those outputs — it only
 * extracts raw ability=value pairs as plain data. No world access, no
 * `VerbCall`, no I/O, no wall clock, no RNG: `engine.ts` (never this file)
 * decides what to speak and what to render from this module's output.
 *
 * GRAMMAR, decided (Creation-Dialogue-v3, English-only — the v2 parser's
 * German aliases and German-phrasing connectors are RETIRED, operator
 * ruling: "English keys only until real i18n"):
 *  - Keys: the six full English ability names (Strength, Dexterity,
 *    Constitution, Intelligence, Wisdom, Charisma) or their 3-letter
 *    abbreviations — the SAME strings as {@link AbilityKey} itself
 *    (str/dex/con/int/wis/cha). Case-insensitive; word-boundary matched
 *    (never matches "str" inside "strange", "con" inside "control").
 *  - Connector between key and value: preferred `=` (`con=13`),
 *    opportunistically also `:` (`con: 13`) or nothing at all — a bare
 *    space (`con 13`). No other connector is recognized (the v2 parser's
 *    `to`/`auf`/`ist`/`zu`/`->`/`-` tokens are gone with the German
 *    aliases — a leaner, unambiguous grammar for a single preferred shape
 *    plus two opportunistic ones, not six equally-weighted synonyms).
 *  - Separators between assignments: NONE are required by the grammar
 *    itself — each ability is searched INDEPENDENTLY across the WHOLE
 *    utterance (`\s` already matches newlines in a JS regex), so commas,
 *    semicolons, and newlines all "just work" as separators without any
 *    dedicated separator-parsing code; a caller may freely write
 *    `"str=15, dex=14"`, `"str=15; dex=14"`, or one assignment per line.
 *  - PARTIAL updates: an utterance may mention any subset of the six
 *    abilities; {@link applyParsedScores} merges the parse onto a base
 *    spread, so every UNMENTIONED ability keeps its current drafted value.
 *  - Junk (non-matching) lines/tokens are silently ignored — this parser
 *    never throws on unrecognized text, only returns fewer pairs.
 *  - A parsed number outside the point-buy domain (8..15) is VALIDATED,
 *    not clamped: that ability is excluded from the result rather than
 *    silently coerced to a boundary the player never asked for.
 *  - REPEATED key in one utterance: the LAST occurrence wins (deterministic
 *    self-correction support — "con=13, actually con=12" resolves to 12).
 *    If that LAST occurrence's own value is out-of-domain, the ability is
 *    excluded entirely — an earlier, in-domain occurrence is never used as
 *    a fallback (same "last wins, no silent substitution" discipline
 *    applied consistently).
 *  - Only the FIRST distinct-utterance self-correction case above is in
 *    scope; the free-text CHANNEL's own self-correction (a later, separate
 *    utterance superseding an earlier pending proposal) is `engine.ts`'s
 *    own `pendingParse` handling, not this module's concern.
 *  - NOT supported (documented gaps, never silently guessed): ability
 *    NAMES without a following number ("high constitution"), relative
 *    phrasing ("con +2"), or a bare six-number list with no ability words
 *    ("15 14 13 12 10 8") — {@link parseAbilityScores} returns `null` for
 *    all of these, which `engine.ts` treats as "unparseable" (D-7's own
 *    "DM says so aloud, renders nothing").
 */
import { ABILITY_KEYS, type AbilityKey, POINT_BUY_MAX_SCORE, POINT_BUY_MIN_SCORE } from "./ids";

export const ABILITY_ALIASES: Readonly<Record<AbilityKey, readonly string[]>> = {
	str: ["strength", "str"],
	dex: ["dexterity", "dex"],
	con: ["constitution", "con"],
	int: ["intelligence", "int"],
	wis: ["wisdom", "wis"],
	cha: ["charisma", "cha"],
};

/** The connector between the ability word and its number: preferred `=`,
 * opportunistically `:` or nothing (a bare space) — see this module's own
 * header for the full grammar decision. */
const CONNECTOR = "(?:=|:)?";

function buildAbilityPattern(key: AbilityKey): RegExp {
	// Longest-alias-first so the full name is tried before the abbreviation
	// would be (defensive; no current alias pair actually collides, but this
	// keeps the invariant explicit rather than relying on regex alternation
	// order by accident). GLOBAL ('g'): every occurrence is collected, not
	// just the first — "repeated key = last wins" needs the full match list.
	const alternation = [...ABILITY_ALIASES[key]].sort((a, b) => b.length - a.length).join("|");
	return new RegExp(`\\b(?:${alternation})\\b\\s*${CONNECTOR}\\s*(\\d{1,2})\\b`, "gi");
}

const ABILITY_PATTERNS: Record<AbilityKey, RegExp> = {} as Record<AbilityKey, RegExp>;
for (const key of ABILITY_KEYS) ABILITY_PATTERNS[key] = buildAbilityPattern(key);

const SCORE_CONTRACT_ATTEMPT = new RegExp(
	`\\b(?:${ABILITY_KEYS.flatMap((key) => [...ABILITY_ALIASES[key]])
		.sort((a, b) => b.length - a.length)
		.join("|")})\\b\\s*(?:=|:|\\d)`,
	"i",
);

/** True when `text` looks like the scores contract (an ability key plus
 * `=` / `:` / a following digit) — even if {@link parseAbilityScores}
 * later rejects the values. Prose on a class/species/adopt/confirm handle
 * does not match. */
export function looksLikeScoreContract(text: string): boolean {
	return SCORE_CONTRACT_ATTEMPT.test(text);
}

/** One ability's parsed value, or absent when this ability was not
 * mentioned in the utterance at all (or its LAST mentioned number fell
 * outside 8..15 — validated, not clamped, see this module's own header). */
export type ParsedAbilityScores = Partial<Record<AbilityKey, number>>;

/**
 * Extract `{ability: value}` pairs from free text. Returns `null` when NO
 * ability was recognized at all (D-7's "unparseable" case) — a non-null
 * result carries at least one pair (the caller merges the rest from the
 * current draft, see {@link applyParsedScores}).
 */
export function parseAbilityScores(text: string): ParsedAbilityScores | null {
	const result: ParsedAbilityScores = {};
	for (const key of ABILITY_KEYS) {
		// matchAll returns a FRESH iterator per call (no shared lastIndex
		// mutation hazard across keys/calls despite the pattern's own 'g' flag).
		const matches = [...text.matchAll(ABILITY_PATTERNS[key])];
		if (matches.length === 0) continue;
		// "repeated key = last wins" — the LAST occurrence in the utterance,
		// never an earlier one, even if this last one turns out out-of-domain
		// below (no silent fallback to an earlier valid mention).
		const raw = matches[matches.length - 1]?.[1];
		if (raw === undefined) continue;
		const value = Number(raw);
		if (Number.isInteger(value) && value >= POINT_BUY_MIN_SCORE && value <= POINT_BUY_MAX_SCORE) {
			result[key] = value;
		}
	}
	return Object.keys(result).length === 0 ? null : result;
}

/**
 * Merge a (possibly partial) parse onto a base spread — every ability the
 * parse did NOT mention keeps its base (current draft) value. Pure; never
 * reads or writes world state. This is what makes a single-ability
 * utterance like `"con=12"` produce a COMPLETE six-score proposal: the
 * other five simply carry forward unchanged (the contract's own "PARTIAL
 * updates" clause).
 */
export function applyParsedScores<T extends Record<AbilityKey, number>>(
	base: T,
	parsed: ParsedAbilityScores,
): T {
	const merged = { ...base };
	for (const key of ABILITY_KEYS) {
		const value = parsed[key];
		if (value !== undefined) merged[key] = value;
	}
	return merged;
}
