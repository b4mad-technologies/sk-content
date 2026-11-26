import { fileURLToPath } from "node:url";
import { createLocalAuthorTarget } from "@spellkave/tool-node/authoring";
import { describe, expect, it } from "vitest";

const fixtures = fileURLToPath(new URL("../../../fixtures", import.meta.url));
const target = createLocalAuthorTarget(fixtures);
const writes = (template: string) =>
	target
		.lookup("consequence_frame_writes")
		.filter((row) => row.template_id === template)
		.sort((a, b) => Number(a.ordinal) - Number(b.ordinal))
		.map((row) => row.frame_write as Record<string, Record<string, unknown>>);

describe("round 5 kept content", () => {
	it("keeps death tallies so the receipt reads 2 -> 3", () => {
		const set = writes("srd/death_save/roll/success");
		expect(set).toHaveLength(10);
		const after = set.slice(6).map((write) => write.ForEachActorInRadius?.predicate_source);
		expect(after[0]).toBe("actor.stat('srd/death_save_failures') >= 3");
		expect(after.slice(1).join(" ")).not.toContain("failures') >= 3");
	});

	it("names the death-save window in the player outcome text", () => {
		const row = target
			.lookup("outcome_templates")
			.find((candidate) => candidate.outcome_template_id === "srd/death_save/roll/outcome");
		expect(row?.description).toContain("No timer forces the next roll");
		expect(row?.description).toContain("only the DM can bring back the dead");
	});

	it("gives the DM a revive act that clears every tally", () => {
		const set = JSON.stringify(writes("srd/dm/revive/success"));
		for (const id of ["dead", "unconscious"]) expect(set).toContain(`srd/condition/${id}`);
		for (const id of ["hp", "death_save_failures", "death_save_successes", "death_save_last_roll"])
			expect(set).toContain(`srd/${id}`);
		const action = target
			.lookup("action_definitions")
			.find((row) => row.action_id === "srd/dm/revive");
		expect(action?.required_capability).toBe("frontier.set_state");
	});

	it("gives Turn Undead a Wisdom save per target", () => {
		const area = writes("srd/cleric/turn-undead/success")[1]?.ForEachActorInRadius;
		expect(area?.predicate_source).toContain("d20 + (actor.stat('srd/wis') - 10) / 2 < 13");
	});

	it("rolls Sneak Attack dice by level, not the never-raised resource", () => {
		const expression = JSON.stringify(writes("srd/attack/sneak-attack/success")[1]);
		expect(expression).toContain("actor.stat('srd/level') >= 3, 2d6, 1d6");
		expect(expression).not.toContain("sneak-attack-dice') >= 2");
	});

	it("sets the class tag at level-up for every class to level 5", () => {
		const set = JSON.stringify(writes("srd/advancement/level-up/success"));
		for (const slug of ["barbarian", "bard", "cleric", "paladin", "rogue", "wizard"])
			for (const level of [2, 3, 4, 5]) expect(set).toContain(`srd.advancement.${slug}.${level}`);
		expect(set).not.toContain(".advancement.rogue.6");
	});
});
