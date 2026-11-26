// Baseline sensing rows read through the author-facing query tool.
import { describe, expect, it } from "vitest";

import {
	BASELINE_SENSING_NICHE_ID,
	BUNDLE_ID,
	SENSE_LOOK_AFFORDANCE_ID,
	SENSE_LOOK_OUTCOME_ID,
	SENSE_LOOK_SAME_SUBSTRATE_AFFORDANCE_ID,
} from "../../../chapters/playing-the-game/index";
import { buildTools, type QueryDetailResult, type QueryListResult, query } from "./harness";

describe("fixtures/ baseline sensing read through spellkave_query", () => {
	// ── Baseline sensing verb chain (self-sufficiency infra, finding
	// #49; canon-warden redirect on #2032 — srd-own chain, not "core" genesis) ──

	it("kind+id detail carries the full srd/sense/look/outcome row (sense_query_kind = look, no manipulation_action_id)", async () => {
		const tools = buildTools();
		const detail = (await query(tools, {
			kind: "outcome_templates",
			id: SENSE_LOOK_OUTCOME_ID,
			refs: "none",
		})) as QueryDetailResult;
		expect(detail.found, `expected ${SENSE_LOOK_OUTCOME_ID} to be found`).toBe(true);
		const row = detail.row as Record<string, unknown>;
		expect(row.bundle_id).toBe(BUNDLE_ID);
		expect(row.sense_query_kind).toBe("look");
		// `skip_serializing_if = "String::is_empty"` (OutcomeTemplateRow): an empty
		// manipulation_action_id is OMITTED from the row entirely, not carried as
		// `""` — the passive/PERCEIVE-class signal this test's own name asserts.
		expect(row.manipulation_action_id).toBeUndefined();
		expect(row.discovery_validated).toBe(true);
		expect(String(row.description).trim().length).toBeGreaterThan(0);
	});

	it("kind+id detail carries both srd/sense/look affordance_templates rows, sharing the srd-own niche and outcome", async () => {
		const tools = buildTools();
		for (const [id, predicateExpectedNonEmpty] of [
			[SENSE_LOOK_AFFORDANCE_ID, false],
			[SENSE_LOOK_SAME_SUBSTRATE_AFFORDANCE_ID, true],
		] as const) {
			const detail = (await query(tools, {
				kind: "affordance_templates",
				id,
				refs: "none",
			})) as QueryDetailResult;
			expect(detail.found, `expected ${id} to be found`).toBe(true);
			const row = detail.row as Record<string, unknown>;
			expect(row.bundle_id).toBe(BUNDLE_ID);
			// srd-own niche (self-sufficiency): NOT the "core" bundle's own
			// `core/sense_query` — see `fragments/sensing.ts`'s
			// `buildBaselineSensingFragment`
			// doc comment for the full grep-verified grounding this constant's
			// name records.
			expect(row.niche_id).toBe(BASELINE_SENSING_NICHE_ID);
			expect(row.outcome_template_id).toBe(SENSE_LOOK_OUTCOME_ID);
			expect(row.capability_id).toBe("");
			expect(String(row.predicate_source).length > 0).toBe(predicateExpectedNonEmpty);
		}
	});

	it("no action_definitions row exists for srd/sense/look (passive/PERCEIVE-class, not manipulation-dispatched — unlike every generic-check verb, which DOES pair one)", async () => {
		const tools = buildTools();
		const list = (await query(tools, {
			kind: "action_definitions",
			bundle: BUNDLE_ID,
		})) as QueryListResult;
		expect(list.shape).toBe("list");
		expect(list.items.map((i) => i.id)).not.toContain(SENSE_LOOK_AFFORDANCE_ID);
		expect(list.items.map((i) => i.id)).not.toContain(SENSE_LOOK_SAME_SUBSTRATE_AFFORDANCE_ID);
		expect(list.items.some((i) => i.id.startsWith("srd/sense/look"))).toBe(false);
	});
});
