// Movement and Position offline proof: the four non-table sub-sections,
// pinned against the cached SRD text. This unit's real deliverable is the
// reconciliation verdict recorded in its own module header (incl. NEW
// finding #27, the no-cumulative-movement-budget gap) — this
// test grounds the verdict's quoted text, not a new mechanic.
import { describe, expect, it } from "vitest";
import {
	movementSubSections,
	parseMovementSubSections,
} from "../../chapters/playing-the-game/movement-position-units";
import { srdEvidence, srdUnencoded } from "../srd-coverage/evidence";

describe("Movement and Position sub-sections", () => {
	it("parses exactly the 4 non-table sub-sections, in SRD order", () => {
		const sections = movementSubSections();
		expect(sections.map((s) => s.heading)).toEqual([
			"Difficult Terrain",
			"Breaking Up Your Move",
			"Dropping Prone",
			"Moving around Other Creatures",
		]);
	});

	it("Difficult Terrain: every foot costs 1 extra foot — the same 2x-cost rule as Playing on a Grid", () => {
		const terrain = movementSubSections().find((s) => s.heading === "Difficult Terrain");
		expect(terrain?.text).toMatch(/Every foot of movement in Difficult Terrain costs 1 extra foot/);
	});

	it("Breaking Up Your Move: 10 feet / action / 20 feet worked example", () => {
		const breaking = movementSubSections().find((s) => s.heading === "Breaking Up Your Move");
		expect(breaking?.text).toMatch(/go 10 feet, take an action, and then go 20 feet/);
	});

	it("Dropping Prone: free (no action, no Speed), unless Speed is 0", () => {
		const prone = movementSubSections().find((s) => s.heading === "Dropping Prone");
		expect(prone?.text).toMatch(/without using an action or any of your Speed/);
		expect(prone?.text).toMatch(/can.t do so if your Speed is 0/);
	});

	srdEvidence(
		{
			chapter: "playing-the-game",
			unit: "moving-around-other-creatures",
			aspect: "source",
			claim: "the source contains pass-through, difficult-terrain, and occupied-space rules",
		},
		() => {
			const moving = movementSubSections().find(
				(s) => s.heading === "Moving around Other Creatures",
			);
			expect(moving?.text).toMatch(/pass through the space of an ally/);
			expect(moving?.text).toMatch(/Difficult Terrain for you/);
			expect(moving?.text).toMatch(/can.t willingly end a move in a space occupied/);
		},
	);

	srdUnencoded({
		chapter: "playing-the-game",
		unit: "moving-around-other-creatures",
		aspect: "mechanic",
		claim: "movement enforces creature pass-through and occupied-space constraints",
	});

	it("throws loudly when a heading is absent (negative control)", () => {
		expect(() => parseMovementSubSections("no headings here at all")).toThrow(/heading not found/);
	});

	it("throws loudly when a heading is present but has no body text (negative control)", () => {
		expect(() =>
			parseMovementSubSections(
				"## Difficult Terrain\n## Breaking Up Your Move\nbody\n## Dropping Prone\nbody\n## Moving around Other Creatures\nbody",
			),
		).toThrow(/has no body text/);
	});
});
