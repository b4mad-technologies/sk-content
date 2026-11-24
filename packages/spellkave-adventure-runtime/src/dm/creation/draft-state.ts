// DOC-IMPL: character-creation#how-picks-are-recognised
/**
 * // pattern: draft-then-confirm-wizard
 * // pattern: offer-gate-consume-guard-parity
 *
 * DM Runtime Library — CREATION dialogue (ADR-0096, S4). The draft state +
 * the ACTED-ACTION pick parser.
 *
 * The world IS the parameter channel. A numbered dialog slot or a
 * creation menu handle (confirm, discard, array-adopt, parsed adopt,
 * adopt-name) writes its acted id as `srd/speech` payload `action_id`
 * (`inscribeDialogSlotWrite`) so the spoken `text` stays the optional
 * comment. {@link recognizePick} matches `action_id` first, then text, so
 * older menu-echo rows stay readable. The player's utterance may be
 * anything the PLAYER tool accepts ("Elf.", "I choose Ranger as my
 * class."); it is never the pick discriminator.
 *
 * Utterance TEXT is input ONLY for the parse-to-propose contracts: scores
 * (`key=value`, {@link looksLikeScoreContract}), name (`name=…`), and the
 * optional self-description pair (`appearance=…`, `backstory=…`). A prose
 * utterance on a class/species/background/adopt/confirm/discard handle is
 * not a failed scores contract.
 *
 * Menu-echo utterances (utterance == action id) still classify as picks —
 * the recorded chapters keep that shape and stay green. They are a
 * compatible input, not the protocol.
 *
 * The SAME "own voice" subtlety `../level-up/ceremony-brain.ts` documents applies: the
 * creation-DM's own seat is co-located with itself when it speaks, so it
 * also perceives its own utterances as `speech_heard` events with
 * `inscribed_by` set to ITS OWN entity id. Callers of {@link recognizePick}
 * MUST pre-filter `view.events` to `inscribed_by === candidateEntityId`
 * before calling it; this module does not do that filtering itself.
 */
import { type ClassCreationData, classCreationData, classCreationDataBySlug } from "../data";
import { startingEquipmentChoices } from "../data/starting-equipment.ts";
import { DIALOG_SAY_ACTION_ID, parseDialogChoiceSlot } from "../dialog/ids";
import {
	ABILITY_KEYS,
	ARRAY_ADOPT_ACTION_ID,
	backgroundPickActionId,
	CONFIRM_ACTION_ID,
	CREATION_CLASS_ALLOWLIST,
	CREATION_MENU_TOKEN_GRAMMAR,
	type CreationMenuTokenGrammar,
	classPickActionId,
	DISCARD_ACTION_ID,
	decodeAdoptedText,
	POINT_BUY_MAX_SCORE,
	POINT_BUY_MIN_SCORE,
	STATE_NAME_ACTION_ID,
	STATE_SCORES_ACTION_ID,
	speciesPickActionId,
} from "./ids";
import { backgroundCreationData, speciesCreationData } from "./origins";
import { CREATION_PRESENTATION_VOCABULARY as vocabulary } from "./presentation-vocabulary";

export interface AbilityScores {
	str: number;
	dex: number;
	con: number;
	int: number;
	wis: number;
	cha: number;
}

export interface CreationDraftState {
	/** `null` until a class pick is recognized — mirrors the world-side
	 * `NO_CLASS_DRAFTED` sentinel, carried as a slug string here (the brain's
	 * own belief) rather than an index (the index encoding is a WORLD-side
	 * concern only, see `render.ts`). */
	classSlug: string | null;
	/** `null` until an adopt-name pick is recognized. */
	name: string | null;
	/** `null` until an adopt-appearance pick is recognized (optional). */
	appearance: string | null;
	/** `null` until an adopt-backstory pick is recognized (optional). */
	backstory: string | null;
	/** `null` until a species pick is recognized. */
	speciesSlug: string | null;
	/** `null` until a background pick is recognized. */
	backgroundSlug: string | null;
	scores: AbilityScores;
	confirmed: boolean;
	/** Class skill capability ids chosen so far (`srd/skill/<slug>`). */
	skillIds: readonly string[];
	/** `choice_group` → member entity/capability ids. */
	choicePicks: Readonly<Record<string, readonly string[]>>;
	/** Known cantrip capability ids (`srd/spell/<slug>/cantrip`). */
	cantripIds: readonly string[];
	/** Prepared/known leveled-spell capability ids. */
	preparedSpellIds: readonly string[];
	/** Starting-kit letter (A/B/C…). */
	kitOption: string | null;
	/** Source requirement text -> chosen physical definition. Optional for old drafts. */
	equipmentPicks?: Readonly<Record<string, string>>;
	equipmentPage?: number;
}

export const INITIAL_ABILITY_SCORES: AbilityScores = {
	str: POINT_BUY_MIN_SCORE,
	dex: POINT_BUY_MIN_SCORE,
	con: POINT_BUY_MIN_SCORE,
	int: POINT_BUY_MIN_SCORE,
	wis: POINT_BUY_MIN_SCORE,
	cha: POINT_BUY_MIN_SCORE,
};

export const INITIAL_DRAFT_STATE: CreationDraftState = {
	classSlug: null,
	name: null,
	appearance: null,
	backstory: null,
	speciesSlug: null,
	backgroundSlug: null,
	scores: { ...INITIAL_ABILITY_SCORES },
	confirmed: false,
	skillIds: [],
	choicePicks: {},
	cantripIds: [],
	preparedSpellIds: [],
	kitOption: null,
};

/** One recognized creation-menu pick, parsed from an audible discriminator's
 * `text`. Discriminated union — never a bag of optionals.
 *
 * Creation-Dialogue-v3 (operator ruling, 2026-08-10 —
 * `ledger/designs/dm-advancement-choice-arc.md` § "UX principle"): the
 * per-value `ability-set` pick (Creation-Dialogue-v2's own 48-action menu)
 * is RETIRED — ability scores are a communication CONTRACT now
 * (`STATE_SCORES_ACTION_LOCAL_ID`, `parse-scores.ts`), never a menu pick.
 * The two one-click ADOPTION picks remain the only ways a drafted score
 * spread actually changes: `adopt-array` (feature B, the class's own
 * recommended Standard Array) and `adopt-parsed` (feature C, ADR-0096
 * D-7's parse-to-propose — the SIX scores travel embedded in the fired
 * action's own id, `ids.ts`'s `parsedAdoptActionLocalId`, the SAME
 * "payload lives in the id" convention `class` already uses). */
export type CreationPick =
	| { kind: "class"; slug: string }
	| { kind: "species"; slug: string }
	| { kind: "background"; slug: string }
	| { kind: "skill"; capabilityId: string }
	| { kind: "choice-member"; choiceGroup: string; memberId: string }
	| { kind: "cantrip"; capabilityId: string }
	| { kind: "prepared"; capabilityId: string }
	| { kind: "kit"; letter: string }
	| { kind: "equipment"; requirement: string; entityDefId: string }
	| { kind: "equipment-page"; page: number }
	| { kind: "adopt-array" }
	| { kind: "adopt-parsed"; scores: AbilityScores }
	| { kind: "adopt-name"; name: string }
	| { kind: "adopt-appearance"; text: string }
	| { kind: "adopt-backstory"; text: string }
	| { kind: "confirm" }
	| { kind: "discard" };

/** @deprecated Prefer {@link nextCreationStep} from `./steps` — kept for
 * callers that only need the three identity menus. */
export type WizardListStep = "class" | "species" | "background";

export function wizardListStep(state: CreationDraftState): WizardListStep | null {
	if (state.classSlug === null) return "class";
	if (state.backgroundSlug === null) return "background";
	if (state.speciesSlug === null) return "species";
	return null;
}

/** Class menu offered in the wizard — the seeded catalog filtered by
 * {@link CREATION_CLASS_ALLOWLIST}. */
export function creationClassMenu(): ClassCreationData[] {
	const allowed = new Set<string>(CREATION_CLASS_ALLOWLIST);
	return classCreationData().filter((cls) => allowed.has(cls.slug));
}

/** Identity + name only — full structured gate is
 * {@link creationStructuredDraftsComplete} in `./steps` once a catalog is bound. */
export function creationDraftsComplete(state: CreationDraftState): boolean {
	return (
		!state.confirmed &&
		state.classSlug !== null &&
		state.name !== null &&
		state.speciesSlug !== null &&
		state.backgroundSlug !== null &&
		state.kitOption !== null &&
		state.skillIds.length > 0
	);
}

const CLASS_SLUGS = (): ReadonlySet<string> => new Set(classCreationData().map((c) => c.slug));
const SPECIES_SLUGS = (): ReadonlySet<string> => new Set(speciesCreationData().map((s) => s.slug));
const BACKGROUND_SLUGS = (): ReadonlySet<string> =>
	new Set(backgroundCreationData().map((b) => b.slug));

/**
 * Parse one `SpeechHeardEvent.text` into a {@link CreationPick}, or `null`
 * when `text` is not one of THIS dialogue's own action ids (a stray trace —
 * e.g. `ask-about-advancement` — must not be mistaken for a pick, and
 * neither must a candidate's own GENUINE free text, ADR-0096 D-7 — see
 * {@link classifyCreationUtterance}, the function every caller should
 * actually use). Pure; throws on nothing (an unrecognized or malformed id
 * is honestly `null`, never a crash on an event this dialogue doesn't own).
 */
function optionAtSlot(list: readonly { slug: string }[], slot: number): { slug: string } | null {
	return list[slot - 1] ?? null;
}

/** A deliberately small convenience matcher for a current closed menu. It
 * accepts only an exact, punctuation-insensitive displayed option; it never
 * guesses from a sentence or from a menu that is not currently open. The
 * resulting pick still travels through the same reducer as a clicked action. */
function pickFromSpokenMenuLabel(
	text: string,
	listStep: WizardListStep | WizardSlotBinding | null,
): CreationPick | null {
	if (listStep === null || (typeof listStep === "object" && listStep.kind === "options"))
		return null;
	const step = typeof listStep === "string" ? listStep : listStep.kind;
	const normalized = text
		.trim()
		.toLocaleLowerCase()
		.replace(/[.!?]+$/u, "");
	const options =
		step === "class"
			? creationClassMenu()
			: step === "species"
				? speciesCreationData()
				: backgroundCreationData();
	const option = options.find(
		(candidate) => candidate.displayName.toLocaleLowerCase() === normalized,
	);
	if (option === undefined) return null;
	return step === "class"
		? { kind: "class", slug: option.slug }
		: step === "species"
			? { kind: "species", slug: option.slug }
			: { kind: "background", slug: option.slug };
}

/** Slot binding for the open wizard list — identity menus or a generic
 * option list (skills / choice members / cantrips / kit). */
export type WizardSlotBinding =
	| { kind: WizardListStep }
	| {
			kind: "options";
			picks: readonly CreationPick[];
	  };

export function pickFromWizardSlot(
	slot: number,
	listStep: WizardListStep | WizardSlotBinding | null,
): CreationPick | null {
	if (listStep === null) return null;
	if (typeof listStep === "object" && listStep.kind === "options") {
		return listStep.picks[slot - 1] ?? null;
	}
	const step = typeof listStep === "string" ? listStep : listStep.kind;
	if (step === "class") {
		const option = optionAtSlot(creationClassMenu(), slot);
		return option === null ? null : { kind: "class", slug: option.slug };
	}
	if (step === "species") {
		const option = optionAtSlot(speciesCreationData(), slot);
		return option === null ? null : { kind: "species", slug: option.slug };
	}
	if (step === "background") {
		const option = optionAtSlot(backgroundCreationData(), slot);
		return option === null ? null : { kind: "background", slug: option.slug };
	}
	return null;
}

/** Draft keys a confirm still needs, in the order the DM should name them.
 * Empty means {@link reduceCreationDraft} will commit the confirm. Sole
 * source for BOTH the reducer's guard and the DM's spoken rejection, so the
 * two can never drift into disagreeing about what "ready" means. */
export function missingConfirmKeys(state: CreationDraftState): readonly string[] {
	const missing: string[] = [];
	if (state.classSlug === null) missing.push(vocabulary.missing_phrases.class);
	if (state.speciesSlug === null) missing.push(vocabulary.missing_phrases.species);
	if (state.backgroundSlug === null) missing.push(vocabulary.missing_phrases.background);
	if (state.name === null) missing.push(vocabulary.missing_phrases.name);
	if (state.skillIds.length === 0) missing.push(vocabulary.missing_phrases.skills);
	if (state.kitOption === null) missing.push(vocabulary.missing_phrases.kit);
	if (state.classSlug !== null && state.kitOption !== null) {
		for (const choice of startingEquipmentChoices(state.classSlug, state.kitOption)) {
			if (!state.equipmentPicks?.[choice.sourceText]) missing.push(choice.sourceText);
		}
	}
	return missing;
}

const MENU_CODEC_PATTERNS = {
	"ascii-lowercase-hyphen/v1": "([a-z-]+)",
	"js-dot-plus/v1": "(.+)",
	"base64url-utf8-lossy/v1": "([A-Za-z0-9_-]+)/([A-Za-z0-9_-]+)",
	"ascii-uppercase-one/v1": "([A-Z])",
	"lowercase-hex-utf8-fatal/v1": "([0-9a-f]+)",
} as const;

function matchMenuToken(
	rest: string,
	prefix: string,
	codec: keyof typeof MENU_CODEC_PATTERNS,
): RegExpMatchArray | null {
	// Prefixes are literal data, never executable regular-expression syntax.
	if (!rest.startsWith(prefix)) return null;
	return rest.slice(prefix.length).match(new RegExp(`^${MENU_CODEC_PATTERNS[codec]}$`));
}

export function recognizePick(
	text: string,
	listStep: WizardListStep | WizardSlotBinding | null = null,
	grammar: CreationMenuTokenGrammar = CREATION_MENU_TOKEN_GRAMMAR,
): CreationPick | null {
	const slot = parseDialogChoiceSlot(text);
	if (slot !== null) return pickFromWizardSlot(slot, listStep);
	if (text === CONFIRM_ACTION_ID) return { kind: "confirm" };
	if (text === DISCARD_ACTION_ID) return { kind: "discard" };
	if (text === grammar.array_adopt_token) return { kind: "adopt-array" };
	const normalized = text
		.trim()
		.toLocaleLowerCase()
		.replace(/[.!?]+$/u, "");
	if ((vocabulary.spoken_confirm_aliases as readonly string[]).includes(normalized)) {
		return { kind: "confirm" };
	}
	if ((vocabulary.spoken_discard_aliases as readonly string[]).includes(normalized)) {
		return { kind: "discard" };
	}
	const spokenMenuPick = pickFromSpokenMenuLabel(text, listStep);
	if (spokenMenuPick !== null) return spokenMenuPick;

	const prefix = grammar.namespace_prefix;
	if (!text.startsWith(prefix)) return null;
	const rest = text.slice(prefix.length);

	const classMatch = matchMenuToken(rest, grammar.class_prefix, grammar.codecs.slug);
	if (classMatch !== null) {
		const slug = classMatch[1] as string;
		return CLASS_SLUGS().has(slug) ? { kind: "class", slug } : null;
	}

	const speciesMatch = matchMenuToken(rest, grammar.species_prefix, grammar.codecs.slug);
	if (speciesMatch !== null) {
		const slug = speciesMatch[1] as string;
		return SPECIES_SLUGS().has(slug) ? { kind: "species", slug } : null;
	}

	const backgroundMatch = matchMenuToken(rest, grammar.background_prefix, grammar.codecs.slug);
	if (backgroundMatch !== null) {
		const slug = backgroundMatch[1] as string;
		return BACKGROUND_SLUGS().has(slug) ? { kind: "background", slug } : null;
	}

	const skillMatch = matchMenuToken(rest, grammar.skill_prefix, grammar.codecs.reference);
	if (skillMatch !== null) {
		return { kind: "skill", capabilityId: skillMatch[1] as string };
	}

	// choice/<base64url(group)>/<base64url(member)> — groups contain slashes.
	const choiceMatch = matchMenuToken(rest, grammar.choice_prefix, grammar.codecs.choice);
	if (choiceMatch !== null) {
		return {
			kind: "choice-member",
			choiceGroup: decodeBase64Url(choiceMatch[1] as string),
			memberId: decodeBase64Url(choiceMatch[2] as string),
		};
	}

	const cantripMatch = matchMenuToken(rest, grammar.cantrip_prefix, grammar.codecs.reference);
	if (cantripMatch !== null) {
		return { kind: "cantrip", capabilityId: cantripMatch[1] as string };
	}

	const preparedMatch = matchMenuToken(rest, grammar.prepared_prefix, grammar.codecs.reference);
	if (preparedMatch !== null) {
		return { kind: "prepared", capabilityId: preparedMatch[1] as string };
	}

	const kitMatch = matchMenuToken(rest, grammar.kit_prefix, grammar.codecs.kit);
	if (kitMatch !== null) {
		return { kind: "kit", letter: kitMatch[1] as string };
	}

	const parsedNameMatch = matchMenuToken(
		rest,
		grammar.parsed_name_prefix,
		grammar.codecs.adopted_text,
	);
	if (parsedNameMatch !== null) {
		const name = decodeAdoptedText(parsedNameMatch[1] as string);
		return name === null || name.length === 0 ? null : { kind: "adopt-name", name };
	}

	const parsedAppearanceMatch = matchMenuToken(
		rest,
		grammar.parsed_appearance_prefix,
		grammar.codecs.adopted_text,
	);
	if (parsedAppearanceMatch !== null) {
		const text = decodeAdoptedText(parsedAppearanceMatch[1] as string);
		return text === null || text.length === 0 ? null : { kind: "adopt-appearance", text };
	}

	const parsedBackstoryMatch = matchMenuToken(
		rest,
		grammar.parsed_backstory_prefix,
		grammar.codecs.adopted_text,
	);
	if (parsedBackstoryMatch !== null) {
		const text = decodeAdoptedText(parsedBackstoryMatch[1] as string);
		return text === null || text.length === 0 ? null : { kind: "adopt-backstory", text };
	}

	const parsedMatch = rest.startsWith(grammar.parsed_scores_prefix)
		? rest
				.slice(grammar.parsed_scores_prefix.length)
				.match(
					new RegExp(
						`^${grammar.score_ability_order.map(() => `(\\d{${grammar.score_digits}})`).join("")}$`,
					),
				)
		: null;
	if (parsedMatch !== null) {
		const values = grammar.score_ability_order.map((_, index) => Number(parsedMatch[index + 1]));
		if (values.some((value) => value < POINT_BUY_MIN_SCORE || value > POINT_BUY_MAX_SCORE)) {
			return null;
		}
		const scores = {} as AbilityScores;
		grammar.score_ability_order.forEach((key, index) => {
			scores[key] = values[index] as number;
		});
		return { kind: "adopt-parsed", scores };
	}

	return null;
}

/** `text` is shaped like one of THIS dialogue's own menu action ids
 * (recognized or not — a MALFORMED id, e.g. an out-of-range encoded
 * value, still counts) — the discriminator {@link classifyCreationUtterance}
 * uses to decide "acted menu item" vs. "genuine free text" (ADR-0096 D-7):
 * a malformed id is silently dropped (never mistaken for prose to parse),
 * exactly like `recognizePick`'s own existing null-for-malformed behaviour. */
function looksLikeCreationMenuId(text: string): boolean {
	if (
		text === CONFIRM_ACTION_ID ||
		text === DISCARD_ACTION_ID ||
		text === ARRAY_ADOPT_ACTION_ID ||
		text === DIALOG_SAY_ACTION_ID ||
		text === STATE_SCORES_ACTION_ID ||
		text === STATE_NAME_ACTION_ID
	) {
		return true;
	}
	if (parseDialogChoiceSlot(text) !== null) return true;
	return text.startsWith(CREATION_MENU_TOKEN_GRAMMAR.namespace_prefix);
}

/** One candidate `speech_heard` utterance, classified for `engine.ts`'s own
 * `observe()` (ADR-0096 D-7's echo-vs-free-text split — the ONE thing that
 * decides whether `text` drives a world-changing pick or is handed to
 * `parse-scores.ts` as ADVISORY input only, never both). */
export type CreationUtteranceClass =
	| { kind: "pick"; pick: CreationPick }
	| { kind: "malformed-echo" }
	| { kind: "free-text" };

export function classifyCreationUtterance(
	text: string,
	listStep: WizardListStep | WizardSlotBinding | null = null,
): CreationUtteranceClass {
	const pick = recognizePick(text, listStep);
	if (pick !== null) return { kind: "pick", pick };
	if (looksLikeCreationMenuId(text)) return { kind: "malformed-echo" };
	return { kind: "free-text" };
}

/** Sanity self-check: {@link recognizePick} agrees with the SAME id builders
 * `render.ts` uses to author the rows in the first place — exercised by the
 * offline test, not asserted at import time (no top-level throw). Does NOT
 * enumerate `adopt-parsed` ids (unbounded — one per distinct parse; its own
 * regex shape is exercised directly by the offline parser/engine tests). */
export function allCreationActionIds(): readonly string[] {
	const ids: string[] = [
		CONFIRM_ACTION_ID,
		DISCARD_ACTION_ID,
		ARRAY_ADOPT_ACTION_ID,
		STATE_SCORES_ACTION_ID,
		STATE_NAME_ACTION_ID,
	];
	for (const cls of classCreationData()) ids.push(classPickActionId(cls.slug));
	for (const species of speciesCreationData()) ids.push(speciesPickActionId(species.slug));
	for (const background of backgroundCreationData()) {
		ids.push(backgroundPickActionId(background.slug));
	}
	return ids;
}

/**
 * Pure reducer: apply one recognized pick to a draft state, honoring the
 * SAME server-side gate math the rendered rows enforce (never let the
 * brain's own belief drift ahead of what the world would actually accept —
 * an inc past the ceiling, a pick after confirm, or a dec at the floor is
 * silently ignored here exactly as the rendered gate would silently refuse
 * to materialise the affordance in the first place). Returns the SAME
 * object reference when the pick is a no-op, so callers can cheaply detect
 * "nothing changed" via `===`.
 */
function appendUnique(list: readonly string[], id: string): readonly string[] {
	return list.includes(id) ? list : [...list, id];
}

export function reduceCreationDraft(
	state: CreationDraftState,
	pick: CreationPick,
): CreationDraftState {
	if (state.confirmed) return state; // terminal — every menu action's own gate agrees.

	if (pick.kind === "class") {
		if (state.classSlug === pick.slug) return state;
		// Class change clears class-dependent drafts.
		return {
			...state,
			classSlug: pick.slug,
			skillIds: [],
			choicePicks: {},
			cantripIds: [],
			preparedSpellIds: [],
			kitOption: null,
			equipmentPicks: {},
			equipmentPage: 0,
		};
	}

	if (pick.kind === "species") {
		return state.speciesSlug === pick.slug ? state : { ...state, speciesSlug: pick.slug };
	}

	if (pick.kind === "background") {
		return state.backgroundSlug === pick.slug ? state : { ...state, backgroundSlug: pick.slug };
	}

	if (pick.kind === "skill") {
		const skillIds = appendUnique(state.skillIds, pick.capabilityId);
		return skillIds === state.skillIds ? state : { ...state, skillIds };
	}

	if (pick.kind === "choice-member") {
		const prior = state.choicePicks[pick.choiceGroup] ?? [];
		const next = appendUnique(prior, pick.memberId);
		if (next === prior) return state;
		return {
			...state,
			choicePicks: { ...state.choicePicks, [pick.choiceGroup]: next },
		};
	}

	if (pick.kind === "cantrip") {
		const cantripIds = appendUnique(state.cantripIds, pick.capabilityId);
		return cantripIds === state.cantripIds ? state : { ...state, cantripIds };
	}

	if (pick.kind === "prepared") {
		const preparedSpellIds = appendUnique(state.preparedSpellIds, pick.capabilityId);
		return preparedSpellIds === state.preparedSpellIds ? state : { ...state, preparedSpellIds };
	}

	if (pick.kind === "kit") {
		return state.kitOption === pick.letter
			? state
			: { ...state, kitOption: pick.letter, equipmentPicks: {}, equipmentPage: 0 };
	}
	if (pick.kind === "equipment") {
		return {
			...state,
			equipmentPicks: { ...state.equipmentPicks, [pick.requirement]: pick.entityDefId },
			equipmentPage: 0,
		};
	}
	if (pick.kind === "equipment-page") {
		return Number.isSafeInteger(pick.page) && pick.page >= 0
			? { ...state, equipmentPage: pick.page }
			: state;
	}

	if (pick.kind === "discard") {
		return state.classSlug === null &&
			state.name === null &&
			state.appearance === null &&
			state.backstory === null &&
			state.speciesSlug === null &&
			state.backgroundSlug === null &&
			state.skillIds.length === 0 &&
			state.kitOption === null &&
			scoresEqual(state.scores, INITIAL_ABILITY_SCORES)
			? state
			: { ...INITIAL_DRAFT_STATE };
	}

	if (pick.kind === "confirm") {
		// A confirm that cannot commit returns the draft UNCHANGED — the caller
		// must not read that as success. `missingConfirmKeys` is the same list
		// in the same order, exported so the DM can SAY what is still open
		// instead of leaving the candidate to guess (sk-0m4.120.34: an
		// accepted-but-inert confirm is indistinguishable from a working one).
		if (missingConfirmKeys(state).length > 0) return state;
		return { ...state, confirmed: true };
	}

	if (pick.kind === "adopt-name") {
		return state.name === pick.name ? state : { ...state, name: pick.name };
	}

	if (pick.kind === "adopt-appearance") {
		return state.appearance === pick.text ? state : { ...state, appearance: pick.text };
	}

	if (pick.kind === "adopt-backstory") {
		return state.backstory === pick.text ? state : { ...state, backstory: pick.text };
	}

	if (pick.kind === "adopt-array") {
		if (state.classSlug === null) return state;
		const array = classCreationDataBySlug(state.classSlug).standardArray;
		return scoresEqual(state.scores, array) ? state : { ...state, scores: { ...array } };
	}

	// pick.kind === "adopt-parsed"
	return scoresEqual(state.scores, pick.scores) ? state : { ...state, scores: { ...pick.scores } };
}

function scoresEqual(a: AbilityScores, b: AbilityScores): boolean {
	return ABILITY_KEYS.every((key) => a[key] === b[key]);
}

function decodeBase64Url(value: string): string {
	const padded = value.replace(/-/g, "+").replace(/_/g, "/");
	const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
	return Buffer.from(padded + pad, "base64").toString("utf8");
}

export function encodeBase64Url(value: string): string {
	return Buffer.from(value, "utf8")
		.toString("base64")
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/g, "");
}

/** Stable acted-id helpers for structured picks (tests + optional menu echoes). */
export function skillPickActionId(capabilityId: string): string {
	return `${CREATION_MENU_TOKEN_GRAMMAR.namespace_prefix}${CREATION_MENU_TOKEN_GRAMMAR.skill_prefix}${capabilityId}`;
}

export function choiceMemberPickActionId(choiceGroup: string, memberId: string): string {
	return (
		`${CREATION_MENU_TOKEN_GRAMMAR.namespace_prefix}${CREATION_MENU_TOKEN_GRAMMAR.choice_prefix}` +
		`${encodeBase64Url(choiceGroup)}/${encodeBase64Url(memberId)}`
	);
}

export function cantripPickActionId(capabilityId: string): string {
	return `${CREATION_MENU_TOKEN_GRAMMAR.namespace_prefix}${CREATION_MENU_TOKEN_GRAMMAR.cantrip_prefix}${capabilityId}`;
}

export function preparedPickActionId(capabilityId: string): string {
	return `${CREATION_MENU_TOKEN_GRAMMAR.namespace_prefix}${CREATION_MENU_TOKEN_GRAMMAR.prepared_prefix}${capabilityId}`;
}

export function kitPickActionId(letter: string): string {
	return `${CREATION_MENU_TOKEN_GRAMMAR.namespace_prefix}${CREATION_MENU_TOKEN_GRAMMAR.kit_prefix}${letter}`;
}
