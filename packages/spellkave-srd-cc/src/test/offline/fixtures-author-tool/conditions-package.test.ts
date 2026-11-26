// CONDITIONS PACKAGE (Poisoned, Charmed, Frightened, Grappled) read through
// the author-facing query tool. Incapacitated/Dead/Prone's own coverage stays
// in the neighbouring `conditions.test.ts` — Prone moved there because the
// merge resolution (`character` branch x `srd-cc` main) kept origin/main's
// more-mechanized `condition:prone` shape (`fragments/conditions.ts`'s own
// header note); this package's own four conditions are unaffected.
import { describe, expect, it } from "vitest";

import {
	CHARMED_CONDITION_ID,
	FRIGHTENED_ABILITY_CHECK_DISADVANTAGE_CONDITION_ID,
	FRIGHTENED_ABILITY_CHECK_DISADVANTAGE_MODIFIER_ID,
	FRIGHTENED_ATTACK_DISADVANTAGE_MODIFIER_ID,
	FRIGHTENED_CONDITION_ID,
	GRAPPLED_ATTACK_DISADVANTAGE_MODIFIER_ID,
	GRAPPLED_CONDITION_ID,
	POISONED_ABILITY_CHECK_DISADVANTAGE_CONDITION_ID,
	POISONED_ABILITY_CHECK_DISADVANTAGE_MODIFIER_ID,
	POISONED_ATTACK_DISADVANTAGE_MODIFIER_ID,
	POISONED_CONDITION_ID,
} from "../../../chapters/playing-the-game/fragments/conditions";
import { BUNDLE_ID } from "../../../chapters/playing-the-game/index";
import {
	ABILITY_CHECK_RESOLUTION_SCOPE_ID,
	ATTACK_ROLL_RESOLUTION_SCOPE_ID,
} from "../../../chapters/playing-the-game/resolution-scope-units";
import { buildTools, type QueryDetailResult, query } from "./harness";

describe("fixtures/ CONDITIONS PACKAGE read through spellkave_query", () => {
	it("Poisoned SHIPS clean: attack-roll Disadvantage on this row, NO implies edge (removability finding — see conditions-units.ts)", async () => {
		const tools = buildTools();
		const detail = (await query(tools, {
			kind: "condition_definitions",
			id: POISONED_CONDITION_ID,
			refs: "none",
		})) as QueryDetailResult;
		expect(detail.found).toBe(true);
		const row = detail.row as Record<string, unknown>;
		expect(row.modifier_template_id).toBe(POISONED_ATTACK_DISADVANTAGE_MODIFIER_ID);
		expect(row.implies).toEqual([]);

		const modifierDetail = (await query(tools, {
			kind: "modifier_templates",
			id: POISONED_ATTACK_DISADVANTAGE_MODIFIER_ID,
			refs: "none",
		})) as QueryDetailResult;
		expect(modifierDetail.found).toBe(true);
		const modifierRow = modifierDetail.row as Record<string, unknown>;
		expect(modifierRow.applies_to).toBe(ATTACK_ROLL_RESOLUTION_SCOPE_ID);
		expect(modifierRow.delta_kind).toBe("Disadvantage");
	});

	it("Poisoned's ability-check-disadvantage sibling is a SEPARATE top-level row (unobservable, no implies edge either), carrying the srd/ability_check Disadvantage", async () => {
		const tools = buildTools();
		const detail = (await query(tools, {
			kind: "condition_definitions",
			id: POISONED_ABILITY_CHECK_DISADVANTAGE_CONDITION_ID,
			refs: "none",
		})) as QueryDetailResult;
		expect(detail.found).toBe(true);
		const row = detail.row as Record<string, unknown>;
		expect(row.observable).toBe(false);
		expect(row.implies).toEqual([]);
		expect(row.modifier_template_id).toBe(POISONED_ABILITY_CHECK_DISADVANTAGE_MODIFIER_ID);

		const modifierDetail = (await query(tools, {
			kind: "modifier_templates",
			id: POISONED_ABILITY_CHECK_DISADVANTAGE_MODIFIER_ID,
			refs: "none",
		})) as QueryDetailResult;
		const modifierRow = modifierDetail.row as Record<string, unknown>;
		expect(modifierRow.applies_to).toBe(ABILITY_CHECK_RESOLUTION_SCOPE_ID);
		expect(modifierRow.delta_kind).toBe("Disadvantage");
	});

	it("Charmed is identity-only: zero modifiers, empty implies (both sub-effects need the absent source-identity read)", async () => {
		const tools = buildTools();
		const detail = (await query(tools, {
			kind: "condition_definitions",
			id: CHARMED_CONDITION_ID,
			refs: "none",
		})) as QueryDetailResult;
		expect(detail.found).toBe(true);
		const row = detail.row as Record<string, unknown>;
		expect(row.modifier_template_id).toBe("");
		expect(row.implies).toEqual([]);
		expect(row.gate_predicate_source).toBe("");
	});

	it("Frightened ships the SAME twin-condition shape as Poisoned (over-broad — no line-of-sight gate; no implies edge, same removability finding)", async () => {
		const tools = buildTools();
		const detail = (await query(tools, {
			kind: "condition_definitions",
			id: FRIGHTENED_CONDITION_ID,
			refs: "none",
		})) as QueryDetailResult;
		expect(detail.found).toBe(true);
		const row = detail.row as Record<string, unknown>;
		expect(row.modifier_template_id).toBe(FRIGHTENED_ATTACK_DISADVANTAGE_MODIFIER_ID);
		expect(row.implies).toEqual([]);

		const subDetail = (await query(tools, {
			kind: "condition_definitions",
			id: FRIGHTENED_ABILITY_CHECK_DISADVANTAGE_CONDITION_ID,
			refs: "none",
		})) as QueryDetailResult;
		expect(subDetail.found).toBe(true);
		const subRow = subDetail.row as Record<string, unknown>;
		expect(subRow.observable).toBe(false);
		expect(subRow.modifier_template_id).toBe(FRIGHTENED_ABILITY_CHECK_DISADVANTAGE_MODIFIER_ID);
	});

	it("Grappled ships only the attack-roll Disadvantage; Speed 0 remains a separate content slice after the effective-reach substrate fix", async () => {
		const tools = buildTools();
		const detail = (await query(tools, {
			kind: "condition_definitions",
			id: GRAPPLED_CONDITION_ID,
			refs: "none",
		})) as QueryDetailResult;
		expect(detail.found).toBe(true);
		const row = detail.row as Record<string, unknown>;
		expect(row.modifier_template_id).toBe(GRAPPLED_ATTACK_DISADVANTAGE_MODIFIER_ID);
		expect(row.implies).toEqual([]);

		// Grappled still has only the attack-roll modifier (no speed-zero template).
		// srd/speed-walk axis may exist bundle-wide via Unarmored Movement (martial L1-4).
		const speedModDetail = (await query(tools, {
			kind: "modifier_templates",
			id: `${BUNDLE_ID}/condition/grappled/speed-zero`,
			refs: "none",
		})) as QueryDetailResult;
		expect(speedModDetail.found).toBe(false);
	});

	it("every shipped Disadvantage modifier across this package's four conditions is 'let'-wrapped (delta_kind bypasses expression eval, authoring-time parsing still needs a well-formed expression; Prone's own equivalent check lives in conditions.test.ts)", async () => {
		const tools = buildTools();
		for (const modifierId of [
			POISONED_ATTACK_DISADVANTAGE_MODIFIER_ID,
			POISONED_ABILITY_CHECK_DISADVANTAGE_MODIFIER_ID,
			FRIGHTENED_ATTACK_DISADVANTAGE_MODIFIER_ID,
			FRIGHTENED_ABILITY_CHECK_DISADVANTAGE_MODIFIER_ID,
			GRAPPLED_ATTACK_DISADVANTAGE_MODIFIER_ID,
		]) {
			const detail = (await query(tools, {
				kind: "modifier_templates",
				id: modifierId,
				refs: "none",
			})) as QueryDetailResult;
			expect(detail.found, `expected ${modifierId} to be found`).toBe(true);
			const row = detail.row as Record<string, unknown>;
			expect(row.modifier_expression_source).toBe("let unused = 0; unused");
			expect(row.delta_kind).toBe("Disadvantage");
		}
	});
});
