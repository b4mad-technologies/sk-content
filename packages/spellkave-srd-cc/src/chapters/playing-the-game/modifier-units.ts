// DOC-IMPL: derived-values#the-decision-rule
// DOC-IMPL: derived-values#what-feeds-it-pc-level-vs-monster-cr
// DOC-IMPL: derived-values#one-id-two-row-kinds-the-deliberate-alias
// DOC-IMPL: derived-values#rounding-two-tables-opposite-semantics
// Slice 1b (playing-the-game.md § The Six Abilities > Ability Modifiers and
// § Proficiency > Proficiency Bonus): the score->modifier and level/CR->bonus
// lookup units, sourced from `cache/open5e/Rule.json`
// (pk srd-2024_the-six-abilities_ability-modifiers) and
// `cache/markdown/playing-the-game.md` (the Proficiency Bonus HTML table).
// Ledger rows: `ledger/playing-the-game.md` "Ability Modifiers",
// "Proficiency Bonus table".
//
// This module is deliberately the ONE source of the SRD modifier calculation.
// `srd/ability_modifier(score)` serves arbitrary caller-supplied expressions;
// the six zero-argument actor macros read their matching effective score.
// Manifest macro bodies cannot nest, so every emitted body is generated from
// the shared formula below. Expansion retains live fact reads and existing DSL
// operations; no modifier is persisted as derived state.
//
// TWO TABLES, OPPOSITE ROUNDING SEMANTICS (proven exhaustively in
// `src/test/offline/modifier-units.test.ts`):
//
// - Ability modifier = floor((score - 10) / 2). The DSL's `/` is Rust i64
//   division (truncation toward zero), so bare `(score - 10) / 2` is WRONG
//   for odd scores below 10 (score 9: trunc -> 0, table -> -1). The sister's
//   correction idiom appends `+ cond(rem < 0, -1, 0)`; adopted here with the
//   sister named as precedent (consumer: proof scene + later D20 units).
//
// - Proficiency bonus = 2 + (levelOrCr - 1) / 2024-style bands. Here
//   TRUNCATION IS THE CORRECT SEMANTIC and floor would be a bug: the table's
//   "Up to 4" band includes CR 0, and 2 + floor((0 - 1) / 4) = 1 while
//   2 + trunc((0 - 1) / 4) = 2 matches the table. So this builder emits the
//   bare truncating form on purpose — do NOT "fix" it with the correction
//   idiom.
//
// DERIVED-STATE CONTRACT (cross-chapter decision, 2026-07-29):
// The SRD normatively defines Proficiency Bonus by the Level-or-CR TABLE
// (`cache/markdown/playing-the-game.md:429-472`); this formula is its exact
// compact implementation, not a second rule. Character Creation tells a
// player to record level and the resulting PB on a character sheet
// (`cache/markdown/character-creation.md:110,175`), but advancement still
// determines PB from character level (`:653-808`), and multiclassing makes
// the source unambiguously TOTAL character level (`:903-905`). In this
// simulation `srd/level` is therefore the persisted character fact and
// `srd/proficiency_bonus` is a live macro result — never a second mutable
// resource/state row that Character Creation must keep synchronized. A UI
// may display the derived value just as a paper sheet records it. Monsters
// pass Challenge Rating through their own still-unimplemented derivation.
import { readFileSync } from "node:fs";
import path from "node:path";

import { CACHE_MARKDOWN_DIR } from "../../markdown/paths";
import { ruleByPk } from "../../open5e/rule";

export const ABILITY_MODIFIERS_RULE_PK = "srd-2024_the-six-abilities_ability-modifiers";

/** One parsed row of the SRD Ability Modifiers table (inclusive score band). */
export interface ScoreBand {
	minScore: number;
	maxScore: number;
	modifier: number;
}

/** SRD score domain: the modifier table runs exactly from 1 to 30. */
export const MIN_ABILITY_SCORE = 1;
export const MAX_ABILITY_SCORE = 30;

/** Namespaced, manifest-authored macro consumed by every ability-modifier expression. */
export const ABILITY_MODIFIER_MACRO_ID = "srd/ability_modifier";
/** Actor-scoped convenience macro ids, using the SRD's full ability names. */
export const ACTOR_ABILITY_MODIFIER_MACROS = [
	{ id: "srd/strength_modifier", displayName: "Strength", abilityId: "srd/str" },
	{ id: "srd/dexterity_modifier", displayName: "Dexterity", abilityId: "srd/dex" },
	{ id: "srd/constitution_modifier", displayName: "Constitution", abilityId: "srd/con" },
	{ id: "srd/intelligence_modifier", displayName: "Intelligence", abilityId: "srd/int" },
	{ id: "srd/wisdom_modifier", displayName: "Wisdom", abilityId: "srd/wis" },
	{ id: "srd/charisma_modifier", displayName: "Charisma", abilityId: "srd/cha" },
] as const;
export const PROFICIENCY_BONUS_MACRO_ID = "srd/proficiency_bonus";

/**
 * The BAKED, per-entity Proficiency Bonus STAT id (a `resource_definitions`
 * row, seeded per-entity via `entity_definition_initial_state`) — sk-84i.4.
 * Deliberately reuses the SAME literal id as `PROFICIENCY_BONUS_MACRO_ID`
 * above: one SRD concept, two DIFFERENT row kinds (`dsl_macro_definitions`
 * vs `resource_definitions` — separate tables, no substrate id collision).
 *
 * The MACRO computes Proficiency Bonus LIVE from a caller-supplied
 * level/CR-valued DSL expression — useful where a live fact already exists
 * to feed it (e.g. a player character's `srd/level` stat,
 * `equipment-proficiencies-units.ts`'s Tool checks). Creatures carry NO
 * live-queryable Challenge Rating fact (`monsters/creature-units.ts`'s own
 * module header: CR is a documentary `srd.cr.*` TAG only, no
 * `resource_definitions` row — "don't invent uninvited"), so there is
 * nothing to feed the macro for a monster's OWN attacks.
 * `weapon-attack-units.ts`'s generic Melee/Ranged Attack archetype instead
 * reads this STAT directly (`actor.stat('srd/proficiency_bonus')`) — baked
 * ONCE at authoring time, per entity, from that entity's own CR (creatures,
 * `creature-units.ts`) or level (PC-like actors), via the SAME
 * `expectedProficiencyBonus` table lookup the macro's own body encodes
 * (`PROFICIENCY_BONUS_MACRO_BODY_SOURCE` below) — both routes read one
 * source table, so they can never disagree.
 *
 * MISSING-STAT DECISION (ADR-0035 fail-closed, sk-84i.4): an entity_definition
 * that omits this state has NO `object_state` row for it at all. Per
 * ADR-0035/this package's own binding invariant ("fact reads fail closed on
 * unseeded state"), `actor.stat('srd/proficiency_bonus')` on such an entity
 * raises `EvaluationError::UnknownField` (`crates/spellkave-dsl/src/eval.rs`'s
 * `Op::ReadInt` arm) at act-time resolution — the Melee/Ranged Attack action
 * fails LOUDLY (a technical resolution error), never silently defaulting to 0
 * (softer) or skipping the term (harder-than-intended is impossible either,
 * since the whole roll fails to resolve). This is a deliberate choice over an
 * implicit default: a future creature/actor def that forgets to seed this
 * stat is caught by a loud failure, not a quietly wrong to-hit number.
 */
export const PROFICIENCY_BONUS_STATE_ID = PROFICIENCY_BONUS_MACRO_ID;
/** Bare suffix (no `srd/` prefix) — `spellkave_define_resource`'s own `id` param auto-prefixes with the bundle id (`level-units.ts`'s `LEVEL_ID`/`hp-units.ts`'s `HP_ID` idiom); pass THIS, never `PROFICIENCY_BONUS_STATE_ID`, as a `spellkave_define_resource` call's `id`. */
export const PROFICIENCY_BONUS_ID = "proficiency_bonus";
export const PROFICIENCY_BONUS_STATE_DISPLAY_NAME = "Proficiency Bonus";
/** SRD Proficiency Bonus table bounds (`cache/markdown/playing-the-game.md` § Proficiency): "Up to 4" -> +2 (min) .. "29–30" -> +9 (max). */
export const PROFICIENCY_BONUS_STATE_MIN = 2;
export const PROFICIENCY_BONUS_STATE_MAX = 9;

/**
 * `floor((score - 10) / 2)` in the DSL's truncating-division dialect.
 *
 * The macro body is grounded in the SRD table and preserves the sister's
 * negative-remainder correction: bare division is wrong for odd scores below
 * 10. `score` is the typed Int parameter declared by the generated macro row.
 */
export const ABILITY_MODIFIER_MACRO_BODY_SOURCE =
	"((score) - 10) / 2 + cond(((score) - 10) - (((score) - 10) / 2) * 2 < 0, -1, 0)";

/**
 * Substitute a typed score expression into the one canonical modifier body.
 * Manifest macro bodies cannot call another macro (MF-DSL-MACRO-IN-BODY), so
 * the actor convenience macros share this builder instead of nesting
 * `srd/ability_modifier`.
 */
export function abilityModifierBodyFor(scoreExpr: string): string {
	return ABILITY_MODIFIER_MACRO_BODY_SOURCE.replaceAll("score", `(${scoreExpr})`);
}

/** `2 + trunc((level_or_cr - 1) / 4)`, matching the SRD table including CR 0. */
export const PROFICIENCY_BONUS_MACRO_BODY_SOURCE = "2 + ((level_or_cr) - 1) / 4";

// The SRD markdown uses U+2212 MINUS SIGN for negative modifiers and
// U+2013 EN DASH for ranges — normalize both before numeric parsing.
function parseSignedInt(cell: string): number {
	const normalized = cell.trim().replace(/−/g, "-").replace(/^\+/, "");
	if (!/^-?\d+$/.test(normalized)) {
		throw new Error(`modifier-units: cell '${cell}' is not a signed integer.`);
	}
	return Number.parseInt(normalized, 10);
}

/**
 * Parse the Ability Modifiers pipe table out of the cached Rule desc.
 * Throws loudly on any shape surprise — a silent partial parse would let a
 * wrong upstream table masquerade as proof.
 */
export function parseAbilityModifierTable(desc: string): ScoreBand[] {
	const rows = desc
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => /^\|[^|]+\|[^|]+\|$/.test(line))
		// drop the header + |---|---| separator
		.filter((line) => !/^\|\s*Score\s*\|/i.test(line) && !/^\|-+\|-+\|$/.test(line));
	const bands = rows.map((line) => {
		const [scoreCell, modifierCell] = line.slice(1, -1).split("|");
		if (scoreCell === undefined || modifierCell === undefined) {
			throw new Error(`modifier-units: table row '${line}' does not have two cells.`);
		}
		const [rangeMin, rangeMax] = scoreCell.trim().replace(/–/g, "-").split("-");
		if (rangeMin === undefined) {
			throw new Error(`modifier-units: empty score cell in table row '${line}'.`);
		}
		const minScore = parseSignedInt(rangeMin);
		const maxScore = rangeMax === undefined ? minScore : parseSignedInt(rangeMax);
		return { minScore, maxScore, modifier: parseSignedInt(modifierCell) };
	});
	if (bands.length === 0) {
		throw new Error(
			`modifier-units: no table rows parsed out of rule '${ABILITY_MODIFIERS_RULE_PK}'.`,
		);
	}
	return bands;
}

/** The parsed SRD Ability Modifiers table, read from the committed cache. */
export function abilityModifierTable(): ScoreBand[] {
	return parseAbilityModifierTable(ruleByPk(ABILITY_MODIFIERS_RULE_PK).desc);
}

/** Table lookup (throws outside 1..30) — the SRD-authoritative expected value. */
export function expectedAbilityModifier(score: number): number {
	const band = abilityModifierTable().find(
		(candidate) => score >= candidate.minScore && score <= candidate.maxScore,
	);
	if (band === undefined) {
		throw new Error(`modifier-units: score ${score} is outside the SRD table (1..30).`);
	}
	return band.modifier;
}

/**
 * Compatibility helper for callers that formerly requested the inline
 * `floor((<scoreExpr> - 10) / 2)` expression. Runtime consumers now all use
 * the manifest-authored macro, so the formula has one executable definition.
 */
export function abilityModifierExpr(scoreExpr: string): string {
	return abilityModifierMacroCall(scoreExpr);
}

/** Build the manifest-authored macro call used by all runtime modifier consumers. */
export function abilityModifierMacroCall(scoreExpr: string): string {
	const actorAbility = ACTOR_ABILITY_MODIFIER_MACROS.find(
		(candidate) => scoreExpr === `actor.effective('${candidate.abilityId}')`,
	);
	if (actorAbility !== undefined) return `macro('${actorAbility.id}')`;
	return `macro('${ABILITY_MODIFIER_MACRO_ID}', ${scoreExpr})`;
}

/** Call an actor-scoped, zero-argument canonical ability-modifier macro. */
export function actorAbilityModifierMacroCall(
	abilityId: (typeof ACTOR_ABILITY_MODIFIER_MACROS)[number]["abilityId"],
): string {
	const macro = ACTOR_ABILITY_MODIFIER_MACROS.find(
		(candidate) => candidate.abilityId === abilityId,
	);
	if (macro === undefined) {
		throw new Error(`modifier-units: no actor ability-modifier macro for '${abilityId}'.`);
	}
	return `macro('${macro.id}')`;
}

/** Build the manifest-authored macro call used by the generic-check corpus. */
export function proficiencyBonusMacroCall(levelOrCrExpr: string): string {
	return `macro('${PROFICIENCY_BONUS_MACRO_ID}', ${levelOrCrExpr})`;
}

/** One parsed band of the SRD Proficiency Bonus table (inclusive level/CR band). */
export interface ProficiencyBand {
	minLevelOrCr: number;
	maxLevelOrCr: number;
	bonus: number;
}

/** SRD level/CR domain covered by the Proficiency Bonus table (CR 0 counts as "Up to 4"). */
export const MIN_LEVEL_OR_CR = 0;
export const MAX_LEVEL_OR_CR = 30;

/**
 * Parse the Proficiency Bonus HTML table out of the cached chapter markdown
 * (§ Proficiency). The table is 2x4 visual columns (two band/bonus pairs per
 * <tr>); flatten to one band list.
 */
export function parseProficiencyBonusTable(markdown: string): ProficiencyBand[] {
	const sectionStart = markdown.indexOf("**Proficiency Bonus**");
	const tableEnd = markdown.indexOf("</table>", sectionStart);
	if (sectionStart === -1 || tableEnd === -1) {
		throw new Error(
			"modifier-units: Proficiency Bonus <table> not found in cached playing-the-game.md § Proficiency.",
		);
	}
	const cells = [...markdown.slice(sectionStart, tableEnd).matchAll(/<td>([^<]+)<\/td>/g)].map(
		(match) => (match[1] ?? "").trim(),
	);
	if (cells.length === 0 || cells.length % 2 !== 0) {
		throw new Error(
			`modifier-units: Proficiency Bonus table parsed ${cells.length} <td> cells — expected a positive even count (band/bonus pairs).`,
		);
	}
	const bands: ProficiencyBand[] = [];
	for (let index = 0; index < cells.length; index += 2) {
		const rawBandCell = cells[index];
		const rawBonusCell = cells[index + 1];
		if (rawBandCell === undefined || rawBonusCell === undefined) {
			throw new Error("modifier-units: Proficiency Bonus band/bonus pair incomplete.");
		}
		const bandCell = rawBandCell.replace(/–/g, "-");
		const bonus = parseSignedInt(rawBonusCell);
		const upTo = bandCell.match(/^Up to (\d+)$/i);
		if (upTo?.[1] !== undefined) {
			bands.push({ minLevelOrCr: MIN_LEVEL_OR_CR, maxLevelOrCr: parseSignedInt(upTo[1]), bonus });
			continue;
		}
		const [rangeMin, rangeMax] = bandCell.split("-");
		if (rangeMin === undefined || rangeMax === undefined) {
			throw new Error(`modifier-units: unrecognized Proficiency Bonus band '${rawBandCell}'.`);
		}
		bands.push({
			minLevelOrCr: parseSignedInt(rangeMin),
			maxLevelOrCr: parseSignedInt(rangeMax),
			bonus,
		});
	}
	return bands.sort((a, b) => a.minLevelOrCr - b.minLevelOrCr);
}

/** The parsed SRD Proficiency Bonus table, read from the committed cache. */
export function proficiencyBonusTable(): ProficiencyBand[] {
	return parseProficiencyBonusTable(
		readFileSync(path.join(CACHE_MARKDOWN_DIR, "playing-the-game.md"), "utf8"),
	);
}

/** Table lookup (throws outside 0..30) — the SRD-authoritative expected value. */
export function expectedProficiencyBonus(levelOrCr: number): number {
	const band = proficiencyBonusTable().find(
		(candidate) => levelOrCr >= candidate.minLevelOrCr && levelOrCr <= candidate.maxLevelOrCr,
	);
	if (band === undefined) {
		throw new Error(`modifier-units: level/CR ${levelOrCr} is outside the SRD table (0..30).`);
	}
	return band.bonus;
}

/**
 * Evaluate a value the way the DSL engine would: Rust i64 `/` truncates
 * toward zero. Exposed so the offline test can PROVE the emitted expressions
 * reproduce both tables under engine semantics (not under JS semantics).
 */
export function truncDiv(dividend: number, divisor: number): number {
	return Math.trunc(dividend / divisor);
}
