import { describe, expect, it } from "vitest";
import { budgetTier, encounterDifficulty, XP_BUDGETS } from "../../scripts/encounter-difficulty.ts";

describe("elven-mini encounter XP admission", () => {
	// K1: offline content admission; no runtime mechanic or AI judgment is involved.
	it("every placed encounter stays within High for its authored party", () => {
		const rows = encounterDifficulty();
		expect(rows.length).toBeGreaterThan(0);
		for (const row of rows) {
			expect(
				row.targetTier,
				`${row.place}: ${row.xp} XP for L${row.level} × ${row.partySize}`,
			).not.toBe("Above High");
			if (row.level === 1) expect(row.partySize, `${row.place} must support solo entry`).toBe(1);
		}
	});

	// K2: boundaries use the source-derived budget rather than remembered constants.
	it("admits the High ceiling and rejects one XP over it for solo and duo", () => {
		for (const [level, budget] of XP_BUDGETS) {
			for (const party of [1, 2]) {
				expect(budgetTier(budget.low * party, level, party)).toBe("Low");
				expect(budgetTier(budget.moderate * party, level, party)).toBe("Moderate");
				expect(budgetTier(budget.high * party, level, party)).toBe("High");
				expect(budgetTier(budget.high * party + 1, level, party)).toBe("Above High");
			}
		}
	});
});
