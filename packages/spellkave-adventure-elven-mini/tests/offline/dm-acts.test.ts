import { readFileSync } from "node:fs";
import { parse } from "smol-toml";
import { describe, expect, it } from "vitest";
import {
	ADVENTURE_CANDIDATE_DEF_ID,
	CREATION_LIMBO_NODE_ID,
} from "../../author/creation-candidate.ts";
import { adventureDmActs, COMMAND_BOND_CONDITION } from "../../author/dm-acts.ts";
import { COMPANION_ENTITY_KEYS } from "../../author/lib/entity-keys.ts";
import {
	questAcceptedState,
	questProgressActions,
	questRewardedState,
	questXpAwardedState,
} from "../../author/quest-progress.ts";
import { QUESTS } from "../../author/quests.ts";
import { authoredRogueCompanion, ROGUE_COMPANION_DEF_ID } from "../../author/rogue-companion.ts";
import { srdAuthorTarget } from "./srd-manifest.ts";

const calls = adventureDmActs();
function rows(kind: string) {
	return calls.flatMap((call) =>
		call.params.kind === kind ? (call.params.rows as Record<string, unknown>[]) : [],
	);
}
describe("finite adventure DM writes", () => {
	it("seeds each companion's XP home before receipt-bound quest awards", () => {
		const states = questProgressActions().flatMap((call) =>
			call.params.kind === "object_state" ? (call.params.rows as Record<string, unknown>[]) : [],
		);
		for (const entity_key of [COMPANION_ENTITY_KEYS.hesper, COMPANION_ENTITY_KEYS.caddoc]) {
			expect(
				states.filter((row) => row.entity_key === entity_key && row.state_id === "srd/xp"),
			).toEqual([expect.objectContaining({ value_int: 0, source_template_id: "manifest" })]);
		}
		const initial = authoredRogueCompanion(srdAuthorTarget()).flatMap((call) =>
			call.params.kind === "entity_definition_initial_state"
				? (call.params.rows as Record<string, unknown>[])
				: [],
		);
		expect(
			initial.filter(
				(row) => row.entity_def_id === ROGUE_COMPANION_DEF_ID && row.state_id === "srd/xp",
			),
		).toEqual([expect.objectContaining({ value_int: 0 })]);
		for (const quest of QUESTS)
			expect(initial.filter((row) => row.state_id === questXpAwardedState(quest.id))).toEqual([
				expect.objectContaining({ value_int: 0 }),
			]);
	});
	it("stages both supported descriptors through the authored open-seat act and actual blueprint/node", () => {
		for (const path of [
			new URL("../../adventures/elven-mini.toml", import.meta.url),
			new URL(
				"../../../spellkave-srd-cc/scripts/adventures/dm-creation-prequel.toml",
				import.meta.url,
			),
		]) {
			const descriptor = parse(readFileSync(path, "utf8"));
			expect(descriptor.player).toMatchObject({
				hero_seat_blueprint: ADVENTURE_CANDIDATE_DEF_ID,
				hero_seat_node: CREATION_LIMBO_NODE_ID,
				hero_seat_open_action: "elven_mini/dm/open-seat",
			});
			expect(descriptor.player).not.toHaveProperty("hero_actor_key");
		}
	});
	it("admits an unawarded recipient and reads the host's quest quantity only at consequence evaluation", () => {
		for (const quest of QUESTS) {
			const award = `elven_mini/dm/award-quest-xp/${quest.id}`;
			const settle = `elven_mini/dm/settle-quest/${quest.id}`;
			expect(
				rows("affordance_templates").find((row) => row.template_id === `${award}/affordance`)
					?.predicate_source,
			).toBe(
				`actor.has_capability('frontier.set_state') && target.stat('${questXpAwardedState(quest.id)}') == 0`,
			);
			const writes = (id: string) =>
				rows("consequence_frame_writes")
					.filter((row) => row.template_id === `${id}/success`)
					.map((row) => row.frame_write);
			expect(writes(award)).toEqual([
				{
					ModifyResource: {
						actor: "TargetActor",
						resource: "srd/xp",
						delta_source: "actor.stat('core/dispatch_arg_quantity')",
					},
				},
				{
					ModifyResource: {
						actor: "TargetActor",
						resource: questXpAwardedState(quest.id),
						delta_source: "1",
					},
				},
			]);
			expect(writes(settle)).toEqual([
				{
					ModifyResource: {
						actor: "TargetActor",
						resource: questRewardedState(quest.id),
						delta_source: "1",
					},
				},
				{
					ModifyResource: {
						actor: "TargetActor",
						resource: questAcceptedState(quest.id),
						delta_source: "1",
					},
				},
			]);
		}
	});
	it("materializes the spawned hero faction without writing protected party membership", () => {
		const action = calls.find((call) => call.label === "open-creation-seat");
		expect(action?.params.consequence).toMatchObject({
			effect_ref: "elven_mini/dm/open-seat/spawn",
			frame_writes: [
				{
					SetEntityTag: {
						entity: "SpawnedEntity",
						tag: { allowed_ids: ["srd.faction.party"] },
						present: true,
					},
				},
			],
		});
		expect(JSON.stringify(action?.params.consequence)).not.toContain("srd.party.heroes");
	});
	it("opens a world-owned unbound body from the fixed candidate blueprint", () => {
		const effect = rows("effect_definitions").find(
			(row) => row.effect_def_id === "elven_mini/dm/open-seat/spawn",
		);
		expect(effect?.primitives_csv).toBe("Spawn");
		expect(JSON.parse(String(effect?.parameters_schema_json))).toEqual({
			blueprint_id: ADVENTURE_CANDIDATE_DEF_ID,
			location_ref: { kind: "binding", id: "TargetSpatialRef" },
			unbound_actor: true,
		});
	});
	it("records bond outcomes without runtime capability or entity-tag writes", () => {
		const bonds = rows("consequence_frame_writes").filter((row) =>
			String(row.template_id).includes("bond"),
		);
		expect(bonds).toHaveLength(3);
		expect(bonds[0]?.frame_write).toEqual({
			ApplyStatus: {
				target_kind: "entity",
				target_ref: "TargetActor",
				condition_definition_id: COMMAND_BOND_CONDITION,
			},
		});
		for (const row of bonds.slice(1))
			expect(row.frame_write).toMatchObject({
				ModifyResource: { actor: "TargetActor", delta_source: "1" },
			});
		expect(rows("condition_capability_extent_grants")).toEqual([
			{
				bundle_id: "elven_mini",
				condition_definition_id: COMMAND_BOND_CONDITION,
				capability_id: "elven_mini/companion/command-bond",
				extent_kind_ref: "party",
				extent_ref: "elven_mini.companion.bond",
			},
		]);
		expect(calls.some((call) => call.params.kind === "actor_capabilities")).toBe(false);
		expect(JSON.stringify(calls)).not.toContain("entity:");
	});
});
