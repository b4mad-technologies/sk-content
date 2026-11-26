// Config-wiring pin (brain extraction, track F1 + D rewire): the kavemouth
// authoring files are thin calls into `@spellkave/adventure-runtime/dm/*`.
// The generic mechanism is covered by the runtime package's own tests; THIS
// file pins the kavemouth VALUES that flow into it (persisted ids, persona,
// copy, thresholds), so a changed config literal fails here. It replaces the
// pre-rewire host-act-renderer-parity test, which compared the old local
// renderers with the generic ones - the local renderers no longer exist.
// Byte-identity of the seeded rows is guarded by `author:kavemouth:check`.
import {
	companionBondIds,
	companionCommandKinds,
	companionIngressConfig,
} from "@spellkave/adventure-runtime/dm/companion-bond";
import { candidateInitialStates } from "@spellkave/adventure-runtime/dm/creation";
import { describe, expect, it } from "vitest";
import {
	COMPANION_COMMAND_KINDS,
	COMPANION_COMMAND_RANGE_M,
	COMPANION_COMMAND_STALE_AFTER_TICKS,
	COMPANION_COMMAND_TRACE_KIND_ID,
	COMPANION_SPOKEN_COMMAND_DISTANCE_MM,
	COMPANION_SPOKEN_COMMAND_RANGE_M,
	companionCommandActionId,
	companionCommandActions,
	companionSpokenCommandActions,
	companionSpokenCommandTemplateId,
	KAVEMOUTH_COMMANDS,
} from "../../author/companion-commands";
import {
	COMMAND_BOND_CAPABILITY_ID,
	COMPANION_BOND_TAG,
	KAVEMOUTH_BOND,
	renderCompanionBondGrant,
	renderCompanionBondLatch,
	STONE_DEF_ID,
} from "../../author/companion-stone";
import { candidateOccupancy } from "../../author/creation-candidate";
import { KAVEMOUTH_HOST_ACT } from "../../author/host-act-config";
import { INDUCT_ACTION_ID, INDUCT_CAPABILITY_ID, induction } from "../../author/induction";
import {
	GRANT_KILL_XP_ACTION_ID,
	GRANT_KILL_XP_CAPABILITY_ID,
	grantKillXpActionId,
	grantKillXpCapability,
	renderGrantKillXp,
} from "../../author/kill-xp";
import { ALDWIN_ENTITY_KEY } from "../../author/lib/entity-keys";
import {
	decideBossLootDrop,
	decideQuestLootGrant,
	KAVEMOUTH_LOOT,
	GRANT_LOOT_CAPABILITY_ID,
	grantLootCapability,
	LOOT_DROP_TRACE_KIND,
	renderGrantLootCalls,
} from "../../author/loot-drop";
import {
	GRANT_QUEST_XP_ACTION_ID,
	GRANT_QUEST_XP_CAPABILITY_ID,
	grantQuestXpActionId,
	grantQuestXpCapability,
	renderGrantQuestXp,
} from "../../author/quest-xp";
import {
	KAVEMOUTH_ROGUE,
	renderCompanionRogueCreation,
	renderCompanionRogueLevelBump,
	rogueCompanionHpAtLevel2,
} from "../../author/rogue-companion";

const rowsOf = (calls: { params: unknown }[], kind: string) =>
	calls
		.filter((c) => (c.params as { kind?: string }).kind === kind)
		.flatMap((c) => (c.params as { rows: Record<string, unknown>[] }).rows);

describe("host-act config pins kavemouth values", () => {
	it("host-act config names Aldwin in the kavemouth bundle", () => {
		expect(KAVEMOUTH_HOST_ACT.bundle).toBe("kavemouth");
		expect(KAVEMOUTH_HOST_ACT.dmEntityKey).toBe(ALDWIN_ENTITY_KEY);
		expect(KAVEMOUTH_HOST_ACT.personaName).toBe("Aldwin");
		expect(KAVEMOUTH_HOST_ACT.bundleHeader().label).toBe("define-proof-bundle");
	});

	it("kill XP: persisted ids and Aldwin grant label", () => {
		expect(GRANT_KILL_XP_CAPABILITY_ID).toBe("kavemouth/dm/grant-kill-xp");
		expect(GRANT_KILL_XP_ACTION_ID).toBe("kavemouth/dm/grant-kill-xp");
		expect(grantKillXpActionId("dm/grant-kill-xp/e1")).toBe("kavemouth/dm/grant-kill-xp/e1");
		const grant = grantKillXpCapability().find((c) => c.label === "grant-kill-xp-to-aldwin");
		expect(grant).toBeDefined();
		const calls = renderGrantKillXp({
			killerEntityId: "7",
			victimEntityId: "entity:12",
			amount: 450,
			actionLocalId: "dm/grant-kill-xp/e1",
		});
		expect(calls[0]?.label).toBe("define-proof-bundle");
		const action = calls.find((c) => c.label === "action:dm/grant-kill-xp/e1");
		expect((action?.params as { id: string }).id).toBe("dm/grant-kill-xp/e1");
		expect(JSON.stringify(action)).toContain("entity:7");
	});

	it("quest XP: persisted ids and per-quest progress states", () => {
		expect(GRANT_QUEST_XP_CAPABILITY_ID).toBe("kavemouth/dm/grant-quest-xp");
		expect(GRANT_QUEST_XP_ACTION_ID).toBe("kavemouth/dm/grant-quest-xp");
		expect(grantQuestXpActionId("dm/grant-quest-xp/Q1/e1")).toBe(
			"kavemouth/dm/grant-quest-xp/Q1/e1",
		);
		expect(grantQuestXpCapability().some((c) => c.label === "grant-quest-xp-to-aldwin")).toBe(true);
		const calls = renderGrantQuestXp({
			recipients: ["5", "entity:6"],
			amount: 300,
			questId: "Q1",
			actionLocalId: "dm/grant-quest-xp/Q1/e1",
			persistent: true,
			giverEntityId: "9",
		});
		const action = calls.find((c) => c.label === "action:dm/grant-quest-xp/Q1/e1");
		const p = action?.params as {
			predicate_source: string;
			consequence: { frame_writes: { ModifyResource: { actor: string; resource: string } }[] };
		};
		expect(p.predicate_source).toBe("actor.stat('kavemouth/quest/Q1/rewarded') == 0");
		expect(p.consequence.frame_writes.map((w) => w.ModifyResource.resource)).toEqual([
			"srd/xp",
			"srd/xp",
			"kavemouth/quest/Q1/rewarded",
			"kavemouth/quest/Q1/accepted",
		]);
	});

	it("loot: ids, catalog (incl. the potion-pair quantity) and quest tables", () => {
		expect(GRANT_LOOT_CAPABILITY_ID).toBe("kavemouth/dm/grant-loot");
		expect(LOOT_DROP_TRACE_KIND).toBe("kavemouth/trace/loot_drop");
		expect(rowsOf(grantLootCapability(), "actor_capabilities")[0]?.actor_entity_key).toBe(
			ALDWIN_ENTITY_KEY,
		);
		expect(KAVEMOUTH_LOOT.catalog).toEqual({
			20: { entityDefId: "srd/magic_item/longsword-plus-1" },
			30: { entityDefId: "srd/item/potion-of-healing", quantity: 2 },
			40: { entityDefId: "srd/magic_item/potion-of-heroism" },
		});
		expect(decideBossLootDrop({ tableId: "t", forcedCode: 30 })).toEqual({
			kind: "grant",
			code: 30,
			entityDefId: "srd/item/potion-of-healing",
			quantity: 2,
			tableId: "t",
		});
		expect(
			decideQuestLootGrant({ questId: "Q10", terminalReady: true, alreadyGranted: false }),
		).toEqual({
			kind: "grant",
			code: 40,
			entityDefId: "srd/magic_item/potion-of-heroism",
			quantity: 1,
			tableId: "srd/loot/quest/q10-reward",
		});
		expect(() => decideBossLootDrop({ tableId: "t", forcedCode: 99 })).toThrow(
			/unknown loot code 99/,
		);
		const calls = renderGrantLootCalls({
			eventId: "e1",
			entityDefId: "srd/item/potion-of-healing",
			atNodeId: "node-3",
			itemEntityKey: "kavemouth/loot/e1",
			displayName: "Potion Of Healing",
		});
		expect(calls[0]?.label).toBe("define-proof-bundle");
	});

	it("companion bond: Hesper, the telepathy stone and the derived ids", () => {
		expect(KAVEMOUTH_BOND.companionName).toBe("Hesper");
		expect(KAVEMOUTH_BOND.stoneName).toBe("telepathy stone");
		expect(KAVEMOUTH_BOND.ledgerName).toBe("hearth-ledger");
		expect(STONE_DEF_ID).toBe("kavemouth/adventure/item/telepathy_stone");
		expect(COMMAND_BOND_CAPABILITY_ID).toBe("kavemouth/companion/command-bond");
		expect(COMPANION_BOND_TAG).toBe("kavemouth.companion.bond");
		expect(companionBondIds(KAVEMOUTH_BOND).giftStoneActionId).toBe(
			"kavemouth/companion/gift-stone",
		);
		const grant = rowsOf(renderCompanionBondGrant(), "actor_capabilities")[0];
		expect(grant).toMatchObject({
			actor_entity_key: KAVEMOUTH_BOND.heroEntityKey,
			capability_id: COMMAND_BOND_CAPABILITY_ID,
			extent_kind_ref: "party",
			extent_ref: COMPANION_BOND_TAG,
		});
		const latch = renderCompanionBondLatch({
			heroEntityId: "42",
			companionEntityId: "entity:43",
			actionLocalId: "dm/latch",
		});
		expect(JSON.stringify(latch)).toContain("hearth-ledger");
	});

	it("companion commands: words, stale window, ranges and ingress config", () => {
		expect(COMPANION_COMMAND_TRACE_KIND_ID).toBe("kavemouth/adventure/trace/companion_command");
		expect(COMPANION_COMMAND_STALE_AFTER_TICKS).toBe(2);
		expect(COMPANION_COMMAND_RANGE_M).toBe(50);
		expect(COMPANION_SPOKEN_COMMAND_RANGE_M).toBe(10);
		expect(COMPANION_SPOKEN_COMMAND_DISTANCE_MM).toBe(10_000);
		expect(KAVEMOUTH_COMMANDS.commands.map((c) => [c.verb, c.kind])).toEqual([
			["hold", "hold"],
			["follow", "follow"],
			["cancel", "cancel"],
		]);
		expect(COMPANION_COMMAND_KINDS).toEqual({ hold: "hold", follow: "follow", cancel: "cancel" });
		expect(companionCommandKinds(KAVEMOUTH_COMMANDS)).toEqual(COMPANION_COMMAND_KINDS);
		expect(companionCommandActionId("hold")).toBe("kavemouth/companion/hold");
		expect(companionSpokenCommandTemplateId("cancel")).toBe(
			"kavemouth/companion/say-cancel/affordance",
		);
		expect(JSON.stringify(companionCommandActions())).toContain("Tell Hesper to stop");
		expect(JSON.stringify(companionSpokenCommandActions())).toContain("Say to Hesper: stop");
		const self = { bodyId: "b", actorId: "a", worldId: "w" };
		const controller = () => null;
		expect(companionIngressConfig(KAVEMOUTH_COMMANDS, self, controller)).toEqual({
			traceKind: COMPANION_COMMAND_TRACE_KIND_ID,
			commandKinds: COMPANION_COMMAND_KINDS,
			staleAfterTicks: 2,
			self,
			controller,
		});
	});

	it("induction: Aldwin carries the candidate to the loft", () => {
		expect(INDUCT_ACTION_ID).toBe("kavemouth/dm/induct-candidate");
		expect(INDUCT_CAPABILITY_ID).toBe("kavemouth/action/dm/induct-candidate");
		const calls = induction();
		expect(calls.some((c) => c.label === "grant-induct-candidate-to-aldwin")).toBe(true);
		const action = calls.find((c) => c.label === "action:induct-candidate");
		expect(JSON.stringify(action)).toContain("kavemouth/inn/loft");
		expect(JSON.stringify(action)).toContain("Aldwin carries a finished creation candidate");
	});

	it("candidate blueprint extends the generic floor with act homes and party identity", () => {
		const def = candidateOccupancy()[0];
		expect((def?.params as { initial_states: unknown[] }).initial_states).toEqual(
			expect.arrayContaining(candidateInitialStates()),
		);
		expect((def?.params as { tags: string[] }).tags).toEqual([
			"srd.creature",
			"srd.player_character",
			"srd.communication.vocal",
			"srd.faction.party",
			"srd.party.heroes",
		]);
	});

	it("rogue companion: slugs, name, target level and L2 hp", () => {
		expect(KAVEMOUTH_ROGUE).toMatchObject({
			bundle: "kavemouth",
			classSlug: "rogue",
			speciesSlug: "human",
			backgroundSlug: "criminal",
			name: "Aldwin's Blade",
			entityDefId: "srd/creature/scout",
			targetLevel: 2,
		});
		const placeNodeId = "kavemouth/inn/common_room";
		const creation = renderCompanionRogueCreation({ placeNodeId });
		expect(creation.find((c) => c.label === "place-rogue-companion")).toBeDefined();
		const bump = renderCompanionRogueLevelBump();
		const hp = rowsOf(bump, "object_state").find((r) => r.state_id === "srd/hp");
		expect(hp?.value_int).toBe(rogueCompanionHpAtLevel2());
		expect(JSON.stringify(bump)).toContain("kavemouth/companion/rogue-l2");
	});
});
