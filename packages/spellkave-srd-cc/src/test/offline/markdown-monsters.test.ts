import { describe, expect, it } from "vitest";

import {
	readExperienceByChallengeRatingTable,
	xpForChallengeRating,
} from "../../markdown/monsters";

describe("readExperienceByChallengeRatingTable", () => {
	it("parses exactly 34 (CR, XP) rows (17 <tr> rows, 2 pairs each) out of the cached chapter markdown", () => {
		const rows = readExperienceByChallengeRatingTable();
		expect(rows).toHaveLength(34);
	});

	it("pins a handful of rows against their own markdown anchors, including all 3 fractional CRs", () => {
		const rows = readExperienceByChallengeRatingTable();
		const byCrText = new Map(rows.map((row) => [row.crText, row]));

		// CR 0's XP cell is the two-word "0 or 10" (monsters.md:223) — the
		// module's own header explains why: most CR 0 monsters are worth 0 XP,
		// but Octopus (Creature.json's ONE creature with a non-null
		// experience_points_integer) is an authored exception.
		expect(byCrText.get("0")).toMatchObject({ crNumber: 0, xp: 0, xpText: "0 or 10", line: 221 });
		// The 3 SRD fractional CRs (monsters.md:227, :233, :239).
		expect(byCrText.get("1/8")).toMatchObject({ crNumber: 0.125, xp: 25, line: 227 });
		expect(byCrText.get("1/4")).toMatchObject({ crNumber: 0.25, xp: 50, line: 233 });
		expect(byCrText.get("1/2")).toMatchObject({ crNumber: 0.5, xp: 100, line: 239 });
		// A comma-bearing XP cell (monsters.md:224) and the table's own extremes.
		expect(byCrText.get("14")).toMatchObject({
			crNumber: 14,
			xp: 11_500,
			xpText: "11,500",
			line: 221,
		});
		expect(byCrText.get("1")).toMatchObject({ crNumber: 1, xp: 200, line: 245 });
		expect(byCrText.get("30")).toMatchObject({ crNumber: 30, xp: 155_000, line: 317 });
	});

	it("every row's line points back at a real cached markdown line", () => {
		for (const row of readExperienceByChallengeRatingTable()) {
			expect(row.line).toBeGreaterThan(0);
		}
	});

	it("both flattened halves (CR 0-13 then CR 14-30) are each in ascending crNumber order", () => {
		const rows = readExperienceByChallengeRatingTable();
		const left = rows.slice(0, 17);
		const right = rows.slice(17);
		for (let i = 1; i < left.length; i += 1) {
			expect(left[i]?.crNumber).toBeGreaterThan(left[i - 1]?.crNumber as number);
		}
		for (let i = 1; i < right.length; i += 1) {
			expect(right[i]?.crNumber).toBeGreaterThan(right[i - 1]?.crNumber as number);
		}
		expect(left[0]?.crNumber).toBe(0);
		expect(left.at(-1)?.crNumber).toBe(13);
		expect(right[0]?.crNumber).toBe(14);
		expect(right.at(-1)?.crNumber).toBe(30);
	});
});

describe("xpForChallengeRating", () => {
	it("resolves the goblin warrior's own CR (1/4, monsters-A-Z.md:7388 'CR 1/4 (XP 50; PB +2)') to 50", () => {
		expect(xpForChallengeRating(0.25)).toBe(50);
	});

	it("resolves every fractional CR and a sample of integer CRs by NUMBER, never by string", () => {
		expect(xpForChallengeRating(0.125)).toBe(25);
		expect(xpForChallengeRating(0.5)).toBe(100);
		expect(xpForChallengeRating(1)).toBe(200);
		expect(xpForChallengeRating(3)).toBe(700);
		expect(xpForChallengeRating(20)).toBe(25_000);
		expect(xpForChallengeRating(30)).toBe(155_000);
	});

	it("throws loudly for a CR with no matching row, rather than silently returning 0", () => {
		expect(() => xpForChallengeRating(0.3)).toThrow(/no Experience Points by Challenge Rating row/);
	});
});
