// Travel Pace offline proof: the distance table (exhaustive, all 9 numbers
// pinned against the cached SRD text) and the three per-pace effect
// sentences (Advantage/Disadvantage-shaped, blocked on finding
// #23 — see travel-pace-units.ts's own module header). No mechanic idiom to
// prove here (row-less reference table, same posture as
// ability-checks-units.test.ts's Typical Difficulty Classes ladder).
import { describe, expect, it } from "vitest";

import {
	parseTravelPaceEffects,
	parseTravelPaceTable,
	travelPaceEffects,
	travelPaceTable,
} from "../../chapters/playing-the-game/travel-pace-units";

describe("Travel Pace distance table", () => {
	it("parses exactly Fast/Normal/Slow, in SRD order, with all 9 numbers pinned", () => {
		expect(travelPaceTable()).toEqual([
			{ pace: "Fast", feetPerMinute: 400, milesPerHour: 4, milesPerDay: 30 },
			{ pace: "Normal", feetPerMinute: 300, milesPerHour: 3, milesPerDay: 24 },
			{ pace: "Slow", feetPerMinute: 200, milesPerHour: 2, milesPerDay: 18 },
		]);
	});

	it("every pace's minute/hour/day distances shrink monotonically Fast > Normal > Slow", () => {
		const [fast, normal, slow] = travelPaceTable();
		if (fast === undefined || normal === undefined || slow === undefined) {
			throw new Error("travel-pace-units.test: expected exactly 3 rows (Fast/Normal/Slow).");
		}
		expect(fast.feetPerMinute).toBeGreaterThan(normal.feetPerMinute);
		expect(normal.feetPerMinute).toBeGreaterThan(slow.feetPerMinute);
		expect(fast.milesPerHour).toBeGreaterThan(normal.milesPerHour);
		expect(normal.milesPerHour).toBeGreaterThan(slow.milesPerHour);
		expect(fast.milesPerDay).toBeGreaterThan(normal.milesPerDay);
		expect(normal.milesPerDay).toBeGreaterThan(slow.milesPerDay);
	});

	it("throws loudly on a missing header (negative control)", () => {
		expect(() => parseTravelPaceTable("no table here")).toThrow(/header not found/);
	});

	it("throws loudly on a missing separator (negative control)", () => {
		expect(() => parseTravelPaceTable("|Pace|Minute|Hour|Day|\nnot a separator")).toThrow(
			/separator/,
		);
	});

	it("throws loudly on a truncated table missing a pace row (negative control)", () => {
		expect(() =>
			parseTravelPaceTable(
				"|Pace|Minute|Hour|Day|\n|---|---|---|---|\n|Fast|400 feet|4 miles|30 miles|",
			),
		).toThrow(/exactly 3 Travel Pace rows/);
	});

	it("throws loudly on a non-numeric distance cell (negative control)", () => {
		expect(() =>
			parseTravelPaceTable(
				"|Pace|Minute|Hour|Day|\n|---|---|---|---|\n|Fast|far feet|4 miles|30 miles|\n|Normal|300 feet|3 miles|24 miles|\n|Slow|200 feet|2 miles|18 miles|",
			),
		).toThrow(/does not match/);
	});
});

describe("Travel Pace per-pace effects", () => {
	it("Fast imposes Disadvantage on Wisdom (Perception or Survival) AND Dexterity (Stealth)", () => {
		const fast = travelPaceEffects().find((e) => e.pace === "Fast");
		expect(fast).toBeDefined();
		expect(fast?.biasKind).toBe("disadvantage");
		expect(fast?.effectText).toMatch(/Disadvantage/);
		expect(fast?.effectText).toMatch(/Wisdom \(Perception or Survival\)/);
		expect(fast?.effectText).toMatch(/Dexterity \(Stealth\)/);
	});

	it("Normal imposes Disadvantage on Dexterity (Stealth) only", () => {
		const normal = travelPaceEffects().find((e) => e.pace === "Normal");
		expect(normal).toBeDefined();
		expect(normal?.biasKind).toBe("disadvantage");
		expect(normal?.effectText).toMatch(/Disadvantage on Dexterity \(Stealth\)/);
		expect(normal?.effectText).not.toMatch(/Wisdom/);
	});

	it("Slow grants Advantage on Wisdom (Perception or Survival) checks", () => {
		const slow = travelPaceEffects().find((e) => e.pace === "Slow");
		expect(slow).toBeDefined();
		expect(slow?.biasKind).toBe("advantage");
		expect(slow?.effectText).toMatch(/Advantage on Wisdom \(Perception or Survival\)/);
	});

	it("every effect is Advantage/Disadvantage-shaped, confirming the #23 block honestly rather than assuming it", () => {
		for (const effect of travelPaceEffects()) {
			expect(["advantage", "disadvantage"]).toContain(effect.biasKind);
		}
	});

	it("throws loudly when a pace's effect sentence is absent (negative control)", () => {
		expect(() => parseTravelPaceEffects("no effect prose here at all")).toThrow(
			/no '\*\*Fast\.\*\* \.\.\.' effect sentence found/,
		);
	});
});
