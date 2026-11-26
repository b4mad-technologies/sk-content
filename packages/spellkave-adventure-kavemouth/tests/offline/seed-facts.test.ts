/**
 * Offline lint of the seed facts the live-preseeded dm-arc files used to
 * discover only by running against a node (sk-jay0.7.123.20.16; claims listed
 * in ledger/designs/dm-arc-live-files-rehome.md). Everything here reads the
 * authored manifest and author constants: no node, no connection.
 *
 * Each assertion carries a `replaces` comment naming the live file:line it
 * stands in for. The live files stay until a later phase deletes them.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { dmAldwin, dmBundleHeaderCall } from "@spellkave/adventure-runtime/author/dm";
import {
	CREATION_PHASE_CONFIRMED,
	CREATION_PHASE_RESOURCE_ID,
	CREATION_STATION_NICHE_ID,
	PARTY_FACTION_TAG,
} from "@spellkave/adventure-runtime/dm/creation";
import { DIALOG_OPEN_RESOURCE_ID } from "@spellkave/adventure-runtime/dm/dialog";
import { renderRuntimeDelta } from "@spellkave/adventure-runtime/dm/lib";
import { ACTION_SURGE_USES_RESOURCE_ID } from "@spellkave/adventure-runtime/srd-ids";
import type { AuthorTarget, ManifestRow } from "@spellkave/tool-authoring";
import { inspectManifest, loadFlattened } from "@spellkave/world-author";
import { describe, expect, it } from "vitest";
import { kavemouthBundleHeaderCall } from "../../author/bundle-header";
import {
	COMPANION_AGREEMENT_STATE,
	companionAgreementAction,
	companionAgreementActions,
	companionAgreementDefinitions,
} from "../../author/companion-agreement";
import { companionSpokenCommandActions } from "../../author/companion-commands";
import {
	COMMAND_BOND_CAPABILITY_ID,
	COMPANION_BOND_TAG,
	renderCompanionBondGrant,
} from "../../author/companion-stone";
import { LOFT_CONTENTS_POLICY } from "../../author/containment-policies";
import { ADVENTURE_CANDIDATE_DEF_ID } from "../../author/creation-candidate";
import { CRYPT_FIGHT_SESSION_DEF_ID } from "../../author/crypt-fight";
import { ALDWIN_DEF_ID } from "../../author/dm-npc";
import { ADVENTURE_HERO_ENTITY_KEY, heroOccupancy } from "../../author/hero";
import { INDUCT_ACTION_ID } from "../../author/induction";
import {
	ADVENTURE_CANDIDATE_ENTITY_KEY,
	ALDWIN_ENTITY_KEY,
	CREATION_LIMBO_NODE_ID,
	INNKEEPER_ENTITY_KEY,
	ROGUE_COMPANION_ENTITY_KEY,
} from "../../author/lib/entity-keys";
import {
	LOFT_CHEST_KEY,
	LOFT_CHEST_OPEN_STATE,
	LOFT_CHEST_POTION_KEYS,
	LOFT_NODE_ID,
} from "../../author/loft-chest";
import { ENCOUNTER_KEYS, STORYLINE_NPC_KEYS, TOMB_KEY_ITEM_KEY } from "../../author/quests";
import { ROGUE_COMPANION_DEF_ID } from "../../author/rogue-companion.ts";
import {
	DEEP_TOMB_ENTRY,
	TOMB_SEAL_ACTION,
	TOMB_SEAL_NICHE,
	TOMB_SEAL_NODE,
	TOMB_SEAL_RESOURCE,
	TOMB_SEAL_STATE,
} from "../../author/tomb-key";
import { srdAuthorTarget, srdRows } from "./srd-manifest";

type Row = Record<string, unknown>;

const manifest = inspectManifest(
	loadFlattened(resolve(import.meta.dirname, "../../fixtures"), "adventure.manifest.toml"),
).manifest as Record<string, unknown>;
const rows = (kind: string): Row[] => {
	const value = manifest[kind];
	return Array.isArray(value) ? (value as Row[]) : [];
};
const entity = (key: string): Row | undefined => rows("entities").find((r) => r.entity_key === key);

describe("loft chest seed", () => {
	const POTION_DEF = "srd/item/potion-of-healing";

	it("uses its existing lid state for both exposure and removal, overriding the SRD chest policy", () => {
		expect(
			rows("entity_containment_policy").find((r) => r.entity_key === LOFT_CHEST_KEY)?.policy_id,
		).toBe(LOFT_CONTENTS_POLICY);
		const policy = rows("containment_policy_definition").find(
			(r) => r.policy_id === LOFT_CONTENTS_POLICY,
		);
		expect(policy?.exposure_predicate_source).toBe(`target.stat('${LOFT_CHEST_OPEN_STATE}') == 1`);
		expect(policy?.access_predicate_source).toBe(policy?.exposure_predicate_source);
	});

	it("authors exactly one srd/item/chest in the loft", () => {
		// replaces tests/live-preseeded/loft-chest.test.ts:140-141,169-174 and publisher-owner-read.test.ts:329-330,395-400
		const chests = rows("entities").filter((r) => r.entity_def_id === "srd/item/chest");
		expect(chests.map((r) => r.entity_key)).toEqual([LOFT_CHEST_KEY]);
		expect(chests[0]?.place_node_id).toBe(LOFT_NODE_ID);
		expect(Number(chests[0]?.quantity)).toBe(1);
	});

	it("authors exactly two healing potions, one per LOFT_CHEST_POTION_KEYS entry", () => {
		// replaces tests/live-preseeded/loft-chest.test.ts:142-144,187-192 (potion keys resolve, potion def)
		const potions = rows("entities").filter((r) => r.entity_def_id === POTION_DEF);
		expect(potions).toHaveLength(2);
		expect(potions).toHaveLength(LOFT_CHEST_POTION_KEYS.length);
		expect(potions.map((r) => r.entity_key).sort()).toEqual([...LOFT_CHEST_POTION_KEYS].sort());
	});

	it("contains the potions through exactly two loose entity_containment rows", () => {
		// replaces tests/live-preseeded/loft-chest.test.ts:176-194 (exactly 2 rows, slot_id '') and publisher-owner-read.test.ts:329-339
		const inChest = rows("entity_containment").filter(
			(r) => r.container_entity_key === LOFT_CHEST_KEY,
		);
		expect(inChest).toHaveLength(LOFT_CHEST_POTION_KEYS.length);
		expect(inChest.every((r) => r.slot_id === "" && r.direction === "")).toBe(true);
		expect(inChest.map((r) => r.entity_key).sort()).toEqual([...LOFT_CHEST_POTION_KEYS].sort());
	});

	it("places the chest where owner describe expects it", () => {
		// replaces tests/live-preseeded/owner-get-describe.test.ts:149-150 (describe.place === LOFT_NODE_ID)
		expect(entity(LOFT_CHEST_KEY)?.place_node_id).toBe(LOFT_NODE_ID);
		expect(LOFT_NODE_ID).toBe("kavemouth/inn/loft");
	});

	it("leaves the PLAYER surface to grant srd/pickup: the candidate is an srd.creature and srd grants pickup to that tag", () => {
		// replaces tests/live-preseeded/loft-chest.test.ts:207 (action list includes srd/pickup; the created-candidate grant was asserted nowhere)
		const tags = rows("entity_definition_tag")
			.filter((r) => r.entity_def_id === "kavemouth/adventure/candidate")
			.map((r) => r.tag);
		expect(tags).toContain("srd.creature");
		const grants = srdRows("tag_capability_grant").filter((r) => r.tag === "srd.creature");
		expect(grants.map((r) => r.capability_id)).toContain("srd/action/pickup");
	});
});

describe("adventure containment policy coverage", () => {
	it("resolves policies for placed containers and runtime-created bodies and kits", () => {
		const bindings = new Map(
			[
				...srdRows("entity_definition_containment_policy"),
				...rows("entity_definition_containment_policy"),
			].map((r) => [r.entity_def_id, r.policy_id]),
		);
		const policies = new Set(
			[...srdRows("containment_policy_definition"), ...rows("containment_policy_definition")].map(
				(r) => r.policy_id,
			),
		);
		const instances = new Map(
			rows("entity_containment_policy").map((r) => [r.entity_key, r.policy_id]),
		);
		const entities = new Map(rows("entities").map((r) => [r.entity_key, r.entity_def_id]));
		for (const r of rows("entity_containment")) {
			const policy =
				instances.get(r.container_entity_key) ?? bindings.get(entities.get(r.container_entity_key));
			expect(policies.has(policy), `uncovered parent ${r.container_entity_key}`).toBe(true);
		}
		for (const r of rows("entity_definition_tag").filter(
			(r) => r.tag === "srd.creature" || r.tag === "srd.item.container",
		)) {
			expect(
				policies.has(bindings.get(r.entity_def_id)),
				`uncovered blueprint ${r.entity_def_id}`,
			).toBe(true);
		}
		for (const r of rows("entity_definition_initial_containment")) {
			expect(
				policies.has(bindings.get(r.entity_def_id)),
				`uncovered initial parent ${r.entity_def_id}`,
			).toBe(true);
		}
	});

	it("ships an additive policy migration without played state, containment or loot seeds", () => {
		const delta = inspectManifest(
			readFileSync(
				resolve(
					import.meta.dirname,
					"../../fixtures/migrations/2026-11-16-containment-policies.manifest.toml",
				),
				"utf8",
			),
		).manifest as Record<string, unknown>;
		const nonempty = Object.entries(delta)
			.filter(([, value]) => Array.isArray(value) && value.length > 0)
			.map(([kind]) => kind)
			.sort();
		expect(nonempty).toEqual([
			"containment_policy_definition",
			"entity_containment_policy",
			"entity_definition_containment_policy",
		]);
	});
});

describe("seeded bodies", () => {
	const actors = new Set(rows("actors").map((r) => String(r.entity_key)));
	const locationOf = (key: string): unknown =>
		rows("actor_spatial_locations").find((r) => r.entity_key === key)?.place_node_id;

	it("seeds the fixed NPC bodies and leaves playable vessels to the creation act", () => {
		// replaces tests/live-preseeded/encounter-start.test.ts:60-64 (id() throws on an unresolved body key) and mechanics/npc-seat-event-wake.test.ts:133-160
		for (const key of [
			ALDWIN_ENTITY_KEY,
			STORYLINE_NPC_KEYS.hesper,
			STORYLINE_NPC_KEYS.ysolde,
			STORYLINE_NPC_KEYS.vessk,
			ENCOUNTER_KEYS.sisterMaelis,
			INNKEEPER_ENTITY_KEY,
		])
			expect(actors.has(key), key).toBe(true);
		expect(actors.has(ADVENTURE_CANDIDATE_ENTITY_KEY)).toBe(false);
		expect(entity(ADVENTURE_CANDIDATE_ENTITY_KEY)).toBeUndefined();
		expect(
			rows("entity_definitions").filter((r) => r.entity_def_id === ADVENTURE_CANDIDATE_DEF_ID),
		).toHaveLength(1);
	});

	it("opens world-owned creation at the limbo station and keeps Maelis hostile at the altar", () => {
		// replaces tests/live-preseeded/encounter-start.test.ts:60-64 (Maelis resolves) and mechanics/npc-seat-event-wake.test.ts:133-160
		expect(locationOf(ADVENTURE_CANDIDATE_ENTITY_KEY)).toBeUndefined();
		const spawn = rows("effect_definitions").find(
			(r) => r.effect_def_id === "kavemouth/dm/open-seat/spawn",
		);
		expect(JSON.parse(String(spawn?.parameters_schema_json))).toEqual({
			blueprint_id: ADVENTURE_CANDIDATE_DEF_ID,
			location_ref: { kind: "binding", id: "TargetSpatialRef" },
			unbound_actor: true,
		});
		expect(rows("spatial_niche_attachments")).toContainEqual(
			expect.objectContaining({
				place_node_id: "kavemouth/creation_limbo/station",
				niche_id: "core/mark_surface",
			}),
		);
		expect(locationOf(ENCOUNTER_KEYS.sisterMaelis)).toBe("kavemouth/mill/altar");
		const maelisTags = rows("entity_tag")
			.filter((r) => r.entity_key === ENCOUNTER_KEYS.sisterMaelis)
			.map((r) => r.tag);
		expect(maelisTags).toContain("srd.faction.monsters");
		expect(entity(ENCOUNTER_KEYS.sisterMaelis)?.entity_def_id).toBe("srd/creature/cultist-fanatic");
	});

	it("places Hesper away from the party start: on the lodge porch, as a talker", () => {
		// replaces tests/live-preseeded/mechanics/companion-arrival.test.ts:46,84 (hero starts away from the porch)
		expect(locationOf(STORYLINE_NPC_KEYS.hesper)).toBe("kavemouth/hesper_lodge/porch");
		const tags = rows("entity_tag")
			.filter((r) => r.entity_key === STORYLINE_NPC_KEYS.hesper)
			.map((r) => r.tag);
		expect(tags).toContain("srd.dm_npc.talker");
	});

	it("leaves Rogue unplaced with an L1 blueprint and an undecided invitation on Aldwin", () => {
		expect(entity(ROGUE_COMPANION_ENTITY_KEY)).toBeUndefined();
		expect(actors.has(ROGUE_COMPANION_ENTITY_KEY)).toBe(false);
		expect(
			rows("entity_definition_initial_state").filter(
				(r) => r.entity_def_id === ROGUE_COMPANION_DEF_ID && r.state_id === "srd/level",
			),
		).toEqual([expect.objectContaining({ value_int: 1 })]);
		const agreement = rows("object_state").filter(
			(r) => r.entity_key === ALDWIN_ENTITY_KEY && r.state_id === COMPANION_AGREEMENT_STATE,
		);
		expect(agreement).toHaveLength(1);
		expect(agreement[0]?.value_int).toBe(0);
	});

	it("never grants Aldwin the command-bond capability at seed", () => {
		// replaces tests/live-preseeded/companion-stone-bond.test.ts:306-317,1214-1222 (exactly one command-bond row, from the recorded bond; Aldwin never holds it)
		const grants = rows("actor_capabilities").filter(
			(r) => r.actor_entity_key === ALDWIN_ENTITY_KEY,
		);
		expect(grants.map((r) => r.capability_id)).not.toContain(COMMAND_BOND_CAPABILITY_ID);
	});

	it("gives Aldwin Speak through his srd.communication.vocal definition tag, not a test grant", () => {
		// replaces packages/spellkave-srd-cc/src/test/live-preseeded/mechanics/aldwin-notify-only.test.ts:144-147 (the test re-grants Speak and masks this)
		expect(ALDWIN_DEF_ID).toBe("srd/creature/commoner");
		const defTags = srdRows("entity_definition_tag")
			.filter((r) => r.entity_def_id === ALDWIN_DEF_ID)
			.map((r) => r.tag);
		expect(defTags).toContain("srd.communication.vocal");
		const grants = srdRows("tag_capability_grant").filter(
			(r) => r.tag === "srd.communication.vocal",
		);
		expect(grants.map((r) => r.capability_id)).toContain("srd/action/communicate/speak");
	});

	it("seeds the candidate class-less: no Action Surge capability, uses row, or class tag", () => {
		// replaces packages/spellkave-srd-cc/src/test/live-preseeded/mechanics/fighter-level-2-runtime-grant.test.ts:243-247 (no action-surge before level 2)
		const mine = (r: Row) => r.entity_key === ADVENTURE_CANDIDATE_ENTITY_KEY;
		expect(
			rows("actor_capabilities")
				.filter((r) => r.actor_entity_key === ADVENTURE_CANDIDATE_ENTITY_KEY)
				.filter((r) => String(r.capability_id).includes("action-surge")),
		).toEqual([]);
		expect(
			rows("object_state").filter((r) => mine(r) && String(r.state_id).includes("action-surge")),
		).toEqual([]);
		expect(
			rows("entity_definition_tag").filter(
				(r) =>
					r.entity_def_id === "kavemouth/adventure/candidate" &&
					String(r.tag).startsWith("srd.class."),
			),
		).toEqual([]);
		expect(JSON.stringify(manifest)).not.toContain("action-surge");
	});
});

describe("companion agreement actions", () => {
	// replaces tests/live-preseeded/companion-offer.test.ts:218-224 (the write is the authored manifest action's)
	const verbs = () =>
		companionAgreementActions().filter((c) => c.toolName === "spellkave_define_action_verb");
	const modifies = (choice: "accept" | "decline" | "reopen") => {
		const call = verbs().find(
			(c) => (c.params as { id?: string }).id === `companion/rogue/${choice}`,
		);
		const params = call?.params as
			| {
					predicate_source?: string;
					self_only?: boolean;
					consequence?: { frame_writes: Record<string, Record<string, unknown>>[] };
			  }
			| undefined;
		return {
			predicate: params?.predicate_source,
			selfOnly: params?.self_only,
			writes: (params?.consequence?.frame_writes ?? []).map((w) => w.ModifyResource ?? {}),
		};
	};

	it("accepts 0 -> 1, declines 0 -> 2 and reopens 2 -> 0 on Aldwin's own agreement resource", () => {
		expect(companionAgreementAction("accept")).toBe("kavemouth/companion/rogue/accept");
		for (const [choice, from, delta] of [
			["accept", 0, "1"],
			["decline", 0, "2"],
			["reopen", 2, "-2"],
		] as const) {
			const { predicate, selfOnly, writes } = modifies(choice);
			expect(selfOnly, choice).toBe(true);
			expect(predicate, choice).toBe(`actor.stat('${COMPANION_AGREEMENT_STATE}') == ${from}`);
			expect(writes, choice).toEqual([
				{ actor: "Actor", resource: COMPANION_AGREEMENT_STATE, delta_source: delta },
			]);
		}
	});

	it("bounds the agreement resource to undecided, accepted, declined", () => {
		const definition = companionAgreementDefinitions().find(
			(call) => call.params.id === "companion/rogue/agreement",
		)?.params as Record<string, unknown>;
		expect(definition).toMatchObject({
			id: "companion/rogue/agreement",
			min_value: 0,
			max_value: 2,
			initial_value: 0,
			recovery_rule: "persistent",
		});
		expect(`kavemouth/${definition.id}`).toBe(COMPANION_AGREEMENT_STATE);
	});
});

describe("Ironfold tomb seal wiring", () => {
	const edgeKey = (from: string, to: string) => `${from}->${to}`;

	it("places the tomb key in the mine crypt and seeds the candidate's seal flag at 0", () => {
		// replaces tests/live-preseeded/quest-reward-restart.test.ts:87,174 (key id resolves; flag reads 0n before the open)
		expect(entity(TOMB_KEY_ITEM_KEY)?.place_node_id).toBe("kavemouth/mine/durgan_crypt");
		const flag = rows("entity_definition_initial_state").filter(
			(r) => r.entity_def_id === ADVENTURE_CANDIDATE_DEF_ID && r.state_id === TOMB_SEAL_RESOURCE,
		);
		expect(flag).toHaveLength(1);
		expect(flag[0]?.value_int).toBe(0);
	});

	it("attaches the seal niche at the crypt and gates open-tomb on the unset flag", () => {
		// replaces tests/live-preseeded/quest-reward-restart.test.ts:144-174,216-227 (open-tomb offered at the crypt, once)
		expect(
			rows("spatial_niche_attachments").filter(
				(r) => r.niche_id === TOMB_SEAL_NICHE && r.place_node_id === TOMB_SEAL_NODE,
			),
		).toHaveLength(1);
		const affordance = rows("affordance_templates").find(
			(r) => r.template_id === `${TOMB_SEAL_ACTION}/affordance`,
		);
		expect(affordance).toMatchObject({
			niche_id: TOMB_SEAL_NICHE,
			predicate_source: `actor.stat('${TOMB_SEAL_RESOURCE}') == 0`,
		});
	});

	it("consumes the key, sets the flag and opens the stair in one frame", () => {
		// replaces tests/live-preseeded/quest-reward-restart.test.ts:144-174 (a frame with RemoveItem + ModifyResource + Inscribe)
		const writes = rows("consequence_frame_writes")
			.filter((r) => r.template_id === `${TOMB_SEAL_ACTION}/success`)
			.sort((a, b) => Number(a.ordinal) - Number(b.ordinal))
			.map((r) => Object.keys(r.frame_write as object)[0]);
		expect(writes).toEqual(["RemoveItem", "ModifyResource", "Inscribe"]);
	});

	it("starts the crypt-to-deep-tomb edge closed, gated one-way on the seal", () => {
		// replaces tests/live-preseeded/quest-reward-restart.test.ts:97-100,225 (the stair edge toward DEEP_TOMB_ENTRY)
		const forward = edgeKey(TOMB_SEAL_NODE, DEEP_TOMB_ENTRY);
		const reverse = edgeKey(DEEP_TOMB_ENTRY, TOMB_SEAL_NODE);
		const state = rows("spatial_environment_state").filter((r) => r.state_id === TOMB_SEAL_STATE);
		expect(state).toEqual([
			expect.objectContaining({ place_edge_key: forward, value_bool: false }),
		]);
		const gated = rows("place_edge_affordance")
			.filter((r) => r.affordance_template_id === "kavemouth/affordance/ironfold-seal")
			.map((r) => r.edge_key);
		expect(gated).toEqual([forward]);
		expect(gated).not.toContain(reverse);
	});
});

describe("creation station and induction wiring", () => {
	it("attaches the creation-station niche at the creation limbo node", () => {
		// replaces packages/spellkave-srd-cc/src/test/live-preseeded/mechanics/dm-threshold.test.ts:446-454 (niche attached at CREATION_LIMBO_NODE_ID; asserted nowhere else)
		expect(CREATION_LIMBO_NODE_ID).toBe("kavemouth/creation_limbo/station");
		expect(
			rows("spatial_niche_attachments").filter(
				(r) =>
					r.niche_id === CREATION_STATION_NICHE_ID && r.place_node_id === CREATION_LIMBO_NODE_ID,
			),
		).toHaveLength(1);
	});

	it("gates induction on the confirmed party tag, then closes the dialog latch and sets the phase to CONFIRMED", () => {
		// replaces packages/spellkave-srd-cc/src/test/live-preseeded/mechanics/dm-threshold.test.ts:705-720 (latch value_int==0, phase==CONFIRMED after induct) and :648
		expect(PARTY_FACTION_TAG).toBe("srd.faction.party");
		expect(CREATION_PHASE_CONFIRMED).toBe(6);
		const affordance = rows("affordance_templates").find(
			(r) => r.template_id === `${INDUCT_ACTION_ID}/affordance`,
		);
		expect(affordance?.predicate_source).toBe(
			`target.has_tag('${PARTY_FACTION_TAG}') && target.status('dm/creation/drafting') == false`,
		);
		const writes = rows("consequence_frame_writes")
			.filter((r) => r.template_id === `${INDUCT_ACTION_ID}/success`)
			.sort((a, b) => Number(a.ordinal) - Number(b.ordinal))
			.map((r) => r.frame_write as Record<string, Record<string, unknown>>);
		expect(Object.keys(writes[0] ?? {})).toEqual(["RelocateEntity"]);
		// A `<target> - actor.stat(<own field>)` delta lands the field on exactly <target>.
		expect(writes[1]?.ModifyResource).toMatchObject({
			resource: DIALOG_OPEN_RESOURCE_ID,
			delta_source: `0 - actor.stat('${DIALOG_OPEN_RESOURCE_ID}')`,
		});
		expect(writes[2]?.ModifyResource).toMatchObject({
			resource: CREATION_PHASE_RESOURCE_ID,
			delta_source: `${CREATION_PHASE_CONFIRMED} - actor.stat('${CREATION_PHASE_RESOURCE_ID}')`,
		});
	});
});

/** The srd target plus the adventure's own place graph, so `at:` resolves like it does against a live node. */
function targetWithAdventureNodes(): AuthorTarget {
	const base = srdAuthorTarget();
	const NATURAL_KEY: Record<string, string> = {
		place_graphs: "place_graph_id",
		place_nodes: "node_id",
	};
	const own = (kind: string) => (kind in NATURAL_KEY ? (rows(kind) as ManifestRow[]) : []);
	return {
		...base,
		resolveRef: (kind, id) =>
			own(kind).some((r) => r[NATURAL_KEY[kind] as string] === id) || base.resolveRef(kind, id),
		lookup: (kind, filter) => [...base.lookup(kind, filter), ...own(kind)],
	};
}

describe("hero staging renders", () => {
	it("heroOccupancy at the mill altar plus the party tag renders a valid runtime delta", async () => {
		// replaces tests/live-preseeded/encounter-start.test.ts:85-106 (the staging delta applied against a live node)
		const toml = await renderRuntimeDelta(
			[
				kavemouthBundleHeaderCall(),
				...heroOccupancy("kavemouth/mill/altar"),
				{
					toolName: "spellkave_tag_entity",
					label: "stage-pregen-party",
					params: {
						bundle: "kavemouth",
						entity_key: ADVENTURE_HERO_ENTITY_KEY,
						tags: [PARTY_FACTION_TAG],
					},
				},
			],
			targetWithAdventureNodes(),
		);
		const delta = inspectManifest(toml).manifest as Record<string, unknown>;
		const at = (delta.actor_spatial_locations as Row[]).find(
			(r) => r.entity_key === ADVENTURE_HERO_ENTITY_KEY,
		);
		expect(at?.place_node_id).toBe("kavemouth/mill/altar");
		expect(
			(delta.entity_tag as Row[]).some(
				(r) => r.entity_key === ADVENTURE_HERO_ENTITY_KEY && r.tag === PARTY_FACTION_TAG,
			),
		).toBe(true);
	});
});

describe("mill fight turn eligibility", () => {
	it("authors the fight session with the srd takes-turn macro, which skips only the dead", () => {
		// replaces tests/live-preseeded/quest-board-host.test.ts:563-613,871-900 (Dead cultists get no TurnStart; session-def wiring half)
		const session = rows("session_definitions").find(
			(r) => r.session_def_id === CRYPT_FIGHT_SESSION_DEF_ID,
		);
		expect(session?.turn_eligibility_pred).toBe("macro('srd/takes-turn')");
		const macro = srdRows("dsl_macro_definitions").find((r) => r.macro_id === "srd/takes-turn");
		expect(macro?.body_source).toBe("actor.status('srd/condition/dead') == false");
		const mill = rows("entity_tag").filter(
			(r) => String(r.entity_key).includes("mill_cultist") && r.tag === "srd.faction.monsters",
		);
		expect(mill.length).toBeGreaterThan(0);
	});
});

describe("companion command reach", () => {
	it("keeps the spoken twin inside a 10 m same-graph gate and the stone twin on the bond's party extent", () => {
		// replaces tests/live-preseeded/companion-stone-bond.test.ts:1181-1186 and 505-512 (crossroads is outside the 10 m gate but inside the party extent)
		const say = rows("affordance_templates").filter((r) => String(r.template_id).includes("/say-"));
		expect(say).toHaveLength(companionSpokenCommandActions().length);
		for (const a of say) {
			expect(a.range_m).toBe(10);
			expect(a.predicate_source).toContain("target.stat('core/distance_to_actor_mm') <= 10000");
		}
		const stone = rows("affordance_templates").filter((r) =>
			/companion\/(hold|follow|cancel)\/affordance$/.test(String(r.template_id)),
		);
		expect(stone).toHaveLength(3);
		for (const a of stone) {
			expect(a.predicate_source).not.toContain("distance_to_actor_mm");
			expect(a.range_m).toBe(50);
		}
		const grant = renderCompanionBondGrant()
			.flatMap((c) => (c.params.rows as Row[] | undefined) ?? [])
			.find((r) => r.capability_id === COMMAND_BOND_CAPABILITY_ID);
		expect(grant).toMatchObject({ extent_kind_ref: "party", extent_ref: COMPANION_BOND_TAG });
		// The distance fact is absent across place graphs (command-gate comment in author/companion-commands.ts), so
		// crossroads (region graph) is never within the spoken gate of anyone standing in the inn graph.
		const graphOf = (node: string) =>
			rows("place_nodes").find((r) => r.node_id === node)?.place_graph_id;
		expect(graphOf("kavemouth/region/waymeet")).toBe("kavemouth/region");
		expect(graphOf("kavemouth/inn/common_room")).toBe("kavemouth/inn");
	});
});

describe("Aldwin level-up delta wiring", () => {
	// One render serves every test in this block: they only read the calls, and
	// each render of the SRD author target costs about a second.
	let rendered: ReturnType<typeof dmAldwin> | undefined;
	const aldwin = () => {
		rendered ??= dmAldwin(srdAuthorTarget());
		return rendered;
	};
	const actions = () => aldwin().filter((c) => c.toolName === "spellkave_define_action_verb");
	const frameWrites = (label: string) => {
		const call = actions().find((c) => c.label === label);
		const consequence = call?.params.consequence as { frame_writes: Row[] } | undefined;
		return (consequence?.frame_writes ?? []).map(
			(w) => (w as Record<string, Record<string, unknown>>).ModifyResource ?? {},
		);
	};

	it("prepends the dm bundle header with depends_on srd, as the first call of every Aldwin render", () => {
		// replaces packages/spellkave-srd-cc/src/test/live-preseeded/mechanics/fighter-level-2-runtime-grant.test.ts:13-22 and dm-seat.test.ts (a wrong header only surfaced as MF-VAL-101 live)
		const header = dmBundleHeaderCall();
		expect(header.params).toMatchObject({ bundle_id: "dm", depends_on: ["srd"] });
		expect(aldwin()[0]?.params).toEqual(header.params);
		expect(kavemouthBundleHeaderCall().params.rows).toEqual([
			expect.objectContaining({ bundle_id: "kavemouth", depends_on: ["srd", "dm"] }),
		]);
	});

	it("advances the apply latch and the confirm level by a constant 1, never reading target.stat", () => {
		// replaces the live sk-tyhy regression (packages/spellkave-srd-cc/.../dm-seat wait-after-close; fix at adventure-runtime author/dm/level-up.ts: ModifyResource delta_source is a constant)
		for (const label of ["action:apply-level-up", "action:level-up/confirm"]) {
			const writes = frameWrites(label);
			expect(writes.length, label).toBeGreaterThan(0);
			for (const w of writes) expect(String(w.delta_source), label).not.toContain("target.stat");
		}
		const apply = frameWrites("action:apply-level-up");
		expect(apply[0]).toMatchObject({
			actor: "Actor",
			resource: "dm/aldwin/level-up-applied",
			delta_source: "1",
		});
		const confirm = frameWrites("action:level-up/confirm");
		expect(confirm[0]).toMatchObject({ actor: "Actor", resource: "srd/level", delta_source: "1" });
	});

	it("initialises the trainee's Action Surge uses to 1 inside the apply consequence", () => {
		// replaces packages/spellkave-srd-cc/src/test/live-preseeded/mechanics/fighter-level-2-runtime-grant.test.ts:365-369 and 07-level-up-with-aldwin.ts:565-567 (action-surge-uses initialised)
		expect(ACTION_SURGE_USES_RESOURCE_ID).toBe("srd/fighter/action-surge-uses");
		expect(frameWrites("action:apply-level-up")[1]).toMatchObject({
			actor: "TargetActor",
			resource: ACTION_SURGE_USES_RESOURCE_ID,
			delta_source: "1",
		});
	});
});
