// Offline identity proof for the Part C live proof scene
// (`src/chapters/playing-the-game/proof-scene/`) — the SAME author-tool-
// surface approach `fixtures-author-tool/harness.ts` uses for the shipped
// identity bundle, applied to the (unshipped) proof scene's own generated
// TOML. The committed live proof is review-split into a small root plus
// thematic include fragments; this test queries the same verb-authored scene
// before that layout-only split, through the exact `spellkave_query` tool a
// modding agent would call.
//
// Cross-bundle referential correctness (does `entity_definition_initial_
// state`'s `srd/str`/`srd/wis` and `entity_definition_initial_capability`'s
// `srd/skill/perception` actually resolve against the base bundle?) is
// proven in `pipeline.test.ts`'s flatten-and-validate test, NOT here —
// `spellkave_query` cannot list/detail those satellite row kinds at all (no
// registered natural key; see ledger/findings.md). This file only proves
// what the tool CAN see: the entity_definitions/entities/place_nodes parent
// rows the scene authors.
import {
	type AuthorToolContext,
	type AuthorWorkspace,
	queryToolDef,
} from "@spellkave/tool-authoring";
import { createLocalAuthorTarget } from "@spellkave/tool-node/authoring";
import { bindTool } from "@spellkave/tool-runtime";
import { beforeAll, describe, expect, it } from "vitest";
import {
	OBJECT_INTERACTION_CHANNEL_ID,
	PRIMARY_CHANNEL_ID,
} from "../../chapters/playing-the-game/action-economy-units";
import { CREATURE_NICHE_TAG } from "../../chapters/playing-the-game/creature-type-units";
import { INCAPACITATED_CONDITION_ID } from "../../chapters/playing-the-game/fragments/conditions";
import { DROP_PRONE_CAPABILITY_ID } from "../../chapters/playing-the-game/fragments/drop-prone";
import { GRID_STEP_AFFORDANCE_ID } from "../../chapters/playing-the-game/fragments/grid";
import {
	STEP_EDGE_BINDINGS_JSON,
	WALK_CAPABILITY_ID,
} from "../../chapters/playing-the-game/grid-units";
import { BUNDLE_ID } from "../../chapters/playing-the-game/index";
import {
	ARENA_ANCHOR_NODE_ID,
	ARENA_BLUEPRINT_ID,
	ARENA_DIFFICULT_TERRAIN_COST_CELLS,
	ARENA_DIFFICULT_TERRAIN_FROM_LOCAL,
	ARENA_DIFFICULT_TERRAIN_LABEL,
	ARENA_DIFFICULT_TERRAIN_TO_LOCAL,
	ARENA_GOBLIN_A_DEF_ID,
	ARENA_GOBLIN_AC,
	ARENA_GOBLIN_B_DEF_ID,
	ARENA_GOBLIN_C_DEF_ID,
	ARENA_GOBLIN_DEX,
	ARENA_GOBLIN_HP,
	ARENA_GOBLIN_SPEED_WALK,
	ARENA_GOBLIN_STR,
	ARENA_GRID_CELL_SIZE_M,
	ARENA_GRID_HEIGHT,
	ARENA_GRID_TOPOLOGY,
	ARENA_GRID_WIDTH,
	ARENA_HERO_AC,
	ARENA_HERO_DEF_ID,
	ARENA_HERO_DEX,
	ARENA_HERO_HP,
	ARENA_HERO_SPEED_WALK,
	ARENA_HERO_STR,
	ARENA_MONSTERS_FACTION_TAG,
	ARENA_PARTY_FACTION_TAG,
	ARENA_ROUND_DURATION_MS,
	ARENA_SCHEDULER_ID,
	ARENA_SESSION_DEF_ID,
	PROOF_BUNDLE_ID,
	PROOF_ENTITY_DEF_ID,
	PROOF_ENTITY_KEY,
	PROOF_FREE_LEVER_ACTION_ID,
	PROOF_FREE_OBJECT_INTERACTION_CAPABILITY_ID,
	PROOF_HERO_HP_STATE_ID,
	PROOF_LEVEL_STATE_ID,
	PROOF_LEVER_ENTITY_KEY,
	PROOF_LEVER_NICHE_ID,
	PROOF_LEVER_PULLS_STATE_ID,
	PROOF_PLACE_NODE_ID,
	PROOF_PRESSURE_PLATE_DC,
	PROOF_PRESSURE_PLATE_DEF_ID,
	PROOF_PRESSURE_PLATE_ENTITY_KEY,
	PROOF_PRESSURE_PLATE_NODE_ID,
	PROOF_SAVE_ACTION_ID,
	PROOF_SAVE_DAMAGE,
	PROOF_SAVE_DC_STATE_ID,
	PROOF_SAVE_HALF_DAMAGE,
	PROOF_SKILL_ID,
	PROOF_STEALTH_SKILL_CAPABILITY_ID,
	PROOF_STEALTH_VS_PASSIVE_PERCEPTION_ACTION_ID,
	PROOF_STEALTH_VS_PASSIVE_PERCEPTION_CHECK_CAP,
	PROOF_STR_STATE_ID,
	PROOF_UTILIZE_CAPABILITY_ID,
	PROOF_UTILIZE_LEVER_ACTION_ID,
	PROOF_WIS_STATE_ID,
} from "../../chapters/playing-the-game/proof-scene";
import {
	CHECK_ACTION_CALLS,
	CHECK_DEFINITION_CALLS,
	CHECK_TARGET_CALLS,
} from "../../chapters/playing-the-game/proof-scene/calls/checks";
import {
	COMBAT_ARENA_COMBATANT_CALLS,
	COMBAT_ARENA_GRID_CALLS,
	COMBAT_ARENA_SESSION_CALLS,
} from "../../chapters/playing-the-game/proof-scene/calls/combat-arena";
import {
	OBJECT_INTERACTION_DEFINITION_CALLS,
	OBJECT_INTERACTION_SCENE_CALLS,
} from "../../chapters/playing-the-game/proof-scene/calls/object-interaction";
import { generateProofScene } from "../../chapters/playing-the-game/proof-scene-generator";
import { FIXTURES_DIR } from "../../pipeline";

// Same "target = committed fixtures/" mechanism `src/pipeline.ts` uses when
// actually rendering this scene (see its `committedFixturesTarget` doc
// comment) — the scene's `depends_on: [BUNDLE_ID]` and its entity_def's
// inherited ability/skill ids only resolve against a real source for the
// base identity bundle.
const BASE_TARGET = createLocalAuthorTarget(FIXTURES_DIR);

// SHARED SINGLE GENERATION (#2123 round 2): `generateProofScene(BASE_TARGET)`
// used to be called fresh in 11 separate `it()` bodies across this file's two
// `describe` blocks — always the SAME argument, always re-running the full
// verb-authored scene (which itself validates against the committed
// `fixtures/` target on every call) from scratch. As the base bundle grew
// (Spells P1a, then Monsters P2b), that repeated cost pushed several of these
// tests past Vitest's 5s default per-test timeout. `generateProofScene` is a
// pure function of `BASE_TARGET` (no run-scoped state, no side effects — the
// same property `pipeline.test.ts`'s own determinism test proves for
// `renderAll()`), so it is generated exactly ONCE here, in a file-level
// `beforeAll`, and every `it()` below reads the shared result instead of
// re-deriving it. This is real redundant-work removal, not a timeout bump —
// unlike `pipeline.test.ts`'s wasm validation, this file's own cost stays
// small enough (well under the RPC heartbeat's 60s ceiling even at 11x) that
// child-process isolation was not needed here.
let PROOF_TOML: string;
beforeAll(async () => {
	PROOF_TOML = await generateProofScene(BASE_TARGET);
}, 180_000); // larger base bundle (magic-items) slows target-augmented proof render

function readOnlyWorkspace(toml: string): AuthorWorkspace {
	return {
		readToml: () => toml,
		writeToml: () => {
			throw new Error("proof-scene test: this workspace is read-only.");
		},
	};
}

interface QueryDetailResponse {
	shape: "detail";
	kind: string;
	id: string;
	found: boolean;
	source?: string;
	row?: Record<string, unknown>;
}

async function queryDetail(toml: string, kind: string, id: string): Promise<QueryDetailResponse> {
	const context: AuthorToolContext = { workspace: readOnlyWorkspace(toml) };
	const tool = bindTool(queryToolDef, { context, capabilities: {} });
	const result = await tool.execute("proof-scene-test", { kind, id, refs: "none" });
	if (result.details.shape !== "detail") {
		throw new Error(`proof-scene test: expected detail, got ${result.details.shape}.`);
	}
	return result.details;
}

describe("Part C proof scene (fixtures/proofs/playing-the-game-identity.proof.toml), read through spellkave_query", () => {
	it("carries its own bundle header, depends_on the srd identity bundle", async () => {
		const toml = PROOF_TOML;
		const detail = await queryDetail(toml, "bundles", PROOF_BUNDLE_ID);
		expect(detail.found).toBe(true);
		const row = detail.row as Record<string, unknown>;
		expect(row.bundle_id).toBe(PROOF_BUNDLE_ID);
		expect(row.depends_on).toEqual([BUNDLE_ID]);
	});

	it("authors the hero entity_definitions row", async () => {
		const toml = PROOF_TOML;
		const detail = await queryDetail(toml, "entity_definitions", PROOF_ENTITY_DEF_ID);
		expect(detail.found).toBe(true);
		const row = detail.row as Record<string, unknown>;
		expect(row.entity_def_id).toBe(PROOF_ENTITY_DEF_ID);
		expect(row.bundle_id).toBe(PROOF_BUNDLE_ID);
	});

	it("places exactly one hero actor at the proof cell", async () => {
		const toml = PROOF_TOML;
		const detail = await queryDetail(toml, "entities", PROOF_ENTITY_KEY);
		expect(detail.found).toBe(true);
		const row = detail.row as Record<string, unknown>;
		expect(row.entity_key).toBe(PROOF_ENTITY_KEY);
		expect(row.entity_def_id).toBe(PROOF_ENTITY_DEF_ID);
		expect(row.place_node_id).toBe(PROOF_PLACE_NODE_ID);
		expect(row.bundle_id).toBe(PROOF_BUNDLE_ID);
		expect((await queryDetail(toml, "actors", PROOF_ENTITY_KEY)).found).toBe(true);
	});

	it("authors the proof cell place_nodes row", async () => {
		const toml = PROOF_TOML;
		const detail = await queryDetail(toml, "place_nodes", PROOF_PLACE_NODE_ID);
		expect(detail.found).toBe(true);
		const row = detail.row as Record<string, unknown>;
		expect(row.node_id).toBe(PROOF_PLACE_NODE_ID);
		expect(row.pos_present).toBe(true);
		expect(row.pos_x).toBe(0);
		expect(row.pos_y).toBe(0);
	});

	it("places the pressure plate as a non-actor entity at its distinct node", async () => {
		const toml = PROOF_TOML;
		const nodeDetail = await queryDetail(toml, "place_nodes", PROOF_PRESSURE_PLATE_NODE_ID);
		expect(nodeDetail.found).toBe(true);
		expect(nodeDetail.row?.node_id).toBe(PROOF_PRESSURE_PLATE_NODE_ID);
		expect(nodeDetail.row?.pos_x).toBe(1);
		expect(nodeDetail.row?.pos_y).toBe(0);

		const plateDetail = await queryDetail(toml, "entities", PROOF_PRESSURE_PLATE_ENTITY_KEY);
		expect(plateDetail.found).toBe(true);
		expect(plateDetail.row?.entity_key).toBe(PROOF_PRESSURE_PLATE_ENTITY_KEY);
		expect(plateDetail.row?.place_node_id).toBe(PROOF_PRESSURE_PLATE_NODE_ID);
		expect(plateDetail.row?.kind).toBe("item");
		expect((await queryDetail(toml, "actors", PROOF_PRESSURE_PLATE_ENTITY_KEY)).found).toBe(false);
	});

	it("places the Exploration lever as a non-actor item at the Hero's node", async () => {
		const toml = PROOF_TOML;
		const detail = await queryDetail(toml, "entities", PROOF_LEVER_ENTITY_KEY);
		expect(detail.found).toBe(true);
		expect(detail.row).toMatchObject({
			bundle_id: PROOF_BUNDLE_ID,
			entity_key: PROOF_LEVER_ENTITY_KEY,
			kind: "item",
			place_node_id: PROOF_PLACE_NODE_ID,
		});
		expect((await queryDetail(toml, "actors", PROOF_LEVER_ENTITY_KEY)).found).toBe(false);

		const placementCall = OBJECT_INTERACTION_SCENE_CALLS.find(
			(call) => call.label === "proof-interactable-lever-placement",
		);
		expect(placementCall?.params.tags).toEqual([PROOF_LEVER_NICHE_ID]);
	});

	it("authors free and Utilize routes over the same lever with distinct channel spends", () => {
		const free = OBJECT_INTERACTION_DEFINITION_CALLS.find(
			(call) => call.label === "proof-pull-lever-free",
		);
		expect(free?.params).toMatchObject({
			id: PROOF_FREE_LEVER_ACTION_ID.slice(`${PROOF_BUNDLE_ID}/`.length),
			required_capability: PROOF_FREE_OBJECT_INTERACTION_CAPABILITY_ID,
			niche_id: PROOF_LEVER_NICHE_ID,
			spends_channel: OBJECT_INTERACTION_CHANNEL_ID,
			cost_time_ms: 0,
			consequence: {
				frame_writes: [
					{
						ModifyResource: {
							actor: "TargetActor",
							delta_source: "1",
							resource: PROOF_LEVER_PULLS_STATE_ID,
						},
					},
				],
			},
		});

		const utilize = OBJECT_INTERACTION_DEFINITION_CALLS.find(
			(call) => call.label === "proof-pull-lever-utilize",
		);
		expect(utilize?.params).toMatchObject({
			id: PROOF_UTILIZE_LEVER_ACTION_ID.slice(`${PROOF_BUNDLE_ID}/`.length),
			required_capability: PROOF_UTILIZE_CAPABILITY_ID,
			niche_id: PROOF_LEVER_NICHE_ID,
			spends_channel: PRIMARY_CHANNEL_ID,
			cost_time_ms: 0,
			consequence: {
				frame_writes: [
					{
						ModifyResource: {
							actor: "TargetActor",
							delta_source: "1",
							resource: PROOF_LEVER_PULLS_STATE_ID,
						},
					},
				],
			},
		});
	});

	it("keeps the pressure-plate definition to exactly one authored state: its save DC", () => {
		const plateDefinition = CHECK_TARGET_CALLS.find(
			(call) => call.label === "proof-pressure-plate-def",
		);
		expect(plateDefinition?.params).toMatchObject({
			id: PROOF_PRESSURE_PLATE_DEF_ID.slice(`${PROOF_BUNDLE_ID}/`.length),
			initial_states: [{ state: PROOF_SAVE_DC_STATE_ID, value_int: PROOF_PRESSURE_PLATE_DC }],
		});
		expect(
			(plateDefinition?.params.initial_states as unknown[] | undefined)?.length,
			"the plate must not acquire creature ability, level, proficiency, HP, damage, or result state",
		).toBe(1);
	});

	it("authors deterministic pressure-plate eligibility and one stochastic save with separate half/full damage consequences", () => {
		expect(PROOF_SAVE_DAMAGE).toBe(11);
		expect(PROOF_SAVE_HALF_DAMAGE).toBe(5);
		const actionCall = CHECK_ACTION_CALLS.find(
			(call) => call.label === "proof-check-pressure-plate-save",
		);
		expect(actionCall?.params).toMatchObject({
			predicate_source: "1 == 1",
			resolution_mode: "Stochastic",
			on_failure: `${PROOF_SAVE_ACTION_ID}/failure`,
			consequence: {
				frame_writes: [
					{
						ModifyResource: {
							actor: "Actor",
							delta_source: `-${PROOF_SAVE_HALF_DAMAGE}`,
							resource: PROOF_HERO_HP_STATE_ID,
						},
					},
				],
			},
		});
		expect(actionCall?.params.resolution_predicate_source).toContain("d20");
		expect(actionCall?.params.resolution_predicate_source).toContain(
			`target.stat('${PROOF_SAVE_DC_STATE_ID}')`,
		);
		expect(String(actionCall?.params.predicate_source)).not.toContain("d20");

		const attachmentCall = CHECK_ACTION_CALLS.find(
			(call) => call.label === "proof-niche-attachment-pressure-plate-save",
		);
		expect(attachmentCall?.params.rows).toEqual([
			expect.objectContaining({
				place_node_id: PROOF_PRESSURE_PLATE_NODE_ID,
				on_entry_action_id: PROOF_SAVE_ACTION_ID,
				on_entry_target_entity_key: PROOF_PRESSURE_PLATE_ENTITY_KEY,
			}),
		]);

		const failureCall = CHECK_ACTION_CALLS.find(
			(call) => call.label === "proof-check-pressure-plate-save-failure",
		);
		expect(failureCall?.params).toMatchObject({
			id: "pressure-plate-save/failure",
			frame_writes: [
				{
					ModifyResource: {
						actor: "Actor",
						delta_source: `-${PROOF_SAVE_DAMAGE}`,
						resource: PROOF_HERO_HP_STATE_ID,
					},
				},
			],
		});
	});

	it("C5 (Passive Perception): authors the stealth-vs-passive-perception check with the composed target-derived DC, gated on guard's own Stealth capability, attached at the shared proof cell", () => {
		const capabilityCall = CHECK_DEFINITION_CALLS.find(
			(call) => call.label === "proof-capability-stealth-vs-passive-perception",
		);
		expect(capabilityCall?.params).toMatchObject({
			id: "check/stealth-vs-passive-perception",
			actor_kind: "entity",
		});

		const actionCall = CHECK_ACTION_CALLS.find(
			(call) => call.label === "proof-check-stealth-vs-passive-perception",
		);
		expect(actionCall?.params).toMatchObject({
			id: "stealth-vs-passive-perception",
			required_capability: PROOF_STEALTH_VS_PASSIVE_PERCEPTION_CHECK_CAP,
			niche_id: `capability:${PROOF_STEALTH_VS_PASSIVE_PERCEPTION_CHECK_CAP}`,
			consequence: {
				frame_writes: [
					{
						ModifyResource: {
							actor: "Actor",
						},
					},
				],
			},
		});
		const predicate = String(actionCall?.params.predicate_source);
		// The CHECKING actor's own Dexterity (Stealth), gated by ITS OWN
		// skill-proficiency capability — never the hero's.
		expect(predicate).toContain("macro('srd/dexterity_modifier')");
		expect(predicate).toContain(`actor.has_capability('${PROOF_STEALTH_SKILL_CAPABILITY_ID}')`);
		expect(predicate).toContain(`actor.stat('${PROOF_LEVEL_STATE_ID}')`);
		// The DC side is the HERO's own target-derived Passive Perception
		// (character-creation/derived-units.ts's passivePerceptionExpr),
		// composed — never re-typed — from the SAME macros/capability id.
		expect(predicate).toContain("target.stat('srd/wis')");
		expect(predicate).toContain("target.stat('srd/level')");
		expect(predicate).toContain(`target.has_capability('${PROOF_SKILL_ID}')`);
		expect(predicate).toContain("macro('srd/proficiency_bonus'");

		const attachmentCall = CHECK_ACTION_CALLS.find(
			(call) => call.label === "proof-niche-attachment-stealth-vs-passive-perception",
		);
		expect(attachmentCall?.params.rows).toEqual([
			expect.objectContaining({
				niche_id: `capability:${PROOF_STEALTH_VS_PASSIVE_PERCEPTION_CHECK_CAP}`,
				place_node_id: PROOF_PLACE_NODE_ID,
			}),
		]);

		expect(PROOF_STEALTH_VS_PASSIVE_PERCEPTION_ACTION_ID).toBe(
			`${PROOF_BUNDLE_ID}/stealth-vs-passive-perception`,
		);
	});

	it("regenerates the SAME state/capability ids this test's expectations hardcode (sanity for the live test)", () => {
		// Not spellkave_query-visible (satellite row kinds, see this file's
		// header note) — this is a literal-drift guard only: if
		// proof-scene modules' own constants ever changed shape, this test (and the
		// live test that imports the same constants) would still describe the
		// SAME ids, never silently stale ones.
		expect(PROOF_STR_STATE_ID).toBe(`${BUNDLE_ID}/str`);
		expect(PROOF_WIS_STATE_ID).toBe(`${BUNDLE_ID}/wis`);
		expect(PROOF_SKILL_ID).toBe(`${BUNDLE_ID}/skill/perception`);
	});
});

describe("Combat-arena proof (Slice B, ledger/designs/combat-arena-proof.md)", () => {
	it("authors a 10x10, 8-topology combat_grid_blueprint binding srd/affordance/grid-step (ADR-0134 D-5), with a difficult-terrain override pair", async () => {
		const toml = PROOF_TOML;
		const detail = await queryDetail(toml, "combat_grid_blueprints", ARENA_BLUEPRINT_ID);
		expect(detail.found).toBe(true);
		const row = detail.row as Record<string, unknown>;
		expect(row.width).toBe(ARENA_GRID_WIDTH);
		expect(row.height).toBe(ARENA_GRID_HEIGHT);
		expect(row.topology).toBe(ARENA_GRID_TOPOLOGY);
		expect(Number(row.cell_size_m)).toBeCloseTo(ARENA_GRID_CELL_SIZE_M, 5);
		expect(row.edge_affordance_template_id).toBe(GRID_STEP_AFFORDANCE_ID);
		expect(row.edge_affordance_bindings_json).toBe(STEP_EDGE_BINDINGS_JSON);
		const overrides = JSON.parse(String(row.edge_overrides_json));
		expect(overrides).toEqual([
			{
				from: ARENA_DIFFICULT_TERRAIN_FROM_LOCAL,
				to: ARENA_DIFFICULT_TERRAIN_TO_LOCAL,
				movement_cost_cells: ARENA_DIFFICULT_TERRAIN_COST_CELLS,
				label: ARENA_DIFFICULT_TERRAIN_LABEL,
			},
			{
				from: ARENA_DIFFICULT_TERRAIN_TO_LOCAL,
				to: ARENA_DIFFICULT_TERRAIN_FROM_LOCAL,
				movement_cost_cells: ARENA_DIFFICULT_TERRAIN_COST_CELLS,
				label: ARENA_DIFFICULT_TERRAIN_LABEL,
			},
		]);
	});

	it("never references core/* vocabulary in the blueprint row (self-sufficiency: bare node_ball elsewhere, no core edge template here either)", () => {
		const blueprintCall = COMBAT_ARENA_GRID_CALLS.find(
			(call) => call.label === "proof-combat-arena-blueprint",
		);
		expect(JSON.stringify(blueprintCall?.params)).not.toContain("core/");
	});

	it("authors a dedicated arena staging node, distinct from the shared proof cell", async () => {
		const toml = PROOF_TOML;
		const detail = await queryDetail(toml, "place_nodes", ARENA_ANCHOR_NODE_ID);
		expect(detail.found).toBe(true);
		expect(detail.row?.node_id).toBe(ARENA_ANCHOR_NODE_ID);
		expect(ARENA_ANCHOR_NODE_ID).not.toBe(PROOF_PLACE_NODE_ID);
	});

	it("seeds the hero and all three Goblin Warriors with cache-cited stats, distinct from the identity-proof hero", async () => {
		const toml = PROOF_TOML;
		for (const defId of [
			ARENA_HERO_DEF_ID,
			ARENA_GOBLIN_A_DEF_ID,
			ARENA_GOBLIN_B_DEF_ID,
			ARENA_GOBLIN_C_DEF_ID,
		]) {
			const detail = await queryDetail(toml, "entity_definitions", defId);
			expect(detail.found).toBe(true);
			expect(defId).not.toBe(PROOF_ENTITY_DEF_ID);
		}

		// cache/markdown/monsters-A-Z.md:7327-7366 — Goblin Warrior.
		expect(ARENA_GOBLIN_AC).toBe(15);
		expect(ARENA_GOBLIN_HP).toBe(10);
		expect(ARENA_GOBLIN_STR).toBe(8);
		expect(ARENA_GOBLIN_DEX).toBe(15);
		expect(ARENA_GOBLIN_SPEED_WALK).toBe(6);

		// Arena Hero: derived AC (never a bare literal), reused proof seed values
		// (C3 re-derive: STR is now the Fighter Standard Array's 15, was 14; DEX
		// unchanged at 14 — the Fighter column's own Dex value).
		expect(ARENA_HERO_AC).toBe(12);
		expect(ARENA_HERO_STR).toBe(15);
		expect(ARENA_HERO_DEX).toBe(14);
		expect(ARENA_HERO_HP).toBeGreaterThan(0);
		expect(ARENA_HERO_SPEED_WALK).toBe(6);

		const heroDef = COMBAT_ARENA_COMBATANT_CALLS.find(
			(call) => call.label === "proof-arena-hero-def",
		);
		expect(heroDef?.params.initial_states).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ state: `${BUNDLE_ID}/ac`, value_int: ARENA_HERO_AC }),
				expect.objectContaining({ state: `${BUNDLE_ID}/hp`, value_int: ARENA_HERO_HP }),
			]),
		);
	});

	it("tags all four combatant defs as creatures so Walk is derived, and grants Drop Prone directly on the Hero only", () => {
		const defCalls = COMBAT_ARENA_COMBATANT_CALLS.filter(
			(call) =>
				call.toolName === "spellkave_define_entity_type" &&
				[
					"proof-arena-hero-def",
					"proof-arena-goblin-a-def",
					"proof-arena-goblin-b-def",
					"proof-arena-goblin-c-def",
				].includes(call.label),
		);
		expect(defCalls).toHaveLength(4);
		for (const call of defCalls) {
			const tags = call.params.tags as string[];
			expect(tags, `${call.label} must carry Creature identity`).toContain(CREATURE_NICHE_TAG);
			const capabilities = (
				(call.params.initial_capabilities ?? []) as { capability: string }[]
			).map((c) => c.capability);
			expect(
				capabilities,
				`${call.label} must derive Walk from Creature identity instead of duplicating it directly`,
			).not.toContain(WALK_CAPABILITY_ID);
		}
		const heroDefCall = defCalls.find((call) => call.label === "proof-arena-hero-def");
		const heroCapabilities = (
			heroDefCall?.params.initial_capabilities as { capability: string }[]
		).map((c) => c.capability);
		expect(heroCapabilities).toContain(DROP_PRONE_CAPABILITY_ID);
		for (const call of defCalls) {
			if (call.label === "proof-arena-hero-def") continue;
			const capabilities = (
				(call.params.initial_capabilities ?? []) as { capability: string }[]
			).map((c) => c.capability);
			expect(
				capabilities,
				`${call.label} must not carry the drop-prone capability — only the Hero drops prone`,
			).not.toContain(DROP_PRONE_CAPABILITY_ID);
		}
	});

	it("faction-tags the hero (party) and all three goblins (monsters) as INSTANCE entity_tag rows, not definition tags", () => {
		const heroPlacement = COMBAT_ARENA_COMBATANT_CALLS.find(
			(call) => call.label === "proof-arena-hero-placement",
		);
		const goblinAPlacement = COMBAT_ARENA_COMBATANT_CALLS.find(
			(call) => call.label === "proof-arena-goblin-a-placement",
		);
		const goblinBPlacement = COMBAT_ARENA_COMBATANT_CALLS.find(
			(call) => call.label === "proof-arena-goblin-b-placement",
		);
		const goblinCPlacement = COMBAT_ARENA_COMBATANT_CALLS.find(
			(call) => call.label === "proof-arena-goblin-c-placement",
		);
		expect(heroPlacement?.params.tags).toEqual([ARENA_PARTY_FACTION_TAG]);
		expect(goblinAPlacement?.params.tags).toEqual([ARENA_MONSTERS_FACTION_TAG]);
		expect(goblinBPlacement?.params.tags).toEqual([ARENA_MONSTERS_FACTION_TAG]);
		expect(goblinCPlacement?.params.tags).toEqual([ARENA_MONSTERS_FACTION_TAG]);
		for (const call of COMBAT_ARENA_COMBATANT_CALLS) {
			if (call.toolName !== "spellkave_define_entity_type") continue;
			// C3 (Ability-Score Generation): the goblin warriors now carry
			// DEFINITION-level alignment + language tags (grounded in
			// Creature.json, `calls/combat-arena.ts`'s own GOBLIN_TAGS) — this
			// test's own concern is narrower than "no tags at all": faction
			// membership specifically must stay INSTANCE-level, never a
			// definition tag.
			const tags = call.params.tags as string[] | undefined;
			expect(
				tags?.includes(ARENA_PARTY_FACTION_TAG) ?? false,
				`${call.label} must not carry a definition-level party faction tag`,
			).toBe(false);
			expect(
				tags?.includes(ARENA_MONSTERS_FACTION_TAG) ?? false,
				`${call.label} must not carry a definition-level monsters faction tag`,
			).toBe(false);
		}
	});

	it("composes the scheduler's order_roll_source from the real d20 + Dex-modifier idiom, over srd/dex", async () => {
		const toml = PROOF_TOML;
		const detail = await queryDetail(toml, "turn_scheduler", ARENA_SCHEDULER_ID);
		expect(detail.found).toBe(true);
		const row = detail.row as Record<string, unknown>;
		expect(row.scheduler_kind).toBe("rolled_order");
		expect(String(row.order_roll_source)).toContain("d20");
		expect(String(row.order_roll_source)).toContain("macro('srd/dexterity_modifier')");
	});

	it("opens a session on the arena blueprint, terminating when a faction is reduced to <= 1 non-incapacitated member", async () => {
		const toml = PROOF_TOML;
		const detail = await queryDetail(toml, "session_definitions", ARENA_SESSION_DEF_ID);
		expect(detail.found).toBe(true);
		const row = detail.row as Record<string, unknown>;
		expect(row.combat_grid_blueprint_id).toBe(ARENA_BLUEPRINT_ID);
		expect(row.turn_scheduler_id).toBe(ARENA_SCHEDULER_ID);
		expect(row.turn_rule).toBe("Sequential");
		expect(Number(row.round_duration_ms)).toBe(ARENA_ROUND_DURATION_MS);
		expect(row.termination_pred).toBe(
			`participant_tag_group_count("srd.faction.") >= 2 && participant_tag_group_count("srd.faction.", "${INCAPACITATED_CONDITION_ID}") <= 1`,
		);
		expect(row.winner_predicate).toBe(
			`participant_tag_group_count("srd.faction.", "${INCAPACITATED_CONDITION_ID}") == 1`,
		);
		const sessionCall = COMBAT_ARENA_SESSION_CALLS.find(
			(call) => call.label === "proof-combat-arena-session",
		);
		expect(JSON.stringify(sessionCall?.params)).not.toContain("core/");
	});
});
