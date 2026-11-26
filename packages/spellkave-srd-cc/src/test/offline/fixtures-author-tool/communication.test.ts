// Baseline communicate rows read through the author-facing query tool.
import { describe, expect, it } from "vitest";
import {
	SPEAK_CAPABILITY_ID,
	SPEAK_TO_AFFORDANCE_ID,
	TELEPATHY_AFFORDANCE_ID,
	TELEPATHY_CAPABILITY_ID,
	TELEPATHY_RANGE_M,
} from "../../../chapters/playing-the-game/fragments/speech";
import {
	BASELINE_COMMUNICATE_AFFORDANCE_ID,
	BASELINE_COMMUNICATE_CAPABILITY_ID,
	BASELINE_COMMUNICATE_NICHE_ID,
	BASELINE_COMMUNICATE_OUTCOME_ID,
	BASELINE_COMMUNICATE_SPEECH_ACT_ID,
	BUNDLE_ID,
} from "../../../chapters/playing-the-game/index";
import { buildTools, type QueryDetailResult, query } from "./harness";

describe("fixtures/ baseline communicate read through spellkave_query", () => {
	// ── Baseline communicate verb chain (self-sufficiency infra, level-up DM
	// arc S4a, D9 — srd-own chain, mirrors core/assert's shape) ──

	it("kind+id detail carries the full srd/communicate/assert/outcome row (communication_speech_act_id set, entity-directed)", async () => {
		const tools = buildTools();
		const detail = (await query(tools, {
			kind: "outcome_templates",
			id: BASELINE_COMMUNICATE_OUTCOME_ID,
			refs: "none",
		})) as QueryDetailResult;
		expect(detail.found, `expected ${BASELINE_COMMUNICATE_OUTCOME_ID} to be found`).toBe(true);
		const row = detail.row as Record<string, unknown>;
		expect(row.bundle_id).toBe(BUNDLE_ID);
		// The load-bearing field: candidates.rs's place-sentinel exclusion keys
		// on this being non-empty (see communication.ts's own module header).
		expect(row.communication_speech_act_id).toBe(BASELINE_COMMUNICATE_SPEECH_ACT_ID);
		expect(row.manipulation_action_id).toBe(BASELINE_COMMUNICATE_SPEECH_ACT_ID);
		expect(row.outcome_bool).toBe(true);
	});

	it("kind+id detail carries the srd/communicate/assert affordance, targeting the srd-own communicable niche", async () => {
		const tools = buildTools();
		const detail = (await query(tools, {
			kind: "affordance_templates",
			id: BASELINE_COMMUNICATE_AFFORDANCE_ID,
			refs: "none",
		})) as QueryDetailResult;
		expect(detail.found, `expected ${BASELINE_COMMUNICATE_AFFORDANCE_ID} to be found`).toBe(true);
		const row = detail.row as Record<string, unknown>;
		expect(row.bundle_id).toBe(BUNDLE_ID);
		expect(row.niche_id).toBe(BASELINE_COMMUNICATE_NICHE_ID);
		expect(row.capability_id).toBe(BASELINE_COMMUNICATE_CAPABILITY_ID);
		expect(row.outcome_template_id).toBe(BASELINE_COMMUNICATE_OUTCOME_ID);
	});

	it("kind+id detail carries the srd-own communicable niche, reusing srd.creature (never core/*)", async () => {
		const tools = buildTools();
		const detail = (await query(tools, {
			kind: "niche_definitions",
			id: BASELINE_COMMUNICATE_NICHE_ID,
			refs: "none",
		})) as QueryDetailResult;
		expect(detail.found, `expected ${BASELINE_COMMUNICATE_NICHE_ID} to be found`).toBe(true);
		const row = detail.row as Record<string, unknown>;
		expect(row.bundle_id).toBe(BUNDLE_ID);
		// Self-sufficiency (package invariant): the predicate is the DATA-level
		// reference surface — it reuses srd's own already-broad srd.creature tag,
		// never a core/*/phandelver/* id. (The row's own `description` prose
		// legitimately CITES core/social_communication for grounding, same as
		// `fragments/sensing.ts`'s own header — self-sufficiency governs
		// authored row DATA, not explanatory prose.)
		expect(row.predicate_source).toBe("target.has_niche('srd.creature')");
		// sk-0m4.4: entity-provided — r_manipulate skips attachment_presence.
		expect(row.provider).toBe("entity");
	});

	it("kind+id detail carries the srd/action/communicate/assert capability under bundle_id 'srd'", async () => {
		const tools = buildTools();
		const detail = (await query(tools, {
			kind: "capability_definitions",
			id: BASELINE_COMMUNICATE_CAPABILITY_ID,
			refs: "none",
		})) as QueryDetailResult;
		expect(detail.found, `expected ${BASELINE_COMMUNICATE_CAPABILITY_ID} to be found`).toBe(true);
		const row = detail.row as Record<string, unknown>;
		expect(row.bundle_id).toBe(BUNDLE_ID);
		expect(row.actor_kind).toBe("entity");
	});

	it('Speak Aloud\'s synthetic niche is provider="actor" (sk-0m4.4 — no place attachment)', async () => {
		const tools = buildTools();
		const detail = (await query(tools, {
			kind: "niche_definitions",
			id: `capability:${SPEAK_CAPABILITY_ID}`,
			refs: "none",
		})) as QueryDetailResult;
		expect(detail.found).toBe(true);
		const row = detail.row as Record<string, unknown>;
		expect(row.provider).toBe("actor");
		expect(row.predicate_source).toBe("");
	});

	it("Telepathy is a ranged directed communicate verb (sk-0m4.33)", async () => {
		const tools = buildTools();
		const detail = (await query(tools, {
			kind: "affordance_templates",
			id: TELEPATHY_AFFORDANCE_ID,
			refs: "none",
		})) as QueryDetailResult;
		expect(detail.found).toBe(true);
		const row = detail.row as Record<string, unknown>;
		expect(row.capability_id).toBe(TELEPATHY_CAPABILITY_ID);
		expect(row.niche_id).toBe(BASELINE_COMMUNICATE_NICHE_ID);
		expect(row.range_m).toBe(TELEPATHY_RANGE_M);
		expect(row.predicate_source).toBe("target.status('srd/condition/dead') == false");
	});

	it("Speak To refuses a dead addressee at offer time (sk-0m4.4 / run 6 slime corpse)", async () => {
		const tools = buildTools();
		const detail = (await query(tools, {
			kind: "affordance_templates",
			id: SPEAK_TO_AFFORDANCE_ID,
			refs: "none",
		})) as QueryDetailResult;
		expect(detail.found).toBe(true);
		const row = detail.row as Record<string, unknown>;
		expect(row.niche_id).toBe(BASELINE_COMMUNICATE_NICHE_ID);
		expect(row.predicate_source).toBe("target.status('srd/condition/dead') == false");
	});
});
