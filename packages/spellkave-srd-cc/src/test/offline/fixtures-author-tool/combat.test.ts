// The playable Unarmed Strike chain read through the author-facing query tool.
import { describe, expect, it } from "vitest";
import { WEAPON_ATTACK_RANGE_SLOT_ID } from "../../../chapters/equipment/weapon-damage-source-units";
import { WEAPON_RANGE_TAG_PREFIX } from "../../../chapters/equipment/weapon-tag-values";
import {
	PRIMARY_CHANNEL_ID,
	REACTION_CHANNEL_ID,
} from "../../../chapters/playing-the-game/action-economy-units";
import { BUNDLE_ID } from "../../../chapters/playing-the-game/index";
import { REACH_RESOURCE_ID } from "../../../chapters/playing-the-game/reach-units";
import {
	ATTACK_ACTION_CAPABILITY_SUFFIX,
	OPPORTUNITY_ATTACK_ACTION_SUFFIX,
	UNARMED_STRIKE_DAMAGE_ACTION_SUFFIX,
	UNARMED_STRIKE_DAMAGE_DISPLAY_NAME,
} from "../../../chapters/playing-the-game/unarmed-strike-units";
import {
	ATTACK_VERB_NICHE_LOCAL_ID,
	MELEE_ATTACK_LOCAL_ID,
	MELEE_ATTACK_RANGE_METERS,
	RANGED_ATTACK_LOCAL_ID,
	RANGED_ATTACK_RANGE_METERS,
	UNARMED_ATTACK_RANGE_METERS,
} from "../../../chapters/playing-the-game/weapon-attack-units";
import { buildTools, type QueryDetailResult, type QueryListResult, query } from "./harness";

describe("fixtures/ combat verbs read through spellkave_query", () => {
	it("carries the playable Unarmed Strike Damage action/affordance chain over the actor-provided attack-verb niche", async () => {
		const tools = buildTools();
		const actionId = `${BUNDLE_ID}/${UNARMED_STRIKE_DAMAGE_ACTION_SUFFIX}`;
		const capabilityId = `${BUNDLE_ID}/${ATTACK_ACTION_CAPABILITY_SUFFIX}`;
		const actionDetail = (await query(tools, {
			kind: "action_definitions",
			id: actionId,
			refs: "none",
		})) as QueryDetailResult;
		expect(actionDetail.found).toBe(true);
		const actionRow = actionDetail.row as Record<string, unknown>;
		expect(actionRow.required_capability).toBe(capabilityId);
		expect(actionRow.on_success).toBe(`${actionId}/success`);
		expect(actionRow.display_name).toBe(UNARMED_STRIKE_DAMAGE_DISPLAY_NAME);

		expect(actionRow.on_failure).toBe(`${actionId}/miss`);
		// Issue #2093 (root-caused via findings #70/#71, substrate
		// genus = tracker #1891): the to-hit d20 lives in the act-time
		// Stochastic resolution, NEVER in the offer predicate — a stochastic
		// offer term is rolled by the materialiser with live entropy and
		// silently hides live, in-range targets from the player surface.
		expect(actionRow.resolution_mode).toBe("Stochastic");
		expect(String(actionRow.resolution_predicate_source)).toContain("target.effective('srd/ac')");
		expect(String(actionRow.resolution_predicate_source)).toContain(
			"actor.stat('srd/proficiency_bonus')",
		);
		expect(String(actionRow.resolution_predicate_source)).not.toContain("actor.stat('srd/level')");

		const affordanceDetail = (await query(tools, {
			kind: "affordance_templates",
			id: `${actionId}/affordance`,
			refs: "none",
		})) as QueryDetailResult;
		expect(affordanceDetail.found).toBe(true);
		const affordanceRow = affordanceDetail.row as Record<string, unknown>;
		expect(affordanceRow.capability_id).toBe(capabilityId);
		expect(affordanceRow.niche_id).toBe(`${BUNDLE_ID}/${ATTACK_VERB_NICHE_LOCAL_ID}`);
		expect(Number(affordanceRow.range_m)).toBeCloseTo(UNARMED_ATTACK_RANGE_METERS, 3);
		// AC remains an act-time resolution input, never an offer-time doorman.
		// Reach is deterministic actor state, so it belongs in admission.
		expect(affordanceRow.predicate_bool).toBe(false);
		expect(String(affordanceRow.predicate_source)).toContain(
			`actor.effective('${REACH_RESOURCE_ID}')`,
		);

		const consequenceDetail = (await query(tools, {
			kind: "consequence_templates",
			id: `${actionId}/success`,
			refs: "none",
		})) as QueryDetailResult;
		expect(consequenceDetail.found).toBe(true);
		const missDetail = (await query(tools, {
			kind: "consequence_templates",
			id: `${actionId}/miss`,
			refs: "none",
		})) as QueryDetailResult;
		expect(missDetail.found).toBe(true);
	});

	it("carries Opportunity Attack as an event-triggered reaction over the owned reaction channel", async () => {
		const tools = buildTools();
		const actionId = `${BUNDLE_ID}/${OPPORTUNITY_ATTACK_ACTION_SUFFIX}`;
		const detail = (await query(tools, {
			kind: "action_definitions",
			id: actionId,
			refs: "none",
		})) as QueryDetailResult;
		expect(detail.found).toBe(true);
		const row = detail.row as Record<string, unknown>;
		expect(row.spends_channel).toBe(REACTION_CHANNEL_ID);
		expect(row.reaction_trigger).toBe("$event.kind == 'r_move' && $event.detail.on_exit == 'true'");
		expect(row.reaction_eligibility).toBe(
			"actor.has_capability('srd/action/attack')" +
				" && actor.stat('core/distance_to_departed_mm') <= actor.stat('srd/reach_mm')" +
				" && actor.stat('core/distance_to_destination_mm') > actor.stat('srd/reach_mm')" +
				" && target.has_capability('srd/action/disengage') == false" +
				" && actor.status('srd/condition/addled') == false",
		);
		expect(Number(row.reaction_window_ms)).toBe(30_000);
		expect(row.resolution_mode).toBe("Stochastic");
		expect(String(row.resolution_predicate_source)).toContain("target.effective('srd/ac')");
		// sk-dms.40.1: a MONSTER reactor has the baked srd/proficiency_bonus
		// stat and no srd/level. The to-hit predicate must read that stat
		// directly — the old macro-over-srd/level route fail-closed as
		// UnknownField and never committed a hit or miss.
		expect(String(row.resolution_predicate_source)).toContain(
			"actor.stat('srd/proficiency_bonus')",
		);
		expect(String(row.resolution_predicate_source)).not.toContain("actor.stat('srd/level')");
		expect(String(row.resolution_predicate_source)).not.toContain("macro('srd/proficiency_bonus'");
		expect(row.on_failure).toBe(`${actionId}/miss`);
		const affordance = (await query(tools, {
			kind: "affordance_templates",
			id: `${actionId}/affordance`,
			refs: "none",
		})) as QueryDetailResult;
		// sk-9ll.6: spends_channel is authored on BOTH rows — r_react/
		// reaction_producer's off-turn metering reads action_definitions.
		// spends_channel (checked above), while an on-turn manipulate's budget
		// gate reads the resolved affordance_template's own copy.
		expect((affordance.row as Record<string, unknown>).spends_channel).toBe(REACTION_CHANNEL_ID);
		expect(String((affordance.row as Record<string, unknown>).predicate_source)).toContain(
			"actor.effective('srd/reach_mm')",
		);
		expect(String((affordance.row as Record<string, unknown>).predicate_source)).not.toContain(
			WEAPON_ATTACK_RANGE_SLOT_ID,
		);

		const miss = (await query(tools, {
			kind: "consequence_templates",
			id: `${actionId}/miss`,
			refs: "none",
		})) as QueryDetailResult;
		expect(miss.found).toBe(true);
	});

	// ── combat-arena proof, Slice A (ledger/designs/combat-arena-proof.md) ────

	it('niche/attack-verb is provider="actor" with a trivial predicate (actor-carried-verbs D1/D7, replaces the retired srd/niche/strikeable)', async () => {
		const tools = buildTools();
		const nicheId = `${BUNDLE_ID}/${ATTACK_VERB_NICHE_LOCAL_ID}`;
		const detail = (await query(tools, {
			kind: "niche_definitions",
			id: nicheId,
			refs: "none",
		})) as QueryDetailResult;
		expect(detail.found).toBe(true);
		const row = detail.row as Record<string, unknown>;
		expect(row.provider).toBe("actor");
		expect(row.predicate_source).toBe("");

		// The retired niche no longer has a niche_definitions row at all.
		const retired = (await query(tools, {
			kind: "niche_definitions",
			id: "srd/niche/strikeable",
			refs: "none",
		})) as QueryDetailResult;
		expect(retired.found).toBe(false);
	});

	for (const [suffix, rangeMeters, ability, rangeClass] of [
		[MELEE_ATTACK_LOCAL_ID, MELEE_ATTACK_RANGE_METERS, "srd/str", "melee"],
		[RANGED_ATTACK_LOCAL_ID, RANGED_ATTACK_RANGE_METERS, "srd/dex", "ranged"],
	] as const) {
		it(`carries the playable ${suffix} action/affordance chain over the actor-provided attack-verb niche`, async () => {
			const tools = buildTools();
			const actionId = `${BUNDLE_ID}/${suffix}`;
			const actionDetail = (await query(tools, {
				kind: "action_definitions",
				id: actionId,
				refs: "none",
			})) as QueryDetailResult;
			expect(actionDetail.found).toBe(true);
			const actionRow = actionDetail.row as Record<string, unknown>;
			expect(actionRow.required_capability).toBe(`${BUNDLE_ID}/${ATTACK_ACTION_CAPABILITY_SUFFIX}`);
			expect(actionRow.spends_channel).toBe(PRIMARY_CHANNEL_ID);
			// Findings #70/#71 (fragments/attacks.ts's own header note; substrate
			// genus = tracker #1891): the to-hit d20 lives in the act-time
			// Stochastic resolution, NEVER in the offer predicate — a stochastic
			// offer term is rolled by the materialiser with live entropy and
			// silently hides live, in-range targets from the player surface.
			expect(actionRow.resolution_mode).toBe("Stochastic");
			const attackSource = String(actionRow.resolution_predicate_source);
			expect(attackSource).toContain("macro('srd/ability_modifier'");
			expect(attackSource).toContain(`actor.effective('${ability}')`);
			expect(attackSource).not.toContain(`actor.stat('${ability}')`);
			expect(String(actionRow.resolution_predicate_source)).toContain("target.effective('srd/ac')");
			expect(actionRow.on_failure).toBe(`${actionId}/miss`);

			const affordanceDetail = (await query(tools, {
				kind: "affordance_templates",
				id: `${actionId}/affordance`,
				refs: "none",
			})) as QueryDetailResult;
			expect(affordanceDetail.found).toBe(true);
			const affordanceRow = affordanceDetail.row as Record<string, unknown>;
			// sk-9ll.6: spends_channel is authored on BOTH rows — see the
			// spends_channel_placement param's own doc comment for why.
			expect(affordanceRow.spends_channel).toBe(PRIMARY_CHANNEL_ID);
			expect(affordanceRow.niche_id).toBe(`${BUNDLE_ID}/${ATTACK_VERB_NICHE_LOCAL_ID}`);
			expect(affordanceRow.capability_id).toBe(`${BUNDLE_ID}/${ATTACK_ACTION_CAPABILITY_SUFFIX}`);
			expect(Number(affordanceRow.range_m)).toBeCloseTo(rangeMeters, 3);
			expect(String(affordanceRow.predicate_source)).toContain(
				`actor.equipped_item('srd/slot/main-hand').has_tag('${WEAPON_RANGE_TAG_PREFIX}.${rangeClass}')`,
			);
			if (rangeClass === "melee") {
				expect(String(affordanceRow.predicate_source)).toContain("actor.effective('srd/reach_mm')");
				expect(String(affordanceRow.predicate_source)).not.toContain(WEAPON_ATTACK_RANGE_SLOT_ID);
			} else {
				expect(String(affordanceRow.predicate_source)).toContain(
					`actor.equipped_item('srd/slot/main-hand').source('${WEAPON_ATTACK_RANGE_SLOT_ID}')`,
				);
			}
			expect(String(affordanceRow.predicate_source)).not.toContain("srd/ac");

			const consequenceDetail = (await query(tools, {
				kind: "consequence_templates",
				id: `${actionId}/success`,
				refs: "none",
			})) as QueryDetailResult;
			expect(consequenceDetail.found).toBe(true);
			const missDetail = (await query(tools, {
				kind: "consequence_templates",
				id: `${actionId}/miss`,
				refs: "none",
			})) as QueryDetailResult;
			expect(missDetail.found).toBe(true);
		});
	}

	it("kind=affordance_templates lists BOTH melee and ranged over the shared actor-provided attack-verb niche", async () => {
		const tools = buildTools();
		const list = (await query(tools, {
			kind: "affordance_templates",
			bundle: BUNDLE_ID,
		})) as QueryListResult;
		const ids = list.items.map((i) => i.id);
		expect(ids).toContain(`${BUNDLE_ID}/${MELEE_ATTACK_LOCAL_ID}/affordance`);
		expect(ids).toContain(`${BUNDLE_ID}/${RANGED_ATTACK_LOCAL_ID}/affordance`);
	});
});
