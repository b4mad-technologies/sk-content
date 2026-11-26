// Executable coverage migration, legacy Playing the Game rows 66–91 only.
//
// This file deliberately does not treat the historical ledger's `[x]` marks
// as proof.  A green entry below executes a source parser or an expression
// assertion; every unproven authored/live claim remains an explicit todo.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect } from "vitest";

const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");

import {
	MELEE_REACH_METERS,
	meleeAttacksSubSections,
	mountedCombatSubSections,
	mountedFallingOffSaveExpr,
	rangedAttacksSubSections,
	underwaterCombatSubSections,
	unseenAttackersText,
} from "../../chapters/playing-the-game/combat-misc-units";
import {
	coverTable,
	halfCoverBonus,
	threeQuartersCoverBonus,
} from "../../chapters/playing-the-game/cover-units";
import { creatureSizeTable } from "../../chapters/playing-the-game/creature-size-units";
import {
	assertDamageTypesProvenanceSource,
	assertDeathSaveProvenanceSource,
	assertImmunityProvenanceSource,
	assertKnockingOutProvenanceSource,
	assertResistanceVulnerabilityProvenanceSource,
	assertRestingProvenanceSource,
	damageModifierPipelineExpr,
	deathSaveExpr,
} from "../../chapters/playing-the-game/damage-healing-misc-units";
import {
	criticalDamageRollExpr,
	damageRollExpr,
} from "../../chapters/playing-the-game/damage-units";
import { characterUnconsciousGuardExpr } from "../../chapters/playing-the-game/death-saves-units";
import {
	STAND_UP_ACTION_ID,
	STAND_UP_COST_MS,
} from "../../chapters/playing-the-game/fragments/stand-up";
import { assertHpProvenanceSource, bloodiedExpr } from "../../chapters/playing-the-game/hp-units";
import { attackProcedureSteps } from "../../chapters/playing-the-game/making-an-attack-units";
import { movementSubSections } from "../../chapters/playing-the-game/movement-position-units";
import {
	combatSteps,
	initiativeRollExpr,
	initiativeSubRules,
	TAKES_TURN_ELIGIBILITY_PRED,
	TAKES_TURN_MACRO_BODY_SOURCE,
	TAKES_TURN_MACRO_ID,
} from "../../chapters/playing-the-game/order-of-combat-units";
import {
	GRID_DIFFICULT_TERRAIN_ENTRY_COST_SQUARES,
	GRID_ENTRY_COST_SQUARES,
	GRID_SQUARE_FEET,
	gridSubRules,
} from "../../chapters/playing-the-game/playing-on-a-grid-units";
import { saveHalvesExpr } from "../../chapters/playing-the-game/saving-throw-units";
import {
	travelPaceEffects,
	travelPaceTable,
} from "../../chapters/playing-the-game/travel-pace-units";
import { toppleApplyStatusWrite } from "../../chapters/playing-the-game/weapon-mastery-riders-units";
import { srdEvidence, srdNotApplicable, srdUnencoded } from "../srd-coverage/evidence";

const CHAPTER = "playing-the-game";
const LEGACY = "ledger/archive/playing-the-game-details.md";
const BATTLE = "ledger/archive/findings-details.md";

function todoAll(unit: string, references: readonly string[], claim: string): void {
	srdUnencoded({
		chapter: CHAPTER,
		unit,
		aspect: "source",
		claim: `source proof missing: ${claim}`,
		references,
	});
	srdUnencoded({
		chapter: CHAPTER,
		unit,
		aspect: "mechanic",
		claim: `mechanic proof missing: ${claim}`,
		references,
	});
	srdUnencoded({
		chapter: CHAPTER,
		unit,
		aspect: "fixture",
		claim: `fixture proof missing: ${claim}`,
		references,
	});
	srdUnencoded({
		chapter: CHAPTER,
		unit,
		aspect: "live",
		claim: `live proof missing: ${claim}`,
		references,
	});
}

function todoImplementation(unit: string, references: readonly string[], claim: string): void {
	srdUnencoded({
		chapter: CHAPTER,
		unit,
		aspect: "mechanic",
		claim: `mechanic proof missing: ${claim}`,
		references,
	});
	srdUnencoded({
		chapter: CHAPTER,
		unit,
		aspect: "fixture",
		claim: `fixture proof missing: ${claim}`,
		references,
	});
	srdUnencoded({
		chapter: CHAPTER,
		unit,
		aspect: "live",
		claim: `live proof missing: ${claim}`,
		references,
	});
}

function notApplicable(unit: string, references: readonly string[], reason: string): void {
	for (const aspect of ["mechanic", "fixture", "live"] as const) {
		srdNotApplicable({ chapter: CHAPTER, unit, aspect, reason, references });
	}
}

// ── Exploration ──────────────────────────────────────────────────────────

todoAll(
	"marching-order",
	[LEGACY],
	"party-logistics convention has not been pinned to cached source",
);
todoAll(
	"hazards-pointer-list",
	[LEGACY],
	"Rules Glossary pointer list has not been pinned to cached source",
);

srdEvidence(
	{
		chapter: CHAPTER,
		unit: "travel-pace-distance-table",
		aspect: "source",
		claim: "Fast, Normal, and Slow retain all nine cached SRD travel distances",
		references: [LEGACY],
	},
	() => {
		const rows = travelPaceTable();
		expect(rows.map((row) => row.pace)).toEqual(["Fast", "Normal", "Slow"]);
		expect(rows.flatMap((row) => [row.feetPerMinute, row.milesPerHour, row.milesPerDay])).toEqual([
			400, 4, 30, 300, 3, 24, 200, 2, 18,
		]);
	},
);
notApplicable(
	"travel-pace-distance-table",
	[LEGACY],
	"parsed outside-combat reference distances deliberately have no current pace state, emitted row, or runtime consumer",
);

srdEvidence(
	{
		chapter: CHAPTER,
		unit: "travel-pace-effects",
		aspect: "source",
		claim: "cached source retains every Fast, Normal, and Slow advantage/disadvantage effect",
		references: [LEGACY],
	},
	() => {
		const effects = travelPaceEffects();
		expect(effects.map((effect) => effect.pace)).toEqual(["Fast", "Normal", "Slow"]);
		expect(effects.map((effect) => effect.effectText)).toEqual(
			expect.arrayContaining([
				expect.stringMatching(/Perception or Survival/),
				expect.stringMatching(/Dexterity \(Stealth\)/),
			]),
		);
	},
);
todoImplementation(
	"travel-pace-effects",
	[LEGACY],
	"a current travel-pace state axis is not authored",
);

todoAll(
	"vehicles-pointer",
	[LEGACY],
	"Equipment pointer and waterborne-vessel exception have no source guard",
);

// ── Order of combat ───────────────────────────────────────────────────────

srdEvidence(
	{
		chapter: CHAPTER,
		unit: "combat-step-by-step",
		aspect: "source",
		claim: "cached source retains Establish Positions, Roll Initiative, and Take Turns in order",
		references: [LEGACY],
	},
	() =>
		expect(combatSteps().map((step) => step.title)).toEqual([
			"Establish Positions",
			"Roll Initiative",
			"Take Turns",
		]),
);
// Take Turns (sk-jay0.2.40.2, ADR-0143): who is handed the turn. Monster
// Death (playing-the-game.md:1217) and Death Saving Throws (:1233) decide it;
// the rule names Dead only.
srdEvidence(
	{
		chapter: CHAPTER,
		unit: "combat-step-by-step",
		aspect: "mechanic",
		claim:
			"srd/takes-turn is a zero-parameter Bool macro that skips Dead only, never Unconscious or Incapacitated",
		references: ["ADR-0143 authored-turn-eligibility", "sk-jay0.2.40.2"],
	},
	() => {
		expect(TAKES_TURN_MACRO_ID).toBe("srd/takes-turn");
		expect(TAKES_TURN_MACRO_BODY_SOURCE).toBe("actor.status('srd/condition/dead') == false");
		expect(TAKES_TURN_MACRO_BODY_SOURCE).not.toMatch(/unconscious|incapacitated|stable|paralyzed/);
		expect(TAKES_TURN_ELIGIBILITY_PRED).toBe("macro('srd/takes-turn')");
	},
);
srdEvidence(
	{
		chapter: CHAPTER,
		unit: "combat-step-by-step",
		aspect: "fixture",
		claim: "macros.toml ships srd/takes-turn and every srd combat proof session names it",
		references: ["ADR-0143 authored-turn-eligibility", "sk-jay0.2.40.2"],
	},
	() => {
		const macros = readFileSync(
			join(PKG_ROOT, "fixtures/base/playing-the-game/macros.toml"),
			"utf8",
		);
		expect(macros).toContain('macro_id = "srd/takes-turn"');
		for (const session of ["combat-arena", "initiative"]) {
			const toml = readFileSync(
				join(PKG_ROOT, `fixtures/proofs/playing-the-game-identity/${session}/session.toml`),
				"utf8",
			);
			const rows = toml.split("[[session_definitions]]").slice(1);
			expect(rows.length).toBeGreaterThan(0);
			for (const row of rows) {
				expect(row).toContain(`turn_eligibility_pred = "${TAKES_TURN_ELIGIBILITY_PRED}"`);
			}
		}
	},
);

srdEvidence(
	{
		chapter: CHAPTER,
		unit: "initiative-dexterity",
		aspect: "source",
		claim: "cached source retains the Initiative sub-rule structure",
		references: [LEGACY, "ledger/designs/finding-26-initiative-actor-facts.md"],
	},
	() =>
		expect(initiativeSubRules().map((rule) => rule.label)).toEqual([
			"Surprise",
			"Initiative Order",
			"Ties",
		]),
);
srdEvidence(
	{
		chapter: CHAPTER,
		unit: "initiative-dexterity",
		aspect: "mechanic",
		claim: "initiative expression composes d20 with the Dexterity modifier idiom",
		references: [LEGACY, "ledger/designs/finding-26-initiative-actor-facts.md"],
	},
	() => expect(initiativeRollExpr("actor.stat('srd/dex')")).toContain("d20 +"),
);
srdUnencoded({
	chapter: CHAPTER,
	unit: "initiative-dexterity",
	aspect: "fixture",
	claim: "fixture proof missing: scheduler wiring is not coverage-labelled",
	references: [LEGACY],
});
srdUnencoded({
	chapter: CHAPTER,
	unit: "initiative-dexterity",
	aspect: "live",
	claim: "live proof missing: initiative live test is not coverage-labelled",
	references: [LEGACY, `${BATTLE}#finding-34`],
});

srdEvidence(
	{
		chapter: CHAPTER,
		unit: "initiative-surprise",
		aspect: "source",
		claim: "cached source says Surprise imposes Disadvantage on Initiative",
		references: [LEGACY],
	},
	() =>
		expect(initiativeSubRules().find((rule) => rule.label === "Surprise")?.text).toMatch(
			/Disadvantage/,
		),
);
todoImplementation(
	"initiative-surprise",
	[LEGACY],
	"Surprise Disadvantage is not authored for order_roll_source",
);

srdEvidence(
	{
		chapter: CHAPTER,
		unit: "initiative-ties",
		aspect: "source",
		claim: "cached source delegates tied Initiative ordering to GM and players",
		references: [LEGACY],
	},
	() =>
		expect(initiativeSubRules().find((rule) => rule.label === "Ties")?.text).toMatch(/GM|players/i),
);
todoImplementation(
	"initiative-ties",
	[LEGACY],
	"deterministic entity-id tiebreak divergence has no executable coverage claim",
);

for (const unit of [
	"your-turn-communicating",
	"your-turn-interacting",
	"your-turn-doing-nothing",
]) {
	todoAll(unit, [LEGACY], "procedural permission has no isolated cached-source proof");
}

todoAll("ending-combat", [LEGACY], "winner-predicate mapping has no source-labelled evidence");

// ── Grid and movement ────────────────────────────────────────────────────

const gridSource = (unit: string, title: string, claim: string): void => {
	srdEvidence({ chapter: CHAPTER, unit, aspect: "source", claim, references: [LEGACY] }, () => {
		expect(gridSubRules().find((rule) => rule.label === title)?.text).toBeTruthy();
	});
};
gridSource("grid-squares", "Squares", "cached source retains the five-foot square rule");
srdEvidence(
	{
		chapter: CHAPTER,
		unit: "grid-squares",
		aspect: "mechanic",
		claim: "one grid square is five feet",
		references: [LEGACY],
	},
	() => expect(GRID_SQUARE_FEET).toBe(5),
);
srdUnencoded({
	chapter: CHAPTER,
	unit: "grid-squares",
	aspect: "fixture",
	claim: "fixture proof missing: cell-size fixture is not coverage-labelled",
	references: [LEGACY],
});
srdUnencoded({
	chapter: CHAPTER,
	unit: "grid-squares",
	aspect: "live",
	claim: "live proof missing: five-foot cell semantics are not coverage-labelled",
	references: [LEGACY],
});

gridSource(
	"grid-speed-conversion",
	"Speed",
	"cached source retains Speed divided by five conversion",
);
todoImplementation(
	"grid-speed-conversion",
	[LEGACY],
	"render-time feet-to-cells conversion is not coverage-labelled",
);

gridSource(
	"grid-entering-square",
	"Entering a Square",
	"cached source retains baseline and Difficult Terrain entry costs",
);
srdEvidence(
	{
		chapter: CHAPTER,
		unit: "grid-entering-square",
		aspect: "mechanic",
		claim: "grid constants preserve one-square baseline and two-square difficult terrain cost",
		references: [LEGACY],
	},
	() => {
		expect(GRID_ENTRY_COST_SQUARES).toBe(1);
		expect(GRID_DIFFICULT_TERRAIN_ENTRY_COST_SQUARES).toBe(2);
	},
);
srdUnencoded({
	chapter: CHAPTER,
	unit: "grid-entering-square",
	aspect: "fixture",
	claim: "fixture proof missing: difficult-terrain edge is not coverage-labelled",
	references: [LEGACY],
});
srdUnencoded({
	chapter: CHAPTER,
	unit: "grid-entering-square",
	aspect: "live",
	claim: "live proof missing: difficult-terrain traversal is not coverage-labelled",
	references: [LEGACY],
});

gridSource("grid-corners", "Corners", "cached source retains the no-diagonal-through-corners rule");
todoImplementation(
	"grid-corners",
	[LEGACY, `${BATTLE}#finding-27`],
	"general corner-geometry rule is absent",
);
gridSource("grid-ranges", "Ranges", "cached source retains shortest-route square counting");
todoImplementation("grid-ranges", [LEGACY], "shortest grid-route range rule is not authored");

const movementSource = (unit: string, title: string, claim: string): void => {
	srdEvidence({ chapter: CHAPTER, unit, aspect: "source", claim, references: [LEGACY] }, () => {
		expect(movementSubSections().find((section) => section.heading === title)?.text).toBeTruthy();
	});
};
todoAll(
	"movement-speed-budget",
	[LEGACY, `${BATTLE}#finding-27`],
	"Speed-use wording and cumulative per-turn movement budget lack isolated evidence",
);
movementSource(
	"difficult-terrain",
	"Difficult Terrain",
	"cached source retains the extra-foot cost",
);
todoImplementation(
	"difficult-terrain",
	[LEGACY],
	"engine traversal proof is not coverage-labelled",
);
movementSource(
	"breaking-up-your-move",
	"Breaking Up Your Move",
	"cached source retains the move-action-move example",
);
todoImplementation(
	"breaking-up-your-move",
	[LEGACY],
	"interleaved movement proof is not coverage-labelled",
);
movementSource(
	"dropping-prone",
	"Dropping Prone",
	"cached source retains free no-Speed-cost rule and Speed-zero exception",
);
todoImplementation(
	"dropping-prone",
	[LEGACY, "ledger/designs/prone-free-action.md"],
	"prone action proof is not coverage-labelled",
);
srdEvidence(
	{
		chapter: CHAPTER,
		unit: "prone-restricted-movement",
		aspect: "source",
		claim: "cached source retains the half-Speed (round down) Stand Up cost, Restricted Movement",
		references: [LEGACY, `${BATTLE}#finding-27`, "cache/markdown/rules-glossary.md:1187"],
	},
	() => {
		const text = readFileSync(join(PKG_ROOT, "cache/markdown/rules-glossary.md"), "utf8");
		expect(text).toContain(
			"spend an amount of movement equal to half your Speed (round down) to right yourself",
		);
	},
);
srdEvidence(
	{
		chapter: CHAPTER,
		unit: "prone-restricted-movement",
		aspect: "mechanic",
		claim:
			"srd/movement/stand-up (sk-0m4.123 part 3) spends a fixed half-pool (3000 ms) of " +
			"srd/economy_channel/movement, gated on Prone, removing it; the Topple weapon-mastery " +
			"rider's own Prone write no longer carries expires_at_boundary",
		references: [LEGACY, `${BATTLE}#finding-27`],
	},
	() => {
		expect(STAND_UP_COST_MS).toBe(3000);
		expect(STAND_UP_ACTION_ID).toBe("srd/movement/stand-up");
		expect(toppleApplyStatusWrite()).not.toHaveProperty(["ApplyStatus", "expires_at_boundary"]);
	},
);
srdEvidence(
	{
		chapter: CHAPTER,
		unit: "prone-restricted-movement",
		aspect: "fixture",
		claim:
			"stand-up.toml spends the movement channel and removes Prone; drop-prone.toml no " +
			"longer expires Prone at turn_start",
		references: [LEGACY, `${BATTLE}#finding-27`],
	},
	() => {
		const standUp = readFileSync(
			join(PKG_ROOT, "fixtures/base/playing-the-game/stand-up.toml"),
			"utf8",
		);
		expect(standUp).toContain('spends_channel = "srd/economy_channel/movement"');
		expect(standUp).toContain("cost_time_ms = 3000");
		expect(standUp).toContain("[consequence_frame_writes.frame_write.RemoveCondition]");
		expect(standUp).toContain('condition_definition_id = "srd/condition/prone"');
		const dropProne = readFileSync(
			join(PKG_ROOT, "fixtures/base/playing-the-game/drop-prone.toml"),
			"utf8",
		);
		expect(dropProne).not.toContain("expires_at_boundary");
	},
);
srdUnencoded({
	chapter: CHAPTER,
	unit: "prone-restricted-movement",
	aspect: "live",
	claim: "live proof missing: Stand Up spend + RemoveCondition is not coverage-labelled",
	references: [LEGACY, `${BATTLE}#finding-27`],
});
todoAll(
	"prone-against-target-distance-bias",
	[LEGACY, `${BATTLE}#finding-76`],
	"within-five-feet Advantage and otherwise Disadvantage have no isolated source or predicate proof",
);

srdEvidence(
	{
		chapter: CHAPTER,
		unit: "creature-size-space-table",
		aspect: "source",
		claim: "cached table retains Tiny through Gargantuan footprint values",
		references: [LEGACY],
	},
	() => {
		expect(creatureSizeTable().map((row) => row.size)).toEqual([
			"Tiny",
			"Small",
			"Medium",
			"Large",
			"Huge",
			"Gargantuan",
		]);
	},
);
notApplicable(
	"creature-size-space-table",
	[LEGACY],
	"parsed reference table has no multi-cell footprint consumer or emitted artifact",
);

// ── Attacks ──────────────────────────────────────────────────────────────

srdEvidence(
	{
		chapter: CHAPTER,
		unit: "making-an-attack-procedure",
		aspect: "source",
		claim: "cached source retains choose target, determine modifiers, and resolve attack",
		references: [LEGACY],
	},
	() => {
		expect(attackProcedureSteps().map((step) => step.title)).toEqual([
			"Choose a Target",
			"Determine Modifiers",
			"Resolve the Attack",
		]);
	},
);
todoImplementation(
	"making-an-attack-procedure",
	[LEGACY],
	"end-to-end attack procedure is not coverage-labelled",
);

srdEvidence(
	{
		chapter: CHAPTER,
		unit: "unseen-attackers-targets",
		aspect: "source",
		claim: "cached source retains both unseen advantage and disadvantage directions",
		references: [LEGACY],
	},
	() =>
		expect(unseenAttackersText()).toMatch(
			/Advantage[\s\S]*Disadvantage|Disadvantage[\s\S]*Advantage/,
		),
);
todoImplementation(
	"unseen-attackers-targets",
	[LEGACY],
	"visibility state and predicate are absent",
);

srdEvidence(
	{
		chapter: CHAPTER,
		unit: "cover-ac-modifiers",
		aspect: "source",
		claim: "cached table retains Half and Three-Quarters numeric AC benefits",
		references: [LEGACY],
	},
	() => {
		expect(coverTable().map((degree) => degree.degree)).toEqual([
			"Half",
			"Three Quarters",
			"Total",
		]);
	},
);
srdEvidence(
	{
		chapter: CHAPTER,
		unit: "cover-ac-modifiers",
		aspect: "mechanic",
		claim: "Half and Three-Quarters cover retain +2 and +5 AC bonuses",
		references: [LEGACY, "ledger/designs/equipment-ac-target-fact.md"],
	},
	() => {
		expect(halfCoverBonus()).toBe(2);
		expect(threeQuartersCoverBonus()).toBe(5);
	},
);
srdUnencoded({
	chapter: CHAPTER,
	unit: "cover-ac-modifiers",
	aspect: "fixture",
	claim: "fixture proof missing: cover condition rows are not coverage-labelled",
	references: [LEGACY],
});
srdUnencoded({
	chapter: CHAPTER,
	unit: "cover-ac-modifiers",
	aspect: "live",
	claim: "live proof missing: cover AC recomputation is not coverage-labelled",
	references: [LEGACY, `${BATTLE}#finding-38`],
});

srdEvidence(
	{
		chapter: CHAPTER,
		unit: "total-cover-targetability",
		aspect: "source",
		claim: "cached cover table says Total Cover cannot be targeted directly",
		references: [LEGACY],
	},
	() => expect(coverTable().find((degree) => degree.degree === "Total")?.targetable).toBe(false),
);
todoImplementation("total-cover-targetability", [LEGACY], "targeting eligibility hook is absent");

srdEvidence(
	{
		chapter: CHAPTER,
		unit: "ranged-normal-long-range",
		aspect: "source",
		claim: "cached source retains normal/long range split and long-range Disadvantage",
		references: [LEGACY],
	},
	() =>
		expect(rangedAttacksSubSections().find((section) => section.heading === "Range")?.text).toMatch(
			/normal range[\s\S]*long range/i,
		),
);
todoImplementation(
	"ranged-normal-long-range",
	[LEGACY],
	"second range radius and long-range rule are absent",
);
srdEvidence(
	{
		chapter: CHAPTER,
		unit: "ranged-close-combat-disadvantage",
		aspect: "source",
		claim: "cached source retains within-five-feet close-combat Disadvantage",
		references: [LEGACY],
	},
	() => {
		const text = rangedAttacksSubSections().find(
			(section) => section.heading === "Ranged Attacks in Close Combat",
		)?.text;
		expect(text).toMatch(/Disadvantage/i);
		expect(text).toMatch(/5 feet/i);
	},
);
todoImplementation(
	"ranged-close-combat-disadvantage",
	[LEGACY, `${BATTLE}#finding-64`],
	"spatial seeing/non-Incapacitated predicate is absent",
);

srdEvidence(
	{
		chapter: CHAPTER,
		unit: "melee-reach",
		aspect: "source",
		claim: "cached source retains five-foot melee reach",
		references: [LEGACY],
	},
	() =>
		expect(meleeAttacksSubSections().find((section) => section.heading === "Reach")?.text).toMatch(
			/5 feet/i,
		),
);
srdEvidence(
	{
		chapter: CHAPTER,
		unit: "melee-reach",
		aspect: "mechanic",
		claim: "shipped melee range constant equals five feet in meters",
		references: [LEGACY],
	},
	() => expect(MELEE_REACH_METERS).toBeCloseTo(1.524),
);
srdUnencoded({
	chapter: CHAPTER,
	unit: "melee-reach",
	aspect: "fixture",
	claim: "fixture proof missing: melee range row is not coverage-labelled",
	references: [LEGACY],
});
srdUnencoded({
	chapter: CHAPTER,
	unit: "melee-reach",
	aspect: "live",
	claim: "live proof missing: melee reach is not coverage-labelled",
	references: [LEGACY],
});

srdEvidence(
	{
		chapter: CHAPTER,
		unit: "opportunity-attack",
		aspect: "source",
		claim: "cached source retains leave-reach reaction trigger",
		references: [LEGACY],
	},
	() =>
		expect(
			meleeAttacksSubSections().find((section) => section.heading === "Opportunity Attacks")?.text,
		).toMatch(/Reaction|leave/i),
);
todoImplementation(
	"opportunity-attack",
	[LEGACY],
	"reaction fixture and live proof are not coverage-labelled",
);

srdEvidence(
	{
		chapter: CHAPTER,
		unit: "mounted-combat-source",
		aspect: "source",
		claim: "cached source retains all three mounted-combat subsections",
		references: [LEGACY],
	},
	() =>
		expect(mountedCombatSubSections().map((section) => section.heading)).toEqual([
			"Mounting and Dismounting",
			"Controlling a Mount",
			"Falling Off",
		]),
);
todoImplementation(
	"mounted-combat-source",
	[LEGACY],
	"mount state, control, and fixture/live proof are absent",
);
srdEvidence(
	{
		chapter: CHAPTER,
		unit: "mounted-falling-off-save",
		aspect: "source",
		claim: "cached source retains DC 10 Dexterity save when falling off",
		references: [LEGACY],
	},
	() =>
		expect(
			mountedCombatSubSections().find((section) => section.heading === "Falling Off")?.text,
		).toMatch(/DC 10[\s\S]*Dexterity/i),
);
srdEvidence(
	{
		chapter: CHAPTER,
		unit: "mounted-falling-off-save",
		aspect: "mechanic",
		claim: "falling-off builder composes the DC-10 Dexterity check",
		references: [LEGACY],
	},
	() => expect(mountedFallingOffSaveExpr("actor.stat('srd/dex')")).toContain("10"),
);
srdUnencoded({
	chapter: CHAPTER,
	unit: "mounted-falling-off-save",
	aspect: "fixture",
	claim: "fixture proof missing: no mounted scene exists",
	references: [LEGACY],
});
srdUnencoded({
	chapter: CHAPTER,
	unit: "mounted-falling-off-save",
	aspect: "live",
	claim: "live proof missing: no mounted scene exists",
	references: [LEGACY],
});

srdEvidence(
	{
		chapter: CHAPTER,
		unit: "underwater-impeded-weapons",
		aspect: "source",
		claim: "cached source retains weapon impairment and Fire Resistance cross-reference",
		references: [LEGACY],
	},
	() =>
		expect(underwaterCombatSubSections().map((section) => section.heading)).toEqual([
			"Impeded Weapons",
			"Fire Resistance",
		]),
);
todoImplementation(
	"underwater-impeded-weapons",
	[LEGACY],
	"Swim Speed, range, and damage-type predicates are absent",
);
srdEvidence(
	{
		chapter: CHAPTER,
		unit: "underwater-fire-resistance-pointer",
		aspect: "source",
		claim: "cached source delegates underwater Fire Resistance to Damage and Healing",
		references: [LEGACY],
	},
	() =>
		expect(
			underwaterCombatSubSections().find((section) => section.heading === "Fire Resistance")?.text,
		).toMatch(/Damage and Healing/i),
);
notApplicable(
	"underwater-fire-resistance-pointer",
	[LEGACY],
	"this subrule is only a cross-reference; Resistance and Vulnerability owns the numeric mechanic",
);

// ── Damage and healing ───────────────────────────────────────────────────

srdEvidence(
	{
		chapter: CHAPTER,
		unit: "hit-point-resource",
		aspect: "source",
		claim: "cached source retains Hit Points provenance sentences",
		references: [LEGACY],
	},
	() => expect(() => assertHpProvenanceSource()).not.toThrow(),
);
srdNotApplicable({
	chapter: CHAPTER,
	unit: "hit-point-resource",
	aspect: "mechanic",
	reason: "resource identity has no chapter-owned arithmetic beyond generic resource semantics",
	references: [LEGACY],
});
srdUnencoded({
	chapter: CHAPTER,
	unit: "hit-point-resource",
	aspect: "fixture",
	claim: "fixture proof missing: srd/hp row is not coverage-labelled",
	references: [LEGACY],
});
srdUnencoded({
	chapter: CHAPTER,
	unit: "hit-point-resource",
	aspect: "live",
	claim: "live proof missing: srd/hp mutation is not coverage-labelled",
	references: [LEGACY],
});

srdEvidence(
	{
		chapter: CHAPTER,
		unit: "bloodied-threshold",
		aspect: "source",
		claim: "cached source retains Bloodied half-or-fewer threshold",
		references: [LEGACY],
	},
	() => expect(() => assertHpProvenanceSource()).not.toThrow(),
);
srdEvidence(
	{
		chapter: CHAPTER,
		unit: "bloodied-threshold",
		aspect: "mechanic",
		claim: "bloodied expression uses integer half threshold",
		references: [LEGACY],
	},
	() =>
		expect(bloodiedExpr("actor.stat('srd/hp')", "15")).toBe("(actor.stat('srd/hp')) <= (15) / 2"),
);
srdNotApplicable({
	chapter: CHAPTER,
	unit: "bloodied-threshold",
	aspect: "fixture",
	reason: "reusable expression has no per-creature maximum-state fixture consumer",
	references: [LEGACY],
});
srdNotApplicable({
	chapter: CHAPTER,
	unit: "bloodied-threshold",
	aspect: "live",
	reason: "reusable expression has no per-creature maximum-state runtime consumer",
	references: [LEGACY],
});

srdEvidence(
	{
		chapter: CHAPTER,
		unit: "resting-pointer",
		aspect: "source",
		claim: "cached source delegates Short and Long Rest rules to Rules Glossary",
		references: [LEGACY],
	},
	() => expect(() => assertRestingProvenanceSource()).not.toThrow(),
);
notApplicable(
	"resting-pointer",
	[LEGACY],
	"this rule is only a pointer; rest mechanics belong to Rules Glossary",
);

srdUnencoded({
	chapter: CHAPTER,
	unit: "damage-roll",
	aspect: "source",
	claim: "source proof missing: Damage Rolls source text is not currently pinned",
	references: [LEGACY],
});
srdEvidence(
	{
		chapter: CHAPTER,
		unit: "damage-roll",
		aspect: "mechanic",
		claim: "damage builder floors dice plus modifier at zero",
		references: [LEGACY],
	},
	() => expect(damageRollExpr({ diceExpr: "1d6", modifierExpr: "2" })).toBe("max(0, 1d6 + (2))"),
);
srdUnencoded({
	chapter: CHAPTER,
	unit: "damage-roll",
	aspect: "fixture",
	claim: "fixture proof missing: damage expression use is not coverage-labelled",
	references: [LEGACY],
});
srdUnencoded({
	chapter: CHAPTER,
	unit: "damage-roll",
	aspect: "live",
	claim: "live proof missing: damage expression use is not coverage-labelled",
	references: [LEGACY],
});

srdUnencoded({
	chapter: CHAPTER,
	unit: "critical-hit",
	aspect: "source",
	claim: "source proof missing: Critical Hits source text is not currently pinned",
	references: [LEGACY],
});
srdEvidence(
	{
		chapter: CHAPTER,
		unit: "critical-hit",
		aspect: "mechanic",
		claim: "critical builder doubles dice but leaves modifier unchanged",
		references: [LEGACY],
	},
	() =>
		expect(criticalDamageRollExpr({ diceExpr: "1d4", modifierExpr: "3" })).toBe(
			"max(0, 2d4 + (3))",
		),
);
srdUnencoded({
	chapter: CHAPTER,
	unit: "critical-hit",
	aspect: "fixture",
	claim: "fixture proof missing: natural-20 result cannot feed damage expression",
	references: [LEGACY, `${BATTLE}#finding-28`],
});
srdUnencoded({
	chapter: CHAPTER,
	unit: "critical-hit",
	aspect: "live",
	claim: "live proof missing: natural-20 result cannot feed damage expression",
	references: [LEGACY, `${BATTLE}#finding-28`],
});

srdUnencoded({
	chapter: CHAPTER,
	unit: "save-half-damage",
	aspect: "source",
	claim: "source proof missing: Saving Throws and Damage source wording is not pinned",
	references: [LEGACY],
});
srdEvidence(
	{
		chapter: CHAPTER,
		unit: "save-half-damage",
		aspect: "mechanic",
		claim: "save-for-half expression selects half or full damage",
		references: [LEGACY],
	},
	() => expect(saveHalvesExpr("d20 >= 10", "7")).toBe("cond(d20 >= 10, (7) / 2, 7)"),
);
srdUnencoded({
	chapter: CHAPTER,
	unit: "save-half-damage",
	aspect: "fixture",
	claim: "fixture proof missing: pressure-plate consequences are not coverage-labelled",
	references: [LEGACY],
});
srdUnencoded({
	chapter: CHAPTER,
	unit: "save-half-damage",
	aspect: "live",
	claim: "live proof missing: pressure-plate half/full result is not coverage-labelled",
	references: [LEGACY],
});
todoAll(
	"damage-once-multiple-targets",
	[LEGACY, `${BATTLE}#finding-29`],
	"single shared damage roll for multiple targets is unproven",
);

srdEvidence(
	{
		chapter: CHAPTER,
		unit: "damage-types-pointer",
		aspect: "source",
		claim: "cached source says damage types have no rules of their own",
		references: [LEGACY],
	},
	() => expect(() => assertDamageTypesProvenanceSource()).not.toThrow(),
);
notApplicable(
	"damage-types-pointer",
	[LEGACY],
	"source explicitly assigns no mechanics to damage types",
);

srdEvidence(
	{
		chapter: CHAPTER,
		unit: "resistance-vulnerability-order",
		aspect: "source",
		claim: "cached source retains the Resistance/Vulnerability worked example",
		references: [LEGACY],
	},
	() => expect(() => assertResistanceVulnerabilityProvenanceSource()).not.toThrow(),
);
srdEvidence(
	{
		chapter: CHAPTER,
		unit: "resistance-vulnerability-order",
		aspect: "mechanic",
		claim: "pipeline applies Resistance before Vulnerability and Immunity outermost",
		references: [LEGACY],
	},
	() =>
		expect(
			damageModifierPipelineExpr({
				adjustedDamageExpr: "23",
				resistantPredicate: "true",
				vulnerablePredicate: "true",
				immunePredicate: "false",
			}),
		).toContain("(23) / 2"),
);
srdUnencoded({
	chapter: CHAPTER,
	unit: "resistance-vulnerability-order",
	aspect: "fixture",
	claim: "fixture proof missing: no damage-type-aware state exists",
	references: [LEGACY],
});
srdUnencoded({
	chapter: CHAPTER,
	unit: "resistance-vulnerability-order",
	aspect: "live",
	claim: "live proof missing: no damage-type-aware state exists",
	references: [LEGACY],
});

srdEvidence(
	{
		chapter: CHAPTER,
		unit: "immunity",
		aspect: "source",
		claim: "cached source defines immunity to damage types and conditions",
		references: [LEGACY],
	},
	() => expect(() => assertImmunityProvenanceSource()).not.toThrow(),
);
srdEvidence(
	{
		chapter: CHAPTER,
		unit: "immunity",
		aspect: "mechanic",
		claim: "damage immunity short-circuits the damage pipeline to zero",
		references: [LEGACY],
	},
	() =>
		expect(damageModifierPipelineExpr({ adjustedDamageExpr: "23", immunePredicate: "true" })).toBe(
			"cond(true, 0, 23)",
		),
);
srdUnencoded({
	chapter: CHAPTER,
	unit: "immunity",
	aspect: "fixture",
	claim: "fixture proof missing: no damage-type-aware state exists",
	references: [LEGACY],
});
srdUnencoded({
	chapter: CHAPTER,
	unit: "immunity",
	aspect: "live",
	claim: "live proof missing: no damage-type-aware state exists",
	references: [LEGACY],
});

todoAll(
	"healing",
	[LEGACY],
	"healing source, srd/hp fixture, and live clamp proof are not coverage-labelled",
);

srdEvidence(
	{
		chapter: CHAPTER,
		unit: "knock-out-choice",
		aspect: "source",
		claim: "cached source retains per-hit choice to leave a melee target at one HP and Unconscious",
		references: [LEGACY],
	},
	() => expect(() => assertKnockingOutProvenanceSource()).not.toThrow(),
);
todoImplementation(
	"knock-out-choice",
	[LEGACY],
	"post-hit lethal/non-lethal player choice is absent",
);

// ── Dropping to 0 Hit Points ──────────────────────────────────────────────

for (const unit of ["instant-death", "character-demise", "stabilizing-a-creature"]) {
	todoAll(unit, [LEGACY], "subrule has no isolated source, mechanic, fixture, or live evidence");
}
srdEvidence(
	{
		chapter: CHAPTER,
		unit: "falling-unconscious",
		aspect: "source",
		claim: "cached source retains Falling Unconscious at 0 HP without instant death",
		references: [LEGACY],
	},
	() => {
		const text = readFileSync(join(PKG_ROOT, "cache/markdown/playing-the-game.md"), "utf8");
		expect(text).toContain("Falling Unconscious");
		expect(text).toContain("you have the Unconscious condition");
	},
);
srdEvidence(
	{
		chapter: CHAPTER,
		unit: "falling-unconscious",
		aspect: "mechanic",
		claim: "characterUnconsciousGuardExpr is HP<=0 AND srd.player_character, never monster",
		references: [LEGACY],
	},
	() => {
		expect(characterUnconsciousGuardExpr("srd/hp", "actor")).toContain("srd.player_character");
		expect(characterUnconsciousGuardExpr("srd/hp", "actor")).toContain("<= 0");
	},
);
srdEvidence(
	{
		chapter: CHAPTER,
		unit: "falling-unconscious",
		aspect: "fixture",
		claim: "fixtures ship srd/condition/unconscious and PC unconscious attack fold",
		references: [LEGACY],
	},
	() => {
		const conditions = readFileSync(
			join(PKG_ROOT, "fixtures/base/playing-the-game/conditions.toml"),
			"utf8",
		);
		const attacks = readFileSync(
			join(PKG_ROOT, "fixtures/base/playing-the-game/attacks.toml"),
			"utf8",
		);
		expect(conditions).toContain('condition_definition_id = "srd/condition/unconscious"');
		expect(attacks).toContain("srd.player_character");
		expect(attacks).toContain("srd/condition/unconscious");
	},
);
srdEvidence(
	{
		chapter: CHAPTER,
		unit: "death-saving-throw",
		aspect: "source",
		claim: "cached source retains the flat DC 10 Death Saving Throw",
		references: [LEGACY],
	},
	() => expect(() => assertDeathSaveProvenanceSource()).not.toThrow(),
);
srdEvidence(
	{
		chapter: CHAPTER,
		unit: "death-saving-throw",
		aspect: "mechanic",
		claim: "Death Saving Throw is bare d20 >= 10 with no ability or proficiency term",
		references: [LEGACY],
	},
	() => expect(deathSaveExpr()).toBe("d20 >= 10"),
);
srdEvidence(
	{
		chapter: CHAPTER,
		unit: "death-saving-throw",
		aspect: "fixture",
		claim: "fixtures ship death-save tallies, roll action, and Stable/Dead thresholds",
		references: [LEGACY],
	},
	() => {
		const death = readFileSync(
			join(PKG_ROOT, "fixtures/base/playing-the-game/death-saves.toml"),
			"utf8",
		);
		expect(death).toContain('resource_definition_id = "srd/death_save_successes"');
		expect(death).toContain('resource_definition_id = "srd/death_save_failures"');
		expect(death).toContain('action_id = "srd/death_save/roll"');
		expect(death).toContain("srd/condition/stable");
		expect(death).toContain("srd/condition/dead");
	},
);
