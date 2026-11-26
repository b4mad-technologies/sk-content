// The generic SRD walking-edge chain read through the author-facing query tool.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FIXTURE_ROOT as KAVEMOUTH_FIXTURES } from "../../../../../spellkave-adventure-kavemouth/author/lib/paths";

import {
	GRID_STEP_AFFORDANCE_ID,
	STANDARD_COMBAT_GRID_CELL_SIZE_M,
	STANDARD_COMBAT_GRID_DISTANCE_METRIC_ID,
	STANDARD_COMBAT_GRID_EDGE_BINDINGS_JSON,
	STANDARD_COMBAT_GRID_HEIGHT,
	STANDARD_COMBAT_GRID_ID,
	STANDARD_COMBAT_GRID_TOPOLOGY,
	STANDARD_COMBAT_GRID_WIDTH,
	STEP_AFFORDANCE_ID,
} from "../../../chapters/playing-the-game/fragments/grid";
import { BUNDLE_ID } from "../../../chapters/playing-the-game/index";
import { buildTools, type QueryDetailResult, query } from "./harness";

describe("fixtures/ walking-edge chain read through spellkave_query", () => {
	it("srd/speed-walk resource carries the sidebar's own 30ft/6-cell baseline", async () => {
		const tools = buildTools();
		const detail = (await query(tools, {
			kind: "resource_definitions",
			id: `${BUNDLE_ID}/speed-walk`,
			refs: "none",
		})) as QueryDetailResult;
		expect(detail.found).toBe(true);
		const row = detail.row as Record<string, unknown>;
		expect(Number(row.initial_value)).toBe(6);
		expect(Number(row.min_value)).toBe(0);
		expect(row.recovery_rule).toBe("persistent");
	});

	it("srd/outcome/step carries movement_descriptor = 'move' (r_move's own dispatch field)", async () => {
		const tools = buildTools();
		const detail = (await query(tools, {
			kind: "outcome_templates",
			id: `${BUNDLE_ID}/outcome/step`,
			refs: "none",
		})) as QueryDetailResult;
		expect(detail.found).toBe(true);
		const row = detail.row as Record<string, unknown>;
		expect(row.movement_descriptor).toBe("move");
	});

	it("srd/affordance/step gates on the bare walk capability AND the bare traversable niche, range 0 — and reads no occupancy (the ambient movement default)", async () => {
		const tools = buildTools();
		const detail = (await query(tools, {
			kind: "affordance_templates",
			id: `${BUNDLE_ID}/affordance/step`,
			refs: "none",
		})) as QueryDetailResult;
		expect(detail.found).toBe(true);
		const row = detail.row as Record<string, unknown>;
		expect(row.capability_id).toBe("srd/capability/walk");
		expect(row.niche_id).toBe("srd/niche/traversable-square");
		// ADR-0134 D-5: ambient nodes keep free co-location, so the template
		// every ordinary place edge inherits carries no occupants_at clause.
		expect(row.predicate_source).toBe(
			"actor.has_capability('srd/capability/walk') && target.has_niche('srd/niche/traversable-square')",
		);
		expect(Number(row.range_m)).toBe(0);
		expect(row.outcome_template_id).toBe(`${BUNDLE_ID}/outcome/step`);
	});

	it("srd/affordance/grid-step is Step's gate plus the occupancy clause, same outcome and cost expression (ADR-0134 D-5)", async () => {
		const tools = buildTools();
		const step = (await query(tools, {
			kind: "affordance_templates",
			id: STEP_AFFORDANCE_ID,
			refs: "none",
		})) as QueryDetailResult;
		const detail = (await query(tools, {
			kind: "affordance_templates",
			id: GRID_STEP_AFFORDANCE_ID,
			refs: "none",
		})) as QueryDetailResult;
		expect(detail.found).toBe(true);
		const row = detail.row as Record<string, unknown>;
		const stepRow = step.row as Record<string, unknown>;
		expect(row.capability_id).toBe(stepRow.capability_id);
		expect(row.niche_id).toBe(stepRow.niche_id);
		expect(row.outcome_template_id).toBe(stepRow.outcome_template_id);
		expect(row.movement_cost_expression_source).toBe(stepRow.movement_cost_expression_source);
		// A living creature blocks its cell, a corpse (srd/condition/dead)
		// does not — in place of the retired kernel destination-occupancy veto.
		expect(row.predicate_source).toBe(
			`${stepRow.predicate_source} && occupants_at('to_node', 'srd/condition/dead') == 0`,
		);
	});

	it("ships the open 10x10 combat grid as reusable srd content", async () => {
		const tools = buildTools();
		const detail = (await query(tools, {
			kind: "combat_grid_blueprints",
			id: STANDARD_COMBAT_GRID_ID,
			refs: "none",
		})) as QueryDetailResult;
		expect(detail.found).toBe(true);
		const row = detail.row as Record<string, unknown>;
		expect(row.bundle_id).toBe(BUNDLE_ID);
		expect(Number(row.width)).toBe(STANDARD_COMBAT_GRID_WIDTH);
		expect(Number(row.height)).toBe(STANDARD_COMBAT_GRID_HEIGHT);
		expect(row.topology).toBe(STANDARD_COMBAT_GRID_TOPOLOGY);
		expect(Number(row.cell_size_m)).toBeCloseTo(STANDARD_COMBAT_GRID_CELL_SIZE_M, 5);
		// ADR-0134 D-5: the blueprint binds the occupancy-gated grid template,
		// never the ambient movement default.
		expect(row.edge_affordance_template_id).toBe(GRID_STEP_AFFORDANCE_ID);
		expect(row.edge_affordance_template_id).toBe(`${BUNDLE_ID}/affordance/grid-step`);
		expect(row.edge_affordance_bindings_json).toBe(STANDARD_COMBAT_GRID_EDGE_BINDINGS_JSON);
		expect(row.edge_overrides_json).toBe("[]");
		// ADR-0134 D-1/D-5: SRD 5.2 counts every grid step as 5 ft, so the
		// blueprint names the Chebyshev metric (a diagonal neighbour is one
		// cell, 1524 mm, for reach, movement cost and reactions alike), and
		// it gates occupancy through the step template rather than stating
		// that actors may stack.
		expect(row.distance_metric_id).toBe(STANDARD_COMBAT_GRID_DISTANCE_METRIC_ID);
		expect(row.distance_metric_id).toBe("core/metric/chebyshev");
		expect(row.accepts_stacked_occupancy).toBe(false);
	});

	it("uses srd/affordance/step for ordinary place edges as well as tactical grids", () => {
		const hamlet = readFileSync(join(KAVEMOUTH_FIXTURES, "hamlet.manifest.toml"), "utf8");
		expect(hamlet).toContain('edge_key = "kavemouth/hamlet/gate->kavemouth/hamlet/square"');
		expect(hamlet).toContain('affordance_template_id = "srd/affordance/step"');
	});

	it("keeps the shared combat-grid policy out of the kavemouth adventure bundle", () => {
		const cryptFight = readFileSync(
			join(KAVEMOUTH_FIXTURES, "adventure/combat/crypt-fight.toml"),
			"utf8",
		);
		const adventureNiches = readFileSync(
			join(KAVEMOUTH_FIXTURES, "adventure/world/niches.toml"),
			"utf8",
		);
		expect(cryptFight).not.toContain("[[combat_grid_blueprints]]");
		expect(cryptFight).toContain(`combat_grid_blueprint_id = "${STANDARD_COMBAT_GRID_ID}"`);
		expect(adventureNiches).not.toContain('niche_id = "srd/niche/traversable-square"');
	});

	it("srd/long_running_move session definition exists for over-reach travel", async () => {
		const tools = buildTools();
		const detail = (await query(tools, {
			kind: "session_definitions",
			id: `${BUNDLE_ID}/long_running_move`,
			refs: "none",
		})) as QueryDetailResult;
		expect(detail.found).toBe(true);
		const row = detail.row as Record<string, unknown>;
		expect(row.turn_rule).toBe("Sequential");
		expect(Number(row.round_duration_ms)).toBe(6000);
		expect(row.turn_scheduler_id ?? "").toBe("");
		expect(row.termination_pred).toBe(
			"world.tick - session.stat('opened_at') >= session.stat('promoted_duration_ticks')",
		);
	});
});
