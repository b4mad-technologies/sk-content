import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
	characterUnconsciousFrameWrite,
	characterUnconsciousGuardExpr,
	DEATH_SAVE_DC,
	DEATH_SAVE_TALLY_MAX,
	deathSaveCaptureDeltaExpr,
	deathSaveDeadThresholdExpr,
	deathSaveEligibilityExpr,
	deathSaveExpr,
	deathSaveFailureTallyDeltaExpr,
	deathSaveNat1ExtraFailureDeltaExpr,
	deathSaveNat20HpDeltaExpr,
	deathSaveStableThresholdExpr,
	deathSaveSuccessTallyDeltaExpr,
} from "../../chapters/playing-the-game/death-saves-units";

const PKG = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const FIX = join(PKG, "fixtures/base/playing-the-game");

describe("death-saves-units (sk-609b.18)", () => {
	it("exports the flat DC-10 death save expression", () => {
		expect(deathSaveExpr()).toBe(`d20 >= ${DEATH_SAVE_DC}`);
		expect(DEATH_SAVE_DC).toBe(10);
		expect(DEATH_SAVE_TALLY_MAX).toBe(3);
	});

	it("guards Falling Unconscious on player_character only", () => {
		const g = characterUnconsciousGuardExpr("srd/hp", "actor");
		expect(g).toBe("actor.has_tag('srd.player_character') && actor.stat('srd/hp') <= 0");
		expect(g).not.toContain("srd.monster");
	});

	it("seeds clock pools when applying Unconscious", () => {
		const fw = characterUnconsciousFrameWrite(
			"srd/hp",
			"srd/condition/unconscious",
			"srd/death_save_successes",
			"srd/death_save_failures",
			"srd/death_save_last_roll",
		) as {
			ForEachActorInRadius: { body: unknown[]; predicate_source: string };
		};
		expect(fw.ForEachActorInRadius.predicate_source).toContain("srd.player_character");
		expect(JSON.stringify(fw.ForEachActorInRadius.body)).toContain("srd/condition/unconscious");
		expect(JSON.stringify(fw.ForEachActorInRadius.body)).toContain("srd/death_save_successes");
	});

	it("composes capture, tally, nat-1/20, and threshold expressions", () => {
		expect(deathSaveCaptureDeltaExpr("srd/death_save_last_roll")).toContain("d20 -");
		expect(deathSaveSuccessTallyDeltaExpr("srd/death_save_last_roll")).toContain(">= 10");
		expect(deathSaveFailureTallyDeltaExpr("srd/death_save_last_roll")).toContain("< 10");
		expect(deathSaveNat1ExtraFailureDeltaExpr("srd/death_save_last_roll")).toContain("== 1");
		expect(deathSaveNat20HpDeltaExpr("srd/death_save_last_roll")).toContain("== 20");
		expect(
			deathSaveStableThresholdExpr("srd/death_save_successes", "srd/death_save_last_roll"),
		).toContain(">= 3");
		expect(deathSaveDeadThresholdExpr("srd/death_save_failures")).toBe(
			"actor.stat('srd/death_save_failures') >= 3",
		);
		expect(
			deathSaveEligibilityExpr(
				"srd/condition/unconscious",
				"srd/condition/stable",
				"srd/condition/dead",
			),
		).toContain("unconscious");
	});

	it("fixtures ship the clock + Unconscious condition + PC fold", () => {
		const death = readFileSync(join(FIX, "death-saves.toml"), "utf8");
		const conditions = readFileSync(join(FIX, "conditions.toml"), "utf8");
		const attacks = readFileSync(join(FIX, "attacks.toml"), "utf8");
		expect(death).toContain('action_id = "srd/death_save/roll"');
		expect(death).toContain('resource_definition_id = "srd/death_save_successes"');
		expect(death).toContain("srd/death_save/heal_clear");
		expect(conditions).toContain('condition_definition_id = "srd/condition/unconscious"');
		expect(conditions).toContain('condition_definition_id = "srd/condition/stable"');
		expect(conditions).toContain("Layer2.ResourceDelta");
		expect(attacks).toContain("srd.player_character");
		expect(attacks).toContain("srd/condition/unconscious");
	});
});
