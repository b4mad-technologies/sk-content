/**
 * // pattern: draft-then-confirm-wizard
 * // pattern: directed-speech-anchor
 *
 * DM Runtime Library — CREATION dialogue (ADR-0096 S4; Creation-Dialogue-v2,
 * operator design round 2026-08-09). Fixed authored speech lines,
 * overridable for test determinism/inspection — mirrors `../level-up/speech-lines.ts`'s
 * own `LevelUpSpeechLines`/`DEFAULT_LEVEL_UP_SPEECH_LINES` shape exactly.
 * Rules-vocabulary (chapter-09 precedent, `../../../CLAUDE.md` "Design
 * maxims"): every line says what the menu options DO, never unexplained
 * flavor labels.
 */
import type { AbilityScoreSpread } from "../data/classes";
import { ABILITY_KEYS } from "./ids";
import type { ParsedAbilityScores } from "./parse-scores";
import { CREATION_PRESENTATION_VOCABULARY as vocabulary } from "./presentation-vocabulary";

/** `"STR 15, DEX 14, CON 13, INT 12, WIS 10, CHA 8"` — the ONE formatting
 * helper every score-carrying line below shares, so the read-back and the
 * class-acknowledgement's own array mention never drift apart in shape. */
/** "a class, a species, and a name" — an Oxford list, because the DM is
 * speaking a sentence, not printing an array. */
function formatList(parts: readonly string[]): string {
	if (parts.length === 0) return vocabulary.list.empty;
	if (parts.length === 1) return parts[0] as string;
	if (parts.length === 2) return `${parts[0]}${vocabulary.list.pair_separator}${parts[1]}`;
	return `${parts.slice(0, -1).join(vocabulary.list.separator)}${vocabulary.list.last_separator}${parts[parts.length - 1]}`;
}

function formatSpread(scores: AbilityScoreSpread): string {
	return ABILITY_KEYS.map((key) => `${key.toUpperCase()} ${scores[key]}`).join(", ");
}

/** `"CON 13"` or `"CON 13, STR 15"` — ONLY the abilities the candidate's own
 * utterance actually mentioned (Creation-Dialogue-v3's own "the read-back
 * speaks the understood PATCH" requirement), in the SAME fixed ability
 * order {@link formatSpread} uses, never insertion order (a determinism
 * hazard, ADR-0096 D-2.2). */
function formatPatch(patch: ParsedAbilityScores): string {
	return ABILITY_KEYS.filter((key) => patch[key] !== undefined)
		.map((key) => `${key.toUpperCase()} ${patch[key]}`)
		.join(", ");
}

export interface CreationSpeechLines {
	/** Spoken once, the first cycle the creation station perceives a
	 * candidate at all — how to begin. */
	welcome: string;
	/** Spoken once per DISTINCT drafted class (re-fires if the candidate
	 * changes their class draft) — acknowledges the pick honestly. Nothing
	 * else: the array proposal ({@link classArrayProposal}) and the
	 * ability-drafting paths offer ({@link abilityDraftingPathsOffer}) are
	 * their OWN separate beats (team-lead sharpened requirement, 2026-08-09:
	 * every conversational beat is its own tree leaf, the retired `creation.mdsl`'s own
	 * priority order — never three ideas folded into one spoken line). */
	classAcknowledgement: (className: string) => string;
	/** Spoken once per DISTINCT drafted species — same shape as class. */
	speciesAcknowledgement: (speciesName: string) => string;
	/** Spoken once per DISTINCT drafted background — same shape as class. */
	backgroundAcknowledgement: (backgroundName: string) => string;
	/** Spoken when a confirm is observed but the draft is still incomplete —
	 * names the open keys rather than letting an accepted receipt do nothing. */
	confirmRejection: (missing: readonly string[]) => string;
	/** Spoken once per DISTINCT drafted class, the cycle AFTER
	 * {@link classAcknowledgement} — names the class's own recommended
	 * Standard Array's actual numbers (Creation-Dialogue-v2 feature B: "the
	 * DM speaks the proposal when offering it"). `recommendedArray` is that
	 * class's own Standard Array (`../data`'s `classCreationDataBySlug`), so
	 * the DM genuinely names the numbers it is about to offer, never a vague
	 * "recommended" with no content. */
	classArrayProposal: (className: string, recommendedArray: AbilityScoreSpread) => string;
	/** Spoken once per DISTINCT drafted class, the cycle AFTER
	 * {@link classArrayProposal} — explains the OTHER path this dialogue
	 * supports beyond the recommended array (Creation-Dialogue-v3, the
	 * per-value menu `abilityDraftingPathsOffer` used to also mention is
	 * RETIRED): speak your own scores as a `key=value` contract for the DM
	 * to read back and propose. */
	abilityDraftingPathsOffer: () => string;
	/** Spoken once when a closed list is open on the numbered slots. */
	slotMenuOffer: (kind: string, labels: readonly string[]) => string;
	/** Asked after the class menus when no name is drafted or pending adoption. */
	nameContractOffer: string;
	/** Spoken once per DISTINCT adopted score spread (array-adopt or
	 * parsed-adopt) — reads the six scores back and nudges toward confirm
	 * when the other drafts are ready (sk-0m4.95: silence after array-adopt
	 * left players unsure the pick landed). */
	scoresAdoptAcknowledgement: (scores: AbilityScoreSpread) => string;
	/** Spoken once, when `confirm` is observed to have fired — the ONE
	 * thing this dialogue can honestly report at that point (mirrors
	 * `../level-up/ceremony-brain.ts`'s own acknowledgement-on-observed-transition
	 * discipline: no invented commentary on ability-score specifics, since
	 * nothing in this dialogue's own tools lets it read them back). */
	closing: string;
	/** ADR-0096 D-7 name read-back: the understood name, before adoption. */
	nameReadback: (name: string) => string;
	/** Empty or overlong `name=` utterance. */
	nameUnparseable: () => string;
	/** Optional appearance read-back before adoption. */
	appearanceReadback: (appearance: string) => string;
	/** Empty or overlong `appearance=` utterance. */
	appearanceUnparseable: () => string;
	/** Optional backstory read-back before adoption. */
	backstoryReadback: (backstory: string) => string;
	/** Empty or overlong `backstory=` utterance. */
	backstoryUnparseable: () => string;
	/**
	 * ADR-0096 D-7, spoken once per DISTINCT successful parse (re-fires if a
	 * LATER utterance produces a different proposal): the DM's own honest
	 * understanding of what the candidate just said. Creation-Dialogue-v3
	 * (operator ruling, 2026-08-10): speaks THREE things, in order — the
	 * understood PATCH (`patch`, only the abilities THIS utterance mentioned,
	 * {@link formatPatch}), the RESULTING full six-score spread (`scores`,
	 * the patch merged onto the current draft), and its computed total
	 * point-buy cost (`totalCost`) — D-7's own "the DM speaking its
	 * understanding back aloud (including computed costs)", sharpened to
	 * name the patch explicitly rather than only the merged result. `scores`/
	 * `totalCost` are `../data`'s `totalPointCost(scores)` and
	 * `parse-scores.ts`'s `applyParsedScores`, both computed by the CALLER
	 * (`engine.ts`), never re-derived here.
	 */
	parseReadback: (
		patch: ParsedAbilityScores,
		scores: AbilityScoreSpread,
		totalCost: number,
	) => string;
	/** ADR-0096 D-7's "unparseable" case: no ability/value pair was found in
	 * the candidate's own utterance at all. No option is rendered — this
	 * line is the ENTIRE DM-side reaction. */
	parseUnparseable: () => string;
	/** ADR-0096 D-7's "unaffordable" case: at least one pair parsed, but the
	 * resulting six-score spread (parsed values merged onto the current
	 * draft, unmentioned abilities carried forward) would cost more than
	 * the 27-point budget. No option is rendered — same as unparseable. */
	parseUnaffordable: (scores: AbilityScoreSpread, totalCost: number) => string;
	/** A deterministic reply to untargeted player prose: state the next step,
	 * without claiming this guide implements open-ended conversation. */
	progressGuidance: (missing: readonly string[]) => string;
}

export const DEFAULT_CREATION_SPEECH_LINES: CreationSpeechLines = {
	welcome:
		"Welcome. One question at a time. Which class? Any of the twelve will do. Then species, " +
		"background, your name, optional appearance and backstory, and your " +
		"scores — plus the class menus that follow. Confirm when the drafts are set, or discard " +
		"to start over.",
	classAcknowledgement: (className) => `${className} it is.`,
	speciesAcknowledgement: (speciesName) => `${speciesName} it is.`,
	backgroundAcknowledgement: (backgroundName) => `${backgroundName} it is.`,
	classArrayProposal: (className, recommendedArray) =>
		`For a ${className}, the recommended array is ${formatSpread(recommendedArray)}. ` +
		"Choose Adopt the recommended array, or Set ability scores to make your own.",
	abilityDraftingPathsOffer: () =>
		"Or choose Set ability scores and fill in the six fields - and I'll read them back before you " +
		"commit. Confirm the character when ready, or discard to start over.",
	slotMenuOffer: (kind, labels) =>
		`Which ${kind}? ${labels.map((label, index) => `${index + 1} ${label}`).join(", ")}.`,
	nameContractOffer:
		"Your class choices are set. What shall I call you? Choose Name your character and enter it. " +
		"I'll read it back; choose Adopt that name. " +
		"Then Confirm will open so you can finish and enter the adventure.",
	scoresAdoptAcknowledgement: (scores) =>
		`Adopted: ${formatSpread(scores)}. Confirm opens after class menus (skills, choices, kit), ` +
		"name, species, and background are all drafted — or keep adjusting.",
	closing: "It's done. Welcome to the world.",
	confirmRejection: (missing) =>
		`I can't set that down yet — I still need ${formatList(missing)}. ` +
		"Tell me the rest and confirm again.",
	nameReadback: (name) =>
		`I'll call you ${name}. Adopt that name, or use Name your character to propose another.`,
	nameUnparseable: () =>
		"That name was empty or too long - use Name your character and enter a shorter name.",
	appearanceReadback: (appearance) =>
		`Appearance noted: ${appearance}. Adopt it, or use Describe appearance to propose another.`,
	appearanceUnparseable: () =>
		"That appearance was empty or too long - use Describe appearance and try again.",
	backstoryReadback: (backstory) =>
		`Backstory noted: ${backstory}. Adopt it, or use Describe backstory to propose another.`,
	backstoryUnparseable: () =>
		"That backstory was empty or too long - use Describe backstory and try again.",
	parseReadback: (patch, scores, totalCost) =>
		`Got it: ${formatPatch(patch)} - so ${formatSpread(scores)}, ${totalCost} points of your ` +
		"27. Adopt these, or keep talking to change your mind.",
	parseUnparseable: () =>
		"I didn't catch any ability scores in that - use Set ability scores and fill in one or more fields.",
	parseUnaffordable: (scores, totalCost) =>
		`${formatSpread(scores)} would cost ${totalCost} points - more than your 27-point budget. ` +
		"Try again with lower scores.",
	progressGuidance: (missing) =>
		missing.length === 0
			? "Your draft is ready. Choose Confirm character creation to enter the adventure."
			: `We are still creating your character. Next, finish ${formatList(missing)}. ` +
				"Use the visible creation actions; I will read back a proposal before it is adopted.",
};
