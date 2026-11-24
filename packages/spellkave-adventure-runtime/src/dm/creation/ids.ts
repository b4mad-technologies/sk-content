/**
 * // pattern: draft-then-confirm-wizard
 * // pattern: dialog-choice-slots
 *
 * DM Runtime Library — CREATION dialogue (ADR-0096, S4 —
 * `ledger/designs/dm-runtime-library-arc.md`). Stable id vocabulary for the
 * character-creation wizard's runtime-rendered rows. No `spellkave_define_*`
 * calls live here — this module is pure string/data plumbing, consumed by
 * `render.ts` (the step renderer) and `draft-state.ts` (the pick parser).
 *
 * BUNDLE: every row this slice renders lands in the SAME `dm` bundle
 * `src/author/dm/aldwin.ts`'s `dmAldwin()` already seeds at build time
 * (`../lib/index.ts`'s own module header: "the DM's own runtime bundle
 * namespace ... `src/author/dm/aldwin.ts`'s `BUNDLE`/`dmAldwin()`") —
 * re-imported from `../../author/dm/lib/ids.ts` (the SAME tiny constant
 * Aldwin's own definitions/placement modules import) rather than
 * re-declared, so there is exactly one source of truth for the bundle id.
 */

import { BUNDLE as DM_BUNDLE } from "../../author/dm/lib/ids.ts";
import { DM_NPC_CREATION_TAG } from "../../srd-ids.ts";
import { DIALOG_SAY_ACTION_ID, DIALOG_SAY_CAPABILITY_ID, DIALOG_SAY_LOCAL_ID } from "../dialog/ids";

export { DM_BUNDLE };

/** Wire keys shared by the authored one-field forms and their input reader.
 * Spoken aliases are independent and may be reordered or renamed. */
export const CREATION_INPUT_FIELD_KEYS = {
	name: "name",
	appearance: "appearance",
	backstory: "backstory",
} as const;

/** Classes the creation wizard offers — all 12 SRD base classes
 * (`bead sk-609b.7 (design trail)`). The only non-test place in
 * `src/dm/**` allowed to name class slugs as string literals (grep-invariant
 * in `spellkave-srd-cc/src/test/offline/creation-levelup-all-classes.test.ts`;
 * colocated `*.test.ts` files may name the class they record). */
export const CREATION_CLASS_ALLOWLIST = [
	"barbarian",
	"bard",
	"cleric",
	"druid",
	"fighter",
	"monk",
	"paladin",
	"ranger",
	"rogue",
	"sorcerer",
	"warlock",
	"wizard",
] as const;

/** Entity-carried tag any future creation-hosting DM entity must wear
 * (sk-ntz.7: renamed from the slash-flat `dm-npc/creation`, registered in
 * tag-value-vocabulary.ts) — DEFINITION only; placement (which entity
 * actually carries it, and where) is S5's job, the same "definitions once,
 * placement in the adventure" split `ALDWIN_TAG`/`ALDWIN_NICHE_ID` already
 * establish. */
export const CREATION_STATION_TAG = DM_NPC_CREATION_TAG;

export const CREATION_STATION_NICHE_LOCAL_ID = "niche/creation-station";
export const CREATION_STATION_NICHE_ID = `${DM_BUNDLE}/${CREATION_STATION_NICHE_LOCAL_ID}`;

/** The six abilities, in the SAME fixed order every rendered row iterates
 * them in — order-independence is a determinism hazard (ADR-0096 D-2.2), so
 * every render/reduce function in this directory iterates this array, never
 * `Object.keys(scores)`. */
export const ABILITY_KEYS = ["str", "dex", "con", "int", "wis", "cha"] as const;
export type AbilityKey = (typeof ABILITY_KEYS)[number];

/** Fixed-width decimal transport for legacy parsed-score menu echoes. */
export const PARSED_SCORE_DIGITS = 2;

/** Point-buy domain (matches `../data/derived.ts`'s `pointCost` table —
 * 8..15, `POINT_BUY_BUDGET_ANCHOR`); duplicated here as plain bounds (not a
 * re-derivation of the cost table itself, just the resource min/max these
 * two literals bound) because `../data` exposes the cost FUNCTION, not the
 * domain's own endpoints as named constants. */
export const POINT_BUY_MIN_SCORE = 8;
export const POINT_BUY_MAX_SCORE = 15;

/** Sentinel for "no class drafted yet" on the world-side `draft-class-index`
 * resource (an int; the brain observes the pick from the acted action id
 * inscribed beside the draft write — see `draft-state.ts`). */
export const NO_CLASS_DRAFTED = -1;
/** Same sentinel as class — no species / background drafted yet. */
export const NO_SPECIES_DRAFTED = -1;
export const NO_BACKGROUND_DRAFTED = -1;

// ── Local id stems (full id is `${DM_BUNDLE}/${localId}`) ────────────────
export const CLASS_INDEX_RESOURCE_LOCAL_ID = "creation/draft-class-index";
export const POINTS_SPENT_RESOURCE_LOCAL_ID = "creation/draft-points-spent";
export const CONFIRMED_RESOURCE_LOCAL_ID = "creation/confirmed";
/** 0/1 latch: whether a name has been adopted. Confirm's server gate reads
 * this — names are not an int resource, so the adopt-name action stamps the
 * latch and the author-write upserts `actors.name` / `entities.name`. */
export const NAME_SET_RESOURCE_LOCAL_ID = "creation/draft-name-set";
export const SPECIES_INDEX_RESOURCE_LOCAL_ID = "creation/draft-species-index";
export const BACKGROUND_INDEX_RESOURCE_LOCAL_ID = "creation/draft-background-index";

export function abilityDraftResourceLocalId(key: AbilityKey): string {
	return `creation/draft-${key}`;
}

export const CLASS_INDEX_RESOURCE_ID = `${DM_BUNDLE}/${CLASS_INDEX_RESOURCE_LOCAL_ID}`;
export const POINTS_SPENT_RESOURCE_ID = `${DM_BUNDLE}/${POINTS_SPENT_RESOURCE_LOCAL_ID}`;
export const CONFIRMED_RESOURCE_ID = `${DM_BUNDLE}/${CONFIRMED_RESOURCE_LOCAL_ID}`;
export const NAME_SET_RESOURCE_ID = `${DM_BUNDLE}/${NAME_SET_RESOURCE_LOCAL_ID}`;
export const NO_NAME_SET = 0;
export const SPECIES_INDEX_RESOURCE_ID = `${DM_BUNDLE}/${SPECIES_INDEX_RESOURCE_LOCAL_ID}`;
export const BACKGROUND_INDEX_RESOURCE_ID = `${DM_BUNDLE}/${BACKGROUND_INDEX_RESOURCE_LOCAL_ID}`;

export function speciesPickActionLocalId(slug: string): string {
	return `creation/species/${slug}`;
}

export function backgroundPickActionLocalId(slug: string): string {
	return `creation/background/${slug}`;
}

export function speciesPickActionId(slug: string): string {
	return `${DM_BUNDLE}/${speciesPickActionLocalId(slug)}`;
}

export function backgroundPickActionId(slug: string): string {
	return `${DM_BUNDLE}/${backgroundPickActionLocalId(slug)}`;
}

export function speciesPickCapabilityId(slug: string): string {
	return `${DM_BUNDLE}/action/${speciesPickActionLocalId(slug)}`;
}

export function backgroundPickCapabilityId(slug: string): string {
	return `${DM_BUNDLE}/action/${backgroundPickActionLocalId(slug)}`;
}

export function abilityDraftResourceId(key: AbilityKey): string {
	return `${DM_BUNDLE}/${abilityDraftResourceLocalId(key)}`;
}

// ── Action local ids (full action id is `${DM_BUNDLE}/${localId}`, full
// capability id is `${DM_BUNDLE}/action/${localId}` — `dialogue.ts`'s own
// `buildDialogueAction` pairing). Every menu action inscribes its full
// ACTION id as speech-trace `action_id` (`inscribeDialogSlotWrite`) so the
// brain can recognize the pick without speaking the id. ─────────────
export function classPickActionLocalId(slug: string): string {
	return `creation/class/${slug}`;
}

/**
 * Creation-Dialogue-v3 (operator ruling, 2026-08-10 —
 * `ledger/designs/dm-advancement-choice-arc.md` § "UX principle"): the 48
 * per-value SET-TO-VALUE actions (Creation-Dialogue-v2's own token-hostile
 * menu, one row per ability per point-buy value) are RETIRED — a numeric
 * domain is a communication CONTRACT now, never a per-value menu row. See
 * {@link STATE_SCORES_ACTION_LOCAL_ID} for the replacement.
 */

/**
 * The ONE contract-carrying communicate affordance a candidate fires to
 * SPEAK their ability scores (Creation-Dialogue-v3): its own
 * `action_definitions.description` IS the mini-DSL contract
 * (`render.ts`'s own `stateScoresContractCall`) — never the generic
 * `srd/speak-to`, which stays contract-free (the operator ruling's own
 * "never the generic srd/speak-to" clause). Stable, draft-independent id
 * (mirrors the 12 class-pick actions' own "rendered once" shape, `render.ts`'s
 * own header) — rendered+granted exactly once, in
 * {@link "./render.ts".renderCreationDefinitions}, never re-rendered per step.
 */
/** Collapsed onto {@link DIALOG_SAY_LOCAL_ID} (sk-0m4.52). Kept as an alias
 * so existing contract tests and docs still name the scores grammar. */
export const STATE_SCORES_ACTION_LOCAL_ID = DIALOG_SAY_LOCAL_ID;

/** Collapsed onto the same `say` handle as scores (step decides the contract). */
export const STATE_NAME_ACTION_LOCAL_ID = DIALOG_SAY_LOCAL_ID;

/** The class's own recommended Standard Array, adopted in ONE dispatch
 * (all six drafted scores + points-spent set via literals). Stable id
 * (never encodes the class) — re-rendered every step-update cycle with
 * FRESH literals for the CURRENTLY drafted class (mirrors `confirm`'s own
 * "guarded placeholder" pattern, `render.ts`'s `arrayAdoptCall`). */
export const ARRAY_ADOPT_ACTION_LOCAL_ID = "creation/array/adopt";

/**
 * Parse-to-propose (ADR-0096 D-7): the CANDIDATE speaks free text at the DM,
 * via the {@link STATE_SCORES_ACTION_LOCAL_ID} contract affordance
 * (Creation-Dialogue-v3 — never the generic `srd/speak-to`, which stays
 * contract-free); a deterministic parser (`parse-scores.ts`) extracts
 * key=value pairs; the DM speaks its understanding back, then renders
 * ONE adoption option carrying the parsed values as literals — the ONLY
 * commit path (D-7: "state changes exclusively through the player firing
 * that server-gated menu affordance"). The six parsed values are ENCODED
 * directly in the action's own local id (two zero-padded digits per ability,
 * fixed STR/DEX/CON/INT/WIS/CHA order — {@link ABILITY_KEYS}) rather than
 * held as separate engine-only state the reducer would need to reach back
 * into: every OTHER pick already carries its own payload in its own id
 * (class slug, ability value) — this is the SAME convention, just six
 * digits wide. A DISTINCT proposal therefore always gets its OWN, distinct,
 * permanently-valid action id; an earlier, superseded proposal's id simply
 * stops being RE-RENDERED (`render.ts`'s own `parsedAdoptCall` — no
 * transient-turned-stale gate to get wrong).
 */
export function encodeParsedScores(scores: Record<AbilityKey, number>): string {
	return ABILITY_KEYS.map((key) => String(scores[key]).padStart(PARSED_SCORE_DIGITS, "0")).join("");
}

const PARSED_ADOPT_LOCAL_PREFIX = "creation/parsed/adopt/";

export function parsedAdoptActionLocalId(scores: Record<AbilityKey, number>): string {
	return `${PARSED_ADOPT_LOCAL_PREFIX}${encodeParsedScores(scores)}`;
}

/** Reversible, action-id-safe encoding of a free-text name (utf-8 hex).
 * Mirrors {@link encodeParsedScores}: the adopt-name action carries its
 * payload in its own id so the reducer never reaches back into the engine. */
export const MAX_CREATION_NAME_LENGTH = 64;
/** Optional self-description prose (Public object_state `srd/appearance`). */
export const MAX_CREATION_APPEARANCE_LENGTH = 280;
/** Optional backstory prose (Hidden object_state `srd/backstory`). */
export const MAX_CREATION_BACKSTORY_LENGTH = 512;

/** Hero-owned Text object_state ids written at adopt (not EntityDefinition.description). */
export const APPEARANCE_STATE_ID = "srd/appearance";
export const BACKSTORY_STATE_ID = "srd/backstory";

export function encodeAdoptedName(name: string): string {
	return [...new TextEncoder().encode(name)]
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}

export function decodeAdoptedName(hex: string): string | null {
	if (!/^[0-9a-f]+$/.test(hex) || hex.length % 2 !== 0) return null;
	const bytes = new Uint8Array(hex.length / 2);
	for (let i = 0; i < bytes.length; i++) {
		bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
	}
	try {
		return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
	} catch {
		return null;
	}
}

/** Same hex encoding as {@link encodeAdoptedName} — shared by name/appearance/backstory adopt ids. */
export const encodeAdoptedText = encodeAdoptedName;
export const decodeAdoptedText = decodeAdoptedName;

const PARSED_ADOPT_NAME_LOCAL_PREFIX = "creation/parsed/adopt-name/";
const PARSED_ADOPT_APPEARANCE_LOCAL_PREFIX = "creation/parsed/adopt-appearance/";
const PARSED_ADOPT_BACKSTORY_LOCAL_PREFIX = "creation/parsed/adopt-backstory/";

export function parsedAdoptNameActionLocalId(name: string): string {
	return `${PARSED_ADOPT_NAME_LOCAL_PREFIX}${encodeAdoptedName(name)}`;
}

export function parsedAdoptAppearanceActionLocalId(text: string): string {
	return `${PARSED_ADOPT_APPEARANCE_LOCAL_PREFIX}${encodeAdoptedText(text)}`;
}

export function parsedAdoptBackstoryActionLocalId(text: string): string {
	return `${PARSED_ADOPT_BACKSTORY_LOCAL_PREFIX}${encodeAdoptedText(text)}`;
}

export const CONFIRM_ACTION_LOCAL_ID = "creation/confirm";
export const DISCARD_ACTION_LOCAL_ID = "creation/discard";
/** Reopen the question before the open one, and leave a reopened question as
 * answered. Neither clears a draft field. */
export const BACK_ACTION_LOCAL_ID = "creation/back";
export const FORWARD_ACTION_LOCAL_ID = "creation/forward";
/** World-authored, typed-input affordances. Their field presentation is
 * attached to the affordance template; these ids only preserve the action
 * meaning for the creation seat. */
export const ENTER_NAME_ACTION_LOCAL_ID = "creation/input/name";
export const DESCRIBE_APPEARANCE_ACTION_LOCAL_ID = "creation/input/appearance";
export const DESCRIBE_BACKSTORY_ACTION_LOCAL_ID = "creation/input/backstory";
export const SET_ABILITY_SCORES_ACTION_LOCAL_ID = "creation/input/ability-scores";
/** Stable adoption handles. Their proposal is reconstructed from the
 * candidate's durable speech history; encoding player prose into a new
 * affordance identity made an old handle look live after a host restart. */
export const ADOPT_PROPOSED_SCORES_ACTION_LOCAL_ID = "creation/input/ability-scores/adopt";
export const ADOPT_NAME_ACTION_LOCAL_ID = "creation/input/name/adopt";
export const ADOPT_APPEARANCE_ACTION_LOCAL_ID = "creation/input/appearance/adopt";
export const ADOPT_BACKSTORY_ACTION_LOCAL_ID = "creation/input/backstory/adopt";

/** Aldwin-owned wizard phase (seed-time gates; not a draft). */
export const CREATION_PHASE_LOCAL_ID = "creation/phase";
export const CREATION_PHASE_RESOURCE_ID = `${DM_BUNDLE}/${CREATION_PHASE_LOCAL_ID}`;
export const CREATION_PHASE_IDLE = 0;
export const CREATION_PHASE_CLASS = 1;
export const CREATION_PHASE_SPECIES = 2;
export const CREATION_PHASE_BACKGROUND = 3;
export const CREATION_PHASE_CONTRACTS = 4;
export const CREATION_PHASE_READY = 5;
export const CREATION_PHASE_CONFIRMED = 6;
export const CREATION_PHASE_MAX = CREATION_PHASE_CONFIRMED;

export const CREATION_SET_PHASE_CAPABILITY_LOCAL_ID = "action/creation/set-phase";
export const CREATION_SET_PHASE_CAPABILITY_ID = `${DM_BUNDLE}/${CREATION_SET_PHASE_CAPABILITY_LOCAL_ID}`;

/**
 * ADR-0142 D-1 — one `prompt_definition` per creation phase that is a single
 * closed question with a disjoint response set. Phase 4 (`CONTRACTS`, the
 * free-form Say/Name/Appearance/Backstory/Scores input station) is
 * deliberately NOT here: many of its actions are simultaneously valid across
 * many turns, so bundling them under one occurrence would make D-5's
 * at-most-once consumption reject every response after the first. That gap
 * is ADR-0142 G-5 ("free-text answers... undecided"), not a local
 * authoring choice.
 */
export const PROMPT_CREATION_CLASS_LOCAL_ID = "prompt/creation/class";
export const PROMPT_CREATION_CLASS_ID = `${DM_BUNDLE}/${PROMPT_CREATION_CLASS_LOCAL_ID}`;
export const PROMPT_CREATION_BACKGROUND_LOCAL_ID = "prompt/creation/background";
export const PROMPT_CREATION_BACKGROUND_ID = `${DM_BUNDLE}/${PROMPT_CREATION_BACKGROUND_LOCAL_ID}`;
export const PROMPT_CREATION_SPECIES_LOCAL_ID = "prompt/creation/species";
export const PROMPT_CREATION_SPECIES_ID = `${DM_BUNDLE}/${PROMPT_CREATION_SPECIES_LOCAL_ID}`;
export const PROMPT_CREATION_CONFIRM_LOCAL_ID = "prompt/creation/confirm";
export const PROMPT_CREATION_CONFIRM_ID = `${DM_BUNDLE}/${PROMPT_CREATION_CONFIRM_LOCAL_ID}`;

export function creationPhaseSetLocalId(phase: number): string {
	return `creation/phase/set/${phase}`;
}

export function creationPhaseSetActionId(phase: number): string {
	return `${DM_BUNDLE}/${creationPhaseSetLocalId(phase)}`;
}

export function classPickActionId(slug: string): string {
	return `${DM_BUNDLE}/${classPickActionLocalId(slug)}`;
}

export const STATE_SCORES_ACTION_ID = DIALOG_SAY_ACTION_ID;
export const STATE_NAME_ACTION_ID = DIALOG_SAY_ACTION_ID;

export function parsedAdoptNameActionId(name: string): string {
	return `${DM_BUNDLE}/${parsedAdoptNameActionLocalId(name)}`;
}

export function parsedAdoptAppearanceActionId(text: string): string {
	return `${DM_BUNDLE}/${parsedAdoptAppearanceActionLocalId(text)}`;
}

export function parsedAdoptBackstoryActionId(text: string): string {
	return `${DM_BUNDLE}/${parsedAdoptBackstoryActionLocalId(text)}`;
}

export const ARRAY_ADOPT_ACTION_ID = `${DM_BUNDLE}/${ARRAY_ADOPT_ACTION_LOCAL_ID}`;

export function parsedAdoptActionId(scores: Record<AbilityKey, number>): string {
	return `${DM_BUNDLE}/${parsedAdoptActionLocalId(scores)}`;
}

export const CONFIRM_ACTION_ID = `${DM_BUNDLE}/${CONFIRM_ACTION_LOCAL_ID}`;
export const DISCARD_ACTION_ID = `${DM_BUNDLE}/${DISCARD_ACTION_LOCAL_ID}`;
export const BACK_ACTION_ID = `${DM_BUNDLE}/${BACK_ACTION_LOCAL_ID}`;
export const FORWARD_ACTION_ID = `${DM_BUNDLE}/${FORWARD_ACTION_LOCAL_ID}`;
export const ENTER_NAME_ACTION_ID = `${DM_BUNDLE}/${ENTER_NAME_ACTION_LOCAL_ID}`;
export const DESCRIBE_APPEARANCE_ACTION_ID = `${DM_BUNDLE}/${DESCRIBE_APPEARANCE_ACTION_LOCAL_ID}`;
export const DESCRIBE_BACKSTORY_ACTION_ID = `${DM_BUNDLE}/${DESCRIBE_BACKSTORY_ACTION_LOCAL_ID}`;
export const SET_ABILITY_SCORES_ACTION_ID = `${DM_BUNDLE}/${SET_ABILITY_SCORES_ACTION_LOCAL_ID}`;
export const ADOPT_PROPOSED_SCORES_ACTION_ID = `${DM_BUNDLE}/${ADOPT_PROPOSED_SCORES_ACTION_LOCAL_ID}`;
export const ADOPT_NAME_ACTION_ID = `${DM_BUNDLE}/${ADOPT_NAME_ACTION_LOCAL_ID}`;
export const ADOPT_APPEARANCE_ACTION_ID = `${DM_BUNDLE}/${ADOPT_APPEARANCE_ACTION_LOCAL_ID}`;
export const ADOPT_BACKSTORY_ACTION_ID = `${DM_BUNDLE}/${ADOPT_BACKSTORY_ACTION_LOCAL_ID}`;

// ── Capability local id stems (full capability id is
// `${DM_BUNDLE}/action/${localId}` — `dialogue.ts`'s own `buildDialogueAction`
// pairing, mirrored here so a caller granting these to a candidate never
// re-derives the "action/" stem by hand). ─────────────────────────────────
export function classPickCapabilityId(slug: string): string {
	return `${DM_BUNDLE}/action/${classPickActionLocalId(slug)}`;
}

export const STATE_SCORES_CAPABILITY_ID = DIALOG_SAY_CAPABILITY_ID;
export const STATE_NAME_CAPABILITY_ID = DIALOG_SAY_CAPABILITY_ID;

export function parsedAdoptNameCapabilityId(name: string): string {
	return `${DM_BUNDLE}/action/${parsedAdoptNameActionLocalId(name)}`;
}

export function parsedAdoptAppearanceCapabilityId(text: string): string {
	return `${DM_BUNDLE}/action/${parsedAdoptAppearanceActionLocalId(text)}`;
}

export function parsedAdoptBackstoryCapabilityId(text: string): string {
	return `${DM_BUNDLE}/action/${parsedAdoptBackstoryActionLocalId(text)}`;
}

export const ARRAY_ADOPT_CAPABILITY_ID = `${DM_BUNDLE}/action/${ARRAY_ADOPT_ACTION_LOCAL_ID}`;

export function parsedAdoptCapabilityId(scores: Record<AbilityKey, number>): string {
	return `${DM_BUNDLE}/action/${parsedAdoptActionLocalId(scores)}`;
}

export const CONFIRM_CAPABILITY_ID = `${DM_BUNDLE}/action/${CONFIRM_ACTION_LOCAL_ID}`;
export const DISCARD_CAPABILITY_ID = `${DM_BUNDLE}/action/${DISCARD_ACTION_LOCAL_ID}`;
export const BACK_CAPABILITY_ID = `${DM_BUNDLE}/action/${BACK_ACTION_LOCAL_ID}`;
export const FORWARD_CAPABILITY_ID = `${DM_BUNDLE}/action/${FORWARD_ACTION_LOCAL_ID}`;
export const ENTER_NAME_CAPABILITY_ID = `${DM_BUNDLE}/action/${ENTER_NAME_ACTION_LOCAL_ID}`;
export const DESCRIBE_APPEARANCE_CAPABILITY_ID = `${DM_BUNDLE}/action/${DESCRIBE_APPEARANCE_ACTION_LOCAL_ID}`;
export const DESCRIBE_BACKSTORY_CAPABILITY_ID = `${DM_BUNDLE}/action/${DESCRIBE_BACKSTORY_ACTION_LOCAL_ID}`;
export const SET_ABILITY_SCORES_CAPABILITY_ID = `${DM_BUNDLE}/action/${SET_ABILITY_SCORES_ACTION_LOCAL_ID}`;
export const ADOPT_PROPOSED_SCORES_CAPABILITY_ID = `${DM_BUNDLE}/action/${ADOPT_PROPOSED_SCORES_ACTION_LOCAL_ID}`;
export const ADOPT_NAME_CAPABILITY_ID = `${DM_BUNDLE}/action/${ADOPT_NAME_ACTION_LOCAL_ID}`;
export const ADOPT_APPEARANCE_CAPABILITY_ID = `${DM_BUNDLE}/action/${ADOPT_APPEARANCE_ACTION_LOCAL_ID}`;
export const ADOPT_BACKSTORY_CAPABILITY_ID = `${DM_BUNDLE}/action/${ADOPT_BACKSTORY_ACTION_LOCAL_ID}`;

/**
 * S5 LIVE-FOUND FIX (finding #35 class — lead-directed design, mirrors
 * `dm/aldwin.ts`'s own `apply-level-up` charge-init precedent 1:1, NOT a
 * delta-written `object_state` row — ADR-0094 D-3 / canon condition 3
 * forbid carrying runtime resource state in the delta itself for a
 * PRE-EXISTING live entity; it must arrive through the observable
 * `ModifyResource` seed-and-apply path, ADR-0093's push channel included).
 * `enroll` is a MANIPULATE-class action, DM-actor -> candidate-target
 * (mirrors `apply-level-up`'s own actor/target shape, never `dialogue.ts`'s
 * `buildDialogueAction` — that always adds the communication_speech_act_id
 * upsert, putting the row in the communicate namespace; enroll is
 * mechanical, not dialogue). Fired ONCE per candidate, before the welcome
 * line, by the DM's own brain — see `engine.ts`'s own tree-priority note. */
export const ENROLL_ACTION_LOCAL_ID = "creation/enroll";
export const ENROLL_ACTION_ID = `${DM_BUNDLE}/${ENROLL_ACTION_LOCAL_ID}`;
export const ENROLL_CAPABILITY_ID = `${DM_BUNDLE}/action/${ENROLL_ACTION_LOCAL_ID}`;

/** `creation/<anything>` — the namespace prefix every audible creation pick's
 * discriminator text falls under, relative to the bundle (`draft-state.ts`
 * uses this to ignore any co-perceived `srd/speech` trace that is not one of
 * THIS dialogue's own picks — e.g. a stray `ask-about-advancement` echo). */
export const CREATION_ACTION_LOCAL_PREFIX = "creation/";

/** Observed token syntax shared by the parser and offline duty capture.
 * These strings confer no executable action or dispatch authority. Choice
 * components retain Buffer's permissive base64 and replacement UTF-8 decoding;
 * adopted text retains strict lowercase hex and fatal UTF-8 decoding. */
export const CREATION_MENU_TOKEN_GRAMMAR = Object.freeze({
	namespace_prefix: `${DM_BUNDLE}/${CREATION_ACTION_LOCAL_PREFIX}`,
	array_adopt_token: ARRAY_ADOPT_ACTION_ID,
	class_prefix: classPickActionLocalId("").slice(CREATION_ACTION_LOCAL_PREFIX.length),
	species_prefix: speciesPickActionLocalId("").slice(CREATION_ACTION_LOCAL_PREFIX.length),
	background_prefix: backgroundPickActionLocalId("").slice(CREATION_ACTION_LOCAL_PREFIX.length),
	skill_prefix: "skill/",
	choice_prefix: "choice/",
	cantrip_prefix: "cantrip/",
	prepared_prefix: "prepared/",
	kit_prefix: "kit/",
	parsed_scores_prefix: PARSED_ADOPT_LOCAL_PREFIX.slice(CREATION_ACTION_LOCAL_PREFIX.length),
	parsed_name_prefix: PARSED_ADOPT_NAME_LOCAL_PREFIX.slice(CREATION_ACTION_LOCAL_PREFIX.length),
	parsed_appearance_prefix: PARSED_ADOPT_APPEARANCE_LOCAL_PREFIX.slice(
		CREATION_ACTION_LOCAL_PREFIX.length,
	),
	parsed_backstory_prefix: PARSED_ADOPT_BACKSTORY_LOCAL_PREFIX.slice(
		CREATION_ACTION_LOCAL_PREFIX.length,
	),
	codecs: Object.freeze({
		slug: "ascii-lowercase-hyphen/v1",
		reference: "js-dot-plus/v1",
		choice: "base64url-utf8-lossy/v1",
		kit: "ascii-uppercase-one/v1",
		adopted_text: "lowercase-hex-utf8-fatal/v1",
	} as const),
	score_digits: PARSED_SCORE_DIGITS,
	score_ability_order: Object.freeze([...ABILITY_KEYS]),
} as const);

/** Read-only decoder input; defaults to the frozen source grammar. */
export type CreationMenuTokenGrammar = Readonly<
	Record<
		Exclude<
			keyof typeof CREATION_MENU_TOKEN_GRAMMAR,
			"codecs" | "score_digits" | "score_ability_order"
		>,
		string
	> & {
		codecs: typeof CREATION_MENU_TOKEN_GRAMMAR.codecs;
		score_digits: number;
		score_ability_order: readonly (typeof ABILITY_KEYS)[number][];
	}
>;
