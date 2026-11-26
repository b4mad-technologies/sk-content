// Grid-traversal chain offline proof: the bare capability/niche ids, the
// edge-affordance predicate builder, and the srd/speed-walk bounds. Shipped
// ROW shapes are pinned against the committed `fixtures/` in
// `fixtures-author-tool/resources.test.ts` (srd/speed-walk) and the
// discovery-closure walk (the bare srd/capability/walk reference exception,
// `test/shared/discovery-closure.ts`).
import { describe, expect, it } from "vitest";
import {
	GRID_STEP_AFFORDANCE_LOCAL_ID,
	gridStepAffordancePredicate,
	LONG_RUNNING_MOVE_SESSION_BINDING,
	LONG_RUNNING_MOVE_SESSION_DEF_ID,
	SPEED_WALK_INITIAL,
	SPEED_WALK_MAX,
	SPEED_WALK_MIN,
	SPEED_WALK_RECOVERY_RULE,
	STEP_BLOCKING_EXCLUDED_CONDITION_ID,
	STEP_EDGE_BINDINGS,
	STEP_EDGE_RANGE_M,
	stepAffordancePredicate,
	TRAVERSABLE_SQUARE_NICHE_ID,
	WALK_CAPABILITY_ID,
} from "../../chapters/playing-the-game/grid-units";
import {
	GRID_ENTRY_COST_SQUARES,
	GRID_SQUARE_FEET,
} from "../../chapters/playing-the-game/playing-on-a-grid-units";

describe("grid-units ids", () => {
	it("srd/capability/walk and srd/niche/traversable-square are distinct, bare srd-own ids", () => {
		expect(WALK_CAPABILITY_ID).toBe("srd/capability/walk");
		expect(TRAVERSABLE_SQUARE_NICHE_ID).toBe("srd/niche/traversable-square");
		expect(WALK_CAPABILITY_ID).not.toBe(TRAVERSABLE_SQUARE_NICHE_ID);
	});

	it("the edge affordance carries touch/same-node range (0), matching core/walk_edge's own range_m", () => {
		expect(STEP_EDGE_RANGE_M).toBe(0);
	});
});

describe("stepAffordancePredicate", () => {
	it("composes an actor-capability AND target-niche gate, mirroring core/walk_edge's own shape — no occupancy read on the ambient default (ADR-0134 D-5)", () => {
		expect(stepAffordancePredicate()).toBe(
			"actor.has_capability('srd/capability/walk') && target.has_niche('srd/niche/traversable-square')",
		);
		expect(stepAffordancePredicate()).not.toContain("occupants_at");
	});
});

describe("gridStepAffordancePredicate", () => {
	it("is the ambient Step gate AND no living occupant on the destination (ADR-0134 D-5)", () => {
		expect(gridStepAffordancePredicate()).toBe(
			`${stepAffordancePredicate()} && occupants_at('to_node', 'srd/condition/dead') == 0`,
		);
		expect(GRID_STEP_AFFORDANCE_LOCAL_ID).toBe("affordance/grid-step");
	});

	it("excludes exactly the SRD Dead condition from the occupancy count — a corpse is an object, the kernel spells no condition id (ADR-0134 D-4)", () => {
		expect(STEP_BLOCKING_EXCLUDED_CONDITION_ID).toBe("srd/condition/dead");
		expect(gridStepAffordancePredicate()).toContain(
			`occupants_at('to_node', '${STEP_BLOCKING_EXCLUDED_CONDITION_ID}') == 0`,
		);
	});
});

describe("srd/speed-walk bounds", () => {
	it("initial value matches the sidebar's own worked example: 30 ft Speed / 5 = 6 cells", () => {
		expect(SPEED_WALK_INITIAL).toBe(30 / GRID_SQUARE_FEET);
	});

	it("min is 0 and max is a generous safety-bound ceiling, never a per-creature cap", () => {
		expect(SPEED_WALK_MIN).toBe(0);
		expect(SPEED_WALK_MAX).toBeGreaterThan(SPEED_WALK_INITIAL);
	});

	it("recovers persistently (a movement-reach fact, not a per-rest pool)", () => {
		expect(SPEED_WALK_RECOVERY_RULE).toBe("persistent");
	});

	it("binds over-reach travel to the srd-owned session definition", () => {
		expect(LONG_RUNNING_MOVE_SESSION_DEF_ID).toBe("srd/long_running_move");
		expect(STEP_EDGE_BINDINGS[LONG_RUNNING_MOVE_SESSION_BINDING]).toBe(
			LONG_RUNNING_MOVE_SESSION_DEF_ID,
		);
	});

	it("baseline entry cost stays 1 square — sanity cross-check against the sidebar's own reconciliation unit", () => {
		expect(GRID_ENTRY_COST_SQUARES).toBe(1);
	});
});
