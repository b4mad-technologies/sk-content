// DOC-IMPL: fixtures-layout#cast-definitions-are-blueprint-owned
// DOC-IMPL: fixtures-layout#routing-is-fail-closed-and-deterministic
/**
 * // pattern: bundle-movement-default
 *
 * Review-oriented layout for the elven-mini adventure manifest.
 *
 * The authoring verbs still render and validate one complete manifest first.
 * This module only moves those already-rendered, byte-identical top-level TOML
 * table blocks into logical include fragments; it never constructs or changes
 * a world row.
 */
import { SLIME_ENTITY_KEY } from "./combatants.ts";
import { STONE_DEF_ID } from "./companion-stone.ts";
import { ADVENTURE_CANDIDATE_DEF_ID } from "./creation-candidate.ts";
import { WARDEN_ENTITY_KEY } from "./crypt-fight.ts";
import {
	ALDWIN_AUTHOR_BINDING_ID,
	ALDWIN_AUTHOR_BUNDLE_BINDING_ID,
	ALDWIN_AUTHOR_ROLE_ID,
	ALDWIN_DM_BINDING_ID,
	ALDWIN_ENTITY_KEY,
	ALDWIN_NPC_HOST_BINDING_ID,
} from "./dm-npc.ts";
import { ENCOUNTER_ENTITY_KEYS, Q4_FANATIC_LOOT_ITEM_KEY } from "./encounters.ts";
import {
	ADVENTURE_FIELD_KIT_DEF_ID,
	ADVENTURE_RATIONS_DEF_ID,
	ADVENTURE_TORCH_DEF_ID,
} from "./hero.ts";
import { BUNDLE, GRAPHS } from "./lib/ids.ts";
import { LOFT_CHEST_KEY, LOFT_CHEST_POTION_KEYS } from "./loft-chest.ts";
import {
	BAR_DEF_ID,
	BAR_FURNITURE_KEY,
	HEARTH_DEF_ID,
	HEARTH_FURNITURE_KEY,
	INNKEEPER_ENTITY_KEY,
	TOMB_CHEST_DEF_ID,
	TOMB_CHEST_KEY,
} from "./occupancy.ts";
import {
	OPERATOR_DEF_ID,
	OPERATOR_ENTITY_KEY,
	operatorBindingId,
	operatorRootGraphIds,
} from "./operator.ts";
import { Q1_RAT_ENTITY_KEYS } from "./q1-rats.ts";
import { ROGUE_COMPANION_DEF_ID } from "./rogue-companion.ts";
import { STORYLINE_NPC_ENTITY_KEYS, STORYLINE_QUEST_ITEM_KEYS } from "./storyline-npcs.ts";

type CastKind = "players" | "npcs" | "monsters" | "props";

export interface CastMember {
	kind: CastKind;
	slug: string;
	path: `adventure/cast/${CastKind}/${string}.toml`;
	label: string;
	description: string;
	/** Local adventure entity_definitions owned by this file. Empty when the member adopts an SRD blueprint. */
	entityDefIds: readonly string[];
	/** Adventure instance keys (entities / actors) that belong in this file. */
	entityKeys: readonly string[];
}

export const CAST_MEMBERS = [
	{
		kind: "players",
		slug: "candidate",
		path: "adventure/cast/players/candidate.toml",
		label: "Candidate",
		description: "The unplaced creation blueprint for world-owned hero vessels.",
		entityDefIds: [ADVENTURE_CANDIDATE_DEF_ID],
		entityKeys: [],
	},
	{
		kind: "npcs",
		slug: "rogue-companion",
		path: "adventure/cast/npcs/rogue-companion.toml",
		label: "Rogue Companion",
		description: "The unplaced companion blueprint, spawned after its invitation is accepted.",
		entityDefIds: [ROGUE_COMPANION_DEF_ID, `${BUNDLE}/item/rogue-field-kit`],
		entityKeys: [],
	},

	{
		kind: "npcs",
		slug: "mira",
		path: "adventure/cast/npcs/mira.toml",
		label: "Mira",
		description: "Innkeeper Mira — adopted SRD Commoner at the bar.",
		entityDefIds: [],
		entityKeys: [INNKEEPER_ENTITY_KEY],
	},
	{
		kind: "npcs",
		slug: "aldwin",
		path: "adventure/cast/npcs/aldwin.toml",
		label: "Aldwin",
		description: "Aldwin — adopted SRD Commoner; trainer/creation roles are instance tags.",
		entityDefIds: [],
		entityKeys: [ALDWIN_ENTITY_KEY],
	},
	{
		kind: "npcs",
		slug: "storyline-cast",
		path: "adventure/cast/npcs/storyline-cast.toml",
		label: "Storyline NPCs",
		description: "Ysolde, Tamsin, Caddoc, Jory, Hesper, Vessk — quest givers (sk-609b.10).",
		entityDefIds: [],
		entityKeys: STORYLINE_NPC_ENTITY_KEYS,
	},
	{
		kind: "npcs",
		slug: "operator",
		path: "adventure/cast/npcs/operator.toml",
		label: "World Operator",
		description:
			"Observation-only watcher — place_graph extent over every root graph (sk-adr8.5). Not a playable seat.",
		entityDefIds: [OPERATOR_DEF_ID],
		entityKeys: [OPERATOR_ENTITY_KEY],
	},
	{
		kind: "monsters",
		slug: "slime-scout",
		path: "adventure/cast/monsters/slime-scout.toml",
		label: "Slime Scout",
		description: "Named Gray Ooze in the tomb hall; HP overridden to 3.",
		entityDefIds: [],
		entityKeys: [SLIME_ENTITY_KEY],
	},
	{
		kind: "monsters",
		slug: "crypt-warden",
		path: "adventure/cast/monsters/crypt-warden.toml",
		label: "Crypt Warden",
		description: "Named Goblin Warrior in the crypt; definition-seeded Shortbow.",
		entityDefIds: [],
		entityKeys: [WARDEN_ENTITY_KEY],
	},
	{
		kind: "monsters",
		slug: "storyline-encounters",
		path: "adventure/cast/monsters/storyline-encounters.toml",
		label: "Storyline Encounters",
		description: "Section-5 encounter cast (blueprint instances + role tags).",
		entityDefIds: [],
		entityKeys: ENCOUNTER_ENTITY_KEYS,
	},
	{
		kind: "monsters",
		slug: "q1-cellar-rats",
		path: "adventure/cast/monsters/q1-cellar-rats.toml",
		label: "Q1 Cellar Rats",
		description: "One giant rat + swarm in the inn cellar (Q1 hub).",
		entityDefIds: [],
		entityKeys: Q1_RAT_ENTITY_KEYS,
	},
	{
		kind: "props",
		slug: "field-kit",
		path: "adventure/cast/props/field-kit.toml",
		label: "Field Kit",
		description: "Field kit definition — instantiated at confirm, not seeded on a body.",
		entityDefIds: [ADVENTURE_FIELD_KIT_DEF_ID],
		entityKeys: [],
	},
	{
		kind: "props",
		slug: "torch",
		path: "adventure/cast/props/torch.toml",
		label: "Torch",
		description: "Pitch-soaked torch in the field kit.",
		entityDefIds: [ADVENTURE_TORCH_DEF_ID],
		entityKeys: [],
	},
	{
		kind: "props",
		slug: "rations",
		path: "adventure/cast/props/rations.toml",
		label: "Rations",
		description: "Travel rations stacked in the field kit.",
		entityDefIds: [ADVENTURE_RATIONS_DEF_ID],
		entityKeys: [],
	},
	{
		kind: "props",
		slug: "bar-counter",
		path: "adventure/cast/props/bar-counter.toml",
		label: "Bar Counter",
		description: "Oak counter in the Mountain View Inn.",
		entityDefIds: [BAR_DEF_ID],
		entityKeys: [BAR_FURNITURE_KEY],
	},
	{
		kind: "props",
		slug: "hearth",
		path: "adventure/cast/props/hearth.toml",
		label: "Hearth",
		description: "Stone hearth in the inn common room.",
		entityDefIds: [HEARTH_DEF_ID],
		entityKeys: [HEARTH_FURNITURE_KEY],
	},
	{
		kind: "props",
		slug: "sealed-chest",
		path: "adventure/cast/props/sealed-chest.toml",
		label: "Sealed Chest",
		description: "Sealed wooden chest in the tomb shrine.",
		entityDefIds: [TOMB_CHEST_DEF_ID],
		entityKeys: [TOMB_CHEST_KEY],
	},
	{
		kind: "props",
		slug: "telepathy-stone",
		path: "adventure/cast/props/telepathy-stone.toml",
		label: "Telepathy Stone",
		description:
			"Hesper's gifted companion stone — carried, not worn; the stone command verbs (Tell Hesper to hold/follow/stop) read possession as an actor.has_item predicate (sk-jay0.3.4.18, Key A retired sk-vjh.7). The stone gates REMOTE reach only: each verb also carries a spoken affordance (Say to Hesper: hold/follow/stop) gated by co-location within 10 m instead of possession (sk-jay0.1.23.35.3).",
		entityDefIds: [STONE_DEF_ID],
		entityKeys: [],
	},
	{
		kind: "props",
		slug: "quest-items",
		path: "adventure/cast/props/quest-items.toml",
		label: "Quest Items",
		description: "Moonpetal, cult relic, Ironfold tomb key (sk-609b.10).",
		entityDefIds: [
			"elven_mini/adventure/item/moonpetal",
			"elven_mini/adventure/item/cult_relic",
			"elven_mini/adventure/item/tomb_key",
		],
		entityKeys: STORYLINE_QUEST_ITEM_KEYS,
	},
	{
		kind: "props",
		slug: "q4-fanatic-loot",
		path: "adventure/cast/props/q4-fanatic-loot.toml",
		label: "Q4 Fanatic Loot",
		description: "Sister Maelis longsword +1 boss drop (sk-609b.13 loot-table-drop).",
		entityDefIds: [],
		entityKeys: [Q4_FANATIC_LOOT_ITEM_KEY],
	},
	{
		kind: "props",
		slug: "loft-chest",
		path: "adventure/cast/props/loft-chest.toml",
		label: "Loft Chest",
		description:
			"SRD chest in the inn loft, stocked with 2x Potion of Healing " + "(sk-jay0.1.23.36.22.2).",
		entityDefIds: [],
		entityKeys: [LOFT_CHEST_KEY, ...LOFT_CHEST_POTION_KEYS],
	},
] satisfies readonly CastMember[];

export const ADVENTURE_FRAGMENT_PATHS = [
	"adventure/world/region.toml",
	"adventure/world/hamlet.toml",
	"adventure/world/inn.toml",
	"adventure/world/tomb.toml",
	"adventure/world/village.toml",
	"adventure/world/river_crossing.toml",
	"adventure/world/mill.toml",
	"adventure/world/well.toml",
	"adventure/world/goblin_warren.toml",
	"adventure/world/forest_lodge.toml",
	"adventure/world/hobgoblin_camp.toml",
	"adventure/world/swamp.toml",
	"adventure/world/mine.toml",
	"adventure/world/shrine.toml",
	"adventure/world/cursed_crypt.toml",
	"adventure/world/deep_tomb.toml",
	"adventure/world/creation-limbo.toml",
	"adventure/world/advancement-limbo.toml",
	"adventure/world/operator-offstage.toml",
	"adventure/world/links.toml",
	"adventure/world/metadata.toml",
	"adventure/world/niches.toml",
	...CAST_MEMBERS.map((member) => member.path),
	"adventure/mechanics/actions.toml",
	"adventure/story/traces.toml",
	"adventure/combat/crypt-fight.toml",
] as const;

type AdventureFragmentPath = (typeof ADVENTURE_FRAGMENT_PATHS)[number];

const GRAPH_FRAGMENTS = [
	[GRAPHS.region, "adventure/world/region.toml"],
	[GRAPHS.hamlet, "adventure/world/hamlet.toml"],
	[GRAPHS.inn, "adventure/world/inn.toml"],
	[GRAPHS.tomb, "adventure/world/tomb.toml"],
	[GRAPHS.village, "adventure/world/village.toml"],
	[GRAPHS.river_crossing, "adventure/world/river_crossing.toml"],
	[GRAPHS.mill, "adventure/world/mill.toml"],
	[GRAPHS.well, "adventure/world/well.toml"],
	[GRAPHS.goblin_warren, "adventure/world/goblin_warren.toml"],
	[GRAPHS.forest_lodge, "adventure/world/forest_lodge.toml"],
	[GRAPHS.hobgoblin_camp, "adventure/world/hobgoblin_camp.toml"],
	[GRAPHS.swamp, "adventure/world/swamp.toml"],
	[GRAPHS.mine, "adventure/world/mine.toml"],
	[GRAPHS.shrine, "adventure/world/shrine.toml"],
	[GRAPHS.cursed_crypt, "adventure/world/cursed_crypt.toml"],
	[GRAPHS.deep_tomb, "adventure/world/deep_tomb.toml"],
	[GRAPHS.creation_limbo, "adventure/world/creation-limbo.toml"],
	[GRAPHS.advancement_limbo, "adventure/world/advancement-limbo.toml"],
	[GRAPHS.operator_offstage, "adventure/world/operator-offstage.toml"],
] as const satisfies readonly (readonly [string, AdventureFragmentPath])[];

const SPATIAL_TABLES = new Set([
	"map_layers",
	"place_edge_affordance",
	"place_edges",
	"place_graphs",
	"place_nodes",
]);
const METADATA_TABLES = new Set(["metadata_attachments", "metadata_namespaces"]);
const NICHE_TABLES = new Set(["niche_definitions", "spatial_niche_attachments"]);
const DEFINITION_TABLES = new Set([
	"entity_definition_containment_policy",
	"entity_definition_equip_modifier",
	"entity_definition_initial_capability",
	"entity_definition_initial_condition",
	"entity_definition_initial_containment",
	"entity_definition_initial_equipment",
	"entity_definition_initial_state",
	"entity_definition_item_dsl_source",
	"entity_definition_tag",
	"entity_definitions",
]);
const INSTANCE_TABLES = new Set([
	"entity_containment_policy",
	"actor_capabilities",
	"actor_equipment_slots",
	"actor_identities",
	"actor_spatial_locations",
	"actors",
	"entities",
	"entity_containment",
	"entity_tag",
	"object_state",
]);
const ACTION_TABLES = new Set([
	"containment_policy_definition",
	"condition_definitions",
	"condition_definition_tag",
	"condition_capability_extent_grants",
	"effect_definitions",
	"spatial_state_definitions",
	"spatial_environment_state",
	"resource_definitions",
	"resource_definition_tag",
	"action_definitions",
	"affordance_templates",
	"capability_definitions",
	"tag_capability_grant",
	"consequence_frame_writes",
	"consequence_templates",
	"outcome_templates",
	// sk-jay0.2.33.15.7 (ADR-0142): `prompt_definitions` (quest-prompt
	// response_action_ids) is dialog/action-economy content, same family as
	// `action_definitions`/`affordance_templates` above.
	"prompt_definitions",
]);
const TRACE_TABLES = new Set(["place_node_traces", "trace_kind_definitions"]);
const COMBAT_TABLES = new Set(["combat_grid_blueprints", "session_definitions", "turn_scheduler"]);

const CAST_FRAGMENT_BY_ENTITY_DEF_ID = new Map<string, AdventureFragmentPath>(
	CAST_MEMBERS.flatMap((member) =>
		member.entityDefIds.map((entityDefId) => [entityDefId, member.path] as const),
	),
);

const CAST_FRAGMENT_BY_ENTITY_KEY = new Map<string, AdventureFragmentPath>(
	CAST_MEMBERS.flatMap((member) =>
		member.entityKeys.map((entityKey) => [entityKey, member.path] as const),
	),
);

const QUOTED_KEY_FIELDS = [
	"entity_key",
	"actor_entity_key",
	"item_key",
	"container_entity_key",
] as const;

function quotedField(block: string, field: string): string | undefined {
	return block.match(new RegExp(`^${field} = "([^"]+)"$`, "m"))?.[1];
}

function castDefinitionFragment(table: string, block: string): AdventureFragmentPath {
	const entityDefId = quotedField(block, "entity_def_id");
	if (entityDefId === undefined) {
		throw new Error(
			`elven-mini layout: definition-owned row '${table}' has no entity_def_id owner.`,
		);
	}
	const fragment = CAST_FRAGMENT_BY_ENTITY_DEF_ID.get(entityDefId);
	if (fragment === undefined) {
		throw new Error(
			`elven-mini layout: entity definition '${entityDefId}' has no cast member; ` +
				"register it on CAST_MEMBERS instead of reviving a catch-all file.",
		);
	}
	return fragment;
}

function castInstanceFragment(table: string, block: string): AdventureFragmentPath {
	// Containment nests props inside people or other props: the CONTAINER owns
	// the relation (Renn carries the field kit; the kit carries the torch).
	if (table === "entity_containment") {
		const container = quotedField(block, "container_entity_key");
		if (container !== undefined) {
			const fragment = CAST_FRAGMENT_BY_ENTITY_KEY.get(container);
			if (fragment !== undefined) return fragment;
		}
	}

	for (const field of QUOTED_KEY_FIELDS) {
		const key = quotedField(block, field);
		if (key === undefined) continue;
		const fragment = CAST_FRAGMENT_BY_ENTITY_KEY.get(key);
		if (fragment !== undefined) return fragment;
		// Build-time equipment is named under its registered carrier's item path.
		for (const [carrier, owner] of CAST_FRAGMENT_BY_ENTITY_KEY) {
			if (key.startsWith(`${carrier}/item/`)) return owner;
		}
	}

	throw new Error(
		`elven-mini layout: instance row '${table}' (${QUOTED_KEY_FIELDS.map((field) =>
			quotedField(block, field),
		)
			.filter(Boolean)
			.join(", ")}) names no registered cast member; ` + "add its entity_key to CAST_MEMBERS.",
	);
}

function spatialFragment(block: string): AdventureFragmentPath {
	// A graph-owned row names its owner directly. Prefer that field over other
	// graph references (for example a child place_graph also names its parent).
	const owningGraph = quotedField(block, "place_graph_id");
	if (owningGraph !== undefined) {
		const match = GRAPH_FRAGMENTS.find(([graphId]) => graphId === owningGraph);
		if (match === undefined) {
			throw new Error(`elven-mini layout: unknown place graph '${owningGraph}'.`);
		}
		return match[1];
	}

	// Cross-graph edges and their affordance bindings have no owning graph.
	// One referenced graph means an ordinary in-graph edge; two means a portal
	// between graph slices and belongs in the dedicated links fragment.
	const referenced = GRAPH_FRAGMENTS.filter(([graphId]) => block.includes(graphId));
	const onlyGraph = referenced[0];
	if (referenced.length === 1 && onlyGraph !== undefined) return onlyGraph[1];
	if (referenced.length > 1) return "adventure/world/links.toml";
	throw new Error("elven-mini layout: spatial row does not name a known place graph.");
}

/** ADR-0101 (task 6.2): `movement_defaults` has no `place_graph_id` owner
 * field on a bundle-scoped row (`place_graph_id = ""`, `adventure.ts`'s ONE
 * `spellkave_set_movement_default` call — every graph inherits it), so it
 * cannot go through `spatialFragment`'s owning-graph lookup unchanged. A
 * graph-scoped row (non-empty `place_graph_id`, not used by this adventure
 * today) still routes to that graph's own fragment; bundle scope routes to
 * the cross-cutting `links.toml` fragment, same home cross-graph portals
 * already share. */
function movementDefaultFragment(block: string): AdventureFragmentPath {
	const owningGraph = quotedField(block, "place_graph_id");
	if (owningGraph !== undefined && owningGraph !== "") {
		const match = GRAPH_FRAGMENTS.find(([graphId]) => graphId === owningGraph);
		if (match !== undefined) return match[1];
	}
	return "adventure/world/links.toml";
}

function fragmentForBlock(table: string, block: string): AdventureFragmentPath {
	if (table === "role_definitions" && quotedField(block, "role_id") === ALDWIN_AUTHOR_ROLE_ID) {
		return "adventure/cast/npcs/aldwin.toml";
	}
	if (table === "role_bindings") {
		const id = quotedField(block, "binding_id");
		if (
			id === ALDWIN_DM_BINDING_ID ||
			id === ALDWIN_NPC_HOST_BINDING_ID ||
			id === "elven_mini/aldwin-creation-dm" ||
			id === "elven_mini/aldwin-advancement-dm" ||
			id === ALDWIN_AUTHOR_BINDING_ID ||
			id === ALDWIN_AUTHOR_BUNDLE_BINDING_ID
		)
			return "adventure/cast/npcs/aldwin.toml";
		if (operatorRootGraphIds().some((graph) => operatorBindingId(graph) === id))
			return "adventure/cast/npcs/operator.toml";
		throw new Error(`elven-mini layout: role binding '${id}' has no registered cast owner.`);
	}
	if (table === "movement_defaults") return movementDefaultFragment(block);
	if (SPATIAL_TABLES.has(table)) return spatialFragment(block);
	if (METADATA_TABLES.has(table)) return "adventure/world/metadata.toml";
	if (NICHE_TABLES.has(table)) return "adventure/world/niches.toml";
	if (DEFINITION_TABLES.has(table)) return castDefinitionFragment(table, block);
	if (INSTANCE_TABLES.has(table)) return castInstanceFragment(table, block);
	if (ACTION_TABLES.has(table)) return "adventure/mechanics/actions.toml";
	if (TRACE_TABLES.has(table)) return "adventure/story/traces.toml";
	if (COMBAT_TABLES.has(table)) return "adventure/combat/crypt-fight.toml";
	throw new Error(`elven-mini layout: top-level table '${table}' has no review fragment.`);
}

/**
 * Partition a complete verb-rendered manifest into headerless include
 * fragments. A block begins at a top-level `[[table]]` header and includes
 * all following nested tables until the next top-level array-of-tables
 * header, so nested frame-write payloads stay attached to their parent row.
 */
export function splitAdventureManifestRows(toml: string): Record<AdventureFragmentPath, string> {
	const matches = [...toml.matchAll(/^\[\[([a-z0-9_]+)\]\]$/gm)];
	if (matches.length === 0) {
		throw new Error("elven-mini layout: authored manifest contains no top-level row tables.");
	}

	const fragments = Object.fromEntries(
		ADVENTURE_FRAGMENT_PATHS.map((path) => [path, ""]),
	) as Record<AdventureFragmentPath, string>;
	let bundleCount = 0;

	for (const [index, match] of matches.entries()) {
		const table = match[1];
		const start = match.index;
		const end = matches[index + 1]?.index ?? toml.length;
		if (table === undefined || start === undefined) {
			throw new Error("elven-mini layout: malformed top-level table match.");
		}
		if (table === "bundles") {
			bundleCount += 1;
			continue;
		}
		const block = toml.slice(start, end).replace(/^\n+|\n+$/g, "");
		const fragment = fragmentForBlock(table, block);
		fragments[fragment] += `${block}\n\n`;
	}

	if (bundleCount !== 1) {
		throw new Error(`elven-mini layout: expected one bundle row, found ${bundleCount}.`);
	}
	for (const path of ADVENTURE_FRAGMENT_PATHS) {
		const content = fragments[path];
		if (content.length === 0) {
			throw new Error(`elven-mini layout: '${path}' would be empty.`);
		}
		fragments[path] = content.replace(/\n+$/, "\n");
	}
	return fragments;
}
