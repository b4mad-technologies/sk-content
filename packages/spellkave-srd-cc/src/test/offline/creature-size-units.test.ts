// Creature Size and Space offline proof: the 6-row table, exhaustive, all
// values pinned against the cached SRD text. Row-less reference table (no
// mechanic idiom to prove) — same posture as travel-pace-units.test.ts.
import { describe, expect, it } from "vitest";

import {
	creatureSizeTable,
	parseCreatureSizeTable,
} from "../../chapters/playing-the-game/creature-size-units";

describe("Creature Size and Space table", () => {
	it("parses exactly Tiny..Gargantuan, in SRD order, with every cell pinned", () => {
		expect(creatureSizeTable()).toEqual([
			{ size: "Tiny", spaceFeet: "2½ by 2½ feet", spaceSquares: "4 per square", squareCount: 0.25 },
			{ size: "Small", spaceFeet: "5 by 5 feet", spaceSquares: "1 square", squareCount: 1 },
			{ size: "Medium", spaceFeet: "5 by 5 feet", spaceSquares: "1 square", squareCount: 1 },
			{
				size: "Large",
				spaceFeet: "10 by 10 feet",
				spaceSquares: "4 squares (2 by 2)",
				squareCount: 4,
			},
			{
				size: "Huge",
				spaceFeet: "15 by 15 feet",
				spaceSquares: "9 squares (3 by 3)",
				squareCount: 9,
			},
			{
				size: "Gargantuan",
				spaceFeet: "20 by 20 feet",
				spaceSquares: "16 squares (4 by 4)",
				squareCount: 16,
			},
		]);
	});

	it("square counts grow monotonically Tiny < Small = Medium < Large < Huge < Gargantuan", () => {
		const rows = creatureSizeTable();
		const bySize = new Map(rows.map((row) => [row.size, row.squareCount]));
		function count(size: string): number {
			const value = bySize.get(size as never);
			if (value === undefined) throw new Error(`missing size '${size}'`);
			return value;
		}
		expect(count("Tiny")).toBeLessThan(count("Small"));
		expect(count("Small")).toBe(count("Medium"));
		expect(count("Medium")).toBeLessThan(count("Large"));
		expect(count("Large")).toBeLessThan(count("Huge"));
		expect(count("Huge")).toBeLessThan(count("Gargantuan"));
	});

	it("Large/Huge/Gargantuan squareCount is the square of the (N by N) side count (negative control on the parse, not an assumption)", () => {
		const rows = creatureSizeTable();
		for (const row of rows) {
			if (row.size === "Tiny" || row.size === "Small" || row.size === "Medium") {
				continue;
			}
			const match = row.spaceSquares.match(/\((\d+) by (\d+)\)/);
			expect(match).not.toBeNull();
			const side = Number.parseInt(match?.[1] ?? "0", 10);
			expect(row.squareCount).toBe(side * side);
		}
	});

	it("throws loudly on a missing header (negative control)", () => {
		expect(() => parseCreatureSizeTable("no table here")).toThrow(/header not found/);
	});

	it("throws loudly on a missing separator (negative control)", () => {
		expect(() =>
			parseCreatureSizeTable("|Size|Space (Feet)|Space (Squares)|\nnot a separator"),
		).toThrow(/separator/);
	});

	it("throws loudly on a truncated table missing a size row (negative control)", () => {
		expect(() =>
			parseCreatureSizeTable(
				"|Size|Space (Feet)|Space (Squares)|\n|---|---|---|\n|Tiny|2½ by 2½ feet|4 per square|",
			),
		).toThrow(/exactly 6 Creature Size rows/);
	});

	it("throws loudly on an unexpected size name (negative control)", () => {
		expect(() =>
			parseCreatureSizeTable(
				"|Size|Space (Feet)|Space (Squares)|\n|---|---|---|\n|Colossal|1 by 1 feet|1 square|\n" +
					"|Small|5 by 5 feet|1 square|\n|Medium|5 by 5 feet|1 square|\n|Large|10 by 10 feet|4 squares (2 by 2)|\n" +
					"|Huge|15 by 15 feet|9 squares (3 by 3)|\n|Gargantuan|20 by 20 feet|16 squares (4 by 4)|",
			),
		).toThrow(/unexpected size name 'Colossal'/);
	});

	it("throws loudly on a malformed Tiny cell (negative control)", () => {
		expect(() =>
			parseCreatureSizeTable(
				"|Size|Space (Feet)|Space (Squares)|\n|---|---|---|\n|Tiny|2½ by 2½ feet|tiny|\n" +
					"|Small|5 by 5 feet|1 square|\n|Medium|5 by 5 feet|1 square|\n|Large|10 by 10 feet|4 squares (2 by 2)|\n" +
					"|Huge|15 by 15 feet|9 squares (3 by 3)|\n|Gargantuan|20 by 20 feet|16 squares (4 by 4)|",
			),
		).toThrow(/does not match 'N per square'/);
	});
});
