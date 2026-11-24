// Generic, pre-authored check affordances with a target-derived DC ladder.
// Design: `ledger/designs/generic-skill-check-target-dc.md` (sections A + B).
// Ledger row: `ledger/playing-the-game.md`.
//
// SLICE 2 (operator decision, 2026-07-28 — SUPERSEDES this module's own
// slice-1 "scope correction" below): the design draft's literal Proposal A
// ("one affordance row per skill... authored once") now SHIPS FOR REAL —
// `fragments/generic.ts`'s `buildGenericCheckAffordancesFragment` authors the full
// manipulation chain (`capability_definitions`, `action_definitions`,
// `consequence_templates` + `consequence_frame_writes`, `outcome_templates`,
// `affordance_templates`) for all 24 subjects, in the shipped "srd" base
// bundle. What changed the verdict: slice 1's stated blocker ("would require
// the full manipulation pipeline... never authored at the identity-chapter
// level") is a SCOPE decision, not a technical one — `verb-runner.ts`'s new
// `driveUnitScene` (a `driveUnitFragment` sibling: many cross-referencing
// calls in ONE shared workspace, not the one-call-per-workspace isolation
// `driveUnitFragment` needs for independent per-unit rows) authors exactly
// this chain with no new verb-layer capability. `spatial_niche_attachments`
// is DELIBERATELY NOT part of the shipped chain (open question 4's own
// resolution below) — a scene-level concern (which place node hosts the
// verb), not an identity/mechanic one.
//
// CAPABILITY POSTURE, RESOLVED: `srd/check/<slug>` is universal attempt
// eligibility and derives from the stable `srd.creature` identity through
// `creature-identity-units.ts`. It is deliberately separate from
// `srd/skill/<slug>`, which means proficiency and is granted only by an
// authored training/class/background choice.
//
// NICHE_ID, REWORKED (slice 3.1, `ledger/designs/generic-skill-check-
// target-dc.md`'s own "Slice 3" item 1 — `creature-type-units.ts`'s own
// module header carries the full, CORRECTED server grounding): every verb's
// `affordance_templates.niche_id` (authored in `index.ts`) is now
// `CREATURE_NICHE_TAG` ("creature", the SRD umbrella every actor-shaped
// entity presents), not the per-verb `capability:<id>` string this module's
// own history (below) describes. A scene targeting a creature-shaped entity
// (one carrying the `creature` entity_definition_tag) needs exactly ONE
// SHARED `spatial_niche_attachments` row (all 24 verbs share one niche_id)
// for the ACT (and PERCEIVE) path — NOT one per verb (slice 2's shape), and
// NOT zero either (a live-gate failure disproved that first-round claim) —
// see `creature-type-units.ts` for the precise, corrected mechanism.
//
// CONSEQUENCE, RETIRED (slice 3.2, design draft's own "Counter retired in
// favor of the trace" — `ledger/designs/generic-skill-check-target-dc.md`):
// slice 2 originally shipped ONE shared, neutral, observable act-path marker,
// `srd/check_succeeded` — a `resource_definitions` counter every one of the
// 24 verbs' success consequence incremented by `+1` (same shape as the proof
// scene's own long-standing `flexed` counter). Operator finding: this forces
// a fail-closed seed on EVERY possible target (finding #35 tax, O(targets) —
// bit the live gates twice) and merely duplicates what the substrate ALREADY
// records per attempt — `visible_evaluation_provenance` (die faces +
// admit/reject) and `world_event` (outcome). RETIRED: `srd/check_succeeded`
// and its `ModifyResource` frame_write are gone; every one of the 24 verbs'
// success consequence is now a NO-OP (a `consequence_templates` row with ZERO
// `consequence_frame_writes` rows) — grounded against the validator itself:
// `MF-VAL-222` (`crates/spellkave-validate/src/refs.rs`, `checked_non_empty_
// on_success`) requires only that a manipulation-dispatchable action's
// `on_success` names an EXISTING consequence_template_id; its own diagnostic
// text says so explicitly ("author a no-op consequence_template (empty
// frame_writes is valid) or wire an existing one"). This is the simplest
// valid shape — an event-only action still resolves a real predicate on the
// real engine, still emits a `world_event` outcome row, and still records the
// die-face draw in `visible_evaluation_provenance`; there is nothing left for
// a shared counter to add. Proofs now assert on the TRACE (the contested
// check already did this) — see `proof-scene.ts`'s own header note and
// `src/test/live-self-seeding/playing-the-game/proof-scene.test.ts`.
//
// SEED-CONSTRAINT CONSEQUENCE FOR SHIPPED CONTENT (finding #35, below): every
// entity meant to be a legal TARGET of one of these 24 verbs must carry its
// own `srd/dc/<slug>` seed (even at the 0 sentinel) AND, for the five
// Influence-shaped skills, `srd/int` — this chapter ships the verbs
// universally, but does NOT (cannot) ship those per-target seeds itself, since
// they belong to whichever entity_definitions a scene authors. Documented
// loudly in every emitted row's own description, same as slice 1.
//
// SLICE 1'S OWN "SCOPE CORRECTION" (superseded above, kept for the historical
// record): this chapter's established posture for every other D20-family unit
// (`d20TestExpr`, `skillCheckExpr`, `attackRollExpr`, `saveHalvesExpr`) is a
// "row-less mechanic unit" — the chapter ships the IDIOM only, never an
// affordance/action/outcome chain, authored per-scene instead. That posture
// still holds for those OTHER units; this module alone now diverges from it,
// because it is the one unit the design draft always intended to ship as a
// real, DM-usable verb catalog (Proposal A's own "the DM never authors on the
// fly" — a promise slice 1 deferred and slice 2 now keeps).
//
// ─────────────────────────────────────────────────────────────────────────
// OPEN QUESTION 1, RESOLVED (read `crates/spellkave-dsl/src/eval.rs`
// directly, not assumed) — this REWRITES the design draft's own encoding
// assumption, so recorded here in full:
//
// `target.stat('<id>')` / `actor.stat('<id>')` (`Op::ReadInt`, `eval.rs`
// lines 475-492) and `.effective('<id>')` (`Op::ReadEffectiveInt`, lines
// 493-520) FAIL CLOSED with `EvaluationError::UnknownField` when the fact
// was never seeded on that subject — there is NO default-0 fallback, no
// `Option`-shaped read. The draft's own text ("a sentinel default (0 = 'no
// override') encodes the ladder as nested cond IF absent-state reads as 0")
// is therefore WRONG on the "if" clause: absent state does not read as 0,
// it throws. Compounding this: `parse_method_bool` (`crates/spellkave-dsl/
// src/lib.rs` lines 1862-1931) has no int-valued "does this fact exist"
// boolean primitive at all — `has_capability`/`has_item`/`has_niche`/
// `has_tag`/`status`/`state` (bool)/`trace`/`knows_entity` all exist, but
// `stat`/`effective`/`armor` are explicitly REJECTED as bool methods
// (`MF-DSL-INT-FIELD`, "is an int field, not a bool method") — there is no
// `has_stat`/`stat_or(default)` equivalent to probe an int fact's presence
// without unconditionally reading it. And `Op::Cond`'s laziness (`eval.rs`
// lines 666-676, ADR-0045 D-3) only skips the UNTAKEN BRANCH — the GATE
// expression itself is evaluated on EVERY call, so a gate of the shape
// `target.stat('srd/dc/persuasion') > 0` unconditionally requires
// `srd/dc/persuasion` to be seeded on the target, or the WHOLE predicate
// throws, regardless of which tier would otherwise have been selected.
//
// CONSEQUENCE (finding #35, `ledger/findings.md` — genuine
// substrate gap, reachable subset implemented, not silently worked around):
// the sentinel-0 override tier is NOT free/optional the way the design
// draft implied. It requires `srd/dc/<slug>` to be EXPLICITLY seeded
// (sentinel 0 = "no override") on ANY entity meant to be checkable via these
// generic-check affordances — the SAME per-entity seed discipline this
// chapter's own ability scores already require (an unseeded actor/target
// fails `actor.stat('srd/str')` identically; this is not a new class of
// authoring cost, just one more required seed alongside the six ability
// scores). This module ships the ladder AS DESIGNED (the encoding itself is
// sound once the precondition is met) and documents the precondition loudly
// rather than pretending it away; `proof-scene.ts`'s own extension seeds it
// explicitly on its target dummy, per this contract.
// ─────────────────────────────────────────────────────────────────────────
//
// DC-SOURCE LADDER (design § B, most specific wins), encoded as nested
// `cond`/`max` — no new DSL primitive needed (`max(a, b)` and `cond(bool,
// int, int)` are both real grammar, `crates/spellkave-dsl/src/lib.rs` lines
// 2126-2156 and 2380-2397):
//   1. `target.stat('srd/dc/<slug>') > 0` -> that value (explicit override).
//   2. Influence-shaped skills ONLY (the five skills the Influence Checks
//      table names — see below): `max(<static fallback>, target.stat('srd/int'))`
//      — the RAW Intelligence SCORE, not the modifier idiom (verified
//      wording: "a default DC equal to 15 or the monster's Intelligence
//      score, whichever is higher", `cache/markdown/rules-glossary.md:947`).
//   3. Otherwise: the static fallback (Typical Difficulty Classes "Medium",
//      read from the cached table via `ability-checks-units.ts` —
//      `typicalDifficultyClasses()` — never a hand-typed `15`).
//
// INFLUENCE CHECKS TABLE (§ Rules Glossary — a DIFFERENT, not-yet-built
// chapter; read here ONLY for grounding which 5 skills are Influence-shaped,
// same cross-chapter-cache-read precedent the design draft's own Grounding
// section already uses): Charisma (Deception), Charisma (Intimidation),
// Charisma (Performance), Charisma (Persuasion), Wisdom (Animal Handling) —
// `cache/markdown/rules-glossary.md` lines 949-980. `assertInfluenceChecksSource`
// below guards this hardcoded list against a silent fork re-word, same
// verbatim-substring posture `attack-roll-units.ts`'s
// `assertBaseArmorClassFormulaSource` and `level-units.ts`'s
// `assertLevelProvenanceSource` already use (a full HTML-table parse is
// disproportionate for a cross-chapter grounding check, not this module's
// own primary source).
//
// CAPABILITY POSTURE (current): the 24 real verbs each carry a distinct
// `srd/check/<slug>` required capability. `srd.creature` grants all 24 once.
// A skill-governed predicate separately consults `srd/skill/<slug>` to decide
// whether to add proficiency; an unproficient creature still attempts the
// check, just without that bonus. Raw ability checks use the same attempt
// package and have no proficiency capability by default.
//
// STATE SEED DECISION (design's own ask): `srd/dc/<slug>` ships as a
// `resource_definitions` row (NOT `object_state_definitions`) — same
// catalog choice `srd/level`/`srd/str` already made (`level-units.ts`'s own
// module header), for the same reason: a bounded, int-valued, per-entity
// stat with a documented default. `initial_value: 0` records the INTENDED
// sentinel default as declarative metadata (matching every other resource
// row's own `initial_value` field) — but, per the Open Question 1 finding
// above, this does NOT make an unseeded target's read succeed; it only
// documents what "seed this at 0" means when an author DOES seed it. Bounds
// `[0, <max Typical DC>]` — the upper bound is READ from the cached Typical
// Difficulty Classes table (`ability-checks-units.ts`), never hardcoded.
import { readFileSync } from "node:fs";
import path from "node:path";
import { CACHE_MARKDOWN_DIR } from "../../markdown/paths";
import { typicalDifficultyClasses } from "./ability-checks-units";
import { ABILITY_CODES, ABILITY_DISPLAY_NAMES, type AbilityCode } from "./ability-units";
import { type D20TestOptions, d20TestExpr } from "./d20-units";
import { abilityModifierMacroCall, proficiencyBonusMacroCall } from "./modifier-units";

/** Central authoring policy: a positive per-target DC override wins, otherwise use the fallback. */
export const DC_OR_MACRO_ID = "srd/dc_or";
export const DC_OR_MACRO_BODY_SOURCE = "cond(override > 0, override, fallback)";

/** Build the typed DC-override/fallback macro call used by every generic check. */
export function dcOrMacroCall(overrideExpr: string, fallbackExpr: string): string {
	return `macro('${DC_OR_MACRO_ID}', ${overrideExpr}, ${fallbackExpr})`;
}

import { type SkillCheckOptions, skillCheckExpr } from "./skill-proficiency-units";
import { buildSkillUnits } from "./skill-units";

/**
 * The five Influence-shaped skills (§ Rules Glossary, "Influence Checks"
 * table, `cache/markdown/rules-glossary.md:949-980`) — the ONLY skills whose
 * generic-check DC ladder gets a tier-2 derived branch (design § B.2). Slugs
 * match `skill-units.ts`'s own `slugifySkillName` convention exactly
 * ("Animal Handling" -> "animal-handling").
 */
export const INFLUENCE_SKILL_SLUGS = [
	"deception",
	"intimidation",
	"performance",
	"persuasion",
	"animal-handling",
] as const;

const INFLUENCE_CHECKS_TABLE_ROWS = [
	"Charisma (Deception)",
	"Charisma (Intimidation)",
	"Charisma (Performance)",
	"Charisma (Persuasion)",
	"Wisdom (Animal Handling)",
] as const;

/**
 * Confirm the "Influence Checks" table's own row text is still present,
 * verbatim, in the cached rules-glossary markdown — a loud-fail guard
 * against a fork re-sync silently changing which skills are Influence-shaped
 * (same verbatim-substring posture as `attack-roll-units.ts`'s
 * `assertBaseArmorClassFormulaSource`).
 */
export function assertInfluenceChecksSource(): void {
	const markdown = readFileSync(path.join(CACHE_MARKDOWN_DIR, "rules-glossary.md"), "utf8");
	if (!markdown.includes("#### Influence [Action]")) {
		throw new Error(
			"generic-check-units: '#### Influence [Action]' heading not found in cached rules-glossary.md.",
		);
	}
	if (
		!markdown.includes(
			"The GM chooses the check, which has a default DC equal to 15 or the monster's " +
				"Intelligence score, whichever is higher.",
		)
	) {
		throw new Error(
			"generic-check-units: expected Influence-action DC-formula sentence not found in " +
				"cached rules-glossary.md — the section may have been reworded.",
		);
	}
	for (const row of INFLUENCE_CHECKS_TABLE_ROWS) {
		if (!markdown.includes(`<td>${row}</td>`)) {
			throw new Error(
				`generic-check-units: expected Influence Checks table row '${row}' not found in ` +
					"cached rules-glossary.md — the table may have been reworded.",
			);
		}
	}
}

/** One generic-check "subject": either a skill (governed by its table ability) or a raw ability. */
export interface GenericCheckSubject {
	/** Skill slug (e.g. "persuasion") or ability code (e.g. "str") — the DC-override state id's own suffix (`dc/<slug>`). */
	slug: string;
	kind: "skill" | "ability";
	displayName: string;
	/** The governing ability CODE — `scoreExpr`'s caller composes `actor.stat('<bundle>/<code>')` from this. */
	governingAbility: AbilityCode;
	/** `skill/<slug>` bundle-relative capability-id suffix — present iff `kind === "skill"`. */
	skillCapabilitySuffix?: string;
	/** True iff this is one of the five Influence-shaped skills (design § B.2) — always false for raw abilities. */
	isInfluenceShaped: boolean;
}

const EXPECTED_SKILL_COUNT = 18;
const EXPECTED_SUBJECT_COUNT = EXPECTED_SKILL_COUNT + ABILITY_CODES.length;

/** Build all 24 generic-check subjects (18 skills + 6 raw abilities), sorted by slug for deterministic output. */
export function buildGenericCheckSubjects(): GenericCheckSubject[] {
	const skillUnits = buildSkillUnits();
	if (skillUnits.length !== EXPECTED_SKILL_COUNT) {
		throw new Error(
			`generic-check-units: expected ${EXPECTED_SKILL_COUNT} skill units, got ${skillUnits.length}.`,
		);
	}
	const influenceSlugs: readonly string[] = INFLUENCE_SKILL_SLUGS;
	const skillSubjects: GenericCheckSubject[] = skillUnits.map((unit) => ({
		slug: unit.slug,
		kind: "skill",
		displayName: `Check: ${unit.displayName.replace(/^Skill: /, "")}`,
		governingAbility: unit.governingAbility,
		skillCapabilitySuffix: `skill/${unit.slug}`,
		isInfluenceShaped: influenceSlugs.includes(unit.slug),
	}));
	const onlyInInfluenceList = influenceSlugs.filter(
		(slug) => !skillSubjects.some((s) => s.slug === slug),
	);
	if (onlyInInfluenceList.length > 0) {
		throw new Error(
			`generic-check-units: INFLUENCE_SKILL_SLUGS names unknown skill slug(s): [${onlyInInfluenceList.join(", ")}].`,
		);
	}
	const abilitySubjects: GenericCheckSubject[] = ABILITY_CODES.map((code) => ({
		slug: code,
		kind: "ability",
		displayName: `Check: ${ABILITY_DISPLAY_NAMES[code]} (raw ability)`,
		governingAbility: code,
		isInfluenceShaped: false,
	}));
	const subjects = [...skillSubjects, ...abilitySubjects].sort((a, b) =>
		a.slug.localeCompare(b.slug),
	);
	if (subjects.length !== EXPECTED_SUBJECT_COUNT) {
		// Unreachable given the two counts checked above — defensive guard.
		throw new Error(
			`generic-check-units: expected ${EXPECTED_SUBJECT_COUNT} generic-check subjects, got ${subjects.length}.`,
		);
	}
	return subjects;
}

/** Bundle-relative DC override id, collision-free for raw ability resources. */
export function genericCheckDcOverrideSuffix(subject: GenericCheckSubject): string {
	return `dc/${subject.kind === "ability" ? `ability-${subject.slug}` : subject.slug}`;
}

/**
 * The static DC fallback (design § B.3): the Typical Difficulty Classes
 * table's own "Medium" rung, READ from the cache (`ability-checks-units.ts`)
 * — never a hand-typed `15`.
 */
export function staticFallbackDc(): number {
	const rung = typicalDifficultyClasses().find((row) => row.taskDifficulty === "Medium");
	if (rung === undefined) {
		throw new Error(
			"generic-check-units: no 'Medium' rung in the parsed Typical Difficulty Classes table.",
		);
	}
	return rung.dc;
}

/**
 * The highest DC the Typical Difficulty Classes table names ("Nearly
 * impossible") — the DC-override resource's own upper bound, read from the
 * same cache rather than hardcoded.
 */
export function maxTypicalDc(): number {
	const dcs = typicalDifficultyClasses().map((row) => row.dc);
	return Math.max(...dcs);
}

/** The inputs to {@link genericCheckDcExpr} — the DC-source ladder alone, decoupled from the ability-modifier math. */
export interface GenericCheckDcOptions {
	/** Full DSL state id for the target's override resource (e.g. `"srd/dc/persuasion"`). */
	dcOverrideStateId: string;
	/** Design § B.2 — true iff this subject is one of the five Influence-shaped skills. */
	isInfluenceShaped: boolean;
	/** Full DSL state id for the target's Intelligence score (e.g. `"srd/int"`) — read ONLY when `isInfluenceShaped`. */
	targetIntStateId?: string;
}

/**
 * Build the DC-source ladder expression (design § B, most specific wins):
 * `macro('srd/dc_or', target.stat(<override>), <tier2-or-3>)`
 * — see this module's own header for the Open-Question-1 finding this
 * encoding rests on (the override read is a MANDATORY per-target seed
 * precondition, not a free default).
 */
export function genericCheckDcExpr(options: GenericCheckDcOptions): string {
	if (options.isInfluenceShaped && options.targetIntStateId === undefined) {
		throw new Error(
			"generic-check-units: genericCheckDcExpr requires targetIntStateId when isInfluenceShaped is true.",
		);
	}
	const overrideRead = `target.stat('${options.dcOverrideStateId}')`;
	const staticFallback = String(staticFallbackDc());
	const fallbackTier = options.isInfluenceShaped
		? `max(${staticFallback}, target.stat('${options.targetIntStateId}'))`
		: staticFallback;
	return dcOrMacroCall(overrideRead, fallbackTier);
}

/** The composable inputs of one authored generic SKILL check (proficiency-aware, target-derived DC). */
export interface GenericSkillCheckOptions extends GenericCheckDcOptions {
	/** Int-valued DSL subexpression for the governing effective ability SCORE (e.g. `actor.effective('srd/cha')`). */
	scoreExpr: string;
	/** The skill's own identity capability id (`srd/skill/<slug>`) — gates the proficiency-bonus term only. */
	skillCapabilityId: string;
	/** Int-valued DSL subexpression for the actor's level/CR (`actor.stat('srd/level')`). */
	proficiencyLevelExpr: string;
}

/**
 * Build the generic, proficiency-aware skill-check predicate: `skillCheckExpr`
 * with the DC ladder in its `dcExpr` slot — no new modifier math, per this
 * module's own "compose, never retype" contract (`skill-proficiency-units.ts`
 * / `modifier-units.ts`).
 */
export function genericSkillCheckExpr(options: GenericSkillCheckOptions): string {
	const skillOptions: SkillCheckOptions = {
		scoreExpr: options.scoreExpr,
		abilityModifierTerm: abilityModifierMacroCall(options.scoreExpr),
		skillCapabilityId: options.skillCapabilityId,
		proficiencyLevelExpr: options.proficiencyLevelExpr,
		proficiencyBonusTerm: proficiencyBonusMacroCall(options.proficiencyLevelExpr),
		dcExpr: genericCheckDcExpr(options),
	};
	return skillCheckExpr(skillOptions);
}

/** The composable inputs of one authored generic RAW ABILITY check (no proficiency term, target-derived DC). */
export interface GenericAbilityCheckOptions extends GenericCheckDcOptions {
	/** Int-valued DSL subexpression for the effective ability SCORE (e.g. `actor.effective('srd/str')`). */
	scoreExpr: string;
}

/**
 * Build the generic raw-ability-check predicate: `d20TestExpr` with the DC
 * ladder in its `dcExpr` slot — the SRD's own Ability Checks mechanic adds a
 * Proficiency Bonus only "when the GM determines that a skill or tool
 * proficiency is relevant" (`ability-checks-units.ts`'s own cached source),
 * which IS the skill path (`genericSkillCheckExpr`) — a raw ability check
 * composes no proficiency term at all, matching `ability-checks-units.ts`'s
 * own "nothing new to compose" verdict for the plain mechanic.
 */
export function genericAbilityCheckExpr(options: GenericAbilityCheckOptions): string {
	const d20Options: D20TestOptions = {
		scoreExpr: options.scoreExpr,
		abilityModifierTerm: abilityModifierMacroCall(options.scoreExpr),
		dcExpr: genericCheckDcExpr(options),
	};
	return d20TestExpr(d20Options);
}

// ── Slice 2: the shipped verb chain's own shared vocabulary ────────────────
// (module header, "CAPABILITY POSTURE, RESOLVED"). Bundle-relative suffixes
// only — `index.ts` (the only caller that knows `BUNDLE_ID`) qualifies these
// into full ids, same split as `level-units.ts`'s `LEVEL_ID`. The shared
// act-path counter (`CHECK_SUCCEEDED_RESOURCE_ID` et al.) that used to live
// here was RETIRED, slice 3.2 — see module header, "CONSEQUENCE, RETIRED".

/** Bundle-relative capability-id suffix for one generic-check verb (module header, "CAPABILITY POSTURE, RESOLVED"). */
export function genericCheckCapabilitySuffix(subject: GenericCheckSubject): string {
	return `check/${subject.slug}`;
}
