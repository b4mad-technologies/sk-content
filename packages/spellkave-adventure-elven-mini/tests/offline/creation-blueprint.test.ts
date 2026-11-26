import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { dmSetStateIds } from "../../../spellkave-srd-cc/src/chapters/classes/dm-act-units.ts";
import { candidateOccupancy } from "../../author/creation-candidate.ts";
import { elvenMiniAuthorTarget } from "../../author/lib/target.ts";

describe("world-owned creation blueprint", () => {
	it("seeds every authored state and authority handle without placing an authored hero", () => {
		const target = elvenMiniAuthorTarget(
			resolve(import.meta.dirname, "../../../spellkave-srd-cc/fixtures"),
		);
		const calls = candidateOccupancy(target);
		expect(calls.filter((call) => call.toolName === "spellkave_place_actor")).toEqual([]);
		const definition = calls.find((call) => call.toolName === "spellkave_define_entity_type");
		expect(definition).toBeDefined();
		const params = definition?.params as {
			tags: string[];
			initial_states: { state: string; value_int?: number; value_text?: string }[];
			initial_capabilities: { capability: string; extent_kind_ref?: string; extent_ref?: string }[];
			initial_conditions: { condition: string }[];
		};
		expect(params.tags).toEqual(
			expect.arrayContaining([
				"srd.creature",
				"srd.player_character",
				"srd.communication.vocal",
				"srd.faction.party",
				"srd.party.heroes",
			]),
		);
		const states = new Map(params.initial_states.map((row) => [row.state, row]));
		for (const state of dmSetStateIds(target)) expect(states.has(state), state).toBe(true);
		expect(states.get("srd/appearance")).toMatchObject({ value_text: "" });
		expect(states.get("srd/backstory")).toMatchObject({ value_text: "" });
		expect(states.get("dm/creation/kit-granted")).toMatchObject({ value_int: 0 });
		expect(params.initial_conditions).toContainEqual(
			expect.objectContaining({ condition: "dm/creation/drafting" }),
		);
		expect(params.initial_capabilities).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ capability: "elven_mini/quest/open-tomb" }),
			]),
		);
		expect(params.initial_capabilities.some((row) => row.extent_kind_ref === "party")).toBe(false);
		expect(params.initial_capabilities.map((row) => row.capability)).not.toContain(
			"elven_mini/companion/command-bond",
		);
		expect(params.initial_conditions.map((row) => row.condition)).not.toContain(
			"elven_mini/companion/command-bond-active",
		);
	});
});
