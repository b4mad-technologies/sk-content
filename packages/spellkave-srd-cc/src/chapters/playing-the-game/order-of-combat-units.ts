// The Order of Combat (playing-the-game.md § Combat > The Order of Combat):
// a dense bundle — Combat Step by Step, Initiative (incl. Surprise/Ties),
// Your Turn (incl. Communicating/Interacting with Things/Doing Nothing),
// Ending Combat — folded into ONE open5e record. Ledger row: "The Order of
// Combat" (`ledger/playing-the-game.md`).
//
// SOURCE: `cache/open5e/Rule.json`, pk `srd-2024_combat_the-order-of-combat`.
// "Your Turn"'s own move/action budget and "Interacting with Things" overlap
// this chapter's already-shipped Actions unit (`actions-units.ts`) and
// Movement and Position (`movement-position-units.ts`) — this module owns
// ONLY the sub-rules that are genuinely NEW here: Combat Step by Step and
// Initiative. "Playing on a Grid" is its OWN open5e record despite being
// visually nested inside "Your Turn" — see `playing-on-a-grid-units.ts`.
//
// DELIVERABLE: a mapping VERDICT (SRD step -> substrate mechanism / gap),
// per the operator brief's own framing for this unit, grounded by reading
// `server/src/world_interaction/layer2/r_session_open.rs` and
// `server/src/world_interaction/layer3/session_participant.rs` directly:
//
//   - "Combat Step by Step" (Establish Positions / Roll Initiative / Take
//     Turns) MAPS to `r_session_open`'s own procedure: participant seating +
//     `materialise_tactical_grid` (Establish Positions), `resolve_initiative`
//     for `RolledOrder` schedulers (Roll Initiative), and the `Sequential`
//     turn_rule's `advance_turn_from_world_tick` loop (Take Turns) — three
//     real, already-built mechanisms, not a gap.
//
//   - "Initiative... a Dexterity check" — was a CONFIRMED substrate gap
//     (finding #26, `ledger/findings.md`), since RESOLVED by
//     bucket b9 — the historical grounding below is kept because it explains
//     WHY the fix has the shape it has. The mechanism IS genuinely capable of
//     an AUTHORED roll: `turn_scheduler.order_roll_source` is an arbitrary
//     DSL int-expression, evaluated once per participant through the SAME
//     shared evaluator every other check uses (`resolve_initiative`,
//     `r_session_open.rs`) — the sister's own `srd/turn/initiative` row
//     (`world-fixtures/srd/base/sessions.toml`) already authors
//     `order_roll_source = "d20"`, a bare die. But reading `eval.rs`'s
//     `Op::ReadInt` arm AND the validator directly (not assumed): the facts
//     object `resolve_initiative` evaluates against is
//     `DslEvaluationContext::default()` — literally EMPTY for every
//     participant (no `actor.stat`/`actor.has_capability`/etc. facts are
//     ever populated), and `Op::ReadInt` returns `Err(UnknownField)` on any
//     unmatched subject/field pair rather than a default value. MF-VAL-240
//     (`crates/spellkave-validate/src/action_economy.rs`)'s own test
//     (`rolled_order_order_roll_source_routes_through_shared_dsl`) confirms
//     this is BY DESIGN, not an oversight: it EVALUATES the authored source
//     against empty facts at validation time and REJECTS anything that
//     doesn't succeed — a `d2O` typo is rejected for the same reason a
//     genuine `actor.stat(...)` read would be. Consequence: `order_roll_source`
//     can express dice/arithmetic ONLY — no per-participant Dexterity
//     modifier (or ANY actor state) is reachable from it today. The sister's
//     own bare `"d20"` is therefore not an authoring oversight — it is the
//     BEST then-expressible approximation of "Initiative = a Dexterity
//     check". RESOLVED (b9, finding #26 closed): `resolve_initiative` now
//     populates the ROLLING PARTICIPANT'S OWN facts per evaluation, and
//     MF-VAL-240 family-gates its empty-facts validation so actor-reading
//     sources validate. `initiativeRollExpr` below (composing this chapter's
//     own `abilityModifierExpr`) is WIRED live: the proof scene's
//     `initiative-idiom` turn_scheduler authors it as `order_roll_source`
//     (proof-scene.ts), proven by the order-of-combat live suite's
//     falsifying two-participant construction (low-Dex-spawned-first vs
//     high-Dex-spawned-second).
//
//   - "Ties" (GM/players decide) — a CONFIRMED, INHERENT divergence, not a
//     bug: `rank_initiative` (`r_session_open.rs`) breaks ties
//     DETERMINISTICALLY by ascending `entity_id` (`ADR-0037 D-7`,
//     `COND-11`), never by a mid-resolution GM/player choice — a synchronous
//     reducer has no seam to pause for out-of-band human input mid-roll.
//     This is a NECESSARY implementation divergence (the SRD's own
//     "GM/players decide" step requires a human-in-the-loop moment no
//     reducer call can provide), not a missing feature to fix.
//
//   - "Surprise" (Disadvantage on the surprised combatant's Initiative roll)
//     is Advantage/Disadvantage-shaped — and even setting aside finding #26
//     above, it hits finding #23's own gap from the OTHER side:
//     `order_roll_source` is a bare `Op::Roll`-shaped int expression (no
//     `roll_table(...)` sibling exists for it the way `biasableD20TestExpr`
//     provides for boolean checks), so there is no bias-compatible roll
//     shape to grant Disadvantage through even if the empty-facts gap
//     (finding #26) were fixed. Recorded as an ADDITIONAL note on finding
//     #26 rather than a new #23 consumer (a different roll shape entirely).
//
//   - "Your Turn" (move + one action, Communicating free, Interacting with
//     Things free/second-requires-Utilize, Doing Nothing) — already covered:
//     the move/action budget by "One Thing at a Time"
//     (`ledger/playing-the-game.md`'s action evidence),
//     Interacting with Things by the (unbuilt, deliberately deferred)
//     Exploration > Interacting with Objects row's own budget-class note.
//     "Doing Nothing" is pure narrative permission, no numbers.
//
//   - "Ending Combat" (one side defeated/surrendered/fled, or both sides
//     agree) MATCHES the sister's own `srd/session/combat` `winner_predicate`
//     / `termination_pred` (`sessions.toml`): `participant_tag_group_count(
//     "faction:", "core/condition/incapacitated") == 1` (one faction wholly
//     incapacitated) is exactly "one side... defeated" expressed as an
//     authored session-termination predicate — already built, already
//     authored by the sister, not a gap.
//
// NO NEW MECHANICS beyond `initiativeRollExpr` (a pure arithmetic idiom,
// unconsumed anywhere today, same "ships ready, not forced" posture as this
// chapter's other deferred idioms) — per the operator brief's own framing.
import { ruleByPk } from "../../open5e/rule";
import { DEAD_LOCAL_ID } from "./conditions-units";
import { BUNDLE_ID } from "./constants";
import { abilityModifierExpr } from "./modifier-units";

export const ORDER_OF_COMBAT_RULE_PK = "srd-2024_combat_the-order-of-combat";

/** One parsed procedure step of the § Combat Step by Step numbered list (same shape as making-an-attack-units.ts's own steps, different section). */
export interface CombatStep {
	ordinal: number;
	title: string;
	text: string;
}

/**
 * Parse the three numbered "Combat Step by Step" steps out of the rule's own
 * desc (between the `## Combat Step by Step` and `## Initiative` headers).
 * Throws loudly on any shape surprise.
 */
export function parseCombatSteps(desc: string): CombatStep[] {
	const sectionStart = desc.indexOf("## Combat Step by Step");
	if (sectionStart === -1) {
		throw new Error(
			`order-of-combat-units: '## Combat Step by Step' heading not found in rule '${ORDER_OF_COMBAT_RULE_PK}'.`,
		);
	}
	const sectionEnd = desc.indexOf("##", sectionStart + 1);
	const section =
		sectionEnd === -1 ? desc.slice(sectionStart) : desc.slice(sectionStart, sectionEnd);
	const matches = [...section.matchAll(/^(\d+)\.\s+\*\*([^*]+?)\.\*\*\s*(.+)$/gm)];
	if (matches.length === 0) {
		throw new Error("order-of-combat-units: no numbered Combat Step by Step steps parsed.");
	}
	return matches.map((match) => ({
		ordinal: Number.parseInt(match[1] ?? "", 10),
		title: (match[2] ?? "").trim(),
		text: (match[3] ?? "").trim(),
	}));
}

/** The parsed § Combat Step by Step steps, read from the committed cache. */
export function combatSteps(): CombatStep[] {
	return parseCombatSteps(ruleByPk(ORDER_OF_COMBAT_RULE_PK).desc);
}

/** One parsed "**Label.** text" sub-rule of the § Initiative subsection (Surprise / Initiative Order / Ties). */
export interface InitiativeSubRule {
	label: string;
	text: string;
}

const EXPECTED_INITIATIVE_LABELS = ["Surprise", "Initiative Order", "Ties"] as const;

/**
 * Parse the three "**Label.** text" Initiative sub-rules out of the rule's
 * own desc (between the `## Initiative` and `## Your Turn` headers). Throws
 * loudly on any shape surprise or missing label.
 */
export function parseInitiativeSubRules(desc: string): InitiativeSubRule[] {
	const sectionStart = desc.indexOf("## Initiative");
	if (sectionStart === -1) {
		throw new Error(
			`order-of-combat-units: '## Initiative' heading not found in rule '${ORDER_OF_COMBAT_RULE_PK}'.`,
		);
	}
	const sectionEnd = desc.indexOf("## Your Turn", sectionStart);
	if (sectionEnd === -1) {
		throw new Error(
			"order-of-combat-units: '## Initiative' section has no following '## Your Turn' heading.",
		);
	}
	const section = desc.slice(sectionStart, sectionEnd);
	return EXPECTED_INITIATIVE_LABELS.map((label) => {
		const pattern = new RegExp(`\\*\\*${label}\\.\\*\\*\\s*([^\\n]+)`);
		const match = section.match(pattern);
		if (match === null || match[1] === undefined || match[1].trim().length === 0) {
			throw new Error(
				`order-of-combat-units: no '**${label}.** ...' Initiative sub-rule found in rule '${ORDER_OF_COMBAT_RULE_PK}'.`,
			);
		}
		return { label, text: match[1].trim() };
	});
}

/** The parsed § Initiative sub-rules, read from the committed cache. */
export function initiativeSubRules(): InitiativeSubRule[] {
	return parseInitiativeSubRules(ruleByPk(ORDER_OF_COMBAT_RULE_PK).desc);
}

/**
 * Build the SRD-faithful Initiative roll as a pure INT-valued DSL expression:
 * `d20 + <Dexterity modifier>`. NOT wired into any `order_roll_source` row
 * anywhere in this package (see module header's own finding #26 grounding —
 * today's mechanism validates `order_roll_source` against EMPTY facts, so an
 * `actor.stat(...)`-reading expression would fail MF-VAL-240 outright). Ships
 * ready-to-consume for whichever future mechanism can read per-participant
 * facts into an initiative roll, same deferred-idiom posture as
 * `biasableD20TestExpr`/`baseArmorClassExpr` elsewhere in this chapter.
 */
export function initiativeRollExpr(dexScoreExpr: string): string {
	return `d20 + (${abilityModifierExpr(dexScoreExpr)})`;
}

// WHO TAKES A TURN (sk-jay0.2.40.2, ADR-0143 `authored-turn-eligibility`).
// "Take Turns" hands the turn to every combatant in initiative order, but two
// SRD rules decide which bodies still act in it:
//
//   - Monster Death (cache/markdown/playing-the-game.md:1217): "A monster dies
//     the instant it drops to 0 Hit Points". A dead monster takes no turn.
//   - Death Saving Throws (cache/markdown/playing-the-game.md:1233): "Whenever
//     you start your turn with 0 Hit Points, you must make a Death Saving
//     Throw". A character at 0 HP is Unconscious, not Dead, and still gets its
//     turn, because the death save happens on it. On the third failure the
//     character dies (:1235) and takes no further turn.
//
// So the rule names Dead ONLY. Unconscious, Stable, Paralyzed and every other
// Incapacitated creature stay eligible, because their end-of-turn saves and
// turn-keyed expiries only fire on a turn they actually receive (a skipped
// slot passes owner-keyed expiries only, ADR-0143 D-3).
//
// The rule ships as a zero-parameter Bool DSL macro in the package macro
// catalog (`macro-units.ts` → `macros.toml`) rather than a literal copied into
// each session, so every combat session names ONE rule:
// `turn_eligibility_pred = "macro('srd/takes-turn')"`. A ruleset variant (a
// GM who lets monsters make death saves) is then one macro row, reaching
// running worlds through act-time macro expansion.

/** Zero-parameter Bool macro: may this combatant be handed the turn? */
export const TAKES_TURN_MACRO_ID = `${BUNDLE_ID}/takes-turn`;
/** Everything but Dead takes its turn (Monster Death :1217, Death Saving Throws :1233). */
export const TAKES_TURN_MACRO_BODY_SOURCE = `actor.status('${BUNDLE_ID}/${DEAD_LOCAL_ID}') == false`;
/** The `turn_eligibility_pred` every srd combat session definition carries. */
export const TAKES_TURN_ELIGIBILITY_PRED = `macro('${TAKES_TURN_MACRO_ID}')`;
