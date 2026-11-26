// Playing on a Grid offline proof: the five sub-rule sentences, pinned
// against the cached SRD text — grounding for the reconciliation verdict
// recorded in playing-on-a-grid-units.ts's own module header (no new
// mechanic; this unit's deliverable IS the verdict, not fixture content).
import { describe, expect, it } from "vitest";

import {
	GRID_DIFFICULT_TERRAIN_ENTRY_COST_SQUARES,
	GRID_ENTRY_COST_SQUARES,
	GRID_SQUARE_FEET,
	gridSubRules,
	parseGridSubRules,
} from "../../chapters/playing-the-game/playing-on-a-grid-units";

describe("Playing on a Grid sub-rules", () => {
	it("parses exactly the five labelled sub-rules, in SRD order", () => {
		const rules = gridSubRules();
		expect(rules.map((r) => r.label)).toEqual([
			"Squares",
			"Speed",
			"Entering a Square",
			"Corners",
			"Ranges",
		]);
	});

	it("Squares: one square is 5 feet — matches the substrate's cell_size_m = ft(5) constant", () => {
		const squares = gridSubRules().find((r) => r.label === "Squares");
		expect(squares?.text).toMatch(/5 feet/);
		expect(GRID_SQUARE_FEET).toBe(5);
	});

	it("Speed: dividing Speed by 5 translates it into squares", () => {
		const speed = gridSubRules().find((r) => r.label === "Speed");
		expect(speed?.text).toMatch(/dividing it by 5/);
		expect(speed?.text).toMatch(/Speed of 30 feet translates into 6 squares/);
	});

	it("Entering a Square: baseline 1 square, Difficult Terrain costs 2 — matches the substrate's default-cost/movement_cost_cells:2 pair", () => {
		const entering = gridSubRules().find((r) => r.label === "Entering a Square");
		expect(entering?.text).toMatch(/1 square of movement to enter/);
		expect(entering?.text).toMatch(/Difficult Terrain costs 2 squares/);
		expect(entering?.text).toMatch(/orthogonally or diagonally adjacent/);
		expect(GRID_ENTRY_COST_SQUARES).toBe(1);
		expect(GRID_DIFFICULT_TERRAIN_ENTRY_COST_SQUARES).toBe(2);
		expect(GRID_DIFFICULT_TERRAIN_ENTRY_COST_SQUARES).toBe(GRID_ENTRY_COST_SQUARES * 2);
	});

	it("Corners: diagonal movement can't cross a filled corner — the confirmed substrate gap this unit records", () => {
		const corners = gridSubRules().find((r) => r.label === "Corners");
		expect(corners?.text).toMatch(/Diagonal movement can.t cross the corner/);
	});

	it("Ranges: count squares from adjacent, shortest route", () => {
		const ranges = gridSubRules().find((r) => r.label === "Ranges");
		expect(ranges?.text).toMatch(/count squares/);
		expect(ranges?.text).toMatch(/shortest route/);
	});

	it("throws loudly when a labelled sub-rule is absent (negative control)", () => {
		expect(() => parseGridSubRules("no grid rules here at all")).toThrow(
			/no '\*\*Squares\.\*\* \.\.\.' sub-rule found/,
		);
	});
});
