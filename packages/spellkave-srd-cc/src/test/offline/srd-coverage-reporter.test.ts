import { describe, expect, it } from "vitest";

import {
	type FindingEvidenceResult,
	findingName,
	notApplicableName,
	parseFindingName,
	parseSrdEvidenceName,
	parseSrdNotApplicableName,
	type SrdEvidenceAspect,
	type SrdEvidenceResult,
} from "../srd-coverage/protocol";
import {
	evidenceStateForTest,
	renderExecutableCoverage,
	renderExecutableLedger,
	renderFindingLedger,
	reproductionCommand,
} from "../srd-coverage/reporter";

const GREEN_SOURCE: SrdEvidenceResult = {
	chapter: "playing-the-game",
	unit: "ability-modifiers",
	aspect: "source",
	claim: "the SRD table is complete",
	references: ["ledger/designs/ability-modifiers.md"],
	testFile: "src/test/offline/modifier-units.test.ts",
	testLine: 47,
	state: "proven",
};

function notApplicable(aspect: Exclude<SrdEvidenceAspect, "source">): SrdEvidenceResult {
	return {
		...GREEN_SOURCE,
		aspect,
		claim: `${aspect} does not apply to this reference-only unit`,
		references: undefined,
		state: "not-applicable",
	};
}

describe("executable SRD coverage reporter", () => {
	it("keeps source links stable when a header moves an assertion", () => {
		const before = renderExecutableLedger([GREEN_SOURCE]);
		const after = renderExecutableLedger([{ ...GREEN_SOURCE, testLine: 48 }]);
		expect(after).toBe(before);
		expect(after).toContain("[modifier-units.test.ts](../src/test/offline/modifier-units.test.ts)");
		expect(
			renderExecutableLedger([{ ...GREEN_SOURCE, references: ["docs/rules.md#L9"] }]),
		).toContain("rules.md#L9");
	});

	it("still rejects two executable findings at the same source location", () => {
		const finding: FindingEvidenceResult = {
			id: "27",
			title: "movement budget is cumulative",
			expected: "one budget",
			observed: "budget resets",
			impact: "actors move too far",
			references: ["docs/rules.md#L9"],
			testFile: GREEN_SOURCE.testFile,
			testLine: 47,
			state: "proven",
		};
		expect(() => renderFindingLedger([finding, { ...finding, id: "28" }])).toThrow(
			"Executable findings 27 and 28 share src/test/offline/modifier-units.test.ts:47.",
		);
		expect(renderFindingLedger([finding])).toBe(
			renderFindingLedger([{ ...finding, testLine: 48 }]),
		);
		expect(() =>
			renderFindingLedger([finding, { ...finding, id: "28", testLine: 48 }]),
		).not.toThrow();
	});
	it("round-trips SRD evidence, references, and not-applicable declarations", () => {
		expect(
			parseSrdEvidenceName(
				"[srd:playing-the-game/ability-modifiers][source] the SRD table is complete [ref:ledger/designs/ability-modifiers.md]",
			),
		).toEqual({
			chapter: "playing-the-game",
			unit: "ability-modifiers",
			aspect: "source",
			claim: "the SRD table is complete",
			references: ["ledger/designs/ability-modifiers.md"],
		});
		const notApplicable = {
			chapter: "playing-the-game",
			unit: "ability-score-bands",
			aspect: "mechanic" as const,
			reason: "the unit is reference metadata, not runtime behavior",
			references: ["ledger/designs/reference-tables-as-tag-metadata.md"],
		};
		expect(parseSrdNotApplicableName(notApplicableName(notApplicable))).toEqual({
			chapter: notApplicable.chapter,
			unit: notApplicable.unit,
			aspect: notApplicable.aspect,
			claim: notApplicable.reason,
			references: notApplicable.references,
		});
	});

	it("renders each evidence state precisely in the generated ledger", () => {
		const ledger = renderExecutableLedger([
			GREEN_SOURCE,
			{
				...GREEN_SOURCE,
				aspect: "mechanic",
				claim: "the runtime mechanic exists",
				state: "reproduced",
			},
			{
				...GREEN_SOURCE,
				aspect: "fixture",
				claim: "fixture evidence has not been encoded",
				state: "unencoded",
			},
			{
				...GREEN_SOURCE,
				aspect: "live",
				claim: "live evidence was not run",
				state: "not-run",
			},
		]);
		expect(ledger).toContain(
			"| ❌ reproduced | playing-the-game | Ability Modifiers | mechanic | the runtime mechanic exists |",
		);
		expect(ledger).toContain("| ⚠️ unencoded | playing-the-game | Ability Modifiers | fixture |");
		expect(ledger).toContain("| ⏸ not run | playing-the-game | Ability Modifiers | live |");
		expect(ledger).toContain(
			"[modifier-units.test.ts](../src/test/offline/modifier-units.test.ts)",
		);
		expect(ledger).toContain("[ability-modifiers.md](designs/ability-modifiers.md)");
		expect(ledger).toContain(
			"> GENERATED from Vitest results by `src/test/srd-coverage/reporter.ts` — DO NOT EDIT BY HAND.",
		);
		expect(ledger).toContain(
			"**Source:** the test proves that the complete SRD rule was read from the CC source.",
		);
		expect(ledger).toContain(
			"**Mechanic:** the test proves that the generated expression or behavior implements the rule.",
		);
		expect(ledger).toContain(
			"**Status:** ✅ proven = assertion passed; ❌ reproduced = desired assertion failed as expected; ⚠️ unencoded = assertion not written;",
		);
	});

	it("treats explicit N/A as complete but mixed N/A and required evidence as red", () => {
		const completeCoverage = renderExecutableCoverage([
			GREEN_SOURCE,
			notApplicable("mechanic"),
			notApplicable("fixture"),
			notApplicable("live"),
		]);
		expect(completeCoverage).toContain(
			"| playing-the-game | [Ability Modifiers](../ledger/playing-the-game.md) | ✅ proven | ➖ n/a | ➖ n/a | ➖ n/a | ✅ proven |",
		);
		expect(completeCoverage).toContain(
			"**Authored semantic units:** 1. **Complete:** 1/1. **Applicable declarations:** 1 (1 proven, 0 reproduced, 0 unencoded, 0 not run, 0 failed). **Not applicable:** 3.",
		);

		const mixedCoverage = renderExecutableCoverage([
			GREEN_SOURCE,
			notApplicable("mechanic"),
			{ ...GREEN_SOURCE, aspect: "mechanic", state: "proven" },
			notApplicable("fixture"),
			notApplicable("live"),
		]);
		expect(mixedCoverage).toContain(
			"| playing-the-game | [Ability Modifiers](../ledger/playing-the-game.md) | ✅ proven | 💥 failed | ➖ n/a | ➖ n/a | 💥 failed |",
		);
	});

	it("round-trips and renders open and resolved findings with authored references", () => {
		const identity = {
			id: "27",
			title: "movement budget is not cumulative",
			expected: "movement during a turn spends one cumulative Speed budget",
			observed: "multiple moves can each spend full Speed",
			impact: "an actor can move farther than the rules permit",
			references: [
				"ledger/designs/movement-budget.md",
				"https://github.com/b4arena/spellkave/issues/27",
			] as const,
		};
		expect(parseFindingName(findingName(identity))).toEqual(identity);
		const base: FindingEvidenceResult = {
			...identity,
			testFile: "src/test/offline/movement-position-units.test.ts",
			testLine: 40,
			state: "reproduced",
		};
		const ledger = renderFindingLedger([
			base,
			{
				...base,
				id: "7",
				title: "resolved regression",
				testLine: 41,
				state: "proven",
			},
		]);
		expect(ledger).toContain("## ❌ reproduced — #27 movement budget is not cumulative");
		expect(ledger).toContain(
			"**Expected:** movement during a turn spends one cumulative Speed budget",
		);
		expect(ledger).toContain("**Observed:** multiple moves can each spend full Speed");
		expect(ledger).toContain("**Impact:** an actor can move farther than the rules permit");
		expect(ledger).toContain(
			"**Reproduce:** `pnpm --filter @spellkave/srd-cc exec vitest run src/test/offline/movement-position-units.test.ts --no-file-parallelism`",
		);
		expect(ledger).toContain("## ✅ proven — Proven regressions");
		expect(ledger).toContain("[movement-budget.md](designs/movement-budget.md)");
		expect(ledger).toContain(
			"[https://github.com/b4arena/spellkave/issues/27](https://github.com/b4arena/spellkave/issues/27)",
		);
	});

	it("derives result states and path/seeding-aware reproduction commands", () => {
		const result = (state: "pending" | "passed" | "failed" | "skipped") => () => ({ state });
		expect(evidenceStateForTest({ options: { mode: "run" }, result: result("passed") })).toBe(
			"proven",
		);
		expect(
			evidenceStateForTest({ options: { mode: "run", fails: true }, result: result("passed") }),
		).toBe("reproduced");
		expect(evidenceStateForTest({ options: { mode: "todo" }, result: result("pending") })).toBe(
			"unencoded",
		);
		expect(evidenceStateForTest({ options: { mode: "skip" }, result: result("skipped") })).toBe(
			"not-run",
		);
		expect(evidenceStateForTest({ options: { mode: "run" }, result: result("failed") })).toBe(
			"failed",
		);
		expect(reproductionCommand("src/test/live-preseeded/example.test.ts")).toContain(
			"just spacetime-start && just wipe && just seed && just seed packages/spellkave-srd-cc/fixtures &&",
		);
		expect(reproductionCommand("src/test/live-self-seeding/example.test.ts")).toContain(
			"source scripts/dev/node-env.sh && SPELLKAVE_LOCAL_NODE=1 pnpm",
		);
	});

	it("rejects duplicate finding IDs", () => {
		const finding: FindingEvidenceResult = {
			id: "27",
			title: "movement budget is cumulative",
			expected: "movement uses one budget",
			observed: "movement can reset",
			impact: "actors move too far",
			references: ["ledger/designs/movement-budget.md"],
			testFile: "src/test/offline/movement.test.ts",
			testLine: 10,
			state: "unencoded",
		};
		expect(() => renderFindingLedger([finding, finding])).toThrow("Duplicate finding IDs: 27");
	});

	it("rejects findings without an executable assertion", () => {
		const finding: FindingEvidenceResult = {
			id: "27",
			title: "movement budget is cumulative",
			expected: "movement uses one budget",
			observed: "movement can reset",
			impact: "actors move too far",
			references: ["ledger/designs/movement-budget.md"],
			testFile: "src/test/offline/movement.test.ts",
			testLine: 10,
			state: "unencoded",
		};
		expect(() => renderFindingLedger([finding])).toThrow(
			"Findings must be executable when declared; unencoded finding IDs: 27",
		);
	});

	it("keeps a unit red when no mechanic evidence was declared", () => {
		const coverage = renderExecutableCoverage([GREEN_SOURCE]);
		expect(coverage).toContain(
			"**Source:** the test proves that the complete SRD rule was read from the CC source.",
		);
		expect(coverage).toContain(
			"**Mechanic:** the test proves that the generated expression or behavior implements the rule.",
		);
		expect(coverage).toContain(
			"| playing-the-game | [Ability Modifiers](../ledger/playing-the-game.md) | ✅ proven | ⚠️ undeclared | ⚠️ undeclared | ⚠️ undeclared | ⚠️ undeclared |",
		);
		expect(coverage).toContain("**Authored semantic units:** 1. **Complete:** 0/1.");
	});
});
