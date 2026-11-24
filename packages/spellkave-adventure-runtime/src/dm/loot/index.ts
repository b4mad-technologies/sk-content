// pattern: loot-table-drop
// pattern: computed-literal
/**
 * Boss / quest loot grants (sk-609b.13) — the DM places a catalog item at the
 * victim's (or hero's) node after a table draw, and stamps a party-visible
 * place_node trace. Same host-act class as kill-time XP: no kernel drop-on-
 * death arm; the NPC host owns the timing.
 *
 * The code -> item mapping (and each item's drop quantity) is CATALOG DATA in
 * {@link LootDropConfig}; nothing here knows a particular item or code. The
 * original hard-coded `code === potionHealingPair ? 2 : 1` branch is now the
 * `quantity` field of the code's catalog entry.
 */

import {
	dmCapabilityDefinition,
	dmCapabilityGrant,
	dmHostActAction,
	type HostActConfig,
	personaSlug,
} from "../host-act/index.ts";
import type { VerbCall } from "../lib/index.ts";

export const GRANT_LOOT_ACTION_LOCAL_ID = "dm/grant-loot";

/** One loot-code catalog entry. A `null` entry is an explicit empty draw. */
export interface LootCatalogEntry {
	/** Fully-qualified entity_def id of the dropped item. */
	readonly entityDefId: string;
	/** How many instances drop. Defaults to 1 when omitted. */
	readonly quantity?: number;
}

/**
 * Loot config: host-act config + the adventure's loot data. All story data is
 * required; the runtime holds no default catalog (an unused default would
 * silently diverge from any story, adversarial critique 6).
 */
export interface LootDropConfig extends HostActConfig {
	/** Draw code -> catalog entry (`null` = the code is a deliberate empty draw). */
	readonly catalog: Readonly<Record<number, LootCatalogEntry | null>>;
	/** Quest id -> loot table id for host-side terminal draws. */
	readonly questLootTableById: Readonly<Record<string, string>>;
	/** Deterministic representative codes for offline/host proof (not a die roll). */
	readonly questLootProofCodeById: Readonly<Record<string, number>>;
}

export function grantLootCapabilityId(cfg: Pick<HostActConfig, "bundle">): string {
	return `${cfg.bundle}/dm/grant-loot`;
}

export function lootDropTraceKind(cfg: Pick<HostActConfig, "bundle">): string {
	return `${cfg.bundle}/trace/loot_drop`;
}

/** Loot table id in the srd bundle for a bundle-less spec id. */
export const lootTableId = (specId: string): string => `srd/${specId}`;

export function resolveLootCode(cfg: LootDropConfig, code: number): LootCatalogEntry | null {
	if (!(code in cfg.catalog)) {
		throw new Error(`loot-drop: unknown loot code ${code}`);
	}
	return cfg.catalog[code] ?? null;
}

export function grantLootCapability(cfg: HostActConfig): VerbCall[] {
	const capabilityId = grantLootCapabilityId(cfg);
	return [
		dmCapabilityDefinition({
			bundle: cfg.bundle,
			label: "define-grant-loot-capability",
			capabilityId,
			description:
				"The DM's authority to place a drawn loot item after a boss kill or quest " +
				"terminal (pattern: loot-table-drop). Host-owned; a kill with no NPC host " +
				"drops nothing.",
			displayName: "DM: grant loot drop",
		}),
		dmCapabilityGrant(cfg, {
			capabilityId,
			label: `grant-loot-to-${personaSlug(cfg.personaName)}`,
		}),
		{
			toolName: "spellkave_define_trace_kind",
			label: "loot-drop-trace-kind",
			params: {
				bundle: cfg.bundle,
				id: "trace/loot_drop",
				location_kinds: "place_node",
				description:
					"Party-visible notice that treasure was recovered from a kill or quest reward.",
				schema_json: '{"text":"string","item_def":"string?"}',
				perceptible_for_ticks: 0,
			},
		},
	];
}

export function grantLootActionLocalId(eventId: string): string {
	return `${GRANT_LOOT_ACTION_LOCAL_ID}/${eventId}`;
}

/**
 * Runtime delta: place one stack of `entityDefId` at `atNodeId` through
 * `spellkave_place_entity` and dispatch a self-only action whose frame writes
 * Inscribe the party-visible loot notice, in the same delta batch.
 */
export function renderGrantLootCalls(
	cfg: HostActConfig,
	args: {
		eventId: string;
		entityDefId: string;
		atNodeId: string;
		itemEntityKey: string;
		displayName: string;
		quantity?: number;
	},
): VerbCall[] {
	const actionLocalId = grantLootActionLocalId(args.eventId);
	const quantity = args.quantity ?? 1;
	return [
		cfg.bundleHeader(),
		...grantLootCapability(cfg),
		{
			toolName: "spellkave_place_entity",
			label: `place-loot-${args.eventId}`,
			params: {
				bundle: cfg.bundle,
				kind: "item",
				entity_def: args.entityDefId,
				at: args.atNodeId,
				entity_key: args.itemEntityKey,
				name: args.displayName,
				quantity,
				description: `Loot drop (${args.entityDefId}) from table draw.`,
			},
		},
		dmHostActAction(cfg, {
			actionLocalId,
			requiredCapability: grantLootCapabilityId(cfg),
			displayName: `Grant loot (${args.displayName})`,
			description:
				`Record party-visible loot drop of ${args.entityDefId} at ${args.atNodeId}. ` +
				"pattern: loot-table-drop",
			consequence: {
				description: `Inscribe loot_drop trace for ${args.displayName}.`,
				frame_writes: [
					{
						Inscribe: {
							kind: lootDropTraceKind(cfg),
							location_kind: "place_node",
							location_ref: args.atNodeId,
							payload_json: JSON.stringify({
								text: `${args.displayName} recovered.`,
								item_def: args.entityDefId,
							}),
							carry_dispatch_text: false,
							carry_addressee: false,
						},
					},
				],
			},
		}),
	];
}

export type LootDropDecision =
	| {
			kind: "grant";
			code: number;
			entityDefId: string;
			quantity: number;
			tableId: string;
	  }
	| { kind: "skip"; reason: string };

/** Offline decision helper — proof path uses a deterministic forced code. */
export function decideBossLootDrop(
	cfg: LootDropConfig,
	args: {
		tableId: string;
		/** When set, force this code (live/offline representative). */
		forcedCode?: number;
		drawnCode?: number;
	},
): LootDropDecision {
	const code = args.forcedCode ?? args.drawnCode;
	if (code === undefined) {
		return { kind: "skip", reason: "no loot code drawn" };
	}
	const entry = resolveLootCode(cfg, code);
	if (entry === null) {
		return { kind: "skip", reason: "loot code maps to empty draw" };
	}
	return {
		kind: "grant",
		code,
		entityDefId: entry.entityDefId,
		quantity: entry.quantity ?? 1,
		tableId: args.tableId,
	};
}

export function displayNameForLootEntityDef(entityDefId: string): string {
	const slug = entityDefId.includes("/")
		? entityDefId.slice(entityDefId.lastIndexOf("/") + 1)
		: entityDefId;
	return slug
		.split("-")
		.map((part) => (part.length === 0 ? part : `${part[0]?.toUpperCase()}${part.slice(1)}`))
		.join(" ")
		.replace("Plus 1", "(+1)")
		.replace("Plus 2", "(+2)")
		.replace("Plus 3", "(+3)");
}

/**
 * Quest-terminal loot decision (same accept+terminal latch as quest XP).
 * Host draws a table code (or uses the proof forced code) and places the item.
 */
export function decideQuestLootGrant(
	cfg: LootDropConfig,
	args: {
		questId: string;
		/** True when accept + terminal satisfied and loot not yet granted. */
		terminalReady: boolean;
		alreadyGranted: boolean;
		/** Override for deterministic offline/live proof. */
		forcedCode?: number;
		drawnCode?: number;
	},
): LootDropDecision {
	if (args.alreadyGranted) {
		return { kind: "skip", reason: "loot already granted" };
	}
	if (!args.terminalReady) {
		return { kind: "skip", reason: "terminal not ready" };
	}
	const tableId = cfg.questLootTableById[args.questId];
	if (tableId === undefined) {
		return { kind: "skip", reason: "quest has no loot table" };
	}
	const code = args.forcedCode ?? args.drawnCode ?? cfg.questLootProofCodeById[args.questId];
	return decideBossLootDrop(cfg, { tableId, forcedCode: code });
}
